import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, UserRound, Briefcase, Handshake, ListChecks, BarChart3, MessageSquare, Bookmark, Settings, HelpCircle, Wallet, FileSignature, Scale, BadgeCheck, Gift, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDB, currentUser, unreadCount, actions } from '../../lib/store';
import { Avatar, Segmented, Modal, cx } from '../../components/ui';

export function useMode() {
  const d = useDB();
  const me = currentUser(d);
  const both = !!(me?.creator && me?.business);
  const mode = both ? d.session.mode : me?.creator ? 'creator' : 'business';
  return { mode, both, me };
}

export function ModeToggle() {
  const { mode, both } = useMode();
  if (!both) return null;
  return <Segmented value={mode} onChange={(m) => actions.setMode(m)} options={[{ id: 'creator', label: "I'm an Influencer" }, { id: 'business', label: "I'm a Business Owner" }]} />;
}

export function PageHead({ title, sub, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="text-[24px] sm:text-[28px] font-bold text-ink">{title}</h1>
        {sub && <p className="text-[14px] sm:text-[15px] text-ink-muted mt-0.5">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">{action}</div>
    </div>
  );
}

const FAQ = [
  ['How do tracking links work?', 'Every accepted creator gets a link like buzz/go/CODE. Each visit counts as a click, then forwards to the brand\'s shop. Sales come from the link or from the matching promo code, which the brand logs in Analytics.'],
  ['How is Match % calculated?', 'Niche fit (40), platforms (20), rate vs. budget (20), location (10) and engagement (10). Hover any match % to see the breakdown.'],
  ['What is ROAS?', 'Return on ad spend: attributed revenue ÷ what you spent on creators. 3.0× means every ₱1 spent brought back ₱3 in sales.'],
  ['How do payments work?', 'Brands pay each creator fee into Buzz escrow (plus a 5% service fee). The money is released to the creator\'s wallet the moment the brand approves the content, or automatically after 7 days without a response. Creators withdraw to GCash, Maya or a bank.'],
  ['Something looks fake. What do I do?', 'Use Report on the listing, profile or post. Our team reviews every report within 24 hours.'],
  ['Can I be both a creator and a business owner?', 'Yes. Add both profiles in My Profile, then switch views with the toggle at the top of your workspace.'],
];

export default function WorkspaceLayout() {
  const d = useDB();
  const { mode, me } = useMode();
  const [help, setHelp] = useState(false);
  const pendingApps = mode === 'business'
    ? d.applications.filter((a) => a.status === 'pending' && d.campaigns.find((c) => c.id === a.campaignId)?.ownerId === me.id).length
    : d.applications.filter((a) => a.status === 'invited' && a.creatorId === me.id).length;
  const dels = mode === 'business'
    ? d.deliverables.filter((x) => x.status === 'submitted' && d.campaigns.find((c) => c.id === x.campaignId)?.ownerId === me.id).length
    : d.deliverables.filter((x) => x.creatorId === me.id && ['todo', 'revision'].includes(x.status) && x.dueAt < Date.now() + 7 * 86400000).length;
  const toSign = d.contracts.filter((k) => (k.brandId === me.id && !k.brandSignedAt) || (k.creatorId === me.id && !k.creatorSignedAt)).length;
  const openDisputes = d.disputes.filter((x) => (x.openedBy === me.id || x.againstId === me.id) && x.status !== 'resolved').length;
  const hasDisputes = d.disputes.some((x) => x.openedBy === me.id || x.againstId === me.id);
  const verified = mode === 'business' ? me.business?.verified : me.creator?.statsVerified;
  const groups = [
    ['Work', [
      ['/workspace', 'Overview', LayoutGrid, 0, true],
      ['/workspace/campaigns', 'Campaigns', Briefcase],
      ['/workspace/collaborations', 'Collaborations', Handshake, pendingApps],
      ['/workspace/deliverables', 'Deliverables', ListChecks, dels],
      ['/workspace/contracts', 'Agreements', FileSignature, toSign],
      ['/workspace/messages', 'Messages', MessageSquare, unreadCount(d)],
      mode === 'business' && ['/workspace/library', 'Content library', Library],
    ]],
    ['Money & results', [
      ['/workspace/analytics', 'Analytics', BarChart3],
      ['/workspace/payments', 'Payments', Wallet],
      hasDisputes && ['/workspace/disputes', 'Disputes', Scale, openDisputes],
      ['/workspace/referrals', 'Invite & earn', Gift],
    ]],
    ['Account', [
      ['/workspace/profile', 'My Profile', UserRound],
      ['/workspace/verification', verified ? 'Verified' : 'Get verified', BadgeCheck, verified ? 0 : 0],
      ['/workspace/saved', 'Saved', Bookmark],
      ['/workspace/settings', 'Settings', Settings],
    ]],
  ].map(([g, list]) => [g, list.filter(Boolean)]);
  const items = groups.flatMap(([, list]) => list);
  return (
    <div className="lg:flex min-h-[calc(100vh-64px)]">
      <div className="lg:hidden sticky top-16 z-20 bg-white border-b border-line overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 w-max">
          {items.map(([to, label, Icon, badge, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13.5px] whitespace-nowrap', isActive ? 'bg-brand-soft text-ink font-medium' : 'text-ink-soft')}>
              <Icon size={15} strokeWidth={1.8} />{label}{badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10.5px] font-bold grid place-items-center">{badge}</span>}
            </NavLink>
          ))}
          <button onClick={() => setHelp(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13.5px] text-ink-soft whitespace-nowrap"><HelpCircle size={15} />Help</button>
        </div>
      </div>
      <div className="hidden lg:block w-[250px] shrink-0 bg-white border-r border-line">
      <aside className="flex flex-col sticky top-16 h-[calc(100vh-64px)]">
        <nav className="p-3 flex-1 overflow-y-auto">
          {groups.map(([g, list]) => (
            <div key={g} className="mb-3">
              <p className="px-3.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{g}</p>
              {list.map(([to, label, Icon, badge, end]) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 px-3.5 h-10 rounded-xl text-[14.5px] transition-colors', isActive ? 'bg-brand-soft text-ink font-medium' : 'text-ink-soft hover:bg-canvas')}>
                  <Icon size={17} strokeWidth={1.7} />{label}
                  {badge > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold grid place-items-center">{badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-line space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setHelp(true)} className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl border border-line text-[13.5px] text-ink-soft hover:bg-canvas"><HelpCircle size={16} />Quick help</button>
            <Link to="/help" className="h-10 px-3 rounded-xl border border-line text-[13.5px] text-ink-soft hover:bg-canvas grid place-items-center">Support</Link>
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <Avatar user={me} size={34} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium truncate">{me.name}</p>
              <p className="text-[12px] text-ink-muted">{mode === 'creator' ? 'Influencer' : 'Business Owner'}{me.plan === 'pro' ? ' · Pro' : ''}</p>
            </div>
          </div>
        </div>
      </aside>
      </div>
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-9">
        <div className="max-w-[1180px] mx-auto"><Outlet /></div>
      </div>
      <Modal open={help} onClose={() => setHelp(false)} title="Help & FAQ">
        <div className="space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}><p className="font-semibold text-[14px]">{q}</p><p className="text-[13.5px] text-ink-soft mt-0.5">{a}</p></div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
