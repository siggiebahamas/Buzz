import { useRef, useState } from 'react';
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, LISTING_TYPES, COMP_TYPES, PLATFORMS, DELIVERABLE_TYPES, COMMUNITY_TOPICS, COLLAB_KINDS, REGIONS } from '../lib/constants';
import { useDB, currentUser, actions, campaignById, userById } from '../lib/store';
import { DAY } from '../lib/format';
import { Modal, Field, Input, Textarea, Select, Button, Checkbox, useAct, cx } from './ui';

// Downscale uploads so they fit comfortably in browser storage.
function compress(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoPicker({ photos, onChange, max = 5, label = 'Add' }) {
  const ref = useRef(null);
  const add = async (files) => {
    const list = await Promise.all([...files].slice(0, max - photos.length).map((f) => compress(f)));
    onChange([...photos, ...list]);
  };
  return (
    <div className="flex flex-wrap gap-2.5">
      {photos.map((p, i) => (
        <div key={i} className="relative h-[84px] w-[84px] rounded-xl overflow-hidden border border-line">
          <img src={p} alt="" className="h-full w-full object-cover" />
          {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-white/90 rounded px-1">Cover</span>}
          <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-ink/70 text-white grid place-items-center"><X size={12} /></button>
        </div>
      ))}
      {photos.length < max && (
        <button type="button" onClick={() => ref.current.click()} className="h-[84px] w-[84px] rounded-xl border-2 border-dashed border-line-strong text-ink-muted hover:border-brand hover:text-brand-dark flex flex-col items-center justify-center gap-1 text-[12px]">
          <ImagePlus size={18} />{label}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

const blankCampaign = () => ({
  productName: '', title: '', type: 'Product', category: 'food', description: '', audience: '',
  compensation: 'flat', budgetMin: 1000, budgetMax: 3000, commissionRate: 10, slots: 3,
  deliverables: [{ type: 'Reel', qty: 1, platform: 'instagram' }], photos: [], photoHints: [],
  deadline: Date.now() + 21 * DAY, contentRights: '90 days', shopUrl: '', aov: 0, published: true,
});

export function CampaignForm({ open, onClose, initial, onSaved }) {
  const act = useAct();
  const [f, setF] = useState(() => ({ ...blankCampaign(), ...(initial || {}) }));
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setDel = (i, k, v) => set('deliverables', f.deliverables.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  const needsFee = ['flat', 'hybrid'].includes(f.compensation);
  const needsCom = ['commission', 'hybrid'].includes(f.compensation);

  const submit = (e) => {
    e.preventDefault();
    if (!f.productName.trim() || !f.title.trim()) return setErr('Add a product name and a headline.');
    if (!f.photos.length && !initial?.id) return setErr('Add at least one photo. Creators decide from the photo first.');
    if (needsFee && (!(Number(f.budgetMin) > 0) || Number(f.budgetMax) < Number(f.budgetMin))) return setErr('Set a budget per creator (max must be at least min).');
    if (needsCom && !(Number(f.commissionRate) > 0)) return setErr('Set a commission rate.');
    if (!f.deliverables.length) return setErr('Add at least one deliverable.');
    const data = {
      ...f,
      budgetMin: needsFee ? Number(f.budgetMin) : 0, budgetMax: needsFee ? Number(f.budgetMax) : 0,
      commissionRate: needsCom ? Number(f.commissionRate) : 0, slots: Number(f.slots) || 1, aov: Number(f.aov) || 0,
      platforms: [...new Set(f.deliverables.map((d) => d.platform))],
      summary: f.description.split('. ')[0],
    };
    const id = act(() => actions.saveCampaign(data), initial?.id ? 'Changes saved' : 'Opportunity posted');
    if (id) { onClose(); onSaved?.(typeof id === 'string' ? id : initial?.id); }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit opportunity' : 'Post an Opportunity'} subtitle="This becomes a campaign in your workspace and a listing creators can apply to." width="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Product photos (first one is the cover)" hint="Clear product shots win. Up to 5 photos.">
          <PhotoPicker photos={f.photos} onChange={(p) => set('photos', p)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product / service name"><Input value={f.productName} onChange={(e) => set('productName', e.target.value)} placeholder="e.g. Sili Republic Hot Sauce" /></Field>
          <Field label="Listing type"><Select value={f.type} onChange={(e) => set('type', e.target.value)}>{LISTING_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        </div>
        <Field label="Headline creators will see"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Looking for 5 food creators for our hot sauce launch" /></Field>
        <Field label="Brief"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What is it, what makes it special, what kind of content do you want?" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
          <Field label="Target audience"><Input value={f.audience} onChange={(e) => set('audience', e.target.value)} placeholder="Women 18–34, Metro Manila" /></Field>
        </div>

        <div className="rounded-2xl bg-canvas/70 border border-line p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="How you'll pay creators"><Select value={f.compensation} onChange={(e) => set('compensation', e.target.value)}>{Object.entries(COMP_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Creators needed"><Input type="number" min="1" value={f.slots} onChange={(e) => set('slots', e.target.value)} /></Field>
          </div>
          {needsFee && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fee per creator: min (₱)"><Input type="number" min="0" value={f.budgetMin} onChange={(e) => set('budgetMin', e.target.value)} /></Field>
              <Field label="Fee per creator: max (₱)"><Input type="number" min="0" value={f.budgetMax} onChange={(e) => set('budgetMax', e.target.value)} /></Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {needsCom && <Field label="Commission on each sale (%)"><Input type="number" min="1" max="60" value={f.commissionRate} onChange={(e) => set('commissionRate', e.target.value)} /></Field>}
            <Field label="Average order value (₱)" hint="Used to estimate creator earnings."><Input type="number" min="0" value={f.aov} onChange={(e) => set('aov', e.target.value)} /></Field>
          </div>
        </div>

        <Field label="Deliverables per creator">
          <div className="space-y-2">
            {f.deliverables.map((d, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input type="number" min="1" value={d.qty} onChange={(e) => setDel(i, 'qty', Number(e.target.value))} className="!w-20" />
                <div className="flex-1"><Select value={d.type} onChange={(e) => setDel(i, 'type', e.target.value)}>{DELIVERABLE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></div>
                <div className="flex-1"><Select value={d.platform} onChange={(e) => setDel(i, 'platform', e.target.value)}>{Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
                <button type="button" onClick={() => set('deliverables', f.deliverables.filter((_, j) => j !== i))} className="p-2 text-ink-muted hover:text-rose-600"><Trash2 size={16} /></button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set('deliverables', [...f.deliverables, { type: 'Story set', qty: 1, platform: 'instagram' }])}><Plus size={14} />Add deliverable</Button>
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Apply by"><Input type="date" value={new Date(f.deadline).toISOString().slice(0, 10)} onChange={(e) => set('deadline', new Date(e.target.value).getTime())} /></Field>
          <Field label="Content rights"><Select value={f.contentRights} onChange={(e) => set('contentRights', e.target.value)}>{['30 days', '60 days', '90 days', '1 year', 'None'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Shop link"><Input value={f.shopUrl} onChange={(e) => set('shopUrl', e.target.value)} placeholder="Shopee / Lazada / site" /></Field>
        </div>
        <Checkbox checked={f.published} onChange={(v) => set('published', v)} label="List on Opportunities" hint="Uncheck to keep it private and invite creators directly." />
        {err && <p className="text-[13px] text-rose-600">{err}</p>}
        <Button type="submit" size="lg" className="w-full">{initial?.id ? 'Save changes' : 'Publish opportunity'}</Button>
      </form>
    </Modal>
  );
}

export function ApplyModal({ open, onClose, campaign }) {
  const d = useDB();
  const me = currentUser(d);
  const act = useAct();
  const [pitch, setPitch] = useState('');
  const [rate, setRate] = useState(me?.creator?.rates?.reel || campaign.budgetMin || 0);
  const paysFee = ['flat', 'hybrid'].includes(campaign.compensation);
  const submit = (e) => {
    e.preventDefault();
    if (pitch.trim().length < 15) return;
    if (act(() => actions.apply(campaign.id, { pitch: pitch.trim(), rate: paysFee ? rate : 0 }), 'Application sent. The brand has been notified.')) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Apply to collaborate" subtitle={campaign.title}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your pitch" hint="Why you, and what content you'd make. Minimum 15 characters.">
          <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="My audience is… I'd create… Past results…" />
        </Field>
        {paysFee && (
          <Field label="Your rate for this campaign (₱)" hint={`Brand budget: ₱${campaign.budgetMin.toLocaleString()} – ₱${campaign.budgetMax.toLocaleString()} per creator`}>
            <Input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        )}
        <div className="rounded-xl bg-canvas p-3 text-[12.5px] text-ink-soft">
          If accepted you'll get your own tracking link and promo code, and these deliverables: {campaign.deliverables.map((x) => `${x.qty}× ${x.type}`).join(', ')}.
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pitch.trim().length < 15}>Send application</Button>
      </form>
    </Modal>
  );
}

export function InviteModal({ open, onClose, creator, campaignId }) {
  const d = useDB();
  const act = useAct();
  const mine = d.campaigns.filter((c) => c.ownerId === d.session.userId && c.status !== 'completed');
  const [cid, setCid] = useState(campaignId || mine[0]?.id || '');
  const [note, setNote] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (act(() => actions.invite(cid, creator.id, note.trim()), `Invite sent to ${creator.name}`)) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Invite ${creator.name}`} subtitle="They'll get a notification and a message from you.">
      {mine.length === 0 ? <p className="text-sm text-ink-muted">You don't have an open campaign yet. Post an opportunity first.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Campaign"><Select value={cid} onChange={(e) => setCid(e.target.value)}>{mine.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></Field>
          <Field label="Personal note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Hi ${creator.name.split(' ')[0]}! Loved your recent content…`} /></Field>
          <Button type="submit" size="lg" className="w-full">Send invite</Button>
        </form>
      )}
    </Modal>
  );
}

export function PostModal({ open, onClose, defaultTopic = 'ideas', onPosted }) {
  const d = useDB();
  const me = currentUser(d);
  const act = useAct();
  const projects = d.campaigns.filter((c) => c.ownerId === me?.id || d.applications.some((a) => a.campaignId === c.id && a.creatorId === me?.id && a.status === 'accepted'));
  const [f, setF] = useState({ title: '', topic: defaultTopic, campaignId: '', body: '', photos: [], anonymous: false, notify: true });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim() || !f.body.trim()) return;
    const id = act(() => actions.createPost({ ...f, campaignId: f.campaignId || null }), 'Posted to the community');
    if (id) { onClose(); onPosted?.(id); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Share with the Community" subtitle="Ask, share progress or find collaborators.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Post title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Give your post a punchy headline…" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Topic"><Select value={f.topic} onChange={(e) => set('topic', e.target.value)}>{COMMUNITY_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></Field>
          <Field label="Which product / campaign is this about?">
            <Select value={f.campaignId} onChange={(e) => set('campaignId', e.target.value)}>
              <option value="">Other / General</option>
              {projects.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Main body"><Textarea value={f.body} onChange={(e) => set('body', e.target.value)} className="min-h-[140px]" placeholder={'What milestone did you hit since your last update?\n\nWhat is the single biggest bottleneck you are stuck on right now?'} /></Field>
        <Field label="Photos (optional)"><PhotoPicker photos={f.photos} onChange={(p) => set('photos', p)} max={4} /></Field>
        <div className="border-t border-line pt-4 space-y-3">
          <Checkbox checked={f.anonymous} onChange={(v) => set('anonymous', v)} label="Post anonymously" hint="Hide your identity. Useful for sensitive numbers or early ideas." />
          <Checkbox checked={f.notify} onChange={(v) => set('notify', v)} label="Notify followers of this project" hint="People following updates on this product get alerted." />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!f.title.trim() || !f.body.trim()}>Publish</Button>
      </form>
    </Modal>
  );
}

export function CollabModal({ open, onClose }) {
  const act = useAct();
  const [f, setF] = useState({ kind: 'bundle', title: '', description: '', category: 'food', slots: 3, deadline: Date.now() + 14 * DAY });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    if (act(() => actions.createCollab({ ...f, slots: Math.max(2, Number(f.slots) || 2) }), 'Collab posted')) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Start a collab" subtitle="Team up with other founders or creators and split the cost.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type"><Select value={f.kind} onChange={(e) => set('kind', e.target.value)}>{Object.entries(COLLAB_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        </div>
        <Field label="Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Taste of Cebu pasalubong box" /></Field>
        <Field label="What's the plan?"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Who you're looking for, how costs are split, what each member gets." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total members (incl. you)"><Input type="number" min="2" value={f.slots} onChange={(e) => set('slots', e.target.value)} /></Field>
          <Field label="Join by"><Input type="date" value={new Date(f.deadline).toISOString().slice(0, 10)} onChange={(e) => set('deadline', new Date(e.target.value).getTime())} /></Field>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!f.title.trim()}>Post collab</Button>
      </form>
    </Modal>
  );
}

export function SubmitDeliverableModal({ open, onClose, deliverable }) {
  const act = useAct();
  const [url, setUrl] = useState(deliverable.contentUrl || '');
  const s0 = deliverable.stats || { reach: '', likes: '', comments: '', shares: '', saves: '' };
  const [s, setS] = useState(s0);
  const submit = (e) => {
    e.preventDefault();
    const stats = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Number(v) || 0]));
    const fn = deliverable.status === 'todo' || deliverable.status === 'revision'
      ? () => actions.submitDeliverable(deliverable.id, { contentUrl: url.trim(), stats })
      : () => actions.updateStats(deliverable.id, stats);
    if (act(fn, 'Saved')) onClose();
  };
  const editingStats = !['todo', 'revision'].includes(deliverable.status);
  return (
    <Modal open={open} onClose={onClose} title={editingStats ? 'Update post stats' : 'Submit content'} subtitle={deliverable.title}>
      <form onSubmit={submit} className="space-y-4">
        {!editingStats && <Field label="Link to your post"><Input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" /></Field>}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Post stats (from your insights)</p>
          <div className="grid grid-cols-5 gap-2">
            {['reach', 'likes', 'comments', 'shares', 'saves'].map((k) => (
              <label key={k} className="block">
                <span className="block text-[11.5px] text-ink-muted capitalize mb-1">{k}</span>
                <Input type="number" min="0" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <p className="text-[12px] text-ink-faint mt-1.5">You can update these later as the post keeps getting views.</p>
        </div>
        <Button type="submit" size="lg" className="w-full">{editingStats ? 'Save stats' : 'Submit for approval'}</Button>
      </form>
    </Modal>
  );
}

export function LogSaleModal({ open, onClose, links }) {
  const d = useDB();
  const act = useAct();
  const [linkId, setLinkId] = useState(links[0]?.id || '');
  const [amount, setAmount] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return;
    if (act(() => actions.logSale(linkId, Number(amount)), 'Sale recorded')) { setAmount(''); onClose(); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Log a sale from a promo code" subtitle="When a customer uses a creator's code in your shop, record it here so ROI stays accurate.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Promo code used">
          <Select value={linkId} onChange={(e) => setLinkId(e.target.value)}>
            {links.map((l) => <option key={l.id} value={l.id}>{l.code} ({userById(d, l.creatorId)?.name}, {campaignById(d, l.campaignId)?.productName})</option>)}
          </Select>
        </Field>
        <Field label="Order amount (₱)"><Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={!(Number(amount) > 0)}>Record sale</Button>
      </form>
    </Modal>
  );
}

export function ReviewModal({ open, onClose, campaignId, toUser }) {
  const act = useAct();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (act(() => actions.review({ campaignId, toId: toUser.id, rating, text: text.trim() }), 'Review posted')) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Review ${toUser.name}`} subtitle="Reviews are public and help others choose partners.">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button type="button" key={i} onClick={() => setRating(i)} className={cx('h-10 w-10 rounded-xl border text-lg', i <= rating ? 'bg-brand-soft border-brand text-brand-dark' : 'border-line text-ink-faint')}>★</button>
          ))}
        </div>
        <Field label="What was it like working together?"><Textarea value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={!text.trim()}>Post review</Button>
      </form>
    </Modal>
  );
}

export { REGIONS };
