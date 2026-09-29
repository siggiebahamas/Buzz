// Operations for trust, contracts, disputes, shipping, drafts, sales import,
// hand-picked matching, referrals, support and plans. Attached to `actions`.
import { actions, commit, notify, email, currentUser, userById, campaignById, displayName, release, threadFor, pushMessage, feeRate } from './store';
import { uid, peso, DAY } from './format';
import { rankCreators } from './match';

const me = (d) => currentUser(d);
const REFERRAL_CREDIT = 200;

function payReferral(d, u) {
  if (!u?.referredBy || u.referralPaid) return;
  u.referralPaid = true;
  [u.id, u.referredBy].forEach((id) => {
    d.transactions.push({ id: uid('tx'), userId: id, type: 'credit', amount: REFERRAL_CREDIT, ts: Date.now(), ref: u.id, note: `Referral reward: ${u.name} made their first collaboration` });
    notify(d, id, `You earned ${peso(REFERRAL_CREDIT)} Buzz credit from a referral`, '/workspace/referrals');
  });
}

Object.assign(actions, {
  // ---------- contracts ----------
  signContract(id, fullName) {
    commit((d) => {
      const k = d.contracts.find((x) => x.id === id);
      const u = me(d);
      if (fullName.trim().toLowerCase() !== u.name.trim().toLowerCase()) throw new Error(`Type your full name exactly as on your profile: ${u.name}`);
      if (u.id === k.brandId) { k.brandSignedAt = Date.now(); k.brandSignName = fullName.trim(); }
      else if (u.id === k.creatorId) { k.creatorSignedAt = Date.now(); k.creatorSignName = fullName.trim(); }
      else throw new Error('Only the two people in this agreement can sign it.');
      const other = u.id === k.brandId ? k.creatorId : k.brandId;
      const both = k.brandSignedAt && k.creatorSignedAt;
      notify(d, other, both ? `Agreement for ${k.terms.product} is signed by both sides` : `${u.name} signed the agreement for ${k.terms.product}. Your turn.`, '/workspace/contracts');
      if (both) [k.brandId, k.creatorId].forEach((p) => email(d, p, `Signed agreement: ${k.terms.product}`, `Both sides signed the collaboration agreement for ${k.terms.product}. Keep this email for your records.`, '/workspace/contracts'));
    });
  },

  // ---------- disputes ----------
  openDispute({ campaignId, deliverableId, againstId, reason, details, evidence }) {
    return commit((d) => {
      if (!details.trim()) throw new Error('Describe what happened so we can help.');
      const dup = d.disputes.find((x) => x.campaignId === campaignId && x.openedBy === d.session.userId && x.status !== 'resolved');
      if (dup) throw new Error('You already have an open dispute on this campaign. Add to it instead.');
      const x = { id: uid('dsp'), campaignId, deliverableId: deliverableId || null, openedBy: d.session.userId, againstId, reason, details: details.trim(), evidence: evidence.filter(Boolean), status: 'open', messages: [], outcome: null, createdAt: Date.now(), respondBy: Date.now() + 3 * DAY };
      d.disputes.unshift(x);
      // Money in escrow for this collaboration stays put until Buzz decides.
      const creatorId = campaignById(d, campaignId).ownerId === x.openedBy ? againstId : x.openedBy;
      x.creatorId = creatorId;
      d.deliverables.filter((y) => y.campaignId === campaignId && y.creatorId === creatorId && y.escrow === 'held').forEach((y) => { y.frozen = true; });
      notify(d, againstId, `${displayName(me(d))} opened a dispute: ${reason}. Please respond within 3 days.`, '/workspace/disputes');
      d.users.filter((u) => u.admin).forEach((a) => notify(d, a.id, `New dispute: ${reason}`, '/admin'));
      return x.id;
    });
  },
  disputeMessage(id, body) {
    commit((d) => {
      const x = d.disputes.find((y) => y.id === id);
      if (!body.trim()) return;
      x.messages.push({ id: uid('dm'), from: d.session.userId, body: body.trim(), ts: Date.now() });
      if (x.status === 'open' && d.session.userId === x.againstId) x.status = 'responded';
      const others = [x.openedBy, x.againstId].filter((p) => p !== d.session.userId);
      others.forEach((o) => notify(d, o, `New reply on the dispute about ${campaignById(d, x.campaignId)?.productName}`, '/workspace/disputes'));
    });
  },
  // Buzz decides where escrowed money goes. share = creator's share of held fees (0..1).
  resolveDispute(id, type, share, note) {
    commit((d) => {
      const x = d.disputes.find((y) => y.id === id);
      const c = campaignById(d, x.campaignId);
      const creatorId = x.creatorId;
      const held = d.deliverables.filter((y) => y.campaignId === c.id && y.creatorId === creatorId && y.escrow === 'held');
      held.forEach((y) => {
        const toCreator = type === 'release' ? y.fee : type === 'refund' ? 0 : Math.round(y.fee * share);
        const toBrand = y.fee - toCreator;
        if (toCreator) d.transactions.push({ id: uid('tx'), userId: creatorId, type: 'release', amount: toCreator, ts: Date.now(), ref: y.id, note: `Dispute decision: ${y.title}` });
        if (toBrand) d.transactions.push({ id: uid('tx'), userId: c.ownerId, type: 'refund', amount: toBrand, ts: Date.now(), ref: y.id, note: `Dispute refund: ${y.title}` });
        y.escrow = toCreator ? 'released' : 'refunded';
        y.paidAt = toCreator ? Date.now() : null;
        y.frozen = false;
      });
      x.status = 'resolved';
      x.resolvedAt = Date.now();
      x.outcome = { type, share, note, amount: held.reduce((a, y) => a + y.fee, 0) };
      [x.openedBy, x.againstId].forEach((p) => {
        notify(d, p, `Dispute resolved for ${c.productName}: ${type === 'release' ? 'paid to the creator' : type === 'refund' ? 'refunded to the brand' : `split ${Math.round(share * 100)}/${100 - Math.round(share * 100)}`}`, '/workspace/disputes');
        email(d, p, `Dispute decision: ${c.productName}`, `${note || 'Buzz reviewed the messages, deliverables and tracking data.'}\n\nOutcome: ${type}.`, '/workspace/disputes');
      });
    });
  },

  // ---------- verification ----------
  requestVerification(data) {
    commit((d) => {
      const u = me(d);
      if (d.verifications.some((v) => v.userId === u.id && v.kind === data.kind && v.status === 'pending')) throw new Error('You already have a request in review.');
      d.verifications.unshift({ id: uid('ver'), userId: u.id, status: 'pending', createdAt: Date.now(), ...data });
      d.users.filter((a) => a.admin).forEach((a) => notify(d, a.id, `${u.name} asked for ${data.kind} verification`, '/admin'));
    });
  },
  reviewVerification(id, approve, note = '') {
    commit((d) => {
      const v = d.verifications.find((x) => x.id === id);
      v.status = approve ? 'approved' : 'rejected';
      v.note = note;
      v.reviewedAt = Date.now();
      const u = userById(d, v.userId);
      if (approve) {
        if (v.kind === 'business') u.business.verified = true;
        if (v.kind === 'creator') { u.creator.statsVerified = true; u.approved = true; }
        u.verified = true;
      }
      notify(d, u.id, approve ? `You're verified! The badge now shows on your ${v.kind === 'business' ? 'listings' : 'profile'}.` : `Verification needs another look: ${note || 'please upload a clearer document.'}`, '/workspace/verification');
      email(d, u.id, approve ? 'You\'re verified on Buzz' : 'Your Buzz verification needs changes', approve ? 'Your verified badge is live.' : note, '/workspace/verification');
    });
  },
  approveCreator(id, ok) {
    commit((d) => {
      const u = userById(d, id);
      u.approved = ok;
      notify(d, id, ok ? 'Your creator profile is approved. Brands can now find and invite you.' : 'Your creator profile wasn\'t approved yet. Add your platforms and a clear bio, then ask again.', '/workspace/profile');
    });
  },

  // ---------- drafts ----------
  submitDraft(id, { file, link, note }) {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === id);
      if (!file && !link?.trim()) throw new Error('Upload a draft or paste a link to it.');
      x.draft = { file: file || null, link: link?.trim() || '', note: note?.trim() || '', at: Date.now(), status: 'pending', feedback: '' };
      notify(d, campaignById(d, x.campaignId).ownerId, `${me(d).name} sent a draft for "${x.title}"`, '/workspace/deliverables');
    });
  },
  reviewDraft(id, ok, feedback = '') {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === id);
      x.draft.status = ok ? 'approved' : 'changes';
      x.draft.feedback = feedback;
      notify(d, x.creatorId, ok ? `Draft approved for "${x.title}". You can post it now.` : `Changes requested on your draft for "${x.title}"`, '/workspace/deliverables');
    });
  },

  // ---------- shipping ----------
  updateShipment(id, patch) {
    commit((d) => {
      const s = d.shipments.find((x) => x.id === id);
      Object.assign(s, patch);
      const c = campaignById(d, s.campaignId);
      if (patch.status === 'shipped') { s.shippedAt = Date.now(); notify(d, s.creatorId, `${displayName(userById(d, c.ownerId))} shipped your ${c.productName} (${s.courier} ${s.tracking})`, '/workspace/collaborations'); }
      if (patch.status === 'delivered') { s.deliveredAt = Date.now(); notify(d, c.ownerId, `${userById(d, s.creatorId).name} received the ${c.productName}`, `/workspace/campaigns/${c.id}`); }
    });
  },

  // ---------- sales import ----------
  // rows: [{ code, amount, date }] parsed from a shop's order export.
  importSales(rows, source) {
    return commit((d) => {
      const mine = new Set(d.campaigns.filter((c) => c.ownerId === d.session.userId).map((c) => c.id));
      const byCode = Object.fromEntries(d.links.filter((l) => mine.has(l.campaignId)).map((l) => [l.code.toUpperCase(), l]));
      let matched = 0;
      let total = 0;
      const unknown = new Set();
      rows.forEach((r) => {
        const l = byCode[String(r.code || '').trim().toUpperCase()];
        const amt = Number(String(r.amount).replace(/[^\d.]/g, ''));
        if (!l || !(amt > 0)) { if (r.code) unknown.add(r.code); return; }
        const ts = r.date && !Number.isNaN(Date.parse(r.date)) ? Date.parse(r.date) : Date.now();
        d.events.push({ t: 'sale', linkId: l.id, ts: Math.min(ts, Date.now()), amount: amt, source });
        matched += 1;
        total += amt;
      });
      d.saleImports.unshift({ id: uid('imp'), userId: d.session.userId, source, rows: rows.length, matched, total, ts: Date.now() });
      return { matched, total, unknown: [...unknown] };
    });
  },

  // ---------- hand-picked matching ----------
  requestConcierge(campaignId, note) {
    commit((d) => {
      const u = me(d);
      if (u.plan !== 'pro' && d.concierge.filter((x) => x.brandId === u.id).length >= 1) throw new Error('Free plans include one hand-picked request. Upgrade to Pro for unlimited requests.');
      if (d.concierge.some((x) => x.campaignId === campaignId && x.status === 'open')) throw new Error('We\'re already hand-picking creators for this campaign.');
      d.concierge.unshift({ id: uid('cnc'), campaignId, brandId: u.id, note: note.trim(), status: 'open', picks: [], createdAt: Date.now() });
      d.users.filter((a) => a.admin).forEach((a) => notify(d, a.id, `Hand-pick request: ${campaignById(d, campaignId)?.productName}`, '/admin'));
    });
  },
  deliverConcierge(id, creatorIds, message) {
    commit((d) => {
      const x = d.concierge.find((y) => y.id === id);
      const c = campaignById(d, x.campaignId);
      creatorIds.forEach((cid) => {
        if (d.applications.some((a) => a.campaignId === c.id && a.creatorId === cid && a.status !== 'withdrawn')) return;
        const cr = userById(d, cid);
        d.applications.unshift({ id: uid('app'), campaignId: c.id, creatorId: cid, pitch: message, rate: cr.creator?.rates?.reel || 0, status: 'invited', source: 'invite', createdAt: Date.now(), decidedAt: null });
        const t = threadFor(d, c.ownerId, cid, c.id);
        pushMessage(d, t, c.ownerId, `Hi ${cr.name.split(' ')[0]}! The Buzz team picked you for ${c.productName}. ${message}`);
        notify(d, cid, `Buzz hand-picked you for ${c.productName}`, '/workspace/collaborations');
      });
      x.status = 'done';
      x.picks = creatorIds;
      x.doneAt = Date.now();
      notify(d, x.brandId, `Buzz hand-picked ${creatorIds.length} creators for ${c.productName} and invited them for you`, `/workspace/campaigns/${c.id}`);
    });
  },

  // ---------- support ----------
  openTicket({ topic, subject, body }) {
    commit((d) => {
      if (!subject.trim() || !body.trim()) throw new Error('Add a subject and describe the problem.');
      d.tickets.unshift({ id: uid('tkt'), userId: d.session.userId, topic, subject: subject.trim(), body: body.trim(), status: 'open', replies: [], createdAt: Date.now() });
      d.users.filter((a) => a.admin).forEach((a) => notify(d, a.id, `Support: ${subject.trim()}`, '/admin'));
      email(d, d.session.userId, `We got your message: ${subject.trim()}`, 'Thanks for reaching out. We reply within one working day.', '/help');
    });
  },
  replyTicket(id, body, close = false) {
    commit((d) => {
      const t = d.tickets.find((x) => x.id === id);
      if (body.trim()) t.replies.push({ from: d.session.userId, body: body.trim(), ts: Date.now() });
      const staff = me(d).admin && me(d).id !== t.userId;
      t.status = close ? 'closed' : staff ? 'answered' : 'open';
      if (staff) { notify(d, t.userId, `Buzz support replied: ${t.subject}`, '/help'); email(d, t.userId, `Re: ${t.subject}`, body, '/help'); }
    });
  },

  // ---------- plans & referrals ----------
  setPlan(plan) {
    commit((d) => {
      const u = me(d);
      u.plan = plan;
      if (plan === 'pro') d.transactions.push({ id: uid('tx'), userId: u.id, type: 'subscription', amount: -1499, ts: Date.now(), ref: null, note: 'Buzz Pro, monthly (test mode)' });
      notify(d, u.id, plan === 'pro' ? 'Welcome to Buzz Pro. Your service fee is now 3%.' : 'You\'re on the Free plan.', '/pricing');
    });
  },
  payReferralIfDue(userId) {
    commit((d) => payReferral(d, userById(d, userId)));
  },
});

