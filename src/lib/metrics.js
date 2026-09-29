// All dashboard numbers are computed here from raw records (sales, clicks,
// deliverables, applications) so every figure traces back to real activity.
import { DAY } from './format';

export const PERIODS = [
  { id: 'week', label: 'This Week', days: 7 },
  { id: 'month', label: 'This Month', days: 30 },
  { id: 'quarter', label: 'This Quarter', days: 90 },
  { id: 'year', label: 'This Year', days: 365 },
  { id: 'custom', label: 'Custom Range' },
];

export function getRange(period, custom) {
  const now = Date.now();
  if (period === 'custom' && custom?.from && custom?.to) {
    const from = new Date(custom.from).getTime();
    const to = new Date(custom.to).getTime() + DAY - 1;
    return { from, to, prevFrom: from - (to - from), prevTo: from };
  }
  const days = PERIODS.find((p) => p.id === period)?.days || 30;
  const from = now - days * DAY;
  return { from, to: now, prevFrom: from - days * DAY, prevTo: from };
}

const inR = (ts, from, to) => ts != null && ts >= from && ts <= to;
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);

function commissionRate(c) {
  return ['commission', 'hybrid'].includes(c?.compensation) ? (c.commissionRate || 0) / 100 : 0;
}

// Core flow numbers for a set of tracking links + deliverables within [from, to].
function flow(d, links, dels, from, to) {
  const linkIds = new Set(links.map((l) => l.id));
  const linkMap = Object.fromEntries(links.map((l) => [l.id, l]));
  const campMap = Object.fromEntries(d.campaigns.map((c) => [c.id, c]));
  const ev = d.events.filter((e) => linkIds.has(e.linkId) && inR(e.ts, from, to));
  const sales = ev.filter((e) => e.t === 'sale');
  const clicks = sum(ev.filter((e) => e.t === 'click'), (e) => e.n || 1);
  const revenue = sum(sales, (e) => e.amount);
  const commission = sum(sales, (e) => e.amount * commissionRate(campMap[linkMap[e.linkId].campaignId]));
  const fees = sum(dels.filter((x) => inR(x.approvedAt, from, to)), (x) => x.fee);
  const paid = sum(dels.filter((x) => inR(x.paidAt, from, to)), (x) => x.fee);
  const posted = dels.filter((x) => inR(x.submittedAt, from, to) && x.stats);
  const reach = sum(posted, (x) => Number(x.stats.reach));
  const interactions = sum(posted, (x) => Number(x.stats.likes) + Number(x.stats.comments) + Number(x.stats.shares) + Number(x.stats.saves));
  const submitted = dels.filter((x) => inR(x.submittedAt, from, to));
  const onTime = submitted.filter((x) => x.submittedAt <= x.dueAt + DAY / 2).length;
  return {
    clicks, orders: sales.length, revenue, commission, fees, paid, spend: fees + commission,
    reach, interactions, engagement: reach ? (interactions / reach) * 100 : null,
    onTimeRate: submitted.length ? (onTime / submitted.length) * 100 : null,
    posts: posted.length,
  };
}

