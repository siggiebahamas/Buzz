import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Image as ImageIcon, Trophy, LifeBuoy, Handshake, MessageCircle, Bookmark, Share2, MoreHorizontal, Flag, BadgeCheck, CalendarDays, Users, LayoutGrid, Newspaper, Send, Flame } from 'lucide-react';
import { useDB, userById, displayName, actions, isSaved, campaignById, currentUser, REACTIONS, reactionTotal, myReaction } from '../lib/store';
import { COMMUNITY_TOPICS, topicById, COLLAB_KINDS, categoryById } from '../lib/constants';
import { timeAgo, shortDate } from '../lib/format';
import { Button, Card, Avatar, EmptyState, cx, useAct, useCopy } from '../components/ui';
import { PostModal, CollabModal, ReportModal } from '../components/forms';
import { useChat } from '../components/Shell';

export function TopicChip({ topic }) {
  const t = topicById(topic);
  return <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bronze">{t.label}</span>;
}

// Pull quote laid over a post's photo.
// Prefers a line with a number in it (the result people want to see), skips the opener.
const pullQuote = (body) => {
  const lines = body.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 12 && x.length <= 120);
  const rest = lines.slice(1);
  return rest.find((x) => /[\d₱%]/.test(x)) || rest.find((x) => x.length > 30) || null;
};

function Photos({ photos, quote }) {
  if (!photos?.length) return null;
  const overlay = quote && (
    <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-12 bg-gradient-to-t from-black/65 to-transparent pointer-events-none">
      <p className="font-serif italic text-white text-[17px] sm:text-[19px] leading-snug">"{quote}"</p>
    </div>
  );
  const hide = (e) => { e.currentTarget.parentElement.style.display = 'none'; };
  const img = (src, cls) => <div className={cx('overflow-hidden bg-bronze-soft', cls)}><img src={src} alt="" loading="lazy" onError={hide} className="w-full h-full object-cover" /></div>;
  if (photos.length === 1) return <div className="relative">{img(photos[0], 'aspect-[3/2]')}{overlay}</div>;
  if (photos.length === 2) return <div className="relative grid grid-cols-2 gap-1">{photos.map((p) => <div key={p}>{img(p, 'aspect-[4/5]')}</div>)}{overlay}</div>;
  return (
    <div className="relative grid grid-cols-2 gap-1">
      <div className="row-span-2">{img(photos[0], 'h-full aspect-[3/4]')}</div>
      {photos.slice(1, 3).map((p) => <div key={p}>{img(p, 'aspect-square')}</div>)}
      {overlay}
    </div>
  );
}

