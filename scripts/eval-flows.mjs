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
actions.login('u_candle');
const listing0 = (comp) => ({ productName: 'Candle', title: 't', type: 'Product', category: 'home', description: 'd', compensation: comp, budgetMin: comp === 'flat' ? 1000 : 0, budgetMax: comp === 'flat' ? 2000 : 0, slots: 1, deliverables: [{ type: 'Reel', qty: 1, platform: 'instagram' }], platforms: ['instagram'], published: true, tags: [] });
check('Product-for-content listings are unlimited on the Free plan', (() => { try { for (let i = 0; i < 4; i++) actions.saveCampaign(listing0('gifted')); return true; } catch { return false; } })());
check('Free plan caps active paid listings', (() => { try { for (let i = 0; i < 4; i++) actions.saveCampaign(listing0('flat')); return false; } catch (e) { return /paid listings/.test(e.message); } })());
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

// Monetization: cut of paid deals and commissions, Brand Pro and featured spots are live.
const { isOn, STREAMS, revenueSummary, brandFeeRate, commissionCutRate } = await import('../src/lib/monetize.js');
check('The four money streams are on by default', ['transactionFee', 'plans', 'featuredListings'].every((x) => isOn(db(), x)) && !isOn(db(), 'paidHandpick') && !isOn(db(), 'instantPayout'));
const meNow = () => db().users.find((u) => u.id === 'u_me');
const feeRev = db().revenue.filter((r) => r.stream === 'transactionFee' && r.ref === del.id);
check('Paid-deal fee is recorded as Buzz revenue at the plan rate', feeRev.length === 1 && feeRev[0].amount === Math.round(1800 * brandFeeRate(db(), meNow())), JSON.stringify(feeRev.map((r) => r.amount)));
check('Brand Pro pays a lower fee and commission cut', brandFeeRate(db(), meNow()) === 0.03 && commissionCutRate(db(), meNow()) === 0.10 && brandFeeRate(db(), db().users.find((u) => u.id === 'u_candle')) === 0.05 && commissionCutRate(db(), db().users.find((u) => u.id === 'u_candle')) === 0.15);
actions.login('u_me');
const revBefore = revenueSummary(db()).total;
actions.setStream('featuredListings', { settings: { weekPrice: 600 } });
actions.buyFeature(cid, 2);
check('Brand Pro gets one featured week free, pays for the rest', revenueSummary(db()).total - revBefore === 600 && db().campaigns.find((c) => c.id === cid).featuredUntil > Date.now());
const rev2 = revenueSummary(db()).total;
actions.buyFeature(cid, 1);
check('The free featured week is once a month', revenueSummary(db()).total - rev2 === 600);
check('You can only feature your own listing', throws(() => actions.buyFeature(db().campaigns.find((c) => c.ownerId !== 'u_me').id, 1)));
actions.login('u_candle');
const rev3 = revenueSummary(db()).total;
actions.setPlan('pro');
check('Upgrading to Brand Pro records the subscription', revenueSummary(db()).total - rev3 === 1499 && db().users.find((u) => u.id === 'u_candle').plan === 'pro');
actions.setPlan('free');
actions.login('c_trish');
check('Creators cannot buy Brand Pro', throws(() => actions.setPlan('pro')));
actions.login('u_me');
const { commissionOwed } = await import('../src/lib/ops.js');
const comCamp = db().campaigns.find((c) => c.commissionRate > 0 && db().links.some((l) => l.campaignId === c.id));
actions.login(comCamp.ownerId);
actions.logSale(db().links.find((l) => l.campaignId === comCamp.id).id, 2000, 'code');
const owedRows = commissionOwed(db(), comCamp.ownerId);
const expectedCut = owedRows.reduce((a, x) => a + Math.round(x.amount * commissionCutRate(db(), db().users.find((u) => u.id === comCamp.ownerId))), 0);
const r0 = revenueSummary(db()).by.transactionFee || 0;
actions.settleCommissions();
check('Commission payouts give Buzz its cut', expectedCut > 0 && (revenueSummary(db()).by.transactionFee || 0) - r0 === expectedCut, `cut ${expectedCut}`);
actions.login('u_me');
actions.setStream('transactionFee', { on: false });
const { feeRate } = await import('../src/lib/store.js');
check('Turning the cut off makes the fee 0%', feeRate(meNow()) === 0);
actions.setStream('transactionFee', { on: true });

check('Seed click and sales data are intact', db().events.some((e) => e.t === 'click') && db().events.some((e) => e.t === 'sale'));

