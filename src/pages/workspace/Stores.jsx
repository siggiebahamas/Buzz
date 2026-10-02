import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, MessageCircle, Check, X, CheckCircle2 } from 'lucide-react';
import { useDB, userById, campaignById, actions } from '../../lib/store';
import { STORE_STATUS } from '../../lib/scout';
import { isOn, setting } from '../../lib/monetize';
import { peso, timeAgo } from '../../lib/format';
import { ProductImage } from '../../components/visuals';
import { Card, Button, Badge, Modal, Field, Input, Checkbox, EmptyState, useAct } from '../../components/ui';
import { useChat } from '../../components/Shell';
import { OrderModal } from '../Retail';

// List a product for store buyers: the terms a buyer needs before saying yes.
export function RetailModal({ c, onClose }) {
  const d = useDB();
  const act = useAct();
  const r = c.retail || {};
  const [f, setF] = useState({ wholesale: r.wholesale || '', srp: r.srp || c.aov || '', moq: r.moq || 24, capacity: r.capacity || '', shelfLife: r.shelfLife || '', fda: !!r.fda, bir: !!r.bir, barcode: !!r.barcode, note: r.note || '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  const m = Number(f.srp) > 0 && Number(f.wholesale) > 0 ? Math.round(((f.srp - f.wholesale) / f.srp) * 100) : null;
  const pct = setting(d, 'retailScouting', 'successPct');
  return (
    <Modal open onClose={onClose} title="Get it into stores" subtitle={`${c.productName} · shown to verified store buyers`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wholesale price (₱)"><Input type="number" min="0" value={f.wholesale} onChange={(e) => set('wholesale', e.target.value)} /></Field>
        <Field label="Suggested retail price (₱)"><Input type="number" min="0" value={f.srp} onChange={(e) => set('srp', e.target.value)} /></Field>
        <Field label="Minimum order (units)"><Input type="number" min="1" value={f.moq} onChange={(e) => set('moq', e.target.value)} /></Field>
        <Field label="You can make per month"><Input type="number" min="0" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="units" /></Field>
        <Field label="Shelf life" className="col-span-2"><Input value={f.shelfLife} onChange={(e) => set('shelfLife', e.target.value)} placeholder="e.g. 9 months" /></Field>
      </div>
      {m != null && <p className={`text-[12.5px] mt-2 ${m < 25 ? 'text-rose-700' : 'text-emerald-700'}`}>Store margin: {m}%. {m < 25 ? 'Most stores want 25–40%; consider a lower wholesale price.' : 'Good: most stores want 25–40%.'}</p>}
      <div className="mt-3 space-y-2">
        <Checkbox checked={f.fda} onChange={(v) => set('fda', v)} label="FDA registered or notified" />
        <Checkbox checked={f.bir} onChange={(v) => set('bir', v)} label="BIR registered (can issue official receipts)" />
        <Checkbox checked={f.barcode} onChange={(v) => set('barcode', v)} label="Has a barcode" />
      </div>
      {!(f.fda && f.barcode) && <p className="text-[12px] text-ink-muted mt-2">Many stores ask for FDA papers and barcodes. <Link to="/workspace/toolkit" className="text-brand-dark">Partners in the toolkit can help.</Link></p>}
      <Field label="Anything buyers should know (optional)" className="mt-3"><Input value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Ships in cases of 12" /></Field>
      <p className="text-[12px] text-ink-muted mt-3">Free to list.{isOn(d, 'retailScouting') ? ` If a store places its first order through Buzz, Buzz takes ${pct}% of that first order only. Reorders are fee-free.` : ''}</p>
      <div className="flex gap-2 mt-4">
        <Button size="lg" className="flex-1" onClick={() => { if (act(() => actions.setRetailReady(c.id, { ...f, ready: true }), 'Store buyers can now find this product')) onClose(); }}><Store size={16} />{r.ready ? 'Save' : 'Show to store buyers'}</Button>
        {r.ready && <Button size="lg" variant="outline" onClick={() => { act(() => actions.setRetailReady(c.id, { ready: false }), 'Hidden from store buyers'); onClose(); }}>Hide</Button>}
      </div>
    </Modal>
  );
}

export function StoreRequests({ me }) {
  const d = useDB();
  const act = useAct();
  const chat = useChat();
  const [ordering, setOrdering] = useState(null);
  const list = d.storeRequests.filter((r) => r.brandId === me.id);
  if (!list.length) return <Card><EmptyState icon={Store} title="No store requests yet" body="Mark a product as retail-ready and store buyers can find it. Products with creator posts and sales rank higher." /></Card>;
  return (
    <div className="space-y-3">
      {list.map((r) => {
        const b = userById(d, r.buyerId);
        const c = campaignById(d, r.campaignId);
        const [label, tone] = STORE_STATUS[r.status];
        return (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0"><ProductImage campaign={c} mini className="h-12 w-12" /></div>
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold">{b.buyer.company} <Badge tone={tone} className="ml-1">{r.status === 'ordered' && <CheckCircle2 size={12} />}{label}</Badge></p>
                <p className="text-[12.5px] text-ink-muted">{b.buyer.channel} · {b.buyer.stores} store{b.buyer.stores > 1 ? 's' : ''} · {b.buyer.region} · {timeAgo(r.createdAt)}</p>
                <p className="text-[13.5px] mt-1.5">{r.kind === 'samples' ? 'Wants samples of' : 'Wants to talk about stocking'} <b>{c.productName}</b>{r.qty ? `, about ${r.qty} units to start` : ''}.</p>
                {r.note && <p className="text-[13px] text-ink-soft mt-1">"{r.note}"</p>}
                {r.orderValue && <p className="text-[13px] text-emerald-700 mt-1">First order: {peso(r.orderValue)}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => chat.open(b.id, c.id)}><MessageCircle size={15} />Message</Button>
                {r.status === 'new' && <><Button size="sm" variant="outline" onClick={() => act(() => actions.respondStore(r.id, false), 'Declined')}><X size={14} />Decline</Button><Button size="sm" onClick={() => act(() => actions.respondStore(r.id, true), 'Great. Continue in Messages.')}><Check size={14} />Happy to talk</Button></>}
                {r.status === 'talking' && <Button size="sm" onClick={() => setOrdering(r)}>Record first order</Button>}
              </div>
            </div>
          </Card>
        );
      })}
      {ordering && <OrderModal r={ordering} brandSide onClose={() => setOrdering(null)} />}
    </div>
  );
}
