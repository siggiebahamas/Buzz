import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Check, X, ExternalLink, Link2, ShieldCheck } from 'lucide-react';
import { useDB, userById, brandName, actions, followersOf } from '../../lib/store';
import { shareOf, groupStatusLabel, growUnlocked } from '../../lib/grow';
import { GrowLocked } from './Swaps';
import { brandFeeRate } from '../../lib/monetize';
import { rankCreators, profileCampaign } from '../../lib/match';
import { CATEGORIES, PLATFORMS } from '../../lib/constants';
import { peso, timeAgo, compact } from '../../lib/format';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Select, Textarea, EmptyState, useAct, useConfirm, cx } from '../../components/ui';
import { MatchPill } from '../../components/visuals';
import { useMode, ModeToggle, PageHead } from './Layout';

const TONE = { forming: 'soft', invited: 'violet', active: 'blue', posted: 'blue', done: 'green', cancelled: 'neutral' };

// The creator search a group deal uses: a pretend listing at the full fee the creator receives.
const pseudo = (me, g) => ({ ...profileCampaign(me), id: `group_${g.category}`, category: g.category, budgetMin: g.fee, budgetMax: g.fee, platforms: [g.platform], deliverables: [{ type: g.platform === 'tiktok' ? 'TikTok video' : 'Reel', qty: 1, platform: g.platform }] });

export default function GroupDeals() {
  const d = useDB();
  const act = useAct();
  const { mode, me } = useMode();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [repick, setRepick] = useState(null);
  if (mode === 'creator') return <CreatorSide />;
  if (me.business && !growUnlocked(d, me)) return <GrowLocked />;
  if (!me.business) return <><PageHead title="Group deals" /><Card><EmptyState icon={Users} title="For business owners" body="Add a business profile in My Profile to use this." /></Card></>;
  const mine = d.groupDeals.filter((g) => g.members.some((m) => m.brandId === me.id) && g.status !== 'cancelled');
  const open = d.groupDeals.filter((g) => g.status === 'forming' && !g.members.some((m) => m.brandId === me.id) && g.members.length < g.slots);

  return (
    <>
      <PageHead title="Group deals" sub="Split one creator's fee with other small brands. Everyone gets featured in the same post for a fraction of the price." action={<><ModeToggle /><Button onClick={() => setCreating(true)}><Plus size={15} />Start a group deal</Button></>} />
      <section>
        <p className="font-bold mb-2">Open to join ({open.length})</p>
        {open.length === 0 ? <Card><EmptyState icon={Users} title="No open group deals right now" body="Start one and invite brands that fit." /></Card> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{open.map((g) => <DealCard key={g.id} g={g} me={me} onJoin={() => setJoining(g)} />)}</div>
        )}
      </section>
      <section className="mt-8">
        <p className="font-bold mb-2">Your group deals ({mine.length})</p>
        {mine.length === 0 ? <Card><EmptyState icon={Users} title="You haven't joined any yet" /></Card> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{mine.map((g) => <DealCard key={g.id} g={g} me={me} act={act} onRepick={() => setRepick(g)} />)}</div>
        )}
      </section>
      <p className="text-[12.5px] text-ink-muted mt-6 flex gap-1.5"><ShieldCheck size={15} className="text-emerald-600 shrink-0" />Each brand's share is held safely by Buzz. The creator is paid only after every brand confirms the post went up. If the deal never fills, everyone is refunded.</p>
      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {joining && <JoinModal g={joining} onClose={() => setJoining(null)} />}
      {repick && <PickCreatorModal g={repick} onClose={() => setRepick(null)} />}
    </>
  );
}