// Grow for free + TikTok.
const grow = await import('../src/lib/grow.js');
await import('../src/lib/growops.js');
actions.login('u_me');
const meU = () => db().users.find((u) => u.id === 'u_me');
const sm = grow.swapMatches(db(), meU());
check('Swap matches never include competitors', sm.length > 0 && sm.every((x) => x.u.business.category !== meU().business.category));
const pal = sm.find((x) => !db().swaps.some((s) => [s.fromId, s.toId].includes(x.u.id)));
actions.proposeSwap({ toId: pal.u.id, give: 'Instagram story shout-out', ask: 'TikTok video' });
check('Duplicate swap with the same brand is refused', throws(() => actions.proposeSwap({ toId: pal.u.id, give: 'a', ask: 'b' })));
const sw = db().swaps.find((s) => s.fromId === 'u_me' && s.toId === pal.u.id);
actions.login(pal.u.id);
actions.respondSwap(sw.id, true);
actions.postSwap(sw.id, 'https://www.tiktok.com/@x/video/1');
actions.login('u_me');
actions.postSwap(sw.id, 'https://www.instagram.com/p/y');
check('Swap completes when both sides post', db().swaps.find((s) => s.id === sw.id).status === 'done');

const myLaunch = actions.submitLaunch({ title: 'Test Barong Mini', pitch: 'Tiny barong for your car mirror' });
check('One Launch Pad entry per brand per week', throws(() => actions.submitLaunch({ title: 'Again', pitch: 'x' })));
check('Brands cannot vote for themselves', throws(() => actions.voteLaunch(myLaunch)));
actions.login('c_trish');
actions.voteLaunch(myLaunch);
actions.wantToPost(myLaunch, 'I would love to post this');
const L = db().launches.find((l) => l.id === myLaunch);
check('Votes and creator offers are recorded', L.votes.includes('c_trish') && L.interested.includes('c_trish'));
check('Creator offer lands in the brand\'s messages', db().threads.some((t) => t.participants.includes('u_me') && t.participants.includes('c_trish') && t.messages.some((m) => m.body === 'I would love to post this')));
actions.voteLaunch(myLaunch);
check('Voting again removes the vote', !db().launches.find((l) => l.id === myLaunch).votes.includes('c_trish'));

const prog = db().ugcPrograms.find((p) => p.brandId === 'u_me');
actions.submitUgc(prog.code, { url: 'https://www.tiktok.com/@trish/video/9', platform: 'tiktok' });
check('One customer reward per month', throws(() => actions.submitUgc(prog.code, { url: 'https://www.tiktok.com/@trish/video/10', platform: 'tiktok' })));
actions.login('u_me');
const ugc = db().ugcPosts.find((x) => x.userId === 'c_trish' && x.brandId === 'u_me');
actions.reviewUgc(ugc.id, true);
const ugc2 = db().ugcPosts.find((x) => x.id === ugc.id);
check('Approving a customer post sends a voucher', ugc2.status === 'approved' && /^[A-Z]+-[A-Z0-9]{4}$/.test(ugc2.voucher) && db().emails.some((e) => e.userId === 'c_trish' && e.body.includes(ugc2.voucher)));

const appr = db().deliverables.find((x) => x.status === 'approved' && db().campaigns.find((c) => c.id === x.campaignId)?.ownerId === 'u_me');
actions.requestBoostCode(appr.id);
actions.login(appr.creatorId);
actions.setBoostCode(appr.id, '#SparkCODE123', 30);
check('Ad-boost code reaches the brand', db().deliverables.find((x) => x.id === appr.id).boostCode === '#SparkCODE123' && db().notifications.some((n) => n.userId === 'u_me' && n.text.includes('ad-boost code')));
const lk = db().links.find((l) => l.creatorId === appr.creatorId);
actions.setAffiliateUrl(lk.id, 'https://affiliate.tiktok.com/x');
check('Tracking link forwards to the creator\'s TikTok Shop affiliate link', actions.recordClick(lk.code).shopUrl === 'https://affiliate.tiktok.com/x');

// Simpler workspace: auto-signed agreements, extras unlock after the first finished collab.
check('Agreements are signed by both sides on accept', db().contracts.filter((k) => k.autoSigned).every((k) => k.brandSignedAt && k.creatorSignedAt) && db().contracts.some((k) => k.autoSigned));
actions.logout();
actions.signup({ password: 'password123', name: 'Nena Cruz', email: 'nena@test.ph', role: 'business', businessName: 'Nena Kakanin', businessType: 'Kakanin', category: 'food', region: 'Metro Manila' });
const nena = () => db().users.find((u) => u.email === 'nena@test.ph');
check('Extra growth tools are hidden for a brand-new seller', !grow.growUnlocked(db(), nena()));
actions.setFlag('growTools', 'on');
check('Admin can switch the extra tools on for everyone', grow.growUnlocked(db(), nena()));
actions.setFlag('growTools', 'auto');
check('Brands that finished a collab see the extra tools', grow.growUnlocked(db(), db().users.find((u) => u.id === 'u_me')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
