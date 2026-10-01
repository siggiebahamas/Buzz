import { useNavigate } from 'react-router-dom';
import { Check, Minus, Sparkles, Gift, ShieldCheck } from 'lucide-react';
import { useDB, currentUser, actions } from '../lib/store';
import { isOn, setting } from '../lib/monetize';
import { peso } from '../lib/format';
import { Card, Button, Badge, useAct, useConfirm } from '../components/ui';

export default function Pricing() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const me = currentUser(d);
  const feeOn = isOn(d, 'transactionFee');
  const plansOn = isOn(d, 'plans');
  const featureOn = isOn(d, 'featuredListings');
  const fee = feeOn ? setting(d, 'transactionFee', 'brandPct') : 0;
  const cut = feeOn ? setting(d, 'transactionFee', 'commissionCutPct') : 0;
  const creatorPct = feeOn ? setting(d, 'transactionFee', 'creatorPct') : 0;
  const proPrice = setting(d, 'plans', 'proPrice');
  const proFee = feeOn ? setting(d, 'plans', 'proPct') : 0;
  const proCut = feeOn ? setting(d, 'plans', 'proCommissionCutPct') : 0;
  const freeWeeks = setting(d, 'plans', 'proFeaturedWeeks');
  const week = setting(d, 'featuredListings', 'weekPrice');
  const pro = plansOn && me?.plan === 'pro';
  const ex = 3000;

  const upgrade = async () => {
    if (!me) return nav('/signup');
    if (!me.business) return nav('/workspace/settings');
    if (await ask({ title: `Get Brand Pro for ${peso(proPrice)}/month?`, body: 'Test mode: no card is charged yet. Cancel anytime.', confirm: 'Upgrade' })) act(() => actions.setPlan('pro'), 'Brand Pro is active');
  };

  const rows = [
    ['Product-for-content listings', 'Unlimited, always free', 'Unlimited, always free'],
    ['Active paid listings', `Up to ${setting(d, 'plans', 'freeListings')}`, 'Unlimited'],
    ['Service fee on paid creator deals', `${fee}%`, `${proFee}%`],
    ['Buzz cut of commission payouts', `${cut}%`, `${proCut}%`],
    ...(featureOn ? [['Featured spot on Opportunities', `${peso(week)} a week`, `${freeWeeks} week${freeWeeks > 1 ? 's' : ''} free every month`]] : []),
    ['Hand-picked creators by the Buzz team', '1 request', 'Unlimited'],
    ['Matching, shop page, Launch Pad, protected payment', true, true],
    ['Priority support', false, true],
  ];
  const cell = (v) => (v === true ? <Check size={17} className="text-emerald-600 mx-auto" /> : v === false ? <Minus size={17} className="text-ink-faint mx-auto" /> : <span className="text-[13px]">{v}</span>);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center">
        <h1 className="text-[34px] font-extrabold tracking-tight" style={{ textWrap: 'balance' }}>Start free. Pay only when you pay a creator.</h1>
        <p className="text-ink-muted mt-2 max-w-xl mx-auto">Sending your product in exchange for a post is always free. Buzz earns a small fee only when money changes hands.</p>
      </div>

      <Card className="mt-8 p-5 flex items-start gap-3 bg-brand-softer border-[#F6DDB2]">
        <Gift size={22} className="text-brand-dark shrink-0 mt-0.5" />
        <p className="text-[14px]"><b>Product-for-content is free forever.</b> Offer creators your product instead of cash, as many times as you like, on any plan. No fees, no limits.</p>
      </Card>

      {plansOn ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <Card className="p-6 flex flex-col">
              <p className="font-bold text-[18px]">Free</p>
              <p className="mt-2"><span className="text-[34px] font-extrabold">₱0</span></p>
              <p className="text-[13.5px] text-ink-muted flex-1">For getting started and your first paid deals.</p>
              <div className="mt-5">{me && !pro ? <Button variant="soft" className="w-full" disabled>{me.business ? 'Your plan' : 'Free for creators'}</Button>
                : me ? <Button variant="outline" className="w-full" onClick={() => act(() => actions.setPlan('free'), 'Switched to Free')}>Switch to Free</Button>
                  : <Button variant="outline" className="w-full" onClick={() => nav('/signup')}>Start free</Button>}</div>
            </Card>
            <Card className="p-6 flex flex-col border-2 border-brand">
              <div className="flex items-center justify-between"><p className="font-bold text-[18px]">Brand Pro</p><Badge tone="brand"><Sparkles size={12} />For regular sellers</Badge></div>
              <p className="mt-2"><span className="text-[34px] font-extrabold">{peso(proPrice)}</span><span className="text-ink-muted">/month</span></p>
              <p className="text-[13.5px] text-ink-muted flex-1">Pays for itself once you spend about {peso(Math.ceil(proPrice / Math.max(0.01, (fee - proFee) / 100) / 1000) * 1000)} a month on creators.</p>
              <div className="mt-5">{pro ? <Button variant="soft" className="w-full" disabled>Your plan</Button> : <Button className="w-full" onClick={upgrade}>Get Brand Pro</Button>}</div>
            </Card>
          </div>
          <Card className="mt-6 overflow-x-auto">
            <table className="w-full text-[14px] min-w-[520px]">
              <thead><tr className="border-b border-line text-left"><th className="p-4 font-semibold">What you get</th><th className="p-4 font-semibold text-center w-44">Free</th><th className="p-4 font-semibold text-center w-44">Brand Pro</th></tr></thead>
              <tbody>{rows.map(([label, f, p]) => <tr key={label} className="border-b border-line last:border-0"><td className="p-4 text-ink-soft">{label}</td><td className="p-4 text-center">{cell(f)}</td><td className="p-4 text-center">{cell(p)}</td></tr>)}</tbody>
            </table>
          </Card>
        </>
      ) : (
        <Card className="mt-6 p-6 text-center">
          <p className="text-[40px] font-extrabold">{fee}%</p>
          <p className="text-ink-muted">service fee on paid creator deals · {cut}% of commission payouts</p>
        </Card>
      )}

      <Card className="mt-6 p-5 flex items-start gap-3">
        <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-[14px] text-ink-soft">Example: you pay a creator {peso(ex)}. On Free you pay {peso(ex * (1 + fee / 100))}{plansOn ? `; on Brand Pro, ${peso(ex * (1 + proFee / 100))}` : ''}. The creator receives {peso(ex * (1 - creatorPct / 100))}, held safely by Buzz until you approve the post.</p>
      </Card>
      <p className="text-center text-[13px] text-ink-muted mt-6">Creators always join free{creatorPct ? '' : ' and keep 100% of their fee'}.</p>
    </main>
  );
}

