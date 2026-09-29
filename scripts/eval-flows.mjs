// End-to-end check of the collaboration lifecycle using the real store actions.
// Run: npx vite-node scripts/eval-flows.mjs
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { actions, getDB } = await import('../src/lib/store.js');
await import('../src/lib/ops.js');
const { walletOf } = await import('../src/lib/store.js');

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const db = () => getDB();
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// 1. Brand posts a listing; best-fit creators get alerted.
actions.login('u_me');
const cid = actions.saveCampaign({ productName: 'Ty Chili Crisp', title: 'Home cooks for our chili crisp', type: 'Product', category: 'food', description: 'Crunchy chili crisp made with siling labuyo and garlic. Show it on everyday Filipino cooking like sisig and fried rice.', audience: 'Home cooks 25–45', compensation: 'flat', budgetMin: 1200, budgetMax: 2500, commissionRate: 0, slots: 3, deliverables: [{ type: 'TikTok video', qty: 1, platform: 'tiktok' }], platforms: ['tiktok'], photos: ['x'], aov: 380, published: true, requireDraft: true, needsShipping: true, tags: [] });
const alerted = db().notifications.filter((n) => n.link === `/opportunity/${cid}`).map((n) => n.userId);
check('New listing alerts best-fit creators', alerted.includes('c_joy'), alerted.join(','));

// 2. Creator applies; brand accepts; agreement and shipment are created.
actions.login('c_joy');
actions.apply(cid, { pitch: 'I cook Kapampangan food at home every day and my audience loves spicy.', rate: 1800 });
actions.login('u_me');
const app = db().applications.find((a) => a.campaignId === cid && a.creatorId === 'c_joy');
actions.decide(app.id, 'accepted');
const k = db().contracts.find((x) => x.applicationId === app.id);
check('Agreement created on accept', !!k && k.terms.fee === 1800);
const sh = db().shipments.find((x) => x.campaignId === cid && x.creatorId === 'c_joy');
check('Sample shipment created for product campaign', sh?.status === 'to_ship');
check('Signing with the wrong name is refused', throws(() => actions.signContract(k.id, 'Someone Else')));
actions.signContract(k.id, 'Sigmund Ty');
actions.updateShipment(sh.id, { courier: 'J&T Express', tracking: 'JT123', status: 'shipped' });
actions.login('c_joy');
actions.signContract(k.id, 'Joy Manalo');
check('Both sides signed', !!db().contracts.find((x) => x.id === k.id).creatorSignedAt && !!db().contracts.find((x) => x.id === k.id).brandSignedAt);
actions.updateShipment(sh.id, { status: 'delivered' });
check('Creator confirmed sample received', db().shipments.find((x) => x.id === sh.id).status === 'delivered');

// 3. Draft → approval → post → escrow → payment.
const del = db().deliverables.find((x) => x.campaignId === cid && x.creatorId === 'c_joy');
check('Empty draft is refused', throws(() => actions.submitDraft(del.id, { link: '' })));
actions.submitDraft(del.id, { link: 'https://drive.example/draft.mp4', note: 'Caption: Sisig night! #ad' });
actions.login('u_me');
actions.reviewDraft(del.id, true);
actions.fundEscrow([del.id], 'GCash');
check('Escrow funded', db().deliverables.find((x) => x.id === del.id).escrow === 'held');
actions.login('c_joy');
actions.submitDeliverable(del.id, { contentUrl: 'https://tiktok.com/@joycooksph/1', stats: { reach: 9000, likes: 800, comments: 60, shares: 40, saves: 55 } });
const before = walletOf(db(), 'c_joy').balance;
actions.login('u_me');
actions.reviewDeliverable(del.id, true);
const after = walletOf(db(), 'c_joy').balance;
check('Approval releases escrow to creator wallet', after - before === del.fee, `+${after - before}`);

// 4. Sales import matches promo codes.
const link = db().links.find((l) => l.campaignId === cid && l.creatorId === 'c_joy');
const r = actions.importSales([{ code: link.code, amount: '380', date: '2026-09-25' }, { code: link.code.toLowerCase(), amount: '₱760.00' }, { code: 'NOTOURS', amount: '100' }], 'Shopee');
check('Sales import matches codes (case-insensitive, peso signs)', r.matched === 2 && r.total === 1140 && r.unknown.includes('NOTOURS'), JSON.stringify(r));

// 5. Dispute freezes escrow; approval can't release it; Buzz splits it.
actions.login('u_me');
actions.addDeliverable({ campaignId: cid, creatorId: 'c_joy', type: 'Story set', platform: 'instagram', dueAt: Date.now() + 5 * 86400000, fee: 1000, title: 'Story set for Ty Chili Crisp' });
const del2 = db().deliverables.find((x) => x.campaignId === cid && x.creatorId === 'c_joy' && x.fee === 1000);
actions.fundEscrow([del2.id], 'Maya');
actions.login('c_joy');
const dspId = actions.openDispute({ campaignId: cid, deliverableId: del2.id, againstId: 'u_me', reason: 'Payment not released', details: 'Posted the stories on time, no approval after a week.', evidence: ['https://instagram.com/stories/joycooksph'] });
check('Dispute freezes held escrow', db().deliverables.find((x) => x.id === del2.id).frozen === true);
check('Second open dispute on same campaign is refused', throws(() => actions.openDispute({ campaignId: cid, againstId: 'u_me', reason: 'Other', details: 'x', evidence: [] })));
actions.submitDeliverable(del2.id, { contentUrl: 'https://instagram.com/s/1', stats: { reach: 1, likes: 0, comments: 0, shares: 0, saves: 0 } });
actions.login('u_me');
const w0 = walletOf(db(), 'c_joy').balance;
actions.reviewDeliverable(del2.id, true);
check('Approval does not release frozen escrow', walletOf(db(), 'c_joy').balance === w0 && db().deliverables.find((x) => x.id === del2.id).escrow === 'held');
actions.disputeMessage(dspId, 'We asked for one more story frame.');
actions.resolveDispute(dspId, 'split', 0.5, 'Most of the work was delivered.');
check('Split decision pays the creator half', walletOf(db(), 'c_joy').balance - w0 === 500, `+${walletOf(db(), 'c_joy').balance - w0}`);
const refunds = db().transactions.filter((t) => t.userId === 'u_me' && t.type === 'refund' && t.ref === del2.id).reduce((a, t) => a + t.amount, 0);
check('Brand gets the other half back', refunds === 500);
check('Dispute marked resolved', db().disputes.find((x) => x.id === dspId).status === 'resolved');

