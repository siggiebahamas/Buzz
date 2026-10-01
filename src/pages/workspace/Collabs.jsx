import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, MessageCircle, Handshake, FileSignature, Truck, Flag, Star, Search, Send } from 'lucide-react';
import { useDB, userById, campaignById, brandName, actions, followersOf } from '../../lib/store';
import { rankCreators, profileCampaign } from '../../lib/match';
import { PLATFORMS } from '../../lib/constants';
import { peso, timeAgo, shortDate, compact } from '../../lib/format';
import { ProductImage, MatchPill } from '../../components/visuals';
import { Card, Button, Badge, Avatar, Select, Input, EmptyState, useAct, useConfirm, cx } from '../../components/ui';
import { InviteModal, ReviewModal } from '../../components/forms';
import { useChat } from '../../components/Shell';
import { useMode, ModeToggle, PageHead } from './Layout';
import { PostActions, PostModals, postStatus } from './Deliverables';
import { stageOf } from '../../lib/collabs';
import { ShipModal } from './CampaignManage';

// One card per creator-and-product: the application, the agreement, the sample,
// every post and its payment, in the order they happen.
export default function Collabs() {
  const d = useDB();
  const { mode, me } = useMode();
  const biz = mode === 'business';
  const [params, setParams] = useSearchParams();
  const view = biz && params.get('view') === 'find' ? 'find' : 'mine';
  return (
    <>
      <PageHead title={biz ? 'Creators' : 'My collabs'} sub={biz ? 'The creators posting about your products, and new ones who fit' : 'Brands you work with: what to post, when, and what you get paid'}
        action={<><ModeToggle />{!biz && <Link to="/opportunities?as=creator"><Button><Search size={15} />Find opportunities</Button></Link>}</>} />
      {biz && (
        <div className="flex gap-2 mb-5">
          {[['mine', 'Your creators'], ['find', 'Find creators']].map(([id, label]) => (
            <button key={id} onClick={() => setParams(id === 'find' ? { view: 'find' } : {})} className={cx('h-9 px-4 rounded-full text-[13.5px] border', view === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>{label}</button>
          ))}
        </div>
      )}
      {view === 'find' ? <FindCreators me={me} /> : <Deals d={d} me={me} biz={biz} />}
    </>
  );
}

function Deals({ d, me, biz }) {
  const [tab, setTab] = useState('needs');
  const [cid, setCid] = useState('all');
  const [modal, setModal] = useState(null);
  const mine = (biz ? d.applications.filter((a) => campaignById(d, a.campaignId)?.ownerId === me.id) : d.applications.filter((a) => a.creatorId === me.id))
    .filter((a) => cid === 'all' || a.campaignId === cid);
  const stages = [['needs', 'Needs you'], ['progress', 'In progress'], ['done', 'Finished'], ['closed', 'Closed']];
  const byStage = Object.fromEntries(stages.map(([s]) => [s, mine.filter((a) => stageOf(d, a, biz) === s).sort((x, y) => y.createdAt - x.createdAt)]));
  const products = [...new Set((biz ? d.campaigns.filter((c) => c.ownerId === me.id) : mine.map((a) => campaignById(d, a.campaignId))).filter(Boolean).map((c) => c.id))].map((id) => campaignById(d, id));
  const list = byStage[tab];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {stages.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cx('h-9 px-4 rounded-full text-[13.5px] border inline-flex items-center gap-2 whitespace-nowrap', tab === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>
            {label}<span className={cx('text-[11.5px] px-1.5 rounded-full', tab === id ? 'bg-white/20' : id === 'needs' && byStage.needs.length ? 'bg-brand text-white' : 'bg-canvas')}>{byStage[id].length}</span>
          </button>
        ))}
        {products.length > 1 && <div className="w-full sm:w-60 sm:ml-auto"><Select value={cid} onChange={(e) => setCid(e.target.value)}><option value="all">All products</option>{products.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></div>}
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon={Handshake} title={tab === 'needs' ? 'Nothing needs you right now' : 'Nothing here yet'} body={biz ? 'When creators apply or post, it shows up here.' : 'Apply to opportunities and your collabs show up here.'}
          action={biz ? <Link to="/workspace/collabs?view=find"><Button variant="outline">Find creators</Button></Link> : <Link to="/opportunities?as=creator"><Button variant="outline">Find opportunities</Button></Link>} /></Card>
      ) : <div className="space-y-4">{list.map((a) => <DealCard key={a.id} a={a} biz={biz} setModal={setModal} />)}</div>}
      <PostModals modal={modal} setModal={setModal} />
      {modal?.kind === 'ship' && <ShipModal x={modal.x} onClose={() => setModal(null)} />}
      {modal?.kind === 'review' && <ReviewModal open campaignId={modal.campaignId} toUser={modal.toUser} onClose={() => setModal(null)} />}
    </>
  );
}

