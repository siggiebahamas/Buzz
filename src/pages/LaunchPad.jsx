import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rocket, ChevronUp, Megaphone, Trophy, Plus, Store, Users } from 'lucide-react';
import { useDB, currentUser, userById, campaignById, brandName, actions } from '../lib/store';
import { weekStart, launchesFor } from '../lib/grow';
import { CATEGORIES } from '../lib/constants';
import { peso, DAY } from '../lib/format';
import { ProductImage } from '../components/visuals';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Select, Textarea, EmptyState, Segmented, useAct, cx } from '../components/ui';

// A launch's picture: its listing's photos, or a category placeholder.
export function LaunchImage({ d, l, className }) {
  const c = l.campaignId && campaignById(d, l.campaignId);
  const pseudo = c || { id: l.id, category: l.category, productName: l.title, photos: l.photo ? [l.photo] : [], photoHints: [l.title] };
  return <ProductImage campaign={pseudo} className={className} />;
}

const weekLabel = (w) => `${new Date(w).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${new Date(w + 6 * DAY).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;

export default function LaunchPad() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const me = currentUser(d);
  const [tab, setTab] = useState('now');
  const [cat, setCat] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [pitching, setPitching] = useState(null);
  const thisWeek = weekStart();
  const week = tab === 'now' ? thisWeek : thisWeek - 7 * DAY;
  const all = launchesFor(d, week);
  const list = all.filter((l) => cat === 'all' || l.category === cat);
  const mine = me && d.launches.find((l) => l.brandId === me.id && l.week === thisWeek);
  const hoursLeft = Math.max(0, Math.ceil((thisWeek + 7 * DAY - Date.now()) / 3600000));
  const need = (fn) => (me ? fn() : nav('/login', { state: { from: '/launchpad' } }));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-br from-[#FBF4E8] to-white border border-line p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-dark flex items-center gap-1.5"><Rocket size={14} />Launch Pad</p>
            <h1 className="text-[30px] sm:text-[36px] font-extrabold leading-tight mt-1" style={{ textWrap: 'balance' }}>New local products, picked by the community</h1>
            <p className="text-ink-muted mt-2">Free for every brand, once a week. The community votes, creators find their next collab here, and nobody can pay to rank higher.</p>
          </div>
          {me?.business && (mine
            ? <Badge tone="green">You launched "{mine.title}" this week</Badge>
            : <Button size="lg" onClick={() => setSubmitting(true)}><Plus size={16} />Launch a product</Button>)}
          {!me && <Button size="lg" onClick={() => nav('/signup')}>Launch your product free</Button>}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-xl">
          {[[all.length, tab === 'now' ? 'launching this week' : 'launched that week'], [all.reduce((a, l) => a + l.votes.length, 0), 'votes'], [all.reduce((a, l) => a + l.interested.length, 0), 'creator offers']].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-white border border-line p-3"><p className="text-[22px] font-extrabold tabular-nums">{v}</p><p className="text-[12px] text-ink-muted">{l}</p></div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 justify-between">
        <Segmented value={tab} onChange={setTab} options={[{ id: 'now', label: 'This week' }, { id: 'last', label: 'Last week\'s winners' }]} />
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-ink-muted">{tab === 'now' ? `Voting closes in ${hoursLeft > 24 ? `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h` : `${hoursLeft}h`}` : weekLabel(week)}</p>
          <div className="w-44"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.id === 'all' ? 'All categories' : c.label}</option>)}</Select></div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 && <Card><EmptyState icon={Rocket} title="Nothing launched here yet" body={me?.business ? 'Be the first this week. It\'s free.' : 'Check back soon.'} /></Card>}
        {list.map((l) => {
          const rank = all.indexOf(l) + 1;
          const brand = userById(d, l.brandId);
          const voted = me && l.votes.includes(me.id);
          const own = me?.id === l.brandId;
          return (
            <Card key={l.id} className="p-3 sm:p-4 flex gap-3 sm:gap-4 items-start">
              <div className="w-8 text-center shrink-0 pt-1">
                {tab === 'last' && rank <= 3 ? <Trophy size={20} className={cx('mx-auto', rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-stone-400' : 'text-amber-700')} /> : <p className="text-[18px] font-extrabold text-ink-muted">{rank}</p>}
              </div>
              <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden"><LaunchImage d={d} l={l} className="w-full h-full" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[16px]">{l.title}</p>
                  {tab === 'last' && rank === 1 && <Badge tone="brand">Launch of the week</Badge>}
                </div>
                <p className="text-[13.5px] text-ink-soft mt-0.5">{l.pitch}</p>
                <p className="text-[12.5px] text-ink-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link to={`/shop/${brand.id}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Avatar user={brand} size={18} />{brandName(brand)}</Link>
                  {l.price > 0 && <span>{peso(l.price)}</span>}
                  {l.interested.length > 0 && <span className="inline-flex items-center gap-1 text-brand-dark font-medium"><Megaphone size={12} />{l.interested.length} creator{l.interested.length > 1 ? 's' : ''} want to post</span>}
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <Link to={`/shop/${brand.id}`}><Button size="sm" variant="outline"><Store size={14} />Shop page</Button></Link>
                  {!own && (!me || me.creator) && <Button size="sm" variant="soft" disabled={me && l.interested.includes(me.id)} onClick={() => need(() => setPitching(l))}><Megaphone size={14} />{me && l.interested.includes(me.id) ? 'Offer sent' : 'I want to post this'}</Button>}
                </div>
              </div>
              <button disabled={own || tab !== 'now'} onClick={() => need(() => act(() => actions.voteLaunch(l.id)))} aria-label={`Vote for ${l.title}`}
                className={cx('w-14 shrink-0 rounded-xl border flex flex-col items-center py-2 transition-colors', voted ? 'bg-brand text-white border-brand' : 'bg-white border-line-strong hover:border-brand', (own || tab !== 'now') && 'opacity-70 cursor-default')}>
                <ChevronUp size={18} /><span className="text-[14px] font-bold tabular-nums">{l.votes.length}</span>
              </button>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
        <Users size={22} className="text-brand-dark shrink-0" />
        <p className="text-[13.5px] text-ink-soft flex-1"><b className="text-ink">How it works.</b> Every brand gets one free launch a week. Votes reset each Monday. The top 3 stay on last week's board, and creators use the board to find products worth posting about. Votes can't be bought.</p>
      </Card>

      {submitting && <SubmitLaunch onClose={() => setSubmitting(false)} />}
      {pitching && <PitchModal l={pitching} onClose={() => setPitching(null)} />}
    </main>
  );
}

