// Single local data store. Everything the app reads or writes goes through here,
// so swapping localStorage for a real backend later only touches this file.
import { useSyncExternalStore } from 'react';
import { buildSeed } from './seed';
import { uid, DAY, peso } from './format';

const KEY = 'buzz-db-v2';
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) return parsed;
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
export const creators = (d) => d.users.filter((u) => u.creator);
export const brandName = (u) => u?.business?.name || u?.name || 'Unknown';
export const displayName = (u) => (u?.business && !u.creator ? u.business.name : u?.name) || 'Unknown';
export const ratingOf = (d, userId) => {
  const rs = d.reviews.filter((r) => r.toId === userId);
  return rs.length ? { avg: rs.reduce((a, r) => a + r.rating, 0) / rs.length, count: rs.length } : { avg: null, count: 0 };
};
export const followersOf = (u) => (u?.creator?.platforms || []).reduce((a, p) => a + Number(p.followers || 0), 0);

function notify(d, userId, text, link) {
  if (!userId) return;
  d.notifications.unshift({ id: uid('ntf'), userId, text, link, ts: Date.now(), read: false });
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
  logout() { commit((d) => { d.session = { userId: null, mode: 'business' }; }); },
  setMode(mode) { commit((d) => { d.session.mode = mode; }); },
  resetDemo() {
    db = buildSeed();
    save();
    listeners.forEach((l) => l());
  },
  signup({ name, email, role, location, region, businessName, businessType, category, handle, niche, platform, followers }) {
    return commit((d) => {
      if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists.');
      const u = {
        id: uid('u'), name, email, color: '#F59E0B', photo: null, location: location || '', region: region || 'Metro Manila',
        joinedAt: Date.now(), bio: '', primary: role,
        business: role === 'business' ? { name: businessName || name, type: businessType || '', category: category || 'fashion', website: '', shopUrl: '', tagline: businessType || '' } : null,
        creator: role === 'creator' ? {
          handle: (handle || name).replace(/^@/, '').replace(/\s+/g, '').toLowerCase(), niches: [niche || 'food'], engagement: 0,
          platforms: platform ? [{ id: platform, followers: Number(followers) || 0 }] : [], rates: { reel: 0, post: 0, story: 0 }, audience: '',
        } : null,
      };
      d.users.push(u);
      d.session = { userId: u.id, mode: role };
      notify(d, u.id, 'Welcome to Buzz! Complete your profile to get better matches.', '/workspace/profile');
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
  deleteCampaign(cid) {
    commit((d) => {
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
      d.deliverables.push({ id: uid('del'), status: 'todo', submittedAt: null, approvedAt: null, paidAt: null, contentUrl: '', stats: null, note: '', ...data });
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
    });
  },
  markPaid(id) {
    commit((d) => {
      const x = d.deliverables.find((y) => y.id === id);
      x.paidAt = Date.now();
      notify(d, x.creatorId, `Payment of ${peso(x.fee)} sent for "${x.title}"`, '/workspace/analytics');
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
      const p = { id: uid('post'), authorId: d.session.userId, likes: [], interested: [], followers: [], comments: [], createdAt: Date.now(), photos: [], ...data };
      d.posts.unshift(p);
      if (data.notify && data.campaignId) {
        d.posts.filter((x) => x.campaignId === data.campaignId).flatMap((x) => x.followers)
          .filter((f, i, arr) => arr.indexOf(f) === i && f !== d.session.userId)
          .forEach((f) => notify(d, f, `New update: ${data.title}`, `/community/${p.id}`));
      }
      return p.id;
    });
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

export function unreadCount(d) {
  const me = d.session.userId;
  return d.threads.filter((t) => t.participants.includes(me)).reduce((n, t) => {
    const lr = t.lastRead[me] || 0;
    return n + t.messages.filter((m) => m.from !== me && m.ts > lr).length;
  }, 0);
}
