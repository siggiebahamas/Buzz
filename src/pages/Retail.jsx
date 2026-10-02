import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Store, ShieldCheck, TrendingUp, Package, BadgeCheck, MessageCircle, Search, Clock, CheckCircle2, Star, Megaphone, ShoppingBag, Rocket } from 'lucide-react';
import { useDB, currentUser, userById, brandName, actions, campaignById } from '../lib/store';
import { isBuyer, rankRetail, RETAIL_CHANNELS, STORE_STATUS } from '../lib/scout';
import { CATEGORIES, REGIONS } from '../lib/constants';
import { peso, timeAgo, compact } from '../lib/format';
import { ProductImage } from '../components/visuals';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Select, Textarea, EmptyState, Segmented, useAct, cx } from '../components/ui';
import { useChat } from '../components/Shell';

const margin = (r) => Math.round(((r.srp - r.wholesale) / r.srp) * 100);

// Store buyers discover small local brands that already sell online.
export default function Retail() {
  const d = useDB();
  const me = currentUser(d);
  const [params, setParams] = useSearchParams();
  const buyer = isBuyer(me);
  const tab = buyer && params.get('tab') === 'mine' ? 'mine' : 'scout';
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <section className="rounded-3xl bg-gradient-to-br from-[#EEF6F3] to-white border border-line p-6 sm:p-9">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5"><Store size={14} />Buzz for store buyers</p>
        <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-tight mt-1 max-w-3xl" style={{ textWrap: 'balance' }}>Find tomorrow's best-sellers from Filipino makers</h1>
        <p className="text-ink-muted mt-2 max-w-2xl">Every product here already sells online through creators. See real orders, creator posts and reviews, then order direct from the maker. Free for buyers.</p>
        {!buyer && <BuyerAccess me={me} />}
      </section>

      {buyer ? (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Segmented value={tab} onChange={(v) => setParams(v === 'mine' ? { tab: 'mine' } : {})} options={[{ id: 'scout', label: 'Scout products' }, { id: 'mine', label: `My requests · ${d.storeRequests.filter((r) => r.buyerId === me.id).length}` }]} />
            <p className="text-[13px] text-ink-muted">Buying for <b className="text-ink">{me.buyer.company}</b> · {me.buyer.stores} store{me.buyer.stores > 1 ? 's' : ''}</p>
          </div>
          {tab === 'scout' ? <Scout /> : <MyRequests />}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[[TrendingUp, 'Proof it sells', 'Orders driven by creators, posts and reviews, not just a pitch deck.'], [ShieldCheck, 'Ready for shelves', 'Wholesale price, minimum order, capacity, FDA and barcode status up front.'], [MessageCircle, 'Talk to the maker', 'No middlemen. Request samples or a call straight from the listing.']].map(([Icon, t, s]) => (
              <Card key={t} className="p-5"><Icon size={20} className="text-emerald-700" /><p className="font-bold mt-2">{t}</p><p className="text-[13.5px] text-ink-soft mt-1">{s}</p></Card>
            ))}
          </div>
          <Preview />
        </>
      )}
    </main>
  );
}

function Signals({ s }) {
  return (
    <p className="text-[12.5px] text-ink-soft flex flex-wrap gap-x-3 gap-y-1 mt-2">
      {s.orders > 0 && <span className="inline-flex items-center gap-1"><ShoppingBag size={13} className="text-emerald-700" />{compact(s.orders)} orders via creators</span>}
      {s.posts > 0 && <span className="inline-flex items-center gap-1"><Megaphone size={13} className="text-brand-dark" />{s.posts} creator posts</span>}
      {s.votes > 0 && <span className="inline-flex items-center gap-1"><Rocket size={13} />{s.votes} Launch Pad votes</span>}
      {s.rating && <span className="inline-flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{s.rating.toFixed(1)} from creators</span>}
    </p>
  );
}

function Compliance({ r }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {r.fda && <Badge tone="green"><BadgeCheck size={11} />FDA</Badge>}
      {r.bir && <Badge tone="green"><BadgeCheck size={11} />BIR</Badge>}
      {r.barcode && <Badge tone="green"><BadgeCheck size={11} />Barcode</Badge>}
      {r.shelfLife && <Badge>Shelf life {r.shelfLife}</Badge>}
    </div>
  );
}

