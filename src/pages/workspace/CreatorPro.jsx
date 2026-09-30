import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Crown, Eye, BarChart3, BellRing, Receipt, Zap, Clock, CheckCheck, Lock, Trash2, Download, FileText, Lightbulb } from 'lucide-react';
import { useDB, actions, brandName } from '../../lib/store';
import { isOn, setting } from '../../lib/monetize';
import { isCreatorPro, profileViewers, peerCompare, applyAllowance, taxYears, taxYear, taxCsv, invoiceHtml, inEarlyWindow } from '../../lib/pro';
import { CATEGORIES, PLATFORMS } from '../../lib/constants';
import { peso, timeAgo } from '../../lib/format';
import { Card, Button, Badge, Avatar, Field, Input, Select, useAct, useConfirm, cx } from '../../components/ui';
import { useMode, PageHead } from './Layout';

export const PRO_PERKS = [
  [Clock, 'Early access', 'Apply to new listings before everyone else'],
  [Eye, 'Who viewed you', 'See which brands looked at your profile'],
  [BarChart3, 'How you compare', 'Your rates and results against similar creators'],
  [BellRing, 'Instant alerts', 'Get notified the moment a matching listing is posted'],
  [CheckCheck, 'Read receipts', 'Know when a brand has seen your application'],
  [Zap, 'Free instant withdrawals', 'Same-day cash with no fee'],
  [Receipt, 'Tax pack', 'Invoices, yearly summary and a CSV for your BIR filing'],
];

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Section({ icon: Icon, title, sub, locked, children }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand-dark grid place-items-center shrink-0"><Icon size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-bold flex items-center gap-2">{title}{locked && <Lock size={13} className="text-ink-muted" />}</p>
          {sub && <p className="text-[13px] text-ink-muted">{sub}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Upsell({ text }) {
  return <p className="text-[13px] rounded-xl bg-brand-softer border border-[#F6DDB2] px-3 py-2.5">{text} <a href="#upgrade" className="font-semibold text-brand-dark">Get Creator Pro</a></p>;
}

export default function CreatorPro() {
  const d = useDB();
  const act = useAct();
  const ask = useConfirm();
  const { me } = useMode();
  if (!isOn(d, 'plans') || !me?.creator) return <Navigate to="/workspace" replace />;
  const pro = isCreatorPro(d, me);
  const price = setting(d, 'plans', 'creatorProPrice');
  const upgrade = async () => {
    if (await ask({ title: `Get Creator Pro for ${peso(price)}/month?`, body: 'Test mode: no card is charged yet. Cancel anytime.', confirm: 'Upgrade' })) act(() => actions.setPlan('pro', 'creator'), 'Welcome to Creator Pro');
  };
  const allowance = applyAllowance(d, me);
  const early = d.campaigns.filter((c) => c.published && !c.removed && c.ownerId !== me.id && inEarlyWindow(d, c)).length;

  return (
    <>
      <PageHead title="Creator Pro" sub="Tools that help you land more deals and keep your paperwork clean"
        action={pro ? <Badge tone="brand"><Crown size={12} />You're on Creator Pro</Badge> : <Button onClick={upgrade}><Crown size={15} />Get Pro · {peso(price)}/mo</Button>} />

      {!pro && (
        <Card id="upgrade" className="p-6 mb-5 border-2 border-brand">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1">
              <p className="text-[20px] font-extrabold">{peso(price)} a month. Cancel anytime.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                {PRO_PERKS.map(([Icon, t, s]) => <p key={t} className="text-[13px] flex gap-2"><Icon size={15} className="text-brand-dark shrink-0 mt-0.5" /><span><b>{t}.</b> <span className="text-ink-soft">{s}</span></span></p>)}
                {allowance && <p className="text-[13px] flex gap-2"><CheckCheck size={15} className="text-brand-dark shrink-0 mt-0.5" /><span><b>Unlimited applications.</b> <span className="text-ink-soft">Free plan: {allowance.cap} a month</span></span></p>}
              </div>
            </div>
            <Button size="lg" onClick={upgrade}>Get Creator Pro</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Listings in early access now</p><p className="text-[24px] font-extrabold">{early}</p><p className="text-[12px] text-ink-muted">{pro ? 'You can apply to all of them' : `Open to you ${setting(d, 'plans', 'earlyHours')}h after posting`}</p></Card>
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Applications this month</p><p className="text-[24px] font-extrabold">{allowance ? `${allowance.used} of ${allowance.cap}` : 'Unlimited'}</p><p className="text-[12px] text-ink-muted">{allowance ? `${allowance.left} left on the free plan` : pro ? 'Included in Pro' : 'No monthly limit right now'}</p></Card>
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Instant withdrawals</p><p className="text-[24px] font-extrabold">{pro ? 'Free' : isOn(d, 'instantPayout') ? peso(setting(d, 'instantPayout', 'fee')) : 'Pro only'}</p><p className="text-[12px] text-ink-muted"><Link to="/workspace/payments" className="text-brand-dark">Go to Payments</Link></p></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Viewers d={d} me={me} pro={pro} />
        <Compare d={d} me={me} pro={pro} />
        <Alerts d={d} me={me} pro={pro} />
        <TaxPack d={d} me={me} pro={pro} />
      </div>
    </>
  );
}

function Viewers({ d, me, pro }) {
  const { total, brands } = profileViewers(d, me);
  return (
    <Section icon={Eye} title="Who viewed your profile" sub={`${total} profile views in the last 30 days · ${brands.length} brands`} locked={!pro}>
      {brands.length === 0 ? <p className="text-[13px] text-ink-muted">No brand views yet. Applying to listings is the fastest way to get noticed.</p> : (
        <div className="space-y-2.5">
          {brands.slice(0, 6).map((b, i) => (
            <div key={b.id} className={cx('flex items-center gap-3', !pro && 'select-none')}>
              <div className={cx(!pro && 'blur-[5px]')}><Avatar user={b.user} size={34} /></div>
              <div className={cx('flex-1 min-w-0', !pro && 'blur-[5px]')}>
                <p className="text-[13.5px] font-semibold truncate">{pro ? brandName(b.user) : `Brand ${i + 1} hidden name`}</p>
                <p className="text-[12px] text-ink-muted">{pro ? `${b.user.business?.type || 'Brand'} · ` : ''}viewed {b.count > 1 ? `${b.count} times` : 'once'} · {timeAgo(b.last)}</p>
              </div>
              {pro && <Link to={`/profile/${b.id}`}><Button size="sm" variant="outline">View brand</Button></Link>}
            </div>
          ))}
          {!pro && <Upsell text={`${brands.length} brand${brands.length > 1 ? 's' : ''} looked at your profile this month.`} />}
        </div>
      )}
    </Section>
  );
}

const fmt = (v, f) => (v == null ? 'No data' : f === 'peso' ? peso(v) : f === 'pct' ? `${Number(v).toFixed(1)}%` : `${Math.round(v * 100)}%`);

function Compare({ d, me, pro }) {
  const p = peerCompare(d, me);
  return (
    <Section icon={BarChart3} title="How you compare" sub={`Against ${p.count} ${p.basis} (median)`} locked={!pro}>
      <div className={cx('divide-y divide-line', !pro && 'blur-[5px] select-none pointer-events-none')}>
        {p.rows.map((r) => {
          const ahead = r.you != null && r.peers != null && r.you >= r.peers;
          return (
            <div key={r.key} className="py-2 flex items-center gap-3 text-[13.5px]">
              <span className="flex-1 text-ink-soft">{r.label}</span>
              <span className="w-24 text-right font-semibold tabular-nums">{fmt(r.you, r.fmt)}</span>
              <span className="w-24 text-right text-ink-muted tabular-nums">{fmt(r.peers, r.fmt)}</span>
              <span className={cx('w-4 text-center', ahead ? 'text-emerald-600' : 'text-rose-500')}>{r.you == null || r.peers == null || r.you === r.peers ? '' : ahead ? '▲' : '▼'}</span>
            </div>
          );
        })}
        <div className="pt-2 text-[11.5px] text-ink-muted flex justify-end gap-3"><span className="w-24 text-right">You</span><span className="w-24 text-right">Similar creators</span><span className="w-4" /></div>
      </div>
      <div className={cx('mt-3', !pro && 'blur-[5px] select-none pointer-events-none')}>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">How well you fit current listings</p>
        {p.factors.map((f) => (
          <div key={f.key} className="flex items-center gap-3 text-[12.5px] py-0.5">
            <span className="w-28 text-ink-soft">{f.label}</span>
            <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className={cx('h-full rounded-full', f.key === p.weakest ? 'bg-rose-400' : 'bg-brand')} style={{ width: `${Math.round(f.score * 100)}%` }} /></div>
            <span className="w-9 text-right tabular-nums">{Math.round(f.score * 100)}</span>
          </div>
        ))}
        <p className="mt-3 text-[13px] flex gap-2 rounded-xl bg-canvas p-3"><Lightbulb size={15} className="text-brand-dark shrink-0 mt-0.5" />{p.tip}</p>
      </div>
      {!pro && <div className="mt-3"><Upsell text="See where you stand and the one change that would win you more deals." /></div>}
    </Section>
  );
}

function Alerts({ d, me, pro }) {
  const act = useAct();
  const [f, setF] = useState({ cat: 'all', q: '', minBudget: '', platform: '' });
  const mine = d.savedSearches.filter((s) => s.userId === me.id);
  const save = () => {
    if (act(() => actions.saveSearch({ cat: f.cat, q: f.q, minBudget: f.minBudget, platforms: f.platform ? [f.platform] : [] }), 'Alert saved. We\'ll notify you the moment a match is posted.')) setF({ cat: 'all', q: '', minBudget: '', platform: '' });
  };
  return (
    <Section icon={BellRing} title="Instant alerts" sub="Get a notification the moment a listing matching your search goes live" locked={!pro}>
      {pro ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.id === 'all' ? 'Any category' : c.label}</option>)}</Select>
            <Select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}><option value="">Any platform</option>{Object.entries(PLATFORMS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</Select>
            <Input placeholder="Keyword, e.g. skincare" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <Input type="number" min="0" placeholder="Min. budget (₱)" value={f.minBudget} onChange={(e) => setF({ ...f, minBudget: e.target.value })} />
          </div>
          <Button size="sm" className="mt-2" onClick={save}><BellRing size={14} />Save alert</Button>
          <div className="mt-4 space-y-2">
            {mine.length === 0 && <p className="text-[13px] text-ink-muted">No alerts yet. You can also save one from the filters on Opportunities.</p>}
            {mine.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
                <BellRing size={14} className="text-brand-dark shrink-0" /><span className="flex-1 min-w-0 truncate">{s.label}</span>
                <button onClick={() => actions.deleteSearch(s.id)} aria-label="Delete alert" className="text-ink-muted hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </>
      ) : <Upsell text="Good listings fill fast. Pro creators get pinged the second one is posted." />}
    </Section>
  );
}

function TaxPack({ d, me, pro }) {
  const act = useAct();
  const years = taxYears(d, me);
  const [year, setYear] = useState(years[0]);
  const [info, setInfo] = useState({ name: me.taxInfo?.name || me.name, tin: me.taxInfo?.tin || '', address: me.taxInfo?.address || me.location || '' });
  const ty = taxYear(d, me, year);
  const max = Math.max(1, ...ty.months);
  return (
    <Section icon={Receipt} title="Tax pack" sub="Your Buzz income, ready for BIR filing" locked={!pro}>
      <div className="flex items-center gap-2">
        <div className="w-28"><Select value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</Select></div>
        {pro && <Button size="sm" variant="outline" onClick={() => download(`buzz-income-${year}.csv`, taxCsv(ty), 'text/csv')}><Download size={14} />Download CSV</Button>}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-xl bg-canvas p-2.5"><p className="text-[11.5px] text-ink-muted">Gross fees</p><p className="font-bold tabular-nums">{peso(ty.gross)}</p></div>
        <div className="rounded-xl bg-canvas p-2.5"><p className="text-[11.5px] text-ink-muted">Buzz fees</p><p className="font-bold tabular-nums">{peso(ty.fees)}</p></div>
        <div className="rounded-xl bg-canvas p-2.5"><p className="text-[11.5px] text-ink-muted">Received</p><p className="font-bold tabular-nums">{peso(ty.received)}</p></div>
      </div>
      <div className="flex items-end gap-1 h-16 mt-3" aria-label="Gross fees by month">
        {ty.months.map((v, m) => <div key={m} title={`${new Date(2000, m).toLocaleString('en-PH', { month: 'short' })}: ${peso(v)}`} className="flex-1 rounded-t bg-brand/70" style={{ height: `${Math.max(3, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} />)}
      </div>
      {pro ? (
        <>
          <p className="text-[12.5px] text-ink-soft mt-3">If you chose the 8% income tax option, your estimate for {year} is <b>{peso(ty.est8)}</b> (8% of gross above ₱250,000). This is a guide, not tax advice; check with your accountant.</p>
          <details className="mt-3">
            <summary className="text-[13px] font-semibold cursor-pointer">Invoice details (appear on every invoice)</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <Field label="Name on invoices"><Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></Field>
              <Field label="TIN (optional)"><Input value={info.tin} onChange={(e) => setInfo({ ...info, tin: e.target.value })} placeholder="000-000-000-000" /></Field>
              <Field label="Address" className="sm:col-span-2"><Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></Field>
            </div>
            <Button size="sm" className="mt-2" onClick={() => act(() => actions.setTaxInfo(info), 'Invoice details saved')}>Save details</Button>
          </details>
          <div className="mt-3 divide-y divide-line max-h-64 overflow-y-auto">
            {ty.lines.length === 0 && <p className="text-[13px] text-ink-muted py-2">No payments in {year} yet.</p>}
            {[...ty.lines].reverse().map((l) => (
              <div key={l.no} className="py-2 flex items-center gap-3 text-[13px]">
                <FileText size={15} className="text-ink-muted shrink-0" />
                <span className="flex-1 min-w-0"><span className="block truncate">{l.brand} · {l.desc}</span><span className="text-[11.5px] text-ink-muted">{l.no} · {new Date(l.ts).toLocaleDateString('en-PH')}</span></span>
                <span className="font-semibold tabular-nums">{peso(l.gross)}</span>
                <button onClick={() => download(`${l.no}.html`, invoiceHtml(l, me), 'text/html')} className="text-brand-dark" aria-label={`Download invoice ${l.no}`}><Download size={15} /></button>
              </div>
            ))}
          </div>
        </>
      ) : <div className="mt-3"><Upsell text="Get an invoice for every payment, a yearly summary and a CSV your accountant can use." /></div>}
    </Section>
  );
}

