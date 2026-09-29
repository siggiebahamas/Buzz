// Buzz matching engine: scores how well a creator fits a campaign, from both sides.
//
// Seven factors, each 0..1, combined with weights that add up to 100:
//   theme (category + what the brief and profile actually talk about), budget,
//   audience, platforms, content quality, proven results on Buzz, and
//   location/availability. A small personal boost (what someone saved, applied
//   to or hired before) and a newcomer boost sit on top. Every factor also
//   produces a plain-language line so people can see why something ranked high.
import { categoryById, PLATFORMS } from './constants';
import { peso, compact, DAY } from './format';

// Brands care more about proof and audience; creators care more about doing
// content they love and being able to post it where they already are.
export const WEIGHTS = {
  brand: { theme: 30, budget: 20, audience: 12, platforms: 12, quality: 8, results: 10, logistics: 8 },
  creator: { theme: 38, budget: 18, audience: 8, platforms: 14, quality: 4, results: 8, logistics: 10 },
};

export const FIT_LABELS = [
  { min: 85, label: 'Perfect fit', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { min: 70, label: 'Great fit', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { min: 55, label: 'Good fit', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
  { min: 0, label: 'Worth a look', tone: 'text-ink-soft bg-canvas border-line' },
];

// ---------------------------------------------------------------- theme

// Categories that share audiences, so a creator in one can still sell the other.
const NEAR = {
  food: ['travel', 'home'], travel: ['food', 'fitness'], fashion: ['beauty', 'crafts'], beauty: ['fashion', 'fitness'],
  fitness: ['food', 'beauty'], home: ['crafts', 'pets'], crafts: ['home', 'fashion'], tech: ['home'], pets: ['home'],
};

// Words people use, mapped to the themes they signal. Filipino terms included.
const CONCEPTS = {
  cooking: 'cook cooking recipe recipes kitchen dish dishes sisig adobo home-cooking meal meals prep ulam',
  spicy: 'spicy hot sauce sauces chili chilis sili labuyo',
  snacks: 'snack snacks pasalubong mango mangoes dried chips treats',
  coffee: 'coffee barako brew brewing liberica beans cafe cup',
  bakery: 'bakery bread pandesal ube bake baked oven',
  foodie: 'food foodie foodies eats taste review reviews restaurant finds trip trips',
  workout: 'workout workouts gym training train lifting fitness coach exercise activewear pilates reformer surf',
  nutrition: 'protein whey nutrition healthy organic meal-prep',
  skincare: 'skincare serum glow skin vitamin morena routine kalamansi',
  makeup: 'makeup beauty cosmetics',
  style: 'style styling outfit outfits fashion wear shoes leather dress gown barong filipiniana terno office',
  handmade: 'handmade artisan artisans craft crafts maker makers weave weaves weavers woven carving carved carvers tinalak abaca bulul stitched stitching workshop',
  culture: 'local proudly filipino heritage indigenous culture cultural tboli ifugao dreamweavers',
  homeDecor: 'home decor furniture condo makeover interior candles candle scent scents small-space living',
  travel: 'travel island hopping stay stays surf beach resort lodge homestay trip road backpackers van siargao palawan cebu',
  gadgets: 'tech gadget gadgets device smart outlet review reviews teardown app apps',
  money: 'budget budgeting finance money ipon paluwagan savings sweldo',
  pets: 'pet pets dog dogs corgi dachshund raincoat mochi',
  genz: 'viral gen-z trends trending tries',
  family: 'family families kids moms',
};
const WORD_TO_CONCEPT = {};
Object.entries(CONCEPTS).forEach(([c, words]) => words.split(' ').forEach((w) => { WORD_TO_CONCEPT[w] = c; }));
const STOP = new Set('the a an and or for to of in on with our your you we i my is are be it this that at by from as who what can will just more most up out new looking creators creator content brand brands want need share show like'.split(' '));

function tokens(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9ñ\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.endsWith('s') && !w.endsWith('ss') && w.length > 4 ? w.slice(0, -1) : w));
}
function concepts(text) {
  const set = new Set();
  text.toLowerCase().replace(/[^a-z0-9ñ\s-]/g, ' ').split(/\s+/).forEach((w) => { if (WORD_TO_CONCEPT[w]) set.add(WORD_TO_CONCEPT[w]); });
  return set;
}
const overlap = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; a.forEach((x) => { if (b.has(x)) n++; }); return n / Math.min(a.size, b.size); };