// What non-buyers see: the products, without wholesale terms.
function Preview() {
  const d = useDB();
  const list = rankRetail(d).slice(0, 6);
  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-bold">Retail-ready this month</h2>
      <p className="text-[13px] text-ink-muted mb-4">Wholesale prices and ordering are visible to verified store buyers.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(({ c, s }) => (
          <Card key={c.id} className="overflow-hidden">
            <ProductImage campaign={c} className="aspect-[4/3]" />
            <div className="p-4"><p className="font-bold">{c.productName}</p><p className="text-[12.5px] text-ink-muted">{brandName(userById(d, c.ownerId))} · {userById(d, c.ownerId)?.region}</p><Signals s={s} /></div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function BuyerAccess({ me }) {
  const nav = useNavigate();
  const act = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ company: '', role: '', channel: RETAIL_CHANNELS[0], stores: 1, region: me?.region || REGIONS[0] });
  if (me?.buyer && !me.buyer.verified) return <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white border border-line px-4 py-2.5 text-[14px]"><Clock size={16} className="text-brand-dark" />We're verifying <b>{me.buyer.company}</b>. Usually within one working day.</p>;
  return (
    <>
      <div className="flex flex-wrap gap-3 mt-6">
        <Button size="lg" onClick={() => (me ? setOpen(true) : nav('/signup', { state: { from: '/retail' } }))}><Store size={16} />Get free buyer access</Button>
        <Link to="/launchpad"><Button size="lg" variant="outline">See what's launching</Button></Link>
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Get buyer access" subtitle="We verify every buyer so makers know requests are real.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Company or store name" className="sm:col-span-2"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
            <Field label="Your role"><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="e.g. Buyer, owner" /></Field>
            <Field label="Type of store"><Select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>{RETAIL_CHANNELS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Number of stores"><Input type="number" min="1" value={f.stores} onChange={(e) => setF({ ...f, stores: e.target.value })} /></Field>
            <Field label="Region"><Select value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>{REGIONS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          </div>
          <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.applyAsBuyer(f), 'Thanks! We\'ll verify you within one working day.')) setOpen(false); }}>Apply</Button>
        </Modal>
      )}
    </>
  );
}

