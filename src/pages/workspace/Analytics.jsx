import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDollarSign, Wallet, TrendingUp, ShoppingBag, MousePointerClick, Percent, Sparkles, Clock, Receipt, Activity, CheckCircle2, Handshake, Plus, Info, Upload } from 'lucide-react';
import { useDB, userById, campaignById, brandName } from '../../lib/store';
import { businessMetrics, creatorMetrics, getRange, series } from '../../lib/metrics';
import { peso, compact, pct, shortDate } from '../../lib/format';
import { PLATFORMS } from '../../lib/constants';
import { Card, Button, Badge, Avatar, EmptyState } from '../../components/ui';
import { LineChart, Funnel, Progress } from '../../components/charts';
import { LogSaleModal, ImportSalesModal } from '../../components/forms';
import { useMode, ModeToggle, PageHead } from './Layout';
import { PeriodPicker, Kpi, defaultCustom, STATUS_TONE } from './shared';

const roasTxt = (v) => (v != null ? `${v.toFixed(1)}×` : '—');

export default function Analytics() {
  const d = useDB();
  const { mode, me } = useMode();
  const [period, setPeriod] = useState('quarter');
  const [custom, setCustom] = useState(defaultCustom);
  const [logging, setLogging] = useState(false);
  const [importing, setImporting] = useState(false);
  const range = getRange(period, custom);
  const biz = mode === 'business';
  const m = biz ? businessMetrics(d, me.id, range) : creatorMetrics(d, me.id, range);
  const data = series(d, { links: m.links, dels: m.dels, from: range.from, to: range.to, mode: biz ? 'business' : 'creator' });
  const content = m.dels.filter((x) => x.stats && x.submittedAt >= range.from && x.submittedAt <= range.to).sort((a, b) => b.stats.reach - a.stats.reach);

  return (
    <>
      <PageHead title="Analytics" sub={biz ? 'What your creator campaigns actually sell, and what they cost' : 'What your content earns and sells for brands'}
        action={<><ModeToggle />{biz && <Button variant="outline" onClick={() => setImporting(true)} disabled={!m.links.length}><Upload size={16} />Import sales</Button>}{biz && <Button onClick={() => setLogging(true)} disabled={!m.links.length}><Plus size={16} />Log one sale</Button>}</>} />
      <div className="flex justify-end mb-5"><PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} /></div>

      {biz ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={CircleDollarSign} value={peso(m.cur.revenue)} label="Sales from creators" change={m.change.revenue} hint="Orders through tracking links and promo codes" />
            <Kpi icon={Wallet} value={peso(m.cur.spend)} label="Spent on creators" change={m.change.spend} invert hint={`${peso(m.cur.fees)} fees + ${peso(m.cur.commission)} commission`} />
            <Kpi icon={TrendingUp} value={roasTxt(m.cur.roas)} label="Return on spend (ROAS)" change={m.change.roas} tone="green" hint="Sales ÷ spend. Above 1× means creators pay for themselves" />
            <Kpi icon={Receipt} value={m.cur.cpo != null ? peso(m.cur.cpo) : '—'} label="Cost per order" change={m.change.cpo} invert hint="Spend ÷ orders. Compare with your margin per order" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Kpi icon={ShoppingBag} value={m.cur.orders.toLocaleString()} label="Orders" change={m.change.orders} tone="neutral" />
            <Kpi icon={MousePointerClick} value={compact(m.cur.clicks)} label="Link clicks" change={m.change.clicks} tone="neutral" />
            <Kpi icon={Percent} value={pct(m.cur.conversion, 2)} label="Click-to-order rate" change={m.change.conversion} tone="neutral" hint="Low? The product page or price may be the problem, not the creator" />
            <Kpi icon={Sparkles} value={pct(m.cur.engagement)} label="Avg. engagement on content" change={m.change.engagement} tone="neutral" hint={`${compact(m.cur.reach)} people reached`} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Wallet} value={peso(m.cur.earnings)} label="Earnings received" change={m.change.earnings} hint={`${peso(m.cur.paid)} fees + ${peso(m.cur.commission)} commission`} />
            <Kpi icon={Clock} value={peso(m.pendingPayout)} label="Approved, waiting for payment" tone="neutral" hint="Follow up with the brand if it's past 7 days" />
            <Kpi icon={CircleDollarSign} value={peso(m.cur.revenue)} label="Sales you drove for brands" change={m.change.revenue} tone="green" hint="Your best pitch for the next campaign" />
            <Kpi icon={ShoppingBag} value={m.cur.orders.toLocaleString()} label="Orders from your link & code" change={m.change.orders} tone="neutral" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Kpi icon={MousePointerClick} value={compact(m.cur.clicks)} label="Link clicks" change={m.change.clicks} tone="neutral" />
            <Kpi icon={Activity} value={compact(m.cur.reach)} label="Audience reach" change={m.change.reach} tone="neutral" />
            <Kpi icon={Sparkles} value={pct(m.cur.engagement)} label="Engagement rate" change={m.change.engagement} tone="neutral" />
            <Kpi icon={CheckCircle2} value={pct(m.cur.onTimeRate, 0)} label="Delivered on time" tone="neutral" hint={`Acceptance rate: ${pct(m.acceptance, 0)} · ${m.activeCampaigns} active campaigns`} />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mt-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold">{biz ? 'Sales vs. spend' : 'Earnings over time'}</p>
            <span className="text-[12px] text-ink-muted">{data.length > 31 ? 'By month' : data.length > 14 ? 'By day' : 'By day'}</span>
          </div>
          <LineChart data={data} series={biz ? [{ key: 'revenue', label: 'Sales' }, { key: 'spend', label: 'Spend' }] : [{ key: 'earnings', label: 'Earnings' }]} />
        </Card>
        <Card className="p-5">
          <p className="font-bold mb-4">Conversion funnel</p>
          <Funnel steps={[{ label: 'People reached', value: m.cur.reach }, { label: 'Clicked the link', value: m.cur.clicks }, { label: 'Ordered', value: m.cur.orders }]} />
          <p className="text-[12px] text-ink-muted mt-4">Where people drop off tells you what to fix: reach → click is the content, click → order is the product page and price.</p>
        </Card>
      </div>

      {biz ? (
        <>
          <Card className="p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold">Creator leaderboard</p>
              <span className="text-[12px] text-ink-muted">Who actually sells, ranked by sales in this period</span>
            </div>
            {m.perCreator.length === 0 ? <EmptyState icon={Handshake} title="No creators yet" body="Accept creators on a campaign to start tracking." /> : (
              <div className="overflow-x-auto"><table className="w-full text-[13.5px] min-w-[640px]">
                <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line">
                  <th className="py-2 font-medium">Creator</th><th className="font-medium">Campaign</th><th className="font-medium text-right">Clicks</th><th className="font-medium text-right">Orders</th><th className="font-medium text-right">Conv.</th><th className="font-medium text-right">Sales</th><th className="font-medium text-right">Cost</th><th className="font-medium text-right">ROAS</th>
                </tr></thead>
                <tbody>
                  {m.perCreator.map((r) => {
                    const u = userById(d, r.link.creatorId);
                    return (
                      <tr key={r.link.id} className="border-b border-line last:border-0">
                        <td className="py-2.5"><Link to={`/profile/${u.id}`} className="flex items-center gap-2 hover:underline"><Avatar user={u} size={28} />{u.name}</Link></td>
                        <td className="text-ink-soft">{campaignById(d, r.link.campaignId)?.productName} <span className="font-mono text-[11px] text-ink-muted">{r.link.code}</span></td>
                        <td className="text-right">{compact(r.clicks)}</td>
                        <td className="text-right">{r.orders}</td>
                        <td className="text-right">{r.clicks ? pct((r.orders / r.clicks) * 100, 1) : '—'}</td>
                        <td className="text-right font-semibold">{peso(r.revenue)}</td>
                        <td className="text-right">{peso(r.spend)}</td>
                        <td className="text-right"><Badge tone={r.roas == null ? 'neutral' : r.roas >= 1 ? 'green' : 'red'}>{roasTxt(r.roas)}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Card className="p-5">
              <p className="font-bold mb-3">Campaigns</p>
              <div className="space-y-4">
                {m.perCampaign.map((r) => (
                  <div key={r.campaign.id}>
                    <div className="flex items-center justify-between text-[13.5px]">
                      <Link to={`/workspace/campaigns/${r.campaign.id}`} className="font-medium hover:underline">{r.campaign.productName}</Link>
                      <span className="flex items-center gap-2"><span className="text-ink-muted">{peso(r.revenue, { compact: true })} sales · {roasTxt(r.roas)}</span><Badge tone={STATUS_TONE[r.campaign.status]} className="capitalize">{r.campaign.status}</Badge></span>
                    </div>
                    {r.budget > 0 ? (
                      <div className="flex items-center gap-3 mt-1.5">
                        <Progress value={(r.allTimeSpend / r.budget) * 100} className="flex-1" />
                        <span className="text-[12px] text-ink-muted w-36 text-right">{peso(r.allTimeSpend, { compact: true })} of {peso(r.budget, { compact: true })} budget</span>
                      </div>
                    ) : <p className="text-[12px] text-ink-muted mt-1">{r.campaign.compensation === 'gifted' ? 'Product gifting' : 'Commission only'} · {peso(r.allTimeSpend)} paid out</p>}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="font-bold mb-3">Payments to creators</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-canvas p-3"><p className="text-[12px] text-ink-muted">Paid this period</p><p className="text-[20px] font-bold">{peso(m.cur.paid)}</p></div>
                <div className="rounded-xl bg-brand-softer p-3"><p className="text-[12px] text-ink-muted">Owed for approved work</p><p className="text-[20px] font-bold">{peso(m.owed)}</p></div>
                <div className="rounded-xl bg-canvas p-3"><p className="text-[12px] text-ink-muted">Commission accrued</p><p className="text-[20px] font-bold">{peso(m.cur.commission)}</p></div>
                <div className="rounded-xl bg-canvas p-3"><p className="text-[12px] text-ink-muted">Content awaiting approval</p><p className="text-[20px] font-bold">{m.toReview}</p></div>
              </div>
              <Link to="/workspace/collabs" className="text-[13px] text-brand-dark mt-3 inline-block">Approve and pay in Creators →</Link>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-5 mt-4">
          <p className="font-bold mb-3">By campaign</p>
          {m.perCampaign.length === 0 ? <EmptyState title="No campaigns yet" /> : (
            <div className="overflow-x-auto"><table className="w-full text-[13.5px] min-w-[640px]">
              <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line">
                <th className="py-2 font-medium">Campaign</th><th className="font-medium">Your code</th><th className="font-medium text-right">Clicks</th><th className="font-medium text-right">Orders</th><th className="font-medium text-right">Sales driven</th><th className="font-medium text-right">Earned</th><th className="font-medium text-right">Pending</th>
              </tr></thead>
              <tbody>
                {m.perCampaign.map((r) => (
                  <tr key={r.campaign.id} className="border-b border-line last:border-0">
                    <td className="py-2.5"><Link to={`/opportunity/${r.campaign.id}`} className="font-medium hover:underline">{r.campaign.productName}</Link><span className="block text-[12px] text-ink-muted">{brandName(userById(d, r.campaign.ownerId))}</span></td>
                    <td className="font-mono text-[12px]">{r.link?.code}</td>
                    <td className="text-right">{compact(r.clicks)}</td>
                    <td className="text-right">{r.orders}</td>
                    <td className="text-right">{peso(r.revenue)}</td>
                    <td className="text-right font-semibold">{peso(r.earned)}</td>
                    <td className="text-right">{peso(r.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          <p className="text-[12px] text-ink-muted mt-3">All-time totals per campaign. The cards above follow the selected period.</p>
        </Card>
      )}

      <Card className="p-5 mt-4">
        <p className="font-bold mb-3">Content performance</p>
        {content.length === 0 ? <p className="text-[13px] text-ink-muted">No posts went live in this period.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-[13.5px] min-w-[640px]">
            <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line">
              <th className="py-2 font-medium">Content</th><th className="font-medium">{biz ? 'Creator' : 'Brand'}</th><th className="font-medium">Posted</th><th className="font-medium text-right">Reach</th><th className="font-medium text-right">Likes</th><th className="font-medium text-right">Comments</th><th className="font-medium text-right">Shares</th><th className="font-medium text-right">Saves</th><th className="font-medium text-right">Eng. rate</th>
            </tr></thead>
            <tbody>
              {content.slice(0, 12).map((x) => {
                const other = biz ? userById(d, x.creatorId) : userById(d, campaignById(d, x.campaignId)?.ownerId);
                const eng = ((x.stats.likes + x.stats.comments + x.stats.shares + x.stats.saves) / Math.max(1, x.stats.reach)) * 100;
                return (
                  <tr key={x.id} className="border-b border-line last:border-0">
                    <td className="py-2.5"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: PLATFORMS[x.platform]?.color }} />{campaignById(d, x.campaignId)?.productName} · {x.type}</span></td>
                    <td className="text-ink-soft">{biz ? other?.name : brandName(other)}</td>
                    <td className="text-ink-muted">{shortDate(x.submittedAt)}</td>
                    <td className="text-right">{compact(x.stats.reach)}</td>
                    <td className="text-right">{compact(x.stats.likes)}</td>
                    <td className="text-right">{compact(x.stats.comments)}</td>
                    <td className="text-right">{compact(x.stats.shares)}</td>
                    <td className="text-right">{compact(x.stats.saves)}</td>
                    <td className="text-right font-semibold">{eng.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>

      <p className="text-[12px] text-ink-muted mt-4 flex items-start gap-1.5"><Info size={14} className="shrink-0 mt-px" />
        Sales are credited when a buyer uses a creator's tracking link or promo code. Spend counts a fee when the brand approves the content, and commission when the sale happens. Engagement = (likes + comments + shares + saves) ÷ reach.
      </p>
      {logging && <LogSaleModal open links={m.links} onClose={() => setLogging(false)} />}
      {importing && <ImportSalesModal onClose={() => setImporting(false)} />}
    </>
  );
}
