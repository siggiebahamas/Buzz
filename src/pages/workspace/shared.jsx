import { PERIODS } from '../../lib/metrics';
import { Card, IconTile, Trend, Input, cx } from '../../components/ui';

export function PeriodPicker({ period, setPeriod, custom, setCustom }) {
  return (
    <div className="flex items-center gap-3">
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="!h-9 !w-[150px]" />
          <span className="text-ink-muted text-sm">to</span>
          <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="!h-9 !w-[150px]" />
        </div>
      )}
      <div className="inline-flex bg-[#F1EEE8] rounded-xl p-1 gap-0.5">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={cx('px-3 h-8 rounded-lg text-[13px] transition-colors', period === p.id ? 'bg-brand text-white font-medium shadow' : 'text-ink-muted hover:text-ink')}>{p.label}</button>
        ))}
      </div>
    </div>
  );
}

export function Kpi({ icon, value, label, change, invert, hint, tone = 'brand' }) {
  return (
    <Card className="p-5" title={hint}>
      <div className="flex items-start justify-between">
        <IconTile icon={icon} tone={tone} />
        {change !== undefined && <Trend value={change} invert={invert} />}
      </div>
      <p className="text-[26px] font-bold text-ink mt-3 leading-none">{value}</p>
      <p className="text-[13px] text-ink-muted mt-1.5">{label}</p>
      {hint && <p className="text-[11.5px] text-ink-faint mt-1 leading-snug">{hint}</p>}
    </Card>
  );
}

export const defaultCustom = () => {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
};

export const STATUS_TONE = { recruiting: 'neutral', active: 'brand', tracking: 'blue', completed: 'green' };
export const DEL_STATUS = {
  todo: ['To do', 'neutral'], submitted: ['Awaiting approval', 'blue'], revision: ['Revision requested', 'red'], approved: ['Approved', 'green'],
};
