// How pay is phrased to creators: a positive "earn" line on cards and a
// per-content breakdown on the listing page.
import { peso } from './format';
import { PLATFORMS } from './constants';

// Longer formats take more work, so they get a bigger share of the budget.
const WEIGHT = { 'YouTube video': 3, Reel: 2, 'TikTok video': 2, 'Live selling': 2, 'Feed post': 1.5, 'Story set': 1 };
const round50 = (n) => Math.round(n / 50) * 50;

export function giftLabel(c) {
  if (c.category === 'travel') return 'Free stay';
  if (c.type === 'Service') return 'Free sessions';
  return 'Free product';
}

// Short label for card photos, e.g. "Earn up to ₱1,800".
export function earnLabel(c) {
  if (c.compensation === 'gifted') return giftLabel(c);
  if (c.compensation === 'commission') {
    const perSale = c.aov ? c.aov * c.commissionRate / 100 : 0;
    return perSale ? `Earn ~${peso(perSale)} per sale` : `Earn ${c.commissionRate}% per sale`;
  }
  const base = `Earn up to ${peso(c.budgetMax)}`;
  return c.compensation === 'hybrid' ? `${base} + ${c.commissionRate}%` : base;
}

// One row per piece of content, splitting the per-creator budget by effort.
export function payBreakdown(c) {
  const pieces = c.deliverables.flatMap((d) => Array.from({ length: Number(d.qty) || 1 }, () => d));
  const total = pieces.reduce((a, d) => a + (WEIGHT[d.type] || 1), 0) || 1;
  const cash = ['flat', 'hybrid'].includes(c.compensation);
  const rows = c.deliverables.map((d) => {
    const share = (WEIGHT[d.type] || 1) / total;
    return {
      label: `${d.qty > 1 ? `${d.qty} × ` : '1 '}${d.type}`,
      platform: PLATFORMS[d.platform]?.label,
      min: cash ? round50(c.budgetMin * share) * (Number(d.qty) || 1) : 0,
      max: cash ? round50(c.budgetMax * share) * (Number(d.qty) || 1) : 0,
    };
  });
  return { rows, cash, pieces: pieces.length };
}

const SHORT = { Reel: ['Reel', 'Reels'], 'TikTok video': ['TikTok', 'TikToks'], 'Feed post': ['Post', 'Posts'], 'Story set': ['Story set', 'Story sets'], 'YouTube video': ['YouTube video', 'YouTube videos'], 'Live selling': ['Live selling', 'Live sellings'] };

export function deliverableSummary(c) {
  return c.deliverables.map((d) => {
    const n = Number(d.qty) || 1;
    const [one, many] = SHORT[d.type] || [d.type, d.type];
    return n > 1 ? `${n} ${many}` : one;
  }).join(' · ');
}
