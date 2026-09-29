import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Handshake, BarChart3, Rocket, Wallet, TrendingUp, ShoppingBag, MousePointerClick, FileText, Clock, Sparkles, Activity, CircleDollarSign, ChevronRight, AlertCircle, Bell } from 'lucide-react';
import { useDB, userById, campaignById } from '../../lib/store';
import { businessMetrics, creatorMetrics, getRange } from '../../lib/metrics';
import { peso, compact, pct, timeAgo, shortDate, dueLabel } from '../../lib/format';
import { PLATFORMS } from '../../lib/constants';
import { Card, IconTile, Avatar, cx } from '../../components/ui';
import { useMode, ModeToggle, PageHead } from './Layout';
import { PeriodPicker, Kpi, defaultCustom } from './shared';

export default function Overview() {
  const d = useDB();
  const { mode, me } = useMode();
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState(defaultCustom);
  const range = getRange(period, custom);
  const biz = mode === 'business';
  const m = biz ? businessMetrics(d, me.id, range) : creatorMetrics(d, me.id, range);

  const journey = biz ? [
    [Search, 'Find Influencers', 'Discover creators who match your brand and target audience.', 'Find Influencers', '/opportunities?as=business'],
    [Handshake, 'Review & Connect', 'Evaluate creator proposals and agree on fees and deliverables.', 'View Proposals', '/workspace/collaborations'],
    [BarChart3, 'Manage Campaigns', 'Launch campaigns, approve content and keep payments on track.', 'Go to Campaigns', '/workspace/campaigns'],
    [Rocket, 'Measure Results', 'Track sales, return on spend and cost per order by creator.', 'View Analytics', '/workspace/analytics'],
  ] : [
    [Search, 'Find Business Owners', 'Discover local products that fit your content and audience.', 'Find Opportunities', '/opportunities?as=creator'],
    [Handshake, 'Review & Connect', 'Track your applications and answer brand invites.', 'View Proposals', '/workspace/collaborations'],
    [BarChart3, 'Manage Campaigns', 'Deliver content on time with clear tasks and due dates.', 'Go to Deliverables', '/workspace/deliverables'],
    [Rocket, 'Measure Results', 'See the clicks, sales and earnings your content drives.', 'View Analytics', '/workspace/analytics'],
  ];

  const attention = biz ? [
    [m.pendingApps, 'applications to review', '/workspace/collaborations'],
    [m.toReview, 'deliverables to approve', '/workspace/deliverables'],
    [m.owed ? peso(m.owed) : 0, 'owed to creators for approved work', '/workspace/deliverables'],
  ] : [
    [m.invites, 'brand invites to answer', '/workspace/collaborations'],
    [m.overdue, 'overdue deliverables', '/workspace/deliverables'],
    [m.pendingPayout ? peso(m.pendingPayout) : 0, 'approved and waiting for payment', '/workspace/deliverables'],
  ];

  const kpis = biz ? [
    [CircleDollarSign, peso(m.cur.revenue, { compact: true }), 'Sales from creators', m.change.revenue],
    [TrendingUp, m.cur.roas != null ? `${m.cur.roas.toFixed(1)}×` : '—', 'Return on spend', m.change.roas],
    [ShoppingBag, m.cur.orders.toLocaleString(), 'Orders', m.change.orders],
    [MousePointerClick, compact(m.cur.clicks), 'Link clicks', m.change.clicks],
    [Wallet, m.cur.cpo != null ? peso(m.cur.cpo) : '—', 'Cost per order', m.change.cpo, true],
  ] : [
    [Wallet, peso(m.cur.earnings, { compact: true }), 'Earnings received', m.change.earnings],
    [Clock, m.dueThisWeek, 'Content due this week', undefined],
    [ShoppingBag, m.cur.orders.toLocaleString(), 'Sales you drove', m.change.orders],
    [Activity, compact(m.cur.reach), 'Audience reach', m.change.reach],
    [Sparkles, pct(m.cur.engagement), 'Engagement rate', m.change.engagement],
  ];

  // Activity, deliverables and top content come straight from records.
  const activity = d.notifications.filter((n) => n.userId === me.id).slice(0, 5);
  const myCampIds = new Set(d.campaigns.filter((c) => c.ownerId === me.id).map((c) => c.id));
  const relevantDels = d.deliverables.filter((x) => (biz ? myCampIds.has(x.campaignId) : x.creatorId === me.id));
  const upcoming = relevantDels.filter((x) => ['todo', 'revision', 'submitted'].includes(x.status)).sort((a, b) => a.dueAt - b.dueAt).slice(0, 4);
  const top = relevantDels.filter((x) => x.stats).sort((a, b) => b.stats.reach - a.stats.reach).slice(0, 4);

  return (
    <>
      <PageHead title="My Workspace" sub={`Welcome back, ${me.name.split(' ')[0]}`} action={<ModeToggle />} />
      <h2 className="text-[20px] font-bold mb-4">Your {biz ? 'Business' : 'Influencer'} Journey</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {journey.map(([Icon, t, s, cta, to], i) => (
          <Card key={t} className="p-5 flex flex-col">
            <div className="flex items-start justify-between"><IconTile icon={Icon} size="lg" /><span className="text-[26px] font-bold text-[#EDE6DA]">{i + 1}</span></div>
            <p className="font-bold text-[15.5px] mt-4">{t}</p>
            <p className="text-[13px] text-ink-muted mt-1 flex-1">{s}</p>
            <Link to={to} className="mt-4 h-10 rounded-xl bg-brand-soft hover:bg-[#FCE7C4] text-[13.5px] font-medium grid place-items-center">{cta}</Link>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-line px-5 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold"><AlertCircle size={17} className="text-brand-dark" />Needs your attention</span>
        {attention.map(([v, l, to]) => (
          <Link key={l} to={to} className={cx('text-[13.5px] hover:underline', v ? 'text-ink' : 'text-ink-faint')}><b>{v || 0}</b> {l}</Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mt-9 mb-4">
        <h2 className="text-[20px] font-bold">Important Metrics at a Glance</h2>
        <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(([icon, v, l, ch, inv]) => <Kpi key={l} icon={icon} value={v} label={l} change={ch} invert={inv} />)}
      </div>
      <p className="text-[12px] text-ink-muted mt-2">Trends compare with the previous period of the same length. <Link to="/workspace/analytics" className="text-brand-dark">See full analytics</Link></p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <Card className="p-5">
          <p className="font-bold mb-3 flex items-center gap-2"><Bell size={16} className="text-brand-dark" />Recent Activity</p>
          {activity.length === 0 && <p className="text-[13px] text-ink-muted">Nothing yet.</p>}
          <div className="space-y-3">
            {activity.map((n) => (
              <Link key={n.id} to={n.link} className="flex gap-3 group">
                <span className={cx('mt-1.5 h-2 w-2 rounded-full shrink-0', n.read ? 'bg-line-strong' : 'bg-brand')} />
                <span><span className="block text-[13.5px] leading-snug group-hover:underline">{n.text}</span><span className="text-[12px] text-ink-muted">{timeAgo(n.ts)}</span></span>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="font-bold mb-3 flex items-center gap-2"><FileText size={16} className="text-brand-dark" />Upcoming Deliverables</p>
          {upcoming.length === 0 && <p className="text-[13px] text-ink-muted">No open deliverables.</p>}
          <div className="space-y-3">
            {upcoming.map((x) => {
              const late = x.dueAt < Date.now() && x.status !== 'submitted';
              return (
                <Link to="/workspace/deliverables" key={x.id} className="flex items-center gap-3">
                  <span className={cx('h-11 w-11 rounded-xl grid place-items-center text-[13px] font-bold shrink-0', late ? 'bg-rose-50 text-rose-600' : 'bg-canvas text-ink-soft')}>{new Date(x.dueAt).getDate()}</span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] truncate">{x.title}</span>
                    <span className={cx('text-[12px]', late ? 'text-rose-600' : 'text-ink-muted')}>{biz ? `${userById(d, x.creatorId)?.name} · ` : ''}{x.status === 'submitted' ? 'Awaiting approval' : dueLabel(x.dueAt)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <p className="font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-brand-dark" />Top Performing Content</p>
          {top.length === 0 && <p className="text-[13px] text-ink-muted">Content stats appear once posts go live.</p>}
          <div className="space-y-3">
            {top.map((x) => {
              const eng = ((x.stats.likes + x.stats.comments + x.stats.shares + x.stats.saves) / Math.max(1, x.stats.reach)) * 100;
              const who = userById(d, x.creatorId);
              return (
                <div key={x.id} className="flex items-center gap-3">
                  {biz ? <Avatar user={who} size={40} /> : <IconTile icon={Sparkles} />}
                  <div className="min-w-0">
                    <p className="text-[13.5px] truncate">{biz ? `${who?.name}: ` : ''}{campaignById(d, x.campaignId)?.productName} {x.type}</p>
                    <p className="text-[12px] text-ink-muted">{PLATFORMS[x.platform]?.label} · {compact(x.stats.reach)} reach · {eng.toFixed(1)}% eng. · {shortDate(x.submittedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/workspace/analytics" className="text-[13px] text-brand-dark inline-flex items-center gap-0.5 mt-4">View all content <ChevronRight size={14} /></Link>
        </Card>
      </div>
    </>
  );
}