function DealCard({ g, me, act, onJoin, onRepick }) {
  const d = useDB();
  const ask = useConfirm();
  const creator = g.creatorId && userById(d, g.creatorId);
  const isMember = g.members.some((m) => m.brandId === me.id);
  const lead = g.leadId === me.id;
  const confirmed = g.confirmed.includes(me.id);
  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div><p className="font-bold">{g.title}</p><p className="text-[12.5px] text-ink-muted">Started by {brandName(userById(d, g.leadId))} · {timeAgo(g.createdAt)}</p></div>
        <Badge tone={TONE[g.status]}>{groupStatusLabel[g.status]}</Badge>
      </div>
      {g.brief && <p className="text-[13px] text-ink-soft mt-2">{g.brief}</p>}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-xl bg-canvas p-2"><p className="text-[11px] text-ink-muted">Creator fee</p><p className="font-bold text-[14px]">{peso(g.fee)}</p></div>
        <div className="rounded-xl bg-canvas p-2"><p className="text-[11px] text-ink-muted">Your share</p><p className="font-bold text-[14px] text-emerald-700">{peso(shareOf(g))}</p></div>
        <div className="rounded-xl bg-canvas p-2"><p className="text-[11px] text-ink-muted">Brands</p><p className="font-bold text-[14px]">{g.members.length}/{g.slots}</p></div>
      </div>
      <div className="mt-3 space-y-1.5 text-[13px]">
        {creator ? <p className="flex items-center gap-2"><Avatar user={creator} size={22} /><Link to={`/profile/${creator.id}`} className="font-medium hover:underline">{creator.name}</Link><span className="text-ink-muted">· {PLATFORMS[g.platform]?.label} · {compact(followersOf(creator))} followers</span></p>
          : <p className="text-rose-700">The creator passed. {lead ? 'Pick another one.' : 'Waiting for the lead brand to pick another.'}</p>}
        {g.members.map((m) => <p key={m.brandId} className="flex items-center gap-2 text-ink-soft"><Avatar user={userById(d, m.brandId)} size={20} />{brandName(userById(d, m.brandId))} <span className="text-ink-muted">· {m.product}</span>{g.confirmed.includes(m.brandId) && <Check size={13} className="text-emerald-600" />}</p>)}
        {Array.from({ length: Math.max(0, g.slots - g.members.length) }).map((_, i) => <p key={i} className="text-ink-faint pl-7">Open spot</p>)}
      </div>
      {g.postUrl && <a href={g.postUrl} target="_blank" rel="noreferrer" className="text-[13px] text-brand-dark inline-flex items-center gap-1 mt-2">See the post <ExternalLink size={12} /></a>}
      <div className="flex flex-wrap gap-2 mt-auto pt-3">
        {onJoin && <Button size="sm" onClick={onJoin}><Plus size={14} />Join for {peso(shareOf(g))}</Button>}
        {isMember && g.status === 'posted' && !confirmed && <Button size="sm" onClick={() => act(() => actions.confirmGroupDeal(g.id), 'Confirmed. Thanks!')}><Check size={14} />Confirm it's posted</Button>}
        {isMember && lead && !g.creatorId && <Button size="sm" onClick={onRepick}>Pick another creator</Button>}
        {isMember && ['forming', 'invited'].includes(g.status) && <Button size="sm" variant="ghost" onClick={async () => { if (await ask({ title: lead ? 'Cancel this group deal?' : 'Leave this group deal?', body: lead ? 'Every brand gets a full refund.' : 'Your share is refunded.', confirm: lead ? 'Cancel deal' : 'Leave', danger: true })) act(() => actions.leaveGroupDeal(g.id), 'Refunded'); }}>{lead ? 'Cancel deal' : 'Leave'}</Button>}
      </div>
    </Card>
  );
}

function CreatorPicker({ me, g, value, onChange }) {
  const d = useDB();
  const exclude = new Set(g.declined || []);
  const list = rankCreators(d, pseudo(me, g), { exclude: false }).filter((x) => !exclude.has(x.u.id)).slice(0, 6);
  return (
    <div className="space-y-1.5">
      {list.map(({ u, m }) => (
        <button type="button" key={u.id} onClick={() => onChange(u.id)} className={cx('w-full flex items-center gap-2.5 rounded-xl border p-2 text-left', value === u.id ? 'border-brand bg-brand-softer' : 'border-line hover:bg-canvas')}>
          <Avatar user={u} size={30} /><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-semibold truncate">{u.name}</span><span className="block text-[11.5px] text-ink-muted">{compact(followersOf(u))} followers · {peso(u.creator.rates?.reel || 0)}/reel</span></span><MatchPill {...m} />
        </button>
      ))}
    </div>
  );
}

