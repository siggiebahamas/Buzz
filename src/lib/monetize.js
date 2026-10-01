// How Buzz makes money. Each stream has an on/off switch and prices the admin
// can change in Admin → Revenue. Product-for-content deals are always free:
// no money moves, so Buzz takes nothing.
import { peso } from './format';

export const STREAMS = [
  {
    id: 'transactionFee', label: 'Cut of paid deals and commissions', group: 'Core', defaultOn: true,
    desc: 'A service fee on every creator fee paid through Buzz Protected Payment, and a cut of commission payouts settled through Buzz. Product-for-content deals are never charged.',
    settings: [
      ['brandPct', 'Service fee on paid deals (%)', 5],
      ['creatorPct', 'Creator fee (%)', 0],
      ['commissionCutPct', 'Cut of commission payouts (%)', 15],
    ],
  },
  {
    id: 'plans', label: 'Brand Pro subscription', group: 'Core', defaultOn: true,
    desc: 'A monthly plan for brands that run paid deals often: lower fees, unlimited paid listings and a free featured week each month. The Free plan keeps unlimited product-for-content listings.',
    settings: [
      ['proPrice', 'Brand Pro per month (₱)', 1499], ['proPct', 'Brand Pro service fee (%)', 3],
      ['proCommissionCutPct', 'Brand Pro commission cut (%)', 10], ['proFeaturedWeeks', 'Free featured weeks per month', 1],
      ['freeListings', 'Free plan: active paid listings', 2],
    ],
  },
  { id: 'featuredListings', label: 'Featured spots on Opportunities', group: 'Core', defaultOn: true, desc: 'Brands pay to pin a listing at the top of Opportunities and Discover, labelled "Featured". The Launch Pad is never for sale.', settings: [['weekPrice', 'Price per week (₱)', 499]] },
  { id: 'paidHandpick', label: 'Paid hand-picked matching', group: 'Later', desc: 'Brands pay for the Buzz team to pick and invite creators. Off: the Free plan gets one request, Brand Pro unlimited.', settings: [['price', 'Price per campaign (₱)', 1500]] },
  { id: 'instantPayout', label: 'Instant withdrawals', group: 'Later', desc: 'Creators pay a small fee to get money the same day. Standard withdrawals stay free.', settings: [['fee', 'Fee per instant withdrawal (₱)', 20]] },
];

export const isOn = (d, id) => {
  const m = d?.flags?.monetization?.[id];
  return m && m.on != null ? !!m.on : !!STREAMS.find((s) => s.id === id)?.defaultOn;
};

export const setting = (d, id, key) => {
  const v = d?.flags?.monetization?.[id]?.settings?.[key];
  if (v != null && v !== '') return Number(v);
  return STREAMS.find((s) => s.id === id)?.settings.find((x) => x[0] === key)?.[2] ?? 0;
};

export const isBrandPro = (d, u) => isOn(d, 'plans') && u?.plan === 'pro';

// Brand fee on paid deals, after the Pro discount.
export function brandFeeRate(d, u) {
  if (!isOn(d, 'transactionFee')) return 0;
  if (isBrandPro(d, u)) return setting(d, 'plans', 'proPct') / 100;
  return setting(d, 'transactionFee', 'brandPct') / 100;
}

// Creator fee on released payments.
export function creatorFeeRate(d) {
  if (!isOn(d, 'transactionFee')) return 0;
  return setting(d, 'transactionFee', 'creatorPct') / 100;
}

// Buzz's cut when a brand settles creator commissions through Buzz.
export function commissionCutRate(d, u) {
  if (!isOn(d, 'transactionFee')) return 0;
  if (isBrandPro(d, u)) return setting(d, 'plans', 'proCommissionCutPct') / 100;
  return setting(d, 'transactionFee', 'commissionCutPct') / 100;
}

// Pro brands get free featured weeks each calendar month.
const monthKey = () => new Date().toISOString().slice(0, 7);
export function freeFeaturedLeft(d, u) {
  if (!isBrandPro(d, u)) return 0;
  const used = u.featureCredits?.month === monthKey() ? u.featureCredits.used : 0;
  return Math.max(0, setting(d, 'plans', 'proFeaturedWeeks') - used);
}
export function spendFeaturedCredit(u, weeks) {
  const used = u.featureCredits?.month === monthKey() ? u.featureCredits.used : 0;
  u.featureCredits = { month: monthKey(), used: used + weeks };
}

// Record money Buzz earns. `payer` is charged in their wallet history too.
export function earn(d, { stream, amount, payer, note, ref = null, charge = true, uid }) {
  const amt = Math.round(amount);
  if (!(amt > 0)) return;
  d.revenue.push({ id: uid('rev'), stream, amount: amt, payer, note, ref, ts: Date.now() });
  if (charge && payer) d.transactions.push({ id: uid('tx'), userId: payer, type: 'purchase', amount: -amt, ts: Date.now(), ref, note });
}

export function revenueSummary(d, days = null) {
  const since = days ? Date.now() - days * 86400000 : 0;
  const by = {};
  d.revenue.filter((r) => r.ts >= since).forEach((r) => { by[r.stream] = (by[r.stream] || 0) + r.amount; });
  return { by, total: Object.values(by).reduce((a, b) => a + b, 0) };
}

export const priceLabel = (n) => peso(n);