function campaignText(c) { return `${c.title} ${c.productName} ${c.description} ${c.audience || ''} ${(c.tags || []).join(' ')}`; }
function creatorText(u, ctx) {
  const past = ctx?.creatorStats[u.id]?.pastProducts || '';
  return `${u.bio || ''} ${u.creator.audience || ''} ${u.creator.handle} ${u.creator.niches.map((n) => categoryById(n).label).join(' ')} ${past}`;
}

function themeFactor(u, c, ctx) {
  const niches = u.creator.niches || [];
  const cat = categoryById(c.category).label;
  const primary = niches[0] === c.category;
  const direct = niches.includes(c.category);
  const near = niches.some((n) => NEAR[n]?.includes(c.category));
  const catScore = primary ? 1 : direct ? 0.85 : near ? 0.45 : 0;

  const ca = concepts(creatorText(u, ctx));
  const cb = concepts(campaignText(c));
  const conceptScore = overlap(ca, cb);
  const ta = new Set(tokens(creatorText(u, ctx)));
  const tb = new Set(tokens(campaignText(c)));
  const wordScore = Math.min(1, overlap(ta, tb) * 2.5);
  const textScore = Math.max(conceptScore, wordScore * 0.8);
  const shared = [...cb].filter((x) => ca.has(x)).slice(0, 2).map((x) => CONCEPT_LABEL[x] || x);

  const score = catScore * 0.65 + textScore * 0.35;
  const who = (me) => (me ? 'You create' : 'Creates');
  let text;
  if (direct) text = { c: `${who(true)} ${cat} content${shared.length ? `, including ${shared.join(' and ')}` : ''}`, b: `${who(false)} ${cat} content${shared.length ? `, including ${shared.join(' and ')}` : ''}` };
  else if (near) text = { c: `You post ${niches.map((n) => categoryById(n).label).join(' and ')}, close to ${cat}`, b: `Posts ${niches.map((n) => categoryById(n).label).join(' and ')}, close to ${cat}` };
  else if (shared.length) text = { c: `Different category, but you both cover ${shared.join(' and ')}`, b: `Different category, but covers ${shared.join(' and ')}` };
  else text = { c: `They want ${cat} creators; you post ${niches.map((n) => categoryById(n).label).join(' and ') || 'other topics'}`, b: `Mostly posts ${niches.map((n) => categoryById(n).label).join(' and ') || 'other topics'}` };
  return { score, status: score >= 0.7 ? 'good' : score >= 0.4 ? 'ok' : 'bad', text };
}
const CONCEPT_LABEL = {
  cooking: 'home cooking', spicy: 'spicy food', snacks: 'snacks & pasalubong', coffee: 'coffee', bakery: 'baked goods', foodie: 'food reviews',
  workout: 'workouts', nutrition: 'nutrition', skincare: 'skincare', makeup: 'makeup', style: 'styling', handmade: 'handmade crafts',
  culture: 'local culture', homeDecor: 'home decor', travel: 'travel', gadgets: 'gadget reviews', money: 'personal finance', pets: 'pets', genz: 'viral trends', family: 'family',
};

// ---------------------------------------------------------------- budget

// What this creator would normally charge for exactly this set of content.
export function creatorQuote(u, c) {
  const r = u.creator.rates || {};
  const reel = r.reel || 0;
  const per = { Reel: reel, 'TikTok video': reel, 'YouTube video': reel * 2, 'Live selling': reel, 'Feed post': r.post || reel * 0.6, 'Story set': r.story || reel * 0.35 };
  return Math.round(c.deliverables.reduce((a, d) => a + (per[d.type] ?? reel) * (Number(d.qty) || 1), 0));
}

