export const DAY = 86400000;

export function peso(n, { compact = false } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  if (compact && Math.abs(n) >= 1000) {
    const v = n / 1000;
    return `₱${v >= 100 ? Math.round(v) : v.toFixed(v % 1 === 0 ? 0 : 1)}K`;
  }
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

export function compact(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

export function pct(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function budgetLabel(c) {
  if (c.compensation === 'commission') return `${c.commissionRate}% commission`;
  if (c.compensation === 'gifted') return 'Product gifting';
  const range = c.budgetMin === c.budgetMax
    ? peso(c.budgetMin, { compact: true })
    : `${peso(c.budgetMin, { compact: true })} – ${peso(c.budgetMax, { compact: true })}`;
  return c.compensation === 'hybrid' ? `${range} + ${c.commissionRate}%` : range;
}

export function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function shortDate(ts) {
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function dueLabel(ts) {
  const days = Math.ceil((ts - Date.now()) / DAY);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
