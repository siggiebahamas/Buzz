import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Gift, Camera, Send, Ticket, CheckCircle2, Clock, XCircle, Copy } from 'lucide-react';
import { useDB, currentUser, userById, brandName, actions } from '../lib/store';
import { PLATFORMS } from '../lib/constants';
import { peso, timeAgo } from '../lib/format';
import { Card, Button, Badge, Avatar, Field, Input, Select, useAct, useCopy } from '../components/ui';

// Customers turn into creators: post about a brand, get store credit.
export default function Join() {
  const { code } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const copy = useCopy();
  const me = currentUser(d);
  const p = d.ugcPrograms.find((x) => x.code === code);
  const [f, setF] = useState({ url: '', platform: 'tiktok' });
  if (!p) return <main className="max-w-xl mx-auto p-10 text-center text-ink-muted">This invite link isn't valid. <Link to="/" className="text-brand-dark">Go to Buzz</Link></main>;
  const brand = userById(d, p.brandId);
  const mine = me ? d.ugcPosts.filter((x) => x.programId === p.id && x.userId === me.id) : [];
  const STATUS = { pending: ['Waiting for review', 'soft', Clock], approved: ['Credit sent', 'green', CheckCircle2], rejected: ['Not approved', 'red', XCircle] };

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <Card className="p-6 text-center">
        <div className="mx-auto w-fit"><Avatar user={brand} size={64} /></div>
        <p className="text-[13px] text-ink-muted mt-3">{brandName(brand)} invites you to</p>
        <h1 className="text-[26px] font-extrabold leading-tight mt-1">Post about us, get <span className="text-brand-dark">{peso(p.credit)}</span> store credit</h1>
        <p className="text-ink-soft mt-2">No follower minimum. Real customers, real posts.</p>
        {!p.active && <Badge tone="red" className="mt-3">This program is paused right now</Badge>}
      </Card>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        {[[Camera, 'Post', 'A photo or video on TikTok or Instagram'], [Send, 'Send the link', 'Paste it below'], [Ticket, 'Get credit', `A ${peso(p.credit)} voucher by email`]].map(([Icon, t, s], i) => (
          <Card key={t} className="p-3"><Icon size={18} className="mx-auto text-brand-dark" /><p className="text-[13px] font-bold mt-1">{i + 1}. {t}</p><p className="text-[11.5px] text-ink-muted">{s}</p></Card>
        ))}
      </div>

      <Card className="p-5 mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">What to post</p>
        <p className="text-[14px] mt-1">{p.ask}</p>
        <p className="text-[12px] text-ink-muted mt-2">Add #ad or "gifted" if you got the product free. One reward per month.</p>
      </Card>

      {p.active && (
        <Card className="p-5 mt-4">
          {me ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                <Field label="Platform"><Select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>{['tiktok', 'instagram', 'facebook', 'youtube'].map((k) => <option key={k} value={k}>{PLATFORMS[k].label}</option>)}</Select></Field>
                <Field label="Link to your post"><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://www.tiktok.com/@you/video/…" /></Field>
              </div>
              <Button size="lg" className="w-full mt-3" onClick={() => { if (act(() => actions.submitUgc(code, f), `Sent! ${brandName(brand)} will review it soon.`)) setF({ ...f, url: '' }); }}><Gift size={16} />Send for my {peso(p.credit)} credit</Button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-[14px]">Create a free Buzz account so we can send your voucher.</p>
              <div className="flex gap-2 justify-center mt-3">
                <Button onClick={() => nav('/signup', { state: { from: `/join/${code}` } })}>Sign up free</Button>
                <Button variant="outline" onClick={() => nav('/login', { state: { from: `/join/${code}` } })}>Log in</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {mine.length > 0 && (
        <Card className="p-5 mt-4">
          <p className="font-bold mb-2">Your posts</p>
          <div className="divide-y divide-line">
            {mine.map((x) => {
              const [label, tone, Icon] = STATUS[x.status];
              return (
                <div key={x.id} className="py-2.5 flex flex-wrap items-center gap-2 text-[13px]">
                  <a href={x.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-brand-dark">{x.url}</a>
                  <span className="text-ink-muted">{timeAgo(x.createdAt)}</span>
                  <Badge tone={tone}><Icon size={12} />{label}</Badge>
                  {x.voucher && <button onClick={() => copy(x.voucher, 'Voucher code copied')} className="inline-flex items-center gap-1 font-mono font-bold bg-canvas rounded-lg px-2 py-1">{x.voucher}<Copy size={12} /></button>}
                  {x.reason && <p className="w-full text-[12px] text-rose-700">{x.reason}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <p className="text-center text-[12.5px] text-ink-muted mt-6"><Link to={`/shop/${brand.id}`} className="text-brand-dark">Visit {brandName(brand)}'s shop page</Link></p>
    </main>
  );
}
