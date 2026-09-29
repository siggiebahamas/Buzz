import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, Bookmark, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { useDB, currentUser, applicantsCount, creators, followersOf, liveCampaigns } from '../lib/store';
import { BUDGET_BUCKETS, COMP_TYPES, PLATFORMS, REGIONS, categoryById } from '../lib/constants';
import { matchScore } from '../lib/match';
import { CategoryRow, OpportunityCard, OpportunityRow, CreatorCard, CreatorRow } from '../components/visuals';
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
  const [platform, setPlatform] = useState('all');
  const [region, setRegion] = useState('all');
  const [sort, setSort] = useState('match');
  const [posting, setPosting] = useState(false);
  const myCampaigns = d.campaigns.filter((c) => c.ownerId === me?.id);
  const [forCid, setForCid] = useState(myCampaigns.find((c) => c.status !== 'completed')?.id || '');
  const forCampaign = myCampaigns.find((c) => c.id === forCid) || null;
  const filtered = q || cat !== 'all' || budget !== 'any' || comp !== 'all' || platform !== 'all' || region !== 'all';
  const reset = () => { setQ(''); setCat('all'); setBudget('any'); setComp('all'); setPlatform('all'); setRegion('all'); };

  const listings = useMemo(() => {
    const needle = q.toLowerCase();
    let arr = liveCampaigns(d).filter((c) => c.status !== 'completed' && c.ownerId !== me?.id)
      .filter((c) => cat === 'all' || c.category === cat)
      .filter((c) => comp === 'all' || c.compensation === comp)
      .filter((c) => region === 'all' || c.region === region)
      .filter((c) => platform === 'all' || c.platforms.includes(platform))
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
  }, [d, q, cat, comp, region, platform, budget, sort, me]);

  const people = useMemo(() => {
    const needle = q.toLowerCase();
    let arr = creators(d).filter((u) => u.id !== me?.id)
      .filter((u) => cat === 'all' || u.creator.niches.includes(cat))
      .filter((u) => platform === 'all' || u.creator.platforms.some((p) => p.id === platform))
      .filter((u) => region === 'all' || u.region === region)
      .filter((u) => inBudget(budget, u.creator.rates?.reel || 0, u.creator.rates?.reel || 0))
      .filter((u) => !needle || `${u.name} ${u.creator.handle} ${u.bio} ${u.creator.niches.map((n) => categoryById(n).label).join(' ')}`.toLowerCase().includes(needle))
      .map((u) => ({ u, m: forCampaign ? matchScore(u, forCampaign).score : 0 }));
    const by = {
      match: (a, b) => b.m - a.m || b.u.creator.engagement - a.u.creator.engagement,
      newest: (a, b) => b.u.joinedAt - a.u.joinedAt,
      budget: (a, b) => (a.u.creator.rates?.reel || 0) - (b.u.creator.rates?.reel || 0),
      popular: (a, b) => followersOf(b.u) - followersOf(a.u),
    }[sort];
    return arr.sort(by).map((x) => x.u);
  }, [d, q, cat, platform, region, budget, sort, forCampaign, me]);

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
        <PillMenu label="Platform" value={platform} onChange={setPlatform} options={[{ id: 'all', label: 'Any platform' }, ...Object.entries(PLATFORMS).map(([id, p]) => ({ id, label: p.label }))]} />
        <PillMenu label="Location" value={region} onChange={setRegion} options={[{ id: 'all', label: 'Anywhere' }, ...REGIONS.map((r) => ({ id: r, label: r }))]} />
        <PillMenu label="Sort" value={sort} onChange={setSort} options={[
          { id: 'match', label: 'Sort: Best match' }, { id: 'newest', label: 'Sort: Newest' },
          { id: 'budget', label: isCreatorView ? 'Sort: Highest budget' : 'Sort: Lowest rate' }, { id: 'popular', label: isCreatorView ? 'Sort: Most applied' : 'Sort: Most followers' },
        ]} />
      </div>
      <div className="mt-5"><CategoryRow value={cat} onChange={setCat} /></div>

      {isCreatorView ? (
        filtered ? (
          <Results count={listings.length} label="opportunities">
            {listings.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{listings.map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>
              : <EmptyState title="No opportunities match these filters" body="Try another category or clear the filters." action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />}
          </Results>
        ) : (
          <>
            <Section title={me?.creator ? 'Recommended For You' : 'Fresh Opportunities'} hint={me?.creator ? 'Ranked by how well each brief fits your niche, platforms, rate and location. Hover a match % to see why.' : 'Sign up as a creator to see your match score.'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{listings.slice(0, 6).map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>
            </Section>
            <Section title="Trending Opportunities">
              <div className="space-y-3">{[...listings].sort((a, b) => applicantsCount(d, b.id) - applicantsCount(d, a.id)).slice(0, 5).map((c) => <OpportunityRow key={c.id} campaign={c} />)}</div>
            </Section>
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
              <span className="text-[12.5px] text-ink-muted">Scores use the campaign's niche, platforms, budget and region.</span>
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