const followersOn = (u, platforms) => (u.creator.platforms || []).filter((p) => !platforms.length || platforms.includes(p.id)).reduce((a, p) => a + Number(p.followers || 0), 0);

// Rough sales a creator drives: reach → clicks → orders, using their own
// conversion history on Buzz when there is enough of it.
function expectedOrders(u, c, ctx) {
  const f = followersOn(u, c.platforms || []);
  const pieces = c.deliverables.reduce((a, d) => a + (Number(d.qty) || 1), 0);
  const clicks = f * 0.3 * 0.012 * Math.min(pieces, 3);
  const conv = ctx?.creatorStats[u.id]?.conversion ?? 0.01;
  return clicks * conv;
}

function budgetFactor(u, c, ctx) {
  const quote = creatorQuote(u, c);
  const pieces = c.deliverables.reduce((a, d) => a + (Number(d.qty) || 1), 0);
  if (!quote) return { score: 0.5, status: 'ok', text: { c: 'Add your rates to see budget fit', b: 'No rates on profile yet' } };

  let cash = 0;
  let commission = 0;
  if (['flat', 'hybrid'].includes(c.compensation)) cash = c.budgetMax;
  if (['commission', 'hybrid'].includes(c.compensation)) commission = expectedOrders(u, c, ctx) * (c.aov || 0) * (c.commissionRate / 100);
  const giftValue = c.compensation === 'gifted' ? (c.aov || 0) : 0;
  const offer = cash + commission + giftValue;
  const ratio = offer / quote;

  let score;
  if (c.compensation === 'commission') {
    // The creator decides if commission is worth it; show the estimate, don't bury the listing.
    score = 0.45 + 0.55 * Math.min(1, ratio);
  } else if (c.compensation === 'gifted') {
    // Stays and products are valued at their price; small creators often prefer them.
    score = 0.35 + 0.65 * Math.min(1, Math.pow(ratio, 1.2));
  } else if (ratio >= 1) {
    score = c.budgetMin > quote * 2.5 ? 0.85 : 1; // a budget far above their rate usually wants a bigger creator
  } else {
    score = Math.max(0, Math.pow(ratio, 1.6));
  }

  const pct = Math.round((1 - ratio) * 100);
  let text;
  if (c.compensation === 'gifted') {
    text = ratio >= 0.9
      ? { c: `Paid in product worth about ${peso(c.aov)}, close to your usual ${peso(quote)}`, b: `Product worth ${peso(c.aov)} covers most of their usual ${peso(quote)}` }
      : { c: `Paid in product (${peso(c.aov)}) vs. your usual ${peso(quote)} for this work`, b: `Usually charges ${peso(quote)}; gifting alone may not be enough` };
  } else if (c.compensation === 'commission') {
    text = { c: `Commission only: about ${peso(commission)} expected from your audience vs. your usual ${peso(quote)}`, b: `Expected to earn ~${peso(commission)} in commission vs. usual ${peso(quote)}` };
  } else if (ratio >= 1) {
    text = { c: `Your usual rate for this (${peso(quote)} for ${pieces} piece${pieces > 1 ? 's' : ''}) fits their budget${commission > 50 ? `, plus ~${peso(commission)} commission` : ''}`, b: `Usual rate ${peso(quote)} for this work fits your ${peso(c.budgetMax)} budget` };
  } else {
    text = { c: `Your usual ${peso(quote)} is ${pct}% above their ${peso(c.budgetMax)} max${pct <= 25 ? ', worth negotiating' : ''}`, b: `Usual rate ${peso(quote)} is ${pct}% above your ${peso(c.budgetMax)} max${pct <= 25 ? ', worth negotiating' : ''}` };
  }
  return { score, status: score >= 0.8 ? 'good' : score >= 0.5 ? 'ok' : 'bad', text, quote };
}

