import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Megaphone, Store } from 'lucide-react';
import { useDB, actions, userById, displayName } from '../lib/store';
import { CATEGORIES, PLATFORMS, REGIONS } from '../lib/constants';
import { Card, Field, Input, Select, Button, Avatar, cx, useAct } from '../components/ui';
import { Logo } from '../components/visuals';

const QUICK = [['u_me', 'Founder + creator (you)'], ['c_bianca', 'Food creator'], ['u_sili', 'Hot sauce founder'], ['c_kaye', 'Beauty creator']];

export function Login() {
  const d = useDB();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const go = (id) => { actions.login(id); nav(loc.state?.from || '/workspace'); };
  const submit = (e) => {
    e.preventDefault();
    const u = d.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return setErr('No account with that email. Sign up instead?');
    go(u.id);
  };
  return (
    <main className="min-h-[calc(100vh-64px)] grid place-items-center px-6 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center"><Logo /><h1 className="text-[22px] font-bold mt-4">Welcome back</h1><p className="text-[13.5px] text-ink-muted">Log in to your workspace</p></div>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="you@email.com" /></Field>
          <Field label="Password" hint="Demo mode: any password works."><Input type="password" placeholder="••••••••" /></Field>
          {err && <p className="text-[13px] text-rose-600">{err}</p>}
          <Button type="submit" size="lg" className="w-full">Log in</Button>
        </form>
        <div className="mt-6 pt-5 border-t border-line">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Or try a demo account</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map(([id, label]) => {
              const u = userById(d, id);
              if (!u) return null;
              return (
                <button key={id} onClick={() => go(id)} className="flex items-center gap-2 rounded-xl border border-line p-2 hover:bg-canvas text-left">
                  <Avatar user={u} size={30} />
                  <span className="min-w-0"><span className="block text-[12.5px] font-medium truncate">{displayName(u)}</span><span className="block text-[11px] text-ink-muted">{label}</span></span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-center text-[13.5px] text-ink-muted mt-6">New to Buzz? <Link to="/signup" className="text-brand-dark font-medium">Create an account</Link></p>
      </Card>
    </main>
  );
}

export function Signup() {
  const nav = useNavigate();
  const act = useAct();
  const [role, setRole] = useState(null);
  const [f, setF] = useState({ name: '', email: '', region: 'Metro Manila', location: '', businessName: '', businessType: '', category: 'food', handle: '', niche: 'food', platform: 'instagram', followers: '' });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (act(() => actions.signup({ ...f, role }), 'Account created. Welcome to Buzz!')) nav('/workspace/profile');
  };
  return (
    <main className="min-h-[calc(100vh-64px)] grid place-items-center px-6 py-12">
      <Card className="w-full max-w-lg p-8">
        <div className="text-center"><Logo /><h1 className="text-[22px] font-bold mt-4">Join Buzz</h1><p className="text-[13.5px] text-ink-muted">Free for founders and creators. You can add the other role later.</p></div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[['creator', Megaphone, "I'm a creator", 'Find products to promote and get paid'], ['business', Store, "I'm a business owner", 'Find creators who can sell your product']].map(([id, Icon, t, s]) => (
            <button key={id} type="button" onClick={() => setRole(id)} className={cx('rounded-2xl border-2 p-4 text-left transition-colors', role === id ? 'border-brand bg-brand-softer' : 'border-line hover:border-brand/50')}>
              <Icon size={22} className="text-brand-dark" />
              <p className="font-bold mt-2">{t}</p>
              <p className="text-[12.5px] text-ink-muted">{s}</p>
            </button>
          ))}
        </div>
        {role && (
          <form onSubmit={submit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name"><Input required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="Email"><Input type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Cebu City" /></Field>
              <Field label="Region"><Select value={f.region} onChange={(e) => set('region', e.target.value)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
            </div>
            {role === 'business' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Business name"><Input required value={f.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
                  <Field label="What do you sell?"><Input value={f.businessType} onChange={(e) => set('businessType', e.target.value)} placeholder="Handmade shoes" /></Field>
                </div>
                <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Handle"><Input required value={f.handle} onChange={(e) => set('handle', e.target.value)} placeholder="@yourhandle" /></Field>
                  <Field label="Main niche"><Select value={f.niche} onChange={(e) => set('niche', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Main platform"><Select value={f.platform} onChange={(e) => set('platform', e.target.value)}>{Object.entries(PLATFORMS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select></Field>
                  <Field label="Followers there"><Input type="number" min="0" value={f.followers} onChange={(e) => set('followers', e.target.value)} /></Field>
                </div>
              </>
            )}
            <Button type="submit" size="lg" className="w-full">Create account</Button>
          </form>
        )}
        <p className="text-center text-[13.5px] text-ink-muted mt-6">Already have an account? <Link to="/login" className="text-brand-dark font-medium">Log in</Link></p>
      </Card>
    </main>
  );
}
