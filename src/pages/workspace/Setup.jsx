import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Send, Package, Store, Users, Circle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useDB, actions, campaignById } from '../../lib/store';
import { rankCreators } from '../../lib/match';
import { CATEGORIES } from '../../lib/constants';
import { peso, compact } from '../../lib/format';
import { appUrl } from '../../lib/links';
import { followersOf } from '../../lib/store';
import { MatchPill } from '../../components/visuals';
import { Card, Button, Field, Input, Select, Avatar, useAct, useCopy, cx } from '../../components/ui';
import { PhotoPicker } from '../../components/forms';

// First run for a new brand: product → shop page → creators. Nothing else on screen.
export function SetupWizard({ me, onDone }) {
  const d = useDB();
  const act = useAct();
  const copy = useCopy();
  const [step, setStep] = useState(1);
  const [cid, setCid] = useState(null);
  const [p, setP] = useState({ name: '', price: '', photos: [], shopUrl: me.business?.shopUrl || '', category: me.business?.category || 'food', about: '' });
  const [tiktok, setTiktok] = useState(me.business?.tiktok || '');
  const [sent, setSent] = useState([]);
  const shopLink = appUrl(`/shop/${me.id}`);
  const c = cid && campaignById(d, cid);
  const picks = c ? rankCreators(d, c).slice(0, 5) : [];

  const saveProduct = () => {
    if (!p.name.trim()) return act(() => { throw new Error('Add your product\'s name.'); });
    if (!p.photos.length) return act(() => { throw new Error('Add one photo. Creators decide from the photo first.'); });
    const id = act(() => actions.saveCampaign({
      productName: p.name.trim(), title: `Creators wanted: ${p.name.trim()}`, type: 'Product', category: p.category,
      description: p.about.trim() || `${p.name.trim()} by ${me.business.name}. Get it free and post an honest video about it.`, audience: '',
      compensation: 'gifted', giftValue: Number(p.price) || 0, aov: Number(p.price) || 0, budgetMin: 0, budgetMax: 0, commissionRate: 0, slots: 5,
      deliverables: [{ type: 'TikTok video', qty: 1, platform: 'tiktok' }], platforms: ['tiktok'], photos: p.photos, photoHints: [],
      shopUrl: p.shopUrl.trim(), contentRights: '90 days', published: true, requireDraft: false, tags: [], deadline: Date.now() + 21 * 86400000,
    }), 'Product added');
    if (id) { setCid(id); setStep(2); }
  };
  const saveShop = () => {
    act(() => actions.updateProfile({ business: { tiktok: tiktok.trim(), shopUrl: p.shopUrl.trim() || me.business.shopUrl } }));
    setStep(3);
  };
  const send = (u) => {
    if (act(() => actions.invite(cid, u.id, `Hi ${u.name.split(' ')[0]}! We'd love to send you our ${c.productName} for free. If you like it, post an honest TikTok about it.`), `Sent to ${u.name}`)) setSent((s) => [...s, u.id]);
  };

  const steps = [[1, 'Add your product', Package], [2, 'Your shop page', Store], [3, 'Send it to creators', Users]];
  return (
    <Card className="p-5 sm:p-7 max-w-3xl">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-dark">Get started · 3 quick steps</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {steps.map(([n, label, Icon]) => (
          <span key={n} className={cx('h-9 px-3 rounded-full text-[13px] inline-flex items-center gap-1.5 border', step === n ? 'bg-ink text-white border-ink' : step > n ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white border-line text-ink-muted')}>
            {step > n ? <Check size={14} /> : <Icon size={14} />}{n}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-[22px] font-bold">What are you selling?</h2>
          <Field label="A photo of it"><PhotoPicker photos={p.photos} onChange={(photos) => setP({ ...p, photos })} max={3} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Product name"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="e.g. Ube cheese pandesal box" /></Field>
            <Field label="Price (₱)"><Input type="number" min="0" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} /></Field>
            <Field label="Category"><Select value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })}>{CATEGORIES.slice(1).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select></Field>
            <Field label="Where people can buy it" hint="TikTok Shop, Shopee, Facebook page… or leave blank."><Input value={p.shopUrl} onChange={(e) => setP({ ...p, shopUrl: e.target.value })} placeholder="https://" /></Field>
          </div>
          <Field label="One line about it (optional)"><Input value={p.about} onChange={(e) => setP({ ...p, about: e.target.value })} placeholder="What makes it worth trying?" /></Field>
          <p className="text-[12.5px] text-ink-muted">You'll offer it to creators for free in exchange for a post. No budget needed. You can switch to paying a fee later.</p>
          <Button size="lg" onClick={saveProduct}>Next<ChevronRight size={16} /></Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-[22px] font-bold">Your free shop page is live</h2>
          <p className="text-[14px] text-ink-soft">Put this link in your TikTok and Instagram bio. Every creator post about you shows up there too.</p>
          <div className="flex gap-2"><input readOnly value={shopLink} className="flex-1 min-w-0 h-10 rounded-xl border border-line px-3 text-[13px] bg-canvas" /><Button onClick={() => copy(shopLink, 'Copied. Paste it in your bio!')}><Copy size={15} />Copy</Button></div>
          <Field label="Your TikTok handle (optional)"><Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@yourbrand" /></Field>
          <div className="flex gap-2"><Button size="lg" onClick={saveShop}>Next<ChevronRight size={16} /></Button><Link to={`/shop/${me.id}`} target="_blank"><Button size="lg" variant="outline">Preview it</Button></Link></div>
        </div>
      )}

      {step === 3 && c && (
        <div className="mt-6">
          <h2 className="text-[22px] font-bold">Send it to creators who fit</h2>
          <p className="text-[14px] text-ink-soft mt-1">These creators post about products like yours. Tap Send and we'll message them for you.</p>
          <div className="space-y-2 mt-4">
            {picks.map(({ u, m }) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                <Avatar user={u} size={38} />
                <div className="flex-1 min-w-0"><p className="font-semibold text-[14px]">{u.name}</p><p className="text-[12px] text-ink-muted truncate">{compact(followersOf(u))} followers · {u.creator.engagement}% engagement</p></div>
                <MatchPill {...m} />
                {sent.includes(u.id) ? <span className="text-[13px] text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 size={15} />Sent</span> : <Button size="sm" onClick={() => send(u)}><Send size={13} />Send</Button>}
              </div>
            ))}
          </div>
          <Button size="lg" className="mt-5" onClick={() => { act(() => actions.updateProfile({ base: { setupDone: true } })); onDone(); }}>{sent.length ? 'Done' : 'Skip for now'}</Button>
          {c.giftValue > 0 && <p className="text-[12px] text-ink-muted mt-2">Each creator who says yes gets one {c.productName} (worth {peso(c.giftValue)}). You only send it after you both accept.</p>}
        </div>
      )}
    </Card>
  );
}