// ---------------------------------------------------------------- audience

function parseAudience(text = '') {
  const t = text.toLowerCase();
  let age = null;
  const m = t.match(/(\d{2})\s*(?:–|-|to)\s*(\d{2})/);
  if (m) age = [Number(m[1]), Number(m[2])];
  else if (t.includes('gen z')) age = [18, 26];
  else if (t.includes('millennial')) age = [27, 42];
  else if (t.includes('young professional') || t.includes('young earner')) age = [22, 35];
  else if (t.includes('student')) age = [18, 24];
  else if (t.includes('famil') || t.includes('moms') || t.includes('parent')) age = [28, 50];
  let gender = null;
  if (/\b(women|woman|female|girls|moms|brides)\b/.test(t)) gender = 'f';
  if (/\b(men|male|guys|dads)\b/.test(t)) gender = gender === 'f' ? null : 'm';
  if (/women and men|men and women/.test(t)) gender = null;
  const places = ['metro manila', 'manila', 'qc', 'quezon city', 'cebu', 'visayas', 'mindanao', 'davao', 'luzon', 'east metro', 'iloilo', 'siargao'].filter((p) => t.includes(p));
  return { age, gender, places };
}

function audienceFactor(u, c) {
  const want = parseAudience(c.audience);
  const have = parseAudience(u.creator.audience);
  const parts = [];
  let total = 0;
  let n = 0;
  if (want.age && have.age) {
    const lo = Math.max(want.age[0], have.age[0]);
    const hi = Math.min(want.age[1], have.age[1]);
    const ov = Math.max(0, hi - lo) / Math.max(1, Math.min(want.age[1] - want.age[0], have.age[1] - have.age[0]));
    total += Math.min(1, ov); n++;
    if (ov > 0.5) parts.push(`ages ${want.age[0]}–${want.age[1]}`);
  }
  if (want.gender) {
    const g = have.gender === want.gender ? 1 : have.gender ? 0.2 : 0.6;
    total += g; n++;
    if (g === 1) parts.push(want.gender === 'f' ? 'women' : 'men');
  }
  if (want.places.length) {
    const sameRegion = want.places.some((p) => have.places.includes(p) || (u.location || '').toLowerCase().includes(p) || (u.region || '').toLowerCase().includes(p));
    total += sameRegion ? 1 : 0.4; n++;
    if (sameRegion) parts.push(want.places[0].replace(/\b\w/g, (x) => x.toUpperCase()));
  }
  if (!n) return { score: 0.6, status: 'ok', text: { c: `Audience: ${u.creator.audience || 'not described yet'}`, b: `Audience: ${u.creator.audience || 'not described yet'}` } };
  const score = total / n;
  const text = score >= 0.7
    ? { c: `Your audience matches who they want to reach${parts.length ? ` (${parts.join(', ')})` : ''}`, b: `Audience matches who you want to reach${parts.length ? ` (${parts.join(', ')})` : ''}` }
    : { c: `They want ${c.audience}; your audience is ${u.creator.audience || 'not described'}`, b: `Audience is ${u.creator.audience || 'not described'}` };
  return { score, status: score >= 0.7 ? 'good' : score >= 0.45 ? 'ok' : 'bad', text };
}

// ---------------------------------------------------------------- platforms & reach

