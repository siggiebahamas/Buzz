// Single local data store. Everything the app reads or writes goes through here,
// so swapping localStorage for a real backend later only touches this file.
import { useSyncExternalStore } from 'react';
import { buildSeed, hashPw, SERVICE_FEE } from './seed';
import { uid, DAY, peso } from './format';
import { rankCreators } from './match';

const KEY = 'buzz-db-v6';
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 6) return parsed;
    }
  } catch { /* storage blocked or corrupt: fall through to fresh seed */ }
  return buildSeed();
}

let db = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

function commit(fn) {
  const next = structuredClone(db);
  const result = fn(next);
  db = next;
  save();
  listeners.forEach((l) => l());
  return result;
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export function useDB() {
  return useSyncExternalStore(subscribe, () => db);
}

export const getDB = () => db;

// ---------- selectors ----------
export const userById = (d, id) => d.users.find((u) => u.id === id);
export const currentUser = (d) => userById(d, d.session.userId);
export const campaignById = (d, id) => d.campaigns.find((c) => c.id === id);
export const membersOf = (d, cid) => d.applications.filter((a) => a.campaignId === cid && a.status === 'accepted').map((a) => a.creatorId);
export const applicantsCount = (d, cid) => d.applications.filter((a) => a.campaignId === cid).length;
export const isSaved = (d, kind, refId) => d.saved.some((s) => s.userId === d.session.userId && s.kind === kind && s.refId === refId);
export const creators = (d) => d.users.filter((u) => u.creator && !u.suspended);
export const liveCampaigns = (d) => d.campaigns.filter((c) => c.published && !c.removed && !userById(d, c.ownerId)?.suspended);
export const isAdmin = (d) => !!currentUser(d)?.admin;
export const walletOf = (d, userId) => {
  const txs = d.transactions.filter((t) => t.userId === userId);
  const balance = txs.filter((t) => ['release', 'payout', 'refund'].includes(t.type)).reduce((a, t) => a + t.amount, 0);
  const held = d.deliverables.filter((x) => x.escrow === 'held' && (x.creatorId === userId || campaignById(d, x.campaignId)?.ownerId === userId)).reduce((a, x) => a + x.fee, 0);
  return { txs: txs.sort((a, b) => b.ts - a.ts), balance, held };
};
export { SERVICE_FEE };
export const brandName = (u) => u?.business?.name || u?.name || 'Unknown';
export const displayName = (u) => (u?.business && !u.creator ? u.business.name : u?.name) || 'Unknown';
export const ratingOf = (d, userId) => {
  const rs = d.reviews.filter((r) => r.toId === userId);
  return rs.length ? { avg: rs.reduce((a, r) => a + r.rating, 0) / rs.length, count: rs.length } : { avg: null, count: 0 };
};
export const followersOf = (u) => (u?.creator?.platforms || []).reduce((a, p) => a + Number(p.followers || 0), 0);

const EMAIL_TOPIC = (link) => (link.includes('collaborations') ? 'apps' : link.includes('deliverables') ? 'deliverables' : link.includes('analytics') || link.includes('payments') ? 'sales' : link.includes('community') ? 'community' : 'apps');

function email(d, userId, subject, body, link) {
  const u = userById(d, userId);
  if (!u) return;
  d.emails.unshift({ id: uid('eml'), userId, to: u.email, subject, body, link, ts: Date.now() });
}

function notify(d, userId, text, link) {
  if (!userId) return;
  d.notifications.unshift({ id: uid('ntf'), userId, text, link, ts: Date.now(), read: false });
  const prefs = userById(d, userId)?.settings?.notif;
  if (prefs?.email && prefs[EMAIL_TOPIC(link)] !== false) email(d, userId, text, `${text}\n\nOpen Buzz to take action.`, link);
}

function threadFor(d, a, b, campaignId = null) {
  let t = d.threads.find((x) => x.participants.includes(a) && x.participants.includes(b) && (x.campaignId || null) === campaignId);
  if (!t) {
    t = { id: uid('thr'), participants: [a, b], campaignId, messages: [], lastRead: { [a]: Date.now(), [b]: 0 } };
    d.threads.unshift(t);
  }
  return t;
}

function pushMessage(d, t, from, body) {
  t.messages.push({ id: uid('msg'), from, body, ts: Date.now() });
  t.lastRead[from] = Date.now();
}

// ---------- session ----------
export const actions = {
  login(userId) {
    commit((d) => {
      const u = userById(d, userId);
      d.session = { userId, mode: u?.primary === 'creator' ? 'creator' : 'business' };
    });
  },
  loginWithPassword(emailAddr, password) {
    const u = db.users.find((x) => x.email.toLowerCase() === emailAddr.trim().toLowerCase());
    if (!u || u.pw !== hashPw(password)) throw new Error('Wrong email or password.');
    if (u.suspended) throw new Error('This account is suspended. Contact support@buzz.ph.');
    actions.login(u.id);
  },
  requestReset(emailAddr) {
    const u = db.users.find((x) => x.email.toLowerCase() === emailAddr.trim().toLowerCase());
    if (!u) return; // Same response either way so emails can't be probed.
    commit((d) => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      d.resets = d.resets.filter((r) => r.userId !== u.id);
      d.resets.push({ userId: u.id, code, exp: Date.now() + 30 * 60000 });
      email(d, u.id, 'Your Buzz password reset code', `Your code is ${code}. It expires in 30 minutes. If you didn't ask for this, ignore this email.`, '/reset');
    });
  },
  resetPassword(emailAddr, code, password) {
    commit((d) => {
      const u = d.users.find((x) => x.email.toLowerCase() === emailAddr.trim().toLowerCase());
      const r = u && d.resets.find((x) => x.userId === u.id && x.code === code.trim());
      if (!r) throw new Error('That code is wrong. Check the latest email we sent.');
      if (r.exp < Date.now()) throw new Error('That code expired. Request a new one.');
      if (password.length < 8) throw new Error('Use at least 8 characters.');
      u.pw = hashPw(password);
      d.resets = d.resets.filter((x) => x !== r);
      email(d, u.id, 'Your Buzz password was changed', 'Your password was just changed. If this wasn\'t you, reset it again right away.', '/login');
    });
  },
  changePassword(oldPw, newPw) {
    commit((d) => {
      const u = currentUser(d);
      if (u.pw !== hashPw(oldPw)) throw new Error('Your current password is wrong.');
      if (newPw.length < 8) throw new Error('Use at least 8 characters.');
      u.pw = hashPw(newPw);
      email(d, u.id, 'Your Buzz password was changed', 'Your password was just changed from Settings.', '/workspace/settings');
    });
  },
  logout() { commit((d) => { d.session = { userId: null, mode: 'business' }; }); },
  setMode(mode) { commit((d) => { d.session.mode = mode; }); },
  resetDemo() {
    db = buildSeed();
    save();
    listeners.forEach((l) => l());
  },
  signup({ password, name, email, role, location, region, businessName, businessType, category, handle, niche, platform, followers }) {
    return commit((d) => {
      if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists.');
      const u = {
        id: uid('u'), name, email, color: '#F59E0B', photo: null, location: location || '', region: region || 'Metro Manila',
        joinedAt: Date.now(), bio: '', primary: role, pw: hashPw(password || ''), verified: false, suspended: false, admin: false,
        settings: { notif: { apps: true, deliverables: true, sales: true, community: false, email: true }, privacy: { public: true, showEarnings: false, showRates: true } },
        business: role === 'business' ? { name: businessName || name, type: businessType || '', category: category || 'fashion', website: '', shopUrl: '', tagline: businessType || '' } : null,
        creator: role === 'creator' ? {
          handle: (handle || name).replace(/^@/, '').replace(/\s+/g, '').toLowerCase(), niches: [niche || 'food'], engagement: 0,
          platforms: platform ? [{ id: platform, followers: Number(followers) || 0 }] : [], rates: { reel: 0, post: 0, story: 0 }, audience: '',
        } : null,
      };
      d.users.push(u);
      d.session = { userId: u.id, mode: role };
      notify(d, u.id, 'Welcome to Buzz! Complete your profile to get better matches.', '/workspace/profile');
      email(d, u.id, 'Welcome to Buzz', `Hi ${name.split(' ')[0]}, your account is ready. Complete your profile so we can match you with the right ${role === 'creator' ? 'brands' : 'creators'}.`, '/workspace/profile');
      return u.id;
    });
  },
  updateProfile(patch) {
    commit((d) => {
      const u = currentUser(d);
      Object.assign(u, patch.base || {});
      if (patch.business !== undefined) u.business = patch.business ? { ...(u.business || {}), ...patch.business } : null;
      if (patch.creator !== undefined) u.creator = patch.creator ? { ...(u.creator || {}), ...patch.creator } : null;
    });
  },
  recordProfileView(userId) {
    if (!userId || userId === db.session.userId) return;
    commit((d) => { d.profileViews.push({ userId, ts: Date.now() }); });
  },

  // ---------- campaigns / opportunities ----------
  saveCampaign(data) {
    return commit((d) => {
      if (data.id) {
        const c = campaignById(d, data.id);
        Object.assign(c, data);
        return c.id;
      }
      const c = {
        id: uid('cmp'), ownerId: d.session.userId, createdAt: Date.now(), views: 0, status: 'recruiting', published: true,
        photoHints: [], shopUrl: '', contentRights: '90 days', region: currentUser(d).region, aov: 0,
        promo: (data.productName || 'BUZZ').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'BUZZ',
        ...data,
      };
      d.campaigns.unshift(c);
      // Tell the creators who fit best, so good listings don't wait to be found.
      if (c.published) {
        rankCreators(d, c).filter((x) => x.m.score >= 70).slice(0, 8).forEach(({ u, m }) => {
          notify(d, u.id, `New listing that fits you (${m.label}): ${c.productName}`, `/opportunity/${c.id}`);
        });
      }
      return c.id;
    });
  },
  setCampaignStatus(cid, status) {
    commit((d) => {
      const c = campaignById(d, cid);
      c.status = status;
      membersOf(d, cid).forEach((m) => notify(d, m, `${c.productName} moved to ${status}`, `/opportunity/${cid}`));
    });
  },
  // Content awaiting approval for 7+ days is approved automatically (see Terms).
  sweep() {
    const due = db.deliverables.filter((x) => x.status === 'submitted' && x.submittedAt < Date.now() - 7 * DAY);
    if (!due.length) return;
    commit((d) => {
      d.deliverables.filter((x) => x.status === 'submitted' && x.submittedAt < Date.now() - 7 * DAY).forEach((x) => {
        x.status = 'approved';
        x.approvedAt = Date.now();
        x.note = 'Approved automatically after 7 days without a response.';
        notify(d, campaignById(d, x.campaignId).ownerId, `"${x.title}" was approved automatically after 7 days`, '/workspace/deliverables');
        if (x.escrow === 'held') release(d, x);
      });
    });
  },
  deleteCampaign(cid) {
    commit((d) => {
      d.deliverables.filter((x) => x.campaignId === cid && x.escrow === 'held').forEach((x) => {
        d.transactions.push({ id: uid('tx'), userId: d.session.userId, type: 'refund', amount: Math.round(x.fee * (1 + SERVICE_FEE)), ts: Date.now(), ref: x.id, note: `Escrow refund: ${x.title}` });
      });
      d.campaigns = d.campaigns.filter((c) => c.id !== cid);
      d.applications = d.applications.filter((a) => a.campaignId !== cid);
      d.deliverables = d.deliverables.filter((x) => x.campaignId !== cid);
    });
  },
  viewCampaign(cid) {
    commit((d) => { const c = campaignById(d, cid); if (c && c.ownerId !== d.session.userId) c.views += 1; });
  },

  // ---------- applications ----------
  apply(cid, { pitch, rate }) {
    commit((d) => {
      const me = d.session.userId;
      const c = campaignById(d, cid);
      if (d.applications.some((a) => a.campaignId === cid && a.creatorId === me && a.status !== 'withdrawn')) throw new Error('You already applied to this opportunity.');
      d.applications.unshift({ id: uid('app'), campaignId: cid, creatorId: me, pitch, rate: Number(rate) || 0, status: 'pending', source: 'apply', createdAt: Date.now(), decidedAt: null });
      const t = threadFor(d, me, c.ownerId, cid);
      pushMessage(d, t, me, `Hi! I just applied to "${c.title}". ${pitch}`);
      notify(d, c.ownerId, `${currentUser(d).name} applied to ${c.productName}`, '/workspace/collaborations');
    });
  },
  invite(cid, creatorId, note) {
    commit((d) => {
      const c = campaignById(d, cid);
      const existing = d.applications.find((a) => a.campaignId === cid && a.creatorId === creatorId && a.status !== 'withdrawn');
      if (existing) throw new Error('This creator is already part of or invited to this campaign.');
      const creator = userById(d, creatorId);
      d.applications.unshift({ id: uid('app'), campaignId: cid, creatorId, pitch: note || '', rate: creator.creator?.rates?.reel || 0, status: 'invited', source: 'invite', createdAt: Date.now(), decidedAt: null });
      const t = threadFor(d, c.ownerId, creatorId, cid);
      pushMessage(d, t, c.ownerId, note || `Hi ${creator.name.split(' ')[0]}! We'd love to have you on "${c.productName}".`);
      notify(d, creatorId, `${displayName(currentUser(d))} invited you to ${c.productName}`, '/workspace/collaborations');
    });
  },
  decide(appId, decision) {
    commit((d) => {
      const a = d.applications.find((x) => x.id === appId);
      const c = campaignById(d, a.campaignId);
      a.status = decision;
      a.decidedAt = Date.now();
      if (decision === 'accepted') {
        const creator = userById(d, a.creatorId);
        if (!d.links.some((l) => l.campaignId === c.id && l.creatorId === a.creatorId)) {
          d.links.push({ id: uid('lnk'), campaignId: c.id, creatorId: a.creatorId, code: `${c.promo}-${(creator.creator?.handle || creator.name).replace(/[^a-z]/gi, '').slice(0, 5).toUpperCase()}`, createdAt: Date.now() });
        }
        const perPiece = c.deliverables.reduce((s, x) => s + Number(x.qty || 1), 0) || 1;
        let slot = 0;
        c.deliverables.forEach((tpl) => {
          for (let k = 0; k < (Number(tpl.qty) || 1); k++) {
            slot += 1;
            d.deliverables.push({
              id: uid('del'), campaignId: c.id, creatorId: a.creatorId, type: tpl.type, platform: tpl.platform,
              title: `${tpl.type} for ${c.productName}`, dueAt: Date.now() + (7 + slot * 7) * DAY,
              fee: ['commission', 'gifted'].includes(c.compensation) ? 0 : Math.round((a.rate || c.budgetMin) / perPiece / 50) * 50,
              status: 'todo', submittedAt: null, approvedAt: null, paidAt: null, contentUrl: '', stats: null, note: '',
            });
            const last = d.deliverables[d.deliverables.length - 1];
            last.escrow = last.fee ? 'unfunded' : 'none';
          }
        });
        if (c.status === 'recruiting') c.status = 'active';
      }
      const actor = d.session.userId;
      const other = actor === a.creatorId ? c.ownerId : a.creatorId;
      const who = actor === a.creatorId ? currentUser(d).name : displayName(userById(d, c.ownerId));
      const verb = { accepted: 'accepted', declined: 'declined', withdrawn: 'withdrew' }[decision];
      notify(d, other, `${who} ${verb} ${actor === a.creatorId ? 'the invite to' : 'your application for'} ${c.productName}`, '/workspace/collaborations');
    });
  },

  // ---------- deliverables ----------
  addDeliverable(data) {
    commit((d) => {
      d.deliverables.push({ id: uid('del'), status: 'todo', submittedAt: null, approvedAt: null, paidAt: null, contentUrl: '', stats: null, note: '', escrow: Number(data.fee) ? 'unfunded' : 'none', ...data });
      notify(d, data.creatorId, `New deliverable: ${data.title}`, '/workspace/deliverables');
    });
  },
  submitDeliverable(id, { contentUrl, stats }) {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === id);
      Object.assign(x, { status: 'submitted', contentUrl, stats, submittedAt: Date.now() });
      const c = campaignById(d, x.campaignId);
      notify(d, c.ownerId, `${currentUser(d).name} submitted "${x.title}"`, '/workspace/deliverables');
    });
  },
  updateStats(id, stats) {
    commit((d) => { const x = d.deliverables.find((y) => y.id === id); x.stats = stats; });
  },
  reviewDeliverable(id, approve, note = '') {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === id);
      x.status = approve ? 'approved' : 'revision';
      x.note = note;
      if (approve) x.approvedAt = Date.now();
      notify(d, x.creatorId, approve ? `"${x.title}" was approved` : `Revision requested on "${x.title}"`, '/workspace/deliverables');
      if (approve && x.escrow === 'held') release(d, x);
    });
  },
  markPaid(id) {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === id);
      x.paidAt = Date.now();
      x.escrow = 'outside';
      notify(d, x.creatorId, `${displayName(currentUser(d))} marked ${peso(x.fee)} as paid outside Buzz for "${x.title}"`, '/workspace/payments');
    });
  },
  // Brand pays fees into escrow (test mode: no real money moves).
  fundEscrow(ids, method) {
    commit((d) => {
      const list = d.deliverables.filter((x) => ids.includes(x.id) && x.escrow === 'unfunded' && x.fee > 0);
      if (!list.length) throw new Error('Nothing left to fund.');
      const me = d.session.userId;
      list.forEach((x) => {
        x.escrow = 'held';
        d.transactions.push({ id: uid('tx'), userId: me, type: 'fund', amount: -Math.round(x.fee * (1 + SERVICE_FEE)), ts: Date.now(), ref: x.id, note: `Escrow for ${x.title} via ${method}` });
        notify(d, x.creatorId, `${peso(x.fee)} for "${x.title}" is now secured in escrow`, '/workspace/payments');
        if (x.status === 'approved') release(d, x);
      });
    });
  },
  withdraw(amount, method, account) {
    commit((d) => {
      const me = d.session.userId;
      const { balance } = walletOf(d, me);
      const amt = Number(amount);
      if (!(amt >= 100)) throw new Error('Minimum withdrawal is ₱100.');
      if (amt > balance) throw new Error(`You can withdraw up to ${peso(balance)}.`);
      if (!account.trim()) throw new Error('Add the account number to send to.');
      d.transactions.push({ id: uid('tx'), userId: me, type: 'payout', amount: -amt, ts: Date.now(), ref: null, note: `Withdrawal to ${method} •••• ${account.trim().slice(-4)}` });
      email(d, me, `Withdrawal of ${peso(amt)} is on its way`, `We sent ${peso(amt)} to your ${method} account ending in ${account.trim().slice(-4)}.`, '/workspace/payments');
    });
  },

  // ---------- trust & safety ----------
  report(kind, refId, reason, note) {
    commit((d) => {
      if (d.reports.some((r) => r.kind === kind && r.refId === refId && r.reporterId === d.session.userId && r.status === 'open')) throw new Error('You already reported this. Our team is reviewing it.');
      d.reports.unshift({ id: uid('rep'), kind, refId, reporterId: d.session.userId, reason, note, ts: Date.now(), status: 'open' });
      d.users.filter((u) => u.admin).forEach((a) => notify(d, a.id, `New report: ${reason}`, '/admin'));
    });
  },
  resolveReport(id, status) {
    commit((d) => { const r = d.reports.find((x) => x.id === id); r.status = status; r.resolvedAt = Date.now(); });
  },
  adminUser(id, patch) {
    commit((d) => {
      const u = userById(d, id);
      Object.assign(u, patch);
      if (patch.verified) notify(d, id, 'Your profile is now verified. The badge shows on your profile and cards.', `/profile/${id}`);
      if (patch.suspended) email(d, id, 'Your Buzz account is suspended', 'Your account was suspended after a review. Reply to this email to appeal.', '/');
    });
  },
  adminCampaign(id, patch) {
    commit((d) => {
      const c = campaignById(d, id);
      Object.assign(c, patch);
      if (patch.removed) notify(d, c.ownerId, `Your listing "${c.productName}" was removed for breaking the listing rules`, '/workspace/campaigns');
    });
  },
  adminRemovePost(id) {
    commit((d) => {
      const p = d.posts.find((x) => x.id === id);
      d.posts = d.posts.filter((x) => x.id !== id);
      if (p) notify(d, p.authorId, `Your post "${p.title}" was removed by a moderator`, '/community');
    });
  },

  // ---------- tracking ----------
  recordClick(code) {
    const link = db.links.find((l) => l.code.toLowerCase() === code.toLowerCase());
    if (!link) return null;
    commit((d) => { d.events.push({ t: 'click', linkId: link.id, ts: Date.now(), n: 1 }); });
    return campaignById(db, link.campaignId);
  },
  logSale(linkId, amount, source = 'code') {
    commit((d) => {
      d.events.push({ t: 'sale', linkId, ts: Date.now(), amount: Number(amount), source });
      const l = d.links.find((x) => x.id === linkId);
      notify(d, l.creatorId, `New sale via code ${l.code} (${peso(amount)})`, '/workspace/analytics');
    });
  },

  // ---------- community ----------
  createPost(data) {
    return commit((d) => {
      const p = { id: uid('post'), authorId: d.session.userId, likes: [], claps: [], ideas: [], interested: [], followers: [], comments: [], createdAt: Date.now(), photos: [], ...data };
      d.posts.unshift(p);
      if (data.notify && data.campaignId) {
        d.posts.filter((x) => x.campaignId === data.campaignId).flatMap((x) => x.followers)
          .filter((f, i, arr) => arr.indexOf(f) === i && f !== d.session.userId)
          .forEach((f) => notify(d, f, `New update: ${data.title}`, `/community/${p.id}`));
      }
      return p.id;
    });
  },
  // One reaction per person, like Facebook: picking another swaps it.
  react(postId, kind) {
    commit((d) => {
      const p = d.posts.find((x) => x.id === postId);
      const me = d.session.userId;
      const had = p[kind]?.includes(me);
      REACTIONS.forEach((r) => { p[r.id] = (p[r.id] || []).filter((x) => x !== me); });
      if (!had) {
        p[kind].push(me);
        if (p.authorId !== me) notify(d, p.authorId, `${currentUser(d).name} reacted ${REACTIONS.find((r) => r.id === kind).emoji} to "${p.title}"`, `/community/${p.id}`);
      }
    });
  },
  setFlag(key, value) { commit((d) => { d.flags = { ...(d.flags || {}), [key]: value }; }); },
  recordVisit() {
    const me = currentUser(db);
    const day = new Date().toISOString().slice(0, 10);
    if (!me || me.visitDays?.includes(day)) return;
    commit((d) => { const u = currentUser(d); u.visitDays = [...(u.visitDays || []), day].slice(-60); });
  },
  toggleIn(postId, field) {
    commit((d) => {
      const p = d.posts.find((x) => x.id === postId);
      const me = d.session.userId;
      const had = p[field].includes(me);
      p[field] = had ? p[field].filter((x) => x !== me) : [...p[field], me];
      if (!had && field !== 'followers' && p.authorId !== me) {
        notify(d, p.authorId, `${currentUser(d).name} ${field === 'likes' ? 'liked' : 'is interested in'} "${p.title}"`, `/community/${p.id}`);
      }
    });
  },
  comment(postId, body) {
    commit((d) => {
      const p = d.posts.find((x) => x.id === postId);
      p.comments.push({ id: uid('cmt'), authorId: d.session.userId, body, createdAt: Date.now() });
      if (p.authorId !== d.session.userId) notify(d, p.authorId, `${currentUser(d).name} commented on "${p.title}"`, `/community/${p.id}`);
    });
  },
  createCollab(data) {
    commit((d) => { d.collabs.unshift({ id: uid('col'), hostId: d.session.userId, members: [d.session.userId], createdAt: Date.now(), ...data }); });
  },
  toggleCollab(id) {
    commit((d) => {
      const c = d.collabs.find((x) => x.id === id);
      const me = d.session.userId;
      if (c.members.includes(me)) { c.members = c.members.filter((m) => m !== me); return; }
      if (c.members.length >= c.slots) throw new Error('This collab is full.');
      c.members.push(me);
      notify(d, c.hostId, `${currentUser(d).name} joined your collab "${c.title}"`, '/community?tab=collabs');
      pushMessage(d, threadFor(d, me, c.hostId), me, `Hi! I just joined "${c.title}". Let's talk details.`);
    });
  },
  review({ campaignId, toId, rating, text }) {
    commit((d) => {
      d.reviews.unshift({ id: uid('rev'), campaignId, fromId: d.session.userId, toId, rating, text, createdAt: Date.now() });
      notify(d, toId, `${currentUser(d).name} left you a ${rating}-star review`, `/profile/${toId}`);
    });
  },

  // ---------- messages / notifications / saved ----------
  openThread(otherId, campaignId = null) {
    return commit((d) => threadFor(d, d.session.userId, otherId, campaignId).id);
  },
  sendMessage(threadId, body) {
    commit((d) => {
      const t = d.threads.find((x) => x.id === threadId);
      pushMessage(d, t, d.session.userId, body);
      d.threads = [t, ...d.threads.filter((x) => x.id !== threadId)];
    });
  },
  markThreadRead(threadId) {
    const t = db.threads.find((x) => x.id === threadId);
    if (!t) return;
    const last = t.messages[t.messages.length - 1];
    if (last && (t.lastRead[db.session.userId] || 0) >= last.ts) return;
    commit((d) => { d.threads.find((x) => x.id === threadId).lastRead[d.session.userId] = Date.now(); });
  },
  markNotificationsRead() {
    commit((d) => { d.notifications.forEach((n) => { if (n.userId === d.session.userId) n.read = true; }); });
  },
  toggleSave(kind, refId) {
    commit((d) => {
      const me = d.session.userId;
      const i = d.saved.findIndex((s) => s.userId === me && s.kind === kind && s.refId === refId);
      if (i >= 0) d.saved.splice(i, 1);
      else d.saved.unshift({ id: uid('sav'), userId: me, kind, refId, ts: Date.now() });
    });
  },
};

function release(d, x) {
  x.escrow = 'released';
  x.paidAt = Date.now();
  d.transactions.push({ id: uid('tx'), userId: x.creatorId, type: 'release', amount: x.fee, ts: Date.now(), ref: x.id, note: `Payment released: ${x.title}` });
  notify(d, x.creatorId, `${peso(x.fee)} released to your Buzz wallet for "${x.title}"`, '/workspace/payments');
}

export const REACTIONS = [
  { id: 'likes', emoji: '🔥', label: 'Hype' },
  { id: 'claps', emoji: '👏', label: 'Clap' },
  { id: 'ideas', emoji: '💡', label: 'Smart' },
];
export const reactionTotal = (p) => REACTIONS.reduce((a, r) => a + (p[r.id]?.length || 0), 0);
export const myReaction = (p, userId) => REACTIONS.find((r) => p[r.id]?.includes(userId))?.id || null;

export function unreadCount(d) {
  const me = d.session.userId;
  return d.threads.filter((t) => t.participants.includes(me)).reduce((n, t) => {
    const lr = t.lastRead[me] || 0;
    return n + t.messages.filter((m) => m.from !== me && m.ts > lr).length;
  }, 0);
}
