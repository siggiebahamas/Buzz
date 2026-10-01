import { useNavigate } from 'react-router-dom';
import { Check, Minus, Sparkles, ShieldCheck } from 'lucide-react';
import { useDB, currentUser, actions } from '../lib/store';
import { isOn, setting } from '../lib/monetize';
import { peso } from '../lib/format';
import { Card, Button, Badge, useAct, useConfirm, cx } from '../components/ui';
import { PRO_PERKS } from './workspace/CreatorPro';

const Bullets = ({ items }) => (
  <ul className="mt-5 space-y-2 text-[14px]">
    {items.map((x) => <li key={x} className="flex gap-2"><Check size={17} className="text-emerald-600 shrink-0 mt-0.5" />{x}</li>)}
  </ul>
);

export default function Pricing() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const me = currentUser(d);
  const feeOn = isOn(d, 'transactionFee');
  const brandPct = feeOn ? setting(d, 'transactionFee', 'brandPct') : 0;
  const creatorPct = feeOn ? setting(d, 'transactionFee', 'creatorPct') : 0;
  const ex = 3000;

  if (!isOn(d, 'plans')) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center">
          <h1 className="text-[34px] font-extrabold tracking-tight">One simple fee. Nothing else.</h1>
          <p className="text-ink-muted mt-2 max-w-xl mx-auto">No subscriptions and no listing fees. Buzz only earns when a creator gets paid.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          <Card className="p-6 border-2 border-brand flex flex-col">
            <p className="font-bold text-[18px]">For brands</p>
            <p className="mt-2 text-[40px] font-extrabold">{brandPct}%</p>
            <p className="text-[13.5px] text-ink-muted">service fee on top of what you pay creators through Buzz Protected Payment</p>
            <div className="flex-1"><Bullets items={['Unlimited listings and applications', 'Matching with fit reasons for every creator', 'Protected payments, agreements and help if something goes wrong', 'Sales tracking and full analytics']} /></div>
            <Button className="w-full mt-6" onClick={() => nav(me ? '/workspace/campaigns' : '/signup')}>{me ? 'Post a listing' : 'Start free'}</Button>
          </Card>
          <Card className="p-6 flex flex-col">
            <p className="font-bold text-[18px]">For creators</p>
            <p className="mt-2 text-[40px] font-extrabold">{creatorPct}%</p>
            <p className="text-[13.5px] text-ink-muted">{creatorPct ? 'fee on payments you receive' : 'you keep 100% of every agreed fee'}</p>
            <div className="flex-1"><Bullets items={['Free to join and apply', 'Guaranteed payment, held safely by Buzz', 'Free withdrawals to GCash, Maya or bank', 'Commissions tracked for you']} /></div>
            <Button variant="outline" className="w-full mt-6" onClick={() => nav(me ? '/opportunities' : '/signup')}>{me ? 'Find opportunities' : 'Join as a creator'}</Button>
          </Card>
        </div>
        <Card className="mt-6 p-5 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[14px] text-ink-soft">Example: you pay a creator {peso(ex)}. You pay {peso(ex * (1 + brandPct / 100))} in total and the creator receives {peso(ex * (1 - creatorPct / 100))}. If the work isn't delivered, the money comes back to you.</p>
        </Card>
      </main>
    );
  }

  const proPct = setting(d, 'plans', 'proPct');
  const agencyPct = setting(d, 'plans', 'agencyPct');
  const plan = me?.plan || 'free';
  const buy = async (id, side = 'brand') => {
    if (!me) return nav('/signup');
    const price = side === 'creator' ? setting(d, 'plans', 'creatorProPrice') : setting(d, 'plans', id === 'agency' ? 'agencyPrice' : 'proPrice');
    const name = side === 'creator' ? 'Creator Pro' : id === 'agency' ? 'Agency' : 'Brand Pro';
    if (await ask({ title: `Switch to ${name} for ${peso(price)}/month?`, body: 'Test mode: no card is charged yet. You can switch back anytime.', confirm: 'Upgrade' })) act(() => actions.setPlan(id, side), `You're on ${name}`);
  };
  const cols = [
    ['free', 'Free', 0, 'For your first campaigns'],
    ['pro', 'Brand Pro', setting(d, 'plans', 'proPrice'), 'For brands running campaigns every month'],
    ['agency', 'Agency', setting(d, 'plans', 'agencyPrice'), 'For agencies running many brands'],
  ];
  const rows = [
    ['Active listings', `Up to ${setting(d, 'plans', 'freeListings')}`, 'Unlimited', 'Unlimited'],
    ['Matching and fit reasons', true, true, true],
    ['Protected payments and agreements', true, true, true],
    ['Service fee on creator payments', `${brandPct}%`, `${proPct}%`, `${agencyPct}%`],
    ['Hand-picked creators by the Buzz team', isOn(d, 'paidHandpick') ? 'Paid' : '1 request', 'Included', 'Included'],
    ['Priority support', false, true, true],
  ];
  const cell = (v) => (v === true ? <Check size={17} className="text-emerald-600 mx-auto" /> : v === false ? <Minus size={17} className="text-ink-faint mx-auto" /> : <span className="text-[13px]">{v}</span>);
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center">
        <h1 className="text-[34px] font-extrabold tracking-tight">Simple pricing for growing brands</h1>
        <p className="text-ink-muted mt-2 max-w-xl mx-auto">Start free. Upgrade when you run campaigns often enough that a lower fee pays for itself.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
        {cols.map(([id, name, price, sub]) => (
          <Card key={id} className={cx('p-6 flex flex-col', id === 'pro' && 'border-2 border-brand')}>
            <div className="flex items-center justify-between"><p className="font-bold text-[18px]">{name}</p>{id === 'pro' && <Badge tone="brand"><Sparkles size={12} />Best value</Badge>}</div>
            <p className="mt-2"><span className="text-[34px] font-extrabold">{peso(price)}</span>{price > 0 && <span className="text-ink-muted">/month</span>}</p>
            <p className="text-[13.5px] text-ink-muted flex-1">{sub}</p>
            <div className="mt-5">
              {plan === id ? <Button variant="soft" className="w-full" disabled>Your plan</Button>
                : id === 'free' ? <Button variant="outline" className="w-full" onClick={() => (me ? act(() => actions.setPlan('free'), 'Switched to Free') : nav('/signup'))}>{me ? 'Switch to Free' : 'Start free'}</Button>
                  : <Button className="w-full" variant={id === 'pro' ? 'primary' : 'outline'} onClick={() => buy(id)}>Choose {name}</Button>}
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-[14px] min-w-[560px]">
          <thead><tr className="border-b border-line text-left"><th className="p-4 font-semibold">What you get</th>{cols.map(([id, name]) => <th key={id} className="p-4 font-semibold text-center w-36">{name}</th>)}</tr></thead>
          <tbody>{rows.map(([label, ...v]) => <tr key={label} className="border-b border-line last:border-0"><td className="p-4 text-ink-soft">{label}</td>{v.map((x, i) => <td key={i} className="p-4 text-center">{cell(x)}</td>)}</tr>)}</tbody>
        </table>
      </Card>
      <Card className="mt-6 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-bold text-[18px]">Creator Pro · {peso(setting(d, 'plans', 'creatorProPrice'))}/month</p>
          <p className="text-[13.5px] text-ink-muted mt-1">Land more deals and keep your paperwork clean.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
            {PRO_PERKS.map(([Icon, t, s]) => <p key={t} className="text-[13px] flex gap-2"><Icon size={15} className="text-brand-dark shrink-0 mt-0.5" /><span><b>{t}.</b> <span className="text-ink-soft">{s}</span></span></p>)}
            {creatorPct > 0 && <p className="text-[13px] flex gap-2"><Check size={15} className="text-brand-dark shrink-0 mt-0.5" /><span><b>0% creator fee.</b> <span className="text-ink-soft">Free plan pays {creatorPct}%</span></span></p>}
            {setting(d, 'plans', 'freeApplyCap') > 0 && <p className="text-[13px] flex gap-2"><Check size={15} className="text-brand-dark shrink-0 mt-0.5" /><span><b>Unlimited applications.</b> <span className="text-ink-soft">Free plan: {setting(d, 'plans', 'freeApplyCap')} a month</span></span></p>}
          </div>
        </div>
        {me?.creatorPlan === 'pro'
          ? <Button variant="outline" onClick={() => act(() => actions.setPlan('free', 'creator'), 'Creator Pro cancelled')}>Cancel Creator Pro</Button>
          : <Button onClick={() => buy('pro', 'creator')}>Get Creator Pro</Button>}
      </Card>
      <p className="text-center text-[13px] text-ink-muted mt-6">Example: you pay a creator {peso(ex)}. On Free you pay {peso(ex * (1 + brandPct / 100))}; on Brand Pro, {peso(ex * (1 + proPct / 100))}.</p>
    </main>
  );
}