function platformFactor(u, c) {
  const wanted = c.platforms?.length ? c.platforms : [];
  const mine = Object.fromEntries((u.creator.platforms || []).map((p) => [p.id, Number(p.followers || 0)]));
  if (!wanted.length) return { score: 0.8, status: 'good', text: { c: 'Any platform works', b: 'Any platform works' } };
  // Weight each needed platform by how many pieces of content go there.
  const need = {};
  c.deliverables.forEach((d) => { need[d.platform] = (need[d.platform] || 0) + (Number(d.qty) || 1); });
  const totalNeed = Object.values(need).reduce((a, b) => a + b, 0);
  let covered = 0;
  Object.entries(need).forEach(([p, q]) => { if (mine[p] > 500) covered += q; });
  const score = covered / totalNeed;
  const have = wanted.filter((p) => mine[p] > 500);
  const missing = wanted.filter((p) => !(mine[p] > 500)).map((p) => PLATFORMS[p].label);
  const detail = have.map((p) => `${PLATFORMS[p].label} ${compact(mine[p])}`).join(', ');
  const text = missing.length === 0
    ? { c: `You're on ${detail}, where they need content`, b: `On ${detail}` }
    : { c: `They also need ${missing.join(' and ')}, which you're not on yet`, b: `Not on ${missing.join(' and ')}` };
  return { score, status: score >= 0.99 ? 'good' : score >= 0.5 ? 'ok' : 'bad', text };
}

// Engagement compared with creators of the same size, not one flat number.
export function tierBenchmark(followers) {
  if (followers < 10000) return { tier: 'nano', avg: 5 };
  if (followers < 100000) return { tier: 'micro', avg: 3.5 };
  if (followers < 500000) return { tier: 'mid-size', avg: 2.5 };
  return { tier: 'macro', avg: 1.8 };
}

function qualityFactor(u, c) {
  const f = followersOn(u, c.platforms || []) || followersOn(u, []);
  const { tier, avg } = tierBenchmark(f);
  const eng = Number(u.creator.engagement) || 0;
  const score = Math.max(0, Math.min(1, (eng / avg) * 0.6));
  const text = eng >= avg
    ? { c: `Your ${eng}% engagement beats the ${avg}% typical for ${tier} creators`, b: `${eng}% engagement, above the ${avg}% typical for ${tier} creators` }
    : { c: `Your ${eng}% engagement is under the ${avg}% typical for ${tier} creators`, b: `${eng}% engagement, under the ${avg}% typical for ${tier} creators` };
  return { score, status: eng >= avg ? 'good' : eng >= avg * 0.7 ? 'ok' : 'bad', text };
}

// ---------------------------------------------------------------- track record

function resultsFactor(u, c, ctx, brand) {
  if (brand) {
    const s = ctx?.creatorStats[u.id];
    if (!s || (s.clicks < 50 && !s.reviews && !s.delivered)) return { score: 0.55, status: 'ok', text: { c: '', b: 'New on Buzz: no campaign history yet' }, fresh: true };
    const conv = s.conversion;
    const convScore = Math.min(1, conv / 0.02);
    const ratingScore = s.rating != null ? (s.rating - 3) / 2 : 0.6;
    const timeScore = s.onTime ?? 0.8;
    const catBonus = s.categories.has(c.category) ? 0.1 : 0;
    const score = Math.min(1, convScore * 0.45 + ratingScore * 0.3 + timeScore * 0.25 + catBonus);
    const bits = [];
    if (s.orders) bits.push(`${s.orders} sales driven (${(conv * 100).toFixed(1)}% of clicks)`);
    if (s.rating != null) bits.push(`${s.rating.toFixed(1)}★ from ${s.reviews} brand${s.reviews > 1 ? 's' : ''}`);
    if (s.onTime != null) bits.push(`${Math.round(s.onTime * 100)}% on time`);
    return { score, status: score >= 0.7 ? 'good' : score >= 0.45 ? 'ok' : 'bad', text: { c: '', b: `Proven on Buzz: ${bits.join(' · ')}` } };
  }
  // Creator side: is this brand good to work with?
  const s = ctx?.brandStats[c.ownerId];
  if (!s || (!s.reviews && !s.deliverables)) return { score: 0.6, status: 'ok', text: { c: 'New brand on Buzz: fees are still protected by escrow', b: '' }, fresh: true };
  const ratingScore = s.rating != null ? (s.rating - 3) / 2 : 0.6;
  const payScore = s.funded ?? 0.6;
  const score = Math.min(1, ratingScore * 0.5 + payScore * 0.5);
  const bits = [];
  if (s.rating != null) bits.push(`${s.rating.toFixed(1)}★ from ${s.reviews} creator${s.reviews > 1 ? 's' : ''}`);
  if (s.funded != null) bits.push(`funds ${Math.round(s.funded * 100)}% of fees in escrow`);
  return { score, status: score >= 0.7 ? 'good' : score >= 0.45 ? 'ok' : 'bad', text: { c: `Good brand to work with: ${bits.join(' · ') || 'no issues reported'}`, b: '' } };
}

