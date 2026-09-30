// Creator Pro: early access, profile viewers, peer comparison, application
// limits, instant alerts and the tax pack. Everything here is inactive unless
// the Plans stream is switched on in Admin → Revenue.
import { isOn, setting } from './monetize';
import { rankCampaigns, tierBenchmark } from './match';
import { categoryById, PLATFORMS } from './constants';
import { peso, DAY } from './format';

const HOUR = 3600000;

export const isCreatorPro = (d, u) => isOn(d, 'plans') && u?.creatorPlan === 'pro';

// Milliseconds until a listing opens to this person; 0 if they can apply now.
export function earlyLeft(d, c, u) {
  if (!c || !isOn(d, 'plans')) return 0;
  const hours = setting(d, 'plans', 'earlyHours');
  if (!(hours > 0)) return 0;
  const left = c.createdAt + hours * HOUR - Date.now();
  if (left <= 0) return 0;
  if (u && (u.id === c.ownerId || isCreatorPro(d, u))) return 0;
  return left;
}
export const inEarlyWindow = (d, c) => isOn(d, 'plans') && setting(d, 'plans', 'earlyHours') > 0
  && Date.now() - c.createdAt < setting(d, 'plans', 'earlyHours') * HOUR;
export const hoursLabel = (ms) => (ms >= HOUR ? `${Math.ceil(ms / HOUR)}h` : `${Math.max(1, Math.ceil(ms / 60000))} min`);

// Free creators' monthly application allowance. null = no limit applies.
export function applyAllowance(d, u) {
  const cap = isOn(d, 'plans') ? setting(d, 'plans', 'freeApplyCap') : 0;
  if (!u || !(cap > 0) || isCreatorPro(d, u)) return null;
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const used = d.applications.filter((a) => a.creatorId === u.id && a.source === 'apply' && a.createdAt >= start.getTime()).length;
  return { cap, used, left: Math.max(0, cap - used) };
}

// ---------- instant alerts ----------
export function searchMatches(s, c) {
  const f = s.filters || {};
  if (f.cat && f.cat !== 'all' && c.category !== f.cat) return false;
  if (f.minBudget && (c.budgetMax || 0) < f.minBudget) return false;
  if (f.platforms?.length && !f.platforms.some((p) => (c.platforms || []).includes(p))) return false;
  if (f.region && f.region !== 'all' && c.region !== f.region) return false;
  if (f.q) {
    const text = `${c.title} ${c.productName} ${c.description}`.toLowerCase();
    if (!text.includes(f.q.toLowerCase())) return false;
  }
  return true;
}
export function searchLabel(f = {}) {
  const parts = [];
  if (f.cat && f.cat !== 'all') parts.push(categoryById(f.cat).label);
  if (f.q) parts.push(`"${f.q}"`);
  if (f.minBudget) parts.push(`${peso(f.minBudget)}+`);
  if (f.platforms?.length) parts.push(f.platforms.map((p) => PLATFORMS[p]?.label || p).join(' or '));
  if (f.region && f.region !== 'all') parts.push(f.region);
  return parts.join(' · ') || 'Any new listing';
}

// ---------- who viewed your profile ----------
export function profileViewers(d, u, days = 30) {
  const since = Date.now() - days * DAY;
  const views = d.profileViews.filter((v) => v.userId === u.id && v.ts >= since);
  const by = {};
  views.forEach((v) => {
    if (!v.viewerId) return;
    const b = (by[v.viewerId] ||= { id: v.viewerId, count: 0, last: 0 });
    b.count += 1;
    b.last = Math.max(b.last, v.ts);
  });
  const brands = Object.values(by)
    .map((x) => ({ ...x, user: d.users.find((y) => y.id === x.id) }))
    .filter((x) => x.user?.business)
    .sort((a, b) => b.last - a.last);
  return { total: views.length, brands };
}

// ---------- how you compare ----------
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const followers = (u) => (u.creator.platforms || []).reduce((a, p) => a + (Number(p.followers) || 0), 0);

