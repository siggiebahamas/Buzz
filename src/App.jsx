import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header, ChatProvider } from './components/Shell';
import { ToastProvider, ConfirmProvider } from './components/ui';
import { useDB, actions } from './lib/store';
import './lib/ops';
import './lib/growops';
import Discover from './pages/Discover';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import Profile from './pages/Profile';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import { Login, Signup, Reset } from './pages/Auth';
import { Terms, Privacy, Footer } from './pages/Legal';
import Admin from './pages/Admin';
import Payments from './pages/workspace/Payments';
import Contracts from './pages/workspace/Contracts';
import Disputes from './pages/workspace/Disputes';
import Verification from './pages/workspace/Verification';
import Referrals from './pages/workspace/Referrals';
import Library from './pages/workspace/Library';
import CreatorPro from './pages/workspace/CreatorPro';
import Help from './pages/Help';
import Pricing from './pages/Pricing';
import Services from './pages/Services';
import LaunchPad from './pages/LaunchPad';
import Shop from './pages/Shop';
import Join from './pages/Join';
import Grow from './pages/workspace/Grow';
import Swaps from './pages/workspace/Swaps';
import Customers from './pages/workspace/Customers';
import GroupDeals from './pages/workspace/GroupDeals';
import Events from './pages/Events';
import Go from './pages/Go';
import WorkspaceLayout from './pages/workspace/Layout';
import Overview from './pages/workspace/Overview';
import MyProfile from './pages/workspace/MyProfile';
import Campaigns from './pages/workspace/Campaigns';
import CampaignManage from './pages/workspace/CampaignManage';
import Collaborations from './pages/workspace/Collaborations';
import Deliverables from './pages/workspace/Deliverables';
import Analytics from './pages/workspace/Analytics';
import Messages from './pages/workspace/Messages';
import Saved from './pages/workspace/Saved';
import Settings from './pages/workspace/Settings';

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
          <Route path="/services" element={<Services />} />
          <Route path="/launchpad" element={<LaunchPad />} />
          <Route path="/shop/:id" element={<Shop />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/events" element={<Events />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/go/:code" element={<Go />} />
          <Route path="/workspace" element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
            <Route index element={<Overview />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/:id" element={<CampaignManage />} />
            <Route path="collaborations" element={<Collaborations />} />
            <Route path="deliverables" element={<Deliverables />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="payments" element={<Payments />} />
            <Route path="pro" element={<CreatorPro />} />
            <Route path="grow" element={<Grow />} />
            <Route path="swaps" element={<Swaps />} />
            <Route path="customers" element={<Customers />} />
            <Route path="group-deals" element={<GroupDeals />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="verification" element={<Verification />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="library" element={<Library />} />
            <Route path="messages" element={<Messages />} />
            <Route path="saved" element={<Saved />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {!bare && !inWorkspace && <Footer />}
      </ChatProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
