import { useSearchParams } from 'react-router-dom';
import { useDB } from '../../lib/store';
import { cx } from '../../components/ui';
import { useMode } from './Layout';
import Analytics from './Analytics';
import Payments from './Payments';
import Library from './Library';
import MyProfile from './MyProfile';
import AccountSettings from './Settings';
import Verification from './Verification';
import Referrals from './Referrals';
import Saved from './Saved';
import Disputes from './Disputes';
import Contracts from './Contracts';

// One sidebar item, a few tabs: keeps the workspace to six places.
function Tabs({ tabs, fallback }) {
  const [params, setParams] = useSearchParams();
  const cur = tabs.find((t) => t[0] === params.get('tab')) || tabs.find((t) => t[0] === fallback) || tabs[0];
  const Page = cur[2];
  return (
    <>
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-line">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setParams(id === tabs[0][0] ? {} : { tab: id })}
            className={cx('h-10 px-3.5 text-[14px] whitespace-nowrap border-b-2 -mb-px', cur[0] === id ? 'border-brand text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink')}>{label}</button>
        ))}
      </div>
      <Page />
    </>
  );
}

export function Results({ tab }) {
  const d = useDB();
  const { mode, me } = useMode();
  const biz = mode === 'business';
  const hasDisputes = d.disputes.some((x) => x.openedBy === me.id || x.againstId === me.id);
  return (
    <Tabs fallback={tab} tabs={[
      ['sales', biz ? 'Sales & reach' : 'Reach & sales', Analytics],
      ['money', biz ? 'Payments' : 'Earnings', Payments],
      ...(biz ? [['library', 'Creator posts', Library]] : []),
      ['agreements', 'Agreements', Contracts],
      ...(hasDisputes ? [['problems', 'Problems', Disputes]] : []),
    ]} />
  );
}

export function SettingsHub({ tab }) {
  return (
    <Tabs fallback={tab} tabs={[
      ['profile', 'Profile', MyProfile],
      ['account', 'Account', AccountSettings],
      ['verify', 'Verification', Verification],
      ['invite', 'Invite friends', Referrals],
      ['saved', 'Saved', Saved],
    ]} />
  );
}
