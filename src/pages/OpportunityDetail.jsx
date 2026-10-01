import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, MessageCircle, Calendar, Users, FileText, MapPin, Target, CheckCircle2, Clock, Eye, Share2, Star, Flag, BadgeCheck, ShieldCheck } from 'lucide-react';
import { useDB, liveCampaigns, campaignById, userById, currentUser, applicantsCount, membersOf, isSaved, actions, brandName, ratingOf } from '../lib/store';
import { categoryById, PLATFORMS } from '../lib/constants';
import { shortDate, peso } from '../lib/format';
import { earnLabel, payBreakdown, giftLabel } from '../lib/pay';
import { matchScore } from '../lib/match';
import { ProductImage, OpportunityCard, FitChecks, ShareMenu } from '../components/visuals';
import { Button, Card, Badge, Avatar, cx, useToast, useCopy } from '../components/ui';
import { ApplyModal, ReportModal } from '../components/forms';
import { useChat } from '../components/Shell';
import { earlyLeft, inEarlyWindow, hoursLabel, applyAllowance, isCreatorPro } from '../lib/pro';
import { Crown } from 'lucide-react';

// Community reactions on posts about this listing.
const reactionTotalFor = (d, cid) => d.posts.filter((p) => p.campaignId === cid).reduce((a, p) => a + (p.likes?.length || 0) + (p.claps?.length || 0) + (p.ideas?.length || 0), 0);

