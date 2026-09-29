import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useDB, actions } from '../../lib/store';
import { CATEGORIES, PLATFORMS, REGIONS } from '../../lib/constants';
import { Card, Field, Input, Textarea, Select, Button, Avatar, Checkbox, cx, useAct } from '../../components/ui';
import { useMode, PageHead } from './Layout';

function readImage(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = 240 / Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = 240;
        c.getContext('2d').drawImage(img, (240 - img.width * s) / 2, (240 - img.height * s) / 2, img.width * s, img.height * s);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

export default function MyProfile() {
  const { me } = useMode();
  const act = useAct();
  const fileRef = useRef(null);
  const [base, setBase] = useState({ name: me.name, bio: me.bio || '', location: me.location || '', region: me.region || 'Metro Manila', photo: me.photo });
  const [hasBiz, setHasBiz] = useState(!!me.business);
  const [biz, setBiz] = useState(me.business || { name: '', type: '', category: 'food', website: '', shopUrl: '' });
  const [hasCr, setHasCr] = useState(!!me.creator);
  const [cr, setCr] = useState(me.creator || { handle: '', niches: ['food'], platforms: [{ id: 'instagram', followers: 0 }], engagement: 0, rates: { reel: 0, post: 0, story: 0 }, audience: '' });

  const save = (e) => {
    e.preventDefault();
    if (!hasBiz && !hasCr) return act(() => { throw new Error('Keep at least one profile: creator or business.'); });
    act(() => actions.updateProfile({
      base,
      business: hasBiz ? biz : null,
      creator: hasCr ? { ...cr, engagement: Number(cr.engagement) || 0, platforms: cr.platforms.map((p) => ({ ...p, followers: Number(p.followers) || 0 })), rates: Object.fromEntries(Object.entries(cr.rates).map(([k, v]) => [k, Number(v) || 0])) } : null,
    }), 'Profile saved');
  };
  const setP = (i, k, v) => setCr({ ...cr, platforms: cr.platforms.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const toggleNiche = (id) => setCr({ ...cr, niches: cr.niches.includes(id) ? cr.niches.filter((n) => n !== id) : [...cr.niches, id] });

  return (
    <>
      <PageHead title="My Profile" sub="Your public profile. Complete profiles get better matches." action={<Link to={`/profile/${me.id}`}><Button variant="outline"><ExternalLink size={15} />View public profile</Button></Link>} />
      <form onSubmit={save} className="max-w-3xl space-y-5">
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar user={{ ...me, photo: base.photo, name: base.name }} size={72} />
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current.click()}><Upload size={14} />Change photo</Button>
              <p className="text-[12.5px] text-ink-muted mt-1">{me.email}</p>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { if (e.target.files[0]) setBase({ ...base, photo: await readImage(e.target.files[0]) }); }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Full name"><Input value={base.name} onChange={(e) => setBase({ ...base, name: e.target.value })} /></Field>
            <Field label="City"><Input value={base.location} onChange={(e) => setBase({ ...base, location: e.target.value })} /></Field>
            <Field label="Region"><Select value={base.region} onChange={(e) => setBase({ ...base, region: e.target.value })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          </div>
          <Field label="Bio"><Textarea value={base.bio} onChange={(e) => setBase({ ...base, bio: e.target.value })} placeholder="Tell the community about yourself…" /></Field>
        </Card>

        <Card className="p-6">
          <Checkbox checked={hasCr} onChange={setHasCr} label="I'm a creator" hint="Shows your audience, rates and results to brands." />
          {hasCr && (
            <div className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Handle"><Input value={cr.handle} onChange={(e) => setCr({ ...cr, handle: e.target.value.replace(/^@/, '') })} /></Field>
                <Field label="Average engagement rate (%)" hint="From your insights: interactions ÷ reach"><Input type="number" step="0.1" min="0" value={cr.engagement} onChange={(e) => setCr({ ...cr, engagement: e.target.value })} /></Field>
              </div>
              <Field label="Niches">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.slice(1).map((c) => (
                    <button type="button" key={c.id} onClick={() => toggleNiche(c.id)} className={cx('h-8 px-3 rounded-full border text-[13px] inline-flex items-center gap-1.5', cr.niches.includes(c.id) ? 'bg-brand-soft border-brand text-ink' : 'bg-white border-line-strong text-ink-soft')}><c.icon size={14} />{c.label}</button>
                  ))}
                </div>
              </Field>
              <Field label="Platforms & followers">
                <div className="space-y-2">
                  {cr.platforms.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-48"><Select value={p.id} onChange={(e) => setP(i, 'id', e.target.value)}>{Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
                      <Input type="number" min="0" value={p.followers} onChange={(e) => setP(i, 'followers', e.target.value)} placeholder="Followers" />
                      <button type="button" onClick={() => setCr({ ...cr, platforms: cr.platforms.filter((_, j) => j !== i) })} className="p-2 text-ink-muted hover:text-rose-600"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setCr({ ...cr, platforms: [...cr.platforms, { id: 'tiktok', followers: 0 }] })}><Plus size={14} />Add platform</Button>
                </div>
              </Field>
              <div className="grid grid-cols-3 gap-4">
                {[['reel', 'Reel / TikTok (₱)'], ['post', 'Feed post (₱)'], ['story', 'Story set (₱)']].map(([k, l]) => (
                  <Field key={k} label={l}><Input type="number" min="0" value={cr.rates[k]} onChange={(e) => setCr({ ...cr, rates: { ...cr.rates, [k]: e.target.value } })} /></Field>
                ))}
              </div>
              <Field label="Who is your audience?"><Input value={cr.audience} onChange={(e) => setCr({ ...cr, audience: e.target.value })} placeholder="Women 18–34, Metro Manila" /></Field>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <Checkbox checked={hasBiz} onChange={setHasBiz} label="I own a business" hint="Lets you post opportunities and hire creators." />
          {hasBiz && (
            <div className="grid grid-cols-2 gap-4 mt-5">
              <Field label="Business name"><Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} /></Field>
              <Field label="What you sell"><Input value={biz.type} onChange={(e) => setBiz({ ...biz, type: e.target.value })} /></Field>
              <Field label="Main category"><Select value={biz.category} onChange={(e) => setBiz({ ...biz, category: e.target.value })}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
              <Field label="Shop link (Shopee, Lazada, site)"><Input value={biz.shopUrl} onChange={(e) => setBiz({ ...biz, shopUrl: e.target.value })} /></Field>
            </div>
          )}
        </Card>
        <Button type="submit" size="lg" className="w-full">Save Profile</Button>
      </form>
    </>
  );
}