// ---------------------------------------------------------------- location & availability

function logisticsFactor(u, c, ctx, brand) {
  const sameRegion = u.region === c.region || c.region === 'Nationwide';
  const inPerson = c.type !== 'Product' || c.category === 'travel';
  let loc;
  if (sameRegion) loc = { s: 1, c: `You're both in ${c.region}`, b: `Also in ${c.region}` };
  else if (inPerson) loc = { s: c.category === 'travel' ? 0.7 : 0.25, c: `They're in ${c.region}; this needs an in-person visit`, b: `Based in ${u.region}; needs to travel to you` };
  else loc = { s: 0.8, c: `They're in ${c.region} and will ship to you`, b: `Based in ${u.region}; you'd ship the product` };

  const s = ctx?.creatorStats[u.id];
  const busy = s ? s.active : 0;
  const late = s ? s.overdue : 0;
  const avail = late > 0 ? 0.3 : busy >= 4 ? 0.5 : busy >= 3 ? 0.8 : 1;
  const score = loc.s * 0.6 + avail * 0.4;
  let extra = '';
  if (brand && late > 0) extra = ` · ${late} deliverable${late > 1 ? 's' : ''} overdue elsewhere`;
  else if (brand && busy >= 3) extra = ` · already on ${busy} campaigns`;
  else if (!brand && busy >= 3) extra = ` · you're already on ${busy} campaigns`;
  return { score, status: score >= 0.75 ? 'good' : score >= 0.5 ? 'ok' : 'bad', text: { c: loc.c + extra, b: loc.b + extra } };
}

// ---------------------------------------------------------------- context (history, cached per data version)

const cache = new WeakMap();