export default function OpportunityDetail() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const toast = useToast();
  const copy = useCopy();
  const chat = useChat();
  const c = campaignById(d, id);
  const me = currentUser(d);
  const [photo, setPhoto] = useState(0);
  const [applying, setApplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  useEffect(() => { if (c) actions.viewCampaign(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || (c.removed && !me?.admin && me?.id !== c?.ownerId)) return <main className="max-w-3xl mx-auto p-10 text-center text-ink-muted">This opportunity no longer exists. <Link to="/opportunities" className="text-brand-dark">Browse others</Link></main>;

  const owner = userById(d, c.ownerId);
  const isOwner = me?.id === c.ownerId;
  const mine = d.applications.find((a) => a.campaignId === c.id && a.creatorId === me?.id && a.status !== 'withdrawn');
  const members = membersOf(d, c.id).map((m) => userById(d, m));
  const m = me?.creator && !isOwner ? matchScore(me, c, { d }) : null;
  const saved = me && isSaved(d, 'campaign', c.id);
  const rating = ratingOf(d, owner.id);
  const photos = c.photos?.length ? c.photos.length : (c.photoHints?.length || 1);
  const similar = liveCampaigns(d).filter((x) => x.id !== c.id && x.category === c.category && x.status !== 'completed').slice(0, 3);
  const estEarn = c.compensation === 'commission' || c.compensation === 'hybrid' ? Math.round((c.aov || 0) * c.commissionRate / 100) : 0;

  const early = !isOwner && earlyLeft(d, c, me);
  const allowance = me?.creator && !isOwner ? applyAllowance(d, me) : null;
  const need = (fn) => (me ? fn() : nav('/login', { state: { from: `/opportunity/${c.id}` } }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back</button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
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
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">What you'll earn</p>
            <p className="text-[22px] font-extrabold text-emerald-700 mt-0.5">{earnLabel(c)}</p>
            <div className="mt-3 rounded-xl border border-line divide-y divide-line">
              {payBreakdown(c).rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between px-3 py-2.5 text-[13.5px]">
                  <span><span className="text-ink font-medium">{r.label}</span> <span className="text-ink-muted text-[12px]">· {r.platform}</span></span>
                  <span className="font-semibold tabular-nums">{payBreakdown(c).cash ? (r.min === r.max ? peso(r.max) : `${peso(r.min)}–${peso(r.max)}`) : c.compensation === 'gifted' ? giftLabel(c) : '—'}</span>
                </div>
              ))}
              {['commission', 'hybrid'].includes(c.compensation) && (
                <div className="flex items-center justify-between px-3 py-2.5 text-[13.5px]">
                  <span className="text-ink font-medium">+ on every sale you drive</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{c.commissionRate}%{estEarn > 0 && <span className="text-ink-muted font-normal text-[12px]"> ≈ {peso(estEarn)}</span>}</span>
                </div>
              )}
            </div>
            {c.compensation === 'gifted' && (() => {
              const buzz = d.launches.filter((l) => l.campaignId === c.id).reduce((acc, l) => acc + l.votes.length, 0) + reactionTotalFor(d, c.id);
              const done = d.reviews.filter((r) => r.toId === c.ownerId).length;
              return (
                <div className="mt-3 rounded-xl bg-brand-softer border border-[#F6DDB2] p-3 text-[13px] space-y-1">
                  <p className="font-semibold">Why creators say yes</p>
                  {c.giftValue > 0 && <p>· You keep {giftLabel(c).toLowerCase().replace('free ', '')} worth <b>{peso(c.giftValue)}</b></p>}
                  {m && <p>· It's a <b>{m.label.toLowerCase()}</b> for your content</p>}
                  {buzz > 0 && <p>· <b>{buzz}</b> people on Buzz voted for or reacted to it</p>}
                  <p>· Finishing it adds a review to your profile{done ? `; this brand has ${done} creator review${done > 1 ? 's' : ''}` : ''}</p>
                </div>
              );
            })()}
            <p className="text-[11.5px] text-ink-muted mt-1.5">{payBreakdown(c).cash ? 'Suggested split of the brand\'s budget per creator. Final fee is agreed when you apply.' : c.compensation === 'gifted' ? 'No cash fee. You keep what you receive.' : `Based on an average order of ${peso(c.aov)}.`}</p>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Mini icon={Users} value={`${members.length}/${c.slots}`} label="Spots filled" />
              <Mini icon={FileText} value={applicantsCount(d, c.id)} label="Applied" />
              <Mini icon={Eye} value={c.views} label="Views" />
            </div>

            {m && (
              <div className="mt-4 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3.5">
                <p className="text-[14px] font-bold text-emerald-800 flex items-center gap-1.5"><Star size={14} className="fill-emerald-600 text-emerald-600" />{m.label} for you</p>
                <p className="text-[12px] text-ink-muted mb-2.5">Based on the brief, your profile, rates and results on Buzz</p>
                <FitChecks checks={m.checks} />
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
              ) : early ? (
                <div className="rounded-xl bg-brand-softer border border-[#F6DDB2] p-3 text-center">
                  <p className="font-bold flex items-center justify-center gap-1.5"><Crown size={15} className="text-brand-dark" />Creator Pro early access</p>
                  <p className="text-[13px] text-ink-soft mt-0.5">Opens to everyone in {hoursLabel(early)}. Pro creators can apply now.</p>
                  <Button className="w-full mt-2" onClick={() => need(() => nav(me.creator ? '/workspace/pro' : '/pricing'))}>Get Creator Pro</Button>
                </div>
              ) : (
                <>
                  {inEarlyWindow(d, c) && isCreatorPro(d, me) && <p className="text-[12.5px] text-center text-brand-dark font-medium flex items-center justify-center gap-1"><Crown size={13} />Early access: you're seeing this before free creators</p>}
                  <Button size="lg" className="w-full" disabled={allowance?.left === 0} onClick={() => need(() => (me.creator ? setApplying(true) : toast('Add a creator profile in My Profile to apply.', 'err')))}>Apply to collaborate</Button>
                  {allowance && <p className="text-[12px] text-center text-ink-muted">{allowance.left > 0 ? `${allowance.left} of ${allowance.cap} free applications left this month.` : `You've used your ${allowance.cap} free applications this month.`} <Link to="/workspace/pro" className="text-brand-dark">Creator Pro has no limit</Link></p>}
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => need(() => actions.toggleSave('campaign', c.id))}><Bookmark size={15} className={saved ? 'fill-brand text-brand' : ''} />{saved ? 'Saved' : 'Save'}</Button>
                {!isOwner ? <Button variant="outline" onClick={() => need(() => chat.open(owner.id, c.id))}><MessageCircle size={15} />Ask</Button> : <span />}
                <ShareMenu path={`/opportunity/${c.id}`} text={`${c.title} on Buzz: ${earnLabel(c)}.`} />
              </div>
              <p className="text-[12px] text-ink-muted text-center flex items-center justify-center gap-1"><Clock size={12} />Posted {shortDate(c.createdAt)}{!isOwner && <> · <button onClick={() => need(() => setReporting(true))} className="inline-flex items-center gap-1 hover:text-ink"><Flag size={12} />Report</button></>}</p>
              {['flat', 'hybrid'].includes(c.compensation) && <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-lg p-2 flex gap-1.5"><ShieldCheck size={14} className="shrink-0 mt-px" />Fees are paid through Buzz escrow and released when your content is approved.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-3">About the brand</p>
            <Link to={`/profile/${owner.id}`} className="flex items-center gap-3">
              <Avatar user={owner} size={44} />
              <div>
                <p className="font-bold text-ink hover:underline inline-flex items-center gap-1">{brandName(owner)}{owner.verified && <BadgeCheck size={15} className="text-sky-600" />}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{similar.map((x) => <OpportunityCard key={x.id} campaign={x} />)}</div>
        </section>
      )}
      {applying && <ApplyModal open onClose={() => setApplying(false)} campaign={c} />}
      {reporting && <ReportModal kind="campaign" refId={c.id} onClose={() => setReporting(false)} />}
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
