import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Wallet, FileText, Zap, Pencil, ExternalLink, Check, X, MessageCircle, Copy, Star, Trash2, Send, TrendingUp, ShoppingBag } from 'lucide-react';
import { useDB, campaignById, userById, currentUser, actions, creators, followersOf, reactionTotal } from '../../lib/store';
import { CAMPAIGN_STAGES, COMP_TYPES, PLATFORMS, categoryById } from '../../lib/constants';
import { peso, compact, budgetLabel, shortDate, timeAgo } from '../../lib/format';
import { matchScore, rankCreators } from '../../lib/match';
import { businessMetrics, getRange } from '../../lib/metrics';
import { ProductImage, MatchPill } from '../../components/visuals';
import { Card, Button, Badge, Avatar, IconTile, EmptyState, cx, useAct, useConfirm, useCopy } from '../../components/ui';
import { CampaignForm, InviteModal, ReviewModal } from '../../components/forms';
import { useChat } from '../../components/Shell';
import { STATUS_TONE } from './shared';
import { Truck, FileSignature, Sparkles as SparkIcon } from 'lucide-react';
import { Modal, Field, Input, Select, Textarea } from '../../components/ui';
import { trackingUrl } from './Campaigns';
import { isOn, setting, isBrandPro, freeFeaturedLeft } from '../../lib/monetize';
import { Megaphone } from 'lucide-react';

