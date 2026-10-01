import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Repeat, Check, X, ExternalLink, Link2, Sparkles, Sprout } from 'lucide-react';
import { useDB, userById, brandName, actions } from '../../lib/store';
import { swapMatches, SWAP_OFFERS, growUnlocked } from '../../lib/grow';
import { categoryById } from '../../lib/constants';
import { timeAgo } from '../../lib/format';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Select, Textarea, EmptyState, useAct, cx } from '../../components/ui';
import { useMode, PageHead } from './Layout';

export function NeedsBusiness({ title }) {
  return (
    <>
      <PageHead title={title} />
      <Card><EmptyState icon={Repeat} title="For business owners" body="Add a business profile in My Profile to use this." action={<Link to="/workspace/profile"><Button variant="outline">Go to My Profile</Button></Link>} /></Card>
    </>
  );
}

export default function Swaps() {
  const d = useDB();
  const act = useAct();
  const { me } = useMode();
  const [tab, setTab] = useState('matches');
  const [propose, setPropose] = useState(null);
  if (!me.business) return <NeedsBusiness title="Brand swaps" />;
  if (!growUnlocked(d, me)) return <GrowLocked />;
  const mineAll = d.swaps.filter((s) => s.fromId === me.id || s.toId === me.id);
  const incoming = mineAll.filter((s) => s.status === 'proposed' && s.toId === me.id);
  const groups = [
    ['matches', 'Matches for you', null],
    ['requests', 'Requests', mineAll.filter((s) => s.status === 'proposed')],
    ['active', 'Active', mineAll.filter((s) => s.status === 'active')],
    ['done', 'Done', mineAll.filter((s) => ['done', 'declined', 'cancelled'].includes(s.status))],
  ];
  const matches = swapMatches(d, me).slice(0, 12);
  const current = groups.find((g) => g[0] === tab);

  return (
    <>
      <PageHead title="Brand swaps" sub="Promote each other to your customers. No budget needed. We match you with brands your buyers also love, never competitors." />
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {groups.map(([id, label, list]) => (
          <button key={id} onClick={() => setTab(id)} className={cx('h-9 px-4 rounded-full text-[13.5px] border inline-flex items-center gap-2 whitespace-nowrap', tab === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>
            {label}{list && <span className={cx('text-[11.5px] px-1.5 rounded-full', tab === id ? 'bg-white/20' : 'bg-canvas')}>{list.length}</span>}
            {id === 'requests' && incoming.length > 0 && <span className="h-2 w-2 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {tab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {matches.map(({ u, score, reasons }) => (
            <Card key={u.id} className="p-4 flex flex-col">
              <div className="flex items-start gap-3">
                <Avatar user={u} size={44} />
                <div className="flex-1 min-w-0">
                  <Link to={`/shop/${u.id}`} className="font-bold hover:underline">{brandName(u)}</Link>
                  <p className="text-[12.5px] text-ink-muted">{categoryById(u.business.category).label} · {u.business.type} · {u.region}</p>
                </div>
                <Badge tone={score >= 70 ? 'green' : score >= 50 ? 'blue' : 'neutral'}>{score >= 70 ? 'Great match' : score >= 50 ? 'Good match' : 'Worth a look'}</Badge>
              </div>
              <ul className="mt-3 space-y-1 text-[13px] text-ink-soft flex-1">{reasons.map((r) => <li key={r} className="flex gap-1.5"><Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />{r}</li>)}</ul>
              <Button size="sm" className="mt-3 self-start" onClick={() => setPropose(u)}><Repeat size={14} />Propose a swap</Button>
            </Card>
          ))}
          {matches.length === 0 && <Card className="lg:col-span-2"><EmptyState icon={Sparkles} title="No new matches right now" body="You already have swaps open with your best matches." /></Card>}
        </div>
      )}

      {tab !== 'matches' && (
        <div className="space-y-3">
          {current[2].length === 0 && <Card><EmptyState icon={Repeat} title="Nothing here yet" body="Propose a swap from your matches." action={<Button variant="outline" onClick={() => setTab('matches')}>See matches</Button>} /></Card>}
          {current[2].map((s) => <SwapRow key={s.id} s={s} me={me} act={act} />)}
        </div>
      )}

      {propose && <ProposeModal to={propose} onClose={() => setPropose(null)} />}
    </>
  );
}

function SwapRow({ s, me, act }) {
  const d = useDB();
  const [url, setUrl] = useState('');
  const outgoing = s.fromId === me.id;
  const other = userById(d, outgoing ? s.toId : s.fromId);
  const myUrl = outgoing ? s.fromUrl : s.toUrl;
  const theirUrl = outgoing ? s.toUrl : s.fromUrl;
  const iGive = outgoing ? s.give : s.ask;
  const theyGive = outgoing ? s.ask : s.give;
  const tone = { proposed: 'soft', active: 'blue', done: 'green', declined: 'neutral', cancelled: 'neutral' }[s.status];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar user={other} size={40} />
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold">{brandName(other)} <Badge tone={tone} className="ml-1 capitalize">{s.status === 'proposed' ? (outgoing ? 'Waiting for them' : 'Wants to swap') : s.status}</Badge></p>
          <p className="text-[12.5px] text-ink-muted">{outgoing ? 'You proposed' : 'They proposed'} {timeAgo(s.createdAt)}</p>
          {s.note && <p className="text-[13px] text-ink-soft mt-1.5">"{s.note}"</p>}
        </div>
        {s.status === 'proposed' && !outgoing && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => act(() => actions.respondSwap(s.id, false), 'Declined')}><X size={14} />Decline</Button>
            <Button size="sm" onClick={() => act(() => actions.respondSwap(s.id, true), 'Swap on! Post your side and add the link.')}><Check size={14} />Accept</Button>
          </div>
        )}
        {['proposed', 'active'].includes(s.status) && (outgoing || s.status === 'active') && <Button size="sm" variant="ghost" onClick={() => act(() => actions.cancelSwap(s.id), 'Swap cancelled')}>Cancel</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {[['You post', iGive, myUrl], [`${brandName(other)} posts`, theyGive, theirUrl]].map(([who, what, link]) => (
          <div key={who} className="rounded-xl bg-canvas p-3 text-[13px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">{who}</p>
            <p className="font-medium mt-0.5">{what}</p>
            {link ? <a href={link} target="_blank" rel="noreferrer" className="text-brand-dark inline-flex items-center gap-1 mt-1"><Check size={13} />Posted <ExternalLink size={12} /></a> : s.status === 'active' && <p className="text-ink-muted mt-1">Not posted yet</p>}
          </div>
        ))}
      </div>
      {s.status === 'active' && !myUrl && (
        <div className="flex gap-2 mt-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the link to your post" />
          <Button onClick={() => { if (act(() => actions.postSwap(s.id, url), 'Posted! We let them know.')) setUrl(''); }}><Link2 size={15} />Done</Button>
        </div>
      )}
    </Card>
  );
}

