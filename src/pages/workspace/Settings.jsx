import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Mail } from 'lucide-react';
import { actions, useDB } from '../../lib/store';
import { timeAgo } from '../../lib/format';
import { Card, Modal, Checkbox, Field, Input, Button, EmptyState, useAct, useConfirm, cx } from '../../components/ui';
import { useMode, PageHead } from './Layout';

export default function Settings() {
  const d = useDB();
  const { me } = useMode();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const [open, setOpen] = useState(null);
  const [notif, setNotif] = useState(me.settings?.notif || { apps: true, deliverables: true, sales: true, community: false, email: true });
  const [privacy, setPrivacy] = useState(me.settings?.privacy || { public: true, showEarnings: false, showRates: true });
  const [pw, setPw] = useState({ old: '', next: '', again: '' });
  const [mail, setMail] = useState(null);
  const persist = (patch, msg) => { if (act(() => actions.updateProfile({ base: { settings: { ...(me.settings || {}), ...patch } } }), msg)) setOpen(null); };
  const emails = d.emails.filter((e) => e.userId === me.id);

  const changePw = (e) => {
    e.preventDefault();
    if (pw.next !== pw.again) return act(() => { throw new Error("The new passwords don't match."); });
    if (act(() => actions.changePassword(pw.old, pw.next), 'Password changed')) { setPw({ old: '', next: '', again: '' }); setOpen(null); }
  };

  const rows = [
    ['account', 'Account & password', 'Email, password'],
    ['notifications', 'Notifications', 'Choose what you get alerted about, in the app and by email'],
    ['privacy', 'Privacy', 'Control who sees your profile and numbers'],
    ['inbox', 'Email inbox', `${emails.length} emails Buzz sent you`],
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
        <div className="px-5 py-4 border-b border-line text-[13px] text-ink-muted">
          Read our <Link to="/terms" className="text-brand-dark">Terms of Service</Link> and <Link to="/privacy" className="text-brand-dark">Privacy Policy</Link>.
        </div>
        <button onClick={async () => { if (await ask({ title: 'Reset demo data?', body: 'Every change you made is replaced with the original sample data.', confirm: 'Reset', danger: true })) { actions.resetDemo(); nav('/'); } }} className="w-full px-5 py-4 border-b border-line text-left hover:bg-canvas">
          <span className="block text-[15px]">Reset demo data</span><span className="block text-[12.5px] text-ink-muted">Restore the original sample products, creators and campaigns</span>
        </button>
        <button onClick={() => { const blob = new Blob([JSON.stringify(actions.exportMyData(), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const el = document.createElement('a'); el.href = url; el.download = 'my-buzz-data.json'; el.click(); URL.revokeObjectURL(url); }} className="w-full px-5 py-4 border-b border-line text-left hover:bg-canvas">
          <span className="block text-[15px]">Download my data</span><span className="block text-[12.5px] text-ink-muted">A copy of your profile, campaigns, agreements, payments and messages</span>
        </button>
        <button onClick={() => setOpen('delete')} className="w-full px-5 py-4 border-b border-line text-left hover:bg-canvas">
          <span className="block text-[15px]">Close my account</span><span className="block text-[12.5px] text-ink-muted">Removes your profile and listings. Payment records are kept as the law requires.</span>
        </button>
        <button onClick={() => { actions.logout(); nav('/'); }} className="w-full px-5 py-4 text-left hover:bg-canvas">
          <span className="block text-[15px] text-rose-600">Sign Out</span><span className="block text-[12.5px] text-ink-muted">Log out of your account</span>
        </button>
      </Card>

      <Modal open={open === 'account'} onClose={() => setOpen(null)} title="Account & password">
        <Field label="Email"><Input value={me.email} disabled /></Field>
        <form onSubmit={changePw} className="space-y-3 mt-5 pt-5 border-t border-line">
          <p className="font-semibold text-[14px]">Change password</p>
          <Field label="Current password"><Input type="password" required value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters."><Input type="password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="Repeat new password"><Input type="password" required value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></Field>
          <Button type="submit" className="w-full">Change password</Button>
        </form>
      </Modal>
      <Modal open={open === 'delete'} onClose={() => setOpen(null)} title="Close your account?" subtitle="Your profile, listings and saved items are removed. Agreements and payment records stay for 10 years as required for tax purposes.">
        <form onSubmit={(e) => { e.preventDefault(); if (act(() => actions.deleteAccount(pw.old), 'Your account is closed.')) nav('/'); }} className="space-y-3">
          <Field label="Enter your password to confirm"><Input type="password" required value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></Field>
          <Button type="submit" variant="dark" className="w-full">Close my account</Button>
        </form>
      </Modal>
      <Modal open={open === 'notifications'} onClose={() => setOpen(null)} title="Notifications">
        <div className="space-y-4">
          <Checkbox checked={notif.apps} onChange={(v) => setNotif({ ...notif, apps: v })} label="Applications and invites" />
          <Checkbox checked={notif.deliverables} onChange={(v) => setNotif({ ...notif, deliverables: v })} label="Deliverables: submitted, approved, revisions" />
          <Checkbox checked={notif.sales} onChange={(v) => setNotif({ ...notif, sales: v })} label="Sales, escrow and payouts" />
          <Checkbox checked={notif.community} onChange={(v) => setNotif({ ...notif, community: v })} label="Community likes and replies" />
          <div className="pt-3 border-t border-line"><Checkbox checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} label="Also send these by email" hint="Topics you turned off above are never emailed." /></div>
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
      <Modal open={open === 'inbox'} onClose={() => { setOpen(null); setMail(null); }} title="Email inbox" subtitle={`What Buzz sent to ${me.email}. Test mode: emails show here instead of leaving the site.`} width="max-w-2xl">
        {emails.length === 0 ? <EmptyState icon={Mail} title="No emails yet" /> : (
          <div className="grid sm:grid-cols-[1fr_1.2fr] gap-4">
            <div className="max-h-[420px] overflow-y-auto border border-line rounded-xl">
              {emails.map((e) => (
                <button key={e.id} onClick={() => setMail(e)} className={cx('w-full text-left px-3 py-2.5 border-b border-line last:border-0 hover:bg-canvas', mail?.id === e.id && 'bg-brand-softer')}>
                  <span className="block text-[13px] font-medium truncate">{e.subject}</span>
                  <span className="block text-[11.5px] text-ink-muted">{timeAgo(e.ts)}</span>
                </button>
              ))}
            </div>
            <div className="border border-line rounded-xl p-4 min-w-0">
              {mail ? (
                <>
                  <p className="text-[11.5px] text-ink-muted break-all">From: Buzz &lt;hello@buzz.ph&gt; · To: {mail.to}</p>
                  <p className="font-bold mt-2">{mail.subject}</p>
                  <p className="text-[13.5px] text-ink-soft mt-2 whitespace-pre-line">{mail.body}</p>
                  {mail.link && <Button size="sm" className="mt-4" onClick={() => { setOpen(null); nav(mail.link); }}>Open in Buzz</Button>}
                </>
              ) : <p className="text-[13px] text-ink-muted">Pick an email to read it.</p>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