function change(cur, prev) {
  if (cur == null || prev == null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function businessMetrics(d, userId, range) {
  const camps = d.campaigns.filter((c) => c.ownerId === userId);
  const cids = new Set(camps.map((c) => c.id));
  const links = d.links.filter((l) => cids.has(l.campaignId));
  const dels = d.deliverables.filter((x) => cids.has(x.campaignId));
  const apps = d.applications.filter((a) => cids.has(a.campaignId));
  const cur = flow(d, links, dels, range.from, range.to);
  const prev = flow(d, links, dels, range.prevFrom, range.prevTo);
  const derive = (f) => ({
    ...f,
    roas: f.spend ? f.revenue / f.spend : null,
    cpo: f.orders ? f.spend / f.orders : null,
    conversion: f.clicks ? (f.orders / f.clicks) * 100 : null,
  });
  const c = derive(cur);
  const p = derive(prev);
  const hired = apps.filter((a) => a.status === 'accepted' && inR(a.decidedAt, range.from, range.to)).length;
  const hiredPrev = apps.filter((a) => a.status === 'accepted' && inR(a.decidedAt, range.prevFrom, range.prevTo)).length;

  const perCreator = links.map((l) => {
    const f = flow(d, [l], dels.filter((x) => x.creatorId === l.creatorId && x.campaignId === l.campaignId), range.from, range.to);
    return { link: l, ...f, roas: f.spend ? f.revenue / f.spend : null };
  }).sort((a, b) => b.revenue - a.revenue);

  const perCampaign = camps.map((cp) => {
    const ls = links.filter((l) => l.campaignId === cp.id);
    const f = flow(d, ls, dels.filter((x) => x.campaignId === cp.id), range.from, range.to);
    const allTime = flow(d, ls, dels.filter((x) => x.campaignId === cp.id), 0, Date.now());
    const budget = ['flat', 'hybrid'].includes(cp.compensation) ? cp.budgetMax * Math.max(1, ls.length) : 0;
    return { campaign: cp, creators: ls.length, ...f, roas: f.spend ? f.revenue / f.spend : null, allTimeSpend: allTime.spend, budget };
  });

  return {
    cur: c,
    change: {
      revenue: change(c.revenue, p.revenue), spend: change(c.spend, p.spend), roas: change(c.roas, p.roas),
      orders: change(c.orders, p.orders), cpo: change(c.cpo, p.cpo), clicks: change(c.clicks, p.clicks),
      conversion: change(c.conversion, p.conversion), reach: change(c.reach, p.reach), engagement: change(c.engagement, p.engagement),
      hired: hiredPrev === 0 ? null : change(hired, hiredPrev),
    },
    activeCampaigns: camps.filter((x) => ['active', 'tracking'].includes(x.status)).length,
    recruiting: camps.filter((x) => x.status === 'recruiting').length,
    pendingApps: apps.filter((a) => a.status === 'pending').length,
    hired,
    owed: sum(dels.filter((x) => x.status === 'approved' && !x.paidAt), (x) => x.fee),
    toReview: dels.filter((x) => x.status === 'submitted').length,
    perCreator, perCampaign, links, dels,
  };
}

export function creatorMetrics(d, userId, range) {
  const links = d.links.filter((l) => l.creatorId === userId);
  const dels = d.deliverables.filter((x) => x.creatorId === userId);
  const apps = d.applications.filter((a) => a.creatorId === userId);
  const cur = flow(d, links, dels, range.from, range.to);
  const prev = flow(d, links, dels, range.prevFrom, range.prevTo);
  const earnings = cur.paid + cur.commission;
  const prevEarnings = prev.paid + prev.commission;
  const now = Date.now();
  const open = dels.filter((x) => ['todo', 'revision'].includes(x.status));
  const decided = apps.filter((a) => ['accepted', 'declined'].includes(a.status));
  const campMap = Object.fromEntries(d.campaigns.map((c) => [c.id, c]));
  const activeCamps = apps.filter((a) => a.status === 'accepted' && ['active', 'tracking', 'recruiting'].includes(campMap[a.campaignId]?.status));

  const perCampaign = activeCamps.map((a) => {
    const c = campMap[a.campaignId];
    const ls = links.filter((l) => l.campaignId === c.id);
    const ds = dels.filter((x) => x.campaignId === c.id);
    const f = flow(d, ls, ds, 0, now);
    return {
      campaign: c, link: ls[0], ...f,
      earned: sum(ds.filter((x) => x.paidAt), (x) => x.fee) + f.commission,
      pending: sum(ds.filter((x) => x.status === 'approved' && !x.paidAt), (x) => x.fee),
      done: ds.filter((x) => ['approved', 'submitted'].includes(x.status)).length, total: ds.length,
    };
  });

  return {
    cur: { ...cur, earnings },
    change: {
      earnings: change(earnings, prevEarnings), reach: change(cur.reach, prev.reach), engagement: change(cur.engagement, prev.engagement),
      clicks: change(cur.clicks, prev.clicks), orders: change(cur.orders, prev.orders), revenue: change(cur.revenue, prev.revenue),
    },
    activeCampaigns: activeCamps.length,
    pendingApps: apps.filter((a) => a.status === 'pending').length,
    invites: apps.filter((a) => a.status === 'invited').length,
    acceptance: decided.length ? (decided.filter((a) => a.status === 'accepted').length / decided.length) * 100 : null,
    dueThisWeek: open.filter((x) => x.dueAt >= now && x.dueAt <= now + 7 * DAY).length,
    overdue: open.filter((x) => x.dueAt < now).length,
    pendingPayout: sum(dels.filter((x) => x.status === 'approved' && !x.paidAt), (x) => x.fee),
    perCampaign, links, dels,
  };
}

// Buckets values over the range for charts.
export function series(d, { links, dels, from, to, mode }) {
  const span = to - from;
  const step = span <= 31 * DAY ? DAY : span <= 100 * DAY ? 7 * DAY : 30 * DAY;
  const buckets = [];
  for (let t = from; t < to; t += step) buckets.push({ start: t, end: Math.min(to, t + step), revenue: 0, spend: 0, clicks: 0, orders: 0, earnings: 0 });
  const linkIds = new Set(links.map((l) => l.id));
  const linkMap = Object.fromEntries(links.map((l) => [l.id, l]));
  const campMap = Object.fromEntries(d.campaigns.map((c) => [c.id, c]));
  const find = (ts) => buckets.find((b) => ts >= b.start && ts < b.end) || (ts === to ? buckets[buckets.length - 1] : null);
  d.events.forEach((e) => {
    if (!linkIds.has(e.linkId) || !inR(e.ts, from, to)) return;
    const b = find(e.ts);
    if (!b) return;
    if (e.t === 'click') b.clicks += e.n || 1;
    else {
      b.orders += 1;
      b.revenue += e.amount;
      const com = e.amount * commissionRate(campMap[linkMap[e.linkId].campaignId]);
      b.spend += com;
      b.earnings += com;
    }
  });
  dels.forEach((x) => {
    if (mode === 'business' && inR(x.approvedAt, from, to)) { const b = find(x.approvedAt); if (b) b.spend += x.fee; }
    if (mode === 'creator' && inR(x.paidAt, from, to)) { const b = find(x.paidAt); if (b) b.earnings += x.fee; }
  });
  const fmt = step === DAY ? { month: 'short', day: 'numeric' } : step === 7 * DAY ? { month: 'short', day: 'numeric' } : { month: 'short' };
  return buckets.map((b) => ({ ...b, label: new Date(b.start).toLocaleDateString('en-PH', fmt) }));
}
