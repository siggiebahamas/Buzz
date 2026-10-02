import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Copy, ExternalLink, Rocket, Store, Users, Package, Wrench } from 'lucide-react';
import { useDB, applicantsCount, membersOf } from '../../lib/store';
import { weekStart, launchesFor } from '../../lib/grow';
import { isOn, setting, freeFeaturedLeft } from '../../lib/monetize';
import { peso } from '../../lib/format';
import { appUrl } from '../../lib/links';
import { ProductImage } from '../../components/visuals';
import { Card, Button, Badge, EmptyState, useCopy } from '../../components/ui';
import { CampaignForm } from '../../components/forms';
import { useMode, ModeToggle, PageHead } from './Layout';
import { NeedsBusiness } from './Swaps';
import { RetailModal, StoreRequests } from './Stores';
import { cx } from '../../components/ui';

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
  const [retail, setRetail] = useState(null);
  const [params, setParams] = useSearchParams();
  const view = params.get('tab') === 'stores' ? 'stores' : 'products';
  if (mode === 'creator') return <Navigate to="/workspace/collabs" replace />;
  if (!me.business) return <NeedsBusiness title="My Shop" />;
  const products = d.campaigns.filter((c) => c.ownerId === me.id && !c.removed).sort((a, b) => b.createdAt - a.createdAt);
  const shopLink = appUrl(`/shop/${me.id}`);
  const paidActive = products.filter((c) => c.published && c.status !== 'completed' && c.compensation !== 'gifted').length;
  const week = launchesFor(d, weekStart());
  const launch = week.find((l) => l.brandId === me.id);
  const newStores = d.storeRequests.filter((r) => r.brandId === me.id && r.status === 'new').length;

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

      {isOn(d, 'plans') && (
        <div className="mb-4 rounded-2xl bg-white border border-line px-4 py-3 flex flex-wrap items-center gap-3 text-[13.5px]">
          {me.plan === 'pro' ? <span><b>Brand Pro</b> · {setting(d, 'plans', 'proPct')}% fee on paid deals · unlimited paid listings{freeFeaturedLeft(d, me) ? ` · ${freeFeaturedLeft(d, me)} free featured week left this month` : ''}</span>
            : <span><b>Free plan</b> · product-for-content listings are unlimited · {paidActive} of {setting(d, 'plans', 'freeListings')} paid listings used</span>}
          {me.plan !== 'pro' && <Link to="/pricing" className="ml-auto text-brand-dark font-medium">Brand Pro: lower fees, unlimited paid listings →</Link>}
        </div>
      )}
      <div className="flex gap-2 mb-4">
        {[['products', 'Products', 0], ['stores', 'Store requests', newStores]].map(([id, label, n]) => (
          <button key={id} onClick={() => setParams(id === 'stores' ? { tab: 'stores' } : {})} className={cx('h-9 px-4 rounded-full text-[13.5px] border inline-flex items-center gap-2', view === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>
            {label}{n > 0 && <span className={cx('text-[11.5px] px-1.5 rounded-full', view === id ? 'bg-white/20' : 'bg-brand text-white')}>{n}</span>}
          </button>
        ))}
      </div>
      {view === 'stores' ? <StoreRequests me={me} /> : products.length === 0 ? (
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
                  <button onClick={() => setRetail(c)} className={cx('mt-2 text-[12.5px] inline-flex items-center gap-1.5 self-start', c.retail?.ready ? 'text-emerald-700' : 'text-ink-muted hover:text-ink')}><Store size={13} />{c.retail?.ready ? `In front of store buyers · ${peso(c.retail.wholesale)} wholesale` : 'Get it into stores'}</button>
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
      <p className="mt-8 text-[13px] text-ink-muted flex items-center gap-1.5"><Wrench size={14} />Need packaging, labels, barcodes or permits? <Link to="/workspace/toolkit" className="text-ink underline decoration-line-strong underline-offset-2 hover:text-brand-dark">Business toolkit</Link></p>
      {retail && <RetailModal c={retail} onClose={() => setRetail(null)} />}
      {adding && <CampaignForm open onClose={() => setAdding(false)} onSaved={(id) => nav(`/workspace/campaigns/${id}`)} />}
    </>
  );
}
