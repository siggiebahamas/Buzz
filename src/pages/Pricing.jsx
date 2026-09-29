import { useNavigate } from 'react-router-dom';
import { Check, Minus, Sparkles } from 'lucide-react';
import { useDB, currentUser, actions } from '../lib/store';
import { Card, Button, Badge, useAct, useConfirm, cx } from '../components/ui';

export const PLAN_LIMITS = { free: { activeListings: 2, concierge: 1 }, pro: { activeListings: Infinity, concierge: Infinity } };

const ROWS = [
  ['Post listings and receive applications', 'Up to 2 active at a time', 'Unlimited'],
  ['Matching and fit reasons for every creator', true, true],
  ['Escrow, agreements and dispute protection', true, true],
  ['Service fee on creator payments', '5%', '3%'],
  ['Hand-picked creators by the Buzz team', '1 request', 'Unlimited'],
  ['Sales import and full analytics', true, true],
  ['Featured spot on Discover', false, '1 listing per month'],
  ['Priority support', false, true],
];

export default function Pricing() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const me = currentUser(d);
  const plan = me?.plan || 'free';
  const upgrade = async () => {
    if (!me) return nav('/signup');
    if (await ask({ title: 'Upgrade to Pro for ₱1,499/month?', body: 'Test mode: no card is charged yet. You can switch back anytime.', confirm: 'Upgrade' })) act(() => actions.setPlan('pro'), 'You\'re on Pro');
  };
  const cell = (v) => (v === true ? <Check size={17} className="text-emerald-600 mx-auto" /> : v === false ? <Minus size={17} className="text-ink-faint mx-auto" /> : <span className="text-[13px]">{v}</span>);
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center">
        <h1 className="text-[34px] font-extrabold tracking-tight">Simple pricing for growing brands</h1>
        <p className="text-ink-muted mt-2 max-w-xl mx-auto">Creators always join free and keep 100% of their fee. Brands start free and only pay a small fee when they pay a creator.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
        {[['free', 'Free', '₱0', 'For your first campaigns'], ['pro', 'Pro', '₱1,499', 'For brands running campaigns every month']].map(([id, name, price, sub]) => (
          <Card key={id} className={cx('p-6 flex flex-col', id === 'pro' && 'border-2 border-brand')}>
            <div className="flex items-center justify-between"><p className="font-bold text-[18px]">{name}</p>{id === 'pro' && <Badge tone="brand"><Sparkles size={12} />Best value</Badge>}</div>
            <p className="mt-2"><span className="text-[34px] font-extrabold">{price}</span>{id === 'pro' && <span className="text-ink-muted">/month</span>}</p>
            <p className="text-[13.5px] text-ink-muted">{sub}</p>
            <div className="mt-5">
              {plan === id ? <Button variant="soft" className="w-full" disabled>Your plan</Button>
                : id === 'pro' ? <Button className="w-full" onClick={upgrade}>Upgrade to Pro</Button>
                  : <Button variant="outline" className="w-full" onClick={() => (me ? act(() => actions.setPlan('free'), 'Switched to Free') : nav('/signup'))}>{me ? 'Switch to Free' : 'Start free'}</Button>}
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-[14px] min-w-[520px]">
          <thead><tr className="border-b border-line text-left"><th className="p-4 font-semibold">What you get</th><th className="p-4 font-semibold text-center w-40">Free</th><th className="p-4 font-semibold text-center w-40">Pro</th></tr></thead>
          <tbody>{ROWS.map(([label, f, p]) => <tr key={label} className="border-b border-line last:border-0"><td className="p-4 text-ink-soft">{label}</td><td className="p-4 text-center">{cell(f)}</td><td className="p-4 text-center">{cell(p)}</td></tr>)}</tbody>
        </table>
      </Card>
      <p className="text-center text-[13px] text-ink-muted mt-6">Example: you pay a creator ₱3,000. On Free you pay ₱3,150 total; on Pro, ₱3,090. The creator receives the full ₱3,000.</p>
    </main>
  );
}
