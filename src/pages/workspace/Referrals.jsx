import { Gift, Copy, Users, CheckCircle2, Clock } from 'lucide-react';
import { useDB, userById } from '../../lib/store';
import { REFERRAL_CREDIT } from '../../lib/ops';
import { peso, timeAgo } from '../../lib/format';
import { Card, Button, Avatar, Badge, EmptyState, useCopy } from '../../components/ui';
import { useMode, PageHead } from './Layout';
import { appUrl } from '../../lib/links';

export default function Referrals() {
  const d = useDB();
  const copy = useCopy();
  const { me } = useMode();
  const link = appUrl(`/signup?ref=${me.refCode}`);
  const invited = d.users.filter((u) => u.referredBy === me.id);
  const credit = d.transactions.filter((t) => t.userId === me.id && t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const msg = `I'm using Buzz to connect local brands with creators. Sign up with my link and we both get ${peso(REFERRAL_CREDIT)} credit: ${link}`;
  return (
    <>
      <PageHead title="Invite & earn" sub={`Know a founder or creator who'd love Buzz? You each get ${peso(REFERRAL_CREDIT)} Buzz credit after their first paid collaboration.`} />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card className="p-6 bg-ink text-white border-ink">
          <Gift size={24} className="text-brand" />
          <p className="text-[22px] font-bold mt-3">Give {peso(REFERRAL_CREDIT)}, get {peso(REFERRAL_CREDIT)}</p>
          <p className="text-white/70 text-[14px] mt-1">Credit comes off your Buzz service fees. It lands when the person you invite funds their first escrow (brands) or gets their first payment (creators).</p>
          <div className="mt-5 rounded-xl bg-white/10 p-3 flex items-center gap-3">
            <span className="flex-1 text-[13px] break-all">{link}</span>
            <Button size="sm" onClick={() => copy(link, 'Invite link copied')}><Copy size={14} />Copy</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <a className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-[13px] inline-flex items-center" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer">Share on Facebook</a>
            <button className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-[13px]" onClick={() => copy(msg, 'Message copied. Paste it in Messenger or Viber.')}>Copy a message for Messenger</button>
          </div>
          <p className="text-[12px] text-white/60 mt-3">Your code: <b className="text-white tracking-wider">{me.refCode}</b></p>
        </Card>
        <Card className="p-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Your credit</p>
          <p className="text-[32px] font-extrabold mt-1">{peso(credit)}</p>
          <p className="text-[13px] text-ink-muted">Applied automatically to your next service fees.</p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-canvas p-3"><p className="text-[12px] text-ink-muted">People invited</p><p className="text-[20px] font-bold">{invited.length}</p></div>
            <div className="rounded-xl bg-canvas p-3"><p className="text-[12px] text-ink-muted">Rewards earned</p><p className="text-[20px] font-bold">{invited.filter((u) => u.referralPaid).length}</p></div>
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        {invited.length === 0 ? <EmptyState icon={Users} title="No one yet" body="Share your link with a founder friend or a creator you follow." /> : (
          <div className="divide-y divide-line">
            {invited.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-3">
                <Avatar user={u} size={34} />
                <div className="flex-1"><p className="font-medium text-[14px]">{u.name}</p><p className="text-[12px] text-ink-muted">Joined {timeAgo(u.joinedAt)} · {u.creator ? 'Creator' : 'Business'}</p></div>
                {u.referralPaid ? <Badge tone="green"><CheckCircle2 size={12} />{peso(REFERRAL_CREDIT)} earned</Badge> : <Badge><Clock size={12} />Waiting for first collaboration</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
