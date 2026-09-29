import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, ChevronLeft, ChevronRight, Bookmark, Star, MapPin, Users, BadgeCheck, Check, Minus, ChevronRight as Chev } from 'lucide-react';
import { CATEGORIES, categoryById, PLATFORMS } from '../lib/constants';
import { budgetLabel, compact } from '../lib/format';
import { useDB, userById, applicantsCount, isSaved, actions, brandName, followersOf, ratingOf } from '../lib/store';
import { matchScore } from '../lib/match';
import { earnLabel, deliverableSummary } from '../lib/pay';
import { Avatar, Badge, cx } from './ui';

export function Logo({ className }) {
  return (
    <Link to="/" className={cx('inline-flex items-center gap-1.5 select-none', className)} aria-label="Buzz home">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#1E2A4A" />
        <path d="M38 14c-8 3-14 11-15 20l7 7c9-1 17-7 20-15 1-4 1-8 0-12-4-1-8-1-12 0z" fill="#fff" />
        <circle cx="38" cy="26" r="4" fill="#F59E0B" />
        <path d="M23 34l-7 2 5-9zM30 41l-2 7 9-5z" fill="#F59E0B" />
      </svg>
      <span className="text-[22px] font-extrabold italic tracking-tight text-navy leading-none">buzz</span>
    </Link>
  );
}

// Shows uploaded photos, or a styled stand-in labelled with what photo belongs there.
export function ProductImage({ campaign, className, rounded = 'rounded-none', showNav = false, index = 0, mini = false }) {
  const [i, setI] = useState(index);
  const [broken, setBroken] = useState({});
  const cat = categoryById(campaign.category);
  const photos = (campaign.photos || []).filter((p) => !broken[p]);
  const hints = campaign.photoHints?.length ? campaign.photoHints : [campaign.productName];
  const count = photos.length || hints.length;
  const k = ((i % count) + count) % count;
  const Icon = cat.icon;
  return (
    <div className={cx('relative overflow-hidden group/img', rounded, className)}>
      {(
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cat.tint?.[0] || '#FEF3E2'}, ${cat.tint?.[1] || '#FBD38D'})` }}>
          <svg className="absolute inset-0 w-full h-full opacity-[0.18]" aria-hidden>
            <defs>
              <pattern id={`p-${campaign.id}`} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <line x1="0" y1="0" x2="0" y2="22" stroke={cat.ink || '#B45309'} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#p-${campaign.id})`} />
          </svg>
          {mini ? (
            <div className="absolute inset-0 grid place-items-center" style={{ color: cat.ink }}>{Icon && <Icon size={20} strokeWidth={1.7} />}</div>
          ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/80 grid place-items-center shadow-sm" style={{ color: cat.ink }}>
              {Icon && <Icon size={26} strokeWidth={1.6} />}
            </div>
            <p className="text-[12.5px] font-semibold leading-tight" style={{ color: cat.ink }}>{hints[k]}</p>
            <p className="text-[10.5px] uppercase tracking-wider opacity-70 inline-flex items-center gap-1" style={{ color: cat.ink }}><ImagePlus size={11} /> Photo placeholder</p>
          </div>
          )}
        </div>
      )}
      {photos.length > 0 && (
        <img src={photos[k]} alt={campaign.productName} loading="lazy" onError={() => setBroken((b) => ({ ...b, [photos[k]]: true }))} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {showNav && count > 1 && (
        <>
          <button onClick={(e) => { e.preventDefault(); setI(k - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 grid place-items-center opacity-0 group-hover/img:opacity-100 transition"><ChevronLeft size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); setI(k + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 grid place-items-center opacity-0 group-hover/img:opacity-100 transition"><ChevronRight size={16} /></button>
        </>
      )}
      {count > 1 && !mini && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: count }).map((_, j) => <span key={j} className={cx('h-1.5 rounded-full transition-all', j === k ? 'w-4 bg-white' : 'w-1.5 bg-white/60')} />)}
        </div>
      )}
    </div>
  );
}

export function CategoryRow({ value, onChange, compactRow = false }) {
  const shown = CATEGORIES;
  const Tile = ({ active, onClick, icon: Icon, label }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 w-[84px] group">
      <span className={cx('h-[52px] w-[52px] rounded-2xl border grid place-items-center transition-all',
        active ? 'bg-brand-soft border-brand text-brand-dark shadow-sm' : 'bg-white border-line text-ink-soft group-hover:border-brand/50 group-hover:text-brand-dark')}>
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <span className={cx('text-[11.5px] leading-tight text-center', active ? 'text-ink font-semibold' : 'text-ink-muted')}>{label}</span>
    </button>
  );
  return (
    <div className={cx('flex flex-wrap gap-y-3', compactRow ? 'gap-x-1' : 'gap-x-2')}>
      {shown.map((c) => <Tile key={c.id} active={value === c.id} onClick={() => onChange(c.id)} icon={c.icon} label={c.label} />)}
    </div>
  );
}

