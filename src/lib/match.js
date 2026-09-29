// Match % between a creator and a campaign, built from facts on both profiles
// so the number can be explained instead of made up.
import { categoryById, PLATFORMS } from './constants';

export function matchScore(creatorUser, campaign) {
  const cr = creatorUser?.creator;
  if (!cr || !campaign) return { score: null, parts: [] };
  const parts = [];

  const catFit = cr.niches?.includes(campaign.category);
  parts.push({ label: 'Niche', pts: catFit ? 40 : 10, max: 40, note: catFit ? `Creates ${categoryById(campaign.category).label} content` : 'Different niche' });

  const mine = new Set((cr.platforms || []).map((p) => p.id));
  const wanted = campaign.platforms?.length ? campaign.platforms : Object.keys(PLATFORMS);
  const overlap = wanted.filter((p) => mine.has(p)).length / wanted.length;
  parts.push({ label: 'Platforms', pts: Math.round(20 * overlap), max: 20, note: overlap === 1 ? 'Active on every platform needed' : overlap > 0 ? 'Active on some platforms needed' : 'Not on the platforms needed' });

  let budgetPts = 12;
  let budgetNote = 'Paid by commission or gifting';
  if (['flat', 'hybrid'].includes(campaign.compensation) && cr.rates?.reel) {
    const rate = cr.rates.reel;
    if (rate <= campaign.budgetMax * 1.15) { budgetPts = 20; budgetNote = 'Rate fits the budget'; }
    else { budgetPts = Math.max(4, Math.round(20 * campaign.budgetMax / rate)); budgetNote = 'Rate is above budget'; }
  }
  parts.push({ label: 'Budget', pts: budgetPts, max: 20, note: budgetNote });

  const sameRegion = creatorUser.region === campaign.region || campaign.region === 'Nationwide';
  parts.push({ label: 'Location', pts: sameRegion ? 10 : 5, max: 10, note: sameRegion ? 'Same region' : 'Different region' });

  const eng = Number(cr.engagement) || 0;
  parts.push({ label: 'Engagement', pts: Math.min(10, Math.round((eng / 8) * 10)), max: 10, note: `${eng}% engagement rate` });

  return { score: parts.reduce((a, p) => a + p.pts, 0), parts };
}
