import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, ShoppingBag, Play, Star, Gift, Copy, ExternalLink, Rocket, Handshake } from 'lucide-react';
import { useDB, currentUser, userById, brandName, actions, ratingOf } from '../lib/store';
import { shopLinks, socialLinks, ugcProgramOf } from '../lib/grow';
import { PLATFORMS } from '../lib/constants';
import { peso, timeAgo } from '../lib/format';
import { appUrl } from '../lib/links';
import { ProductImage, Logo } from '../components/visuals';
import { Card, Button, Badge, Avatar, EmptyState, useCopy } from '../components/ui';
import { LaunchImage } from './LaunchPad';

// Free public storefront for every brand: the link they put in their TikTok bio.
export default function Shop() {
  const { id } = useParams();
  const d = useDB();
  const copy = useCopy();
  const me = currentUser(d);
  const u = userById(d, id);
  useEffect(() => { if (u?.business) actions.recordProfileView(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!u?.business || u.suspended) return <main className="max-w-3xl mx-auto p-10 text-center text-ink-muted">This shop page doesn't exist. <Link to="/" className="text-brand-dark">Go to Buzz</Link></main>;
  const own = me?.id === u.id;
  const b = u.business;
  const buy = shopLinks(u);
  const socials = socialLinks(u);
  const products = d.campaigns.filter((c) => c.ownerId === u.id && c.published && !c.removed);
  const launches = d.launches.filter((l) => l.brandId === u.id && !products.some((c) => c.id === l.campaignId));
  const campaignIds = new Set(products.map((c) => c.id));
  const content = [
    ...d.deliverables.filter((x) => campaignIds.has(x.campaignId) && x.status === 'approved' && x.contentUrl).map((x) => ({ id: x.id, url: x.contentUrl, by: userById(d, x.creatorId), platform: x.platform, ts: x.approvedAt || x.submittedAt, kind: 'Creator' })),
    ...d.ugcPosts.filter((x) => x.brandId === u.id && x.status === 'approved').map((x) => ({ id: x.id, url: x.url, by: userById(d, x.userId), platform: x.platform, ts: x.reviewedAt, kind: 'Customer' })),
    ...d.swaps.filter((s) => s.status !== 'cancelled' && ((s.toId === u.id && s.fromUrl) || (s.fromId === u.id && s.toUrl))).map((s) => ({ id: s.id, url: s.toId === u.id ? s.fromUrl : s.toUrl, by: userById(d, s.toId === u.id ? s.fromId : s.toId), platform: /tiktok/.test(s.toId === u.id ? s.fromUrl : s.toUrl) ? 'tiktok' : 'instagram', ts: s.doneAt || s.decidedAt, kind: 'Partner brand' })),
  ].sort((a, c) => (c.ts || 0) - (a.ts || 0));
  const reviews = d.reviews.filter((r) => r.toId === u.id);
  const rating = ratingOf(d, u.id);
  const program = ugcProgramOf(d, u.id);
  const link = appUrl(`/shop/${u.id}`);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {own && (
        <Card className="p-4 mb-5 bg-brand-softer border-[#F6DDB2] flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[13.5px] flex-1"><b>This is your free shop page.</b> Put the link in your TikTok and Instagram bio. Edit what shows here in My Profile.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => copy(link, 'Shop link copied. Paste it in your bio!')}><Copy size={14} />Copy bio link</Button>
            <Link to="/workspace/profile"><Button size="sm" variant="outline">Edit</Button></Link>
          </div>
        </Card>
      )}

      <section className="text-center">
        <div className="mx-auto w-fit"><Avatar user={u} size={84} /></div>
        <h1 className="text-[28px] font-extrabold mt-3 inline-flex items-center gap-1.5">{brandName(u)}{b.verified && <BadgeCheck size={22} className="text-sky-600" />}</h1>
        <p className="text-ink-soft mt-1 max-w-lg mx-auto">{b.tagline || b.type}</p>
        <p className="text-[13px] text-ink-muted mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1"><MapPin size={13} />{u.location}</span>
          {rating.count > 0 && <span className="inline-flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{rating.avg.toFixed(1)} from {rating.count} creators</span>}
          {socials.map(([name, href, handle]) => <a key={name} href={href} target="_blank" rel="noreferrer" className="hover:text-ink">{name} {handle}</a>)}
        </p>
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2 mt-5 max-w-md sm:max-w-none mx-auto">
          {buy.map(([name, href], i) => <a key={name} href={href} target="_blank" rel="noreferrer"><Button size="lg" variant={i === 0 ? 'primary' : 'outline'} className="w-full"><ShoppingBag size={16} />{name === 'Website' ? 'Visit website' : name.startsWith('Order') ? name : `Buy on ${name}`}</Button></a>)}
          {!buy.length && own && <p className="text-[13px] text-ink-muted">Add your TikTok Shop, Shopee or website link in My Profile so visitors can buy.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[18px] font-bold mb-3">Products</h2>
        {products.length + launches.length === 0 ? <Card><EmptyState icon={ShoppingBag} title="No products listed yet" /></Card> : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((c) => (
              <Card key={c.id} className="overflow-hidden flex flex-col">
                <ProductImage campaign={c} className="aspect-square" />
                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-semibold text-[14px] leading-snug">{c.productName}</p>
                  {c.aov > 0 && <p className="text-[13px] text-ink-muted">{peso(c.aov)}</p>}
                  {(c.shopUrl || buy[0]) && <a href={c.shopUrl || buy[0][1]} target="_blank" rel="noreferrer" className="mt-auto pt-2"><Button size="sm" variant="soft" className="w-full">Buy</Button></a>}
                </div>
              </Card>
            ))}
            {launches.map((l) => (
              <Card key={l.id} className="overflow-hidden flex flex-col">
                <LaunchImage d={d} l={l} className="aspect-square" />
                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-semibold text-[14px] leading-snug">{l.title} <Badge tone="soft" className="ml-1"><Rocket size={10} />New</Badge></p>
                  {l.price > 0 && <p className="text-[13px] text-ink-muted">{peso(l.price)}</p>}
                  {(l.shopUrl || buy[0]) && <a href={l.shopUrl || buy[0][1]} target="_blank" rel="noreferrer" className="mt-auto pt-2"><Button size="sm" variant="soft" className="w-full">Buy</Button></a>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {content.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[18px] font-bold mb-1">As seen on TikTok & Instagram</h2>
          <p className="text-[13px] text-ink-muted mb-3">Real posts from creators, customers and partner brands.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.slice(0, 8).map((x) => (
              <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white border border-line rounded-2xl p-3 hover:shadow-lift transition-shadow">
                <div className="h-12 w-12 rounded-xl grid place-items-center text-white shrink-0" style={{ background: PLATFORMS[x.platform]?.color || '#111' }}><Play size={18} className="fill-white" /></div>
                <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold truncate">{x.by?.business && x.kind === 'Partner brand' ? brandName(x.by) : x.by?.name}</p><p className="text-[12px] text-ink-muted">{x.kind} · {PLATFORMS[x.platform]?.label || 'Post'}{x.ts ? ` · ${timeAgo(x.ts)}` : ''}</p></div>
                <ExternalLink size={15} className="text-ink-muted shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      {program?.active && !own && (
        <Card className="mt-10 p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-2 border-brand">
          <Gift size={26} className="text-brand-dark shrink-0" />
          <div className="flex-1"><p className="font-bold">Love {brandName(u)}? Get {peso(program.credit)} store credit.</p><p className="text-[13px] text-ink-soft">Post about them on TikTok or Instagram and send the link. Anyone can join: no follower minimum.</p></div>
          <Link to={`/join/${program.code}`}><Button>Join</Button></Link>
        </Card>
      )}

      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[18px] font-bold mb-3">What creators say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reviews.slice(0, 4).map((r) => {
              const by = userById(d, r.fromId);
              return <Card key={r.id} className="p-4"><p className="text-[13.5px]">"{r.text}"</p><p className="text-[12px] text-ink-muted mt-2 flex items-center gap-1.5"><Avatar user={by} size={18} />{by?.name} · {'★'.repeat(r.rating)}</p></Card>;
            })}
          </div>
        </section>
      )}

      {!own && (
        <Card className="mt-10 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Handshake size={24} className="text-brand-dark shrink-0" />
          <p className="text-[13.5px] text-ink-soft flex-1"><b className="text-ink">Are you a creator?</b> See what {brandName(u)} is looking for and work with them on Buzz.</p>
          <Link to={`/profile/${u.id}`}><Button variant="outline">See their listings</Button></Link>
        </Card>
      )}
      <div className="mt-10 flex flex-col items-center gap-1 text-[12px] text-ink-muted"><Logo /><span>Free shop pages for Filipino brands</span></div>
    </main>
  );
}
