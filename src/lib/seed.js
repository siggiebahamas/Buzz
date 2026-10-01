// Sample data so every screen has something real to click through.
// Everything is generated relative to "now" so dates always look current.
import { DAY } from './format';
import { weekStart } from './grow';

export const SERVICE_FEE = 0.05;

// Snapshot of what both sides agree to when a creator joins a campaign.
// Workshops and pop-ups, shown only when Events is switched on.
function sampleEvents(now) {
  const day = 86400000;
  return [
    { id: 'evt_launch', kind: 'Workshop', title: 'Launch with creators on ₱10K', date: now + 12 * day, place: 'Online (Zoom)', price: 499, seats: 60, audience: 'business', desc: 'A 90-minute class for first-time founders: writing a brief, pricing, picking creators, reading results.' },
    { id: 'evt_rates', kind: 'Workshop', title: 'Price yourself right: rates for PH creators', date: now + 16 * day, place: 'Online (Zoom)', price: 299, seats: 80, audience: 'creator', desc: 'What brands pay, how to build a rate card, and how to negotiate without losing the deal.' },
    { id: 'evt_bazaar', kind: 'Pop-up', title: 'Buzz Makers Pop-up, Maginhawa', date: now + 30 * day, place: 'Maginhawa St., Quezon City', price: 3500, seats: 20, audience: 'business', desc: 'A booth for your product, with Buzz creators filming the day. Price per booth.' },
  ];
}

export function contractTerms(c, a, brand, creator) {
  return {
    brandName: brand?.business?.name || brand?.name, brandPerson: brand?.name, creatorName: creator?.name, creatorHandle: creator?.creator?.handle,
    product: c.productName, deliverables: c.deliverables.map((d) => ({ type: d.type, qty: d.qty, platform: d.platform })),
    fee: ['flat', 'hybrid'].includes(c.compensation) ? (a.rate || c.budgetMin) : 0, compensation: c.compensation, commissionRate: c.commissionRate || 0,
    contentRights: c.contentRights, disclosure: true, requireDraft: !!c.requireDraft, deadline: c.deadline,
  };
}