function DealCard({ a, biz, setModal }) {
  const d = useDB();
  const act = useAct();
  const ask = useConfirm();
  const chat = useChat();
  const c = campaignById(d, a.campaignId);
  const creator = userById(d, a.creatorId);
  const owner = userById(d, c.ownerId);
  const other = biz ? creator : owner;
  const posts = d.deliverables.filter((x) => x.campaignId === c.id && x.creatorId === a.creatorId).sort((x, y) => x.dueAt - y.dueAt);
  const k = d.contracts.find((x) => x.applicationId === a.id);
  const sh = d.shipments.find((x) => x.campaignId === c.id && x.creatorId === a.creatorId);
  const link = d.links.find((l) => l.campaignId === c.id && l.creatorId === a.creatorId);
  const reviewed = d.reviews.some((r) => r.campaignId === c.id && r.fromId === (biz ? owner.id : creator.id) && r.toId === other.id);
  const stage = stageOf(d, a, biz);
  const head = {
    pending: biz ? ['Applied: your answer needed', 'soft'] : ['Waiting for the brand', 'soft'],
    invited: biz ? ['You invited them', 'violet'] : ['Invited you: your answer needed', 'violet'],
    accepted: stage === 'done' ? ['Finished', 'green'] : ['Working together', 'blue'],
    declined: ['Declined', 'neutral'], withdrawn: ['Withdrawn', 'neutral'],
  }[a.status];
  const terms = `${c.deliverables.map((x) => `${x.qty}× ${x.type}`).join(', ')}${a.rate ? ` for ${peso(a.rate)}` : c.compensation === 'gifted' ? ' in exchange for the product' : ''}. Content rights: ${c.contentRights}. Disclose it as #ad or gifted.`;
  const accept = async () => {
    if (await ask({ title: biz ? `Work with ${creator.name}?` : `Accept ${brandName(owner)}'s invite?`, body: `By accepting, you both agree to: ${terms} We'll email you both a copy.`, confirm: 'Accept' })) {
      act(() => actions.decide(a.id, 'accepted'), biz ? `${creator.name} is on board` : 'You\'re in! Your posts are listed below.');
    }
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Link to={`/profile/${other.id}`}><Avatar user={other} size={44} /></Link>
        <div className="flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/profile/${other.id}`} className="font-bold hover:underline">{biz ? other.name : brandName(other)}</Link>
            <Badge tone={head[1]}>{head[0]}</Badge>
          </div>
          <p className="text-[13px] text-ink-muted flex items-center gap-1.5 mt-0.5">
            <span className="h-5 w-5 rounded overflow-hidden inline-block"><ProductImage campaign={c} mini className="h-5 w-5" /></span>
            <Link to={biz ? `/workspace/campaigns/${c.id}` : `/opportunity/${c.id}`} className="hover:underline">{c.productName}</Link>
            {biz && creator.creator && <span>· {compact(followersOf(creator))} followers</span>}
            <span>· {timeAgo(a.createdAt)}</span>
          </p>
          {a.pitch && ['pending', 'invited'].includes(a.status) && <p className="text-[13.5px] text-ink-soft mt-2">"{a.pitch}"</p>}
          {['pending', 'invited'].includes(a.status) && <p className="text-[12.5px] text-ink-muted mt-1">{a.rate ? `Asks ${peso(a.rate)}` : c.compensation === 'gifted' ? 'Product for content' : 'Commission on sales'}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => chat.open(other.id, c.id)} aria-label="Message"><MessageCircle size={15} /></Button>
          {((biz && a.status === 'pending') || (!biz && a.status === 'invited')) && (
            <>
              <Button size="sm" variant="outline" onClick={() => act(() => actions.decide(a.id, 'declined'), 'Declined')}><X size={14} />Decline</Button>
              <Button size="sm" onClick={accept}><Check size={14} />Accept</Button>
            </>
          )}
          {!biz && a.status === 'pending' && <Button size="sm" variant="outline" onClick={() => act(() => actions.decide(a.id, 'withdrawn'), 'Application withdrawn')}>Withdraw</Button>}
        </div>
      </div>

      {a.status === 'accepted' && (
        <>
          <div className="flex flex-wrap gap-2 mt-3 text-[12.5px]">
            {k && <Link to="/workspace/contracts"><Badge tone="green"><FileSignature size={11} />Agreement signed {shortDate(k.creatorSignedAt || k.createdAt)}</Badge></Link>}
            {sh && <Badge tone={sh.status === 'delivered' ? 'green' : sh.status === 'shipped' ? 'blue' : 'soft'}><Truck size={11} />{sh.status === 'delivered' ? 'Product received' : sh.status === 'shipped' ? `On the way: ${sh.courier} ${sh.tracking}` : biz ? 'Product not sent yet' : 'Waiting for the product'}</Badge>}
            {sh?.status === 'to_ship' && biz && <Button size="sm" className="h-6 text-[12px]" onClick={() => setModal({ kind: 'ship', x: sh })}><Send size={12} />Send product</Button>}
            {sh?.status === 'shipped' && !biz && <button onClick={() => actions.updateShipment(sh.id, { status: 'delivered' })} className="text-[12px] font-medium text-brand-dark">I got it</button>}
            {biz && link && <span className="text-ink-muted">Promo code <b className="text-ink font-mono">{link.code}</b></span>}
          </div>
          {!biz && <AffiliateLink link={link} />}
          <div className="mt-3 rounded-xl border border-line divide-y divide-line">
            {posts.length === 0 && <p className="p-3 text-[13px] text-ink-muted">No posts yet.</p>}
            {posts.map((x) => {
              const [label, tone] = postStatus(x, c, biz);
              return (
                <div key={x.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: PLATFORMS[x.platform]?.color }} />
                    <span className="font-semibold">{x.type}</span>
                    <span className="text-ink-muted">on {PLATFORMS[x.platform]?.label} · {x.status === 'approved' ? `approved ${shortDate(x.approvedAt)}` : `due ${shortDate(x.dueAt)}`}</span>
                    <Badge tone={tone}>{label}</Badge>
                    <span className="ml-auto font-semibold">{x.fee ? peso(x.fee) : c.compensation === 'gifted' ? 'Product' : 'Commission'}</span>
                  </div>
                  {x.status === 'revision' && x.note && <p className="text-[12.5px] bg-rose-50 text-rose-700 rounded-lg p-2 mt-2">"{x.note}"</p>}
                  {x.stats && <p className="text-[12px] text-ink-muted mt-1">{compact(x.stats.reach)} views · {compact(x.stats.likes)} likes</p>}
                  <PostActions x={x} c={c} biz={biz} setModal={setModal} />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {stage === 'done' && !reviewed && <Button size="sm" variant="outline" onClick={() => setModal({ kind: 'review', campaignId: c.id, toUser: other })}><Star size={14} />Leave a review</Button>}
            <button onClick={() => setModal({ kind: 'dispute', campaignId: c.id, x: posts.find((x) => !x.frozen && x.status !== 'approved') || posts[0], against: other.id })} className="text-[12.5px] text-ink-muted hover:text-rose-600 inline-flex items-center gap-1 ml-auto"><Flag size={13} />Report a problem</button>
          </div>
        </>
      )}
    </Card>
  );
}

function FindCreators({ me }) {
  const d = useDB();
  const products = d.campaigns.filter((c) => c.ownerId === me.id && !c.removed && c.status !== 'completed');
  const [cid, setCid] = useState(products[0]?.id || '');
  const [inviting, setInviting] = useState(null);
  const target = products.find((c) => c.id === cid) || (me.business ? profileCampaign(me) : null);
  const list = target ? rankCreators(d, target).slice(0, 12) : [];
  const busy = new Set(d.applications.filter((a) => a.campaignId === cid && !['declined', 'withdrawn'].includes(a.status)).map((a) => a.creatorId));
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-2xl bg-white border border-line p-3 pl-4">
        <span className="text-[13.5px] text-ink-soft">Best creators for</span>
        {products.length ? <div className="w-full sm:w-72"><Select value={cid} onChange={(e) => setCid(e.target.value)}>{products.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></div> : <span className="text-[13.5px] font-medium">your business profile</span>}
        <span className="text-[12.5px] text-ink-muted">Ranked by content fit, budget, audience and results. Hover a fit label to see why.</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {list.map(({ u, m }) => (
          <Card key={u.id} className="p-3 flex items-center gap-3">
            <Link to={`/profile/${u.id}`}><Avatar user={u} size={44} /></Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${u.id}`} className="font-semibold hover:underline">{u.name}</Link>
              <p className="text-[12.5px] text-ink-muted truncate">{compact(followersOf(u))} followers · {u.creator.engagement}% engagement · {peso(u.creator.rates?.reel || 0)}/reel</p>
            </div>
            <MatchPill {...m} />
            {busy.has(u.id) ? <Badge>Invited</Badge> : <Button size="sm" disabled={!products.length} onClick={() => setInviting(u)}>Invite</Button>}
          </Card>
        ))}
      </div>
      {!products.length && <p className="text-[13px] text-ink-muted mt-3">Add a product in <Link to="/workspace/shop" className="text-brand-dark">My Shop</Link> to invite creators.</p>}
      {inviting && <InviteModal open creator={inviting} campaignId={cid} onClose={() => setInviting(null)} />}
    </>
  );
}

// Creators who sell through TikTok Shop's affiliate program can point their Buzz link there.
export function AffiliateLink({ link }) {
  const act = useAct();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(link?.affiliateUrl || '');
  if (!link) return null;
  if (!open) {
    return (
      <p className="text-[12px] text-ink-muted mt-2">
        Your link: <span className="font-mono text-ink">buzz/go/{link.code}</span>{link.affiliateUrl ? ' → your TikTok Shop affiliate link' : ''} · <button onClick={() => setOpen(true)} className="text-brand-dark font-medium">{link.affiliateUrl ? 'Change' : 'Use my TikTok Shop affiliate link'}</button>
      </p>
    );
  }
  return (
    <div className="mt-2 flex gap-2">
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Your TikTok Shop affiliate product link" className="!h-8 !text-[12.5px]" />
      <Button size="sm" onClick={() => { if (act(() => actions.setAffiliateUrl(link.id, url), url ? 'Saved. Your Buzz link now sends buyers to your affiliate link.' : 'Removed')) setOpen(false); }}>Save</Button>
    </div>
  );
}
