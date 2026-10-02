import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert, Users, Store, MessageSquare, BadgeCheck, Ban, Star, Trash2, Check, Wallet, Search } from 'lucide-react';
import { useDB, userById, campaignById, actions, isAdmin, displayName, walletOf, reactionTotal } from '../lib/store';
import { peso, timeAgo, compact } from '../lib/format';
import { RevenuePanel, RetailPanel } from './AdminRevenue';
import { HealthPanel, VerificationsPanel, ApprovalsPanel, DisputesPanel, ConciergePanel, SupportPanel } from './AdminPanels';
import { Card, Button, Badge, Avatar, Segmented, EmptyState, IconTile, useAct, useConfirm, cx } from '../components/ui';

function target(d, r) {
  if (r.kind === 'campaign') { const c = campaignById(d, r.refId); return c ? { label: c.productName, link: `/opportunity/${c.id}`, gone: c.removed } : { label: 'Deleted listing', gone: true }; }
  if (r.kind === 'post') { const p = d.posts.find((x) => x.id === r.refId); return p ? { label: p.title, link: `/community/${p.id}` } : { label: 'Removed post', gone: true }; }
  const u = userById(d, r.refId);
  return { label: u ? displayName(u) : 'Unknown user', link: `/profile/${r.refId}`, gone: u?.suspended };
}

