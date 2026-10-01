// Where a creator collaboration stands, from the viewer's side:
// 'needs' (waiting on you), 'progress', 'done' or 'closed'.
const byId = (d, id) => d.campaigns.find((c) => c.id === id);

export function stageOf(d, a, biz) {
  if (['declined', 'withdrawn'].includes(a.status)) return 'closed';
  if ((biz && a.status === 'pending') || (!biz && a.status === 'invited')) return 'needs';
  if (a.status !== 'accepted') return 'progress';
  const posts = d.deliverables.filter((x) => x.campaignId === a.campaignId && x.creatorId === a.creatorId);
  const c = byId(d, a.campaignId);
  const needsMe = posts.some((x) => {
    if (biz) return x.status === 'submitted' || x.draft?.status === 'pending' || (x.status === 'approved' && x.fee > 0 && x.escrow === 'unfunded');
    return ['todo', 'revision'].includes(x.status) && (!c.requireDraft || x.draft?.status !== 'pending');
  }) || (biz && d.shipments.some((s) => s.campaignId === a.campaignId && s.creatorId === a.creatorId && s.status === 'to_ship'));
  const done = posts.length > 0 && posts.every((x) => x.status === 'approved' && !(x.fee > 0 && x.escrow === 'unfunded'));
  return done ? 'done' : needsMe ? 'needs' : 'progress';
}


export const needsYouCount = (d, me, biz) => (biz ? d.applications.filter((a) => byId(d, a.campaignId)?.ownerId === me.id) : d.applications.filter((a) => a.creatorId === me.id))
  .filter((a) => stageOf(d, a, biz) === 'needs').length;