const TIPS = {
  theme: () => 'Most listings reaching you sit outside your niches. If you regularly post about a second topic, add it in My Profile.',
  budget: (u, rows) => {
    const r = rows.find((x) => x.key === 'rate');
    return r.you > r.peers * 1.15
      ? `Your reel rate (${peso(r.you)}) is above what similar creators charge (${peso(r.peers)}), so many budgets fall short. A bundle price (reel + stories) can win more deals without cutting your rate.`
      : 'Many budgets don\'t line up with your rates. Make sure every rate in My Profile is filled in, so brands can see a price that fits.';
  },
  platforms: () => 'Many listings want platforms you don\'t list. Add every account you actively post on, with follower counts.',
  audience: () => 'Describe your audience in My Profile (age, gender, city). Brands target specific audiences, and a vague one scores low.',
  quality: (u) => (u.creator.statsVerified
    ? 'Your engagement is below the average for your size. Posting on a steady schedule and replying to comments lifts it.'
    : 'Get your stats verified. Verified numbers count in full when brands are matched with you; self-reported ones are discounted.'),
};
const FACTOR_NAMES = { theme: 'Content fit', budget: 'Budget fit', platforms: 'Platforms', audience: 'Audience fit', quality: 'Engagement' };

export function peerCompare(d, u) {
  const all = d.users.filter((x) => x.creator && x.id !== u.id && x.approved !== false && !x.suspended);
  const tier = tierBenchmark(followers(u)).tier;
  let peers = all.filter((x) => x.creator.niches[0] === u.creator.niches[0] && tierBenchmark(followers(x)).tier === tier);
  let basis = `${tier} creators in ${categoryById(u.creator.niches[0]).label}`;
  if (peers.length < 3) { peers = all.filter((x) => tierBenchmark(followers(x)).tier === tier); basis = `${tier} creators on Buzz`; }
  if (peers.length < 3) { peers = all; basis = 'creators on Buzz'; }
  const acceptance = (ids) => {
    const apps = d.applications.filter((a) => ids.has(a.creatorId) && a.source === 'apply' && ['accepted', 'declined'].includes(a.status));
    return apps.length ? apps.filter((a) => a.status === 'accepted').length / apps.length : null;
  };
  const earned = (id) => d.transactions.filter((t) => t.userId === id && t.type === 'release').reduce((a, t) => a + t.amount, 0);
  const rows = [
    { key: 'rate', label: 'Rate per reel', you: u.creator.rates?.reel || 0, peers: median(peers.map((p) => p.creator.rates?.reel || 0).filter(Boolean)), fmt: 'peso' },
    { key: 'eng', label: 'Engagement', you: Number(u.creator.engagement) || 0, peers: median(peers.map((p) => Number(p.creator.engagement) || 0)), fmt: 'pct' },
    { key: 'acc', label: 'Applications accepted', you: acceptance(new Set([u.id])), peers: acceptance(new Set(peers.map((p) => p.id))), fmt: 'share' },
    { key: 'earn', label: 'Earned on Buzz', you: earned(u.id), peers: median(peers.map((p) => earned(p.id))), fmt: 'peso' },
  ];
  const live = d.campaigns.filter((c) => c.published && !c.removed && c.status !== 'completed');
  const top = rankCampaigns(d, u, live, { exclude: false }).slice(0, 12);
  const keys = Object.keys(FACTOR_NAMES);
  const avg = Object.fromEntries(keys.map((k) => [k, top.length ? top.reduce((a, x) => a + (x.m.factors?.[k]?.score ?? 1), 0) / top.length : 1]));
  const weakest = [...keys].sort((a, b) => avg[a] - avg[b])[0];
  return {
    basis, count: peers.length, rows,
    factors: keys.map((k) => ({ key: k, label: FACTOR_NAMES[k], score: avg[k] })),
    weakest, tip: TIPS[weakest](u, rows),
  };
}

// ---------- tax pack ----------
export function taxYears(d, u) {
  const ys = new Set(d.transactions.filter((t) => t.userId === u.id && t.type === 'release').map((t) => new Date(t.ts).getFullYear()));
  ys.add(new Date().getFullYear());
  return [...ys].sort((a, b) => b - a);
}

