import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Wallet, FileText, Zap, Pencil, ExternalLink, Check, X, MessageCircle, Copy, Star, Trash2, Send, TrendingUp, ShoppingBag } from 'lucide-react';
import { useDB, campaignById, userById, currentUser, actions, creators, followersOf } from '../../lib/store';
import { CAMPAIGN_STAGES, COMP_TYPES, PLATFORMS, categoryById } from '../../lib/constants';
import { peso, compact, budgetLabel, shortDate, timeAgo } from '../../lib/format';
import { matchScore } from '../../lib/match';
import { businessMetrics, getRange } from '../../lib/metrics';
import { ProductImage, MatchPill } from '../../components/visuals';
import { Card, Button, Badge, Avatar, IconTile, EmptyState, cx, useAct, useToast } from '../../components/ui';
import { CampaignForm, InviteModal, ReviewModal } from '../../components/forms';
import { useChat } from '../../components/Shell';
import { STATUS_TONE } from './shared';
import { trackingUrl } from './Campaigns';

export default function CampaignManage() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const toast = useToast();
  const chat = useChat();
  const me = currentUser(d);
  const c = campaignById(d, id);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [showMatch, setShowMatch] = useState(false);
  if (!c) return <Navigate to="/workspace/campaigns" replace />;
  if (c.ownerId !== me.id) return <Navigate to={`/opportunity/${c.id}`} replace />;

  const all = getRange('custom', { from: '2000-01-01', to: new Date().toISOString().slice(0, 10) });
  const bm = businessMetrics(d, me.id, all);
  const row = bm.perCampaign.find((r) => r.campaign.id === c.id);
  const apps = d.applications.filter((a) => a.campaignId === c.id);
  const accepted = apps.filter((a) => a.status === 'accepted');
  const pending = apps.filter((a) => a.status === 'pending');
  const invited = apps.filter((a) => a.status === 'invited');
  const involved = new Set(apps.filter((a) => a.status !== 'withdrawn' && a.status !== 'declined').map((a) => a.creatorId));
  const suggestions = creators(d).filter((u) => u.id !== me.id && !involved.has(u.id))
    .map((u) => ({ u, m: matchScore(u, c) })).sort((a, b) => b.m.score - a.m.score).slice(0, 6);
  const stageIdx = CAMPAIGN_STAGES.findIndex((s) => s.id === c.status);
  const reviewed = (toId) => d.reviews.some((r) => r.campaignId === c.id && r.fromId === me.id && r.toId === toId);

  return (
    <>
      <Link to="/workspace/campaigns" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back to Campaigns</Link>
      <Card className="p-5 flex gap-5">
        <ProductImage campaign={c} className="h-36 w-48 shrink-0" rounded="rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><h1 className="text-[24px] font-bold">{c.productName}</h1><Badge tone={STATUS_TONE[c.status]} className="capitalize">{c.status}</Badge></div>
              <p className="text-[13.5px] text-ink-muted">{c.title}</p>
              <p className="text-[12.5px] text-ink-muted mt-1">{categoryById(c.category).label} · {COMP_TYPES[c.compensation]} · {budgetLabel(c)} · Posted {shortDate(c.createdAt)} · {c.views} views</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil size={14} />Edit</Button>
              <Link to={`/opportunity/${c.id}`}><Button variant="outline" size="sm"><ExternalLink size={14} />View listing</Button></Link>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this campaign and its applications?')) { actions.deleteCampaign(c.id); nav('/workspace/campaigns'); } }}><Trash2 size={14} /></Button>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Campaign status</p>
            <div className="flex items-center gap-2">
              {CAMPAIGN_STAGES.map((s, i) => (
                <button key={s.id} onClick={() => act(() => actions.setCampaignStatus(c.id, s.id), `Moved to ${s.label}`)}
                  className={cx('h-8 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors', i === stageIdx ? 'bg-brand text-white border-brand' : i < stageIdx ? 'bg-brand-soft border-[#F6DDB2] text-brand-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>
                  {i < stageIdx && <Check size={12} className="inline mr-1 -mt-0.5" />}{s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-5 gap-4 mt-4">
        <Stat icon={Users} v={`${accepted.length}/${c.slots}`} l="Creators" />
        <Stat icon={Wallet} v={peso(row?.allTimeSpend || 0)} l="Spent so far" />
        <Stat icon={ShoppingBag} v={`${row?.orders || 0}`} l="Orders" />
        <Stat icon={TrendingUp} v={peso(row?.revenue || 0, { compact: true })} l="Sales" />
        <Stat icon={FileText} v={row?.roas != null ? `${row.roas.toFixed(1)}×` : '—'} l="Return on spend" />
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[17px]">Creators on this campaign</h2>
          <span className="text-[12.5px] text-ink-muted">Each creator has their own promo code and tracking link</span>
        </div>
        {accepted.length === 0 ? <EmptyState title="No creators yet" body="Accept applications below or invite creators from the suggestions." /> : (
          <table className="w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line">
              <th className="py-2 font-medium">Creator</th><th className="font-medium">Code / link</th><th className="font-medium text-right">Deliverables</th><th className="font-medium text-right">Clicks</th><th className="font-medium text-right">Orders</th><th className="font-medium text-right">Sales</th><th className="font-medium text-right">Cost</th><th />
            </tr></thead>
            <tbody>
              {accepted.map((a) => {
                const u = userById(d, a.creatorId);
                const r = bm.perCreator.find((p) => p.link.campaignId === c.id && p.link.creatorId === u.id);
                const dels = d.deliverables.filter((x) => x.campaignId === c.id && x.creatorId === u.id);
                const done = dels.filter((x) => x.status === 'approved').length;
                return (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="py-3"><Link to={`/profile/${u.id}`} className="flex items-center gap-2.5 hover:underline"><Avatar user={u} size={32} /><span><span className="block font-medium">{u.name}</span><span className="text-[12px] text-ink-muted">@{u.creator.handle}</span></span></Link></td>
                    <td>{r && <span className="flex gap-1.5">
                      <button onClick={() => { navigator.clipboard?.writeText(r.link.code); toast('Code copied'); }} className="h-7 px-2 rounded-lg bg-brand-soft font-mono text-[11.5px] font-semibold inline-flex items-center gap-1">{r.link.code}<Copy size={11} /></button>
                      <button onClick={() => { navigator.clipboard?.writeText(trackingUrl(r.link.code)); toast('Tracking link copied'); }} className="h-7 px-2 rounded-lg border border-line text-[11.5px]">Link</button>
                    </span>}</td>
                    <td className="text-right">{done}/{dels.length}</td>
                    <td className="text-right">{compact(r?.clicks || 0)}</td>
                    <td className="text-right">{r?.orders || 0}</td>
                    <td className="text-right font-semibold">{peso(r?.revenue || 0)}</td>
                    <td className="text-right">{peso(r?.spend || 0)}</td>
                    <td className="text-right pl-3 whitespace-nowrap">
                      <button onClick={() => chat.open(u.id, c.id)} className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft" title="Message"><MessageCircle size={16} /></button>
                      {!reviewed(u.id) && ['tracking', 'completed'].includes(c.status) && <button onClick={() => setReviewing(u)} className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft" title="Leave review"><Star size={16} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-[12px] text-ink-muted mt-3">Manage content and payments in <Link to="/workspace/deliverables" className="text-brand-dark">Deliverables</Link>. Log promo-code sales in <Link to="/workspace/analytics" className="text-brand-dark">Analytics</Link>.</p>
      </Card>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h2 className="font-bold text-[17px] mb-3">Applications {pending.length > 0 && <span className="text-brand-dark">({pending.length})</span>}</h2>
          {pending.length === 0 && invited.length === 0 && <p className="text-[13px] text-ink-muted">No pending applications.</p>}
          <div className="space-y-3">
            {pending.map((a) => {
              const u = userById(d, a.creatorId);
              const m = matchScore(u, c);
              return (
                <div key={a.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar user={u} size={36} />
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${u.id}`} className="font-semibold text-[14px] hover:underline">{u.name}</Link>
                      <p className="text-[12px] text-ink-muted">{compact(followersOf(u))} followers · {u.creator.engagement}% eng. · {timeAgo(a.createdAt)}</p>
                    </div>
                    <MatchPill {...m} />
                  </div>
                  <p className="text-[13px] text-ink-soft mt-2">"{a.pitch}"</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[13px]">{a.rate ? <>Asks <b>{peso(a.rate)}</b></> : 'No fee requested'}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => act(() => actions.decide(a.id, 'declined'), 'Application declined')}><X size={14} />Decline</Button>
                      <Button size="sm" onClick={() => act(() => actions.decide(a.id, 'accepted'), `${u.name} added. Deliverables and promo code created.`)}><Check size={14} />Accept</Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {invited.map((a) => {
              const u = userById(d, a.creatorId);
              return (
                <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-canvas p-3">
                  <Avatar user={u} size={30} /><span className="text-[13px] flex-1">{u.name}</span><Badge tone="violet">Invited · waiting</Badge>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[17px]">Suggested creators</h2>
            <Button size="sm" onClick={() => setShowMatch(!showMatch)}><Zap size={14} />{showMatch ? 'Hide' : 'Auto-Match'}</Button>
          </div>
          {!showMatch ? <p className="text-[13px] text-ink-muted">Auto-Match ranks every creator on Buzz by niche, platforms, rate vs. your budget, location and engagement.</p> : (
            <div className="space-y-2">
              {suggestions.map(({ u, m }) => (
                <div key={u.id} className="flex items-center gap-2.5 rounded-xl border border-line p-2.5">
                  <Avatar user={u} size={34} />
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${u.id}`} className="text-[13.5px] font-semibold hover:underline">{u.name}</Link>
                    <p className="text-[12px] text-ink-muted truncate">{u.creator.platforms.map((p) => PLATFORMS[p.id].short).join(' · ')} · {compact(followersOf(u))} · ₱{(u.creator.rates?.reel || 0).toLocaleString()}/reel</p>
                  </div>
                  <MatchPill {...m} />
                  <Button size="sm" variant="soft" onClick={() => setInviting(u)}><Send size={13} />Invite</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="font-bold text-[17px] mb-2">Campaign brief</h2>
        <p className="text-[14px] text-ink-soft whitespace-pre-line">{c.description}</p>
        <div className="grid grid-cols-4 gap-4 mt-4 text-[13px]">
          <div><p className="text-ink-muted text-[12px]">Target audience</p><p>{c.audience || '—'}</p></div>
          <div><p className="text-ink-muted text-[12px]">Deliverables per creator</p><p>{c.deliverables.map((x) => `${x.qty}× ${x.type}`).join(', ')}</p></div>
          <div><p className="text-ink-muted text-[12px]">Content rights</p><p>{c.contentRights}</p></div>
          <div><p className="text-ink-muted text-[12px]">Community validation</p><p>{d.posts.filter((p) => p.campaignId === c.id).reduce((a, p) => a + p.likes.length + p.interested.length, 0)} reactions on {d.posts.filter((p) => p.campaignId === c.id).length} posts</p></div>
        </div>
      </Card>

      {editing && <CampaignForm open initial={c} onClose={() => setEditing(false)} />}
      {inviting && <InviteModal open creator={inviting} campaignId={c.id} onClose={() => setInviting(null)} />}
      {reviewing && <ReviewModal open campaignId={c.id} toUser={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}

const Stat = ({ icon, v, l }) => (
  <Card className="p-4 flex items-center gap-3"><IconTile icon={icon} /><div><p className="text-[18px] font-bold leading-tight">{v}</p><p className="text-[12px] text-ink-muted">{l}</p></div></Card>
);
