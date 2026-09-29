import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDB } from '../lib/store';
import { PostCard } from './Community';

export default function PostDetail() {
  const { id } = useParams();
  const d = useDB();
  const nav = useNavigate();
  const p = d.posts.find((x) => x.id === id);
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => nav('/community')} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink mb-5"><ArrowLeft size={16} />Back to Community</button>
      {p ? <PostCard p={p} full /> : <p className="text-center text-ink-muted">This post was removed.</p>}
    </main>
  );
}
