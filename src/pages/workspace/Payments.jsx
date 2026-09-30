import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Wallet, Lock, ArrowDownToLine, Receipt, CheckCircle2 } from 'lucide-react';
import { useDB, userById, campaignById, walletOf, actions, currentUser } from '../../lib/store';
import { brandFeeRate, isOn, setting } from '../../lib/monetize';
import { commissionOwed } from '../../lib/ops';
import { isCreatorPro } from '../../lib/pro';
import { peso, shortDate, timeAgo } from '../../lib/format';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Select, Checkbox, EmptyState, IconTile, useAct, cx } from '../../components/ui';
import { useMode, ModeToggle, PageHead } from './Layout';

const METHODS = ['GCash', 'Maya', 'Card', 'Bank transfer (InstaPay)'];
const TX_LABEL = { fund: ['Paid into escrow', 'neutral'], release: ['Payment received', 'green'], payout: ['Withdrawal', 'blue'], refund: ['Refund', 'violet'], purchase: ['Purchase', 'neutral'], credit: ['Buzz credit', 'soft'], subscription: ['Plan', 'neutral'] };

export function FundModal({ ids, onClose }) {
  const d = useDB();
  const act = useAct();
  const [method, setMethod] = useState('GCash');
  const list = d.deliverables.filter((x) => ids.includes(x.id));
  const sub = list.reduce((a, x) => a + x.fee, 0);
  const rate = brandFeeRate(d, currentUser(d));
  const fee = Math.round(sub * rate);
  return (
    <Modal open onClose={onClose} title="Pay into escrow" subtitle="Buzz holds the money and releases it to each creator when you approve their content.">
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {list.map((x) => (
          <div key={x.id} className="flex justify-between text-[13.5px]"><span className="text-ink-soft truncate pr-3">{userById(d, x.creatorId)?.name} · {x.title}</span><span>{peso(x.fee)}</span></div>
        ))}
      </div>
      <div className="border-t border-line mt-3 pt-3 space-y-1 text-[13.5px]">
        <div className="flex justify-between"><span className="text-ink-muted">Creator fees</span><span>{peso(sub)}</span></div>
        <div className="flex justify-between"><span className="text-ink-muted">Buzz service fee ({Math.round(rate * 1000) / 10}%)</span><span>{peso(fee)}</span></div>
        <div className="flex justify-between font-bold text-[15px]"><span>Total</span><span>{peso(sub + fee)}</span></div>
      </div>
      <Field label="Pay with" className="mt-4"><Select id="fund-method" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
      <p className="text-[12px] text-ink-muted mt-2">Test mode: no real money moves. A payment provider (e.g. PayMongo) plugs in here at launch.</p>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.fundEscrow(ids, method), `${peso(sub + fee)} paid into escrow`)) onClose(); }}><Lock size={16} />Pay {peso(sub + fee)}</Button>
    </Modal>
  );
}

function WithdrawModal({ balance, onClose }) {
  const d = useDB();
  const act = useAct();
  const [f, setF] = useState({ amount: balance, method: 'GCash', account: '', instant: false });
  const pro = isCreatorPro(d, currentUser(d));
  const instantOn = isOn(d, 'instantPayout') || pro;
  const instantFee = pro ? 0 : setting(d, 'instantPayout', 'fee');
  return (
    <Modal open onClose={onClose} title="Withdraw earnings" subtitle={`Available: ${peso(balance)}`}>
      <div className="space-y-4">
        <Field label="Amount (₱)" hint="Minimum ₱100. No fee for creators."><Input id="wd-amount" type="number" min="100" max={balance} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Send to"><Select id="wd-method" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{['GCash', 'Maya', 'BDO', 'BPI', 'UnionBank', 'Other bank (InstaPay)'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label={f.method === 'GCash' || f.method === 'Maya' ? 'Mobile number' : 'Account number'}><Input id="wd-account" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} placeholder={f.method === 'GCash' || f.method === 'Maya' ? '0917 123 4567' : 'Account number'} /></Field>
        {instantOn && (
          <div className="grid grid-cols-2 gap-2">
            {[[false, 'Standard', '1–2 banking days · free'], [true, 'Instant', `Within minutes · ${instantFee ? peso(instantFee) : 'free with Creator Pro'}`]].map(([v, t, sub]) => (
              <button key={t} type="button" onClick={() => setF({ ...f, instant: v })} className={cx('rounded-xl border p-3 text-left', f.instant === v ? 'border-brand bg-brand-softer' : 'border-line')}><p className="font-semibold text-[14px]">{t}</p><p className="text-[12px] text-ink-muted">{sub}</p></button>
            ))}
          </div>
        )}
        <p className="text-[12px] text-ink-muted">Test mode: the withdrawal is recorded but no money moves.</p>
        <Button size="lg" className="w-full" onClick={() => { if (act(() => actions.withdraw(f.amount, f.method, f.account, f.instant && instantOn), 'Withdrawal sent')) onClose(); }}><ArrowDownToLine size={16} />Withdraw{f.instant && instantOn ? (instantFee ? ` now (${peso(instantFee)} fee)` : ' now') : ''}</Button>
      </div>
    </Modal>
  );
}

