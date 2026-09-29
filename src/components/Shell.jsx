import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, MessageCircle, X, Send, ArrowLeft, LogOut, RotateCcw, UserRound, Repeat, Search, ShieldAlert, Smartphone, LifeBuoy, Sparkles as SparklesIcon, Compass, Sparkles, Users, LayoutGrid } from 'lucide-react';
import { useDB, currentUser, userById, actions, unreadCount, displayName, campaignById } from '../lib/store';
import { timeAgo } from '../lib/format';
import { Logo } from './visuals';
import { Avatar, Button, cx, useConfirm } from './ui';

const ChatCtx = createContext({ open: () => {} });
export const useChat = () => useContext(ChatCtx);

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && fn();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, fn]);
}

function Notifications() {
  const d = useDB();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const mine = d.notifications.filter((n) => n.userId === d.session.userId).slice(0, 12);
  const unread = mine.filter((n) => !n.read).length;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative h-9 w-9 rounded-full grid place-items-center text-ink-soft hover:bg-canvas" aria-label="Notifications">
        <Bell size={19} strokeWidth={1.8} />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand text-[10px] font-bold text-white grid place-items-center">{unread}</span>}
      </button>
      {open && (
        <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-16 sm:top-auto mt-0 sm:mt-2 sm:w-[340px] bg-white border border-line rounded-2xl shadow-lift z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && <button onClick={() => actions.markNotificationsRead()} className="text-[12px] text-brand-dark font-medium">Mark all read</button>}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {mine.length === 0 && <p className="text-sm text-ink-muted p-6 text-center">You're all caught up.</p>}
            {mine.map((n) => (
              <button key={n.id} onClick={() => { setOpen(false); nav(n.link); }} className={cx('w-full text-left px-4 py-3 flex gap-3 hover:bg-canvas border-b border-line last:border-0', !n.read && 'bg-brand-softer')}>
                <span className={cx('mt-1.5 h-2 w-2 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-brand')} />
                <span>
                  <span className="block text-[13px] text-ink leading-snug">{n.text}</span>
                  <span className="block text-[11.5px] text-ink-muted mt-0.5">{timeAgo(n.ts)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const d = useDB();
  const me = currentUser(d);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ask = useConfirm();
  const [installable, setInstallable] = useState(!!window.__buzzInstall);
  useEffect(() => { const h = () => setInstallable(true); window.addEventListener('buzz-installable', h); return () => window.removeEventListener('buzz-installable', h); }, []);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useOutside(ref, () => { setOpen(false); setSwitching(false); });
  const people = d.users.filter((u) => u.id !== me.id && (displayName(u) + u.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="rounded-full" aria-label="Account menu"><Avatar user={me} size={36} /></button>
      {open && (
        <div className="absolute right-0 mt-2 w-[290px] bg-white border border-line rounded-2xl shadow-lift z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-3">
            <Avatar user={me} size={38} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{me.name}</p>
              <p className="text-[12px] text-ink-muted truncate">{me.email}</p>
            </div>
          </div>
          {!switching ? (
            <div className="p-1.5">
              <MenuItem icon={UserRound} onClick={() => { setOpen(false); nav(`/profile/${me.id}`); }}>View public profile</MenuItem>
              {installable && <MenuItem icon={Smartphone} onClick={() => { window.__buzzInstall?.prompt(); setInstallable(false); setOpen(false); }}>Install the Buzz app</MenuItem>}
              <MenuItem icon={SparklesIcon} onClick={() => { setOpen(false); nav('/pricing'); }}>{me.plan === 'pro' ? 'Your plan: Pro' : 'Upgrade to Pro'}</MenuItem>
              <MenuItem icon={LifeBuoy} onClick={() => { setOpen(false); nav('/help'); }}>Help & support</MenuItem>
              {me.admin && <MenuItem icon={ShieldAlert} onClick={() => { setOpen(false); nav('/admin'); }}>Admin: Trust & Safety</MenuItem>}
              <MenuItem icon={Repeat} onClick={() => setSwitching(true)}>Switch demo account</MenuItem>
              <MenuItem icon={RotateCcw} onClick={async () => { setOpen(false); if (await ask({ title: 'Reset demo data?', body: 'Every change you made is replaced with the original sample brands, creators and campaigns.', confirm: 'Reset', danger: true })) { actions.resetDemo(); nav('/'); } }}>Reset demo data</MenuItem>
              <MenuItem icon={LogOut} onClick={() => { actions.logout(); setOpen(false); nav('/'); }} danger>Sign out</MenuItem>
            </div>
          ) : (
            <div className="p-2">
              <p className="text-[11.5px] text-ink-muted px-2 pb-2">Log in as anyone to test the other side of a collaboration.</p>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people or brands" className="w-full h-8 pl-8 pr-2 text-[13px] rounded-lg border border-line-strong focus:outline-none focus:border-brand" />
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {people.map((u) => (
                  <button key={u.id} onClick={() => { actions.login(u.id); setOpen(false); setSwitching(false); }} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-canvas text-left">
                    <Avatar user={u} size={28} />
                    <span className="min-w-0">
                      <span className="block text-[13px] truncate">{displayName(u)}</span>
                      <span className="block text-[11px] text-ink-muted">{u.creator ? `Creator · @${u.creator.handle}` : `Business · ${u.name}`}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MenuItem = ({ icon: Icon, children, onClick, danger }) => (
  <button onClick={onClick} className={cx('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] hover:bg-canvas', danger ? 'text-rose-600' : 'text-ink')}>
    <Icon size={16} strokeWidth={1.8} />{children}
  </button>
);

export function Header() {
  const d = useDB();
  const me = currentUser(d);
  const loc = useLocation();
  const tabs = [['/', 'Discover', Compass], ['/opportunities', 'Opportunities', Sparkles], ['/community', 'Community', Users], ['/workspace', 'My Workspace', LayoutGrid]];
  const isActive = (to) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to) || (to === '/opportunities' && (loc.pathname.startsWith('/opportunity') || loc.pathname.startsWith('/profile'))));
  return (
    <>
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-line">
      <div className="max-w-[1320px] mx-auto h-16 px-4 sm:px-6 flex items-center">
        <div className="flex-1"><Logo /></div>
        <nav className="hidden md:flex items-center gap-8">
          {tabs.map(([to, label]) => {
            const active = isActive(to);
            return (
              <NavLink key={to} to={to} className={cx('relative h-16 grid place-items-center text-[15px] transition-colors', active ? 'text-ink font-medium' : 'text-ink-muted hover:text-ink')}>
                {label}
                {active && <span className="absolute bottom-3 left-0 right-0 h-[3px] rounded-full bg-brand" />}
              </NavLink>
            );
          })}
        </nav>
        <div className="flex-1 flex justify-end items-center gap-2">
          {me ? (<><Notifications /><AccountMenu /></>) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link to="/signup"><Button size="sm">Sign up</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line grid grid-cols-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {tabs.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive(to) ? 'text-brand-dark font-semibold' : 'text-ink-muted')}>
          <Icon size={20} strokeWidth={1.8} />{label.replace('My ', '')}
        </NavLink>
      ))}
    </nav>
    </>
  );
}

function Conversation({ thread, onBack }) {
  const d = useDB();
  const me = d.session.userId;
  const other = userById(d, thread.participants.find((p) => p !== me));
  const camp = thread.campaignId ? campaignById(d, thread.campaignId) : null;
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => { actions.markThreadRead(thread.id); endRef.current?.scrollIntoView(); }, [thread.id, thread.messages.length]);
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.sendMessage(thread.id, text.trim());
    setText('');
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
        <button onClick={onBack} className="p-1 -ml-1 rounded-lg hover:bg-canvas"><ArrowLeft size={18} /></button>
        <Avatar user={other} size={34} />
        <div className="min-w-0">
          <Link to={`/profile/${other?.id}`} className="block text-sm font-semibold truncate hover:underline">{displayName(other)}</Link>
          {camp && <Link to={`/opportunity/${camp.id}`} className="block text-[11.5px] text-brand-dark truncate">Re: {camp.productName}</Link>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-canvas/50">
        {thread.messages.length === 0 && <p className="text-center text-[12.5px] text-ink-muted py-8">Say hello to start the conversation.</p>}
        {thread.messages.map((m) => (
          <div key={m.id} className={cx('flex', m.from === me ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-snug', m.from === me ? 'bg-brand text-ink rounded-br-md' : 'bg-white border border-line rounded-bl-md')}>
              {m.body}
              <span className="block text-[10.5px] opacity-60 mt-0.5">{timeAgo(m.ts)}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-line flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" className="flex-1 h-10 px-3.5 rounded-xl border border-line-strong text-sm focus:outline-none focus:border-brand" />
        <Button type="submit" className="w-10 px-0" aria-label="Send" disabled={!text.trim()}><Send size={16} /></Button>
      </form>
    </div>
  );
}

export function ThreadList({ onPick, activeId }) {
  const d = useDB();
  const me = d.session.userId;
  const threads = d.threads.filter((t) => t.participants.includes(me));
  if (!threads.length) return <p className="text-sm text-ink-muted p-6 text-center">No conversations yet. Apply to an opportunity or message a creator to start one.</p>;
  return threads.map((t) => {
    const other = userById(d, t.participants.find((p) => p !== me));
    const last = t.messages[t.messages.length - 1];
    const unread = t.messages.filter((m) => m.from !== me && m.ts > (t.lastRead[me] || 0)).length;
    return (
      <button key={t.id} onClick={() => onPick(t.id)} className={cx('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-canvas border-b border-line', activeId === t.id && 'bg-brand-softer')}>
        <Avatar user={other} size={38} />
        <span className="min-w-0 flex-1">
          <span className="flex justify-between gap-2"><span className={cx('text-[13.5px] truncate', unread ? 'font-bold' : 'font-medium')}>{displayName(other)}</span><span className="text-[11px] text-ink-muted shrink-0">{last ? timeAgo(last.ts) : ''}</span></span>
          <span className={cx('block text-[12.5px] truncate', unread ? 'text-ink' : 'text-ink-muted')}>{last ? `${last.from === me ? 'You: ' : ''}${last.body}` : 'No messages yet'}</span>
        </span>
        {unread > 0 && <span className="h-5 min-w-[20px] px-1 rounded-full bg-brand text-white text-[11px] font-bold grid place-items-center">{unread}</span>}
      </button>
    );
  });
}

export { Conversation };

export function ChatProvider({ children }) {
  const d = useDB();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const me = d.session.userId;
  const unread = me ? unreadCount(d) : 0;
  const thread = threadId && d.threads.find((t) => t.id === threadId && t.participants.includes(me));
  const api = {
    open: (otherId, campaignId = null) => {
      const id = actions.openThread(otherId, campaignId);
      setThreadId(id);
      setOpen(true);
    },
    openThread: (id) => { setThreadId(id); setOpen(true); },
  };
  return (
    <ChatCtx.Provider value={api}>
      {children}
      {me && (
        <>
          {open && (
            <div className="fixed bottom-[148px] md:bottom-24 right-3 left-3 sm:left-auto sm:right-6 z-40 sm:w-[380px] h-[min(520px,calc(100vh-220px))] bg-white border border-line rounded-2xl shadow-lift overflow-hidden flex flex-col">
              {thread ? <Conversation thread={thread} onBack={() => setThreadId(null)} /> : (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                    <p className="font-semibold">Messages</p>
                    <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-canvas"><X size={18} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto"><ThreadList onPick={setThreadId} /></div>
                </>
              )}
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="fixed bottom-[76px] md:bottom-6 right-4 md:right-6 z-40 h-14 w-14 rounded-full bg-brand text-white shadow-lift grid place-items-center hover:bg-brand-dark transition-colors" aria-label="Messages">
            {open ? <X size={22} /> : <MessageCircle size={23} strokeWidth={2} />}
            {!open && unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-ink text-white text-[11px] font-bold grid place-items-center">{unread}</span>}
          </button>
        </>
      )}
    </ChatCtx.Provider>
  );
}
