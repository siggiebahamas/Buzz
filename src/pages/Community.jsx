import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Heart, MessageCircle, ThumbsUp, Bookmark, Share2, ArrowRight, Flame, Award, LayoutGrid, Users, CalendarDays, Handshake } from 'lucide-react';
import { useDB, userById, displayName, actions, isSaved, campaignById, currentUser } from '../lib/store';
import { COMMUNITY_TOPICS, topicById, COLLAB_KINDS, categoryById } from '../lib/constants';
import { timeAgo, shortDate } from '../lib/format';
import { Button, Card, Avatar, Segmented, Select, EmptyState, cx, useAct, useCopy } from '../components/ui';
import { PostModal, CollabModal } from '../components/forms';

export function TopicChip({ topic }) {
  const t = topicById(topic);
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium', t.chip)}><t.icon size={12} />{t.label}</span>;
}

export function PostCard({ p }) {
  const d = useDB();
  const nav = useNavigate();
  const copy = useCopy();
  const me = d.session.userId;
  const author = p.anonymous ? null : userById(d, p.authorId);
  const camp = p.campaignId ? campaignById(d, p.campaignId) : null;
  const need = (fn) => (me ? fn() : nav('/login'));
  return (
    <Card className="overflow-hidden">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <TopicChip topic={p.topic} />
          <span className="text-[12.5px] text-ink-muted">{camp ? camp.productName : 'Other / General'}</span>
          <span className="ml-auto flex items-center gap-2 text-[12px] text-ink-muted">
            {author ? <Link to={`/profile/${author.id}`} className="flex items-center gap-1.5 hover:text-ink"><Avatar user={author} size={20} />{displayName(author)}</Link> : <span>Anonymous founder</span>}
            · {timeAgo(p.createdAt)}
          </span>
        </div>
        <Link to={`/community/${p.id}`}>
          <h3 className="text-[17px] font-bold text-ink mt-2.5 hover:underline">{p.title}</h3>
          <p className="text-[14px] text-ink-soft mt-1.5 line-clamp-3 whitespace-pre-line">{p.body}</p>
        </Link>
        {p.photos?.length > 0 && (
          <div className="flex gap-2 mt-3">{p.photos.slice(0, 4).map((src, i) => <img key={i} src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-24 w-32 object-cover rounded-xl border border-line" />)}</div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-3 border-t border-line text-[13px] text-ink-muted">
          <button onClick={() => need(() => actions.toggleIn(p.id, 'likes'))} className={cx('inline-flex items-center gap-1.5 hover:text-ink', p.likes.includes(me) && 'text-rose-500')}><Heart size={16} className={p.likes.includes(me) ? 'fill-rose-500' : ''} />{p.likes.length}</button>
          <Link to={`/community/${p.id}`} className="inline-flex items-center gap-1.5 hover:text-ink"><MessageCircle size={16} />{p.comments.length}</Link>
          <button onClick={() => need(() => actions.toggleIn(p.id, 'interested'))} className={cx('inline-flex items-center gap-1.5 hover:text-ink', p.interested.includes(me) && 'text-brand-dark font-medium')}>
            <ThumbsUp size={16} />{p.interested.includes(me) ? "You're interested" : 'Interested'}{p.interested.length > 0 && ` · ${p.interested.length}`}
          </button>
          <span className="ml-auto flex items-center gap-3">
            <button onClick={() => need(() => actions.toggleSave('post', p.id))} aria-label="Save" className="hover:text-ink"><Bookmark size={16} className={me && isSaved(d, 'post', p.id) ? 'fill-brand text-brand' : ''} /></button>
            <button onClick={() => copy(`${window.location.origin}${window.location.pathname}#/community/${p.id}`, 'Link copied')} aria-label="Share" className="hover:text-ink"><Share2 size={16} /></button>
          </span>
        </div>
      </div>
      <Link to={`/community/${p.id}`} className="block text-center py-3 border-t border-line text-[13.5px] font-medium text-brand-dark hover:bg-brand-softer">
        Continue this journey <ArrowRight size={14} className="inline -mt-0.5" />
      </Link>
    </Card>
  );
}

function CollabCard({ c }) {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const me = d.session.userId;
  const host = userById(d, c.hostId);
  const joined = c.members.includes(me);
  const full = c.members.length >= c.slots;
  const Icon = categoryById(c.category).icon || Handshake;
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-0.5"><Icon size={12} />{COLLAB_KINDS[c.kind]}</span>
        <span className="text-[12px] text-ink-muted flex items-center gap-1"><CalendarDays size={13} />Join by {shortDate(c.deadline)}</span>
      </div>
      <h3 className="font-bold text-[16px] mt-3">{c.title}</h3>
      <p className="text-[13.5px] text-ink-soft mt-1 flex-1">{c.description}</p>
      <div className="flex items-center gap-2 mt-4">
        <div className="flex -space-x-2">{c.members.map((m) => <Avatar key={m} user={userById(d, m)} size={28} />)}</div>
        <span className="text-[12.5px] text-ink-muted">{c.members.length}/{c.slots} joined · hosted by <Link to={`/profile/${host.id}`} className="text-ink hover:underline">{displayName(host)}</Link></span>
      </div>
      <div className="mt-4">
        {c.hostId === me ? <Button variant="soft" className="w-full" disabled>You're hosting</Button>
          : <Button variant={joined ? 'outline' : 'primary'} className="w-full" disabled={!joined && full} onClick={() => (me ? act(() => actions.toggleCollab(c.id), joined ? 'You left the collab' : 'Joined! We opened a chat with the host.') : nav('/login'))}>
            {joined ? 'Leave collab' : full ? 'Full' : "I'm in"}
          </Button>}
      </div>
    </Card>
  );
}

export default function Community() {
  const d = useDB();
  const nav = useNavigate();
  const me = currentUser(d);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'discussions';
  const [topic, setTopic] = useState(params.get('topic') || 'all');
  const [sort, setSort] = useState('latest');
  const [modal, setModal] = useState(null);
  const need = (fn) => (me ? fn() : nav('/login'));

  const posts = d.posts.filter((p) => topic === 'all' || p.topic === topic);
  const sorted = [...posts].sort({
    latest: (a, b) => b.createdAt - a.createdAt,
    liked: (a, b) => b.likes.length - a.likes.length,
    discussed: (a, b) => b.comments.length - a.comments.length,
  }[sort]);
  const trending = [...d.posts].sort((a, b) => (b.likes.length + b.comments.length * 2 + b.interested.length) - (a.likes.length + a.comments.length * 2 + a.interested.length)).slice(0, 4);
  const faces = d.users.filter((u) => u.id !== me?.id).slice(0, 5);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] sm:text-[30px] font-bold text-ink">Community</h1>
        <Button onClick={() => need(() => setModal(tab === 'collabs' ? 'collab' : 'post'))}><Plus size={17} />{tab === 'collabs' ? 'Start a Collab' : 'Create Post'}</Button>
      </div>

      <div className="mt-6 rounded-2xl bg-brand-softer border border-[#F6DDB2] px-5 sm:px-6 py-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[18px] font-bold text-ink">Ask the community anything</p>
          <p className="text-[14px] text-ink-muted">Share, learn, and grow together with {d.users.length} founders and creators.</p>
        </div>
        <div className="flex -space-x-2">{faces.map((u) => <Avatar key={u.id} user={u} size={32} />)}</div>
        <Button onClick={() => need(() => setModal('ask'))}>Ask a Question</Button>
      </div>

      <div className="mt-6"><Segmented value={tab} onChange={(v) => setParams(v === 'discussions' ? {} : { tab: v })} options={[{ id: 'discussions', label: 'Discussions' }, { id: 'collabs', label: `Collab Board · ${d.collabs.length}` }]} /></div>

      {tab === 'discussions' ? (
        <>
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => setTopic('all')} className={cx('h-9 px-4 rounded-full text-[13.5px] font-medium inline-flex items-center gap-1.5 border', topic === 'all' ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}><LayoutGrid size={14} />All</button>
            {COMMUNITY_TOPICS.map((t) => (
              <button key={t.id} onClick={() => setTopic(t.id)} className={cx('h-9 px-4 rounded-full text-[13.5px] inline-flex items-center gap-1.5 border', topic === t.id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft hover:bg-canvas')}><t.icon size={14} />{t.label}</button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-[20px] font-bold">Trending Discussions</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {trending.map((p, i) => (
              <Link key={p.id} to={`/community/${p.id}`} className="bg-white border border-line rounded-2xl p-4 hover:shadow-lift transition-shadow">
                <div className={cx('h-10 w-10 rounded-xl grid place-items-center', i === 0 ? 'bg-rose-50 text-rose-500' : 'bg-brand-soft text-brand-dark')}>{i === 0 ? <Flame size={19} /> : <Award size={19} />}</div>
                <p className="font-bold text-[14px] mt-3 line-clamp-2 leading-snug">{p.title}</p>
                <p className="text-[12.5px] text-ink-muted mt-1">{p.comments.length} replies · {p.likes.length} likes</p>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-between mt-10 mb-4">
            <h2 className="text-[20px] font-bold">Latest Discussions</h2>
            <div className="w-full sm:w-52"><Select value={sort} onChange={(e) => setSort(e.target.value)}><option value="latest">Sort: Latest</option><option value="liked">Sort: Most Liked</option><option value="discussed">Sort: Most Discussed</option></Select></div>
          </div>
          <div className="space-y-4">
            {sorted.length === 0 ? <Card><EmptyState title="No posts in this topic yet" body="Be the first to start the conversation." /></Card> : sorted.map((p) => <PostCard key={p.id} p={p} />)}
          </div>
        </>
      ) : (
        <>
          <p className="text-[14px] text-ink-muted mt-5">Team up to cut costs and reach more people: bundle products, run joint giveaways, share a shoot or a bazaar booth, or form a creator squad.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">{d.collabs.map((c) => <CollabCard key={c.id} c={c} />)}</div>
          {d.collabs.length === 0 && <Card className="mt-5"><EmptyState icon={Users} title="No collabs yet" /></Card>}
        </>
      )}

      {modal === 'post' && <PostModal open onClose={() => setModal(null)} onPosted={(id) => nav(`/community/${id}`)} />}
      {modal === 'ask' && <PostModal open onClose={() => setModal(null)} defaultTopic="help" onPosted={(id) => nav(`/community/${id}`)} />}
      {modal === 'collab' && <CollabModal open onClose={() => setModal(null)} />}
    </main>
  );
}