export default function Payments() {
  const d = useDB();
  const act = useAct();
  const { mode, me } = useMode();
  const biz = mode === 'business';
  const [modal, setModal] = useState(null);
  const [picked, setPicked] = useState([]);
  const w = walletOf(d, me.id);
  const myCamps = new Set(d.campaigns.filter((c) => c.ownerId === me.id).map((c) => c.id));

  if (biz) {
    const dels = d.deliverables.filter((x) => myCamps.has(x.campaignId) && x.fee > 0);
    const unfunded = dels.filter((x) => x.escrow === 'unfunded');
    const held = dels.filter((x) => x.escrow === 'held');
    const funded = w.txs.filter((t) => t.type === 'fund');
    const allPicked = picked.length === unfunded.length && unfunded.length > 0;
    return (
      <>
        <PageHead title="Payments" sub="Pay creators through escrow: they know the money is there, you only release it for approved work" action={<ModeToggle />} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5"><IconTile icon={Lock} /><p className="text-[24px] font-bold mt-3">{peso(held.reduce((a, x) => a + x.fee, 0))}</p><p className="text-[13px] text-ink-muted">Held in escrow · {held.length} deliverables</p></Card>
          <Card className="p-5"><IconTile icon={Receipt} tone="rose" /><p className="text-[24px] font-bold mt-3">{peso(unfunded.reduce((a, x) => a + x.fee, 0))}</p><p className="text-[13px] text-ink-muted">Not yet funded · {unfunded.length} deliverables</p></Card>
          <Card className="p-5"><IconTile icon={CheckCircle2} tone="green" /><p className="text-[24px] font-bold mt-3">{peso(dels.filter((x) => x.escrow === 'released').reduce((a, x) => a + x.fee, 0))}</p><p className="text-[13px] text-ink-muted">Released to creators</p></Card>
        </div>

        <Card className="p-5 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="font-bold">Fund escrow</p>
              <p className="text-[12.5px] text-ink-muted">Creators see a "secured" badge once their fee is funded. Approved work gets paid instantly.</p>
            </div>
            <Button disabled={!picked.length} onClick={() => setModal('fund')}><Lock size={15} />Fund {picked.length || ''} selected</Button>
          </div>
          {unfunded.length === 0 ? <EmptyState icon={ShieldCheck} title="Every fee is funded" body="New deliverables appear here when you accept creators." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px] min-w-[560px]">
                <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line">
                  <th className="py-2 w-8"><Checkbox checked={allPicked} onChange={(v) => setPicked(v ? unfunded.map((x) => x.id) : [])} label="" /></th>
                  <th className="font-medium">Creator</th><th className="font-medium">Deliverable</th><th className="font-medium">Status</th><th className="font-medium text-right">Fee</th>
                </tr></thead>
                <tbody>
                  {unfunded.map((x) => {
                    const u = userById(d, x.creatorId);
                    const on = picked.includes(x.id);
                    return (
                      <tr key={x.id} className="border-b border-line last:border-0">
                        <td className="py-2.5"><Checkbox checked={on} onChange={(v) => setPicked(v ? [...picked, x.id] : picked.filter((p) => p !== x.id))} label="" /></td>
                        <td><span className="flex items-center gap-2"><Avatar user={u} size={26} />{u?.name}</span></td>
                        <td className="text-ink-soft">{x.title}</td>
                        <td>{x.status === 'approved' ? <Badge tone="red">Approved, unpaid</Badge> : <Badge>Due {shortDate(x.dueAt)}</Badge>}</td>
                        <td className="text-right font-semibold">{peso(x.fee)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {(() => {
          const owed = commissionOwed(d, me.id);
          if (!owed.length) return null;
          const total = owed.reduce((a, x) => a + x.amount, 0);
          const cut = isOn(d, 'transactionFee') ? Math.round(total * setting(d, 'transactionFee', 'commissionCutPct') / 100) : 0;
          return (
            <Card className="p-5 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-bold">Commission owed to creators</p><p className="text-[12.5px] text-ink-muted">From sales tracked by their links and promo codes.</p></div>
                <Button onClick={() => act(() => actions.settleCommissions(), 'Commissions paid')}>Pay {peso(total + cut)}</Button>
              </div>
              <div className="mt-3 divide-y divide-line">
                {owed.map((x) => <div key={x.link.id} className="flex justify-between py-2 text-[13.5px]"><span>{userById(d, x.link.creatorId)?.name} · {x.campaign.productName} · {x.sales} sales</span><b>{peso(x.amount)}</b></div>)}
              </div>
              {cut > 0 && <p className="text-[12px] text-ink-muted mt-2">Includes {peso(cut)} Buzz fee on commissions.</p>}
            </Card>
          );
        })()}
        <Card className="p-5 mt-4">
          <p className="font-bold mb-3">Payment history</p>
          {funded.length === 0 ? <p className="text-[13px] text-ink-muted">No payments yet.</p> : (
            <div className="divide-y divide-line">
              {funded.slice(0, 20).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-[13.5px] gap-3">
                  <span className="min-w-0"><span className="block truncate">{t.note}</span><span className="text-[12px] text-ink-muted">{timeAgo(t.ts)} · includes Buzz service fee</span></span>
                  <span className="font-semibold shrink-0">{peso(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        {modal === 'fund' && <FundModal ids={picked} onClose={() => { setModal(null); setPicked([]); }} />}
      </>
    );
  }

  const mine = d.deliverables.filter((x) => x.creatorId === me.id && x.fee > 0);
  const secured = mine.filter((x) => x.escrow === 'held');
  const waiting = mine.filter((x) => x.escrow === 'unfunded');
  return (
    <>
      <PageHead title="Payments" sub="Your Buzz wallet, money secured for upcoming work, and withdrawals" action={<ModeToggle />} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-ink text-white border-ink">
          <Wallet size={20} className="text-brand" />
          <p className="text-[28px] font-bold mt-3">{peso(w.balance)}</p>
          <p className="text-[13px] text-white/70">Available to withdraw</p>
          <Button className="mt-4 w-full" disabled={w.balance < 100} onClick={() => setModal('withdraw')}><ArrowDownToLine size={15} />Withdraw</Button>
        </Card>
        <Card className="p-5"><IconTile icon={ShieldCheck} tone="green" /><p className="text-[24px] font-bold mt-3">{peso(secured.reduce((a, x) => a + x.fee, 0))}</p><p className="text-[13px] text-ink-muted">Secured in escrow · paid when approved</p></Card>
        <Card className="p-5"><IconTile icon={Receipt} tone="rose" /><p className="text-[24px] font-bold mt-3">{peso(waiting.reduce((a, x) => a + x.fee, 0))}</p><p className="text-[13px] text-ink-muted">Agreed but not yet funded by the brand</p></Card>
      </div>
      {waiting.length > 0 && (
        <Card className="p-5 mt-4">
          <p className="font-bold mb-1">Not yet funded</p>
          <p className="text-[12.5px] text-ink-muted mb-3">Tip: ask the brand to fund escrow before you post, so you're sure to get paid.</p>
          <div className="divide-y divide-line">
            {waiting.map((x) => {
              const c = campaignById(d, x.campaignId);
              return <div key={x.id} className="flex justify-between py-2 text-[13.5px] gap-3"><span className="truncate">{x.title} <span className="text-ink-muted">· {userById(d, c.ownerId)?.business?.name}</span></span><span className="font-semibold shrink-0">{peso(x.fee)}</span></div>;
            })}
          </div>
        </Card>
      )}
      {isOn(d, 'creatorAdvance') && (() => {
        const ready = mine.filter((x) => x.status === 'submitted' && x.escrow === 'held' && !x.frozen);
        if (!ready.length) return null;
        const pct = setting(d, 'creatorAdvance', 'pct');
        return (
          <Card className="p-5 mt-4">
            <p className="font-bold">Get paid now</p>
            <p className="text-[12.5px] text-ink-muted">Don't wait for the brand to approve. Buzz pays you today for a {pct}% fee and handles the wait.</p>
            <div className="mt-3 divide-y divide-line">
              {ready.map((x) => (
                <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13.5px]">
                  <span>{x.title}</span>
                  <Button size="sm" onClick={() => act(() => actions.cashAdvance(x.id), 'Paid to your wallet')}>Get {peso(Math.round(x.fee * (1 - pct / 100)))} now</Button>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
      <Card className="p-5 mt-4">
        <p className="font-bold mb-3">Wallet activity</p>
        {w.txs.length === 0 ? <p className="text-[13px] text-ink-muted">No activity yet. Payments arrive here when brands approve your content.</p> : (
          <div className="divide-y divide-line">
            {w.txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-[13.5px] gap-3">
                <span className="min-w-0"><span className="flex items-center gap-2"><Badge tone={TX_LABEL[t.type][1]}>{TX_LABEL[t.type][0]}</Badge></span><span className="block text-[12.5px] text-ink-muted mt-0.5 truncate">{t.note} · {timeAgo(t.ts)}</span></span>
                <span className={cx('font-semibold shrink-0', t.amount > 0 ? 'text-emerald-600' : 'text-ink')}>{t.amount > 0 ? '+' : ''}{peso(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p className="text-[12px] text-ink-muted mt-4">See how payments work in our <Link to="/terms" className="text-brand-dark">Terms</Link>. Test mode: no real money moves yet.</p>
      {modal === 'withdraw' && <WithdrawModal balance={w.balance} onClose={() => setModal(null)} />}
    </>
  );
}
