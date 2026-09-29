// Every way Buzz makes money, each with an on/off switch and prices the admin
// can change. Only the transaction cut is on by default.
import { peso } from './format';

export const STREAMS = [
  {
    id: 'transactionFee', label: 'Transaction cut', group: 'Core', defaultOn: true,
    desc: 'A percentage on every creator payment made through Buzz escrow, plus a cut of commissions settled through Buzz.',
    settings: [
      ['brandPct', 'Brand service fee (%)', 5],
      ['creatorPct', 'Creator fee (%)', 0],
      ['commissionCutPct', 'Cut of commission payouts (%)', 15],
    ],
  },
  {
    id: 'plans', label: 'Plans: Brand Pro, Agency, Creator Pro', group: 'Subscriptions',
    desc: 'Monthly plans with lower fees and more room. Also turns on the Free-plan limits (2 active listings).',
    settings: [
      ['proPrice', 'Brand Pro per month (₱)', 1499], ['proPct', 'Brand Pro service fee (%)', 3],
      ['agencyPrice', 'Agency per month (₱)', 4999], ['agencyPct', 'Agency service fee (%)', 2],
      ['creatorProPrice', 'Creator Pro per month (₱)', 199], ['freeListings', 'Free plan active listings', 2],
    ],
  },
  { id: 'featuredListings', label: 'Featured listings', group: 'Visibility', desc: 'Brands pay to pin a listing at the top of Discover and Opportunities, marked "Featured".', settings: [['weekPrice', 'Price per week (₱)', 499]] },
  { id: 'boostedProfiles', label: 'Boosted creator profiles', group: 'Visibility', desc: 'Creators pay to appear in a "Boosted" row when brands browse creators. Fit labels are never changed by payment.', settings: [['weekPrice', 'Price per week (₱)', 149]] },
  { id: 'paidHandpick', label: 'Paid hand-picked matching', group: 'Services', desc: 'Brands pay for the Buzz team to pick and invite creators.', settings: [['price', 'Price per campaign (₱)', 1500]] },
  { id: 'managedCampaigns', label: 'Fully managed campaigns', group: 'Services', desc: 'Buzz runs the whole campaign for the brand: picking, briefing, approvals, reporting.', settings: [['pct', 'Fee (% of creator budget)', 15], ['minFee', 'Minimum fee (₱)', 5000]] },
  { id: 'servicesCatalog', label: 'Buzz services catalog', group: 'Services', desc: 'Brief writing, product photos, video editing, fast-track verification, reports, sponsorships.', settings: [] },
  { id: 'instantPayout', label: 'Instant withdrawals', group: 'Money', desc: 'Creators pay a small fee to get money the same day. Standard withdrawals stay free.', settings: [['fee', 'Fee per instant withdrawal (₱)', 20]] },
  { id: 'creatorAdvance', label: 'Creator cash advance', group: 'Money', desc: 'Creators get paid right after submitting instead of waiting for approval, for a small fee. Buzz carries the risk.', settings: [['pct', 'Fee (%)', 3]] },
  { id: 'contentLicensing', label: 'Content-rights extensions', group: 'Money', desc: 'Brands pay creators to keep reusing content after its rights end; Buzz takes a cut.', settings: [['pct', 'Buzz cut (%)', 10]] },
  { id: 'shippingService', label: 'Pickup booking through Buzz', group: 'Money', desc: 'Brands book a courier pickup for samples inside Buzz.', settings: [['price', 'Price per pickup (₱)', 169]] },
  { id: 'events', label: 'Workshops & pop-up events', group: 'Community', desc: 'Paid workshops for founders and creators, and booth slots at Buzz pop-ups.', settings: [] },
];

export const SERVICES = [
  { id: 'brief', name: 'Brief writing & campaign setup', price: 999, unit: 'per listing', who: 'business', desc: 'We write your listing, pick deliverables and set a fair budget. Ready in 1 working day.' },
  { id: 'photos', name: 'Product photography', price: 2500, unit: 'for 10 photos', who: 'business', desc: 'Clean product shots and 3 lifestyle photos in Metro Manila. Listings with good photos get far more applicants.' },
  { id: 'editing', name: 'Turn creator videos into ads', price: 800, unit: 'per video', who: 'business', desc: 'We cut your approved creator content into 15s and 30s ads with captions.' },
  { id: 'report', name: 'PH creator rates report', price: 499, unit: 'one-time', who: 'any', desc: 'What creators in each niche and size charge, updated quarterly from real Buzz deals.' },
  { id: 'newsletter', name: 'Sponsored spot in the Buzz newsletter', price: 2000, unit: 'per issue', who: 'business', desc: 'Your product in front of every creator on Buzz.' },
  { id: 'challenge', name: 'Sponsored community challenge', price: 5000, unit: 'per challenge', who: 'business', desc: 'Run a creator challenge in Community with your product as the prize.' },
  { id: 'fasttrack', name: 'Verification fast-track', price: 299, unit: 'one-time', who: 'any', desc: 'Same-day review of your verification request.' },
  { id: 'portfolio', name: 'Media kit design', price: 699, unit: 'one-time', who: 'creator', desc: 'A one-page rate card and media kit PDF to send to brands.' },
];

export const isOn = (d, id) => {
  const m = d?.flags?.monetization?.[id];
  return m ? !!m.on : !!STREAMS.find((s) => s.id === id)?.defaultOn;
};

export const setting = (d, id, key) => {
  const v = d?.flags?.monetization?.[id]?.settings?.[key];
  if (v != null && v !== '') return Number(v);
  return STREAMS.find((s) => s.id === id)?.settings.find((x) => x[0] === key)?.[2] ?? 0;
};

// Brand fee on escrow payments, after plan discounts.
export function brandFeeRate(d, u) {
  if (!isOn(d, 'transactionFee')) return 0;
  if (isOn(d, 'plans') && u?.plan === 'agency') return setting(d, 'plans', 'agencyPct') / 100;
  if (isOn(d, 'plans') && u?.plan === 'pro') return setting(d, 'plans', 'proPct') / 100;
  return setting(d, 'transactionFee', 'brandPct') / 100;
}

// Creator fee on released payments. Creator Pro pays none.
export function creatorFeeRate(d, u) {
  if (!isOn(d, 'transactionFee')) return 0;
  if (isOn(d, 'plans') && u?.creatorPlan === 'pro') return 0;
  return setting(d, 'transactionFee', 'creatorPct') / 100;
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
