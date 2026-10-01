import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LifeBuoy, Send, MessageSquare } from 'lucide-react';
import { useDB, actions, userById } from '../lib/store';
import { timeAgo } from '../lib/format';
import { isOn, setting } from '../lib/monetize';
import { Card, Button, Badge, Field, Input, Select, Textarea, EmptyState, useAct, cx } from '../components/ui';

const faq = (fee, plans) => [
  ['Getting started', [
    ['Is Buzz free?', `Yes. Signing up, posting listings and applying are free. When a brand pays a creator through Buzz Protected Payment, the brand pays a ${fee}% service fee${plans ? ' (less on paid plans)' : ''}. Creators receive their full fee.`],
    ['What should I put in my first listing?', 'A clear product photo, what makes it special, who you want to reach, and a fair budget. The budget helper in the form shows how many creators your budget can afford.'],
    ['How does Buzz pick matches?', 'We compare the listing with each creator: how close their content is to your product, whether their usual rate fits your budget, their audience, platforms, engagement for their size, their sales record on Buzz, and location. Hover any fit label to see the reasons.'],
  ]],
  ['Payments & protected payment', [
    ['How does Protected Payment protect me?', 'Brands pay creator fees into Buzz Protected Payment before the work. Buzz holds the money. It is released to the creator when the brand approves the content, or automatically 7 days after it is submitted if the brand doesn\'t respond.'],
    ['How do creators get paid?', 'Released payments go to your Buzz wallet. Withdraw anytime to GCash, Maya or a Philippine bank account. Minimum ₱100, no fee for creators.'],
    ['What if something goes wrong?', 'Use Report a problem on the collab. Held money is frozen, the other side has 3 days to respond, and Buzz decides based on the signed agreement, messages and tracking data.'],
  ]],
  ['Trust & safety', [
    ['What does the verified badge mean?', 'For brands: we checked a DTI, SEC, BIR or business permit. For creators: we checked follower counts and engagement against their platform insights.'],
    ['Do creators need to say a post is paid?', 'Yes. Every paid or gifted post must be clearly labeled (#ad, #sponsored or Paid partnership). It\'s in every Buzz agreement and it\'s what the law expects.'],
    ['How do I report a fake listing or profile?', 'Tap Report on the listing, profile or post. Our team reviews every report within 24 hours.'],
  ]],
];

export default function Help() {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const me = d.session.userId ? userById(d, d.session.userId) : null;
  const [open, setOpen] = useState('Is Buzz free?');
  const [f, setF] = useState({ topic: 'Payments', subject: '', body: '' });
  const [reply, setReply] = useState({});
  const mine = me ? d.tickets.filter((t) => t.userId === me.id) : [];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3"><LifeBuoy size={26} className="text-brand-dark" /><h1 className="text-[30px] font-bold">Help center</h1></div>
      <p className="text-ink-muted mt-1">Answers to common questions, and a real person when you need one.</p>
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mt-8 items-start">
        <div className="space-y-6">
          {faq(isOn(d, 'transactionFee') ? setting(d, 'transactionFee', 'brandPct') : 0, isOn(d, 'plans')).map(([group, qs]) => (
            <section key={group}>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-2">{group}</h2>
              <Card className="divide-y divide-line">
                {qs.map(([q, a]) => (
                  <div key={q}>
                    <button onClick={() => setOpen(open === q ? null : q)} className="w-full flex items-center justify-between gap-3 p-4 text-left font-medium">
                      {q}<ChevronDown size={17} className={cx('shrink-0 transition-transform text-ink-muted', open === q && 'rotate-180')} />
                    </button>
                    {open === q && <p className="px-4 pb-4 -mt-1 text-[14px] text-ink-soft leading-relaxed">{a}</p>}
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="p-5">
            <p className="font-bold text-[16px] flex items-center gap-2"><MessageSquare size={17} className="text-brand-dark" />Contact support</p>
            <p className="text-[13px] text-ink-muted mt-0.5">We reply within one working day. Urgent payment issues first.</p>
            {me ? (
              <form className="space-y-3 mt-4" onSubmit={(e) => { e.preventDefault(); if (act(() => actions.openTicket(f), 'Message sent. We\'ll email you when we reply.')) setF({ ...f, subject: '', body: '' }); }}>
                <Field label="Topic"><Select id="tk-topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>{['Payments', 'A collaboration', 'My account', 'Verification', 'Report a bug', 'Something else'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Subject"><Input id="tk-subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
                <Field label="How can we help?"><Textarea id="tk-body" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
                <Button type="submit" className="w-full" disabled={!f.subject.trim() || !f.body.trim()}><Send size={15} />Send</Button>
              </form>
            ) : <Button className="w-full mt-4" onClick={() => nav('/login', { state: { from: '/help' } })}>Log in to contact support</Button>}
            <p className="text-[12px] text-ink-muted mt-3">Or email support@buzz.ph</p>
          </Card>
          {mine.length > 0 && (
            <Card className="p-5">
              <p className="font-bold mb-3">Your messages</p>
              <div className="space-y-4">
                {mine.map((t) => (
                  <div key={t.id} className="border-b border-line last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between gap-2"><p className="font-medium text-[14px]">{t.subject}</p><Badge tone={t.status === 'answered' ? 'green' : t.status === 'closed' ? 'neutral' : 'soft'} className="capitalize">{t.status}</Badge></div>
                    <p className="text-[12px] text-ink-muted">{t.topic} · {timeAgo(t.createdAt)}</p>
                    {t.replies.map((r, i) => <p key={i} className={cx('text-[13px] mt-2 rounded-xl px-3 py-2', r.from === me.id ? 'bg-canvas' : 'bg-emerald-50')}><b>{r.from === me.id ? 'You' : 'Buzz support'}:</b> {r.body}</p>)}
                    {t.status !== 'closed' && (
                      <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); act(() => actions.replyTicket(t.id, reply[t.id] || '')); setReply({ ...reply, [t.id]: '' }); }}>
                        <Input value={reply[t.id] || ''} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} placeholder="Reply…" className="!h-9" />
                        <Button size="sm" type="submit" disabled={!(reply[t.id] || '').trim()}>Send</Button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <p className="text-[12.5px] text-ink-muted">Read the <Link to="/terms" className="text-brand-dark">Terms</Link> and <Link to="/privacy" className="text-brand-dark">Privacy Policy</Link>.</p>
        </div>
      </div>
    </main>
  );
}
