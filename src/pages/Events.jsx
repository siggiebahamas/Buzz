import { Navigate, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket, Users } from 'lucide-react';
import { useDB, currentUser, actions } from '../lib/store';
import { isOn } from '../lib/monetize';
import { peso } from '../lib/format';
import { Card, Button, Badge, EmptyState, useAct, useConfirm } from '../components/ui';

export default function Events() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const ask = useConfirm();
  const me = currentUser(d);
  if (!isOn(d, 'events')) return <Navigate to="/" replace />;
  const upcoming = d.events.filter((e) => e.date > Date.now()).sort((a, b) => a.date - b.date);
  const sold = (id) => d.eventTickets.filter((t) => t.eventId === id).reduce((a, t) => a + t.qty, 0);
  const mine = (id) => me && d.eventTickets.some((t) => t.eventId === id && t.userId === me.id);
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-[30px] font-bold">Workshops & pop-ups</h1>
      <p className="text-ink-muted mt-1">Learn from founders and creators who've done it, and meet customers in person.</p>
      <div className="space-y-4 mt-8">
        {upcoming.length === 0 && <Card><EmptyState icon={CalendarDays} title="No events scheduled" body="Check back soon." /></Card>}
        {upcoming.map((e) => {
          const left = e.seats - sold(e.id);
          const date = new Date(e.date);
          return (
            <Card key={e.id} className="p-5 flex flex-col sm:flex-row gap-5">
              <div className="sm:w-24 shrink-0 rounded-2xl bg-brand-soft text-center py-3">
                <p className="text-[12px] font-semibold uppercase text-brand-dark">{date.toLocaleDateString('en-PH', { month: 'short' })}</p>
                <p className="text-[30px] font-extrabold leading-none">{date.getDate()}</p>
                <p className="text-[11px] text-ink-muted">{date.toLocaleDateString('en-PH', { weekday: 'short' })}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Badge tone={e.kind === 'Pop-up' ? 'violet' : 'soft'}>{e.kind}</Badge><Badge>For {e.audience === 'creator' ? 'creators' : e.audience === 'business' ? 'founders' : 'everyone'}</Badge></div>
                <p className="font-bold text-[18px] mt-2">{e.title}</p>
                <p className="text-[13.5px] text-ink-soft mt-1">{e.desc}</p>
                <p className="text-[12.5px] text-ink-muted mt-2 flex flex-wrap gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1"><MapPin size={13} />{e.place}</span><span className="inline-flex items-center gap-1"><Users size={13} />{left > 0 ? `${left} spots left` : 'Full'}</span></p>
              </div>
              <div className="sm:w-40 shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                <p className="text-[22px] font-extrabold">{peso(e.price)}</p>
                {mine(e.id) ? <Badge tone="green"><Ticket size={12} />You're going</Badge> : (
                  <Button disabled={left <= 0} onClick={async () => {
                    if (!me) return nav('/login', { state: { from: '/events' } });
                    if (await ask({ title: `Book ${e.title}?`, body: `${peso(e.price)} · ${date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}. Test mode: no card is charged.`, confirm: 'Book' })) act(() => actions.buyEventTicket(e.id), 'Booked! Details are in your email.');
                  }}><Ticket size={15} />{left > 0 ? 'Book' : 'Full'}</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