export default function Admin() {
  const d = useDB();
  const act = useAct();
  const ask = useConfirm();
  const [tab, setTab] = useState('health');
  const [q, setQ] = useState('');
  if (!isAdmin(d)) return <Navigate to="/" replace />;

  const open = d.reports.filter((r) => r.status === 'open');
  const escrowHeld = d.deliverables.filter((x) => x.escrow === 'held').reduce((a, x) => a + x.fee, 0);
  const fees = d.transactions.filter((t) => t.type === 'fund').reduce((a, t) => a + Math.round(-t.amount * (0.05 / 1.05)), 0);
  const stats = [
    [ShieldAlert, open.length, 'Open reports', 'rose'],
    [Users, d.users.length, `Users · ${d.users.filter((u) => u.verified).length} verified`, 'brand'],
    [Store, d.campaigns.filter((c) => !c.removed).length, 'Live listings', 'blue'],
    [Wallet, peso(escrowHeld, { compact: true }), 'Held safely by Buzz', 'green'],
    [Wallet, peso(fees, { compact: true }), 'Service fees earned', 'violet'],
  ];
  const needle = q.toLowerCase();

  const takeDown = async (r) => {
    const t = target(d, r);
    if (!(await ask({ title: 'Take this down?', body: `"${t.label}" will be ${r.kind === 'user' ? 'suspended' : 'removed'} and the owner notified.`, confirm: 'Take down', danger: true }))) return;
    act(() => {
      if (r.kind === 'campaign') actions.adminCampaign(r.refId, { removed: true });
      else if (r.kind === 'post') actions.adminRemovePost(r.refId);
      else actions.adminUser(r.refId, { suspended: true });
      actions.resolveReport(r.id, 'actioned');
    }, 'Done. The owner was notified.');
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-dark">Admin</p>
          <h1 className="text-[28px] font-bold">Trust & Safety</h1>
          <p className="text-ink-muted">Review reports, verify people and keep fake listings off Buzz.</p>
        </div>
        <Segmented value={tab} onChange={setTab} size="sm" options={[
          { id: 'health', label: 'Health' },
          { id: 'revenue', label: 'Revenue' },
          { id: 'retail', label: `Retail & partners · ${d.users.filter((u) => u.buyer && !u.buyer.verified).length + d.partnerLeads.filter((l) => l.status === 'new').length}` },
          { id: 'reports', label: `Reports · ${open.length}` },
          { id: 'verify', label: `Verify · ${d.verifications.filter((v) => v.status === 'pending').length}` },
          { id: 'approvals', label: `Creators · ${d.users.filter((u) => u.creator && u.approved === false).length}` },
          { id: 'disputes', label: `Disputes · ${d.disputes.filter((x) => x.status !== 'resolved').length}` },
          { id: 'concierge', label: `Hand-pick · ${d.concierge.filter((x) => x.status === 'open').length}` },
          { id: 'support', label: `Support · ${d.tickets.filter((t) => t.status === 'open').length}` },
          { id: 'users', label: 'Users' }, { id: 'listings', label: 'Listings' }, { id: 'posts', label: 'Posts' }, { id: 'features', label: 'Features' }]} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
        {stats.map(([Icon, v, l, tone]) => (
          <Card key={l} className="p-4 flex items-center gap-3"><IconTile icon={Icon} tone={tone} /><div className="min-w-0"><p className="text-[18px] font-bold leading-tight">{v}</p><p className="text-[12px] text-ink-muted truncate">{l}</p></div></Card>
        ))}
      </div>

      {['users', 'listings', 'posts'].includes(tab) && (
        <div className="relative mt-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input id="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full h-10 pl-9 pr-3 rounded-xl border border-line-strong bg-white text-sm focus:outline-none focus:border-brand" />
        </div>
      )}

      {tab === 'health' && <HealthPanel />}
      {tab === 'revenue' && <RevenuePanel />}
      {tab === 'retail' && <RetailPanel />}
      {tab === 'verify' && <VerificationsPanel />}
      {tab === 'approvals' && <ApprovalsPanel />}
      {tab === 'disputes' && <DisputesPanel />}
      {tab === 'concierge' && <ConciergePanel />}
      {tab === 'support' && <SupportPanel />}
      {tab === 'reports' && (
        <div className="space-y-3 mt-6">
          {d.reports.length === 0 && <Card><EmptyState icon={ShieldAlert} title="No reports" /></Card>}
          {d.reports.map((r) => {
            const t = target(d, r);
            const by = userById(d, r.reporterId);
            return (
              <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.status === 'open' ? 'red' : 'neutral'}>{r.status === 'open' ? 'Open' : r.status === 'actioned' ? 'Taken down' : 'Dismissed'}</Badge>
                    <Badge>{r.kind === 'campaign' ? 'Listing' : r.kind === 'post' ? 'Community post' : 'Profile'}</Badge>
                    <span className="font-semibold text-[14px]">{r.reason}</span>
                  </div>
                  <p className="text-[13.5px] mt-1.5">{t.link && !t.gone ? <Link to={t.link} className="text-brand-dark hover:underline">{t.label}</Link> : <span className="text-ink-muted">{t.label}</span>}</p>
                  {r.note && <p className="text-[13px] text-ink-soft mt-1">"{r.note}"</p>}
                  <p className="text-[12px] text-ink-muted mt-1">Reported by {displayName(by)} · {timeAgo(r.ts)}</p>
                </div>
                {r.status === 'open' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => act(() => actions.resolveReport(r.id, 'dismissed'), 'Report dismissed')}><Check size={14} />Dismiss</Button>
                    <Button size="sm" variant="dark" onClick={() => takeDown(r)}><Ban size={14} />Take down</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'users' && (
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[720px]">
            <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line"><th className="py-3 px-4 font-medium">Person</th><th className="font-medium">Role</th><th className="font-medium">Joined</th><th className="font-medium text-right">Wallet</th><th className="font-medium text-right px-4">Actions</th></tr></thead>
            <tbody>
              {d.users.filter((u) => `${u.name} ${u.email} ${u.business?.name || ''}`.toLowerCase().includes(needle)).map((u) => (
                <tr key={u.id} className={cx('border-b border-line last:border-0', u.suspended && 'opacity-60')}>
                  <td className="py-2.5 px-4"><Link to={`/profile/${u.id}`} className="flex items-center gap-2.5 hover:underline"><Avatar user={u} size={30} /><span><span className="flex items-center gap-1 font-medium">{u.name}{u.verified && <BadgeCheck size={14} className="text-sky-600" />}</span><span className="text-[12px] text-ink-muted">{u.email}</span></span></Link></td>
                  <td className="text-ink-soft">{[u.creator && `Creator (${compact((u.creator.platforms || []).reduce((a, p) => a + Number(p.followers || 0), 0))})`, u.business && u.business.name, u.admin && 'Admin'].filter(Boolean).join(' · ')}</td>
                  <td className="text-ink-muted">{timeAgo(u.joinedAt)}</td>
                  <td className="text-right">{peso(walletOf(d, u.id).balance)}</td>
                  <td className="text-right px-4 whitespace-nowrap">
                    <Button size="sm" variant={u.verified ? 'soft' : 'outline'} className="h-7 text-[12px]" onClick={() => act(() => actions.adminUser(u.id, { verified: !u.verified }), u.verified ? 'Badge removed' : 'Verified')}><BadgeCheck size={13} />{u.verified ? 'Verified' : 'Verify'}</Button>
                    {!u.admin && <Button size="sm" variant="ghost" className="h-7 text-[12px] ml-1" onClick={() => act(() => actions.adminUser(u.id, { suspended: !u.suspended }), u.suspended ? 'Account restored' : 'Account suspended')}><Ban size={13} />{u.suspended ? 'Restore' : 'Suspend'}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'listings' && (
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[680px]">
            <thead><tr className="text-left text-[12px] text-ink-muted border-b border-line"><th className="py-3 px-4 font-medium">Listing</th><th className="font-medium">Brand</th><th className="font-medium">Status</th><th className="font-medium text-right px-4">Actions</th></tr></thead>
            <tbody>
              {d.campaigns.filter((c) => `${c.productName} ${c.title}`.toLowerCase().includes(needle)).map((c) => (
                <tr key={c.id} className={cx('border-b border-line last:border-0', c.removed && 'opacity-60')}>
                  <td className="py-2.5 px-4"><Link to={`/opportunity/${c.id}`} className="font-medium hover:underline">{c.productName}</Link>{c.featured && <Badge tone="soft" className="ml-2">Featured</Badge>}<span className="block text-[12px] text-ink-muted truncate max-w-xs">{c.title}</span></td>
                  <td className="text-ink-soft">{userById(d, c.ownerId)?.business?.name}</td>
                  <td>{c.removed ? <Badge tone="red">Removed</Badge> : <Badge className="capitalize">{c.status}</Badge>}</td>
                  <td className="text-right px-4 whitespace-nowrap">
                    <Button size="sm" variant={c.featured ? 'soft' : 'outline'} className="h-7 text-[12px]" onClick={() => act(() => actions.adminCampaign(c.id, { featured: !c.featured }), c.featured ? 'Unfeatured' : 'Featured on Discover')}><Star size={13} />{c.featured ? 'Featured' : 'Feature'}</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[12px] ml-1" onClick={() => act(() => actions.adminCampaign(c.id, { removed: !c.removed }), c.removed ? 'Listing restored' : 'Listing removed')}><Trash2 size={13} />{c.removed ? 'Restore' : 'Remove'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'features' && (
        <Card className="mt-6 p-5 max-w-2xl">
          <p className="font-bold text-[16px]">Extra growth tools</p>
          <p className="text-[13px] text-ink-muted mt-0.5">Brand swaps and customer creators. On "Automatic" each brand sees them only after finishing its first collab, so new sellers aren't overwhelmed.</p>
          <div className="mt-4"><Segmented size="sm" value={d.flags.growTools || 'auto'} onChange={(v) => act(() => actions.setFlag('growTools', v), 'Saved')}
            options={[{ id: 'auto', label: 'Automatic' }, { id: 'on', label: 'Everyone' }, { id: 'off', label: 'Off' }]} /></div>
        </Card>
      )}

      {tab === 'posts' && (
        <div className="space-y-3 mt-4">
          {d.posts.filter((p) => `${p.title} ${p.body}`.toLowerCase().includes(needle)).map((p) => (
            <Card key={p.id} className="p-4 flex items-start gap-3">
              <MessageSquare size={17} className="text-ink-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link to={`/community/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
                <p className="text-[12.5px] text-ink-muted">{p.anonymous ? 'Anonymous' : displayName(userById(d, p.authorId))} · {timeAgo(p.createdAt)} · {reactionTotal(p)} likes · {p.comments.length} replies</p>
              </div>
              <Button size="sm" variant="ghost" onClick={async () => { if (await ask({ title: 'Remove this post?', body: 'The author is notified.', confirm: 'Remove', danger: true })) act(() => actions.adminRemovePost(p.id), 'Post removed'); }}><Trash2 size={14} /></Button>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
