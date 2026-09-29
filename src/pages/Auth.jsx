import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Megaphone, Store, MailCheck } from 'lucide-react';
import { useDB, actions, userById, displayName } from '../lib/store';
import { CATEGORIES, PLATFORMS, REGIONS } from '../lib/constants';
import { Card, Field, Input, Select, Button, Avatar, Checkbox, cx, useAct } from '../components/ui';
import { Logo } from '../components/visuals';

const QUICK = [['u_me', 'Founder + creator + admin'], ['c_bianca', 'Food creator'], ['u_sili', 'Hot sauce founder'], ['c_kaye', 'Beauty creator']];

function Shell({ title, sub, children }) {
  return (
    <main className="min-h-[calc(100vh-64px)] grid place-items-center px-4 py-10 sm:py-12">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <div className="text-center"><Logo /><h1 className="text-[22px] font-bold mt-4">{title}</h1>{sub && <p className="text-[13.5px] text-ink-muted">{sub}</p>}</div>
        {children}
      </Card>
    </main>
  );
}

export function Login() {
  const d = useDB();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const after = () => nav(loc.state?.from || '/workspace');
  const submit = (e) => {
    e.preventDefault();
    try { actions.loginWithPassword(email, pw); after(); } catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="Welcome back" sub="Log in to your workspace">
      <form onSubmit={submit} className="space-y-4 mt-6">
        <Field label="Email"><Input id="login-email" type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="you@email.com" /></Field>
        <Field label="Password"><Input id="login-pw" type="password" required value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} placeholder="••••••••" /></Field>
        <div className="flex justify-end -mt-2"><Link to="/reset" className="text-[12.5px] text-brand-dark">Forgot password?</Link></div>
        {err && <p className="text-[13px] text-rose-600">{err}</p>}
        <Button type="submit" size="lg" className="w-full">Log in</Button>
      </form>
      <div className="mt-6 pt-5 border-t border-line">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-1">Or try a sample account</p>
        <p className="text-[12px] text-ink-muted mb-2">Every sample account uses the password <b className="text-ink">buzz1234</b>.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK.map(([id, label]) => {
            const u = userById(d, id);
            if (!u) return null;
            return (
              <button key={id} onClick={() => { actions.login(id); after(); }} className="flex items-center gap-2 rounded-xl border border-line p-2 hover:bg-canvas text-left">
                <Avatar user={u} size={30} />
                <span className="min-w-0"><span className="block text-[12.5px] font-medium truncate">{displayName(u)}</span><span className="block text-[11px] text-ink-muted">{label}</span></span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-center text-[13.5px] text-ink-muted mt-6">New to Buzz? <Link to="/signup" className="text-brand-dark font-medium">Create an account</Link></p>
    </Shell>
  );
}

export function Reset() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const [step, setStep] = useState('ask');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const latest = d.emails.find((e) => e.to.toLowerCase() === email.trim().toLowerCase() && e.subject.includes('reset code'));
  const send = (e) => { e.preventDefault(); actions.requestReset(email); setStep('code'); };
  const reset = (e) => {
    e.preventDefault();
    if (act(() => actions.resetPassword(email, code, pw), 'Password updated. Log in with your new password.')) nav('/login');
  };
  return (
    <Shell title="Reset your password" sub={step === 'ask' ? "We'll email you a 6-digit code." : `If ${email} has an account, a code is on its way.`}>
      {step === 'ask' ? (
        <form onSubmit={send} className="space-y-4 mt-6">
          <Field label="Email"><Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" size="lg" className="w-full">Send reset code</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4 mt-6">
          {latest && (
            <div className="rounded-xl bg-brand-softer border border-[#F6DDB2] p-3 text-[13px] flex gap-2">
              <MailCheck size={17} className="text-brand-dark shrink-0 mt-0.5" />
              <span><b>Test mode inbox:</b> {latest.body.split('.')[0]}.</span>
            </div>
          )}
          <Field label="6-digit code"><Input id="reset-code" inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <Field label="New password" hint="At least 8 characters."><Input id="reset-pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Button type="submit" size="lg" className="w-full">Set new password</Button>
          <button type="button" onClick={() => actions.requestReset(email)} className="w-full text-[12.5px] text-brand-dark">Send a new code</button>
        </form>
      )}
      <p className="text-center text-[13.5px] text-ink-muted mt-6"><Link to="/login" className="text-brand-dark font-medium">Back to log in</Link></p>
    </Shell>
  );
}

export function Signup() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const act = useAct();
  const [role, setRole] = useState(null);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ referral: params.get('ref') || '', name: '', email: '', password: '', region: 'Metro Manila', location: '', businessName: '', businessType: '', category: 'food', handle: '', niche: 'food', platform: 'instagram', followers: '' });
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(''); };
  const submit = (e) => {
    e.preventDefault();
    if (f.password.length < 8) return setErr('Use a password with at least 8 characters.');
    if (!agree) return setErr('Please agree to the Terms and Privacy Policy to continue.');
    if (act(() => actions.signup({ ...f, role }), 'Account created. Welcome to Buzz!')) nav('/workspace/profile');
  };
  return (
    <Shell title="Join Buzz" sub="Free for founders and creators. You can add the other role later.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
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
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name"><Input id="su-name" required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Email"><Input id="su-email" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
          <Field label="Password" hint="At least 8 characters."><Input id="su-pw" type="password" required value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="City"><Input id="su-city" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Cebu City" /></Field>
            <Field label="Region"><Select id="su-region" value={f.region} onChange={(e) => set('region', e.target.value)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          </div>
          {role === 'business' ? (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Business name"><Input id="su-biz" required value={f.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
                <Field label="What do you sell?"><Input id="su-type" value={f.businessType} onChange={(e) => set('businessType', e.target.value)} placeholder="Handmade shoes" /></Field>
              </div>
              <Field label="Category"><Select id="su-cat" value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Handle"><Input id="su-handle" required value={f.handle} onChange={(e) => set('handle', e.target.value)} placeholder="@yourhandle" /></Field>
                <Field label="Main niche"><Select id="su-niche" value={f.niche} onChange={(e) => set('niche', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Main platform"><Select id="su-platform" value={f.platform} onChange={(e) => set('platform', e.target.value)}>{Object.entries(PLATFORMS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select></Field>
                <Field label="Followers there"><Input id="su-followers" type="number" min="0" value={f.followers} onChange={(e) => set('followers', e.target.value)} /></Field>
              </div>
            </>
          )}
          <Field label="Referral code (optional)" hint={f.referral ? 'You and your friend each get ₱200 credit after your first paid collaboration.' : ''}><Input id="su-ref" value={f.referral} onChange={(e) => set('referral', e.target.value.toUpperCase())} /></Field>
          <div className="rounded-xl bg-canvas p-3">
            <Checkbox checked={agree} onChange={(v) => { setAgree(v); setErr(''); }}
              label={<>I agree to the <Link to="/terms" target="_blank" className="text-brand-dark underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-brand-dark underline">Privacy Policy</Link></>}
              hint="We process your personal data under the Data Privacy Act of 2012 (RA 10173) only to run your account and collaborations." />
          </div>
          {err && <p className="text-[13px] text-rose-600">{err}</p>}
          <Button type="submit" size="lg" className="w-full">Create account</Button>
        </form>
      )}
      <p className="text-center text-[13.5px] text-ink-muted mt-6">Already have an account? <Link to="/login" className="text-brand-dark font-medium">Log in</Link></p>
    </Shell>
  );
}
