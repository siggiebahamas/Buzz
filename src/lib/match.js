// How well a creator fits a campaign, as plain yes/no checks anyone can read.
// `brand: true` words the checks for the business looking at a creator.
import { categoryById, PLATFORMS } from './constants';
import { peso } from './format';

const AVG_ENGAGEMENT = 3; // Typical Instagram/TikTok engagement for PH micro-creators.

const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

export const FIT_LABELS = [
  { min: 5, label: 'Perfect fit', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { min: 4, label: 'Great fit', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { min: 3, label: 'Good fit', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
  { min: 0, label: 'Worth a look', tone: 'text-ink-soft bg-canvas border-line' },
];

export function matchScore(creatorUser, campaign, { brand = false } = {}) {
  const cr = creatorUser?.creator;
  if (!cr || !campaign) return { score: null, checks: [] };
  const checks = [];
  const cat = categoryById(campaign.category).label;

  const nicheOk = cr.niches?.includes(campaign.category);
  const theirNiches = list((cr.niches || []).map((n) => categoryById(n).label));
  checks.push({
    ok: nicheOk,
    text: nicheOk ? (brand ? `Creates ${cat} content` : `You create ${cat} content`)
      : (brand ? `Mostly posts ${theirNiches || 'other topics'}` : `They want ${cat} creators; you post ${theirNiches || 'other topics'}`),
  });

  const mine = new Set((cr.platforms || []).map((p) => p.id));
  const wanted = campaign.platforms?.length ? campaign.platforms : [];
  const missing = wanted.filter((p) => !mine.has(p)).map((p) => PLATFORMS[p].label);
  const names = wanted.map((p) => PLATFORMS[p].label);
  checks.push({
    ok: missing.length === 0,
    text: missing.length === 0 ? (brand ? `On ${list(names)}` : `You're on ${list(names)}, where they need content`)
      : (brand ? `Not on ${list(missing)}` : `They also need ${list(missing)}, which you're not on yet`),
  });

  const rate = cr.rates?.reel || 0;
  let payOk = true;
  let payText;
  if (['flat', 'hybrid'].includes(campaign.compensation) && rate) {
    payOk = rate <= campaign.budgetMax * 1.15;
    payText = payOk
      ? (brand ? `Rate ${peso(rate)} fits your ${peso(campaign.budgetMax)} max` : `Your ${peso(rate)} rate fits their budget (up to ${peso(campaign.budgetMax)})`)
      : (brand ? `Rate ${peso(rate)} is above your ${peso(campaign.budgetMax)} max` : `Your ${peso(rate)} rate is above their ${peso(campaign.budgetMax)} max`);
  } else if (campaign.compensation === 'commission') {
    payText = campaign.aov ? `Earns about ${peso(campaign.aov * campaign.commissionRate / 100)} per sale` : `Earns ${campaign.commissionRate}% of each sale`;
  } else if (campaign.compensation === 'gifted') {
    payText = 'Paid in product or experience, no cash fee';
  } else {
    payText = 'No rate set yet';
  }
  checks.push({ ok: payOk, text: payText });

  const sameRegion = creatorUser.region === campaign.region || campaign.region === 'Nationwide';
  const inPerson = campaign.type !== 'Product';
  checks.push({
    ok: sameRegion || !inPerson,
    text: sameRegion ? (brand ? `Also in ${campaign.region}` : `You're both in ${campaign.region}`)
      : inPerson ? (brand ? `Based in ${creatorUser.region}, far from you` : `They're in ${campaign.region}; this needs an in-person visit`)
        : (brand ? `Based in ${creatorUser.region}; you'd ship the product` : `They're in ${campaign.region} and will ship to you`),
  });

  const eng = Number(cr.engagement) || 0;
  checks.push({
    ok: eng >= AVG_ENGAGEMENT,
    text: eng >= AVG_ENGAGEMENT
      ? `${brand ? 'Engagement' : 'Your engagement'} is ${eng}%, above the ${AVG_ENGAGEMENT}% average`
      : `${brand ? 'Engagement' : 'Your engagement'} is ${eng}%, below the ${AVG_ENGAGEMENT}% average`,
  });

  const passed = checks.filter((c) => c.ok).length;
  // Score is only used for ranking; people see the checks and a plain label.
  const score = passed * 20 + (nicheOk ? 5 : 0) + Math.min(5, eng / 2);
  const fit = FIT_LABELS.find((f) => passed >= f.min);
  return { score, passed, total: checks.length, checks, label: fit.label, tone: fit.tone };
}