export function PostCard({ p, full = false }) {
  const d = useDB();
  const nav = useNavigate();
  const copy = useCopy();
  const chat = useChat();
  const me = d.session.userId;
  const author = p.anonymous ? null : userById(d, p.authorId);
  const camp = p.campaignId ? campaignById(d, p.campaignId) : null;
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [more, setMore] = useState(full);
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const need = (fn) => (me ? fn() : nav('/login'));
  const mine = myReaction(p, me);
  const total = reactionTotal(p);
  const used = REACTIONS.filter((r) => p[r.id]?.length);
  const long = p.body.length > 240;
  const comments = full ? p.comments : p.comments.slice(-2);
  const wantsCollab = p.interested.includes(me);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    need(() => { actions.comment(p.id, text.trim()); setText(''); });
  };
  const collab = () => need(() => {
    if (!wantsCollab) actions.toggleIn(p.id, 'interested');
    if (p.authorId !== me && !p.anonymous) chat.open(p.authorId, p.campaignId);
  });

  return (
    <article className="border-b border-ink/15 pb-7 pt-7 first:pt-2">
      <div className="flex items-start gap-3">
        {author ? <Link to={`/profile/${author.id}`}><Avatar user={author} size={36} /></Link>
          : <div className="h-9 w-9 rounded-full bg-bronze-soft grid place-items-center text-bronze font-serif font-bold">?</div>}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-tight flex items-center gap-1 flex-wrap">
            {author ? <Link to={`/profile/${author.id}`} className="hover:underline">{displayName(author)}</Link> : 'Anonymous founder'}
            {author?.verified && <BadgeCheck size={13} className="text-sky-600" />}
          </p>
          <p className="text-[11.5px] text-ink-muted flex items-center gap-1.5 flex-wrap mt-1">
            <TopicChip topic={p.topic} /><span>·</span><Link to={`/community/${p.id}`} className="hover:underline">{timeAgo(p.createdAt)}</Link>
            {camp && <><span>·</span><Link to={`/opportunity/${camp.id}`} className="hover:underline text-ink-soft">{camp.productName}</Link></>}
          </p>
        </div>
        <div className="relative flex items-center gap-1">
          <button onClick={() => need(() => actions.toggleSave('post', p.id))} aria-label="Save" className="p-1.5 rounded-lg hover:bg-bronze-soft text-ink-muted"><Bookmark size={17} className={me && isSaved(d, 'post', p.id) ? 'fill-brand text-brand' : ''} /></button>
          <button onClick={() => setMenu(!menu)} aria-label="More" className="p-1.5 rounded-lg hover:bg-bronze-soft text-ink-muted"><MoreHorizontal size={18} /></button>
          {menu && (
            <div className="absolute right-0 top-9 z-20 w-44 bg-white border border-line rounded-xl shadow-lift p-1" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => { setMenu(false); copy(`${window.location.origin}${window.location.pathname}#/community/${p.id}`, 'Link copied'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] hover:bg-canvas"><Share2 size={14} />Copy link</button>
              {p.authorId !== me && <button onClick={() => { setMenu(false); need(() => setReporting(true)); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] hover:bg-canvas"><Flag size={14} />Report post</button>}
            </div>
          )}
        </div>
      </div>

      {p.photos?.length > 0 && <div className="mt-4 rounded-sm overflow-hidden"><Photos photos={p.photos} quote={pullQuote(p.body)} /></div>}
      <Link to={`/community/${p.id}`} className="block font-serif text-[24px] sm:text-[27px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink mt-4 hover:text-bronze transition-colors" style={{ textWrap: 'balance' }}>{p.title}</Link>
      <p className={cx('text-[15px] text-ink-soft mt-2.5 whitespace-pre-line leading-[1.7]', !p.photos?.length && 'first-letter:font-serif first-letter:text-[46px] first-letter:leading-[0.85] first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-bronze')}>
        {long && !more ? `${p.body.slice(0, 240).trimEnd()}… ` : p.body}
        {long && !more && <button onClick={() => setMore(true)} className="font-semibold text-ink underline decoration-bronze/50 underline-offset-2">Continue reading</button>}
      </p>

      {(total > 0 || p.comments.length > 0 || p.interested.length > 0) && (
        <div className="pt-4 flex items-center justify-between text-[12px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            {total > 0 && <span className="flex -space-x-1">{used.map((r) => <span key={r.id} className="h-5 w-5 rounded-full bg-paper border border-ink/10 grid place-items-center text-[11px]">{r.emoji}</span>)}</span>}
            {total > 0 && <span>{total}</span>}
          </span>
          <span className="flex gap-3">
            {p.comments.length > 0 && <Link to={`/community/${p.id}`} className="hover:underline">{p.comments.length} comment{p.comments.length > 1 ? 's' : ''}</Link>}
            {p.interested.length > 0 && <span>{p.interested.length} want to collab</span>}
          </span>
        </div>
      )}

      <div className="mt-3 border-y border-ink/10 grid grid-cols-3 relative">
        {picker && (
          <div className="absolute -top-14 left-0 z-20 flex gap-1 bg-white border border-line rounded-full shadow-lift px-2 py-1.5" onMouseLeave={() => setPicker(false)}>
            {REACTIONS.map((r) => (
              <button key={r.id} onClick={() => { need(() => actions.react(p.id, r.id)); setPicker(false); }} className="flex flex-col items-center px-2 rounded-full hover:bg-canvas transition-transform hover:scale-110" title={r.label}>
                <span className="text-[24px] leading-none">{r.emoji}</span><span className="text-[10px] text-ink-muted">{r.label}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => (mine ? actions.react(p.id, mine) : setPicker(!picker))} onMouseEnter={() => !mine && setPicker(true)}
          className={cx('h-10 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] hover:bg-bronze-soft', mine ? 'text-bronze' : 'text-ink-soft')}>
          {mine ? <><span className="text-[15px]">{REACTIONS.find((r) => r.id === mine).emoji}</span>{REACTIONS.find((r) => r.id === mine).label}</> : <><Flame size={15} />React</>}
        </button>
        <button onClick={() => need(() => inputRef.current?.focus())} className="h-10 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft hover:bg-bronze-soft"><MessageCircle size={15} />Comment</button>
        <button onClick={collab} className={cx('h-10 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] hover:bg-bronze-soft', wantsCollab ? 'text-bronze' : 'text-ink-soft')}><Handshake size={15} />{p.authorId === me ? `${p.interested.length} collab` : wantsCollab ? 'Messaged' : 'Collab'}</button>
      </div>

      <div className="pt-4 space-y-3">
        {!full && p.comments.length > 2 && <Link to={`/community/${p.id}`} className="text-[13px] font-medium text-ink-muted hover:underline">View all {p.comments.length} comments</Link>}
        {comments.map((c) => {
          const u = userById(d, c.authorId);
          return (
            <div key={c.id} className="border-l-2 border-bronze/60 pl-3.5">
              <p className="text-[14px] text-ink-soft leading-relaxed">{c.body}</p>
              <p className="text-[11.5px] text-ink-muted mt-0.5"><Link to={`/profile/${u?.id}`} className="font-semibold text-ink hover:underline">{displayName(u)}</Link> · {timeAgo(c.createdAt)}</p>
            </div>
          );
        })}
        <form onSubmit={send} className="flex gap-2 items-center pt-1">
          <Avatar user={currentUser(d)} size={28} />
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onFocus={() => !me && nav('/login')} placeholder="Add your thoughts…"
            className="flex-1 h-9 px-0 bg-transparent border-0 border-b border-ink/15 focus:border-bronze focus:outline-none font-serif italic text-[14.5px] placeholder:text-ink-faint" />
          {text.trim() && <button type="submit" aria-label="Send" className="h-8 w-8 rounded-full bg-ink text-paper grid place-items-center"><Send size={14} /></button>}
        </form>
      </div>
      {reporting && <ReportModal kind="post" refId={p.id} onClose={() => setReporting(false)} />}
    </article>
  );
}

function CollabCard({ c, compact = false }) {
  const d = useDB();
  const nav = useNavigate();
  const act = useAct();
  const me = d.session.userId;
  const host = userById(d, c.hostId);
  const joined = c.members.includes(me);
  const full = c.members.length >= c.slots;
  const Icon = categoryById(c.category).icon || Handshake;
  const btn = c.hostId === me ? <Button size="sm" variant="soft" className="w-full" disabled>You're hosting</Button>
    : <Button size="sm" variant={joined ? 'outline' : 'primary'} className="w-full" disabled={!joined && full} onClick={() => (me ? act(() => actions.toggleCollab(c.id), joined ? 'You left the collab' : 'Joined! We opened a chat with the host.') : nav('/login'))}>{joined ? 'Leave' : full ? 'Full' : "I'm in"}</Button>;
  if (compact) {
    return (
      <div className="py-3 border-b border-ink/10 last:border-0">
        <p className="text-[11.5px] text-violet-700 font-medium">{COLLAB_KINDS[c.kind]}</p>
        <p className="font-serif text-[15px] font-semibold leading-snug">{c.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex -space-x-2">{c.members.slice(0, 4).map((m) => <Avatar key={m} user={userById(d, m)} size={22} />)}</div>
          <span className="text-[11.5px] text-ink-muted flex-1">{c.members.length}/{c.slots} joined</span>
          <div className="w-20">{btn}</div>
        </div>
      </div>
    );
  }
  return (
    <Card className="p-5 flex flex-col !rounded-none !border-ink/15 !shadow-none !bg-white/70">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-0.5"><Icon size={12} />{COLLAB_KINDS[c.kind]}</span>
        <span className="text-[12px] text-ink-muted flex items-center gap-1"><CalendarDays size={13} />Join by {shortDate(c.deadline)}</span>
      </div>
      <h3 className="font-serif font-semibold text-[20px] leading-tight mt-3">{c.title}</h3>
      <p className="text-[13.5px] text-ink-soft mt-1 flex-1">{c.description}</p>
      <div className="flex items-center gap-2 mt-4">
        <div className="flex -space-x-2">{c.members.map((m) => <Avatar key={m} user={userById(d, m)} size={28} />)}</div>
        <span className="text-[12.5px] text-ink-muted">{c.members.length}/{c.slots} joined · hosted by <Link to={`/profile/${host.id}`} className="text-ink hover:underline">{displayName(host)}</Link></span>
      </div>
      <div className="mt-4">{btn}</div>
    </Card>
  );
}

export default function Community() {
  const d = useDB();
  const nav = useNavigate();
  const me = currentUser(d);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'feed';
  const [topic, setTopic] = useState(params.get('topic') || 'all');
  const [sort, setSort] = useState('foryou');
  const [modal, setModal] = useState(null);
  const need = (fn) => (me ? fn() : nav('/login'));
  const heat = (p) => reactionTotal(p) + p.comments.length * 2 + p.interested.length * 2;

  const posts = d.posts.filter((p) => topic === 'all' || p.topic === topic);
  const sorted = [...posts].sort({
    foryou: (a, b) => heat(b) / Math.pow((Date.now() - b.createdAt) / 3.6e6 + 2, 0.8) - heat(a) / Math.pow((Date.now() - a.createdAt) / 3.6e6 + 2, 0.8),
    latest: (a, b) => b.createdAt - a.createdAt,
    hyped: (a, b) => heat(b) - heat(a),
  }[sort]);
  const trending = [...d.posts].sort((a, b) => heat(b) - heat(a)).slice(0, 4);
  const openCollabs = d.collabs.filter((c) => c.members.length < c.slots).slice(0, 3);
  const quick = [
    [ImageIcon, 'Photo', 'build', 'text-emerald-600'],
    [Trophy, 'Share a win', 'wins', 'text-brand-dark'],
    [LifeBuoy, 'Ask for help', 'help', 'text-rose-500'],
    [Handshake, 'Find collab', 'collab', 'text-violet-600'],
  ];

  return (
    <div className="bg-paper min-h-screen">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bronze">The Buzz Community</p>
      <h1 className="font-serif text-[34px] sm:text-[44px] font-semibold leading-none tracking-[-0.02em] mt-2">Stories from the people building local brands</h1>
      <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl">Wins, works-in-progress and honest questions from Filipino founders and creators. Cheer them on, chip in, or team up.</p>
      <div className="border-b-2 border-ink mt-6" />
    </div>
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_280px] gap-8 items-start">
      <aside className="hidden lg:block sticky top-24 space-y-1">
        {me && (
          <Link to={`/profile/${me.id}`} className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <Avatar user={me} size={32} /><span className="text-[14px] font-semibold truncate">{me.name}</span>
          </Link>
        )}
        <SideItem icon={Newspaper} active={tab === 'feed' && topic === 'all'} onClick={() => { setParams({}); setTopic('all'); }}>Feed</SideItem>
        <SideItem icon={Users} active={tab === 'collabs'} onClick={() => setParams({ tab: 'collabs' })}>Collab Board <span className="ml-auto text-[11px] text-ink-muted">{d.collabs.length}</span></SideItem>
        <SideItem icon={Bookmark} onClick={() => nav('/workspace/saved')}>Saved posts</SideItem>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-bronze px-3 pt-5 pb-1">Sections</p>
        {COMMUNITY_TOPICS.map((t) => (
          <SideItem key={t.id} icon={t.icon} active={tab === 'feed' && topic === t.id} onClick={() => { setParams({}); setTopic(t.id); }}>{t.label}</SideItem>
        ))}
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
          {[['all', 'All', LayoutGrid], ...COMMUNITY_TOPICS.map((t) => [t.id, t.label, t.icon])].map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setParams({}); setTopic(id); }} className={cx('h-9 px-3.5 rounded-full border text-[13px] inline-flex items-center gap-1.5 whitespace-nowrap', tab === 'feed' && topic === id ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft')}><Icon size={14} />{label}</button>
          ))}
          <button onClick={() => setParams({ tab: 'collabs' })} className={cx('h-9 px-3.5 rounded-full border text-[13px] whitespace-nowrap', tab === 'collabs' ? 'bg-ink text-white border-ink' : 'bg-white border-line-strong text-ink-soft')}>Collab Board</button>
        </div>

        {tab === 'feed' ? (
          <>
            <div className="border border-ink/15 bg-white/60 p-4">
              <div className="flex items-center gap-3">
                <Avatar user={me} size={38} />
                <button onClick={() => need(() => setModal({ kind: 'post', topic: 'ideas' }))} className="flex-1 h-11 text-left font-serif italic text-[17px] text-ink-muted hover:text-ink truncate">
                  Tell the community your story{me ? `, ${me.name.split(' ')[0]}` : ''}…
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 mt-3 pt-3 border-t border-ink/10">
                {quick.map(([Icon, label, t]) => (
                  <button key={label} onClick={() => need(() => setModal({ kind: 'post', topic: t }))} className="h-9 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft hover:text-bronze"><Icon size={15} className="text-bronze" />{label}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[['foryou', 'For you'], ['latest', 'Latest'], ['hyped', 'Most hyped']].map(([id, label]) => (
                <button key={id} onClick={() => setSort(id)} className={cx('h-8 px-1 mr-4 text-[11.5px] font-semibold uppercase tracking-[0.14em] border-b-2', sort === id ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>{label}</button>
              ))}
              {topic !== 'all' && <span className="ml-auto"><TopicChip topic={topic} /></span>}
            </div>

            <div>{sorted.length === 0 ? <EmptyState title="No stories here yet" body="Be the first to share one." /> : sorted.map((p) => <PostCard key={p.id} p={p} />)}</div>
          </>
        ) : (
          <>
            <Card className="p-5 flex flex-wrap items-center gap-4 !bg-white/60 !rounded-none !border-ink/15 !shadow-none">
              <div className="flex-1 min-w-[220px]">
                <p className="font-serif text-[24px] font-semibold">Collab Board</p>
                <p className="text-[13.5px] text-ink-muted">Team up to cut costs and reach more people: bundles, joint giveaways, shared shoots, bazaar booths and creator squads.</p>
              </div>
              <Button onClick={() => need(() => setModal({ kind: 'collab' }))}>Start a collab</Button>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{d.collabs.map((c) => <CollabCard key={c.id} c={c} />)}</div>
          </>
        )}
      </div>

      <aside className="hidden lg:block sticky top-24 space-y-4">
        <div className="border-t-2 border-ink pt-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-bronze mb-1">Most read this week</p>
          {trending.map((p, i) => (
            <Link key={p.id} to={`/community/${p.id}`} className="flex gap-3 py-3 border-b border-ink/10 last:border-0 group">
              <span className="font-serif text-[28px] leading-none text-bronze/70 w-6">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-serif text-[16px] font-semibold leading-snug group-hover:text-bronze line-clamp-3">{p.title}</span>
                <span className="text-[11.5px] text-ink-muted">{reactionTotal(p)} reactions · {p.comments.length} comments</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="border-t-2 border-ink pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-bronze">Open collabs</p>
            <button onClick={() => setParams({ tab: 'collabs' })} className="text-[12px] font-semibold text-ink underline decoration-bronze/50 underline-offset-2">See all</button>
          </div>
          {openCollabs.map((c) => <CollabCard key={c.id} c={c} compact />)}
        </div>
      </aside>

      {modal?.kind === 'post' && <PostModal open onClose={() => setModal(null)} defaultTopic={modal.topic} onPosted={() => { setSort('latest'); setTopic('all'); }} />}
      {modal?.kind === 'collab' && <CollabModal open onClose={() => setModal(null)} />}
    </main>
    </div>
  );
}

function SideItem({ icon: Icon, active, onClick, children }) {
  return (
    <button onClick={onClick} className={cx('w-full flex items-center gap-2.5 px-3 h-9 text-[14px] text-left border-l-2', active ? 'border-bronze font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
      <Icon size={16} strokeWidth={1.7} />{children}
    </button>
  );
}