export function FitChecks({ checks }) {
  return (
    <ul className="space-y-1.5">
      {checks.map((c) => (
        <li key={c.text} className="flex gap-2 text-[12.5px] leading-snug">
          {c.status === 'good' ? <Check size={15} strokeWidth={2.5} className="text-emerald-600 shrink-0 mt-px" />
            : c.status === 'ok' ? <span className="h-[15px] w-[15px] shrink-0 mt-px grid place-items-center"><span className="h-2 w-2 rounded-full bg-amber-400" /></span>
              : <Minus size={15} strokeWidth={2.5} className="text-ink-faint shrink-0 mt-px" />}
          <span className={c.status === 'bad' ? 'text-ink-muted' : 'text-ink'}>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function MatchPill({ score, label, tone, checks, passed, total }) {
  if (score == null) return null;
  return (
    <span className="relative group/m inline-flex">
      <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', tone)}>
        {label}
      </span>
      {checks?.length > 0 && (
        <span className="absolute right-0 top-7 z-20 hidden group-hover/m:block w-72 bg-white border border-line rounded-xl shadow-lift p-3 text-left">
          <span className="block text-[11px] uppercase tracking-wide text-ink-muted mb-2">How this fits</span>
          <FitChecks checks={checks} />
        </span>
      )}
    </span>
  );
}

export function EarnTag({ campaign, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-emerald-600/95 text-white px-2.5 py-1 text-[12px] font-semibold shadow-sm backdrop-blur', className)}>
      {earnLabel(campaign)}
    </span>
  );
}

// Compact card for horizontal shelves.
export function OpportunityTile({ campaign }) {
  const d = useDB();
  const owner = userById(d, campaign.ownerId);
  return (
    <Link to={`/opportunity/${campaign.id}`} className="w-[230px] shrink-0 bg-white border border-line rounded-2xl overflow-hidden hover:shadow-lift transition-shadow snap-start">
      <div className="relative">
        <ProductImage campaign={campaign} className="aspect-[4/3]" />
        <EarnTag campaign={campaign} className="absolute bottom-2 left-2 !text-[11.5px]" />
      </div>
      <div className="p-3">
        <p className="text-[13px] font-bold leading-snug line-clamp-2 min-h-[34px]">{campaign.productName}</p>
        <p className="text-[11.5px] text-ink-muted truncate mt-0.5">{brandName(owner)} · {owner?.region}</p>
      </div>
    </Link>
  );
}

export function OpportunityCard({ campaign }) {
  const d = useDB();
  const me = userById(d, d.session.userId);
  const owner = userById(d, campaign.ownerId);
  const m = me?.creator && me.id !== campaign.ownerId ? matchScore(me, campaign, { d }) : { score: null };
  const saved = isSaved(d, 'campaign', campaign.id);
  return (
    <Link to={`/opportunity/${campaign.id}`} className="group bg-white border border-line rounded-2xl overflow-hidden shadow-card hover:shadow-lift hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="relative">
        <ProductImage campaign={campaign} className="aspect-[4/3]" showNav />
        <button onClick={(e) => { e.preventDefault(); if (d.session.userId) actions.toggleSave('campaign', campaign.id); }}
          className={cx('absolute top-3 right-3 h-8 w-8 rounded-full grid place-items-center shadow-sm transition', saved ? 'bg-brand text-white' : 'bg-white/90 text-ink-soft hover:text-ink')} aria-label="Save">
          <Bookmark size={15} className={saved ? 'fill-white' : ''} />
        </button>
        <span className="absolute top-3 left-3"><Badge className="bg-white/95 border-transparent text-ink">{campaign.type}</Badge></span>
        <EarnTag campaign={campaign} className="absolute bottom-3 left-3" />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[12px] text-ink-muted truncate inline-flex items-center gap-1 min-w-0"><span className="truncate">{brandName(owner)}</span>{owner?.verified && <BadgeCheck size={13} className="text-sky-600 shrink-0" />}<span className="shrink-0">· {owner?.region}</span></span>
          <MatchPill {...m} />
        </div>
        <h3 className="text-[14.5px] font-bold text-ink leading-snug line-clamp-2">{campaign.title}</h3>
        <p className="text-[12.5px] text-ink-muted mt-1 line-clamp-2">{campaign.description}</p>
        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-soft truncate">{deliverableSummary(campaign)}</span>
          <span className="text-[12px] text-ink-muted shrink-0">{applicantsCount(d, campaign.id)} applied</span>
        </div>
      </div>
    </Link>
  );
}

export function OpportunityRow({ campaign }) {
  const d = useDB();
  const me = userById(d, d.session.userId);
  const m = me?.creator && me.id !== campaign.ownerId ? matchScore(me, campaign, { d }) : { score: null };
  return (
    <Link to={`/opportunity/${campaign.id}`} className="flex items-center gap-4 bg-white border border-line rounded-2xl p-3 pr-4 hover:shadow-lift transition-shadow">
      <ProductImage campaign={campaign} mini className="h-14 w-14 shrink-0" rounded="rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink truncate">{campaign.title}</p>
        <p className="text-[12.5px] text-ink-muted">{campaign.type} · {categoryById(campaign.category).label} · {applicantsCount(d, campaign.id)} applied</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12.5px] font-semibold text-emerald-700">{earnLabel(campaign)}</p>
        {m.score != null && <p className="text-[11.5px] text-ink-muted">{m.label}</p>}
      </div>
      <Chev size={18} className="text-ink-muted shrink-0" />
    </Link>
  );
}

export function PlatformChips({ platforms }) {
  return (
    <span className="inline-flex gap-1">
      {platforms.map((p) => (
        <span key={p.id} className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: PLATFORMS[p.id]?.color }} title={`${PLATFORMS[p.id]?.label}: ${compact(p.followers)}`}>
          {PLATFORMS[p.id]?.short}
        </span>
      ))}
    </span>
  );
}

export function CreatorCard({ user, forCampaign }) {
  const d = useDB();
  const m = forCampaign ? matchScore(user, forCampaign, { brand: true, d }) : { score: null };
  const r = ratingOf(d, user.id);
  const cats = user.creator.niches.map((n) => categoryById(n).label).join(', ');
  return (
    <div className="bg-white border border-line rounded-2xl p-4 shadow-card hover:shadow-lift transition-shadow flex flex-col">
      <div className="flex items-start gap-3">
        <Avatar user={user} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14.5px] font-bold text-ink truncate inline-flex items-center gap-1">{user.name}{user.verified && <BadgeCheck size={14} className="text-sky-600 shrink-0" />}</p>
            <MatchPill {...m} />
          </div>
          <p className="text-[12px] text-ink-muted truncate">{cats}</p>
          <p className="text-[12px] text-ink-muted flex items-center gap-1"><MapPin size={12} />{user.location}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-ink-soft mt-3">
        <span className="inline-flex items-center gap-1"><Users size={13} />{compact(followersOf(user))}</span>
        <span>{user.creator.engagement}% eng.</span>
        {r.avg && <span className="inline-flex items-center gap-0.5"><Star size={12} className="fill-brand text-brand" />{r.avg.toFixed(1)}</span>}
        <span className="ml-auto"><PlatformChips platforms={user.creator.platforms} /></span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <span className="text-[14px] font-bold text-brand-dark">{user.creator.rates?.reel ? `₱${user.creator.rates.reel.toLocaleString()} / reel` : 'Rate on request'}</span>
        <Link to={`/profile/${user.id}`} className="h-8 px-3 rounded-lg bg-brand-soft text-[12.5px] font-medium text-ink grid place-items-center hover:bg-[#FCE7C4]">View Profile</Link>
      </div>
    </div>
  );
}

export function CreatorRow({ user, forCampaign }) {
  const d = useDB();
  const m = forCampaign ? matchScore(user, forCampaign, { brand: true, d }) : { score: null };
  return (
    <Link to={`/profile/${user.id}`} className="flex items-center gap-4 bg-white border border-line rounded-2xl p-3 pr-4 hover:shadow-lift transition-shadow">
      <Avatar user={user} size={44} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">{user.name} <span className="font-normal text-ink-muted">@{user.creator.handle}</span></p>
        <p className="text-[12.5px] text-ink-muted">{categoryById(user.creator.niches[0]).label} · {compact(followersOf(user))} followers · {user.creator.engagement}% eng.</p>
      </div>
      <div className="text-right">
        <p className="text-[13.5px] font-bold text-brand-dark">₱{(user.creator.rates?.reel || 0).toLocaleString()}</p>
        {m.score != null && <p className="text-[12px] font-semibold text-emerald-700">{m.label}</p>}
      </div>
      <Chev size={18} className="text-ink-muted" />
    </Link>
  );
}