function CreateModal({ onClose }) {
  const d = useDB();
  const act = useAct();
  const { me } = useMode();
  const [f, setF] = useState({ title: '', brief: '', category: me.business.category, platform: 'tiktok', fee: 4500, slots: 3, product: '', creatorId: '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  const share = Math.round(Number(f.fee || 0) / Number(f.slots || 1));
  const rate = brandFeeRate(d, me);
  return (
    <Modal open onClose={onClose} title="Start a group deal" subtitle="You pay your share now; it's held safely by Buzz until the post is up." width="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" className="sm:col-span-2"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Taste of Cebu pasalubong box" /></Field>
        <Field label="What the creator will post" className="sm:col-span-2"><Textarea value={f.brief} onChange={(e) => set('brief', e.target.value)} className="!min-h-[70px]" placeholder="One TikTok unboxing featuring every brand, with each brand tagged in the caption." /></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        <Field label="Platform"><Select value={f.platform} onChange={(e) => set('platform', e.target.value)}>{Object.entries(PLATFORMS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select></Field>
        <Field label="Total creator fee (₱)"><Input type="number" min="1000" value={f.fee} onChange={(e) => set('fee', e.target.value)} /></Field>
        <Field label="Number of brands"><Select value={f.slots} onChange={(e) => set('slots', Number(e.target.value))}>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} brands</option>)}</Select></Field>
        <Field label="Your product in the post" className="sm:col-span-2"><Input value={f.product} onChange={(e) => set('product', e.target.value)} placeholder="e.g. Dried mango bars" /></Field>
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mt-4 mb-1.5">Pick the creator (best fits at this budget)</p>
      <CreatorPicker me={me} g={{ category: f.category, platform: f.platform, fee: Number(f.fee) || 0 }} value={f.creatorId} onChange={(v) => set('creatorId', v)} />
      <div className="rounded-xl bg-canvas p-3 mt-4 text-[13.5px] flex justify-between"><span>Your share{rate ? ` + ${Math.round(rate * 100)}% service fee` : ''}</span><b>{peso(share * (1 + rate))}</b></div>
      <p className="text-[12px] text-ink-muted mt-1">Test mode: no card is charged.</p>
      <Button size="lg" className="w-full mt-3" onClick={() => { if (act(() => actions.createGroupDeal(f), 'Group deal started. Other brands can join now.')) onClose(); }}>Start & pay my share</Button>
    </Modal>
  );
}

function JoinModal({ g, onClose }) {
  const d = useDB();
  const act = useAct();
  const { me } = useMode();
  const [product, setProduct] = useState('');
  const rate = brandFeeRate(d, me);
  return (
    <Modal open onClose={onClose} title={`Join "${g.title}"`} subtitle={`${g.members.length} of ${g.slots} brands in`}>
      <Field label="Your product in the post"><Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={me.business.name} /></Field>
      <div className="rounded-xl bg-canvas p-3 mt-4 text-[13.5px] flex justify-between"><span>Your share{rate ? ` + ${Math.round(rate * 100)}% service fee` : ''}</span><b>{peso(shareOf(g) * (1 + rate))}</b></div>
      <p className="text-[12px] text-ink-muted mt-1">Held safely by Buzz. Refunded if the deal is cancelled. Test mode: no card is charged.</p>
      <Button size="lg" className="w-full mt-3" onClick={() => { if (act(() => actions.joinGroupDeal(g.id, product), 'You\'re in!')) onClose(); }}>Join & pay my share</Button>
    </Modal>
  );
}

function PickCreatorModal({ g, onClose }) {
  const act = useAct();
  const { me } = useMode();
  const [creatorId, setCreatorId] = useState('');
  return (
    <Modal open onClose={onClose} title="Pick another creator" subtitle={g.title}>
      <CreatorPicker me={me} g={g} value={creatorId} onChange={setCreatorId} />
      <Button size="lg" className="w-full mt-4" disabled={!creatorId} onClick={() => { if (act(() => actions.inviteGroupCreator(g.id, creatorId), 'Invite sent')) onClose(); }}>Invite</Button>
    </Modal>
  );
}

function CreatorSide() {
  const d = useDB();
  const act = useAct();
  const { me } = useMode();
  const [urls, setUrls] = useState({});
  const mine = d.groupDeals.filter((g) => g.creatorId === me.id && g.status !== 'cancelled');
  return (
    <>
      <PageHead title="Group deals" sub="Several brands, one post, one fee. The full fee is held by Buzz before you start." action={<ModeToggle />} />
      {mine.length === 0 ? <Card><EmptyState icon={Users} title="No group deal invites yet" body="When a few brands team up to hire you, it shows up here." /></Card> : (
        <div className="space-y-4">
          {mine.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-bold">{g.title}</p><p className="text-[12.5px] text-ink-muted">{g.members.length} brands · {PLATFORMS[g.platform]?.label} · {peso(g.fee)} total, held safely by Buzz</p></div>
                <Badge tone={TONE[g.status]}>{g.status === 'invited' ? 'Invited you' : groupStatusLabel[g.status]}</Badge>
              </div>
              {g.brief && <p className="text-[13.5px] text-ink-soft mt-2">{g.brief}</p>}
              <div className="flex flex-wrap gap-2 mt-3">{g.members.map((m) => <Badge key={m.brandId}><Avatar user={userById(d, m.brandId)} size={16} />{brandName(userById(d, m.brandId))}: {m.product}</Badge>)}</div>
              {g.status === 'invited' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => act(() => actions.respondGroupDeal(g.id, false), 'Passed')}><X size={14} />Pass</Button>
                  <Button size="sm" onClick={() => act(() => actions.respondGroupDeal(g.id, true), 'Accepted! Post, then add the link here.')}><Check size={14} />Accept {peso(g.fee)}</Button>
                </div>
              )}
              {g.status === 'active' && (
                <div className="flex gap-2 mt-3">
                  <Input value={urls[g.id] || ''} onChange={(e) => setUrls({ ...urls, [g.id]: e.target.value })} placeholder="Paste the link to your post" />
                  <Button onClick={() => act(() => actions.postGroupDeal(g.id, urls[g.id]), 'Sent! You\'re paid once every brand confirms.')}><Link2 size={15} />Submit</Button>
                </div>
              )}
              {g.status === 'posted' && <p className="text-[13px] text-ink-muted mt-3">{g.confirmed.length} of {g.members.length} brands confirmed. You're paid when all confirm.</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

