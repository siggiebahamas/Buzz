import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { useDB, userById, actions } from '../../lib/store';
import { PLATFORMS, COMP_TYPES } from '../../lib/constants';
import { peso, shortDate } from '../../lib/format';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Checkbox, EmptyState, useAct, cx } from '../../components/ui';
import { PageHead } from './Layout';

const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

export function ContractDoc({ k }) {
  const t = k.terms;
  const clauses = [
    ['The work', `${t.creatorName} (@${t.creatorHandle}) will create and publish the following for ${t.product}: ${t.deliverables.map((x) => `${x.qty} × ${x.type} on ${PLATFORMS[x.platform]?.label}`).join('; ')}.${t.requireDraft ? ' A draft of each piece is shared with the brand for approval before posting.' : ''}`],
    ['Payment', t.fee
      ? `${t.brandName} pays ${peso(t.fee)} for the work above, paid into Buzz Protected Payment before or during the campaign. Buzz releases each part when the brand approves the content, or automatically 7 days after it is submitted if the brand does not respond.${t.commissionRate ? ` The creator also earns ${t.commissionRate}% of sales made with their Buzz link or promo code.` : ''}`
      : t.compensation === 'commission' ? `The creator earns ${t.commissionRate}% of every sale made with their Buzz link or promo code. The brand records promo-code sales on Buzz within 7 days of each sale.`
        : `No cash fee. The creator receives the product or experience described in the listing and keeps it.`],
    ['Honest disclosure', 'The creator labels every paid or gifted post clearly (for example #ad, #sponsored or "Paid partnership"), as required by the Ad Standards Council code and the Consumer Act. The brand will not ask the creator to hide the partnership.'],
    ['Content rights', t.contentRights === 'None' ? 'The creator keeps all rights. The brand may share links to the posts but may not repost the content.' : `The creator owns the content. The brand may repost it on its own pages and ads for ${t.contentRights} from the posting date, with credit to the creator. Longer use needs a new agreement.`],
    ['Changes and problems', 'Either side can request a change or open a dispute on Buzz. While a dispute is open, money held by Buzz for this collaboration stays frozen until Buzz reviews the messages, deliverables and tracking data and decides.'],
    ['Cancelling', 'Either side may cancel before any content is posted. Fees for content that was never approved are refunded to the brand; fees for approved content are paid to the creator.'],
  ];
  return (
    <div className="font-serif text-ink">
      <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-bronze">Buzz Collaboration Agreement</p>
      <h2 className="text-[26px] font-semibold leading-tight mt-1">{t.product}</h2>
      <p className="font-sans text-[13px] text-ink-muted mt-1">Between <b className="text-ink">{t.brandName}</b> ({t.brandPerson}) and <b className="text-ink">{t.creatorName}</b> · Created {fmtDate(k.createdAt)} · Ref. {k.id.toUpperCase()}</p>
      <ol className="mt-5 space-y-4">
        {clauses.map(([h, body], i) => (
          <li key={h} className="grid grid-cols-[28px_1fr] gap-2">
            <span className="text-bronze font-semibold">{i + 1}.</span>
            <div><p className="font-semibold text-[16px]">{h}</p><p className="font-sans text-[14px] text-ink-soft leading-relaxed mt-0.5">{body}</p></div>
          </li>
        ))}
      </ol>
      <div className="grid sm:grid-cols-2 gap-4 mt-6 font-sans">
        {[['Brand', k.brandSignName, k.brandSignedAt], ['Creator', k.creatorSignName, k.creatorSignedAt]].map(([role, name, at]) => (
          <div key={role} className={cx('rounded-xl border p-3', at ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-line-strong')}>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">{role}</p>
            {at ? <><p className="font-serif italic text-[20px] mt-1">{name}</p><p className="text-[11.5px] text-ink-muted">Signed electronically {fmtDate(at)}</p></> : <p className="text-[13px] text-ink-muted mt-2">Not signed yet</p>}
          </div>
        ))}
      </div>
      <p className="font-sans text-[11.5px] text-ink-muted mt-4">Signed electronically under the E-Commerce Act of 2000 (RA 8792). Governed by Philippine law. See the <Link to="/terms" className="underline">Terms of Service</Link>.</p>
    </div>
  );
}

function SignModal({ k, onClose }) {
  const d = useDB();
  const act = useAct();
  const me = userById(d, d.session.userId);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  return (
    <Modal open onClose={onClose} title="Review and sign" width="max-w-2xl">
      <div className="max-h-[48vh] overflow-y-auto pr-2"><ContractDoc k={k} /></div>
      <div className="border-t border-line mt-4 pt-4 space-y-3">
        <Field label={`Type your full name to sign (${me.name})`}><Input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} className="font-serif italic !text-[17px]" placeholder={me.name} /></Field>
        <Checkbox checked={agree} onChange={setAgree} label="I have read this agreement and agree to it" />
        <Button size="lg" className="w-full" disabled={!agree || !name.trim()} onClick={() => { if (act(() => actions.signContract(k.id, name), 'Signed. A copy is in your email.')) onClose(); }}><FileSignature size={17} />Sign agreement</Button>
      </div>
    </Modal>
  );
}

export default function Contracts() {
  const d = useDB();
  const me = d.session.userId;
  const [open, setOpen] = useState(null);
  const [sign, setSign] = useState(null);
  const mine = d.contracts.filter((k) => k.brandId === me || k.creatorId === me).sort((a, b) => b.createdAt - a.createdAt);
  const needsMe = (k) => (k.brandId === me ? !k.brandSignedAt : !k.creatorSignedAt);
  const toSign = mine.filter(needsMe);
  return (
    <>
      <PageHead title="Agreements" sub="Every collaboration has a written agreement: what gets made, what it pays, who owns the content" />
      {toSign.length > 0 && (
        <div className="rounded-2xl bg-brand-softer border border-[#F6DDB2] p-4 mb-5 flex flex-wrap items-center gap-3">
          <FileSignature size={20} className="text-brand-dark" />
          <p className="flex-1 text-[14px]"><b>{toSign.length} agreement{toSign.length > 1 ? 's' : ''} waiting for your signature.</b> Content work starts once both sides sign.</p>
          <Button onClick={() => setSign(toSign[0])}>Sign now</Button>
        </div>
      )}
      {mine.length === 0 ? <Card><EmptyState icon={FileSignature} title="No agreements yet" body="An agreement is created automatically when a creator joins a campaign." /></Card> : (
        <Card className="divide-y divide-line">
          {mine.map((k) => {
            const other = userById(d, k.brandId === me ? k.creatorId : k.brandId);
            const both = k.brandSignedAt && k.creatorSignedAt;
            return (
              <div key={k.id} className="p-4 flex flex-wrap items-center gap-4">
                <Avatar user={other} size={38} />
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold">{k.terms.product}</p>
                  <p className="text-[12.5px] text-ink-muted">with {k.brandId === me ? k.terms.creatorName : k.terms.brandName} · {COMP_TYPES[k.terms.compensation]}{k.terms.fee ? ` · ${peso(k.terms.fee)}` : ''} · {shortDate(k.createdAt)}</p>
                </div>
                {both ? <Badge tone="green"><CheckCircle2 size={12} />Signed by both</Badge> : needsMe(k) ? <Badge tone="red"><Clock size={12} />Needs your signature</Badge> : <Badge tone="soft"><Clock size={12} />Waiting for {other?.name.split(' ')[0]}</Badge>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen(k)}>View</Button>
                  {needsMe(k) && <Button size="sm" onClick={() => setSign(k)}>Sign</Button>}
                </div>
              </div>
            );
          })}
        </Card>
      )}
      <p className="text-[12.5px] text-ink-muted mt-4 flex items-center gap-1.5"><ShieldCheck size={14} />Agreements protect both sides. If something goes wrong, use Report a problem on the collab and the agreement is what Buzz uses to decide.</p>
      {open && <Modal open onClose={() => setOpen(null)} title="Agreement" width="max-w-2xl"><ContractDoc k={open} /></Modal>}
      {sign && <SignModal k={sign} onClose={() => setSign(null)} />}
    </>
  );
}
