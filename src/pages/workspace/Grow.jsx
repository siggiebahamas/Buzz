import { useNavigate } from 'react-router-dom';
import { Repeat, Gift, Users, ArrowRight } from 'lucide-react';
import { useDB, brandName } from '../../lib/store';
import { swapMatches, ugcProgramOf, growUnlocked } from '../../lib/grow';
import { Card, Button, Badge, Avatar } from '../../components/ui';
import { useMode, PageHead } from './Layout';
import { NeedsBusiness, GrowLocked } from './Swaps';

function Tile({ icon: Icon, title, sub, children, to, cta, badge }) {
  const nav = useNavigate();
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-brand-soft text-brand-dark grid place-items-center shrink-0"><Icon size={20} /></div>
        <div className="flex-1 min-w-0"><p className="font-bold flex items-center gap-2">{title}{badge}</p><p className="text-[13px] text-ink-muted">{sub}</p></div>
      </div>
      <div className="mt-3 flex-1">{children}</div>
      <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => nav(to)}>{cta}<ArrowRight size={14} /></Button>
    </Card>
  );
}

// Extra free growth tools, shown once a brand has finished its first collab.
export default function Grow() {
  const d = useDB();
  const { me } = useMode();
  if (!me.business) return <NeedsBusiness title="More ways to grow" />;
  if (!growUnlocked(d, me)) return <GrowLocked />;
  const matches = swapMatches(d, me).slice(0, 3);
  const incoming = d.swaps.filter((s) => s.toId === me.id && s.status === 'proposed').length;
  const activeSwaps = d.swaps.filter((s) => [s.fromId, s.toId].includes(me.id) && s.status === 'active').length;
  const program = ugcProgramOf(d, me.id);
  const pendingUgc = d.ugcPosts.filter((x) => x.brandId === me.id && x.status === 'pending').length;
  const openDeals = d.groupDeals.filter((g) => g.status === 'forming' && !g.members.some((m) => m.brandId === me.id)).length;
  return (
    <>
      <PageHead title="More ways to grow" sub="Free tools to reach more people once your first creator collab is done." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Tile icon={Repeat} title="Brand swaps" sub="Promote each other to your customers." to="/workspace/swaps" cta={incoming ? `${incoming} request${incoming > 1 ? 's' : ''} waiting` : 'See matches'}
          badge={activeSwaps ? <Badge tone="blue">{activeSwaps} active</Badge> : null}>
          <div className="space-y-2">{matches.map(({ u, reasons }) => (
            <div key={u.id} className="flex items-start gap-2 text-[13px]"><Avatar user={u} size={24} /><div className="min-w-0"><p className="font-semibold leading-tight">{brandName(u)}</p><p className="text-[12px] text-ink-muted leading-snug">{reasons[0]}</p></div></div>
          ))}</div>
        </Tile>
        <Tile icon={Gift} title="Customer creators" sub="Happy buyers post, you give store credit." to="/workspace/customers" cta={program ? (pendingUgc ? `${pendingUgc} post${pendingUgc > 1 ? 's' : ''} to review` : 'Manage') : 'Start'}
          badge={program?.active ? <Badge tone="green">Live</Badge> : null}>
          <p className="text-[13px] text-ink-soft">{program ? `Customers get a ₱${program.credit} voucher for each approved post.` : 'It costs a discount on a future order, not cash. Real customer posts sell.'}</p>
        </Tile>
        <Tile icon={Users} title="Group deals" sub="Split one creator's fee with other brands." to="/workspace/group-deals" cta={openDeals ? `${openDeals} open to join` : 'Start one'}>
          <p className="text-[13px] text-ink-soft">A ₱6,000 creator split three ways is ₱2,000 each, and every brand is in the post.</p>
        </Tile>
      </div>
    </>
  );
}
