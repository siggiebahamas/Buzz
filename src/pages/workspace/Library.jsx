import { useState } from 'react';
import { ExternalLink, Library as LibraryIcon } from 'lucide-react';
import { useDB, userById, campaignById, actions } from '../../lib/store';
import { isOn, setting } from '../../lib/monetize';
import { PLATFORMS } from '../../lib/constants';
import { compact, shortDate, DAY, peso } from '../../lib/format';
import { Card, Badge, Avatar, EmptyState, Select, Button, Modal, Field, Input, useAct } from '../../components/ui';
import { ProductImage } from '../../components/visuals';
import { useMode, PageHead } from './Layout';

const RIGHT_DAYS = { '30 days': 30, '60 days': 60, '90 days': 90, '1 year': 365, None: 0 };

// Content brands paid for, with how long they may reuse it.
export default function Library() {
  const d = useDB();
  const { me } = useMode();
  const [filter, setFilter] = useState('all');
  const [extend, setExtend] = useState(null);
  const licensing = isOn(d, 'contentLicensing');
  const mine = new Set(d.campaigns.filter((c) => c.ownerId === me.id).map((c) => c.id));
  const items = d.deliverables.filter((x) => mine.has(x.campaignId) && x.status === 'approved' && x.contentUrl)
    .map((x) => {
      const c = campaignById(d, x.campaignId);
      const days = RIGHT_DAYS[c.contentRights] ?? 90;
      const until = Math.max((x.submittedAt || x.approvedAt) + days * DAY, x.rightsUntil || 0);
      return { x, c, until, active: (days > 0 || x.rightsUntil) && until > Date.now() };
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
                  {licensing && <Button size="sm" variant="outline" className="mt-3" onClick={() => setExtend(x)}>{active ? 'Extend reuse rights' : 'Buy reuse rights'}</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-[12.5px] text-ink-muted mt-4">{licensing ? 'Want to keep using a post? Buy more reuse time right here; the creator is paid instantly.' : 'Want to use a post after its rights end? Message the creator and agree on a new fee.'} Reusing content without rights can get your ads taken down.</p>
      {extend && <ExtendModal x={extend} onClose={() => setExtend(null)} />}
    </>
  );
}

function ExtendModal({ x, onClose }) {
  const d = useDB();
  const act = useAct();
  const [months, setMonths] = useState(3);
  const [price, setPrice] = useState(Math.max(300, Math.round(x.fee * 0.3 * (months / 3))));
  const cut = Math.round(Number(price || 0) * setting(d, 'contentLicensing', 'pct') / 100);
  const u = userById(d, x.creatorId);
  return (
    <Modal open onClose={onClose} title="Buy reuse rights" subtitle={`${x.title} · by ${u?.name}`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="How long"><Select value={months} onChange={(e) => { const m = Number(e.target.value); setMonths(m); setPrice(Math.max(300, Math.round(x.fee * 0.3 * (m / 3)))); }}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></Select></Field>
        <Field label="Pay the creator (₱)" hint="Suggested: about 30% of the original fee per 3 months"><Input type="number" min="300" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      </div>
      <div className="rounded-xl bg-canvas p-3 mt-4 text-[13.5px] space-y-1">
        <p className="flex justify-between"><span>To {u?.name}</span><b>{peso(Number(price) || 0)}</b></p>
        <p className="flex justify-between text-ink-muted"><span>Buzz licensing fee</span><span>{peso(cut)}</span></p>
        <p className="flex justify-between border-t border-line pt-1 font-bold"><span>Total</span><span>{peso((Number(price) || 0) + cut)}</span></p>
      </div>
      <p className="text-[12px] text-ink-muted mt-2">Test mode: no card is charged.</p>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.extendRights(x.id, months, price), 'Rights extended. The creator was paid.')) onClose(); }}>Pay {peso((Number(price) || 0) + cut)}</Button>
    </Modal>
  );
}
