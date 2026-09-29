import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header, ChatProvider } from './components/Shell';
import { ToastProvider } from './components/ui';
import { useDB } from './lib/store';
import Discover from './pages/Discover';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import Profile from './pages/Profile';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import { Login, Signup } from './pages/Auth';
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
  return (
    <ToastProvider>
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
          <Route path="/go/:code" element={<Go />} />
          <Route path="/workspace" element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
            <Route index element={<Overview />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/:id" element={<CampaignManage />} />
            <Route path="collaborations" element={<Collaborations />} />
            <Route path="deliverables" element={<Deliverables />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="messages" element={<Messages />} />
            <Route path="saved" element={<Saved />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ChatProvider>
    </ToastProvider>
  );
}
