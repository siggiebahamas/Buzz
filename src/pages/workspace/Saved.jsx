import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useDB, userById, campaignById } from '../../lib/store';
import { OpportunityCard, CreatorCard } from '../../components/visuals';
import { Card, Button, EmptyState } from '../../components/ui';
import { PostCard } from '../Community';
import { PageHead } from './Layout';

export default function Saved() {
  const d = useDB();
  const mine = d.saved.filter((s) => s.userId === d.session.userId);
  const camps = mine.filter((s) => s.kind === 'campaign').map((s) => campaignById(d, s.refId)).filter(Boolean);
  const people = mine.filter((s) => s.kind === 'creator').map((s) => userById(d, s.refId)).filter((u) => u?.creator);
  const posts = mine.filter((s) => s.kind === 'post').map((s) => d.posts.find((p) => p.id === s.refId)).filter(Boolean);
  if (!mine.length) {
    return (
      <>
        <PageHead title="Saved" sub="Products, creators and posts you bookmarked" />
        <Card><EmptyState icon={Bookmark} title="No saved items yet" body="Save creators, businesses, products and ideas to find them quickly." action={<Link to="/opportunities"><Button variant="outline">Start Discovering</Button></Link>} /></Card>
      </>
    );
  }
  return (
    <>
      <PageHead title="Saved" sub="Products, creators and posts you bookmarked" />
      {camps.length > 0 && <><h2 className="text-[18px] font-bold mb-3">Opportunities</h2><div className="grid grid-cols-3 gap-5 mb-8">{camps.map((c) => <OpportunityCard key={c.id} campaign={c} />)}</div></>}
      {people.length > 0 && <><h2 className="text-[18px] font-bold mb-3">Creators</h2><div className="grid grid-cols-3 gap-5 mb-8">{people.map((u) => <CreatorCard key={u.id} user={u} />)}</div></>}
      {posts.length > 0 && <><h2 className="text-[18px] font-bold mb-3">Community posts</h2><div className="space-y-4 max-w-3xl">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div></>}
    </>
  );
}