// First paid collaboration triggers the referral reward for both people.
const baseFund = actions.fundEscrow;
actions.fundEscrow = (ids, method) => {
  baseFund(ids, method);
  actions.payReferralIfDue(currentUser(getState()).id);
};
const baseReview = actions.reviewDeliverable;
actions.reviewDeliverable = (id, approve, note) => {
  baseReview(id, approve, note);
  const x = getState().deliverables.find((y) => y.id === id);
  if (approve && x) actions.payReferralIfDue(x.creatorId);
};

import { getDB as getState } from './store';
export { feeRate, REFERRAL_CREDIT, rankCreators };

// Data Privacy Act rights: a copy of your data, and closing your account.
Object.assign(actions, {
  exportMyData() {
    const d = getState();
    const id = d.session.userId;
    const mine = (arr, ...keys) => arr.filter((x) => keys.some((k) => x[k] === id));
    const u = { ...d.users.find((x) => x.id === id) };
    delete u.pw;
    return {
      exportedAt: new Date().toISOString(), profile: u,
      campaigns: mine(d.campaigns, 'ownerId'), applications: mine(d.applications, 'creatorId'),
      deliverables: mine(d.deliverables, 'creatorId'), contracts: mine(d.contracts, 'brandId', 'creatorId'),
      transactions: mine(d.transactions, 'userId'), posts: mine(d.posts, 'authorId'), reviewsReceived: mine(d.reviews, 'toId'),
      messages: d.threads.filter((t) => t.participants.includes(id)), notifications: mine(d.notifications, 'userId'),
    };
  },
  deleteAccount(password) {
    commit((d) => {
      const u = currentUser(d);
      if (hashPw(password) !== u.pw) throw new Error('Your password is wrong.');
      const open = d.deliverables.some((x) => x.escrow === 'held' && (x.creatorId === u.id || campaignById(d, x.campaignId)?.ownerId === u.id));
      if (open) throw new Error('You have money in escrow. Finish or cancel those collaborations first, or contact support.');
      if (walletOf(d, u.id).balance > 0) throw new Error('Withdraw your wallet balance before closing your account.');
      d.campaigns.filter((c) => c.ownerId === u.id).forEach((c) => { c.published = false; c.removed = true; });
      // Keep financial records (required by law) but remove personal details.
      Object.assign(u, { name: 'Deleted user', email: `deleted-${u.id}@buzz.ph`, bio: '', photo: null, location: '', shipping: null, suspended: true, deleted: true, pw: '' });
      if (u.creator) u.creator = { ...u.creator, handle: 'deleted', audience: '', platforms: [] };
      d.saved = d.saved.filter((s) => s.userId !== u.id);
      d.session = { userId: null, mode: 'business' };
    });
  },
});
import { hashPw } from './seed';
import { walletOf } from './store';
