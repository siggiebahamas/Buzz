import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, Bookmark, ChevronRight, ChevronLeft, Plus, RotateCcw, Shuffle, Sparkles, Flame } from 'lucide-react';
import { useDB, currentUser, applicantsCount, creators, followersOf, liveCampaigns } from '../lib/store';
import { BUDGET_BUCKETS, COMP_TYPES, PLATFORMS, REGIONS, categoryById } from '../lib/constants';
import { matchScore } from '../lib/match';
import { CategoryRow, OpportunityCard, OpportunityTile, CreatorCard, CreatorRow } from '../components/visuals';
import { TOGGLES, SHELVES, dailyPicksStatus, pickOfTheDay } from '../lib/discover';
import { actions } from '../lib/store';
import { cx } from '../components/ui';
import { Segmented, PillMenu, Button, EmptyState, Select } from '../components/ui';
import { CampaignForm } from '../components/forms';

const inBudget = (bucket, lo, hi) => {
  const b = BUDGET_BUCKETS.find((x) => x.id === bucket);
  if (!b || b.id === 'any') return true;
  return (b.max == null || lo <= b.max) && (b.min == null || hi >= b.min);
};

export default function Opportunities() {
  const d = useDB();
  const me = currentUser(d);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const as = params.get('as') || (d.session.mode === 'creator' ? 'creator' : me ? 'business' : 'creator');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(params.get('cat') || 'all');
  const [budget, setBudget] = useState('any');
  const [comp, setComp] = useState('all');
  const [platforms, setPlatforms] = useState([]);
  const [region, setRegion] = useState('all');
  const [sort, setSort] = useState('match');
  const [toggles, setToggles] = useState([]);
  const [posting, setPosting] = useState(false);
  const myCampaigns = d.campaigns.filter((c) => c.ownerId === me?.id);
  const [forCid, setForCid] = useState(myCampaigns.find((c) => c.status !== 'completed')?.id || '');
  const forCampaign = myCampaigns.find((c) => c.id === forCid) || null;
  const filtered = q || budget !== 'any' || comp !== 'all' || platforms.length > 0 || region !== 'all' || toggles.length > 0;
  const reset = () => { setQ(''); setCat('all'); setBudget('any'); setComp('all'); setPlatforms([]); setRegion('all'); setToggles([]); };
  const ctx = { d, me };
  useEffect(() => { actions.recordVisit(); }, []);

  const listings = useMemo(() => {
    const needle = q.toLowerCase();
    let arr = liveCampaigns(d).filter((c) => c.status !== 'completed' && c.ownerId !== me?.id)
      .filter((c) => cat === 'all' || c.category === cat)
      .filter((c) => toggles.every((t) => TOGGLES.find((x) => x.id === t).test(c, { d, me })))
      .filter((c) => comp === 'all' || c.compensation === comp)
      .filter((c) => region === 'all' || c.region === region)
      .filter((c) => !platforms.length || platforms.some((p) => c.platforms.includes(p)))
      .filter((c) => inBudget(budget, c.budgetMin, c.budgetMax))
      .filter((c) => !needle || `${c.title} ${c.productName} ${c.description} ${categoryById(c.category).label}`.toLowerCase().includes(needle))
      .map((c) => ({ c, m: me?.creator ? matchScore(me, c).score : null }));
    const by = {
      match: (a, b) => (b.m ?? 0) - (a.m ?? 0) || b.c.createdAt - a.c.createdAt,
      newest: (a, b) => b.c.createdAt - a.c.createdAt,
      budget: (a, b) => b.c.budgetMax - a.c.budgetMax,
      popular: (a, b) => applicantsCount(d, b.c.id) - applicantsCount(d, a.c.id),
    }[sort];
    return arr.sort(by).map((x) => x.c);
  }, [d, q, cat, comp, region, platforms, budget, sort, me, toggles]);

  const people = useMemo(() => {
    const needle = q.toLowerCase();
    let arr = creators(d).filter((u) => u.id !== me?.id)
      .filter((u) => cat === 'all' || u.creator.niches.includes(cat))
      .filter((u) => !platforms.length || u.creator.platforms.some((p) => platforms.includes(p.id)))
      .filter((u) => region === 'all' || u.region === region)
      .filter((u) => inBudget(budget, u.creator.rates?.reel || 0, u.creator.rates?.reel || 0))
      .filter((u) => !needle || `${u.name} ${u.creator.handle} ${u.bio} ${u.creator.niches.map((n) => categoryById(n).label).join(' ')}`.toLowerCase().includes(needle))
      .map((u) => ({ u, m: forCampaign ? matchScore(u, forCampaign, { brand: true }).score : 0 }));
    const by = {
      match: (a, b) => b.m - a.m || b.u.creator.engagement - a.u.creator.engagement,
      newest: (a, b) => b.u.joinedAt - a.u.joinedAt,
      budget: (a, b) => (a.u.creator.rates?.reel || 0) - (b.u.creator.rates?.reel || 0),
      popular: (a, b) => followersOf(b.u) - followersOf(a.u),
    }[sort];
    return arr.sort(by).map((x) => x.u);
  }, [d, q, cat, platforms, region, budget, sort, forCampaign, me]);

  const isCreatorView = as === 'creator';

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center">
        <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-ink">OPPORTUNITIES</h1>
        <div className="mt-3"><Segmented value={as} onChange={(v) => { setParams({ as: v }); setSort('match'); }} options={[{ id: 'creator', label: "I'm an Influencer" }, { id: 'business', label: "I'm an Entrepreneur" }]} /></div>
        <p className="text-[14px] text-ink-muted mt-3">{isCreatorView ? 'Discover local products and businesses looking for creators like you.' : 'Discover creators who match your brand and target audience.'}</p>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isCreatorView ? 'Search product, brand or keyword…' : 'Search creators by name, niche…'}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-line-strong bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand" />
        </div>
        {filtered && <Button variant="outline" className="h-11" onClick={reset}><RotateCcw size={15} />Clear filters</Button>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <PillMenu label="Budget" value={budget} onChange={setBudget} options={BUDGET_BUCKETS} />
        {isCreatorView && <PillMenu label="Collaboration Type" value={comp} onChange={setComp} options={[{ id: 'all', label: 'Any type' }, ...Object.entries(COMP_TYPES).map(([id, label]) => ({ id, label }))]} />}
        <PillMenu multi label="Platforms" value={platforms} onChange={setPlatforms} options={Object.entries(PLATFORMS).map(([id, p]) => ({ id, label: p.label }))} />
        <PillMenu label="Location" value={region} onChange={setRegion} options={[{ id: 'all', label: 'Anywhere' }, ...REGIONS.map((r) => ({ id: r, label: r }))]} />
        <PillMenu label="Sort" value={sort} onChange={setSort} options={[
          { id: 'match', label: 'Sort: Best match' }, { id: 'newest', label: 'Sort: Newest' },
          { id: 'budget', label: isCreatorView ? 'Sort: Highest budget' : 'Sort: Lowest rate' }, { id: 'popular', label: isCreatorView ? 'Sort: Most applied' : 'Sort: Most followers' },
        ]} />
      </div>
      <div className="mt-5"><CategoryRow value={cat} onChange={setCat} /></div>
      {isCreatorView && (
        <div className="mt-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Just browsing? Tap what you're in the mood for</p>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            {TOGGLES.map((t) => {
              const on = toggles.includes(t.id);
              return (
                <button key={t.id} onClick={() => setToggles(on ? toggles.filter((x) => x !== t.id) : [...toggles, t.id])}
                  className={cx('h-9 px-3.5 rounded-full border text-[13px] whitespace-nowrap transition-colors', on ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:border-brand/60')}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isCreatorView ? (
        filtered ? (
          <Results count={listings.length} label="opportunities">
            {listings.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{listings.map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>
              : <EmptyState title="No opportunities match these filters" body="Try another category or clear the filters." action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />}
          </Results>
        ) : (
          <>
            <DailyPicks listings={listings} me={me} />
            <Section title={me?.creator ? 'Recommended For You' : 'Fresh Opportunities'} hint={me?.creator ? 'Best fits first. Hover a fit label to see which of the 5 checks you pass.' : 'Sign up as a creator to see how well each one fits you.'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{listings.slice(0, 6).map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>
            </Section>
            {SHELVES.map((s) => {
              const items = listings.filter((c) => s.test(c, ctx));
              if (items.length < 2) return null;
              return <Shelf key={s.id} title={s.title} sub={s.sub} items={s.sort ? [...items].sort(s.sort) : items} />;
            })}
            <Section title="All Opportunities">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{listings.slice(6).map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>
            </Section>
          </>
        )
      ) : (
        <>
          {myCampaigns.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-line p-3 pl-4">
              <span className="text-[13.5px] text-ink-soft whitespace-nowrap">Match creators for</span>
              <div className="w-full sm:w-72"><Select value={forCid} onChange={(e) => setForCid(e.target.value)}>{myCampaigns.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></div>
              <span className="text-[12.5px] text-ink-muted">Fit checks use this campaign's category, platforms, budget and location.</span>
            </div>
          )}
          {filtered ? (
            <Results count={people.length} label="creators">
              {people.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{people.map((u) => <CreatorCard key={u.id} user={u} forCampaign={forCampaign} />)}</div>
                : <EmptyState title="No creators match these filters" action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />}
            </Results>
          ) : (
            <>
              <Section title="Recommended Influencers For You"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{people.slice(0, 6).map((u) => <CreatorCard key={u.id} user={u} forCampaign={forCampaign} />)}</div></Section>
              <Section title="Top Matching Influencers"><div className="space-y-3">{people.slice(0, 5).map((u) => <CreatorRow key={u.id} user={u} forCampaign={forCampaign} />)}</div></Section>
              <Section title="All Creators"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{people.slice(6).map((u) => <CreatorCard key={u.id} user={u} forCampaign={forCampaign} />)}</div></Section>
            </>
          )}
        </>
      )}

      <div className="mt-12 rounded-2xl bg-brand-softer border border-[#F6DDB2] p-5 flex flex-wrap items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-brand-soft text-brand-dark grid place-items-center"><Bookmark size={19} /></div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-bold text-ink">Save opportunities you love</p>
          <p className="text-[13px] text-ink-muted">Bookmark products and creators and find them in your Saved section.</p>
        </div>
        <Link to="/workspace/saved"><Button>Explore Saved <ChevronRight size={15} /></Button></Link>
      </div>
      <div className="mt-8 text-center">
        <Button variant="outline" onClick={() => (me ? setPosting(true) : nav('/signup'))}><Plus size={16} />Post an Opportunity</Button>
      </div>
      {posting && <CampaignForm open onClose={() => setPosting(false)} onSaved={(id) => nav(`/workspace/campaigns/${id}`)} />}
    </main>
  );
}

function Shelf({ title, sub, items }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[18px] font-bold text-ink">{title}</h2>
          <p className="text-[12.5px] text-ink-muted">{sub} · {items.length}</p>
        </div>
        <div className="hidden sm:flex gap-1.5">
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="h-8 w-8 rounded-full border border-line-strong bg-white grid place-items-center hover:bg-canvas"><ChevronLeft size={16} /></button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="h-8 w-8 rounded-full border border-line-strong bg-white grid place-items-center hover:bg-canvas"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-2 snap-x">{items.map((c) => <OpportunityTile key={c.id} campaign={c} />)}</div>
    </section>
  );
}

// Hidden until Buzz has enough listings and creators (see Admin → Features).
function DailyPicks({ listings, me }) {
  const d = useDB();
  const nav = useNavigate();
  const status = dailyPicksStatus(d);
  if (!status.on || !me || listings.length < 3) return null;
  const picks = pickOfTheDay(listings, me.id);
  const days = me.visitDays || [];
  let streak = 0;
  for (let i = 0; ; i++) { const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); if (days.includes(day)) streak++; else break; }
  return (
    <section className="mt-10 rounded-3xl bg-brand-softer border border-[#F6DDB2] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[18px] font-bold flex items-center gap-2"><Sparkles size={18} className="text-brand-dark" />Today's 3 picks for you</h2>
          <p className="text-[12.5px] text-ink-muted">New picks every morning{streak > 1 && <> · <Flame size={12} className="inline text-brand-dark -mt-0.5" /> {streak}-day streak</>}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => nav(`/opportunity/${listings[Math.floor(Math.random() * listings.length)].id}`)}><Shuffle size={14} />Surprise me</Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">{picks.map((c) => <OpportunityTile key={c.id} campaign={c} />)}</div>
    </section>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-bold text-ink">{title}</h2>
          {hint && <p className="text-[12.5px] text-ink-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Results({ count, label, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-bold text-ink mb-4">{count} {label}</h2>
      {children}
    </section>
  );
}