export function getContext(d) {
  if (!d) return null;
  if (cache.has(d)) return cache.get(d);
  const campMap = Object.fromEntries(d.campaigns.map((c) => [c.id, c]));
  const creatorStats = {};
  const brandStats = {};
  const cs = (id) => (creatorStats[id] ||= { clicks: 0, orders: 0, delivered: 0, onTimeN: 0, active: 0, overdue: 0, categories: new Set(), ratingSum: 0, reviews: 0, products: [] });
  const bs = (id) => (brandStats[id] ||= { ratingSum: 0, reviews: 0, deliverables: 0, fundedN: 0, hired: [] });

  const linkOwner = {};
  d.links.forEach((l) => { linkOwner[l.id] = l.creatorId; });
  d.events.forEach((e) => {
    const s = cs(linkOwner[e.linkId]);
    if (e.t === 'click') s.clicks += e.n || 1; else s.orders += 1;
  });
  const now = Date.now();
  d.deliverables.forEach((x) => {
    const s = cs(x.creatorId);
    if (x.submittedAt) { s.delivered += 1; if (x.submittedAt <= x.dueAt + DAY / 2) s.onTimeN += 1; }
    if (['todo', 'revision'].includes(x.status) && x.dueAt < now) s.overdue += 1;
    const c = campMap[x.campaignId];
    if (c && x.fee > 0) { const b = bs(c.ownerId); b.deliverables += 1; if (['held', 'released', 'outside'].includes(x.escrow)) b.fundedN += 1; }
  });
  d.applications.forEach((a) => {
    const c = campMap[a.campaignId];
    if (!c || a.status !== 'accepted') return;
    const s = cs(a.creatorId);
    s.categories.add(c.category);
    s.products.push(c.productName);
    if (['active', 'recruiting', 'tracking'].includes(c.status)) s.active += 1;
    bs(c.ownerId).hired.push(a.creatorId);
  });
  d.reviews.forEach((r) => {
    const to = d.users.find((u) => u.id === r.toId);
    if (to?.creator && campMap[r.campaignId]?.ownerId === r.fromId) { const s = cs(r.toId); s.ratingSum += r.rating; s.reviews += 1; }
    else { const b = bs(r.toId); b.ratingSum += r.rating; b.reviews += 1; }
  });
  Object.values(creatorStats).forEach((s) => {
    // Smoothed toward a 1% baseline so 3 lucky sales from 20 clicks don't top the charts.
    s.conversion = (s.orders + 1) / (s.clicks + 100);
    s.rating = s.reviews ? (s.ratingSum + 4.5 * 2) / (s.reviews + 2) : null;
    s.onTime = s.delivered ? (s.onTimeN + 1) / (s.delivered + 1) : null;
    s.pastProducts = s.products.join(' ');
  });
  Object.values(brandStats).forEach((b) => {
    b.rating = b.reviews ? (b.ratingSum + 4.5 * 2) / (b.reviews + 2) : null;
    b.funded = b.deliverables ? (b.fundedN + 1) / (b.deliverables + 1) : null;
  });

  // What each person has shown interest in (saves and applications).
  const affinity = {};
  const add = (uid, cat, w) => { affinity[uid] ||= {}; affinity[uid][cat] = (affinity[uid][cat] || 0) + w; };
  d.saved.forEach((s) => { if (s.kind === 'campaign' && campMap[s.refId]) add(s.userId, campMap[s.refId].category, 1); });
  d.applications.forEach((a) => { if (campMap[a.campaignId] && a.source === 'apply') add(a.creatorId, campMap[a.campaignId].category, 2); });

  const ctx = { creatorStats, brandStats, affinity, users: Object.fromEntries(d.users.map((u) => [u.id, u])) };
  cache.set(d, ctx);
  return ctx;
}

// ---------------------------------------------------------------- the score

export function matchScore(u, c, { brand = false, d = null } = {}) {
  if (!u?.creator || !c) return { score: null, checks: [] };
  const ctx = getContext(d);
  const f = {
    theme: themeFactor(u, c, ctx),
    budget: budgetFactor(u, c, ctx),
    audience: audienceFactor(u, c),
    platforms: platformFactor(u, c),
    quality: qualityFactor(u, c),
    results: resultsFactor(u, c, ctx, brand),
    logistics: logisticsFactor(u, c, ctx, brand),
  };
  let score = Object.entries(WEIGHTS[brand ? 'brand' : 'creator']).reduce((a, [k, w]) => a + w * f[k].score, 0);

  // Theme matters most: the further from the brand's world, the steeper the drop.
  if (f.theme.score < 0.5) score -= (0.5 - f.theme.score) * 30;
  if (f.theme.score < 0.25) score = Math.min(score, 50);
  // Nobody sees a "Perfect fit" they can't afford or can't post to.
  if (f.budget.score < 0.5) score = Math.min(score, 79);
  if (f.budget.score < 0.35 || f.platforms.score < 0.5) score = Math.min(score, brand ? 64 : 72);

  // Personal boost: creators get more of what they save and apply to;
  // brands get more creators like the ones they already hired.
  let boost = 0;
  const notes = [];
  if (ctx && !brand) {
    const aff = ctx.affinity[u.id] || {};
    const top = Math.max(0, ...Object.values(aff));
    if (top && aff[c.category]) { boost += 4 * (aff[c.category] / top); notes.push('Like listings you saved or applied to'); }
  }
  if (ctx && brand) {
    const hired = ctx.brandStats[c.ownerId]?.hired || [];
    const alike = hired.some((id) => id !== u.id && ctx.users[id]?.creator?.niches?.[0] === u.creator.niches[0]);
    if (alike) { boost += 3; notes.push('Similar to creators you hired before'); }
  }
  // Newcomers get a small lift so the same few names aren't always on top.
  if (brand && f.results.fresh && Date.now() - (u.joinedAt || 0) < 45 * DAY) boost += 3;
  if (!brand && Date.now() - c.createdAt < 7 * DAY) boost += 2;

  score = Math.max(0, Math.min(99, Math.round(score + boost)));
  const order = brand
    ? ['theme', 'budget', 'audience', 'platforms', 'results', 'quality', 'logistics']
    : ['theme', 'budget', 'platforms', 'audience', 'quality', 'logistics', 'results'];
  const checks = order.map((k) => ({ key: k, status: f[k].status, ok: f[k].status === 'good', text: brand ? f[k].text.b : f[k].text.c })).filter((x) => x.text);
  notes.forEach((n) => checks.push({ key: 'personal', status: 'good', ok: true, text: n }));
  const passed = checks.filter((x) => x.status === 'good').length;
  const fit = FIT_LABELS.find((l) => score >= l.min);
  return { score, passed, total: checks.length, checks, label: fit.label, tone: fit.tone, factors: f, quote: f.budget.quote };
}

