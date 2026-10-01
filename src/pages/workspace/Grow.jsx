import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Repeat, Gift, Users, Rocket, Copy, ArrowRight, Package } from 'lucide-react';
import { useDB, brandName } from '../../lib/store';
import { swapMatches, ugcProgramOf, weekStart, launchesFor } from '../../lib/grow';
import { appUrl } from '../../lib/links';
import { Card, Button, Badge, Avatar, useCopy } from '../../components/ui';
import { CampaignForm } from '../../components/forms';
import { useMode, PageHead } from './Layout';
import { NeedsBusiness } from './Swaps';

// Everything a brand can do to get seen with little or no money.
export default function Grow() {
  const d = useDB();
  const nav = useNavigate();
  const copy = useCopy();
  const { me } = useMode();
  const [gifting, setGifting] = useState(false);
  if (!me.business) return <NeedsBusiness title="Grow for free" />;
  const matches = swapMatches(d, me).slice(0, 3);
  const incoming = d.swaps.filter((s) => s.toId === me.id && s.status === 'proposed').length;
  const activeSwaps = d.swaps.filter((s) => [s.fromId, s.toId].includes(me.id) && s.status === 'active').length;
  const program = ugcProgramOf(d, me.id);
  const pendingUgc = d.ugcPosts.filter((x) => x.brandId === me.id && x.status === 'pending').length;
  const week = launchesFor(d, weekStart());
  const myLaunch = week.find((l) => l.brandId === me.id);
  const openDeals = d.groupDeals.filter((g) => g.status === 'forming' && !g.members.some((m) => m.brandId === me.id)).length;
  const gifted = d.campaigns.filter((c) => c.ownerId === me.id && c.compensation === 'gifted').length;
  const shopLink = appUrl(`/shop/${me.id}`);

  const Tile = ({ icon: Icon, title, sub, children, to, cta, badge }) => (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-brand-soft text-brand-dark grid place-items-center shrink-0"><Icon size={20} /></div>
        <div className="flex-1 min-w-0"><p className="font-bold flex items-center gap-2">{title}{badge}</p><p className="text-[13px] text-ink-muted">{sub}</p></div>
      </div>
      <div className="mt-3 flex-1">{children}</div>
      {to && <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => nav(to)}>{cta}<ArrowRight size={14} /></Button>}
    </Card>
  );

  return (
    <>
      <PageHead title="Grow for free" sub="Five ways to get your product seen this week, without an ad budget." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Tile icon={Package} title="1. Product-for-content" sub="Send a creator your product, they post about it. No cash." to={gifted ? '/workspace/campaigns' : null} cta="See your listings"
          badge={gifted ? <Badge tone="green">{gifted} live</Badge> : null}>
          <p className="text-[13px] text-ink-soft">Most small brands start here. Creators say yes when the product fits them, so we show them their fit score, what the product is worth and what other creators think.</p>
          {!gifted && <Button size="sm" className="mt-3" onClick={() => setGifting(true)}><Gift size={14} />Post a product-for-content listing</Button>}
        </Tile>
        <Tile icon={Repeat} title="2. Brand swaps" sub="Promote each other to your customers." to="/workspace/swaps" cta={incoming ? `${incoming} request${incoming > 1 ? 's' : ''} waiting` : 'See all matches'}
          badge={activeSwaps ? <Badge tone="blue">{activeSwaps} active</Badge> : null}>
          <div className="space-y-2">{matches.map(({ u, reasons }) => (
            <div key={u.id} className="flex items-start gap-2 text-[13px]"><Avatar user={u} size={24} /><div className="min-w-0"><p className="font-semibold leading-tight">{brandName(u)}</p><p className="text-[12px] text-ink-muted leading-snug">{reasons[0]}</p></div></div>
          ))}</div>
        </Tile>
        <Tile icon={Gift} title="3. Customer creators" sub="Happy buyers post, you give store credit." to="/workspace/customers" cta={program ? (pendingUgc ? `${pendingUgc} post${pendingUgc > 1 ? 's' : ''} to review` : 'Manage program') : 'Start your program'}
          badge={program?.active ? <Badge tone="green">Live</Badge> : null}>
          <p className="text-[13px] text-ink-soft">{program ? `Customers get a ₱${program.credit} voucher for each approved post.` : 'It costs you a discount on a future order, not cash. Real customer posts convert better than ads.'}</p>
        </Tile>
        <Tile icon={Users} title="4. Group deals" sub="Split one creator's fee with other small brands." to="/workspace/group-deals" cta={openDeals ? `${openDeals} open to join` : 'Start one'}>
          <p className="text-[13px] text-ink-soft">A ₱6,000 creator split three ways is ₱2,000 each, and every brand is in the post.</p>
        </Tile>
        <Tile icon={Rocket} title="5. Launch Pad" sub="Free weekly showcase. The community votes." to="/launchpad" cta={myLaunch ? 'See the board' : 'Launch a product'}
          badge={myLaunch ? <Badge tone="green">#{week.indexOf(myLaunch) + 1} this week</Badge> : null}>
          <p className="text-[13px] text-ink-soft">{myLaunch ? `"${myLaunch.title}" has ${myLaunch.votes.length} votes and ${myLaunch.interested.length} creator offers.` : 'Creators browse the board to find their next product to post about.'}</p>
        </Tile>
        <Tile icon={Store} title="Your free shop page" sub="One link for your TikTok and Instagram bio." to={`/shop/${me.id}`} cta="View shop page">
          <div className="flex gap-2"><input readOnly value={shopLink} className="flex-1 min-w-0 h-9 rounded-lg border border-line px-2.5 text-[12.5px] bg-canvas" /><Button size="sm" onClick={() => copy(shopLink, 'Shop link copied. Paste it in your bio!')}><Copy size={14} />Copy</Button></div>
          <p className="text-[12px] text-ink-muted mt-1.5">Shows your products, buy buttons, creator videos and reviews. <Link to="/workspace/profile" className="text-brand-dark">Edit links</Link></p>
        </Tile>
      </div>
      {gifting && <CampaignForm open onClose={() => setGifting(false)} initial={{ compensation: 'gifted' }} onSaved={(id) => nav(`/workspace/campaigns/${id}`)} />}
    </>
  );
}
