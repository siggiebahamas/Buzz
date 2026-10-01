// Actions for swaps, Launch Pad, customer creators and the
// TikTok pieces (ad-boost codes, affiliate links). Attached to `actions`.
import { actions, commit, notify, email, currentUser, userById, campaignById, brandName, threadFor, pushMessage } from './store';
import { uid, peso, DAY } from './format';
import { weekStart, ugcProgramOf, voucherCode } from './grow';

const me = (d) => currentUser(d);
const mustBrand = (d) => {
  const u = me(d);
  if (!u?.business) throw new Error('Add a business profile in My Profile first.');
  return u;
};

Object.assign(actions, {
  // ---------- brand-to-brand swaps ----------
  proposeSwap({ toId, give, ask, note }) {
    return commit((d) => {
      const u = mustBrand(d);
      if (!give || !ask) throw new Error('Say what you\'ll post for them and what you\'d like back.');
      if (d.swaps.some((s) => ['proposed', 'active'].includes(s.status) && [s.fromId, s.toId].includes(u.id) && [s.fromId, s.toId].includes(toId))) throw new Error('You already have an open swap with this brand.');
      const s = { id: uid('swp'), fromId: u.id, toId, give, ask, note: (note || '').trim(), status: 'proposed', fromUrl: '', toUrl: '', createdAt: Date.now() };
      d.swaps.unshift(s);
      const t = threadFor(d, u.id, toId, null);
      pushMessage(d, t, u.id, `Hi! Want to swap shout-outs? I'll do: ${give}. In return: ${ask}.${s.note ? ` ${s.note}` : ''}`);
      notify(d, toId, `${brandName(u)} wants to swap shout-outs with you`, '/workspace/swaps');
      return s.id;
    });
  },
  respondSwap(id, accept) {
    commit((d) => {
      const s = d.swaps.find((x) => x.id === id);
      if (s.toId !== d.session.userId || s.status !== 'proposed') throw new Error('This swap can\'t be changed.');
      s.status = accept ? 'active' : 'declined';
      s.decidedAt = Date.now();
      notify(d, s.fromId, `${brandName(me(d))} ${accept ? 'accepted' : 'declined'} your swap`, '/workspace/swaps');
    });
  },
  postSwap(id, url) {
    commit((d) => {
      const s = d.swaps.find((x) => x.id === id);
      const u = d.session.userId;
      if (s.status !== 'active' || ![s.fromId, s.toId].includes(u)) throw new Error('This swap isn\'t active.');
      if (!/^https?:\/\//.test((url || '').trim())) throw new Error('Paste the link to your post.');
      if (u === s.fromId) s.fromUrl = url.trim(); else s.toUrl = url.trim();
      const other = u === s.fromId ? s.toId : s.fromId;
      if (s.fromUrl && s.toUrl) {
        s.status = 'done';
        s.doneAt = Date.now();
        [s.fromId, s.toId].forEach((x) => notify(d, x, 'Swap complete: both posts are up', '/workspace/swaps'));
      } else notify(d, other, `${brandName(me(d))} posted their side of your swap. Your turn!`, '/workspace/swaps');
    });
  },
  cancelSwap(id) {
    commit((d) => {
      const s = d.swaps.find((x) => x.id === id);
      if (![s.fromId, s.toId].includes(d.session.userId) || s.status === 'done') throw new Error('This swap can\'t be cancelled.');
      s.status = 'cancelled';
      notify(d, s.fromId === d.session.userId ? s.toId : s.fromId, `${brandName(me(d))} cancelled a swap`, '/workspace/swaps');
    });
  },

  // ---------- Launch Pad ----------
  submitLaunch(data) {
    return commit((d) => {
      const u = mustBrand(d);
      const week = weekStart();
      if (d.launches.some((l) => l.brandId === u.id && l.week === week)) throw new Error('One launch per brand each week. Come back Monday!');
      if (!data.title?.trim() || !data.pitch?.trim()) throw new Error('Add a product name and a one-line pitch.');
      const l = { id: uid('lch'), brandId: u.id, week, title: data.title.trim(), pitch: data.pitch.trim(), category: data.category || u.business.category, photo: data.photo || '', price: Number(data.price) || 0, campaignId: data.campaignId || null, shopUrl: (data.shopUrl || '').trim(), votes: [], interested: [], createdAt: Date.now() };
      d.launches.unshift(l);
      return l.id;
    });
  },
  voteLaunch(id) {
    commit((d) => {
      const l = d.launches.find((x) => x.id === id);
      const u = d.session.userId;
      if (l.brandId === u) throw new Error('You can\'t vote for your own launch.');
      if (l.week !== weekStart()) throw new Error('Voting for that week has closed.');
      l.votes = l.votes.includes(u) ? l.votes.filter((x) => x !== u) : [...l.votes, u];
    });
  },
  wantToPost(id, note) {
    commit((d) => {
      const l = d.launches.find((x) => x.id === id);
      const u = me(d);
      if (!u?.creator) throw new Error('Add a creator profile in My Profile to offer a post.');
      if (l.interested.includes(u.id)) throw new Error('You already told them. Check Messages for their reply.');
      l.interested.push(u.id);
      const t = threadFor(d, u.id, l.brandId, l.campaignId);
      pushMessage(d, t, u.id, note?.trim() || `Hi! Saw "${l.title}" on the Launch Pad and I'd love to post about it. Open to product-for-content?`);
      notify(d, l.brandId, `${u.name} wants to post about "${l.title}"`, '/workspace/messages');
    });
  },

  // ---------- customer creators ----------
  saveUgcProgram(data) {
    commit((d) => {
      const u = mustBrand(d);
      const credit = Number(data.credit);
      if (!(credit >= 50)) throw new Error('Offer at least ₱50 in store credit.');
      const p = ugcProgramOf(d, u.id);
      const fields = { credit, ask: (data.ask || '').trim() || 'Post a photo or video of our product and tag us.', minFollowers: Number(data.minFollowers) || 0, active: data.active !== false };
      if (p) Object.assign(p, fields);
      else d.ugcPrograms.push({ id: uid('ugp'), brandId: u.id, code: `${(u.business.name || u.name).replace(/[^a-z]/gi, '').slice(0, 8).toLowerCase()}${Math.random().toString(36).slice(2, 5)}`, createdAt: Date.now(), ...fields });
    });
  },
  submitUgc(code, { url, platform }) {
    commit((d) => {
      const u = me(d);
      if (!u) throw new Error('Log in first.');
      const p = d.ugcPrograms.find((x) => x.code === code);
      if (!p?.active) throw new Error('This program is closed.');
      if (p.brandId === u.id) throw new Error('This is your own program.');
      if (!/^https?:\/\//.test((url || '').trim())) throw new Error('Paste the link to your post.');
      const recent = d.ugcPosts.find((x) => x.programId === p.id && x.userId === u.id && x.status !== 'rejected' && x.createdAt > Date.now() - 30 * DAY);
      if (recent) throw new Error('One reward per month per brand. Thanks for posting!');
      d.ugcPosts.unshift({ id: uid('ugc'), programId: p.id, brandId: p.brandId, userId: u.id, url: url.trim(), platform, status: 'pending', voucher: '', createdAt: Date.now() });
      notify(d, p.brandId, `${u.name} posted about you and is waiting for their store credit`, '/workspace/customers');
    });
  },
  reviewUgc(id, approve, reason = '') {
    commit((d) => {
      const x = d.ugcPosts.find((y) => y.id === id);
      if (x.brandId !== d.session.userId || x.status !== 'pending') throw new Error('Already reviewed.');
      const p = d.ugcPrograms.find((y) => y.id === x.programId);
      const brand = me(d);
      x.status = approve ? 'approved' : 'rejected';
      x.reviewedAt = Date.now();
      if (approve) {
        x.voucher = voucherCode(brand.business?.name);
        x.credit = p.credit;
        email(d, x.userId, `Your ${peso(p.credit)} store credit from ${brandName(brand)}`, `Thanks for posting! Use code ${x.voucher} on your next order for ${peso(p.credit)} off.`, `/join/${p.code}`);
        notify(d, x.userId, `${brandName(brand)} sent you ${peso(p.credit)} store credit: ${x.voucher}`, `/join/${p.code}`);
      } else {
        x.reason = reason;
        notify(d, x.userId, `${brandName(brand)} couldn't approve your post${reason ? `: ${reason}` : ''}`, `/join/${p.code}`);
      }
    });
  },

  // ---------- TikTok: ad-boost codes and affiliate links ----------
  setBoostCode(deliverableId, code, days) {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === deliverableId);
      if (x.creatorId !== d.session.userId) throw new Error('Only the creator can add the code.');
      if (!(code || '').trim()) throw new Error('Paste the code from TikTok (or the partnership ad approval).');
      x.boostCode = code.trim();
      x.boostUntil = Date.now() + Number(days || 30) * DAY;
      const c = campaignById(d, x.campaignId);
      notify(d, c.ownerId, `${me(d).name} sent an ad-boost code for "${x.title}"`, '/workspace/library');
    });
  },
  requestBoostCode(deliverableId) {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === deliverableId);
      const c = campaignById(d, x.campaignId);
      if (c.ownerId !== d.session.userId) throw new Error('Only the brand can ask for this.');
      x.boostRequested = Date.now();
      const t = threadFor(d, c.ownerId, x.creatorId, c.id);
      pushMessage(d, t, c.ownerId, `Your "${x.title}" is doing great! Could you send an ad-boost code so we can put some budget behind it? (TikTok: post settings → Ad settings → Generate code.)`);
      notify(d, x.creatorId, `${brandName(me(d))} asked to boost your post as an ad`, '/workspace/collabs');
    });
  },
  setAffiliateUrl(linkId, url) {
    commit((d) => {
      const l = d.links.find((x) => x.id === linkId);
      if (l.creatorId !== d.session.userId) throw new Error('Only the creator can set this.');
      const v = (url || '').trim();
      if (v && !/^https?:\/\//.test(v)) throw new Error('Paste the full link, starting with https://');
      l.affiliateUrl = v;
    });
  },
});