function ProposeModal({ to, onClose }) {
  const act = useAct();
  const [f, setF] = useState({ give: SWAP_OFFERS[0], ask: SWAP_OFFERS[0], note: '' });
  return (
    <Modal open onClose={onClose} title={`Swap with ${brandName(to)}`} subtitle="Fair and simple: you each promote the other to your customers.">
      <div className="space-y-3">
        <Field label="You'll post"><Select value={f.give} onChange={(e) => setF({ ...f, give: e.target.value })}>{SWAP_OFFERS.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="You'd like them to post"><Select value={f.ask} onChange={(e) => setF({ ...f, ask: e.target.value })}>{SWAP_OFFERS.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Message (optional)" hint="Why your customers would love their product, and vice versa."><Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className="!min-h-[80px]" /></Field>
      </div>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.proposeSwap({ toId: to.id, ...f }), 'Swap proposed. We sent them a message.')) onClose(); }}><Repeat size={16} />Send proposal</Button>
    </Modal>
  );
}

export function GrowLocked() {
  return (
    <>
      <PageHead title="More ways to grow" />
      <Card className="p-8 text-center max-w-xl mx-auto">
        <Sprout size={28} className="mx-auto text-brand-dark" />
        <p className="font-bold text-[18px] mt-3">Unlocks after your first finished collab</p>
        <p className="text-[14px] text-ink-soft mt-1">Get one creator to post about your product first. Then brand swaps and customer creators open up here.</p>
        <Link to="/workspace/collabs?view=find" className="inline-block mt-4"><Button>Find a creator</Button></Link>
      </Card>
    </>
  );
}