// After setup: a short checklist until the basics are done.
export function NextSteps({ d, me }) {
  const mine = d.campaigns.filter((c) => c.ownerId === me.id);
  const ids = new Set(mine.map((c) => c.id));
  const steps = [
    [mine.length > 0, 'Add a product', '/workspace/shop'],
    [!!(me.business?.tiktok || me.business?.instagram), 'Put your shop link in your TikTok or Instagram bio', '/workspace/shop'],
    [d.applications.some((a) => ids.has(a.campaignId)), 'Send your product to creators', '/workspace/collabs?view=find'],
    [d.deliverables.some((x) => ids.has(x.campaignId) && x.status === 'approved'), 'Approve your first creator post', '/workspace/collabs'],
    [d.launches.some((l) => l.brandId === me.id), 'Launch a product on the Launch Pad (free)', '/launchpad'],
  ];
  const done = steps.filter(([ok]) => ok).length;
  if (done === steps.length) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3"><p className="font-bold">Your next steps</p><span className="text-[12.5px] text-ink-muted">{done} of {steps.length} done</span></div>
      <div className="h-1.5 rounded-full bg-canvas mt-2"><div className="h-full rounded-full bg-brand" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <div className="mt-3 divide-y divide-line">
        {steps.map(([ok, label, to]) => (
          <Link key={label} to={to} className="flex items-center gap-3 py-2.5 text-[14px] group">
            {ok ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <Circle size={18} className="text-line-strong shrink-0" />}
            <span className={cx('flex-1', ok ? 'text-ink-muted line-through' : 'group-hover:underline')}>{label}</span>
            {!ok && <ChevronRight size={16} className="text-ink-muted" />}
          </Link>
        ))}
      </div>
    </Card>
  );
}
