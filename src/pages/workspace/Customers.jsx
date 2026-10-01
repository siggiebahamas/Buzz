import { useState } from 'react';
import { Gift, Copy, ExternalLink, Check, X, Users } from 'lucide-react';
import { useDB, userById, actions } from '../../lib/store';
import { ugcProgramOf } from '../../lib/grow';
import { PLATFORMS } from '../../lib/constants';
import { peso, timeAgo } from '../../lib/format';
import { appUrl } from '../../lib/links';
import { Card, Button, Badge, Avatar, Field, Input, Textarea, Checkbox, EmptyState, useAct, useCopy } from '../../components/ui';
import { useMode, PageHead } from './Layout';
import { NeedsBusiness } from './Swaps';

export default function Customers() {
  const d = useDB();
  const act = useAct();
  const copy = useCopy();
  const { me } = useMode();
  const p = me.business ? ugcProgramOf(d, me.id) : null;
  const [f, setF] = useState({ credit: p?.credit || 150, ask: p?.ask || '', active: p ? p.active : true });
  if (!me.business) return <NeedsBusiness title="Customer creators" />;
  const posts = d.ugcPosts.filter((x) => x.brandId === me.id);
  const pending = posts.filter((x) => x.status === 'pending');
  const done = posts.filter((x) => x.status !== 'pending');
  const approved = posts.filter((x) => x.status === 'approved');
  const link = p && appUrl(`/join/${p.code}`);

  return (
    <>
      <PageHead title="Customer creators" sub="Your happiest buyers post about you and get store credit. It costs you a discount on a future order, not cash, and real customer posts sell." />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <Card className="p-5">
            <p className="font-bold mb-3">Waiting for your review ({pending.length})</p>
            {pending.length === 0 ? <p className="text-[13px] text-ink-muted">No new posts. Share your invite link on packaging, receipts and your page.</p> : (
              <div className="space-y-3">{pending.map((x) => <UgcRow key={x.id} x={x} act={act} />)}</div>
            )}
          </Card>
          <Card className="p-5">
            <p className="font-bold mb-3">History</p>
            {done.length === 0 ? <p className="text-[13px] text-ink-muted">Approved and declined posts show here.</p> : (
              <div className="divide-y divide-line">
                {done.map((x) => {
                  const u = userById(d, x.userId);
                  return (
                    <div key={x.id} className="py-2.5 flex flex-wrap items-center gap-2 text-[13px]">
                      <Avatar user={u} size={24} /><span className="font-medium">{u?.name}</span>
                      <a href={x.url} target="_blank" rel="noreferrer" className="text-brand-dark inline-flex items-center gap-1">{PLATFORMS[x.platform]?.label} post <ExternalLink size={11} /></a>
                      <span className="text-ink-muted">{timeAgo(x.reviewedAt || x.createdAt)}</span>
                      <span className="ml-auto">{x.status === 'approved' ? <Badge tone="green">{peso(x.credit)} · {x.voucher}</Badge> : <Badge>Declined</Badge>}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-bold flex items-center gap-2"><Gift size={17} className="text-brand-dark" />Your program</p>
            <div className="space-y-3 mt-3">
              <Field label="Store credit per approved post (₱)" hint="₱100–₱200 works well for most small brands."><Input type="number" min="50" value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })} /></Field>
              <Field label="What to post"><Textarea value={f.ask} onChange={(e) => setF({ ...f, ask: e.target.value })} placeholder="e.g. Show our hot sauce on your favorite ulam. Tag @silirepublic." className="!min-h-[80px]" /></Field>
              <Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Accepting new posts" />
            </div>
            <Button className="w-full mt-3" onClick={() => act(() => actions.saveUgcProgram(f), p ? 'Program updated' : 'Program is live! Share your link.')}>{p ? 'Save changes' : 'Start my program'}</Button>
          </Card>
          {p && (
            <Card className="p-5">
              <p className="font-bold">Your invite link</p>
              <p className="text-[12.5px] text-ink-muted mt-0.5">Print it as a QR on your packaging, add it to receipts or pin it on your page.</p>
              <div className="flex gap-2 mt-3"><Input readOnly value={link} className="!text-[12.5px]" /><Button variant="outline" onClick={() => copy(link, 'Invite link copied')} aria-label="Copy invite link"><Copy size={15} /></Button></div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                <div className="rounded-xl bg-canvas p-2.5"><p className="text-[20px] font-extrabold">{approved.length}</p><p className="text-[11.5px] text-ink-muted">customer posts</p></div>
                <div className="rounded-xl bg-canvas p-2.5"><p className="text-[20px] font-extrabold">{peso(approved.reduce((a, x) => a + (x.credit || 0), 0))}</p><p className="text-[11.5px] text-ink-muted">credit given</p></div>
              </div>
            </Card>
          )}
          {!p && <Card className="p-5"><EmptyState icon={Users} title="No program yet" body="Set the credit and start. You'll get a link to share." /></Card>}
        </div>
      </div>
    </>
  );
}

function UgcRow({ x, act }) {
  const d = useDB();
  const u = userById(d, x.userId);
  return (
    <div className="rounded-xl border border-line p-3 flex flex-wrap items-center gap-3">
      <Avatar user={u} size={34} />
      <div className="flex-1 min-w-[180px]">
        <p className="font-semibold text-[14px]">{u?.name}</p>
        <a href={x.url} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-dark inline-flex items-center gap-1">Open {PLATFORMS[x.platform]?.label} post <ExternalLink size={11} /></a>
        <span className="text-[12px] text-ink-muted"> · {timeAgo(x.createdAt)}</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => act(() => actions.reviewUgc(x.id, false, 'The post didn\'t show our product clearly.'), 'Declined')}><X size={14} />Decline</Button>
        <Button size="sm" onClick={() => act(() => actions.reviewUgc(x.id, true), 'Approved! Their voucher was emailed.')}><Check size={14} />Approve & send credit</Button>
      </div>
    </div>
  );
}
