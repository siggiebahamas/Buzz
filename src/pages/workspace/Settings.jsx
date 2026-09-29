import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { actions } from '../../lib/store';
import { useAct } from '../../components/ui';
import { Card, Modal, Checkbox, Field, Input, Button } from '../../components/ui';
import { useMode, PageHead } from './Layout';

export default function Settings() {
  const { me } = useMode();
  const nav = useNavigate();
  const [open, setOpen] = useState(null);
  const act = useAct();
  const [notif, setNotif] = useState(me.settings?.notif || { apps: true, deliverables: true, sales: true, community: false, email: true });
  const [privacy, setPrivacy] = useState(me.settings?.privacy || { public: true, showEarnings: false, showRates: true });
  const persist = (patch, msg) => { act(() => actions.updateProfile({ base: { settings: { ...(me.settings || {}), ...patch } } }), msg); setOpen(null); };
  const rows = [
    ['account', 'Account Information', 'Name, email, and password'],
    ['notifications', 'Notifications', 'Choose what you get alerted about'],
    ['privacy', 'Privacy', 'Control who sees your profile and numbers'],
  ];
  return (
    <>
      <PageHead title="Settings" sub="Manage your account and preferences" />
      <Card className="max-w-2xl overflow-hidden">
        {rows.map(([id, t, s]) => (
          <button key={id} onClick={() => setOpen(id)} className="w-full flex items-center justify-between px-5 py-4 border-b border-line text-left hover:bg-canvas">
            <span><span className="block text-[15px]">{t}</span><span className="block text-[12.5px] text-ink-muted">{s}</span></span><ChevronRight size={17} className="text-ink-muted" />
          </button>
        ))}
        <button onClick={() => { if (confirm('Reset all demo data?')) { actions.resetDemo(); nav('/'); } }} className="w-full px-5 py-4 border-b border-line text-left hover:bg-canvas">
          <span className="block text-[15px]">Reset demo data</span><span className="block text-[12.5px] text-ink-muted">Restore the original sample products, creators and campaigns</span>
        </button>
        <button onClick={() => { actions.logout(); nav('/'); }} className="w-full px-5 py-4 text-left hover:bg-canvas">
          <span className="block text-[15px] text-rose-600">Sign Out</span><span className="block text-[12.5px] text-ink-muted">Log out of your account</span>
        </button>
      </Card>

      <Modal open={open === 'account'} onClose={() => setOpen(null)} title="Account Information">
        <div className="space-y-4">
          <Field label="Email"><Input value={me.email} disabled /></Field>
          <Field label="New password" hint="Passwords arrive with real accounts (next step: Supabase login)."><Input type="password" disabled placeholder="••••••••" /></Field>
          <Button className="w-full" onClick={() => { setOpen(null); nav('/workspace/profile'); }}>Edit name and photo in My Profile</Button>
        </div>
      </Modal>
      <Modal open={open === 'notifications'} onClose={() => setOpen(null)} title="Notifications">
        <div className="space-y-4">
          <Checkbox checked={notif.apps} onChange={(v) => setNotif({ ...notif, apps: v })} label="Applications and invites" />
          <Checkbox checked={notif.deliverables} onChange={(v) => setNotif({ ...notif, deliverables: v })} label="Deliverables: submitted, approved, revisions" />
          <Checkbox checked={notif.sales} onChange={(v) => setNotif({ ...notif, sales: v })} label="Sales and payments" />
          <Checkbox checked={notif.community} onChange={(v) => setNotif({ ...notif, community: v })} label="Community likes and replies" />
          <Checkbox checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} label="Also send a daily email summary" />
          <Button className="w-full" onClick={() => persist({ notif }, 'Preferences saved')}>Save</Button>
        </div>
      </Modal>
      <Modal open={open === 'privacy'} onClose={() => setOpen(null)} title="Privacy">
        <div className="space-y-4">
          <Checkbox checked={privacy.public} onChange={(v) => setPrivacy({ ...privacy, public: v })} label="Public profile" hint="Brands and creators can find you in search." />
          <Checkbox checked={privacy.showRates} onChange={(v) => setPrivacy({ ...privacy, showRates: v })} label="Show my rate card" />
          <Checkbox checked={privacy.showEarnings} onChange={(v) => setPrivacy({ ...privacy, showEarnings: v })} label="Show sales I've driven on my profile" />
          <Button className="w-full" onClick={() => persist({ privacy }, 'Privacy settings saved')}>Save</Button>
        </div>
      </Modal>
    </>
  );
}
