// Retail scouting (stores find small sellers) and the business toolkit
// (vetted suppliers). Helpers plus the actions they need.
import { actions, commit, notify, email, currentUser, userById, campaignById, brandName, threadFor, pushMessage, ratingOf } from './store';
import { uid, peso } from './format';
import { isOn, setting, earn } from './monetize';

// ---------- retail scouting ----------
export const isBuyer = (u) => !!u?.buyer?.verified;
export const retailReady = (d) => d.campaigns.filter((c) => c.retail?.ready && !c.removed && !userById(d, c.ownerId)?.suspended);

// Proof that a product sells: what a store buyer wants to see first.
export function retailSignals(d, c) {
  const links = new Set(d.links.filter((l) => l.campaignId === c.id).map((l) => l.id));
  const orders = d.events.filter((e) => e.t === 'sale' && links.has(e.linkId)).length;
  const posts = d.deliverables.filter((x) => x.campaignId === c.id && x.status === 'approved').length;
  const votes = d.launches.filter((l) => l.brandId === c.ownerId).reduce((a, l) => a + l.votes.length, 0);
  const r = ratingOf(d, c.ownerId);
  const score = orders * 2 + posts * 5 + votes * 3 + (r.avg ? r.avg * 4 : 0);
  return { orders, posts, votes, rating: r.avg, ratingCount: r.count, score };
}
export const rankRetail = (d) => retailReady(d).map((c) => ({ c, s: retailSignals(d, c) })).sort((a, b) => b.s.score - a.s.score);

export const RETAIL_CHANNELS = ['Grocery & supermarket', 'Convenience store', 'Pasalubong shop', 'Specialty / gift shop', 'Pharmacy & wellness', 'Café or restaurant', 'Distributor', 'Online retailer'];
export const STORE_STATUS = {
  new: ['New request', 'soft'], talking: ['Talking', 'blue'], declined: ['Declined', 'neutral'], ordered: ['First order placed', 'green'],
};

// ---------- business toolkit ----------
export const TOOLKIT = [
  ['packaging', 'Packaging & mailers'], ['printing', 'Labels & printing'], ['courier', 'Couriers & fulfillment'],
  ['photo', 'Product photos'], ['permits', 'FDA, BIR & permits'], ['barcodes', 'Barcodes for stores'],
];

