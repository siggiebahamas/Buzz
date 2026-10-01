import {
  LayoutGrid, Laptop, Dumbbell, Sofa, UtensilsCrossed, Plane, Flower2, Shirt, Hammer, PawPrint,
  Lightbulb, Hammer as BuildIcon, Trophy, LifeBuoy, Handshake,
} from 'lucide-react';

// Each category carries its own placeholder-photo palette so sample cards look distinct.
export const CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'fashion', label: 'Fashion', icon: Shirt, tint: ['#FDE7D6', '#F7C8A6'], ink: '#9A4A12' },
  { id: 'crafts', label: 'Crafts & Artisan', icon: Hammer, tint: ['#EFE4D2', '#D9C29E'], ink: '#6B4E22' },
  { id: 'food', label: 'Food & Beverage', icon: UtensilsCrossed, tint: ['#FDE2D2', '#F6B89A'], ink: '#9B3A12' },
  { id: 'beauty', label: 'Beauty & Personal Care', icon: Flower2, tint: ['#FBE1E6', '#F2B8C4'], ink: '#9D2F4A' },
  { id: 'fitness', label: 'Health & Fitness', icon: Dumbbell, tint: ['#DDF1E4', '#A9DDBB'], ink: '#1F6B3C' },
  { id: 'home', label: 'Home & Lifestyle', icon: Sofa, tint: ['#E6EEE0', '#C3D6B4'], ink: '#46602F' },
  { id: 'tech', label: 'Tech & Software', icon: Laptop, tint: ['#DFE8F7', '#B3C8EE'], ink: '#27487F' },
  { id: 'travel', label: 'Travel', icon: Plane, tint: ['#DCF0F4', '#A7D9E3'], ink: '#1B5E6B' },
  { id: 'pets', label: 'Pets', icon: PawPrint, tint: ['#F3E8FB', '#D9C2EF'], ink: '#5B2F82' },
];

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export const LISTING_TYPES = ['Product', 'Service', 'Business'];

export const COMP_TYPES = {
  flat: 'Flat fee',
  commission: 'Commission',
  hybrid: 'Fee + commission',
  gifted: 'Product gifting',
};

export const PLATFORMS = {
  instagram: { label: 'Instagram', short: 'IG', color: '#C13584' },
  tiktok: { label: 'TikTok', short: 'TT', color: '#111111' },
  youtube: { label: 'YouTube', short: 'YT', color: '#E62117' },
  facebook: { label: 'Facebook', short: 'FB', color: '#1877F2' },
};

export const DELIVERABLE_TYPES = ['Reel', 'TikTok video', 'Feed post', 'Story set', 'YouTube video', 'Live selling'];

export const CAMPAIGN_STAGES = [
  { id: 'recruiting', label: 'Recruiting' },
  { id: 'active', label: 'Active' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'completed', label: 'Completed' },
];

export const COMMUNITY_TOPICS = [
  { id: 'ideas', label: 'Ideas & Validation', icon: Lightbulb, chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'build', label: 'Build & Updates', icon: BuildIcon, chip: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'wins', label: 'Wins & Success', icon: Trophy, chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'help', label: 'Help & Asks', icon: LifeBuoy, chip: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'collab', label: 'Collab Requests', icon: Handshake, chip: 'bg-violet-50 text-violet-800 border-violet-200' },
];

export const topicById = (id) => COMMUNITY_TOPICS.find((t) => t.id === id) || COMMUNITY_TOPICS[0];

export const REGIONS = ['Metro Manila', 'Luzon', 'Visayas', 'Mindanao', 'Nationwide'];

export const BUDGET_BUCKETS = [
  { id: 'any', label: 'Any budget' },
  { id: 'lt2', label: 'Under ₱2K', max: 2000 },
  { id: '2to5', label: '₱2K – ₱5K', min: 2000, max: 5000 },
  { id: '5to15', label: '₱5K – ₱15K', min: 5000, max: 15000 },
  { id: 'gt15', label: '₱15K+', min: 15000 },
];
