import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Wand2, Camera, Scissors, FileBarChart, Mail, Trophy, Zap, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useDB, currentUser, actions } from '../lib/store';
import { isOn, SERVICES } from '../lib/monetize';
import { peso, timeAgo } from '../lib/format';
import { Card, Button, Badge, Modal, Field, Textarea, useAct, useConfirm } from '../components/ui';

const ICONS = { brief: Wand2, photos: Camera, editing: Scissors, report: FileBarChart, newsletter: Mail, challenge: Trophy, fasttrack: Zap, portfolio: FileText };
const STATUS = { new: ['Received', 'soft'], progress: ['In progress', 'blue'], delivered: ['Delivered', 'green'] };

export default function Services() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const me = currentUser(d);
  const [pick, setPick] = useState(null);
  const [notes, setNotes] = useState('');
  if (!isOn(d, 'servicesCatalog')) return <Navigate to="/" replace />;
  const list = SERVICES.filter((s) => s.who === 'any' || !me || (s.who === 'business' ? me.business : me.creator));
  const orders = me ? d.orders.filter((o) => o.userId === me.id) : [];
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-[30px] font-bold">Buzz services</h1>
      <p className="text-ink-muted mt-1 max-w-2xl">Hands-on help from the Buzz team when you'd rather not do it yourself. Every order is handled by a real person, usually within one working day.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {list.map((s) => {
          const Icon = ICONS[s.id] || Wand2;
          return (
            <Card key={s.id} className="p-5 flex flex-col">
              <div className="h-11 w-11 rounded-xl bg-brand-soft text-brand-dark grid place-items-center"><Icon size={20} /></div>
              <p className="font-bold mt-3">{s.name}</p>
              <p className="text-[13px] text-ink-soft mt-1 flex-1">{s.desc}</p>
              <p className="mt-4"><span className="text-[20px] font-extrabold">{peso(s.price)}</span> <span className="text-[12.5px] text-ink-muted">{s.unit}</span></p>
              <Button className="mt-3" onClick={() => (me ? (setPick(s), setNotes('')) : nav('/login', { state: { from: '/services' } }))}>Order</Button>
            </Card>
          );
        })}
      </div>
      {orders.length > 0 && (
        <Card className="mt-8 p-5">
          <p className="font-bold mb-3">Your orders</p>
          <div className="divide-y divide-line">
            {orders.map((o) => (
              <div key={o.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]"><p className="font-medium">{o.name}</p><p className="text-[12px] text-ink-muted">{peso(o.price)} · ordered {timeAgo(o.createdAt)}{o.staffNote ? ` · ${o.staffNote}` : ''}</p></div>
                <Badge tone={STATUS[o.status][1]}>{o.status === 'delivered' ? <CheckCircle2 size={12} /> : <Clock size={12} />}{STATUS[o.status][0]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
      {pick && (
        <Modal open onClose={() => setPick(null)} title={pick.name} subtitle={`${peso(pick.price)} ${pick.unit}`}>
          <Field label="Tell us what you need"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Which product or campaign, deadlines, links, anything we should know." /></Field>
          <p className="text-[12px] text-ink-muted mt-2">Test mode: no card is charged yet.</p>
          <Button size="lg" className="w-full mt-4" onClick={async () => { if (await ask({ title: `Order ${pick.name}?`, body: `Total: ${peso(pick.price)}.`, confirm: 'Place order' })) { if (act(() => actions.orderService(pick.id, { notes }), 'Order placed. We\'ll email you when we start.')) setPick(null); } }}>Place order · {peso(pick.price)}</Button>
        </Modal>
      )}
    </main>
  );
}
