import { useState } from 'react';
import { ExternalLink, Library as LibraryIcon } from 'lucide-react';
import { useDB, userById, campaignById } from '../../lib/store';
import { PLATFORMS } from '../../lib/constants';
import { compact, shortDate, DAY } from '../../lib/format';
import { Card, Badge, Avatar, EmptyState, Select } from '../../components/ui';
import { ProductImage } from '../../components/visuals';
import { useMode, PageHead } from './Layout';

const RIGHT_DAYS = { '30 days': 30, '60 days': 60, '90 days': 90, '1 year': 365, None: 0 };

// Content brands paid for, with how long they may reuse it.
export default function Library() {
  const d = useDB();
  const { me } = useMode();
  const [filter, setFilter] = useState('all');
  const mine = new Set(d.campaigns.filter((c) => c.ownerId === me.id).map((c) => c.id));
  const items = d.deliverables.filter((x) => mine.has(x.campaignId) && x.status === 'approved' && x.contentUrl)
    .map((x) => {
      const c = campaignById(d, x.campaignId);
      const days = RIGHT_DAYS[c.contentRights] ?? 90;
      const until = (x.submittedAt || x.approvedAt) + days * DAY;
      return { x, c, until, active: days > 0 && until > Date.now() };
    })
    .filter((i) => filter === 'all' || (filter === 'active' ? i.active : !i.active))
    .sort((a, b) => b.x.approvedAt - a.x.approvedAt);
  return (
    <>
      <PageHead title="Content library" sub="Every approved post from your creators, and how long you can reuse it on your pages and ads"
        action={<div className="w-48"><Select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All content</option><option value="active">Rights active</option><option value="expired">Rights ended</option></Select></div>} />
      {items.length === 0 ? <Card><EmptyState icon={LibraryIcon} title="Nothing here yet" body="Approved content from your campaigns shows up here automatically." /></Card> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ x, c, until, active }) => {
            const u = userById(d, x.creatorId);
            const eng = x.stats ? ((x.stats.likes + x.stats.comments + x.stats.shares + x.stats.saves) / Math.max(1, x.stats.reach)) * 100 : null;
            return (
              <Card key={x.id} className="overflow-hidden flex flex-col">
                <div className="relative">
                  <ProductImage campaign={c} className="aspect-[4/3]" />
                  <span className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: PLATFORMS[x.platform]?.color }}>{PLATFORMS[x.platform]?.label} · {x.type}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-semibold">{c.productName}</p>
                  <p className="text-[12.5px] text-ink-muted flex items-center gap-1.5 mt-0.5"><Avatar user={u} size={18} />{u?.name} · {shortDate(x.submittedAt)}</p>
                  {x.stats && <p className="text-[12.5px] text-ink-soft mt-2">{compact(x.stats.reach)} reach · {eng.toFixed(1)}% engagement</p>}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    {active ? <Badge tone="green">You can reuse until {shortDate(until)}</Badge> : <Badge>{c.contentRights === 'None' ? 'Link only, no reuse' : 'Reuse rights ended'}</Badge>}
                    <a href={x.contentUrl} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-dark inline-flex items-center gap-1">Open <ExternalLink size={12} /></a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-[12.5px] text-ink-muted mt-4">Want to use a post after its rights end? Message the creator and agree on a new fee. Reusing content without rights can get your ads taken down.</p>
    </>
  );
}
