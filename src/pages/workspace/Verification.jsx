import { useRef, useState } from 'react';
import { BadgeCheck, Store, Megaphone, Upload, Clock, XCircle, FileText, ShieldCheck } from 'lucide-react';
import { useDB, actions } from '../../lib/store';
import { PLATFORMS } from '../../lib/constants';
import { timeAgo } from '../../lib/format';
import { Card, Button, Badge, Field, Input, Select, Textarea, useAct, cx } from '../../components/ui';
import { useMode, PageHead } from './Layout';

const BIZ_DOCS = ['DTI Business Name Registration', 'SEC Certificate of Registration', 'Mayor\'s / Business Permit', 'BIR Certificate of Registration (Form 2303)', 'CDA Registration (cooperatives)'];

function FilePick({ file, onChange, accept = 'image/*,application/pdf' }) {
  const ref = useRef(null);
  const [err, setErr] = useState('');
  const pick = (f) => {
    if (!f) return;
    if (f.size > 2.5 * 1024 * 1024) { setErr('That file is over 2.5 MB. Upload a smaller photo or PDF.'); return; }
    const r = new FileReader();
    r.onload = () => { setErr(''); onChange({ name: f.name, type: f.type, data: r.result }); };
    r.readAsDataURL(f);
  };
  return (
    <div>
      <button type="button" onClick={() => ref.current.click()} className={cx('w-full rounded-xl border-2 border-dashed px-4 py-5 text-center text-[13.5px] transition-colors', file ? 'border-emerald-300 bg-emerald-50/50' : 'border-line-strong hover:border-brand')}>
        {file ? <span className="inline-flex items-center gap-2 text-emerald-800"><FileText size={16} />{file.name}</span> : <span className="inline-flex items-center gap-2 text-ink-muted"><Upload size={16} />Upload a photo or PDF (max 2.5 MB)</span>}
      </button>
      <input ref={ref} type="file" hidden accept={accept} onChange={(e) => pick(e.target.files[0])} />
      {err && <p className="text-[12.5px] text-rose-600 mt-1">{err}</p>}
    </div>
  );
}

function Status({ v, verified, label }) {
  if (verified) return <Badge tone="green"><BadgeCheck size={13} />{label} verified</Badge>;
  if (v?.status === 'pending') return <Badge tone="soft"><Clock size={12} />In review · sent {timeAgo(v.createdAt)}</Badge>;
  if (v?.status === 'rejected') return <Badge tone="red"><XCircle size={12} />Needs changes</Badge>;
  return <Badge>Not verified</Badge>;
}

export default function Verification() {
  const d = useDB();
  const act = useAct();
  const { me } = useMode();
  const latest = (kind) => d.verifications.find((v) => v.userId === me.id && v.kind === kind);
  const [biz, setBiz] = useState({ docType: BIZ_DOCS[0], docNumber: '', file: null });
  const [cr, setCr] = useState({ links: Object.fromEntries((me.creator?.platforms || []).map((p) => [p.id, ''])), file: null, note: '' });
  const vb = latest('business');
  const vc = latest('creator');

  return (
    <>
      <PageHead title="Trust & verification" sub="Verified brands get more applicants. Verified creators get more invites and rank higher in matches." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {me.business && (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-700 grid place-items-center"><Store size={19} /></div><div><p className="font-bold">Verified business</p><p className="text-[12.5px] text-ink-muted">{me.business.name}</p></div></div>
              <Status v={vb} verified={me.business.verified} label="Business" />
            </div>
            <ul className="mt-4 space-y-1.5 text-[13px] text-ink-soft">
              <li className="flex gap-2"><ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-px" />A blue badge on your listings and profile</li>
              <li className="flex gap-2"><ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-px" />Creators apply more when they know the brand is real</li>
              <li className="flex gap-2"><ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-px" />Your document is only seen by the Buzz review team</li>
            </ul>
            {vb?.status === 'rejected' && <p className="text-[13px] bg-rose-50 text-rose-700 rounded-lg p-2.5 mt-3">{vb.note}</p>}
            {!me.business.verified && vb?.status !== 'pending' && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <Field label="Document"><Select id="vb-doc" value={biz.docType} onChange={(e) => setBiz({ ...biz, docType: e.target.value })}>{BIZ_DOCS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
                <Field label="Registration or permit number"><Input id="vb-num" value={biz.docNumber} onChange={(e) => setBiz({ ...biz, docNumber: e.target.value })} placeholder="e.g. 3381204" /></Field>
                <FilePick file={biz.file} onChange={(file) => setBiz({ ...biz, file })} />
                <Button className="w-full" disabled={!biz.file || !biz.docNumber.trim()} onClick={() => act(() => actions.requestVerification({ kind: 'business', docType: biz.docType, docNumber: biz.docNumber.trim(), docName: biz.file.name, file: biz.file }), 'Sent for review. Usually within one working day.')}>Send for review</Button>
              </div>
            )}
          </Card>
        )}
        {me.creator && (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-brand-soft text-brand-dark grid place-items-center"><Megaphone size={19} /></div><div><p className="font-bold">Verified creator stats</p><p className="text-[12.5px] text-ink-muted">@{me.creator.handle}</p></div></div>
              <Status v={vc} verified={me.creator.statsVerified} label="Stats" />
            </div>
            <ul className="mt-4 space-y-1.5 text-[13px] text-ink-soft">
              <li className="flex gap-2"><ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-px" />Brands see "Verified stats" instead of "Self-reported"</li>
              <li className="flex gap-2"><ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-px" />You rank higher in matches because your numbers are proven</li>
              <li className="flex gap-2"><ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-px" />We check follower counts and engagement against your insights</li>
            </ul>
            {me.approved === false && <p className="text-[13px] bg-brand-softer rounded-lg p-2.5 mt-3">Your profile is in review. Verifying your stats is the fastest way to get approved.</p>}
            {vc?.status === 'rejected' && <p className="text-[13px] bg-rose-50 text-rose-700 rounded-lg p-2.5 mt-3">{vc.note}</p>}
            {!me.creator.statsVerified && vc?.status !== 'pending' && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {(me.creator.platforms || []).map((p) => (
                  <Field key={p.id} label={`${PLATFORMS[p.id].label} profile link`}><Input value={cr.links[p.id] || ''} onChange={(e) => setCr({ ...cr, links: { ...cr.links, [p.id]: e.target.value } })} placeholder={`https://www.${p.id}.com/${me.creator.handle}`} /></Field>
                ))}
                <Field label="Screenshot of your insights (last 30 days)" hint="Showing followers, reach and engagement. We delete it after review."><FilePick file={cr.file} onChange={(file) => setCr({ ...cr, file })} accept="image/*" /></Field>
                <Field label="Anything we should know? (optional)"><Textarea value={cr.note} onChange={(e) => setCr({ ...cr, note: e.target.value })} className="!min-h-[60px]" /></Field>
                <Button className="w-full" disabled={!cr.file || !Object.values(cr.links).some((x) => x.trim())} onClick={() => act(() => actions.requestVerification({ kind: 'creator', docType: 'Platform insights', docName: cr.file.name, file: cr.file, links: Object.values(cr.links).filter((x) => x.trim()), note: cr.note }), 'Sent for review. Usually within one working day.')}>Send for review</Button>
                <p className="text-[12px] text-ink-muted">Coming next: connect Instagram, TikTok and YouTube directly so your numbers update automatically.</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