export default function CampaignManage() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const copy = useCopy();
  const chat = useChat();
  const me = currentUser(d);
  const c = campaignById(d, id);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [showMatch, setShowMatch] = useState(true);
  if (!c) return <Navigate to="/workspace/campaigns" replace />;
  if (c.ownerId !== me.id) return <Navigate to={`/opportunity/${c.id}`} replace />;

  const all = getRange('custom', { from: '2000-01-01', to: new Date().toISOString().slice(0, 10) });
  const bm = businessMetrics(d, me.id, all);
  const row = bm.perCampaign.find((r) => r.campaign.id === c.id);
  const apps = d.applications.filter((a) => a.campaignId === c.id);
  const accepted = apps.filter((a) => a.status === 'accepted');
  const pending = apps.filter((a) => a.status === 'pending')
    .sort((a, b) => matchScore(userById(d, b.creatorId), c, { brand: true, d }).score - matchScore(userById(d, a.creatorId), c, { brand: true, d }).score);
  const invited = apps.filter((a) => a.status === 'invited');
  const suggestions = rankCreators(d, c).slice(0, 8);
  const stageIdx = CAMPAIGN_STAGES.findIndex((s) => s.id === c.status);
  const reviewed = (toId) => d.reviews.some((r) => r.campaignId === c.id && r.fromId === me.id && r.toId === toId);

  return (
    <>
      <Link to="/workspace/campaigns" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back to My Shop</Link>
      <Card className="p-5 flex flex-col md:flex-row gap-5">
        <ProductImage campaign={c} className="h-40 md:h-36 w-full md:w-48 shrink-0" rounded="rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><h1 className="text-[22px] sm:text-[24px] font-bold">{c.productName}</h1><Badge tone={STATUS_TONE[c.status]} className="capitalize">{c.status}</Badge></div>
              <p className="text-[13.5px] text-ink-muted">{c.title}</p>
              <p className="text-[12.5px] text-ink-muted mt-1">{categoryById(c.category).label} · {COMP_TYPES[c.compensation]} · {budgetLabel(c)} · Posted {shortDate(c.createdAt)} · {c.views} views</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil size={14} />Edit</Button>
              <Link to={`/opportunity/${c.id}`}><Button variant="outline" size="sm"><ExternalLink size={14} />View listing</Button></Link>
              <Button variant="ghost" size="sm" onClick={async () => { if (await ask({ title: 'Delete this campaign?', body: 'Its listing, applications and posts are removed. Money held safely by Buzz is refunded to you.', confirm: 'Delete', danger: true })) { actions.deleteCampaign(c.id); nav('/workspace/campaigns'); } }}><Trash2 size={14} /></Button>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Status</p>
            <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
        <Stat icon={Users} v={`${accepted.length}/${c.slots}`} l="Creators" />
        <Stat icon={Wallet} v={peso(row?.allTimeSpend || 0)} l="Spent so far" />
        <Stat icon={ShoppingBag} v={`${row?.orders || 0}`} l="Orders" />
        <Stat icon={TrendingUp} v={peso(row?.revenue || 0, { compact: true })} l="Sales" />
        <Stat icon={FileText} v={row?.roas != null ? `${row.roas.toFixed(1)}×` : '—'} l="Return on spend" />
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[17px]">Creators on this product</h2>
          <span className="text-[12.5px] text-ink-muted">Each creator has their own promo code and tracking link</span>
        </div>
        {accepted.length === 0 ? <EmptyState title="No creators yet" body="Accept applications below or invite creators from the suggestions." /> : (
          <div className="overflow-x-auto"><table className="w-full text-[13.5px] min-w-[640px]">
            <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line">
              <th className="py-2 font-medium">Creator</th><th className="font-medium">Code / link</th><th className="font-medium text-right">Posts</th><th className="font-medium text-right">Clicks</th><th className="font-medium text-right">Orders</th><th className="font-medium text-right">Sales</th><th className="font-medium text-right">Cost</th><th />
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
                      <button onClick={() => copy(r.link.code, 'Code copied')} className="h-7 px-2 rounded-lg bg-brand-soft font-mono text-[11.5px] font-semibold inline-flex items-center gap-1">{r.link.code}<Copy size={11} /></button>
                      <button onClick={() => copy(trackingUrl(r.link.code), 'Tracking link copied')} className="h-7 px-2 rounded-lg border border-line text-[11.5px]">Link</button>
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
          </table></div>
        )}
        <p className="text-[12px] text-ink-muted mt-3">Manage content and payments in <Link to="/workspace/collabs" className="text-brand-dark">Creators</Link>. Log promo-code sales in <Link to="/workspace/results" className="text-brand-dark">Results</Link>.</p>
      </Card>

      <CampaignOps c={c} accepted={accepted} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h2 className="font-bold text-[17px] mb-3">Applications {pending.length > 0 && <span className="text-brand-dark">({pending.length})</span>}</h2>
          {pending.length === 0 && invited.length === 0 && <p className="text-[13px] text-ink-muted">No pending applications.</p>}
          <div className="space-y-3">
            {pending.map((a) => {
              const u = userById(d, a.creatorId);
              const m = matchScore(u, c, { brand: true, d });
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
                      <Button size="sm" onClick={() => act(() => actions.decide(a.id, 'accepted'), `${u.name} added. Their posts and promo code are ready.`)}><Check size={14} />Accept</Button>
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
            <Button size="sm" onClick={() => setShowMatch(!showMatch)}><Zap size={14} />{showMatch ? 'Hide' : 'Show matches'}</Button>
          </div>
          {!showMatch ? <p className="text-[13px] text-ink-muted">Auto-Match ranks every creator on Buzz by how close their content is to your brief, whether their usual rate fits your budget, who their audience is, your platforms, engagement for their size, their sales record on Buzz, and location.</p> : (
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
        <h2 className="font-bold text-[17px] mb-2">Brief</h2>
        <p className="text-[14px] text-ink-soft whitespace-pre-line">{c.description}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-[13px]">
          <div><p className="text-ink-muted text-[12px]">Target audience</p><p>{c.audience || '—'}</p></div>
          <div><p className="text-ink-muted text-[12px]">Posts per creator</p><p>{c.deliverables.map((x) => `${x.qty}× ${x.type}`).join(', ')}</p></div>
          <div><p className="text-ink-muted text-[12px]">Content rights</p><p>{c.contentRights}</p></div>
          <div><p className="text-ink-muted text-[12px]">Community validation</p><p>{d.posts.filter((p) => p.campaignId === c.id).reduce((a, p) => a + reactionTotal(p) + p.interested.length, 0)} reactions on {d.posts.filter((p) => p.campaignId === c.id).length} posts</p></div>
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

const COURIERS = ['J&T Express', 'LBC', 'Lalamove', 'Grab Express', 'Ninja Van', 'Flash Express', '2GO', 'Other'];

// Agreements, samples to ship and hand-picked creator requests for one campaign.
function CampaignOps({ c, accepted }) {
  const d = useDB();
  const act = useAct();
  const [ship, setShip] = useState(null);
  const [handpick, setHandpick] = useState(false);
  const [note, setNote] = useState('');
  const contracts = d.contracts.filter((k) => k.campaignId === c.id);
  const unsigned = contracts.filter((k) => !k.brandSignedAt || !k.creatorSignedAt);
  const shipments = d.shipments.filter((x) => x.campaignId === c.id);
  const request = d.concierge.find((x) => x.campaignId === c.id);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <Card className="p-5">
        <p className="font-bold flex items-center gap-2"><FileSignature size={16} className="text-brand-dark" />Agreements</p>
        {contracts.length === 0 ? <p className="text-[13px] text-ink-muted mt-2">Created automatically when you accept a creator.</p> : (
          <>
            <p className="text-[13px] text-ink-soft mt-2">{contracts.length - unsigned.length} of {contracts.length} signed by both sides</p>
            {unsigned.length > 0 && <Link to="/workspace/contracts" className="inline-block mt-3"><Button size="sm">Review & sign</Button></Link>}
          </>
        )}
      </Card>
      <Card className="p-5">
        <p className="font-bold flex items-center gap-2"><Truck size={16} className="text-brand-dark" />Samples to ship</p>
        {!c.needsShipping ? <p className="text-[13px] text-ink-muted mt-2">This campaign doesn't ship a product.</p> : shipments.length === 0 ? <p className="text-[13px] text-ink-muted mt-2">Accepted creators appear here with their address.</p> : (
          <div className="mt-2 space-y-2">
            {shipments.map((x) => {
              const u = userById(d, x.creatorId);
              return (
                <div key={x.id} className="flex items-center gap-2 text-[13px]">
                  <Avatar user={u} size={24} /><span className="flex-1 truncate">{u.name}</span>
                  {x.status === 'to_ship' ? <Button size="sm" className="h-7 text-[12px]" onClick={() => setShip(x)}>Ship</Button>
                    : <Badge tone={x.status === 'delivered' ? 'green' : 'blue'}>{x.status === 'delivered' ? 'Received' : `Shipped · ${x.courier}`}</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card className="p-5 bg-brand-softer border-[#F6DDB2]">
        <p className="font-bold flex items-center gap-2"><SparkIcon size={16} className="text-brand-dark" />Hand-picked by Buzz</p>
        {request ? (
          <p className="text-[13px] mt-2">{request.status === 'open' ? 'Our team is picking creators for you. We usually reply within one working day.' : `We picked ${request.picks.length} creators and sent them invites.`}</p>
        ) : (
          <>
            <p className="text-[13px] text-ink-soft mt-2">Not sure who to pick? Our team reviews the matches, checks each creator and invites the best ones for you.</p>
            <Button size="sm" className="mt-3" onClick={() => setHandpick(true)}>Ask Buzz to pick</Button>
          </>
        )}
      </Card>
      {isOn(d, 'featuredListings') && c.published && <FeatureCard c={c} />}
      {ship && <ShipModal x={ship} onClose={() => setShip(null)} />}
      {handpick && (
        <Modal open onClose={() => setHandpick(false)} title="Ask Buzz to hand-pick creators" subtitle={c.productName}>
          <Field label="Anything we should know?"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We want creators who cook at home, not restaurant reviewers. Budget is firm." /></Field>
          <p className="text-[12.5px] text-ink-muted mt-2">{isOn(d, 'paidHandpick') ? (isBrandPro(d, currentUser(d)) ? 'Included in your plan.' : `${peso(setting(d, 'paidHandpick', 'price'))} per campaign. Test mode: no card is charged.`) : isOn(d, 'plans') ? 'Free plan: 1 request. Pro: unlimited.' : 'Free while Buzz is new.'}</p>
          <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.requestConcierge(c.id, note), 'Request sent. We\'ll invite creators for you.')) setHandpick(false); }}>Send request</Button>
        </Modal>
      )}
    </div>
  );
}

export function ShipModal({ x, onClose }) {
  const d = useDB();
  const act = useAct();
  const u = userById(d, x.creatorId);
  const [f, setF] = useState({ courier: COURIERS[0], tracking: '' });
  const a = u.shipping;
  return (
    <Modal open onClose={onClose} title={`Ship to ${u.name}`}>
      <div className="rounded-xl bg-canvas p-3 text-[13.5px]">
        {a?.address ? <><p className="font-semibold">{a.name} · {a.phone}</p><p className="text-ink-soft">{a.address}, {a.city}</p></> : <p className="text-ink-muted">{u.name} hasn't added a shipping address yet. Message them for it.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <Field label="Courier"><Select value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Tracking number"><Input value={f.tracking} onChange={(e) => setF({ ...f, tracking: e.target.value })} /></Field>
      </div>
      <Button size="lg" className="w-full mt-4" disabled={!f.tracking.trim()} onClick={() => { if (act(() => actions.updateShipment(x.id, { ...f, tracking: f.tracking.trim(), status: 'shipped' }), 'Marked as shipped. The creator was notified.')) onClose(); }}><Truck size={16} />Mark as shipped</Button>
      <p className="text-[12px] text-ink-muted mt-3 text-center">Shipping often? <Link to="/workspace/toolkit" className="underline underline-offset-2 hover:text-ink">See fulfillment partners</Link></p>
    </Modal>
  );
}

// Paid, clearly labelled placement at the top of Opportunities. Brand Pro includes free weeks.
function FeatureCard({ c }) {
  const d = useDB();
  const act = useAct();
  const ask = useConfirm();
  const me = currentUser(d);
  const featured = c.featuredUntil > Date.now();
  const week = setting(d, 'featuredListings', 'weekPrice');
  const free = freeFeaturedLeft(d, me);
  const cost = (w) => week * Math.max(0, w - free);
  return (
    <Card className="p-5 lg:col-span-3 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold flex items-center gap-2"><Megaphone size={16} className="text-brand-dark" />Feature this listing{featured && <Badge tone="green">Featured until {shortDate(c.featuredUntil)}</Badge>}</p>
        <p className="text-[13px] text-ink-soft mt-1">Pinned at the top of Opportunities and Discover with a "Featured" label, so more creators see it. Their fit score stays honest.{free ? ` You have ${free} free week${free > 1 ? 's' : ''} this month with Brand Pro.` : isOn(d, 'plans') && me.plan !== 'pro' ? ' Brand Pro includes a free week every month.' : ''}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 4].map((w) => (
          <Button key={w} size="sm" variant={w === 1 ? 'primary' : 'outline'} onClick={async () => {
            if (await ask({ title: `Feature for ${w} week${w > 1 ? 's' : ''}?`, body: cost(w) ? `${peso(cost(w))}${w > Math.min(w, free) && free ? ` (${free} week free with Brand Pro)` : ''}. Test mode: no card is charged.` : 'Free with your Brand Pro plan.', confirm: 'Feature it' })) act(() => actions.buyFeature(c.id, w), 'Your listing is featured');
          }}>{featured ? 'Add ' : ''}{w} wk · {cost(w) ? peso(cost(w)) : 'Free'}</Button>
        ))}
      </div>
    </Card>
  );
}
