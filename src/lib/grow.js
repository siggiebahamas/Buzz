// "Grow for free": marketing that works with little or no budget, plus the
// pieces that let Buzz deals live on TikTok. Pure helpers; actions are in growops.js.
import { categoryById } from './constants';
import { DAY } from './format';

// ---------- brand-to-brand swaps ----------
// Categories whose buyers overlap without the brands competing.
export const PAIRS = {
  food: ['home', 'travel', 'fitness', 'crafts', 'pets'],
  beauty: ['fashion', 'fitness', 'home'],
  fashion: ['beauty', 'crafts', 'travel', 'fitness'],
  crafts: ['home', 'fashion', 'food', 'travel'],
  fitness: ['food', 'beauty', 'fashion'],
  home: ['food', 'crafts', 'pets', 'beauty'],
  tech: ['fitness', 'travel', 'home'],
  travel: ['food', 'fashion', 'crafts', 'tech'],
  pets: ['home', 'food'],
};
const AUDIENCE_WORDS = ['women', 'men', 'moms', 'dads', 'parents', 'students', 'teens', 'gen z', 'millennials', 'professionals', 'couples', 'families',
  'home cooks', 'foodies', 'travelers', 'runners', 'gym', 'pet owners', 'gamers', 'brides', 'balikbayan', 'ofw', 'manila', 'cebu', 'davao', 'quezon city', 'makati'];

export function audienceWords(d, u) {
  const text = [u.business?.tagline, u.business?.type, u.bio, ...d.campaigns.filter((c) => c.ownerId === u.id).map((c) => c.audience)]
    .join(' ').toLowerCase();
  const words = AUDIENCE_WORDS.filter((w) => new RegExp(`\\b${w}\\b`).test(text));
  const ages = [...text.matchAll(/(\d{2})\s*[–-]\s*(\d{2})/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return { words, ages };
}

export const SWAP_OFFERS = ['Instagram story shout-out', 'Feed post or reel', 'TikTok video', 'Product in each other\'s orders (flyer or sample)', 'Joint giveaway', 'Facebook page post'];

// Non-competing brands that share an audience, best first.
export function swapMatches(d, me) {
  if (!me?.business) return [];
  const mine = me.business.category;
  const a = audienceWords(d, me);
  const busy = new Set(d.swaps.filter((s) => ['proposed', 'active'].includes(s.status) && (s.fromId === me.id || s.toId === me.id)).map((s) => (s.fromId === me.id ? s.toId : s.fromId)));
  const since = Date.now() - 30 * DAY;
  return d.users
    .filter((u) => u.business && u.id !== me.id && !u.suspended && u.business.category !== mine && !busy.has(u.id))
    .map((u) => {
      const reasons = [];
      let score = 0;
      const cat = categoryById(u.business.category).label;
      if (PAIRS[mine]?.includes(u.business.category)) { score += 40; reasons.push(`${categoryById(mine).label} and ${cat} buyers overlap, and you don't compete`); } else score += 12;
      if (u.region && u.region === me.region) { score += 25; reasons.push(`Both in ${u.region}`); } else if ([u.region, me.region].includes('Nationwide')) score += 12;
      const b = audienceWords(d, u);
      const shared = a.words.filter((w) => b.words.includes(w));
      const ageOverlap = a.ages.some(([x1, y1]) => b.ages.some(([x2, y2]) => x1 <= y2 && x2 <= y1));
      score += Math.min(20, shared.length * 7 + (ageOverlap ? 6 : 0));
      if (shared.length) reasons.push(`Same customers: ${shared.slice(0, 3).join(', ')}`);
      else if (ageOverlap) reasons.push('Customers in the same age group');
      const active = d.campaigns.some((c) => c.ownerId === u.id && c.createdAt > since) || d.posts.some((p) => p.authorId === u.id && p.createdAt > since);
      if (active) { score += 15; reasons.push('Active on Buzz this month'); }
      const done = d.swaps.filter((s) => s.status === 'done' && (s.fromId === u.id || s.toId === u.id)).length;
      if (done) reasons.push(`${done} swap${done > 1 ? 's' : ''} completed`);
      return { u, score: Math.min(99, score), reasons };
    })
    .sort((x, y) => y.score - x.score);
}

// ---------- Launch Pad ----------
export function weekStart(ts = Date.now()) {
  const t = new Date(ts);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // Monday
  return t.getTime();
}
export const launchesFor = (d, week) => d.launches.filter((l) => l.week === week).sort((a, b) => b.votes.length - a.votes.length || a.createdAt - b.createdAt);

// ---------- customer creators ----------
export const ugcProgramOf = (d, brandId) => d.ugcPrograms.find((p) => p.brandId === brandId);
export function voucherCode(prefix) {
  const s = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${(prefix || 'BUZZ').replace(/[^A-Z]/gi, '').slice(0, 6).toUpperCase()}-${s}`;
}

// ---------- group deals ----------
export const shareOf = (g) => Math.round(g.fee / g.slots);
export const groupStatusLabel = {
  forming: 'Looking for brands', invited: 'Waiting for the creator', active: 'Creator is working on it',
  posted: 'Posted: confirm it went up', done: 'Done', cancelled: 'Cancelled',
};

// ---------- shop page ----------
export function shopLinks(u) {
  const b = u.business || {};
  return [
    ['TikTok Shop', b.tiktokShopUrl], ['Shopee', b.shopUrl?.includes('shopee') ? b.shopUrl : b.shopeeUrl], ['Lazada', b.lazadaUrl],
    ['Website', b.website], ['Order on Facebook', b.facebookUrl],
  ].filter(([, url]) => url);
}
export function socialLinks(u) {
  const b = u.business || {};
  const handle = (h) => (h || '').replace(/^@/, '');
  return [
    b.tiktok && ['TikTok', `https://www.tiktok.com/@${handle(b.tiktok)}`, `@${handle(b.tiktok)}`],
    b.instagram && ['Instagram', `https://www.instagram.com/${handle(b.instagram)}`, `@${handle(b.instagram)}`],
  ].filter(Boolean);
}