// ---------------------------------------------------------------- ranking lists

// Keeps the top of a list from being five of the same thing.
function diversify(items, keyOf, penalty = 6) {
  const out = [];
  const seen = {};
  const pool = [...items];
  while (pool.length) {
    let best = 0;
    let bestVal = -Infinity;
    pool.forEach((it, i) => { const v = it.m.score - penalty * (seen[keyOf(it)] || 0); if (v > bestVal) { bestVal = v; best = i; } });
    const [it] = pool.splice(best, 1);
    seen[keyOf(it)] = (seen[keyOf(it)] || 0) + 1;
    out.push(it);
  }
  return out;
}

// Creators for a campaign, best first. Skips people already applied, invited or hired.
export function rankCreators(d, c, { exclude = true, diverse = false } = {}) {
  const taken = new Set(d.applications.filter((a) => a.campaignId === c.id && !['withdrawn', 'declined'].includes(a.status)).map((a) => a.creatorId));
  const list = d.users.filter((u) => u.creator && !u.suspended && u.id !== c.ownerId && (!exclude || !taken.has(u.id)))
    .map((u) => ({ u, m: matchScore(u, c, { brand: true, d }) }))
    .sort((a, b) => b.m.score - a.m.score);
  return diverse ? diversify(list, (x) => x.u.creator.niches[0], 4) : list;
}

// Campaigns for a creator, best first. Skips their own and ones they already applied to.
export function rankCampaigns(d, u, campaigns, { exclude = true, diverse = false } = {}) {
  const applied = new Set(d.applications.filter((a) => a.creatorId === u.id && a.status !== 'withdrawn').map((a) => a.campaignId));
  const list = campaigns.filter((c) => c.ownerId !== u.id && (!exclude || !applied.has(c.id)))
    .map((c) => ({ c, m: matchScore(u, c, { d }) }))
    .sort((a, b) => b.m.score - a.m.score);
  return diverse ? diversify(list, (x) => x.c.ownerId, 8) : list;
}

// When a business has no campaign yet, match against what their profile says they sell.
export function profileCampaign(u) {
  const b = u.business || {};
  return {
    id: `profile_${u.id}`, ownerId: u.id, category: b.category || 'food', type: 'Product', title: b.type || '', productName: b.name || '',
    description: `${b.tagline || ''} ${u.bio || ''}`, audience: '', tags: [], region: u.region,
    compensation: 'flat', budgetMin: 1000, budgetMax: 5000, commissionRate: 0, aov: 0, createdAt: 0,
    deliverables: [{ type: 'Reel', qty: 1, platform: 'instagram' }, { type: 'TikTok video', qty: 1, platform: 'tiktok' }],
    platforms: ['instagram', 'tiktok'],
  };
}
