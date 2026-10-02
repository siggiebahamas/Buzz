import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header, ChatProvider } from './components/Shell';
import { ToastProvider, ConfirmProvider } from './components/ui';
import { useDB, actions } from './lib/store';
import './lib/ops';
import './lib/growops';
import './lib/scout';
import Discover from './pages/Discover';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import Profile from './pages/Profile';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import { Login, Signup, Reset } from './pages/Auth';
import { Terms, Privacy, Footer } from './pages/Legal';
import Admin from './pages/Admin';
import Help from './pages/Help';
import Pricing from './pages/Pricing';
import LaunchPad from './pages/LaunchPad';
import Shop from './pages/Shop';
import Retail from './pages/Retail';
import Toolkit from './pages/workspace/Toolkit';
import Join from './pages/Join';
import Grow from './pages/workspace/Grow';
import Swaps from './pages/workspace/Swaps';
import Customers from './pages/workspace/Customers';
import Go from './pages/Go';
import WorkspaceLayout from './pages/workspace/Layout';
import MyShop from './pages/workspace/MyShop';
import Collabs from './pages/workspace/Collabs';
import { Results, SettingsHub } from './pages/workspace/Hubs';
import Overview from './pages/workspace/Overview';
import CampaignManage from './pages/workspace/CampaignManage';
import Messages from './pages/workspace/Messages';

function RequireAuth({ children }) {
  const d = useDB();
  const loc = useLocation();
  if (!d.session.userId) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const bare = pathname.startsWith('/go/');
  const inWorkspace = pathname.startsWith('/workspace');
  useEffect(() => { actions.sweep(); }, []);
  return (
    <ToastProvider>
      <ConfirmProvider>
      <ChatProvider>
        <ScrollTop />
        {!bare && <Header />}
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/:id" element={<PostDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/help" element={<Help />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/launchpad" element={<LaunchPad />} />
          <Route path="/shop/:id" element={<Shop />} />
          <Route path="/retail" element={<Retail />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/go/:code" element={<Go />} />
          <Route path="/workspace" element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
            <Route index element={<Overview />} />
            <Route path="shop" element={<MyShop />} />
            <Route path="collabs" element={<Collabs />} />
            <Route path="results" element={<Results />} />
            <Route path="settings" element={<SettingsHub />} />
            <Route path="messages" element={<Messages />} />
            <Route path="campaigns/:id" element={<CampaignManage />} />
            <Route path="grow" element={<Grow />} />
            <Route path="toolkit" element={<Toolkit />} />
            <Route path="swaps" element={<Swaps />} />
            <Route path="customers" element={<Customers />} />
            {/* Older addresses, kept so links in notifications and emails still work. */}
            {[['campaigns', 'shop'], ['collaborations', 'collabs'], ['deliverables', 'collabs'], ['analytics', 'results'], ['payments', 'results?tab=money'], ['library', 'results?tab=library'],
              ['contracts', 'results?tab=agreements'], ['disputes', 'results?tab=problems'], ['profile', 'settings'], ['verification', 'settings?tab=verify'], ['referrals', 'settings?tab=invite'], ['saved', 'settings?tab=saved']]
              .map(([from, to]) => <Route key={from} path={from} element={<Navigate to={`/workspace/${to}`} replace />} />)}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {!bare && !inWorkspace && <Footer />}
      </ChatProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