function SubmitLaunch({ onClose }) {
  const d = useDB();
  const act = useAct();
  const me = currentUser(d);
  const listings = d.campaigns.filter((c) => c.ownerId === me.id && !c.removed);
  const [f, setF] = useState({ title: '', pitch: '', price: '', campaignId: listings[0]?.id || '', category: me.business?.category || 'food', shopUrl: me.business?.tiktokShopUrl || me.business?.shopUrl || '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal open onClose={onClose} title="Launch a product" subtitle="Free. One launch per brand each week.">
      <div className="space-y-3">
        <Field label="Product name"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Ube cheese pandesal box" /></Field>
        <Field label="One-line pitch" hint="What makes it worth trying? Keep it under 100 characters."><Input maxLength={100} value={f.pitch} onChange={(e) => set('pitch', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₱)"><Input type="number" min="0" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        </div>
        <Field label="Photos from" hint="Uses that listing's photos. Pick none to show a placeholder."><Select value={f.campaignId} onChange={(e) => set('campaignId', e.target.value)}><option value="">None</option>{listings.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></Field>
        <Field label="Where to buy (optional)"><Input value={f.shopUrl} onChange={(e) => set('shopUrl', e.target.value)} placeholder="TikTok Shop, Shopee or your site" /></Field>
      </div>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.submitLaunch(f), 'You\'re on the Launch Pad!')) onClose(); }}><Rocket size={16} />Launch it</Button>
    </Modal>
  );
}

function PitchModal({ l, onClose }) {
  const act = useAct();
  const [note, setNote] = useState(`Hi! Saw "${l.title}" on the Launch Pad and I'd love to post about it. Open to product-for-content?`);
  return (
    <Modal open onClose={onClose} title="Offer to post" subtitle={l.title}>
      <Field label="Message to the brand"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <p className="text-[12px] text-ink-muted mt-2">It goes to their Messages. Many small brands start with product-for-content, so say what you'd post.</p>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.wantToPost(l.id, note), 'Sent! Watch your Messages for their reply.')) onClose(); }}><Megaphone size={16} />Send offer</Button>
    </Modal>
  );
}