function Scout() {
  const d = useDB();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [fdaOnly, setFdaOnly] = useState(false);
  const [asking, setAsking] = useState(null);
  const needle = q.toLowerCase();
  const list = rankRetail(d).filter(({ c }) => (cat === 'all' || c.category === cat) && (!fdaOnly || c.retail.fda) && (!needle || `${c.productName} ${c.description} ${brandName(userById(d, c.ownerId))}`.toLowerCase().includes(needle)));
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or makers" className="!pl-9" /></div>
        <div className="w-52"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.id === 'all' ? 'All categories' : c.label}</option>)}</Select></div>
        <button onClick={() => setFdaOnly(!fdaOnly)} className={cx('h-10 px-3.5 rounded-xl border text-[13.5px]', fdaOnly ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft')}>FDA-ready only</button>
      </div>
      <div className="mt-5 space-y-3">
        {list.length === 0 && <Card><EmptyState icon={Package} title="No products match" body="Try another category." /></Card>}
        {list.map(({ c, s }) => {
          const owner = userById(d, c.ownerId);
          const r = c.retail;
          return (
            <Card key={c.id} className="p-4 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-40 shrink-0 rounded-xl overflow-hidden"><ProductImage campaign={c} className="aspect-[4/3] sm:aspect-square" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-bold text-[16px]">{c.productName}</p><Link to={`/shop/${owner.id}`} className="text-[13px] text-ink-muted inline-flex items-center gap-1.5 hover:text-ink"><Avatar user={owner} size={18} />{brandName(owner)} · {owner.region}</Link></div>
                  <div className="text-right"><p className="text-[13px] text-ink-muted">Wholesale <b className="text-ink text-[16px]">{peso(r.wholesale)}</b></p><p className="text-[12.5px] text-emerald-700 font-medium">SRP {peso(r.srp)} · {margin(r)}% margin</p></div>
                </div>
                <Signals s={s} />
                <Compliance r={r} />
                <p className="text-[12.5px] text-ink-muted mt-2">Min. order {r.moq} units{r.capacity ? ` · up to ${compact(r.capacity)} a month` : ''}{r.note ? ` · ${r.note}` : ''}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" onClick={() => setAsking({ c, kind: 'samples' })}>Request samples</Button>
                  <Button size="sm" variant="outline" onClick={() => setAsking({ c, kind: 'meeting' })}>Talk about stocking</Button>
                  <Link to={`/shop/${owner.id}`}><Button size="sm" variant="ghost">Shop page</Button></Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {asking && <AskModal c={asking.c} kind={asking.kind} onClose={() => setAsking(null)} />}
    </>
  );
}

function AskModal({ c, kind, onClose }) {
  const act = useAct();
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(c.retail.moq * 2);
  return (
    <Modal open onClose={onClose} title={kind === 'samples' ? 'Request samples' : 'Talk about stocking'} subtitle={c.productName}>
      <div className="space-y-3">
        <Field label="Rough first order (units)" hint={`Their minimum is ${c.retail.moq}.`}><Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Message"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Which stores, timing, delivery, payment terms…" className="!min-h-[80px]" /></Field>
      </div>
      <p className="text-[12px] text-ink-muted mt-2">The maker gets your request and replies in Messages.</p>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.requestFromStore(c.id, { kind, note, qty }), 'Sent. The maker will reply in Messages.')) onClose(); }}>Send request</Button>
    </Modal>
  );
}

function MyRequests() {
  const d = useDB();
  const chat = useChat();
  const me = currentUser(d);
  const [ordering, setOrdering] = useState(null);
  const mine = d.storeRequests.filter((r) => r.buyerId === me.id);
  return (
    <div className="mt-5 space-y-3">
      {mine.length === 0 && <Card><EmptyState icon={Store} title="No requests yet" body="Scout products and request samples." /></Card>}
      {mine.map((r) => {
        const c = campaignById(d, r.campaignId);
        const owner = userById(d, r.brandId);
        const [label, tone] = STORE_STATUS[r.status];
        return (
          <Card key={r.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0"><ProductImage campaign={c} mini className="h-14 w-14" /></div>
            <div className="flex-1 min-w-[200px]"><p className="font-semibold">{c.productName}</p><p className="text-[12.5px] text-ink-muted">{brandName(owner)} · {r.kind === 'samples' ? 'Samples' : 'Stocking call'} · {timeAgo(r.createdAt)}{r.orderValue ? ` · first order ${peso(r.orderValue)}` : ''}</p></div>
            <Badge tone={tone}>{r.status === 'ordered' && <CheckCircle2 size={12} />}{label}</Badge>
            <Button size="sm" variant="ghost" onClick={() => chat.open(owner.id, c.id)}><MessageCircle size={15} />Message</Button>
            {r.status === 'talking' && <Button size="sm" variant="outline" onClick={() => setOrdering(r)}>Record first order</Button>}
          </Card>
        );
      })}
      {ordering && <OrderModal r={ordering} onClose={() => setOrdering(null)} />}
    </div>
  );
}

export function OrderModal({ r, onClose, brandSide = false }) {
  const d = useDB();
  const act = useAct();
  const [value, setValue] = useState('');
  return (
    <Modal open onClose={onClose} title="Record the first order" subtitle={campaignById(d, r.campaignId)?.productName}>
      <Field label="Order value (₱)"><Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      {brandSide && <p className="text-[12px] text-ink-muted mt-2">Buzz's success fee applies to this first order from this store only. Reorders are yours, fee-free.</p>}
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.recordStoreOrder(r.id, value), 'First order recorded. Congrats!')) onClose(); }}>Save</Button>
    </Modal>
  );
}
