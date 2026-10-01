// Browsing without typing: one-tap toggles and themed shelves built from
// facts on each listing.
import { DAY } from './format';
import { applicantsCount, userById } from './store';

export const TOGGLES = [
  { id: 'cash', label: 'Paid in cash', test: (c) => ['flat', 'hybrid'].includes(c.compensation) },
  { id: 'free', label: 'Free product', test: (c) => c.compensation === 'gifted' || (c.type === 'Product' && c.compensation !== 'commission') },
  { id: 'near', label: 'Near me', test: (c, ctx) => !!ctx.me && c.region === ctx.me.region },
  { id: 'trips', label: 'Trips & stays', test: (c) => c.category === 'travel' },
  { id: 'new', label: 'New this week', test: (c) => c.createdAt > Date.now() - 7 * DAY },
  { id: 'few', label: 'Few applicants', test: (c, ctx) => applicantsCount(ctx.d, c.id) <= 2 },
  { id: 'handmade', label: 'Handmade', test: (c) => c.tags?.includes('handmade') || c.category === 'crafts' },
  { id: 'noface', label: 'No face needed', test: (c) => c.tags?.includes('noface') },
  { id: 'quick', label: 'Quick: 1 post', test: (c) => c.deliverables.reduce((a, d) => a + (Number(d.qty) || 1), 0) === 1 },
  { id: 'longterm', label: 'Long-term ambassador', test: (c) => c.tags?.includes('longterm') },
];

export const SHELVES = [
  { id: 'new', title: 'New this week', sub: 'Fresh listings, apply before everyone else', test: TOGGLES[4].test, sort: (a, b) => b.createdAt - a.createdAt },
  { id: 'few', title: 'Few applicants, better odds', sub: '2 or fewer creators have applied', test: TOGGLES[5].test },
  { id: 'cash', title: 'Paid in cash', sub: 'Guaranteed fee, held in escrow', test: TOGGLES[0].test, sort: (a, b) => b.budgetMax - a.budgetMax },
  { id: 'near', title: 'Near you', sub: 'Brands in your region', test: TOGGLES[2].test },
  { id: 'handmade', title: 'Handmade in the provinces', sub: 'Craftspeople and small makers', test: (c, ctx) => TOGGLES[6].test(c) && userById(ctx.d, c.ownerId)?.region !== 'Metro Manila' },
  { id: 'trips', title: 'Trips, stays & experiences', sub: 'Get out of the city', test: (c) => c.category === 'travel' || (c.type === 'Service' && c.compensation === 'gifted') },
  { id: 'closing', title: 'Closing soon', sub: 'Applications end within 10 days', test: (c) => c.deadline < Date.now() + 10 * DAY, sort: (a, b) => a.deadline - b.deadline },
  { id: 'noface', title: 'No face needed', sub: 'Hands, voiceover or product-only content', test: TOGGLES[7].test },
];
