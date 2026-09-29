import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ThumbsUp, BellRing, Bell, Flag } from 'lucide-react';
import { useDB, userById, displayName, actions, campaignById } from '../lib/store';
import { timeAgo } from '../lib/format';
import { Card, Avatar, Button, Textarea, cx } from '../components/ui';
import { ProductImage } from '../components/visuals';
import { TopicChip } from './Community';
import { ReportModal } from '../components/forms';

export default function PostDetail() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState(false);
  const p = d.posts.find((x) => x.id === id);
  if (!p) return <main className="p-10 text-center text-ink-muted">Post not found.</main>;
  const me = d.session.userId;
  const author = p.anonymous ? null : userById(d, p.authorId);
  const camp = p.campaignId ? campaignById(d, p.campaignId) : null;
  const need = (fn) => (me ? fn() : nav('/login'));
  const following = p.followers.includes(me);
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    need(() => { actions.comment(p.id, text.trim()); setText(''); });
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back to Community</button>
      <Card className="p-7">
        <div className="flex items-center gap-2"><TopicChip topic={p.topic} /><span className="text-[12.5px] text-ink-muted">{timeAgo(p.createdAt)}</span></div>
        <h1 className="text-[26px] font-bold mt-3 leading-tight">{p.title}</h1>
        <div className="flex items-center gap-2.5 mt-3">
          {author ? <><Avatar user={author} size={32} /><Link to={`/profile/${author.id}`} className="text-[13.5px] font-medium hover:underline">{displayName(author)}</Link></> : <span className="text-[13.5px] text-ink-muted">Posted anonymously</span>}
        </div>
        <p className="text-[15px] text-ink-soft mt-5 leading-relaxed whitespace-pre-line">{p.body}</p>
        {p.photos?.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">{p.photos.map((src, i) => <img key={i} src={src} alt="" className="rounded-xl border border-line w-full object-cover" />)}</div>}
        {camp && (
          <Link to={`/opportunity/${camp.id}`} className="mt-5 flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-canvas">
            <ProductImage campaign={camp} mini className="h-12 w-12" rounded="rounded-lg" />
            <div><p className="text-[12px] text-ink-muted">About this product</p><p className="text-[14px] font-semibold">{camp.productName}</p></div>
          </Link>
        )}
        <div className="flex items-center gap-2 mt-6">
          <Button variant={p.likes.includes(me) ? 'soft' : 'outline'} size="sm" onClick={() => need(() => actions.toggleIn(p.id, 'likes'))}><Heart size={15} className={cx(p.likes.includes(me) && 'fill-rose-500 text-rose-500')} />{p.likes.length}</Button>
          <Button variant={p.interested.includes(me) ? 'soft' : 'outline'} size="sm" onClick={() => need(() => actions.toggleIn(p.id, 'interested'))}><ThumbsUp size={15} />Interested · {p.interested.length}</Button>
          {camp && <Button variant={following ? 'soft' : 'outline'} size="sm" onClick={() => need(() => actions.toggleIn(p.id, 'followers'))}>{following ? <BellRing size={15} /> : <Bell size={15} />}{following ? 'Following updates' : 'Follow this project'}</Button>}
          {p.authorId !== me && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => need(() => setReporting(true))}><Flag size={14} />Report</Button>}
        </div>
        {p.interested.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-muted">
            <div className="flex -space-x-2">{p.interested.slice(0, 6).map((u) => <Avatar key={u} user={userById(d, u)} size={24} />)}</div>
            {p.interested.length} {p.interested.length === 1 ? 'person is' : 'people are'} interested. Message them to take it further.
          </div>
        )}
      </Card>

      <h2 className="text-[18px] font-bold mt-8 mb-3">{p.comments.length} {p.comments.length === 1 ? 'reply' : 'replies'}</h2>
      <div className="space-y-3">
        {p.comments.map((c) => {
          const u = userById(d, c.authorId);
          return (
            <Card key={c.id} className="p-4 flex gap-3">
              <Avatar user={u} size={34} />
              <div>
                <p className="text-[13px]"><Link to={`/profile/${u?.id}`} className="font-semibold hover:underline">{displayName(u)}</Link> <span className="text-ink-muted">· {timeAgo(c.createdAt)}</span></p>
                <p className="text-[14px] text-ink-soft mt-1">{c.body}</p>
              </div>
            </Card>
          );
        })}
      </div>
      <form onSubmit={submit} className="mt-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add to the conversation…" />
        <div className="flex justify-end mt-2"><Button type="submit" disabled={!text.trim()}>Reply</Button></div>
      </form>
      {reporting && <ReportModal kind="post" refId={p.id} onClose={() => setReporting(false)} />}
    </main>
  );
}
