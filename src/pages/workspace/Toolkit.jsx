import { useState } from 'react';
import { Package, Printer, Truck, Camera, FileCheck, Barcode, Gift, Check } from 'lucide-react';
import { useDB, actions } from '../../lib/store';
import { TOOLKIT } from '../../lib/scout';
import { timeAgo } from '../../lib/format';
import { Card, Button, Badge, Modal, Field, Textarea, useAct, cx } from '../../components/ui';
import { useMode, PageHead } from './Layout';

const ICONS = { packaging: Package, printing: Printer, courier: Truck, photo: Camera, permits: FileCheck, barcodes: Barcode };
const LEAD = { new: ['Intro sent', 'soft'], contacted: ['They reached out', 'blue'], closed: ['Working together', 'green'], lost: ['Closed', 'neutral'] };

// A short, vetted list of suppliers small sellers ask us about. Supplementary by design.
export default function Toolkit() {
  const d = useDB();
  const { me } = useMode();
  const [cat, setCat] = useState('all');
  const [intro, setIntro] = useState(null);
  const partners = d.partners.filter((p) => p.active && (cat === 'all' || p.category === cat));
  const mine = d.partnerLeads.filter((l) => l.userId === me.id);
  return (
    <>
      <PageHead title="Business toolkit" sub="Trusted suppliers for the things sellers ask us about most, with perks for Buzz members." />
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {[['all', 'All'], ...TOOLKIT].map(([id, label]) => (
          <button key={id} onClick={() => setCat(id)} className={cx('h-9 px-3.5 rounded-full border text-[13px] whitespace-nowrap', cat === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners.map((p) => {
          const Icon = ICONS[p.category] || Package;
          const open = mine.find((l) => l.partnerId === p.id && ['new', 'contacted', 'closed'].includes(l.status));
          return (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-canvas text-ink-soft grid place-items-center shrink-0"><Icon size={18} /></div>
                <div className="flex-1 min-w-0"><p className="font-bold">{p.name}</p><p className="text-[12.5px] text-ink-muted">{TOOLKIT.find((t) => t[0] === p.category)?.[1]} · {p.region}</p></div>
              </div>
              <p className="text-[13.5px] text-ink-soft mt-3 flex-1">{p.blurb}</p>
              <p className="text-[13px] mt-3 flex items-center gap-1.5"><Gift size={14} className="text-brand-dark" />{p.perk}</p>
              <div className="mt-3">{open ? <Badge tone={LEAD[open.status][1]}><Check size={11} />{LEAD[open.status][0]}</Badge> : <Button size="sm" variant="outline" onClick={() => setIntro(p)}>Get an intro</Button>}</div>
            </Card>
          );
        })}
      </div>
      {mine.length > 0 && (
        <Card className="p-5 mt-6">
          <p className="font-bold mb-2">Your intros</p>
          <div className="divide-y divide-line">
            {mine.map((l) => {
              const p = d.partners.find((x) => x.id === l.partnerId);
              return <div key={l.id} className="py-2.5 flex flex-wrap items-center gap-2 text-[13.5px]"><span className="flex-1">{p?.name}</span><span className="text-ink-muted text-[12.5px]">{timeAgo(l.createdAt)}</span><Badge tone={LEAD[l.status][1]}>{LEAD[l.status][0]}</Badge></div>;
            })}
          </div>
        </Card>
      )}
      <p className="text-[12px] text-ink-muted mt-6 max-w-2xl">Partners are reviewed by the Buzz team. Buzz may receive a referral fee from a partner when you become their customer. It never changes your price, and you're never obliged to buy.</p>
      {intro && <IntroModal p={intro} onClose={() => setIntro(null)} />}
    </>
  );
}

function IntroModal({ p, onClose }) {
  const act = useAct();
  const [note, setNote] = useState('');
  return (
    <Modal open onClose={onClose} title={`Intro to ${p.name}`} subtitle={`Your Buzz perk: ${p.perk}`}>
      <Field label="What do you need? (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 500 food-safe pouches, 3-week deadline" className="!min-h-[80px]" /></Field>
      <p className="text-[12px] text-ink-muted mt-2">We'll share your name, business and email with them. They usually reply within 1–2 working days.</p>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.requestIntro(p.id, note), 'Intro sent. Check your email.')) onClose(); }}>Send intro</Button>
    </Modal>
  );
}
