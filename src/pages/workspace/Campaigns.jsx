import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Users, Copy, Link2, Briefcase } from 'lucide-react';
import { useDB, userById, brandName, membersOf, applicantsCount } from '../../lib/store';
import { businessMetrics, creatorMetrics, getRange } from '../../lib/metrics';
import { peso, compact, budgetLabel } from '../../lib/format';
import { ProductImage } from '../../components/visuals';
import { Card, Badge, Button, EmptyState, useCopy } from '../../components/ui';
import { Progress } from '../../components/charts';
import { CampaignForm } from '../../components/forms';
import { useMode, ModeToggle, PageHead } from './Layout';
import { STATUS_TONE } from './shared';

import { appUrl } from '../../lib/links';

export const trackingUrl = (code) => appUrl(`/go/${code}`);

export default function Campaigns() {
  const d = useDB();
  const nav = useNavigate();
  const copy = useCopy();
  const { mode, me } = useMode();
  const [creating, setCreating] = useState(false);
  const allTime = getRange('custom', { from: '2000-01-01', to: new Date().toISOString().slice(0, 10) });

  if (mode === 'creator') {
    const m = creatorMetrics(d, me.id, allTime);
    return (
      <>
        <PageHead title="My Campaigns" sub="Campaigns you're creating content for" action={<ModeToggle />} />
        {m.perCampaign.length === 0 ? <Card><EmptyState icon={Briefcase} title="No active campaigns yet" body="Apply to opportunities; accepted ones show up here." action={<Link to="/opportunities?as=creator"><Button>Find opportunities</Button></Link>} /></Card> : (
          <div className="space-y-3">
            {m.perCampaign.map((row) => {
              const c = row.campaign;
              const owner = userById(d, c.ownerId);
              return (
                <Card key={c.id} className="p-4 flex flex-wrap items-center gap-4 sm:gap-5">
                  <ProductImage campaign={c} mini className="h-20 w-20 shrink-0" rounded="rounded-xl" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2"><Link to={`/opportunity/${c.id}`} className="font-bold hover:underline">{c.productName}</Link><Badge tone={STATUS_TONE[c.status]} className="capitalize">{c.status}</Badge></div>
                    <p className="text-[12.5px] text-ink-muted">by {brandName(owner)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={(row.done / Math.max(1, row.total)) * 100} className="w-40" />
                      <span className="text-[12.5px] text-ink-muted">{row.done}/{row.total} deliverables done</span>
                    </div>
                  </div>
                  {row.link && (
                    <div className="text-[12.5px] w-60">
                      <p className="text-ink-muted mb-1">Your promo code & link</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => copy(row.link.code, 'Code copied')} className="h-8 px-2.5 rounded-lg bg-brand-soft font-mono font-semibold text-[12px] inline-flex items-center gap-1">{row.link.code}<Copy size={12} /></button>
                        <button onClick={() => copy(trackingUrl(row.link.code), 'Tracking link copied')} className="h-8 px-2.5 rounded-lg border border-line inline-flex items-center gap-1"><Link2 size={13} />Link</button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-5 text-right">
                    <Mini v={compact(row.clicks)} l="Clicks" />
                    <Mini v={row.orders} l="Sales" />
                    <Mini v={peso(row.earned, { compact: true })} l="Earned" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }

  const m = businessMetrics(d, me.id, allTime);
  return (
    <>
      <PageHead title="My Campaigns" sub="Manage your campaigns and the creators on them" action={<><ModeToggle /><Button onClick={() => setCreating(true)}><Plus size={16} />Create Campaign</Button></>} />
      {m.perCampaign.length === 0 ? <Card><EmptyState icon={Briefcase} title="No campaigns yet" body="Post your first product with photos. It becomes a listing creators can apply to." action={<Button onClick={() => setCreating(true)}>Create Campaign</Button>} /></Card> : (
        <div className="space-y-3">
          {m.perCampaign.map((row) => {
            const c = row.campaign;
            return (
              <Link key={c.id} to={`/workspace/campaigns/${c.id}`} className="block">
                <Card className="p-4 flex flex-wrap items-center gap-4 sm:gap-5 hover:shadow-lift transition-shadow">
                  <ProductImage campaign={c} mini className="h-20 w-20 shrink-0" rounded="rounded-xl" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[15.5px]">{c.productName}</p>
                      <Badge tone={STATUS_TONE[c.status]} className="capitalize">{c.status}</Badge>
                      {!c.published && <Badge>Private</Badge>}
                    </div>
                    <p className="text-[13px] text-ink-muted line-clamp-1 mt-0.5">{c.description}</p>
                    <p className="text-[12.5px] text-ink-soft mt-1.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Users size={13} />{membersOf(d, c.id).length}/{c.slots} creators</span>
                      <span>{applicantsCount(d, c.id)} applications</span>
                      <span>{budgetLabel(c)}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-6 text-right">
                    <Mini v={peso(row.allTimeSpend, { compact: true })} l="Spent" />
                    <Mini v={peso(row.revenue, { compact: true })} l="Sales" />
                    <Mini v={row.orders} l="Orders" />
                    <Mini v={row.roas != null ? `${row.roas.toFixed(1)}×` : '—'} l="ROAS" />
                  </div>
                  <ChevronRight size={18} className="text-ink-muted" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {creating && <CampaignForm open onClose={() => setCreating(false)} onSaved={(id) => nav(`/workspace/campaigns/${id}`)} />}
    </>
  );
}

const Mini = ({ v, l }) => <div><p className="text-[15px] font-bold">{v}</p><p className="text-[11.5px] text-ink-muted">{l}</p></div>;
