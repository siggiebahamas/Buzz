import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Plus, Copy, ExternalLink, Rocket, Store, Users, Package } from 'lucide-react';
import { useDB, applicantsCount, membersOf } from '../../lib/store';
import { weekStart, launchesFor } from '../../lib/grow';
import { peso } from '../../lib/format';
import { appUrl } from '../../lib/links';
import { ProductImage } from '../../components/visuals';
import { Card, Button, Badge, EmptyState, useCopy } from '../../components/ui';
import { CampaignForm } from '../../components/forms';
import { useMode, ModeToggle, PageHead } from './Layout';
import { NeedsBusiness } from './Swaps';

const STAGE = {
  recruiting: ['Looking for creators', 'soft'], active: ['Creators are posting', 'blue'], tracking: ['Counting sales', 'violet'], completed: ['Done', 'green'],
};

// The brand's products, their free shop page and this week's Launch Pad, in one place.
export default function MyShop() {
  const d = useDB();
  const nav = useNavigate();
  const copy = useCopy();
  const { mode, me } = useMode();
  const [adding, setAdding] = useState(false);
  if (mode === 'creator') return <Navigate to="/workspace/collabs" replace />;
  if (!me.business) return <NeedsBusiness title="My Shop" />;
  const products = d.campaigns.filter((c) => c.ownerId === me.id && !c.removed).sort((a, b) => b.createdAt - a.createdAt);
  const shopLink = appUrl(`/shop/${me.id}`);
  const week = launchesFor(d, weekStart());
  const launch = week.find((l) => l.brandId === me.id);

  return (
    <>
      <PageHead title="My Shop" sub="Your products and the free page that shows them off" action={<><ModeToggle /><Button onClick={() => setAdding(true)}><Plus size={16} />Add a product</Button></>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <p className="font-bold flex items-center gap-2"><Store size={17} className="text-brand-dark" />Your shop page</p>
          <p className="text-[13px] text-ink-muted mt-0.5">Put this link in your TikTok and Instagram bio. It shows your products, where to buy, and every creator post about you.</p>
          <div className="flex gap-2 mt-3"><input readOnly value={shopLink} className="flex-1 min-w-0 h-9 rounded-lg border border-line px-2.5 text-[12.5px] bg-canvas" /><Button size="sm" onClick={() => copy(shopLink, 'Copied. Paste it in your bio!')}><Copy size={14} />Copy</Button></div>
          <div className="flex gap-3 mt-2 text-[13px]"><Link to={`/shop/${me.id}`} className="text-brand-dark inline-flex items-center gap-1">View it <ExternalLink size={12} /></Link><Link to="/workspace/settings" className="text-ink-muted hover:text-ink">Edit buy links</Link></div>
        </Card>
        <Card className="p-5 bg-brand-softer border-[#F6DDB2]">
          <p className="font-bold flex items-center gap-2"><Rocket size={17} className="text-brand-dark" />Launch Pad this week</p>
          {launch ? (
            <p className="text-[13.5px] mt-1">"{launch.title}" is <b>#{week.indexOf(launch) + 1}</b> with {launch.votes.length} votes and {launch.interested.length} creator offers.</p>
          ) : (
            <p className="text-[13px] text-ink-soft mt-1">Free, once a week. The community votes and creators browse it to find products to post about.</p>
          )}
          <Button size="sm" className="mt-3" variant={launch ? 'outline' : 'primary'} onClick={() => nav('/launchpad')}>{launch ? 'See the board' : 'Launch a product free'}</Button>
        </Card>
      </div>

      {products.length === 0 ? (
        <Card><EmptyState icon={Package} title="Add your first product" body="A photo, a price and where to buy. That's all creators need to start." action={<Button onClick={() => setAdding(true)}><Plus size={15} />Add a product</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((c) => {
            const [label, tone] = c.published ? STAGE[c.status] : ['Private', 'neutral'];
            const working = membersOf(d, c.id).length;
            const applied = applicantsCount(d, c.id);
            return (
              <Card key={c.id} className="overflow-hidden flex flex-col">
                <Link to={`/workspace/campaigns/${c.id}`}><ProductImage campaign={c} className="aspect-[4/3]" /></Link>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2"><Link to={`/workspace/campaigns/${c.id}`} className="font-bold hover:underline">{c.productName}</Link><Badge tone={tone}>{label}</Badge></div>
                  <p className="text-[12.5px] text-ink-muted mt-0.5">{c.compensation === 'gifted' ? `Product for content${c.giftValue ? ` · worth ${peso(c.giftValue)}` : ''}` : c.compensation === 'commission' ? `${c.commissionRate}% per sale` : `${peso(c.budgetMin)}–${peso(c.budgetMax)} per creator`}</p>
                  <p className="text-[13px] text-ink-soft mt-2 flex items-center gap-1.5"><Users size={14} />{working} working · {applied} applied · {c.views} views</p>
                  <div className="flex gap-2 mt-auto pt-3">
                    <Link to={`/workspace/campaigns/${c.id}`} className="flex-1"><Button size="sm" variant="outline" className="w-full">Manage</Button></Link>
                    <Link to="/workspace/collabs?view=find" className="flex-1"><Button size="sm" className="w-full">Find creators</Button></Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {adding && <CampaignForm open onClose={() => setAdding(false)} onSaved={(id) => nav(`/workspace/campaigns/${id}`)} />}
    </>
  );
}