// 6. Verification, support, hand-pick, plan limits, referrals.
actions.login('c_joy');
check('Duplicate verification request is refused', throws(() => actions.requestVerification({ kind: 'creator', docType: 'Platform insights', docName: 'x.png', links: ['https://tiktok.com/@joycooksph'] })));
actions.login('u_me');
const v = db().verifications.find((x) => x.userId === 'c_joy' && x.status === 'pending');
actions.reviewVerification(v.id, true);
check('Approved verification marks stats verified', db().users.find((u) => u.id === 'c_joy').creator.statsVerified === true);
actions.login('u_hurno');
actions.openTicket({ topic: 'Payments', subject: 'Receipt?', body: 'Can I get an official receipt?' });
actions.login('u_me');
const t = db().tickets.find((x) => x.subject === 'Receipt?');
actions.replyTicket(t.id, 'Yes, we email one after each payment.');
check('Support reply marks ticket answered', db().tickets.find((x) => x.id === t.id).status === 'answered');
actions.setStream('plans', { on: true });
actions.login('u_candle');
check('Free plan blocks a 3rd active listing', (() => {
  const base = { productName: 'Candle', title: 't', type: 'Product', category: 'home', description: 'd', compensation: 'gifted', budgetMin: 0, budgetMax: 0, slots: 1, deliverables: [{ type: 'Reel', qty: 1, platform: 'instagram' }], platforms: ['instagram'], published: true, tags: [] };
  try { actions.saveCampaign(base); actions.saveCampaign(base); return false; } catch { return true; }
})());
actions.setStream('plans', { on: false });
actions.login('u_kalamansi');
const cn = db().concierge.find((x) => x.campaignId === 'cmp_kalamansi');
actions.login('u_me');
actions.deliverConcierge(cn.id, ['c_lia'], 'Your skincare routines are exactly what they need.');
check('Hand-pick invites the chosen creators', db().applications.some((a) => a.campaignId === 'cmp_kalamansi' && a.creatorId === 'c_lia' && a.status === 'invited'));

actions.logout();
actions.signup({ referral: 'SIGMUND11', password: 'password123', name: 'Mika Tan', email: 'mika@test.ph', role: 'business', businessName: 'Mika Bakes', businessType: 'Cookies', category: 'food', region: 'Metro Manila' });
const mika = db().users.find((u) => u.email === 'mika@test.ph');
const sigRef = db().users.find((u) => u.id === 'u_me').refCode;
check('Referral code links new user to inviter', mika.referredBy === (db().users.find((u) => u.refCode === 'SIGMUND11')?.id || null), `u_me code is ${sigRef}`);

// Monetization: only the transaction cut is live by default; everything else is switchable.
const { isOn, STREAMS, revenueSummary } = await import('../src/lib/monetize.js');
check('Only the transaction cut is on by default', STREAMS.filter((x) => isOn(db(), x.id)).map((x) => x.id).join() === 'transactionFee');
const feeRev = db().revenue.filter((r) => r.stream === 'transactionFee' && r.ref === del.id);
check('Escrow fee is recorded as Buzz revenue', feeRev.length === 1 && feeRev[0].amount === Math.round(1800 * 0.05), JSON.stringify(feeRev.map((r) => r.amount)));
actions.login('u_me');
check('Paid extras are refused while switched off', ['buyFeature', 'orderService', 'buyEventTicket'].every((fn) => throws(() => (fn === 'buyFeature' ? actions.buyFeature(cid, 1) : fn === 'orderService' ? actions.orderService('brief', {}) : actions.buyEventTicket(db().events[0].id)))));
check('Plans are refused while switched off', throws(() => actions.setPlan('pro')));
const revBefore = revenueSummary(db()).total;
actions.setStream('featuredListings', { on: true, settings: { weekPrice: 600 } });
actions.buyFeature(cid, 2);
check('Featured listing charges the admin-set price', revenueSummary(db()).total - revBefore === 1200 && db().campaigns.find((c) => c.id === cid).featuredUntil > Date.now());
actions.setStream('servicesCatalog', { on: true });
actions.orderService('brief', { notes: 'help' });
check('Service order lands in the admin queue', db().orders[0]?.serviceId === 'brief' && db().orders[0].status === 'new');
actions.setStream('transactionFee', { on: false });
const { feeRate } = await import('../src/lib/store.js');
check('Turning the cut off makes escrow fee 0%', feeRate(db().users.find((u) => u.id === 'u_me')) === 0);
actions.setStream('transactionFee', { on: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
