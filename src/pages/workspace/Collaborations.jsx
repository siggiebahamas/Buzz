import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, MessageCircle, Handshake } from 'lucide-react';
import { useDB, userById, campaignById, displayName, brandName, actions } from '../../lib/store';
import { peso, timeAgo } from '../../lib/format';
import { matchScore } from '../../lib/match';
import { ProductImage, MatchPill } from '../../components/visuals';
import { Card, Button, Badge, Avatar, EmptyState, cx, useAct } from '../../components/ui';
import { useChat } from '../../components/Shell';
import { useMode, ModeToggle, PageHead } from './Layout';

const STATUS = {
  pending: ['Pending', 'soft'], invited: ['Invited', 'violet'], accepted: ['Active partner', 'green'], declined: ['Declined', 'neutral'], withdrawn: ['Withdrawn', 'neutral'],
};

export default function Collaborations() {
  const d = useDB();
  const act = useAct();
  const chat = useChat();
  const { mode, me } = useMode();
  const biz = mode === 'business';
  const mine = biz
    ? d.applications.filter((a) => campaignById(d, a.campaignId)?.ownerId === me.id)
    : d.applications.filter((a) => a.creatorId === me.id);
  const groups = biz ? [
    ['review', 'To review', (a) => a.status === 'pending'],
    ['invited', 'Invites sent', (a) => a.status === 'invited'],
    ['active', 'Active partners', (a) => a.status === 'accepted'],
    ['closed', 'Closed', (a) => ['declined', 'withdrawn'].includes(a.status)],
  ] : [
    ['invites', 'Brand invites', (a) => a.status === 'invited'],
    ['sent', 'Applications sent', (a) => a.status === 'pending'],
    ['active', 'Active', (a) => a.status === 'accepted'],
    ['closed', 'Closed', (a) => ['declined', 'withdrawn'].includes(a.status)],
  ];
  const [tab, setTab] = useState(groups[0][0]);
  const current = groups.find((g) => g[0] === tab) || groups[0];
  // Brands review the strongest fits first; everything else is newest first.
  const fitOf = (a) => matchScore(userById(d, a.creatorId), campaignById(d, a.campaignId), { brand: true, d }).score || 0;
  const rows = mine.filter(current[2]).sort((a, b) => (biz && a.status === 'pending' ? fitOf(b) - fitOf(a) : b.createdAt - a.createdAt));

  return (
    <>
      <PageHead title="Collaborations" sub={biz ? 'Applications, invites and partners across your campaigns' : 'Your applications, brand invites and partnerships'} action={<ModeToggle />} />
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {groups.map(([id, label, f]) => {
          const n = mine.filter(f).length;
          return (
            <button key={id} onClick={() => setTab(id)} className={cx('h-9 px-4 rounded-full text-[13.5px] border inline-flex items-center gap-2 whitespace-nowrap', tab === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>
              {label}<span className={cx('text-[11.5px] px-1.5 rounded-full', tab === id ? 'bg-white/20' : 'bg-canvas')}>{n}</span>
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <Card><EmptyState icon={Handshake} title="Nothing here yet" body={biz ? 'Applications to your campaigns will show up here.' : 'Apply to opportunities and your applications will show up here.'} action={<Link to={biz ? '/opportunities?as=business' : '/opportunities?as=creator'}><Button variant="outline">{biz ? 'Find creators' : 'Find opportunities'}</Button></Link>} /></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const c = campaignById(d, a.campaignId);
            const creator = userById(d, a.creatorId);
            const owner = userById(d, c.ownerId);
            const other = biz ? creator : owner;
            const m = matchScore(creator, c, { brand: true, d });
            const [label, tone] = STATUS[a.status];
            return (
              <Card key={a.id} className="p-4 flex flex-wrap sm:flex-nowrap items-start gap-4">
                <ProductImage campaign={c} mini className="h-16 w-16 shrink-0" rounded="rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={biz ? `/workspace/campaigns/${c.id}` : `/opportunity/${c.id}`} className="font-bold hover:underline">{c.productName}</Link>
                    <Badge tone={tone}>{label}</Badge>
                    {a.source === 'invite' && a.status !== 'invited' && <Badge tone="violet">Via invite</Badge>}
                  </div>
                  <Link to={`/profile/${other.id}`} className="flex items-center gap-2 mt-1.5 text-[13px] hover:underline w-fit">
                    <Avatar user={other} size={22} />{biz ? other.name : brandName(other)}{biz && <span className="text-ink-muted">@{creator.creator.handle}</span>}
                  </Link>
                  {a.pitch && <p className="text-[13.5px] text-ink-soft mt-2">"{a.pitch}"</p>}
                  <p className="text-[12px] text-ink-muted mt-1.5">{a.source === 'invite' ? 'Invited' : 'Applied'} {timeAgo(a.createdAt)}{a.rate ? ` · Rate ${peso(a.rate)}` : ''}</p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto sm:shrink-0">
                  {biz && <MatchPill {...m} />}
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => chat.open(other.id, c.id)}><MessageCircle size={15} /></Button>
                    {biz && a.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => act(() => actions.decide(a.id, 'declined'), 'Declined')}><X size={14} />Decline</Button>
                        <Button size="sm" onClick={() => act(() => actions.decide(a.id, 'accepted'), `${creator.name} is on board. Deliverables and promo code created.`)}><Check size={14} />Accept</Button>
                      </>
                    )}
                    {!biz && a.status === 'invited' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => act(() => actions.decide(a.id, 'declined'), 'Invite declined')}><X size={14} />Decline</Button>
                        <Button size="sm" onClick={() => act(() => actions.decide(a.id, 'accepted'), "You're in! Check Deliverables for your tasks.")}><Check size={14} />Accept</Button>
                      </>
                    )}
                    {!biz && a.status === 'pending' && <Button size="sm" variant="outline" onClick={() => act(() => actions.decide(a.id, 'withdrawn'), 'Application withdrawn')}>Withdraw</Button>}
                    {a.status === 'accepted' && <Link to={biz ? `/workspace/campaigns/${c.id}` : '/workspace/deliverables'}><Button size="sm" variant="soft">{biz ? 'Manage' : 'My tasks'}</Button></Link>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
