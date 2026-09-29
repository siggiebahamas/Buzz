import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronDown, Star, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { initials } from '../lib/format';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }) {
  const v = {
    primary: 'bg-brand text-ink hover:bg-brand-dark hover:text-white shadow-sm',
    dark: 'bg-ink text-white hover:bg-ink-soft',
    soft: 'bg-brand-soft text-ink hover:bg-[#FCE7C4]',
    outline: 'bg-white border border-line-strong text-ink hover:bg-canvas',
    ghost: 'text-ink-soft hover:bg-canvas',
    danger: 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50',
    link: 'text-brand-dark hover:text-brand-ink px-0',
  }[variant];
  const s = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' }[size];
  return (
    <button className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap', v, variant !== 'link' && s, variant === 'link' && 'text-sm', className)} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }) {
  return <div className={cx('bg-white border border-line rounded-2xl shadow-card', className)} {...rest}>{children}</div>;
}

export function Badge({ tone = 'neutral', className, children }) {
  const t = {
    neutral: 'bg-canvas text-ink-soft border-line',
    brand: 'bg-brand text-ink border-brand',
    soft: 'bg-brand-soft text-brand-ink border-[#F9DDB0]',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium', t, className)}>{children}</span>;
}

export function IconTile({ icon: Icon, tone = 'brand', size = 'md' }) {
  const t = {
    brand: 'bg-brand-soft text-brand-dark', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600', rose: 'bg-rose-50 text-rose-500', neutral: 'bg-canvas text-ink-soft',
  }[tone];
  const s = size === 'lg' ? 'h-12 w-12 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  return <div className={cx('grid place-items-center shrink-0', t, s)}><Icon size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} strokeWidth={1.8} /></div>;
}

export function Avatar({ user, size = 40, className }) {
  if (!user) return <div className={cx('rounded-full bg-canvas', className)} style={{ width: size, height: size }} />;
  if (user.photo) return <img src={user.photo} alt={user.name} className={cx('rounded-full object-cover shrink-0', className)} style={{ width: size, height: size }} />;
  return (
    <div className={cx('rounded-full grid place-items-center text-white font-semibold shrink-0 ring-2 ring-white', className)}
      style={{ width: size, height: size, background: user.color || '#F59E0B', fontSize: size * 0.36 }}>
      {initials(user.name)}
    </div>
  );
}

export function Stars({ value, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-brand text-brand' : 'text-line-strong'} />
      ))}
    </span>
  );
}

export function Trend({ value, invert = false }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-[12px] text-ink-faint">—</span>;
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cx('inline-flex items-center gap-1 text-[12.5px] font-medium', good ? 'text-emerald-600' : 'text-rose-500')}>
      <Icon size={14} />{Math.abs(value) > 300 ? (value > 0 ? '>+300' : '<-300') : `${value >= 0 ? '+' : ''}${Math.abs(value) >= 100 ? Math.round(value) : value.toFixed(1)}`}%
    </span>
  );
}

export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-xl', footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px] flex items-start justify-center overflow-y-auto p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('bg-white rounded-2xl shadow-lift w-full my-auto', width)}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h3 className="text-[17px] font-bold text-ink">{title}</h3>
            {subtitle && <p className="text-[13px] text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg hover:bg-canvas text-ink-soft" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 pb-5">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-ink-faint mt-1">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';
export const Input = (p) => <input {...p} className={cx(inputCls, 'h-10', p.className)} />;
export const Textarea = (p) => <textarea {...p} className={cx(inputCls, 'py-2.5 min-h-[96px]', p.className)} />;
export const Select = ({ children, ...p }) => (
  <div className="relative">
    <select {...p} className={cx(inputCls, 'h-10 appearance-none pr-9 bg-canvas/60', p.className)}>{children}</select>
    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
  </div>
);

export function Checkbox({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <span className={cx('mt-0.5 h-[18px] w-[18px] rounded-[5px] border grid place-items-center shrink-0', checked ? 'bg-brand border-brand' : 'bg-white border-line-strong')}>
        {checked && <Check size={13} strokeWidth={3} className="text-white" />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-[12.5px] text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

// Pill dropdown used by filters ("Budget ▾").
export function PillMenu({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const active = value && value !== 'any' && value !== 'all';
  const current = options.find((o) => o.id === value);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={cx('h-8 pl-3 pr-2 rounded-full border text-[13px] inline-flex items-center gap-1.5 transition-colors', active ? 'bg-brand-soft border-brand/60 text-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>
        {active ? current?.label : label}<ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 min-w-[190px] bg-white border border-line rounded-xl shadow-lift p-1">
          {options.map((o) => (
            <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} className={cx('w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center justify-between hover:bg-canvas', o.id === value && 'font-semibold')}>
              {o.label}{o.id === value && <Check size={14} className="text-brand-dark" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Segmented({ options, value, onChange, dark = true, size = 'md' }) {
  return (
    <div className="inline-flex bg-[#F1EEE8] rounded-xl p-1 gap-1 max-w-full overflow-x-auto">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={cx('rounded-lg font-medium transition-colors whitespace-nowrap', size === 'sm' ? 'px-3 h-8 text-[13px]' : 'px-4 h-9 text-[13.5px]',
            value === o.id ? (dark ? 'bg-ink text-white shadow' : 'bg-brand text-white shadow') : 'text-ink-muted hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="text-center py-12 px-6">
      {Icon && <Icon size={30} strokeWidth={1.5} className="mx-auto text-ink-muted mb-3" />}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {body && <p className="text-[13px] text-ink-muted mt-1 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHead({ title, icon: Icon, sub, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-4">
      <div>
        <h2 className="text-[20px] font-bold text-ink flex items-center gap-2">{Icon && <Icon size={19} className="text-brand-dark" />}{title}</h2>
        {sub && <p className="text-[13px] text-ink-muted mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, tone = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className={cx('px-4 py-2.5 rounded-xl text-sm shadow-lift', t.tone === 'err' ? 'bg-rose-600 text-white' : 'bg-ink text-white')}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// Run an action and surface thrown errors as a toast instead of crashing.
export function useAct() {
  const toast = useToast();
  return (fn, ok) => {
    try {
      const r = fn();
      if (ok) toast(ok);
      return r ?? true;
    } catch (e) {
      toast(e.message || 'Something went wrong', 'err');
      return false;
    }
  };
}

// ---------- confirm dialog (browser confirm() is blocked in embedded viewers) ----------
const ConfirmCtx = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmCtx);
export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = (v) => { req?.resolve(v); setReq(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!req} onClose={() => close(false)} title={req?.title || 'Are you sure?'} width="max-w-md">
        {req?.body && <p className="text-[14px] text-ink-soft">{req.body}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button variant={req?.danger ? 'dark' : 'primary'} onClick={() => close(true)}>{req?.confirm || 'Confirm'}</Button>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

// Clipboard can be refused inside some app views; tell the person what to copy instead.
export function useCopy() {
  const toast = useToast();
  return (text, label = 'Copied') => {
    try {
      const p = navigator.clipboard?.writeText(text);
      if (!p) throw new Error('no clipboard');
      p.then(() => toast(label), () => toast(`Copy this: ${text}`));
    } catch {
      toast(`Copy this: ${text}`);
    }
  };
}
