// Checks the matching engine against cases where the right answer is obvious.
// Run: npx vite-node scripts/eval-match.mjs
import { buildSeed } from '../src/lib/seed.js';
import { rankCreators, rankCampaigns, matchScore } from '../src/lib/match.js';

const d = buildSeed();
const camp = (id) => d.campaigns.find((c) => c.id === id);
const user = (id) => d.users.find((u) => u.id === id);
let pass = 0;
let fail = 0;
const results = [];

function expectTop(label, list, ids, n) {
  const top = list.slice(0, n).map((x) => x.id);
  const ok = ids.some((id) => top.includes(id));
  ok ? pass++ : fail++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}\n        top ${n}: ${list.slice(0, n).map((x) => `${x.id}(${x.score})`).join(', ')}`);
}

// Business side: who should a brand see first?
const brandCases = [
  ['Sili hot sauce (Pampanga) → Kapampangan home cook', 'cmp_sili', ['c_joy'], 3],
  ['Dried mangoes (Cebu) → Cebu snack creator', 'cmp_mangga', ['c_ria'], 3],
  ['Barako coffee → home barista', 'cmp_barako', ['c_dan'], 3],
  ['Pilates studio QC → QC pilates creator', 'cmp_pilates', ['c_pia'], 3],
  ['Smart outlet → budget smart-home creator', 'cmp_sulit', ['c_ken'], 3],
  ['Kalamansi serum → skincare creators', 'cmp_kalamansi', ['c_lia', 'c_kaye'], 2],
  ['Bulul carvings → craft creators', 'cmp_bulul', ['c_rico', 'c_rina'], 2],
  ['Tinalak textiles → local crafts/fashion creators', 'cmp_tinalak', ['c_leah', 'c_rico', 'c_rina'], 3],
  ['Filipiniana dressmaker → Filipiniana stylist', 'cmp_ligaya', ['c_camille'], 3],
  ['Corgi raincoats → pet creators', 'cmp_sadie', ['c_jb', 'c_sam'], 2],
  ['Siargao surf stay → travel/surf creators', 'cmp_cloud9', ['c_marco', 'c_tala'], 3],
  ['El Nido eco lodge → Palawan travel creator', 'cmp_lodge', ['c_tala'], 3],
  ['Budgeting app → personal-finance creator', 'cmp_ipon', ['c_ana'], 3],
  ['Handmade furniture → home/craft creators', 'cmp_kahoy', ['c_enzo', 'c_rico', 'c_rina', 'c_ken'], 3],
  ['Organic whey → fitness creators', 'cmp_protina', ['c_migo', 'c_pia', 'c_marco'], 3],
];
for (const [label, cid, ids, n] of brandCases) {
  const list = rankCreators(d, camp(cid), { exclude: false }).map((x) => ({ id: x.u.id, score: x.m.score }));
  expectTop(label, list, ids, n);
}

// Creator side: what should a creator see first?
const live = d.campaigns.filter((c) => c.published && c.status !== 'completed');
const creatorCases = [
  ['Bianca (food) → food listings first', 'c_bianca', ['cmp_sili', 'cmp_mangga', 'cmp_barako', 'cmp_hurno', 'cmp_foodbox'], 1],
  ['Kaye (skincare) → kalamansi serum', 'c_kaye', ['cmp_kalamansi'], 1],
  ['Sam (corgi) → corgi raincoats', 'c_sam', ['cmp_sadie'], 1],
  ['JB (dachshunds + corgi) → corgi raincoats', 'c_jb', ['cmp_sadie'], 1],
  ['Rina (crafts) → craft listings', 'c_rina', ['cmp_bulul', 'cmp_tinalak', 'cmp_candle', 'cmp_kahoy'], 2],
  ['Marco (surf) → Siargao surf stay', 'c_marco', ['cmp_cloud9'], 3],
  ['Ken (smart home) → smart outlet', 'c_ken', ['cmp_sulit'], 2],
  ['Dan (coffee) → barako coffee', 'c_dan', ['cmp_barako'], 2],
  ['Tala (Palawan) → El Nido lodge', 'c_tala', ['cmp_lodge'], 2],
  ['Camille (Filipiniana) → dressmaker or barong', 'c_camille', ['cmp_ligaya', 'cmp_barong'], 2],
];
for (const [label, uid, ids, n] of creatorCases) {
  const list = rankCampaigns(d, user(uid), live, { exclude: false }).map((x) => ({ id: x.c.id, score: x.m.score }));
  expectTop(label, list, ids, n);
}

// Rules that should always hold.
let offTopOne = [];
let unrelatedTop3 = [];
let unaffordablePerfect = [];
for (const c of live) {
  const top = rankCreators(d, c, { exclude: false }).slice(0, 3);
  if (top[0].m.factors.theme.score < 0.6) offTopOne.push(`${c.id}:${top[0].u.id}`);
  top.forEach(({ u, m }) => {
    if (m.factors.theme.score < 0.25) unrelatedTop3.push(`${c.id}:${u.id}`);
    if (m.score >= 85 && m.factors.budget.score < 0.5) unaffordablePerfect.push(`${c.id}:${u.id}`);
  });
}
const rule = (label, ok, detail) => { ok ? pass++ : fail++; results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n        ${detail}` : ''}`); };
rule('Every brand\'s #1 creator is in or right next to their category', offTopOne.length === 0, offTopOne.join(', '));
rule('No creator from an unrelated category in any brand\'s top 3', unrelatedTop3.length === 0, unrelatedTop3.join(', '));
rule('No "Perfect fit" the brand cannot afford', unaffordablePerfect.length === 0, unaffordablePerfect.join(', '));

// Spread: labels should separate strong from weak, not all look the same.
const all = live.flatMap((c) => d.users.filter((u) => u.creator).map((u) => matchScore(u, c, { brand: true, d }).score));
const buckets = { perfect: all.filter((s) => s >= 85).length, great: all.filter((s) => s >= 70 && s < 85).length, good: all.filter((s) => s >= 55 && s < 70).length, other: all.filter((s) => s < 55).length };
rule('Perfect fits stay rare (under 10% of all pairs)', buckets.perfect / all.length < 0.1, JSON.stringify(buckets));
const crowded = live.filter((c) => rankCreators(d, c, { exclude: false }).filter((x) => x.m.score >= 70).length > 6).map((c) => c.id);
rule('No listing calls more than 6 creators Great or better', crowded.length === 0, crowded.join(', '));
rule('Every listing has at least one Good-or-better creator', live.every((c) => rankCreators(d, c, { exclude: false })[0].m.score >= 55),
  live.filter((c) => rankCreators(d, c, { exclude: false })[0].m.score < 55).map((c) => c.id).join(', '));

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
