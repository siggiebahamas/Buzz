import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Bookmark, Send, Star, Users, Activity, MousePointerClick, ShoppingBag, ArrowLeft, ExternalLink, Store, BadgeCheck, Flag } from 'lucide-react';
import { useDB, userById, currentUser, actions, isSaved, ratingOf, followersOf, displayName, campaignById } from '../lib/store';
import { categoryById, PLATFORMS } from '../lib/constants';
import { compact, peso, timeAgo } from '../lib/format';
import { OpportunityCard } from '../components/visuals';
import { Avatar, Button, Card, Badge, Stars, EmptyState } from '../components/ui';
import { InviteModal, ReportModal } from '../components/forms';
import { useChat } from '../components/Shell';

export default function Profile() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const chat = useChat();
  const u = userById(d, id);
  const me = currentUser(d);
  const [inviting, setInviting] = useState(false);
  const [reporting, setReporting] = useState(false);
  useEffect(() => { actions.recordProfileView(id); }, [id]);
  if (!u) return <main className="p-10 text-center text-ink-muted">Profile not found.</main>;

  const isMe = me?.id === u.id;
  const rating = ratingOf(d, u.id);
  const reviews = d.reviews.filter((r) => r.toId === u.id);
  const listings = d.campaigns.filter((c) => c.ownerId === u.id && c.published && !c.removed);
  const need = (fn) => (me ? fn() : nav('/login'));

  // Results this creator drove through their tracking links on Buzz.
  const links = d.links.filter((l) => l.creatorId === u.id);
  const linkIds = new Set(links.map((l) => l.id));
  const ev = d.events.filter((e) => linkIds.has(e.linkId));
  const clicks = ev.filter((e) => e.t === 'click').reduce((a, e) => a + (e.n || 1), 0);
  const sales = ev.filter((e) => e.t === 'sale');
  const portfolio = d.deliverables.filter((x) => x.creatorId === u.id && x.stats && x.status === 'approved').sort((a, b) => b.stats.reach - a.stats.reach).slice(0, 6);
  const saved = me && isSaved(d, 'creator', u.id);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back</button>
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <Avatar user={u} size={88} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-bold text-ink">{u.name}</h1>
              {u.verified && <Badge tone="blue"><BadgeCheck size={12} />Verified</Badge>}
              {u.suspended && <Badge tone="red">Suspended</Badge>}
              {u.creator && <Badge tone="soft">Creator</Badge>}
              {u.business && <Badge tone="blue">Founder · {u.business.name}</Badge>}
            </div>
            {u.creator && <p className="text-ink-muted">@{u.creator.handle}</p>}
            <p className="text-[13.5px] text-ink-muted flex items-center gap-1 mt-1"><MapPin size={14} />{u.location || u.region}</p>
            <p className="text-[14.5px] text-ink-soft mt-3 max-w-2xl">{u.bio || 'No bio yet.'}</p>
            {rating.avg && <p className="mt-2 flex items-center gap-2 text-[13px]"><Stars value={rating.avg} /> <b>{rating.avg.toFixed(1)}</b> <span className="text-ink-muted">({rating.count} review{rating.count > 1 ? 's' : ''})</span></p>}
          </div>
          <div className="flex flex-row flex-wrap sm:flex-col gap-2 shrink-0">
            {isMe ? <Link to="/workspace/profile"><Button variant="outline">Edit profile</Button></Link> : (
              <>
                <Button onClick={() => need(() => chat.open(u.id))}><MessageCircle size={16} />Message</Button>
                {u.creator && <Button variant="outline" onClick={() => need(() => setInviting(true))}><Send size={15} />Invite to campaign</Button>}
                {u.creator && <Button variant="ghost" onClick={() => need(() => actions.toggleSave('creator', u.id))}><Bookmark size={15} className={saved ? 'fill-brand text-brand' : ''} />{saved ? 'Saved' : 'Save'}</Button>}
                <Button variant="ghost" size="sm" onClick={() => need(() => setReporting(true))}><Flag size={14} />Report</Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {u.creator && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Stat icon={Users} value={compact(followersOf(u))} label="Total followers" />
            <Stat icon={Activity} value={`${u.creator.engagement}%`} label="Avg. engagement" />
            <Stat icon={MousePointerClick} value={compact(clicks)} label="Clicks driven on Buzz" />
            <Stat icon={ShoppingBag} value={`${sales.length} · ${peso(sales.reduce((a, e) => a + e.amount, 0), { compact: true })}`} label="Sales driven on Buzz" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Card className="p-5">
              <p className="font-bold mb-3">Platforms</p>
              {u.creator.platforms.length === 0 && <p className="text-[13px] text-ink-muted">None added yet.</p>}
              {u.creator.platforms.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-[13.5px]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORMS[p.id].color }} />{PLATFORMS[p.id].label}</span>
                  <span className="text-[13.5px] font-semibold">{compact(p.followers)}</span>
                </div>
              ))}
            </Card>
            <Card className="p-5">
              <p className="font-bold mb-3">Rate card</p>
              {[['reel', 'Reel / TikTok'], ['post', 'Feed post'], ['story', 'Story set']].map(([k, l]) => (
                <div key={k} className="flex items-center justify-between py-1.5 text-[13.5px]"><span className="text-ink-soft">{l}</span><span className="font-semibold">{u.creator.rates?.[k] ? peso(u.creator.rates[k]) : '—'}</span></div>
              ))}
            </Card>
            <Card className="p-5">
              <p className="font-bold mb-3">Audience & niche</p>
              <p className="text-[13.5px] text-ink-soft">{u.creator.audience || '—'}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">{u.creator.niches.map((n) => <Badge key={n}>{categoryById(n).label}</Badge>)}</div>
            </Card>
          </div>
          <h2 className="text-[18px] font-bold mt-8 mb-3">Past campaign content</h2>
          {portfolio.length === 0 ? <Card><EmptyState title="No published campaign content yet" /></Card> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((x) => {
                const c = campaignById(d, x.campaignId);
                const eng = ((x.stats.likes + x.stats.comments + x.stats.shares + x.stats.saves) / Math.max(1, x.stats.reach)) * 100;
                return (
                  <Card key={x.id} className="p-4">
                    <p className="text-[12px] text-ink-muted">{PLATFORMS[x.platform]?.label} · {x.type}</p>
                    <p className="font-semibold text-[14px] mt-0.5">{c?.productName}</p>
                    <div className="flex gap-4 mt-2 text-[12.5px] text-ink-soft"><span>{compact(x.stats.reach)} reach</span><span>{eng.toFixed(1)}% eng.</span></div>
                    {x.contentUrl && <a href={x.contentUrl} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-dark inline-flex items-center gap-1 mt-2">View post <ExternalLink size={12} /></a>}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {u.business && (
        <>
          <h2 className="text-[18px] font-bold mt-8 mb-3 flex items-center gap-2"><Store size={18} className="text-brand-dark" />{u.business.name}: open opportunities</h2>
          {listings.length === 0 ? <Card><EmptyState title="No open opportunities right now" /></Card> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{listings.map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div>}
        </>
      )}

      <h2 className="text-[18px] font-bold mt-8 mb-3">Reviews</h2>
      {reviews.length === 0 ? <Card><EmptyState icon={Star} title="No reviews yet" body="Reviews appear after campaigns wrap up." /></Card> : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const from = userById(d, r.fromId);
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar user={from} size={34} />
                  <div className="flex-1"><p className="text-[13.5px] font-semibold">{displayName(from)}</p><p className="text-[12px] text-ink-muted">{campaignById(d, r.campaignId)?.productName} · {timeAgo(r.createdAt)}</p></div>
                  <Stars value={r.rating} />
                </div>
                <p className="text-[14px] text-ink-soft mt-3">{r.text}</p>
              </Card>
            );
          })}
        </div>
      )}
      {inviting && <InviteModal open onClose={() => setInviting(false)} creator={u} />}
      {reporting && <ReportModal kind="user" refId={u.id} onClose={() => setReporting(false)} />}
    </main>
  );
}

const Stat = ({ icon: Icon, value, label }) => (
  <Card className="p-5">
    <Icon size={18} className="text-brand-dark" />
    <p className="text-[22px] font-bold mt-2">{value}</p>
    <p className="text-[12.5px] text-ink-muted">{label}</p>
  </Card>
);
