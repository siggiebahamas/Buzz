import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, MessageCircle, Calendar, Users, FileText, MapPin, Target, CheckCircle2, Clock, Eye, Share2, Star } from 'lucide-react';
import { useDB, campaignById, userById, currentUser, applicantsCount, membersOf, isSaved, actions, brandName, ratingOf } from '../lib/store';
import { categoryById, COMP_TYPES, PLATFORMS } from '../lib/constants';
import { budgetLabel, shortDate, peso } from '../lib/format';
import { matchScore } from '../lib/match';
import { ProductImage, OpportunityCard } from '../components/visuals';
import { Button, Card, Badge, Avatar, cx, useToast } from '../components/ui';
import { ApplyModal } from '../components/forms';
import { useChat } from '../components/Shell';

export default function OpportunityDetail() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const toast = useToast();
  const chat = useChat();
  const c = campaignById(d, id);
  const me = currentUser(d);
  const [photo, setPhoto] = useState(0);
  const [applying, setApplying] = useState(false);
  useEffect(() => { if (c) actions.viewCampaign(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <main className="max-w-3xl mx-auto p-10 text-center text-ink-muted">This opportunity no longer exists. <Link to="/opportunities" className="text-brand-dark">Browse others</Link></main>;

  const owner = userById(d, c.ownerId);
  const isOwner = me?.id === c.ownerId;
  const mine = d.applications.find((a) => a.campaignId === c.id && a.creatorId === me?.id && a.status !== 'withdrawn');
  const members = membersOf(d, c.id).map((m) => userById(d, m));
  const m = me?.creator && !isOwner ? matchScore(me, c) : null;
  const saved = me && isSaved(d, 'campaign', c.id);
  const rating = ratingOf(d, owner.id);
  const photos = c.photos?.length ? c.photos.length : (c.photoHints?.length || 1);
  const similar = d.campaigns.filter((x) => x.id !== c.id && x.published && x.category === c.category && x.status !== 'completed').slice(0, 3);
  const estEarn = c.compensation === 'commission' || c.compensation === 'hybrid' ? Math.round((c.aov || 0) * c.commissionRate / 100) : 0;

  const need = (fn) => (me ? fn() : nav('/login', { state: { from: `/opportunity/${c.id}` } }));

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back</button>
      <div className="grid grid-cols-[1fr_360px] gap-8">
        <div>
          <ProductImage key={photo} campaign={c} index={photo} className="aspect-[16/10] border border-line" rounded="rounded-2xl" showNav />
          {photos > 1 && (
            <div className="flex gap-2.5 mt-3">
              {Array.from({ length: photos }).map((_, i) => (
                <button key={i} onClick={() => setPhoto(i)} className={cx('rounded-xl overflow-hidden border-2', i === photo ? 'border-brand' : 'border-transparent')}>
                  <ProductImage campaign={{ ...c, photos: c.photos?.length ? [c.photos[i]] : [] }} className="h-16 w-24" rounded="rounded-lg" mini />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge tone="soft">{c.type}</Badge>
            <Badge>{categoryById(c.category).label}</Badge>
            <Badge tone={c.status === 'recruiting' ? 'green' : 'neutral'}>{c.status === 'recruiting' ? 'Recruiting' : c.status === 'active' ? 'Active · still accepting' : c.status}</Badge>
          </div>
          <h1 className="mt-3 text-[28px] font-bold leading-tight text-ink">{c.title}</h1>
          <p className="text-[13.5px] text-ink-muted mt-1">{c.productName} by <Link to={`/profile/${owner.id}`} className="text-ink font-medium hover:underline">{brandName(owner)}</Link> · {owner.location}</p>

          <Card className="mt-6 p-6">
            <h2 className="font-bold text-ink mb-2">The brief</h2>
            <p className="text-[14.5px] text-ink-soft leading-relaxed whitespace-pre-line">{c.description}</p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Fact icon={Target} label="Target audience" value={c.audience || '—'} />
              <Fact icon={MapPin} label="Brand location" value={`${owner.location} · ${c.region}`} />
              <Fact icon={Calendar} label="Apply by" value={shortDate(c.deadline)} />
              <Fact icon={FileText} label="Content rights" value={c.contentRights === 'None' ? 'Creator keeps all rights' : `Brand can repost for ${c.contentRights}`} />
            </div>
          </Card>

          <Card className="mt-4 p-6">
            <h2 className="font-bold text-ink mb-3">What you'll create</h2>
            <div className="space-y-2">
              {c.deliverables.map((x, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3">
                  <CheckCircle2 size={17} className="text-brand-dark" />
                  <span className="text-[14px] text-ink font-medium">{x.qty}× {x.type}</span>
                  <span className="ml-auto text-[12.5px] text-ink-muted">{PLATFORMS[x.platform]?.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[12.5px] text-ink-muted mt-3">Accepted creators get a personal tracking link and promo code, so sales they drive are credited to them.</p>
          </Card>

          {members.length > 0 && (
            <Card className="mt-4 p-6">
              <h2 className="font-bold text-ink mb-3">Creators on this campaign</h2>
              <div className="flex flex-wrap gap-3">
                {members.map((u) => (
                  <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-2 rounded-full border border-line pl-1 pr-3 py-1 hover:bg-canvas">
                    <Avatar user={u} size={28} /><span className="text-[13px]">{u.name}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5 sticky top-24">
            <p className="text-[12px] text-ink-muted">{COMP_TYPES[c.compensation]}{['flat', 'hybrid'].includes(c.compensation) ? ' per creator' : ''}</p>
            <p className="text-[26px] font-extrabold text-brand-dark">{budgetLabel(c)}</p>
            {estEarn > 0 && <p className="text-[12.5px] text-ink-muted">≈ {peso(estEarn)} earned per sale (avg. order {peso(c.aov)})</p>}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Mini icon={Users} value={`${members.length}/${c.slots}`} label="Spots filled" />
              <Mini icon={FileText} value={applicantsCount(d, c.id)} label="Applied" />
              <Mini icon={Eye} value={c.views} label="Views" />
            </div>

            {m && (
              <div className="mt-4 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
                <p className="text-[13px] font-bold text-emerald-700 flex items-center gap-1.5"><Star size={14} className="fill-emerald-600 text-emerald-600" />{m.score}% match for you</p>
                <div className="mt-2 space-y-1">
                  {m.parts.map((p) => (
                    <div key={p.label} className="flex justify-between text-[12px]"><span className="text-ink-soft">{p.note}</span><span className="font-medium">{p.pts}/{p.max}</span></div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {isOwner ? (
                <Link to={`/workspace/campaigns/${c.id}`}><Button size="lg" className="w-full">Manage campaign</Button></Link>
              ) : mine ? (
                <div className="rounded-xl bg-canvas p-3 text-center">
                  <p className="text-[13px] text-ink-muted">Your application</p>
                  <p className="font-bold capitalize">{mine.status === 'invited' ? 'Invited: respond in Collaborations' : mine.status}</p>
                  <Link to="/workspace/collaborations" className="text-[12.5px] text-brand-dark">View in workspace</Link>
                </div>
              ) : c.status === 'completed' ? (
                <Button size="lg" className="w-full" disabled>Campaign completed</Button>
              ) : (
                <Button size="lg" className="w-full" onClick={() => need(() => (me.creator ? setApplying(true) : toast('Add a creator profile in My Profile to apply.', 'err')))}>Apply to collaborate</Button>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => need(() => actions.toggleSave('campaign', c.id))}><Bookmark size={15} className={saved ? 'fill-brand text-brand' : ''} />{saved ? 'Saved' : 'Save'}</Button>
                {!isOwner ? <Button variant="outline" onClick={() => need(() => chat.open(owner.id, c.id))}><MessageCircle size={15} />Ask</Button> : <span />}
                <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied'); }}><Share2 size={15} />Share</Button>
              </div>
              <p className="text-[12px] text-ink-muted text-center flex items-center justify-center gap-1"><Clock size={12} />Posted {shortDate(c.createdAt)}</p>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-3">About the brand</p>
            <Link to={`/profile/${owner.id}`} className="flex items-center gap-3">
              <Avatar user={owner} size={44} />
              <div>
                <p className="font-bold text-ink hover:underline">{brandName(owner)}</p>
                <p className="text-[12.5px] text-ink-muted">{owner.name} · {owner.business?.type}</p>
              </div>
            </Link>
            <p className="text-[13px] text-ink-soft mt-3">{owner.bio}</p>
            {rating.avg && <p className="text-[12.5px] mt-2 flex items-center gap-1"><Star size={13} className="fill-brand text-brand" /><b>{rating.avg.toFixed(1)}</b> <span className="text-ink-muted">from {rating.count} creator review{rating.count > 1 ? 's' : ''}</span></p>}
          </Card>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="text-[20px] font-bold mb-4">More in {categoryById(c.category).label}</h2>
          <div className="grid grid-cols-3 gap-5">{similar.map((x) => <OpportunityCard key={x.id} campaign={x} />)}</div>
        </section>
      )}
      {applying && <ApplyModal open onClose={() => setApplying(false)} campaign={c} />}
    </main>
  );
}

const Fact = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3">
    <Icon size={17} className="text-brand-dark mt-0.5 shrink-0" />
    <div><p className="text-[12px] text-ink-muted">{label}</p><p className="text-[13.5px] text-ink font-medium">{value}</p></div>
  </div>
);

const Mini = ({ icon: Icon, value, label }) => (
  <div className="rounded-xl bg-canvas py-2.5">
    <Icon size={15} className="mx-auto text-ink-muted" />
    <p className="text-[15px] font-bold mt-0.5">{value}</p>
    <p className="text-[11px] text-ink-muted">{label}</p>
  </div>
);
