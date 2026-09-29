import { Link, useNavigate } from 'react-router-dom';
import { Search, Handshake, BarChart3, Trophy, ArrowRight, ChevronRight, Flame, Sparkles, Star, Heart, MessageCircle } from 'lucide-react';
import { useDB, applicantsCount, userById, displayName, creators, actions, liveCampaigns } from '../lib/store';
import { OpportunityCard, CreatorCard } from '../components/visuals';
import { Button, Avatar, SectionHead } from '../components/ui';
import { timeAgo } from '../lib/format';

const STEPS = [
  { icon: Search, title: 'Find Your Match', body: 'Creators browse products by photo. Founders browse creators by audience and results.' },
  { icon: Handshake, title: 'Review & Connect', body: 'Apply or invite, agree on fee and deliverables, and chat in one place.' },
  { icon: BarChart3, title: 'Manage Campaigns', body: 'Every creator gets tasks, due dates, a tracking link and a promo code.' },
  { icon: Trophy, title: 'Measure Results', body: 'See clicks, sales and return on spend per creator, not just likes.' },
];

export default function Discover() {
  const d = useDB();
  const nav = useNavigate();
  const listed = liveCampaigns(d).filter((c) => c.status !== 'completed');
  const trending = [...listed].sort((a, b) => (b.featured ? 1e6 : 0) + applicantsCount(d, b.id) * 50 + b.views - ((a.featured ? 1e6 : 0) + applicantsCount(d, a.id) * 50 + a.views)).slice(0, 6);
  const wins = d.posts.filter((p) => p.topic === 'wins').slice(0, 3);
  const featured = [...creators(d)].filter((u) => u.id !== d.session.userId).sort((a, b) => b.creator.engagement - a.creator.engagement).slice(0, 4);
  const stats = [
    [creators(d).length, 'creators'],
    [d.users.filter((u) => u.business).length, 'local brands'],
    [d.campaigns.length, 'campaigns'],
  ];

  return (
    <main>
      <section className="bg-gradient-to-b from-[#FBF4E8] to-canvas">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-14 sm:pb-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-line px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft shadow-card">
            <Sparkles size={14} className="text-brand-dark" /> Where creators & founders grow together
          </span>
          <h1 className="mt-6 text-[38px] sm:text-[56px] leading-[1.05] font-extrabold tracking-tight text-ink" style={{ textWrap: 'balance' }}>
            Turn ideas into businesses.<br /><span className="text-brand">Grow together.</span>
          </h1>
          <p className="mt-5 text-[17px] text-ink-muted max-w-2xl mx-auto">
            Buzz connects Filipino founders with creators who already have the audience, so a great product never launches to an empty room.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => { if (d.session.userId) actions.setMode('creator'); nav('/opportunities?as=creator'); }}>Find Opportunities as Influencer <ArrowRight size={17} /></Button>
            <Button size="lg" variant="outline" onClick={() => nav('/opportunities?as=business')}>Find Influencers as Business Owner</Button>
            <Button size="lg" variant="outline" onClick={() => nav('/community')}>Join the Community</Button>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-[30px] font-bold text-ink">How Buzz Works</h2>
          <p className="text-ink-muted mt-1">Four simple steps from discovery to results</p>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-soft border border-[#F9DDB0] grid place-items-center text-brand-dark"><s.icon size={24} strokeWidth={1.7} /></div>
                {i < 3 && <ChevronRight size={18} className="hidden lg:block absolute top-[18px] -right-5 text-line-strong" />}
                <p className="mt-4 text-[11.5px] font-semibold tracking-wider text-brand-dark">STEP {i + 1}</p>
                <p className="mt-1 font-bold text-ink">{s.title}</p>
                <p className="mt-1.5 text-[13px] text-ink-muted leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead title="Trending Opportunities" icon={Flame} sub="Local brands actively looking for creators right now"
          action={<Link to="/opportunities" className="text-[13.5px] font-medium text-brand-dark inline-flex items-center gap-1">View all <ChevronRight size={15} /></Link>} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{trending.map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <SectionHead title="Creators on Buzz" icon={Star} sub="Highest engagement this month"
          action={<Link to="/opportunities?as=business" className="text-[13.5px] font-medium text-brand-dark inline-flex items-center gap-1">View all <ChevronRight size={15} /></Link>} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{featured.map((u) => <CreatorCard key={u.id} user={u} />)}</div>
      </section>

      <section className="bg-white border-y border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <SectionHead title="Recent Wins" icon={Trophy} sub="Real results shared by the Buzz community"
            action={<Link to="/community?topic=wins" className="text-[13.5px] font-medium text-brand-dark inline-flex items-center gap-1">View all <ChevronRight size={15} /></Link>} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wins.map((p) => {
              const a = userById(d, p.authorId);
              return (
                <Link key={p.id} to={`/community/${p.id}`} className="rounded-2xl border border-line bg-canvas/60 p-5 hover:shadow-lift transition-shadow flex flex-col">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar user={a} size={32} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{displayName(a)}</p>
                      <p className="text-[11.5px] text-ink-muted">{timeAgo(p.createdAt)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-ink leading-snug">{p.title}</p>
                  <p className="text-[13px] text-ink-muted mt-1.5 line-clamp-3">{p.body}</p>
                  <div className="mt-auto pt-4 flex gap-4 text-[12.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1"><Heart size={14} />{p.likes.length}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle size={14} />{p.comments.length}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F6EBD7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="flex justify-center gap-1 text-brand mb-3">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={20} className="fill-brand" />)}</div>
          <h2 className="text-[26px] font-bold text-ink">Join {stats.map(([n, l]) => `${n} ${l}`).join(', ')}</h2>
          <p className="text-ink-muted mt-1">Building real businesses, together. No fluff, just growth.</p>
          {!d.session.userId && <Link to="/signup"><Button size="lg" className="mt-6">Create your free account</Button></Link>}
        </div>
      </section>
    </main>
  );
}