// Demo-only password hash (FNV-1a). Real accounts will use the backend's auth.
export function hashPw(pw) {
  let h = 0x811c9dc5;
  for (let i = 0; i < pw.length; i++) { h ^= pw.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AVATAR_COLORS = ['#F59E0B', '#EF7D57', '#E0607E', '#8B5CF6', '#3B82F6', '#10B981', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

// Sample product photos (Unsplash, free to use). Stand-ins until brands upload their own.
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;
const SAMPLE_PHOTOS = {
  cmp_barong: ['1515886657613-9f3515b0c78f', '1490481651871-ab68de25d43d', '1445205170230-053b83016050'].map(U),
  cmp_active: ['1571019613454-1cb2f99b2d8b', '1517836357463-d25dfeac3438'].map(U),
  cmp_foodbox: ['1546069901-ba9599a7e63c', '1490645935967-10de6ba17061'].map(U),
  cmp_sili: ['1504674900247-0877df9cc836', '1565299624946-b28f40a0ae38'].map(U),
  cmp_kahoy: ['1555041469-a586c61ea9bc', '1586023492125-27b2c045efd7'].map(U),
  cmp_protina: ['1534438327276-14e5300c3a48', '1571019613454-1cb2f99b2d8b'].map(U),
  cmp_sulit: ['1518770660439-4636190af475', '1519389950473-47ba0277781c'].map(U),
  cmp_ligaya: ['1483985988355-763728e1935b', '1434389677669-e08b4cac3105'].map(U),
  cmp_marikina: ['1549298916-b41d501d3772', '1542291026-7eec264c27ff'].map(U),
  cmp_bulul: ['1513519245088-0e12902e5a38', '1452860606245-08befc0ff44b'].map(U),
  cmp_mangga: ['1553279768-865429fa0078', '1546069901-ba9599a7e63c'].map(U),
  cmp_cloud9: ['1502680390469-be75c86b636f', '1507525428034-b723cf961d3e'].map(U),
  cmp_kalamansi: ['1556228578-8c89e6adf883', '1620916566398-39f1143ab7be'].map(U),
  cmp_barako: ['1495474472287-4d71bcdd2085', '1447933601403-0c6688de566e', '1509042239860-f550ce710b93'].map(U),
  cmp_tinalak: ['1523381210434-271e8be1f52b', '1528459801416-a9e53bbf4e17'].map(U),
  cmp_sadie: ['1587300003388-59208cc962cb', '1543466835-00a7907e9de1'].map(U),
  cmp_ipon: ['1512941937669-90a1b58e7e9c', '1554224155-6726b3ff858f'].map(U),
  cmp_pilates: ['1518611012118-696072aa579a', '1544367567-0f2fcb009e0b'].map(U),
  cmp_hurno: ['1509440159596-0249088772ff', '1555507036-ab1f4038808a'].map(U),
  cmp_candle: ['1602143407151-7111542de6e8', '1603006905003-be475563bc59'].map(U),
  cmp_lodge: ['1520250497591-112f2f40a3f4', '1537996194471-e657df975ab4'].map(U),
};

const TAGS = {
  cmp_barong: ['handmade'], cmp_ligaya: ['handmade'], cmp_marikina: ['handmade'], cmp_kahoy: ['handmade'], cmp_bulul: ['handmade', 'noface'],
  cmp_tinalak: ['handmade'], cmp_candle: ['handmade', 'noface'], cmp_sili: ['noface'], cmp_barako: ['noface'], cmp_ipon: ['noface'],
  cmp_mangga: ['noface'], cmp_protina: ['longterm'], cmp_active: ['longterm'], cmp_kalamansi: ['longterm'],
};

const ME = 'u_me';

const OWNERS = [
  { id: 'u_ligaya', name: 'Ligaya Santos', loc: 'Makati City', region: 'Metro Manila', biz: 'Atelier Ligaya', type: 'Made-to-measure dressmaker', cat: 'fashion', bio: 'Trained in London for 8 years, now home making modern Filipiniana and evening wear.' },
  { id: 'u_ben', name: 'Benjamin Cruz', loc: 'Marikina City', region: 'Metro Manila', biz: 'Marikina Made', type: 'Handmade leather shoes', cat: 'fashion', bio: 'Third-generation shoemaker. Every pair is lasted and stitched by hand in our family workshop.' },
  { id: 'u_carvers', name: 'Andres Dulnuan', loc: 'Banaue, Ifugao', region: 'Luzon', biz: 'Banaue Carvers Collective', type: 'Ifugao woodcarving', cat: 'crafts', bio: 'A collective of 14 Ifugao carvers keeping bulul and narra carving alive.' },
  { id: 'u_sili', name: 'Paolo Reyes', loc: 'San Fernando, Pampanga', region: 'Luzon', biz: 'Sili Republic', type: 'Artisanal hot sauce', cat: 'food', bio: 'Small-batch hot sauces made with siling labuyo from Pampanga farms.' },
  { id: 'u_kahoy', name: 'Mara Villanueva', loc: 'Mandaue, Cebu', region: 'Visayas', biz: 'Kahoy Studio', type: 'Handmade furniture', cat: 'home', bio: 'Small-batch furniture from reclaimed Cebu hardwood.' },
  { id: 'u_protina', name: 'Jessa Lim', loc: 'Sta. Rosa, Laguna', region: 'Luzon', biz: 'Protina', type: 'Organic whey protein', cat: 'fitness', bio: 'The Philippines\' first locally-sourced organic whey protein.' },
  { id: 'u_sulit', name: 'Rafael Tan', loc: 'Pasig City', region: 'Metro Manila', biz: 'Sulit Smart', type: 'Smart home devices', cat: 'tech', bio: 'We build smart outlets designed for Philippine electrical standards and Meralco rates.' },
  { id: 'u_mangga', name: 'Grace Ouano', loc: 'Cebu City', region: 'Visayas', biz: 'Sugbo Mangga', type: 'Dried mango snacks', cat: 'food', bio: 'Carabao mangoes from Guimaras and Cebu, dried without added sulfites.' },
  { id: 'u_cloud9', name: 'Kai Ramos', loc: 'General Luna, Siargao', region: 'Mindanao', biz: 'Cloud 9 Surf Stay', type: 'Surf camp & homestay', cat: 'travel', bio: 'A 6-room surf homestay run by local surf instructors.' },
  { id: 'u_kalamansi', name: 'Bea Mendoza', loc: 'Quezon City', region: 'Metro Manila', biz: 'Kalamansi Glow', type: 'Citrus skincare', cat: 'beauty', bio: 'Vitamin C skincare made with kalamansi from Oriental Mindoro.' },
  { id: 'u_barako', name: 'Tomas Aguilar', loc: 'Lipa, Batangas', region: 'Luzon', biz: 'Batangas Barako Roasters', type: 'Specialty coffee', cat: 'food', bio: 'Liberica beans from our family farm, roasted weekly.' },
  { id: 'u_tboli', name: 'Maria Fe Dulay', loc: 'Lake Sebu, South Cotabato', region: 'Mindanao', biz: 'Lake Sebu Tinalak Weavers', type: 'T\'boli tinalak textiles', cat: 'crafts', bio: 'Dreamweavers of Lake Sebu. Each tinalak design is passed down, never copied.' },
  { id: 'u_sadie', name: 'Nina Uy', loc: 'Taguig City', region: 'Metro Manila', biz: 'Sadie\'s Pet Wear', type: 'Pet apparel', cat: 'pets', bio: 'Rain-ready gear for short-legged dogs, inspired by our corgi Sadie.' },
  { id: 'u_ipon', name: 'Carlo Dizon', loc: 'Makati City', region: 'Metro Manila', biz: 'Ipon', type: 'Budgeting app', cat: 'tech', bio: 'A budgeting app built for sweldo cycles, paluwagan and padala.' },
  { id: 'u_pilates', name: 'Andrea Go', loc: 'Quezon City', region: 'Metro Manila', biz: 'Core Studio QC', type: 'Pilates studio', cat: 'fitness', bio: 'Reformer pilates studio in Maginhawa.' },
  { id: 'u_hurno', name: 'Lorna Bautista', loc: 'Marikina City', region: 'Metro Manila', biz: 'Hurno Bakehouse', type: 'Neighborhood bakery', cat: 'food', bio: 'Ube cheese pandesal baked in a wood-fired oven since 2019.' },
  { id: 'u_candle', name: 'Iris Navarro', loc: 'Iloilo City', region: 'Visayas', biz: 'Sampaguita Candle Co.', type: 'Soy candles', cat: 'home', bio: 'Hand-poured soy candles with scents of home: sampaguita, ilang-ilang, kape.' },
  { id: 'u_lodge', name: 'Miguel Abad', loc: 'El Nido, Palawan', region: 'Luzon', biz: 'Bahay Kubo Eco Lodge', type: 'Eco lodge', cat: 'travel', bio: 'Solar-powered cottages 10 minutes from Nacpan Beach.' },
];

const CREATORS = [
  { id: 'c_bianca', name: 'Bianca Reyes', handle: 'biancaeats', loc: 'Manila', region: 'Metro Manila', niches: ['food'], pl: { instagram: 48000, tiktok: 120000 }, eng: 7.2, aud: 'Women 18–34, Metro Manila foodies', bio: 'Honest food reviews, hole-in-the-wall finds and home cooking.' },
  { id: 'c_migo', name: 'Migo Santos', handle: 'migomoves', loc: 'Taguig City', region: 'Metro Manila', niches: ['fitness'], pl: { instagram: 32000, tiktok: 85000 }, eng: 6.1, aud: 'Gym-goers 20–35', bio: 'Coach. Home workouts, lifting and budget meal prep.' },
  { id: 'c_aya', name: 'Aya Lim', handle: 'ayastyles', loc: 'Makati City', region: 'Metro Manila', niches: ['fashion', 'beauty'], pl: { instagram: 76000, tiktok: 40000 }, eng: 5.4, aud: 'Young professionals 22–35', bio: 'Office-to-weekend styling with local designers.' },
  { id: 'c_jomar', name: 'Jomar Villareal', handle: 'techwithjomar', loc: 'Quezon City', region: 'Metro Manila', niches: ['tech'], pl: { youtube: 140000, tiktok: 60000 }, eng: 4.8, aud: 'Men 18–40, gadget buyers', bio: 'No-nonsense gadget reviews in Taglish.' },
  { id: 'c_trish', name: 'Trish Ocampo', handle: 'trishtravels', loc: 'Cebu City', region: 'Visayas', niches: ['travel', 'food'], pl: { instagram: 58000, youtube: 30000 }, eng: 6.8, aud: 'Weekend travelers 24–40', bio: 'Affordable island hopping and local stays.' },
  { id: 'c_kaye', name: 'Kaye Delos Santos', handle: 'kayeglow', loc: 'Pasig City', region: 'Metro Manila', niches: ['beauty'], pl: { tiktok: 210000, instagram: 40000 }, eng: 8.9, aud: 'Women 18–30, skincare beginners', bio: 'Skincare for humid weather and morena skin.' },
  { id: 'c_enzo', name: 'Enzo Garcia', handle: 'enzoathome', loc: 'Muntinlupa City', region: 'Metro Manila', niches: ['home'], pl: { instagram: 22000 }, eng: 7.9, aud: 'New homeowners 27–40', bio: 'Small-space condo makeovers on a budget.' },
  { id: 'c_rina', name: 'Rina Castillo', handle: 'rinamakes', loc: 'Baguio City', region: 'Luzon', niches: ['crafts', 'home'], pl: { instagram: 18000, tiktok: 44000 }, eng: 9.4, aud: 'Makers and gift buyers 20–45', bio: 'Handmade, slow living and the artisans behind them.' },
  { id: 'c_paolo', name: 'Paolo Lacson', handle: 'kuyafoodtrip', loc: 'Davao City', region: 'Mindanao', niches: ['food', 'travel'], pl: { facebook: 310000, tiktok: 90000 }, eng: 5.2, aud: 'Families across Mindanao and Visayas', bio: 'Food trips from Davao to Dumaguete.' },
  { id: 'c_sam', name: 'Sam Uy', handle: 'corgisam', loc: 'Taguig City', region: 'Metro Manila', niches: ['pets'], pl: { instagram: 65000, tiktok: 150000 }, eng: 10.1, aud: 'Pet parents 20–40', bio: 'Daily life with Mochi the corgi.' },
  { id: 'c_leah', name: 'Leah Fernandez', handle: 'leahlocal', loc: 'Iloilo City', region: 'Visayas', niches: ['fashion', 'crafts'], pl: { instagram: 27000 }, eng: 8.1, aud: 'Supporters of local brands 22–45', bio: 'Proudly local: weaves, crafts and slow fashion.' },
  { id: 'c_marco', name: 'Marco Diaz', handle: 'marcoontheroad', loc: 'Siargao', region: 'Mindanao', niches: ['travel', 'fitness'], pl: { instagram: 41000, youtube: 22000 }, eng: 6.3, aud: 'Surfers and backpackers 20–35', bio: 'Surf, van life and island workouts.' },
  // Nano and micro creators: the realistic partners for small local brands.
  { id: 'c_joy', name: 'Joy Manalo', handle: 'joycooksph', loc: 'Angeles, Pampanga', region: 'Luzon', niches: ['food'], pl: { instagram: 8000, tiktok: 14000 }, eng: 9.2, aud: 'Home cooks 25–45, Central Luzon', bio: 'Kapampangan home cooking: sisig, tocino, and whatever is in the palengke today.' },
  { id: 'c_ria', name: 'Ria Santos', handle: 'riasnacks', loc: 'Cebu City', region: 'Visayas', niches: ['food', 'travel'], pl: { tiktok: 12000, instagram: 4000 }, eng: 8.1, aud: 'Snack lovers and balikbayans 20–40, Visayas', bio: 'Pasalubong hauls, snack taste tests and Cebu food finds.' },
  { id: 'c_dan', name: 'Dan Ocampo', handle: 'danbrews', loc: 'Lipa, Batangas', region: 'Luzon', niches: ['food'], pl: { instagram: 6000, tiktok: 3000 }, eng: 10.5, aud: 'Coffee drinkers 22–40', bio: 'Home barista. Brewing Batangas coffee every morning, reviewing local roasters.' },
  { id: 'c_pia', name: 'Pia Robles', handle: 'piamoves', loc: 'Quezon City', region: 'Metro Manila', niches: ['fitness', 'beauty'], pl: { instagram: 15000, tiktok: 20000 }, eng: 7, aud: 'Women 22–35, Metro Manila', bio: 'Pilates and strength training for busy women. Honest gym and studio reviews.' },
  { id: 'c_ken', name: 'Ken Yap', handle: 'kentechph', loc: 'Pasig City', region: 'Metro Manila', niches: ['tech', 'home'], pl: { youtube: 9000, tiktok: 18000 }, eng: 6.5, aud: 'Homeowners and gadget fans 25–40', bio: 'Budget gadgets and smart home setups that actually lower your Meralco bill.' },
  { id: 'c_lia', name: 'Lia Torres', handle: 'liaglows', loc: 'Quezon City', region: 'Metro Manila', niches: ['beauty'], pl: { tiktok: 18000, instagram: 6000 }, eng: 9, aud: 'Women 18–28, skincare beginners', bio: 'Affordable local skincare routines for oily, humid-weather skin.' },
  { id: 'c_rico', name: 'Rico Bautista', handle: 'ricomakes', loc: 'Iloilo City', region: 'Visayas', niches: ['crafts', 'home'], pl: { instagram: 7000, youtube: 2500 }, eng: 11, aud: 'Makers and home decor buyers 25–45', bio: 'Woodworking and the artisans behind local crafts. Proudly handmade.' },
  { id: 'c_camille', name: 'Camille Go', handle: 'camillestyles', loc: 'Makati City', region: 'Metro Manila', niches: ['fashion'], pl: { instagram: 14000, tiktok: 6000 }, eng: 7.8, aud: 'Brides and women 25–40', bio: 'Modern Filipiniana and wedding guest styling with local designers.' },
  { id: 'c_jb', name: 'JB Reyes', handle: 'jbpetsph', loc: 'Taguig City', region: 'Metro Manila', niches: ['pets'], pl: { instagram: 10000, tiktok: 25000 }, eng: 12, aud: 'Pet parents 20–40', bio: 'Two dachshunds and a corgi who hate the rain.' },
  { id: 'c_tala', name: 'Tala Mercado', handle: 'talawanders', loc: 'El Nido, Palawan', region: 'Luzon', niches: ['travel'], pl: { instagram: 16000, youtube: 4000 }, eng: 8.4, aud: 'Couples 25–38', bio: 'Slow travel and island stays. Sunrise-to-sunset guides to Palawan.' },
  { id: 'c_ana', name: 'Ana Dizon', handle: 'anaipon', loc: 'Makati City', region: 'Metro Manila', niches: ['tech'], pl: { tiktok: 11000, youtube: 3000 }, eng: 7, aud: 'Young earners 21–30', bio: 'Money tips for first jobbers: budgeting apps, paluwagan and sweldo planning.' },
  { id: 'c_hannah', name: 'Hannah Tiu', handle: 'hannahtries', loc: 'Manila', region: 'Metro Manila', niches: ['beauty', 'food'], pl: { tiktok: 95000 }, eng: 7.5, aud: 'Gen Z shoppers 18–26', bio: 'I try viral local products so you don\'t have to.' },
];

// title, owner, cat, type, comp, min, max, commission, slots, deliverables, aov, photo hints
const LISTINGS = [
  ['cmp_barong', ME, 'fashion', 'Product', 'Abaca Barong', 'Campaign: Abaca Barong', 'Modern barong woven from Bicol abaca, with a limited NBA-inspired embroidery run. Looking for fashion creators who can style it for weddings, work and night-outs.', 'flat', 2500, 6000, 0, 4, [['Reel', 1, 'instagram'], ['Story set', 1, 'instagram']], 4200, ['Barong on model, front', 'Abaca weave close-up', 'Embroidery detail'], 'Millennials 25–40', 'active'],
  ['cmp_active', ME, 'fitness', 'Product', 'Sustainable Activewear', 'Campaign: Sustainable Activewear Collection', 'Eco-friendly activewear made from recycled ocean plastic. Seeking fitness and lifestyle creators for workout content and ambassadorship.', 'flat', 3000, 5000, 0, 3, [['Reel', 2, 'instagram'], ['TikTok video', 1, 'tiktok']], 1850, ['Leggings flat-lay', 'Training in the set'], 'Women 18–35, fitness enthusiasts', 'active'],
  ['cmp_foodbox', ME, 'food', 'Business', 'Local Artisan Food Box', 'Campaign: Local Artisan Food Box', 'Monthly subscription box of artisanal foods from local producers in your region. Looking for food creators to do unboxing and taste tests.', 'hybrid', 1500, 3000, 10, 5, [['TikTok video', 1, 'tiktok'], ['Story set', 1, 'instagram']], 1290, ['Open box, top view', 'Items laid out'], 'Foodies 25–50', 'recruiting'],
  ['cmp_sili', 'u_sili', 'food', 'Product', 'Sili Republic Hot Sauce', 'Looking for 5 Filipino food creators for our hot sauce brand', 'We make artisanal Filipino hot sauces using local chilis. Looking for food creators who can authentically pair our sauces with Filipino dishes.', 'flat', 800, 2000, 0, 5, [['TikTok video', 1, 'tiktok'], ['Story set', 1, 'instagram']], 380, ['Three bottles on banana leaf', 'Sauce on sisig'], 'Food lovers 18–40', 'active'],
  ['cmp_kahoy', 'u_kahoy', 'home', 'Business', 'Kahoy Studio Furniture', 'Home decor creators for our handmade furniture collection', 'Small-batch furniture studio looking for home decor creators to showcase our sustainable pieces. We use reclaimed Cebu hardwood.', 'commission', 0, 0, 15, 4, [['Reel', 1, 'instagram'], ['Feed post', 2, 'instagram']], 18500, ['Narra side table in living room', 'Workshop, craftsman sanding'], 'Homeowners 27–45', 'recruiting'],
  ['cmp_protina', 'u_protina', 'fitness', 'Product', 'Protina Organic Whey', 'Fitness creators for organic protein powder launch', 'Launching the Philippines\' first locally-sourced organic whey protein. Looking for genuine fitness creators who train and meal prep.', 'flat', 1000, 4000, 0, 8, [['Reel', 1, 'instagram'], ['TikTok video', 2, 'tiktok']], 1650, ['Tub with scoop', 'Post-workout shake'], 'Gym-goers 20–35', 'active'],
  ['cmp_sulit', 'u_sulit', 'tech', 'Product', 'Sulit Smart Outlet', 'Tech reviewers for our PH-made smart home device', 'We built a smart outlet + energy monitor designed for Philippine electrical standards. Looking for tech creators to review it honestly.', 'flat', 2000, 5000, 0, 4, [['YouTube video', 1, 'youtube'], ['TikTok video', 1, 'tiktok']], 1490, ['Outlet plugged in with app', 'Box and device'], 'Homeowners and gadget fans', 'recruiting'],
  ['cmp_ligaya', 'u_ligaya', 'fashion', 'Service', 'Atelier Ligaya Filipiniana', 'Style our modern Filipiniana: London-trained dressmaker, now in Makati', 'After 8 years in London ateliers I\'m home and building a client base. Looking for creators to wear a made-to-measure piece and share the fitting journey.', 'gifted', 0, 0, 0, 3, [['Reel', 1, 'instagram'], ['Story set', 2, 'instagram']], 9500, ['Terno sleeve detail', 'Fitting session', 'Finished gown'], 'Brides and events 25–45', 'recruiting'],
  ['cmp_marikina', 'u_ben', 'fashion', 'Product', 'Marikina Made Leather Shoes', 'Show off hand-stitched Marikina leather shoes', 'Our family has made shoes in Marikina since 1968. We want creators to show the craft behind each pair and style them day to day.', 'hybrid', 1500, 3500, 8, 4, [['Reel', 1, 'instagram'], ['TikTok video', 1, 'tiktok']], 3200, ['Brown oxfords on workbench', 'Hand-stitching close-up'], 'Men and women 25–45', 'active'],
  ['cmp_bulul', 'u_carvers', 'crafts', 'Product', 'Ifugao Bulul Carvings', 'Bring Ifugao woodcarving to city homes', 'Hand-carved bulul and narra decor from a 14-carver collective in Banaue. We need creators who can tell our story to urban buyers.', 'commission', 0, 0, 20, 5, [['Reel', 1, 'instagram'], ['Feed post', 1, 'instagram']], 2800, ['Pair of bulul on shelf', 'Carver at work in Banaue'], 'Home decor buyers 25–50', 'recruiting'],
  ['cmp_mangga', 'u_mangga', 'food', 'Product', 'Sugbo Dried Mangoes', 'Snack creators wanted for sulfite-free dried mangoes', 'Dried Carabao mangoes, no added sulfites. Looking for snack, travel and pasalubong creators.', 'flat', 800, 1800, 0, 6, [['TikTok video', 1, 'tiktok']], 290, ['Pouch with mango slices', 'Pasalubong box'], 'Snackers and balikbayans', 'active'],
  ['cmp_cloud9', 'u_cloud9', 'travel', 'Service', 'Cloud 9 Surf Stay', 'Stay-and-surf content for our Siargao homestay', 'Free 3-night stay + surf lessons in exchange for honest travel content. Best for creators who actually surf or want to learn.', 'gifted', 0, 0, 0, 2, [['Reel', 2, 'instagram'], ['YouTube video', 1, 'youtube']], 7500, ['Room with ocean view', 'Surf lesson at Cloud 9'], 'Travelers 22–38', 'recruiting'],
  ['cmp_kalamansi', 'u_kalamansi', 'beauty', 'Product', 'Kalamansi Glow Serum', 'Skincare creators for our kalamansi vitamin C serum', 'Vitamin C serum made with Mindoro kalamansi. We want real 14-day routines, not one-off hauls.', 'hybrid', 2000, 4500, 10, 6, [['TikTok video', 2, 'tiktok'], ['Story set', 1, 'instagram']], 690, ['Serum bottle with kalamansi', 'Texture swatch'], 'Women 18–30', 'active'],
  ['cmp_barako', 'u_barako', 'food', 'Product', 'Batangas Barako Coffee', 'Coffee lovers: help us bring barako back', 'Liberica beans from our family farm in Lipa. Looking for creators who brew at home to share their daily cup.', 'flat', 1000, 2500, 0, 5, [['Reel', 1, 'instagram'], ['Story set', 1, 'instagram']], 480, ['Bag of beans and kapeng barako', 'Pour-over brewing'], 'Coffee drinkers 22–45', 'active'],
  ['cmp_tinalak', 'u_tboli', 'crafts', 'Product', 'T\'boli Tinalak Textiles', 'Share the dreamweavers of Lake Sebu', 'Tinalak woven from abaca by T\'boli dreamweavers. We\'re looking for creators who respect the culture and can reach buyers in Manila and abroad.', 'hybrid', 2500, 5000, 12, 3, [['Reel', 1, 'instagram'], ['YouTube video', 1, 'youtube']], 5400, ['Tinalak cloth draped', 'Weaver at loom'], 'Culture and design lovers', 'recruiting'],
  ['cmp_sadie', 'u_sadie', 'pets', 'Product', 'Corgi Raincoats', 'Pet creators for our corgi raincoats (rainy season drop)', 'Waterproof raincoats with belly coverage for short-legged dogs. Looking for pet creators, especially corgi and dachshund parents.', 'flat', 600, 2000, 0, 6, [['Reel', 1, 'instagram'], ['TikTok video', 1, 'tiktok']], 850, ['Corgi in yellow raincoat', 'Belly flap detail'], 'Pet parents 20–40', 'active'],
  ['cmp_ipon', 'u_ipon', 'tech', 'Product', 'Ipon Budgeting App', 'Finance creators to demo a sweldo-cycle budgeting app', 'Ipon is built around kinsenas, paluwagan and padala. We pay per verified install on top of a base fee.', 'hybrid', 3000, 8000, 5, 4, [['TikTok video', 2, 'tiktok'], ['YouTube video', 1, 'youtube']], 0, ['App on phone, budget screen', 'Paluwagan tracker screen'], 'Young earners 21–35', 'recruiting'],
  ['cmp_pilates', 'u_pilates', 'fitness', 'Service', 'Core Studio QC', 'Try reformer pilates in Maginhawa, on us', 'Complimentary 4-class pack for creators who share their first-timer experience.', 'gifted', 0, 0, 0, 4, [['Reel', 1, 'instagram'], ['Story set', 2, 'instagram']], 3500, ['Reformer room', 'Class in session'], 'Women 22–40, QC', 'recruiting'],
  ['cmp_hurno', 'u_hurno', 'food', 'Business', 'Hurno Bakehouse', 'Ube cheese pandesal: wood-fired, Marikina', 'Neighborhood bakery ready for walk-in traffic from outside Marikina. Food creators, come visit at 6AM when it\'s fresh from the oven.', 'flat', 500, 1500, 0, 5, [['TikTok video', 1, 'tiktok']], 240, ['Tray of ube pandesal', 'Wood-fired oven'], 'East Metro families', 'active'],
  ['cmp_candle', 'u_candle', 'home', 'Product', 'Sampaguita Soy Candles', 'Cozy home creators for Filipino-scented soy candles', 'Scents of home: sampaguita, ilang-ilang, kape. Great for gifting season content.', 'commission', 0, 0, 18, 5, [['Feed post', 1, 'instagram'], ['Story set', 1, 'instagram']], 650, ['Three candles lit', 'Gift set'], 'Gift buyers 22–45', 'recruiting'],
  ['cmp_lodge', 'u_lodge', 'travel', 'Service', 'Bahay Kubo Eco Lodge', 'Solar-powered cottages near Nacpan Beach', 'Looking for travel creators to capture sunrise-to-sunset at our eco lodge. Stay + transfer covered, plus fee.', 'flat', 4000, 8000, 0, 2, [['Reel', 2, 'instagram'], ['YouTube video', 1, 'youtube']], 9800, ['Cottage at sunrise', 'Nacpan Beach'], 'Couples 25–40', 'recruiting'],
];

// [campaign, creator, status, pitch] — who's working on / applied to what
const APPS = [
  ['cmp_barong', 'c_aya', 'accepted', 'I style local designers weekly and my audience asks for wedding outfits all the time.'],
  ['cmp_barong', 'c_leah', 'accepted', 'Abaca is close to my heart. I\'d love to show the weave process too.'],
  ['cmp_barong', 'c_hannah', 'pending', 'Would love to do a "barong for Gen Z" styling video!'],
  ['cmp_barong', 'c_rina', 'pending', 'I can feature the weavers behind the fabric.'],
  ['cmp_active', 'c_migo', 'accepted', 'I train in activewear every day. Happy to do a 2-week wear test.'],
  ['cmp_active', 'c_marco', 'accepted', 'Surf + beach workouts with the set would fit my feed perfectly.'],
  ['cmp_active', 'c_kaye', 'declined', 'Interested in the leggings!'],
  ['cmp_foodbox', 'c_bianca', 'pending', 'Unboxing and a taste ranking of every item: my audience loves those.'],
  ['cmp_foodbox', 'c_paolo', 'pending', 'I can bring this to Mindanao families. Let\'s do a regional box!'],
  ['cmp_foodbox', 'c_trish', 'pending', 'Pasalubong angle? I travel for food every week.'],
  ['cmp_sili', ME, 'accepted', 'I cook Kapampangan food at home. Sisig + your sauce is a perfect pair.'],
  ['cmp_sili', 'c_bianca', 'accepted', 'Spice challenge series?'],
  ['cmp_sili', 'c_paolo', 'accepted', 'Hot sauce on Davao lechon, let\'s go.'],
  ['cmp_sili', 'c_hannah', 'pending', 'Viral spicy food tests are my thing.'],
  ['cmp_barako', ME, 'accepted', 'Barako is my daily cup. Happy to do a morning routine piece.'],
  ['cmp_barako', 'c_trish', 'accepted', 'Batangas road trip + farm visit content.'],
  ['cmp_kahoy', ME, 'pending', 'It matches my condo makeover series.'],
  ['cmp_kahoy', 'c_enzo', 'accepted', 'Small-space styling with one hero piece.'],
  ['cmp_kahoy', 'c_rina', 'pending', 'I\'d love to film at your workshop.'],
  ['cmp_sadie', ME, 'pending', 'I love corgis! My friend\'s corgi Sadie would model it.'],
  ['cmp_sadie', 'c_sam', 'accepted', 'Mochi hates rain. This is literally our life.'],
  ['cmp_protina', 'c_migo', 'accepted', 'I already use whey daily. Would switch for a 30-day test.'],
  ['cmp_protina', 'c_marco', 'pending', 'Island workouts + shakes.'],
  ['cmp_sulit', 'c_jomar', 'pending', 'Full teardown and 30-day Meralco bill comparison.'],
  ['cmp_marikina', 'c_aya', 'accepted', 'Shoes that go office to weekend, yes please.'],
  ['cmp_marikina', 'c_leah', 'pending', 'I\'d love to visit the workshop.'],
  ['cmp_bulul', 'c_rina', 'pending', 'This is exactly the kind of craft I cover.'],
  ['cmp_mangga', 'c_trish', 'accepted', 'Pasalubong guide for Cebu!'],
  ['cmp_mangga', 'c_hannah', 'accepted', 'Taste test vs. the big brands.'],
  ['cmp_kalamansi', 'c_kaye', 'accepted', '14-day routine on morena skin, with before/after.'],
  ['cmp_kalamansi', 'c_hannah', 'pending', 'Would try it for 2 weeks.'],
  ['cmp_hurno', 'c_bianca', 'accepted', '6AM pandesal run, count me in.'],
  ['cmp_cloud9', 'c_marco', 'pending', 'I surf Cloud 9 every week.'],
  ['cmp_lodge', 'c_trish', 'pending', 'Sunrise drone shots + honest review.'],
  ['cmp_tinalak', 'c_leah', 'pending', 'I\'ve written about tinalak before. Would love to go deeper.'],
];

export function buildSeed() {
  const r = rng(20260929);
  const now = Date.now();
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const between = (a, b) => a + r() * (b - a);
  let n = 0;
  const id = (p) => `${p}_${(++n).toString(36)}`;

  const users = [];
  users.push({
    id: ME, name: 'Sigmund Ty', email: 'sigmund@buzz.demo', color: '#1E2A4A', photo: null,
    location: 'Quezon City', region: 'Metro Manila', joinedAt: now - 140 * DAY,
    bio: 'Founder building local brands. Also creating content on food, coffee and small-business life.',
    business: { name: 'Ty Trading Co.', type: 'Consumer brands', category: 'fashion', website: '', shopUrl: 'https://shopee.ph/', tagline: 'Local products, done right.' },
    creator: { handle: 'sigmund.builds', niches: ['food', 'home'], platforms: [{ id: 'instagram', followers: 12400 }, { id: 'tiktok', followers: 28600 }], engagement: 6.9, rates: { reel: 1500, post: 900, story: 500 }, audience: 'Young professionals 22–35, Metro Manila' },
    primary: 'business',
  });
  OWNERS.forEach((o, i) => users.push({
    id: o.id, name: o.name, email: `${o.id.slice(2)}@buzz.demo`, color: AVATAR_COLORS[i % AVATAR_COLORS.length], photo: null,
    location: o.loc, region: o.region, joinedAt: now - between(30, 200) * DAY, bio: o.bio,
    business: { name: o.biz, type: o.type, category: o.cat, website: '', shopUrl: 'https://shopee.ph/', tagline: o.type },
    creator: null, primary: 'business',
  }));
  CREATORS.forEach((c, i) => {
    const total = Object.values(c.pl).reduce((a, b) => a + b, 0);
    // Typical PH rates: small creators charge a higher price per 1K followers.
    const k = total / 1000;
    const reel = Math.round((k < 50 ? k * 45 + 400 : k * 25 + 1400) / 100) * 100;
    users.push({
      id: c.id, name: c.name, email: `${c.handle}@buzz.demo`, color: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length], photo: null,
      location: c.loc, region: c.region, joinedAt: now - between(40, 300) * DAY, bio: c.bio,
      business: null,
      creator: {
        handle: c.handle, niches: c.niches, engagement: c.eng, audience: c.aud,
        platforms: Object.entries(c.pl).map(([pid, followers]) => ({ id: pid, followers })),
        rates: { reel, post: Math.round(reel * 0.6 / 50) * 50, story: Math.round(reel * 0.35 / 50) * 50 },
      },
      primary: 'creator',
    });
  });

  const campaigns = LISTINGS.map(([cid, ownerId, category, type, productName, title, description, comp, min, max, commission, slots, dels, aov, photoHints, audience, status]) => {
    const createdAt = now - between(status === 'recruiting' ? 3 : 35, status === 'recruiting' ? 25 : 110) * DAY;
    const owner = users.find((u) => u.id === ownerId);
    return {
      id: cid, ownerId, category, type, productName, title, description, summary: description.split('. ')[0] + '.',
      compensation: comp, budgetMin: min, budgetMax: max, commissionRate: commission, slots,
      deliverables: dels.map(([t, qty, platform]) => ({ type: t, qty, platform })),
      platforms: [...new Set(dels.map((d) => d[2]))],
      photos: SAMPLE_PHOTOS[cid] || [], photoHints, audience, region: owner.region,
      deadline: now + between(7, 40) * DAY, contentRights: pick(['30 days', '60 days', '90 days']),
      shopUrl: 'https://shopee.ph/', aov, status, published: true, createdAt, views: Math.round(between(120, 2400)),
      promo: productName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6),
      tags: TAGS[cid] || [],
    };
  });
  const campaignById = Object.fromEntries(campaigns.map((c) => [c.id, c]));

  const applications = [];
  const links = [];
  const events = [];
  const deliverables = [];

  APPS.forEach(([cid, crid, status, pitch]) => {
    const c = campaignById[cid];
    const creator = users.find((u) => u.id === crid);
    const createdAt = c.createdAt + between(1, 6) * DAY;
    const baseRate = creator.creator.rates.reel;
    const rate = c.compensation === 'flat' || c.compensation === 'hybrid'
      ? Math.min(c.budgetMax, Math.max(c.budgetMin, Math.round(baseRate / 100) * 100))
      : 0;
    const app = { id: id('app'), campaignId: cid, creatorId: crid, pitch, rate, status, source: r() < 0.2 ? 'invite' : 'apply', createdAt, decidedAt: status === 'pending' ? null : createdAt + between(0.5, 3) * DAY };
    applications.push(app);
    if (status !== 'accepted') return;

    // Tracking link + promo code for every accepted creator.
    const code = `${c.promo}-${creator.creator.handle.slice(0, 5).toUpperCase()}`;
    const link = { id: id('lnk'), campaignId: cid, creatorId: crid, code, createdAt: app.decidedAt };
    links.push(link);

    // Deliverables expand the campaign's template.
    const followers = creator.creator.platforms.reduce((a, p) => a + p.followers, 0);
    let slot = 0;
    c.deliverables.forEach((d) => {
      for (let k = 0; k < d.qty; k++) {
        slot += 1;
        const dueAt = app.decidedAt + (7 + slot * 9) * DAY;
        const fee = c.compensation === 'commission' || c.compensation === 'gifted'
          ? 0 : Math.round(rate / c.deliverables.reduce((a, x) => a + x.qty, 0) / 50) * 50;
        const del = {
          id: id('del'), campaignId: cid, creatorId: crid, type: d.type, platform: d.platform,
          title: `${d.type} for ${c.productName}`, dueAt, fee, status: 'todo', submittedAt: null, approvedAt: null, paidAt: null, contentUrl: '', stats: null, note: '',
        };
        if (dueAt < now - 2 * DAY || (dueAt < now + 3 * DAY && r() < 0.5)) {
          const submittedAt = Math.min(now - 0.3 * DAY, dueAt - between(-1, 2) * DAY);
          const reach = Math.round(followers * between(0.25, 0.9));
          const likes = Math.round(reach * creator.creator.engagement / 100 * between(0.7, 0.9));
          del.status = r() < 0.85 ? 'approved' : 'submitted';
          del.submittedAt = submittedAt;
          del.contentUrl = `https://www.${d.platform}.com/p/${code.toLowerCase()}-${slot}`;
          del.stats = { reach, likes, comments: Math.round(likes * 0.06), shares: Math.round(likes * 0.04), saves: Math.round(likes * 0.05) };
          if (del.status === 'approved') {
            del.approvedAt = submittedAt + between(0.3, 2) * DAY;
            if (fee && r() < 0.75) del.paidAt = del.approvedAt + between(1, 5) * DAY;
          }
        }
        deliverables.push(del);
      }
    });

    // Clicks and sales flow in after the first piece of content goes live.
    const first = deliverables.filter((d) => d.creatorId === crid && d.campaignId === cid && d.submittedAt).map((d) => d.submittedAt).sort()[0];
    if (!first || !c.aov) return;
    const dailyClicks = followers / 1000 * between(0.3, 0.6);
    for (let t = first; t < now; t += DAY) {
      const age = (t - first) / DAY;
      const decay = Math.max(0.15, Math.exp(-age / 25));
      const clicks = Math.round(dailyClicks * decay * between(0.5, 1.5));
      if (clicks) events.push({ t: 'click', linkId: link.id, ts: t + r() * DAY * 0.95, n: clicks });
      const conv = between(0.006, 0.014);
      const sales = Math.floor(clicks * conv + r());
      for (let k = 0; k < sales; k++) events.push({ t: 'sale', linkId: link.id, ts: t + r() * DAY * 0.95, amount: Math.round(c.aov * between(0.8, 1.3) / 10) * 10, source: r() < 0.6 ? 'link' : 'code' });
    }
  });
  events.sort((a, b) => a.ts - b.ts);
  events.forEach((e) => { if (e.ts > now) e.ts = now - 60000; });

  // Campaigns with any content live are "active"; older fully-delivered ones become "tracking".
  const reviews = [
    { id: id('rev'), campaignId: 'cmp_sili', fromId: 'u_sili', toId: 'c_bianca', rating: 5, text: 'Delivered early and the spice challenge drove real orders.', createdAt: now - 12 * DAY },
    { id: id('rev'), campaignId: 'cmp_sili', fromId: 'c_bianca', toId: 'u_sili', rating: 5, text: 'Clear brief, paid on time. Would work with again.', createdAt: now - 11 * DAY },
    { id: id('rev'), campaignId: 'cmp_mangga', fromId: 'u_mangga', toId: 'c_trish', rating: 5, text: 'Her Cebu pasalubong guide still sends us orders.', createdAt: now - 20 * DAY },
    { id: id('rev'), campaignId: 'cmp_protina', fromId: 'u_protina', toId: 'c_migo', rating: 4, text: 'Great content. One revision needed on claims wording.', createdAt: now - 16 * DAY },
    { id: id('rev'), campaignId: 'cmp_kalamansi', fromId: 'u_kalamansi', toId: 'c_kaye', rating: 5, text: 'The 14-day routine was the best-converting content we\'ve run.', createdAt: now - 6 * DAY },
    { id: id('rev'), campaignId: 'cmp_sili', fromId: 'u_sili', toId: ME, rating: 5, text: 'Authentic cooking content. The sisig pairing sold out our 3-pack.', createdAt: now - 9 * DAY },
    { id: id('rev'), campaignId: 'cmp_barong', fromId: 'c_aya', toId: ME, rating: 5, text: 'Organized founder, fast approvals and clear payment dates.', createdAt: now - 4 * DAY },
    { id: id('rev'), campaignId: 'cmp_sadie', fromId: 'u_sadie', toId: 'c_sam', rating: 5, text: 'Mochi is a star. Our raincoats sold out in a week.', createdAt: now - 3 * DAY },
  ];

  const post = (authorId, topic, title, body, daysAgo, extra = {}) => ({
    id: id('post'), authorId, anonymous: false, topic, campaignId: null, title, body, photos: [],
    likes: [], claps: [], ideas: [], interested: [], followers: [], comments: [], createdAt: now - daysAgo * DAY, ...extra,
  });
  const cm = (authorId, body, hoursAgo) => ({ id: id('cmt'), authorId, body, createdAt: now - hoursAgo * 3600000 });
  const posts = [
    post('u_sili', 'wins', 'Sold out our 3-pack in 9 days from 3 creators', 'We gave each creator their own promo code. SILI-BIANC alone drove 40% of orders. Lesson: food creators who actually cook convert way better than pure reviewers.', 2, { campaignId: 'cmp_sili', photos: [SAMPLE_PHOTOS.cmp_sili[0]], likes: ['c_bianca', 'u_mangga', 'u_barako'], claps: ['c_paolo', ME, 'u_hurno', 'u_protina', 'c_hannah'], ideas: ['u_kalamansi'], comments: [cm('u_barako', 'Did you cap the discount per code? Worried about margin.', 30), cm('u_sili', '10% off, capped at 200 uses per code. Margin held.', 28)] }),
    post('u_ligaya', 'ideas', 'Would you pay for made-to-measure Filipiniana online?', 'I\'m testing remote fittings: you send 12 measurements + a video call, I ship the gown with one free alteration. Is this something you\'d trust? What would make you say yes?', 1, { photos: [SAMPLE_PHOTOS.cmp_ligaya[0]], likes: ['c_aya', 'c_leah'], interested: ['c_aya', 'c_leah', 'u_ben'], comments: [cm('c_aya', 'A fitting video from a real client would make me trust it instantly.', 10)] }),
    post('u_carvers', 'help', 'How do we ship fragile carvings from Banaue to Manila?', 'Our pieces keep arriving chipped. Couriers don\'t reach us daily. Anyone solved crating or consolidation for provincial crafts?', 3, { likes: ['c_rina', 'u_tboli'], comments: [cm('u_kahoy', 'We use foam corner guards + double-wall boxes. DM me our supplier.', 60), cm('u_tboli', 'We consolidate in Koronadal once a week. Same problem!', 50)] }),
    post('u_mangga', 'collab', 'Pasalubong bundle: looking for 2 more Visayas brands', 'We want a "Taste of Cebu" box for balikbayans: dried mangoes + 2 other brands. Split costs 3 ways, one creator campaign for all. Candles or coffee welcome!', 4, { likes: ['u_candle', 'u_barako', 'c_trish'], interested: ['u_candle', 'u_barako'] }),
    post(ME, 'build', 'Abaca Barong: first 2 creators live, here are the numbers', 'Aya\'s reel reached 40K+ with a 5% engagement rate. Clicks are strong but the conversion is low: people want to see it in person. Testing a fitting pop-up next.', 1, { campaignId: 'cmp_barong', photos: SAMPLE_PHOTOS.cmp_barong.slice(0, 2), likes: ['u_ligaya', 'c_aya', 'u_ben'], comments: [cm('u_ligaya', 'Happy to lend my atelier for a fitting weekend!', 5)] }),
    post('c_kaye', 'help', 'Brands: please send the brief BEFORE the product', 'Creator side here. Three times this month I got product with no brief, no deadline, no usage rights. Put it in writing on Buzz so we both know what we agreed to.', 5, { likes: ['c_hannah', 'c_bianca'], ideas: ['c_migo', 'c_sam', 'u_kalamansi', 'u_sili'] }),
    post('u_ipon', 'ideas', 'Paluwagan tracker: useful or gimmick?', 'We\'re deciding whether to build group savings (paluwagan) into Ipon. Would you use it? What would stop you?', 6, { likes: ['c_jomar'], interested: ['c_jomar', 'c_hannah'] }),
    post('c_rina', 'collab', 'Baguio makers: shared shoot day in October', 'I\'m organizing a one-day shoot for 5 craft brands. You bring product, I bring 2 photographers. ₱2,500 per brand covers everything.', 7, { likes: ['u_carvers', 'u_candle', 'u_tboli'], interested: ['u_carvers', 'u_tboli'] }),
    post('u_protina', 'wins', 'First 1,000 tubs sold, 62% from creator codes', 'Migo\'s meal prep reels are our best channel by far. Cost per order: ₱118 vs ₱310 on ads.', 9, { campaignId: 'cmp_protina', photos: [SAMPLE_PHOTOS.cmp_protina[0]], likes: ['c_migo', 'u_pilates'], claps: [ME, 'u_sili', 'c_marco', 'u_kahoy'] }),
    post('u_hurno', 'build', 'Switching to pre-orders for weekend pandesal', 'After Bianca\'s video we had lines at 5AM and ran out by 7. Now testing pre-orders via Buzz messages. Anyone done this well?', 10, { photos: SAMPLE_PHOTOS.cmp_hurno, likes: ['c_bianca', 'u_sili'] }),
  ];

  const collabs = [
    { id: id('col'), hostId: 'u_mangga', kind: 'bundle', title: 'Taste of Cebu pasalubong box', description: 'Split a 3-brand box for balikbayans. One creator campaign, costs split 3 ways.', category: 'food', slots: 3, members: ['u_mangga', 'u_candle'], deadline: now + 12 * DAY, createdAt: now - 4 * DAY },
    { id: id('col'), hostId: 'c_rina', kind: 'shoot', title: 'Baguio makers shoot day', description: '5 craft brands, 2 photographers, 1 day. ₱2,500 per brand.', category: 'crafts', slots: 5, members: ['c_rina', 'u_carvers', 'u_tboli'], deadline: now + 18 * DAY, createdAt: now - 7 * DAY },
    { id: id('col'), hostId: 'u_sadie', kind: 'giveaway', title: 'Rainy season pet giveaway', description: 'Pet brands pool one prize bundle; 3 pet creators run it together.', category: 'pets', slots: 4, members: ['u_sadie', 'c_sam'], deadline: now + 9 * DAY, createdAt: now - 2 * DAY },
    { id: id('col'), hostId: 'u_kalamansi', kind: 'popup', title: 'Local beauty booth at a QC weekend bazaar', description: 'Share a 3x3m booth and staff. ₱4,000 each for 3 brands.', category: 'beauty', slots: 3, members: ['u_kalamansi'], deadline: now + 21 * DAY, createdAt: now - 1 * DAY },
    { id: id('col'), hostId: 'c_migo', kind: 'squad', title: 'Fitness creator squad for local brands', description: '4 fitness creators pitching together as one package to local brands. Bigger reach, one brief.', category: 'fitness', slots: 4, members: ['c_migo', 'c_marco'], deadline: now + 30 * DAY, createdAt: now - 5 * DAY },
  ];

  const thread = (a, b, campaignId, msgs) => ({
    id: id('thr'), participants: [a, b], campaignId,
    messages: msgs.map(([from, body, hoursAgo]) => ({ id: id('msg'), from, body, ts: now - hoursAgo * 3600000 })),
    lastRead: { [a]: now - 1000 * 3600000, [b]: now },
  });
  const threads = [
    thread(ME, 'c_aya', 'cmp_barong', [['c_aya', 'Hi! Received the barong, the weave is gorgeous. Shooting this weekend.', 50], [ME, 'Amazing. Please tag us and use code ABACA-AYAST in the caption.', 48], ['c_aya', 'Reel is up! Sent the link in Deliverables.', 3]]),
    thread(ME, 'u_sili', 'cmp_sili', [['u_sili', 'Your sisig video is our top performer this week!', 30], [ME, 'Glad it worked. Want a second piece with the extra hot variant?', 26], ['u_sili', 'Yes! Adding a deliverable now.', 2]]),
    thread(ME, 'c_bianca', 'cmp_foodbox', [['c_bianca', 'Hi Sigmund, I applied to the food box campaign. Happy to share past unboxing stats.', 20]]),
    thread(ME, 'u_sadie', 'cmp_sadie', [[ME, 'Hi Nina! Applied for the corgi raincoat drop. Our friend\'s corgi is ready to model.', 70], ['u_sadie', 'Love it. Reviewing applications this week!', 60]]),
  ];

  const notifications = [
    ['Aya Lim submitted a Reel for Abaca Barong', '/workspace/deliverables', 3, false],
    ['Bianca Reyes applied to Local Artisan Food Box', '/workspace/collaborations', 20, false],
    ['Sili Republic added a new deliverable for you', '/workspace/deliverables', 2, false],
    ['Paolo Lacson applied to Local Artisan Food Box', '/workspace/collaborations', 28, true],
    ['New sale via code SILI-SIGMU (₱420)', '/workspace/analytics', 36, true],
    ['Payment of ₱1,000 received from Batangas Barako Roasters', '/workspace/analytics', 72, true],
    ['Ligaya Santos commented on your update', '/community', 5, false],
  ].map(([text, link, hoursAgo, read]) => ({ id: id('ntf'), userId: ME, text, link, ts: now - hoursAgo * 3600000, read }));

  const saved = [
    { id: id('sav'), userId: ME, kind: 'campaign', refId: 'cmp_bulul', ts: now - 2 * DAY },
    { id: id('sav'), userId: ME, kind: 'creator', refId: 'c_bianca', ts: now - 1 * DAY },
  ];

  const profileViews = [];
  for (let d = 0; d < 90; d++) {
    const count = Math.round(between(2, 14));
    for (let k = 0; k < count; k++) profileViews.push({ userId: ME, ts: now - d * DAY - r() * DAY });
  }
  // Separate generator so adding these doesn't shift the rest of the sample data.
  let s2 = 97;
  const r2 = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
  const brandIds = users.filter((u) => u.business && u.id !== ME).map((u) => u.id);
  const pickBrand = () => brandIds[Math.floor(r2() * brandIds.length)];
  profileViews.forEach((v) => { v.viewerId = r2() < 0.3 ? pickBrand() : null; });
  users.filter((u) => u.creator && u.id !== ME).forEach((u) => {
    const n = 3 + Math.floor(r2() * 10);
    for (let k = 0; k < n; k++) profileViews.push({ userId: u.id, viewerId: r2() < 0.6 ? pickBrand() : null, ts: now - r2() * 30 * DAY });
  });
  // ---------- grow for free: swaps, Launch Pad, customer creators, group deals ----------
  const biz = (uid2) => users.find((u) => u.id === uid2).business;
  Object.assign(biz(ME), { tiktok: 'tytrading.ph', instagram: 'tytrading.ph', tiktokShopUrl: 'https://shop.tiktok.com/', facebookUrl: 'https://facebook.com/', tagline: 'Local products, done right. Made in the Philippines.' });
  Object.assign(biz('u_sili'), { tiktok: 'silirepublic', instagram: 'silirepublic', tiktokShopUrl: 'https://shop.tiktok.com/', tagline: 'Small-batch hot sauce from Pampanga siling labuyo.' });
  Object.assign(biz('u_mangga'), { tiktok: 'manggacebu', tagline: 'Dried mango and pasalubong, straight from Cebu.' });
  Object.assign(biz('u_kalamansi'), { tiktok: 'kalamansiglow', instagram: 'kalamansiglow', lazadaUrl: 'https://lazada.com.ph/' });
  const thisWeek = weekStart(now);
  const lastWeek = thisWeek - 7 * DAY;
  const creatorIds = users.filter((u) => u.creator && u.id !== ME).map((u) => u.id);
  const voters = (n) => creatorIds.filter(() => r2() < n / creatorIds.length).concat(r2() < 0.5 ? ['u_hurno'] : []);
  const launches = [
    ['u_sili', thisWeek, 'cmp_sili', 'Sili Republic Ghost Pepper Edition', 'Our hottest batch yet: labuyo + ghost pepper, 150ml.', 320, 9],
    ['u_hurno', thisWeek, 'cmp_hurno', 'Ube cheese pandesal box', 'Freshly baked, delivered in QC and Manila by 9am.', 280, 7],
    ['u_kalamansi', thisWeek, 'cmp_kalamansi', 'Kalamansi Glow Night Serum', 'Vitamin C serum for oily skin, made in Mindoro.', 549, 6],
    ['u_carvers', thisWeek, 'cmp_bulul', 'Mini bulul desk guardians', 'Hand-carved 4-inch bulul, each one signed by the carver.', 650, 4],
    ['u_sadie', thisWeek, 'cmp_sadie', 'Corgi raincoat, rainy season drop', 'Waterproof, reflective, sized for short legs.', 690, 3],
    ['u_barako', thisWeek, 'cmp_barako', 'Barako cold brew concentrate', 'Batangas barako, 1L makes 8 glasses.', 420, 2],
    ['u_mangga', lastWeek, 'cmp_mangga', 'Mango-tamarind bars', 'Chewy, sour-sweet, no preservatives.', 180, 11],
    ['u_ben', lastWeek, 'cmp_marikina', 'Marikina loafers, black', 'Hand-lasted leather loafers, resoleable.', 3200, 8],
    ['u_kahoy', lastWeek, 'cmp_kahoy', 'Reclaimed narra side table', 'Small-space table from old Cebu houses.', 4500, 5],
  ].map(([brandId, week, campaignId, title, pitch, price, v], i) => ({
    id: id('lch'), brandId, week, campaignId, title, pitch, price, category: users.find((u) => u.id === brandId).business.category, photo: '', shopUrl: '',
    votes: voters(v), interested: i < 3 ? creatorIds.filter(() => r2() < 0.12) : [], createdAt: week + (0.2 + r2()) * DAY,
  }));
  const swaps = [
    { id: id('swp'), fromId: 'u_kalamansi', toId: ME, give: 'Instagram story shout-out', ask: 'Instagram story shout-out', note: 'Our buyers are women 22–35 in Metro Manila who shop local, same as yours I think!', status: 'proposed', fromUrl: '', toUrl: '', createdAt: now - 5 * 3600000 },
    { id: id('swp'), fromId: ME, toId: 'u_carvers', give: 'Feed post or reel', ask: 'Product in each other\'s orders (flyer or sample)', note: '', status: 'active', fromUrl: 'https://www.instagram.com/p/sample1', toUrl: '', createdAt: now - 4 * DAY, decidedAt: now - 3.5 * DAY },
    { id: id('swp'), fromId: 'u_sili', toId: 'u_barako', give: 'TikTok video', ask: 'TikTok video', note: '', status: 'done', fromUrl: 'https://www.tiktok.com/@silirepublic/video/1', toUrl: 'https://www.tiktok.com/@barako/video/2', createdAt: now - 20 * DAY, doneAt: now - 12 * DAY },
  ];
  const ugcPrograms = [
    { id: id('ugp'), brandId: ME, code: 'tytrading01', credit: 150, ask: 'Post a photo or video wearing or using any Ty Trading product. Tag @tytrading.ph.', minFollowers: 0, active: true, createdAt: now - 30 * DAY },
    { id: id('ugp'), brandId: 'u_sili', code: 'silirepublic7', credit: 100, ask: 'Show your Sili Republic on your favorite ulam. Tag @silirepublic.', minFollowers: 0, active: true, createdAt: now - 45 * DAY },
  ];
  const ugcPosts = [
    { id: id('ugc'), programId: ugcPrograms[0].id, brandId: ME, userId: 'c_leah', url: 'https://www.instagram.com/p/leah-ugc', platform: 'instagram', status: 'pending', voucher: '', createdAt: now - 20 * 3600000 },
    { id: id('ugc'), programId: ugcPrograms[0].id, brandId: ME, userId: 'u_hurno', url: 'https://www.tiktok.com/@hurno/video/3', platform: 'tiktok', status: 'pending', voucher: '', createdAt: now - 6 * 3600000 },
    { id: id('ugc'), programId: ugcPrograms[0].id, brandId: ME, userId: 'c_camille', url: 'https://www.instagram.com/p/camille-ugc', platform: 'instagram', status: 'approved', voucher: 'TYTRAD-K7Q2', credit: 150, createdAt: now - 9 * DAY, reviewedAt: now - 8 * DAY },
  ];
  const groupDeals = [
    { id: id('grp'), leadId: 'u_mangga', title: 'Taste of Cebu pasalubong box', brief: 'One TikTok unboxing of a 3-brand pasalubong box for balikbayans. Each brand gets a clear mention and a link in the caption.', category: 'food', platform: 'tiktok', creatorId: 'c_trish', fee: 6000, slots: 3, members: [{ brandId: 'u_mangga', product: 'Dried mango bars', share: 2000, fee: 100, paidAt: now - 2 * DAY }, { brandId: 'u_barako', product: 'Barako coffee', share: 2000, fee: 100, paidAt: now - DAY }], status: 'forming', postUrl: '', confirmed: [], createdAt: now - 2 * DAY },
    { id: id('grp'), leadId: 'u_kalamansi', title: 'Self-care Sunday bundle', brief: 'A calm Sunday routine reel featuring a serum, a candle and a pilates mat flow.', category: 'beauty', platform: 'instagram', creatorId: 'c_lia', fee: 4500, slots: 3, members: [{ brandId: 'u_kalamansi', product: 'Night serum', share: 1500, fee: 75, paidAt: now - 3 * DAY }, { brandId: 'u_candle', product: 'Soy candle', share: 1500, fee: 75, paidAt: now - 3 * DAY }, { brandId: 'u_pilates', product: 'Intro class pass', share: 1500, fee: 75, paidAt: now - 2 * DAY }], status: 'invited', postUrl: '', confirmed: [], createdAt: now - 3 * DAY },
  ];

  applications.forEach((a) => {
    if (a.source !== 'apply') return;
    if (a.decidedAt) a.seenAt = a.createdAt + (a.decidedAt - a.createdAt) * 0.5;
    else if (r2() < 0.5) a.seenAt = Math.min(now - 3600000, a.createdAt + (2 + r2() * 20) * 3600000);
  });

  // Accounts: demo password, verification badges, one admin (you).
  const VERIFIED = new Set([ME, 'u_sili', 'u_protina', 'u_kalamansi', 'u_mangga', 'c_bianca', 'c_kaye', 'c_migo', 'c_aya', 'c_sam']);
  users.forEach((u) => {
    u.pw = hashPw('buzz1234');
    u.verified = VERIFIED.has(u.id);
    u.suspended = false;
    u.admin = u.id === ME;
    u.settings = { notif: { apps: true, deliverables: true, sales: true, community: false, email: true }, privacy: { public: true, showEarnings: false, showRates: true } };
  });

  // Escrow: brands fund fees up front, Buzz releases them when content is approved.
  const transactions = [];
  const tx = (userId, type, amount, ts, ref, note) => transactions.push({ id: id('tx'), userId, type, amount, ts, ref, note });
  deliverables.forEach((x) => {
    const c = campaignById[x.campaignId];
    if (!x.fee) { x.escrow = 'none'; return; }
    if (x.paidAt) {
      x.escrow = 'released';
      tx(c.ownerId, 'fund', -Math.round(x.fee * (1 + SERVICE_FEE)), x.approvedAt - 3 * DAY, x.id, `Escrow for ${x.title}`);
      tx(x.creatorId, 'release', x.fee, x.paidAt, x.id, `Payment released: ${x.title}`);
    } else if (x.status !== 'approved' && r() < 0.7) {
      x.escrow = 'held';
      tx(c.ownerId, 'fund', -Math.round(x.fee * (1 + SERVICE_FEE)), Math.min(now - DAY, x.dueAt - 10 * DAY), x.id, `Escrow for ${x.title}`);
    } else {
      x.escrow = 'unfunded';
    }
  });
  // Creators have withdrawn part of what they earned.
  users.filter((u) => u.creator).forEach((u) => {
    const earned = transactions.filter((t) => t.userId === u.id && t.type === 'release').reduce((a, t) => a + t.amount, 0);
    if (earned > 1500) tx(u.id, 'payout', -Math.round(earned * 0.6 / 100) * 100, now - between(2, 10) * DAY, null, 'Withdrawal to GCash •••• 4821');
  });

  const reports = [
    { id: id('rep'), kind: 'post', refId: posts[6].id, reporterId: 'c_kaye', reason: 'Spam or self-promotion', note: 'Looks like an ad, not a question.', ts: now - 20 * 3600000, status: 'open' },
    { id: id('rep'), kind: 'campaign', refId: 'cmp_ipon', reporterId: 'c_hannah', reason: 'Misleading pay or terms', note: 'Pay per install is not explained.', ts: now - 2 * DAY, status: 'open' },
    { id: id('rep'), kind: 'user', refId: 'c_marco', reporterId: 'u_cloud9', reason: 'Fake followers', note: 'Engagement looks bought.', ts: now - 5 * DAY, status: 'dismissed' },
  ];

  // ---- trust, contracts, shipping, support (v7) ----
  const firstName = (u) => u.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  users.forEach((u, i) => {
    u.plan = ['u_me', 'u_sili', 'u_protina'].includes(u.id) ? 'pro' : 'free';
    u.refCode = `${firstName(u)}${(i * 37 + 11) % 97}`.toUpperCase();
    u.approved = true;
    if (u.business) u.business.verified = VERIFIED.has(u.id);
    if (u.creator) u.creator.statsVerified = VERIFIED.has(u.id);
    if (u.creator) u.shipping = { name: u.name, phone: `0917 ${String(1000000 + i * 7919).slice(0, 3)} ${String(4000 + i * 13).slice(0, 4)}`, address: `${10 + i} Mabini St.`, city: u.location };
  });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const contracts = [];
  const shipments = [];
  applications.filter((a) => a.status === 'accepted').forEach((a) => {
    const c = campaignById[a.campaignId];
    const t = a.decidedAt;
    contracts.push({
      id: id('ctr'), applicationId: a.id, campaignId: c.id, brandId: c.ownerId, creatorId: a.creatorId, createdAt: t,
      terms: contractTerms(c, a, byId[c.ownerId], byId[a.creatorId]),
      brandSignedAt: t + 3600000, brandSignName: byId[c.ownerId].name,
      creatorSignedAt: t + 7200000, creatorSignName: byId[a.creatorId].name,
    });
    if (c.type === 'Product' && c.compensation !== 'commission') {
      shipments.push({ id: id('shp'), campaignId: c.id, creatorId: a.creatorId, courier: 'J&T Express', tracking: `JT${String(Math.floor(r() * 1e10)).padStart(10, '0')}`, status: 'delivered', shippedAt: t + 1 * DAY, deliveredAt: t + 3 * DAY });
    }
  });
  // Barong campaign asks for drafts before posting.
  campaigns.forEach((c) => { c.requireDraft = c.id === 'cmp_barong' || c.id === 'cmp_kalamansi'; c.needsShipping = c.type === 'Product' && c.compensation !== 'commission'; });

  const verifications = [
    { id: id('ver'), userId: 'u_candle', kind: 'business', docType: 'DTI Business Name Registration', docName: 'DTI-Sampaguita-Candle-Co.pdf', docNumber: '3381204', note: '', status: 'pending', createdAt: now - 1 * DAY },
    { id: id('ver'), userId: 'c_joy', kind: 'creator', docType: 'Instagram and TikTok insights', docName: 'insights-sept.png', links: ['https://www.instagram.com/joycooksph', 'https://www.tiktok.com/@joycooksph'], note: 'Screenshots of the last 30 days of insights.', status: 'pending', createdAt: now - 0.5 * DAY },
  ];
  const disputes = [];
  const concierge = [
    { id: id('cnc'), campaignId: 'cmp_kalamansi', brandId: 'u_kalamansi', note: 'Looking for 2 more creators with oily-skin audiences. Budget is firm.', status: 'open', picks: [], createdAt: now - 10 * 3600000 },
  ];
  const tickets = [
    { id: id('tkt'), userId: 'u_hurno', topic: 'Payments', subject: 'Can I pay escrow with a BPI debit card?', body: 'I don\'t use GCash. Does Buzz accept debit cards for escrow?', status: 'open', replies: [], createdAt: now - 6 * 3600000 },
  ];

  return {
    version: 9,
    flags: { dailyPicks: 'auto', requireCreatorApproval: false, monetization: {} },
    session: { userId: ME, mode: 'business' },
    users, campaigns, applications, links, events, deliverables, reviews, posts, collabs, threads, notifications, saved, profileViews,
    transactions, reports, emails: [], resets: [],
    contracts, disputes, verifications, shipments, concierge, tickets, saleImports: [],
    revenue: transactions.filter((t) => t.type === 'fund').map((t) => ({ id: id('rev'), stream: 'transactionFee', amount: Math.round((-t.amount / (1 + SERVICE_FEE)) * SERVICE_FEE), payer: t.userId, note: 'Service fee', ref: t.ref, ts: t.ts })),
    orders: [], savedSearches: [], meetups: sampleEvents(now), launches, swaps, ugcPrograms, ugcPosts, groupDeals, eventTickets: [],
  };
}