Object.assign(actions, {
  setRetailReady(campaignId, data) {
    commit((d) => {
      const c = campaignById(d, campaignId);
      if (c.ownerId !== d.session.userId) throw new Error('Only the brand can change this.');
      if (!data.ready) { c.retail = { ...(c.retail || {}), ready: false }; return; }
      const wholesale = Number(data.wholesale);
      const srp = Number(data.srp);
      if (!(wholesale > 0) || !(srp > 0)) throw new Error('Add your wholesale price and suggested retail price.');
      if (wholesale >= srp) throw new Error('Wholesale price should be lower than the retail price, so stores can earn a margin.');
      c.retail = { ready: true, wholesale, srp, moq: Number(data.moq) || 1, capacity: Number(data.capacity) || 0, shelfLife: (data.shelfLife || '').trim(), fda: !!data.fda, bir: !!data.bir, barcode: !!data.barcode, note: (data.note || '').trim(), since: c.retail?.since || Date.now() };
    });
  },
  applyAsBuyer(data) {
    commit((d) => {
      const u = currentUser(d);
      if (!u) throw new Error('Log in first.');
      if (!data.company?.trim() || !data.role?.trim()) throw new Error('Add your company and your role.');
      u.buyer = { company: data.company.trim(), role: data.role.trim(), channel: data.channel, stores: Number(data.stores) || 1, region: data.region || u.region, verified: false, appliedAt: Date.now() };
      d.users.filter((a) => a.admin).forEach((a) => notify(d, a.id, `Store buyer to verify: ${u.buyer.company}`, '/admin'));
    });
  },
  verifyBuyer(userId, ok) {
    commit((d) => {
      const u = userById(d, userId);
      if (ok) { u.buyer.verified = true; notify(d, u.id, 'You\'re verified as a store buyer. Start scouting!', '/retail'); }
      else { u.buyer = null; notify(d, u.id, 'We couldn\'t verify your store buyer account. Reply to our email with proof of your role.', '/retail'); }
    });
  },
  requestFromStore(campaignId, { kind, note, qty }) {
    return commit((d) => {
      const u = currentUser(d);
      if (!isBuyer(u)) throw new Error('Only verified store buyers can send requests.');
      const c = campaignById(d, campaignId);
      if (d.storeRequests.some((r) => r.buyerId === u.id && r.campaignId === c.id && ['new', 'talking'].includes(r.status))) throw new Error('You already have an open request for this product.');
      const r = { id: uid('srq'), buyerId: u.id, brandId: c.ownerId, campaignId: c.id, kind, note: (note || '').trim(), qty: Number(qty) || 0, status: 'new', createdAt: Date.now() };
      d.storeRequests.unshift(r);
      const t = threadFor(d, u.id, c.ownerId, c.id);
      pushMessage(d, t, u.id, `Hi! I'm a buyer for ${u.buyer.company}. ${kind === 'samples' ? 'We\'d like samples' : 'We\'d like to talk about stocking'} ${c.productName}.${r.qty ? ` We're looking at about ${r.qty} units to start.` : ''} ${r.note}`.trim());
      notify(d, c.ownerId, `${u.buyer.company} wants to stock ${c.productName}`, '/workspace/shop?tab=stores');
      email(d, c.ownerId, `A store wants your ${c.productName}`, `${u.buyer.company} (${u.buyer.channel}, ${u.buyer.stores} store${u.buyer.stores > 1 ? 's' : ''}) found you on Buzz. Reply in Buzz Messages.`, '/workspace/shop?tab=stores');
      return r.id;
    });
  },
  respondStore(id, accept) {
    commit((d) => {
      const r = d.storeRequests.find((x) => x.id === id);
      if (r.brandId !== d.session.userId || r.status !== 'new') throw new Error('This request can\'t be changed.');
      r.status = accept ? 'talking' : 'declined';
      notify(d, r.buyerId, `${brandName(currentUser(d))} ${accept ? 'is happy to talk. Check Messages.' : 'can\'t supply right now.'}`, '/retail?tab=mine');
    });
  },
  // Either side records the first purchase order; Buzz's success fee applies once per store.
  recordStoreOrder(id, value) {
    commit((d) => {
      const r = d.storeRequests.find((x) => x.id === id);
      const me = d.session.userId;
      if (![r.brandId, r.buyerId].includes(me) && !currentUser(d).admin) throw new Error('Not your request.');
      if (r.status === 'ordered') throw new Error('The first order is already recorded.');
      const amt = Number(value);
      if (!(amt > 0)) throw new Error('Enter the order value.');
      r.status = 'ordered';
      r.orderValue = amt;
      r.orderedAt = Date.now();
      const first = !d.storeRequests.some((x) => x.id !== r.id && x.status === 'ordered' && x.buyerId === r.buyerId && x.brandId === r.brandId);
      if (first && isOn(d, 'retailScouting') && amt >= setting(d, 'retailScouting', 'minOrder')) {
        r.fee = Math.round(amt * setting(d, 'retailScouting', 'successPct') / 100);
        earn(d, { stream: 'retailScouting', amount: r.fee, payer: r.brandId, note: `Store placement: ${campaignById(d, r.campaignId)?.productName} → ${userById(d, r.buyerId)?.buyer?.company}`, ref: r.id, uid });
      }
      notify(d, r.brandId === me ? r.buyerId : r.brandId, `First order recorded: ${peso(amt)}`, r.brandId === me ? '/retail?tab=mine' : '/workspace/shop?tab=stores');
    });
  },

  // ---------- business toolkit ----------
  requestIntro(partnerId, note) {
    commit((d) => {
      const u = currentUser(d);
      const p = d.partners.find((x) => x.id === partnerId);
      if (d.partnerLeads.some((l) => l.partnerId === p.id && l.userId === u.id && ['new', 'contacted'].includes(l.status))) throw new Error('We already sent them your details. They\'ll reach out soon.');
      d.partnerLeads.unshift({ id: uid('lead'), partnerId: p.id, userId: u.id, note: (note || '').trim(), status: 'new', createdAt: Date.now() });
      email(d, u.id, `Intro sent: ${p.name}`, `We sent ${p.name} your details. They usually reply within 1–2 working days. Mention Buzz for: ${p.perk}.`, '/workspace/toolkit');
      d.users.filter((a) => a.admin).forEach((a) => notify(d, a.id, `Toolkit intro: ${brandName(u)} → ${p.name}`, '/admin'));
    });
  },
  updateLead(id, status, fee) {
    commit((d) => {
      const l = d.partnerLeads.find((x) => x.id === id);
      const p = d.partners.find((x) => x.id === l.partnerId);
      l.status = status;
      if (status === 'closed' && !l.fee) {
        l.fee = Number(fee) || p.fee || setting(d, 'partnerReferrals', 'defaultFee');
        if (isOn(d, 'partnerReferrals')) earn(d, { stream: 'partnerReferrals', amount: l.fee, payer: null, note: `Referral: ${brandName(userById(d, l.userId))} → ${p.name}`, ref: l.id, charge: false, uid });
      }
    });
  },
  savePartner(data) {
    commit((d) => {
      if (!data.name?.trim() || !data.perk?.trim()) throw new Error('Add a name and the perk Buzz sellers get.');
      const p = { name: data.name.trim(), category: data.category, blurb: (data.blurb || '').trim(), perk: data.perk.trim(), region: data.region || 'Nationwide', fee: Number(data.fee) || 0, active: data.active !== false };
      if (data.id) Object.assign(d.partners.find((x) => x.id === data.id), p);
      else d.partners.push({ id: uid('ptn'), ...p });
    });
  },
});