export function taxYear(d, u, year) {
  const inYear = (x) => new Date(x.ts).getFullYear() === year;
  const income = d.transactions.filter((t) => t.userId === u.id && t.type === 'release' && inYear(t)).sort((a, b) => a.ts - b.ts);
  const lines = income.map((t, i) => {
    const del = d.deliverables.find((x) => x.id === t.ref);
    const link = !del && d.links.find((l) => l.id === t.ref);
    const camp = d.campaigns.find((c) => c.id === (del?.campaignId || link?.campaignId));
    const brand = d.users.find((x) => x.id === camp?.ownerId);
    const fee = d.revenue.filter((r) => r.payer === u.id && r.ref === t.ref && ['transactionFee', 'creatorAdvance'].includes(r.stream)).reduce((a, r) => a + r.amount, 0);
    return {
      no: `BZ-${year}-${String(i + 1).padStart(4, '0')}`, ts: t.ts, received: t.amount, fee, gross: t.amount + fee,
      desc: del ? `${del.type || 'Content'}: ${del.title}` : t.note, brand: brand?.business?.name || brand?.name || 'Buzz',
      brandAddress: brand?.region || '', campaign: camp?.productName || '',
    };
  });
  const sum = (k) => lines.reduce((a, l) => a + l[k], 0);
  const byBrand = {};
  lines.forEach((l) => { byBrand[l.brand] = (byBrand[l.brand] || 0) + l.gross; });
  const months = Array.from({ length: 12 }, (_, m) => lines.filter((l) => new Date(l.ts).getMonth() === m).reduce((a, l) => a + l.gross, 0));
  const gross = sum('gross');
  return {
    year, lines, gross, fees: sum('fee'), received: sum('received'), months,
    byBrand: Object.entries(byBrand).sort((a, b) => b[1] - a[1]),
    // 8% option for self-employed individuals: 8% of gross above ₱250,000.
    est8: Math.max(0, gross - 250000) * 0.08,
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const day = (ts) => new Date(ts).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

export function taxCsv(ty) {
  const head = ['Invoice no.', 'Date', 'Client', 'Campaign', 'Description', 'Gross fee (PHP)', 'Buzz fee (PHP)', 'Received (PHP)'];
  const rows = ty.lines.map((l) => [l.no, new Date(l.ts).toISOString().slice(0, 10), l.brand, l.campaign, l.desc, l.gross, l.fee, l.received]);
  rows.push([], ['Total', '', '', '', '', ty.gross, ty.fees, ty.received]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function invoiceHtml(l, u) {
  const tax = u.taxInfo || {};
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(l.no)}</title>
<style>body{font-family:system-ui,sans-serif;color:#1c1917;max-width:720px;margin:40px auto;padding:0 24px}h1{font-size:28px;margin:0}
.muted{color:#78716c;font-size:13px}.row{display:flex;justify-content:space-between;gap:24px;margin-top:28px}
table{width:100%;border-collapse:collapse;margin-top:28px}td,th{text-align:left;padding:10px 0;border-bottom:1px solid #e7e5e4;font-size:14px}
th:last-child,td:last-child{text-align:right}.total td{font-weight:700;border-bottom:none;font-size:16px}
@media print{body{margin:0}}</style></head><body>
<div class="row" style="margin-top:0"><div><h1>Invoice</h1><p class="muted">${esc(l.no)} · ${esc(day(l.ts))}</p></div>
<div style="text-align:right"><b>${esc(tax.name || u.name)}</b><br><span class="muted">${esc(tax.address || u.location || '')}${tax.tin ? `<br>TIN ${esc(tax.tin)}` : ''}</span></div></div>
<div class="row"><div><p class="muted">Billed to</p><b>${esc(l.brand)}</b><br><span class="muted">${esc(l.brandAddress)}</span></div>
<div style="text-align:right"><p class="muted">Paid through</p><b>Buzz escrow</b></div></div>
<table><tr><th>Description</th><th>Amount</th></tr>
<tr><td>${esc(l.desc)}${l.campaign ? `<br><span class="muted">${esc(l.campaign)}</span>` : ''}</td><td>${esc(peso(l.gross))}</td></tr>
${l.fee ? `<tr><td class="muted">Less Buzz platform fee</td><td class="muted">−${esc(peso(l.fee))}</td></tr>` : ''}
<tr class="total"><td>Amount received</td><td>${esc(peso(l.received))}</td></tr></table>
<p class="muted" style="margin-top:40px">This invoice was generated by Buzz for your records. It is not an official receipt. If you are BIR-registered, issue your own official receipt for this amount.</p>
</body></html>`;
}
