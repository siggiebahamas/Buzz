# Buzz

Where creators & founders grow together. Buzz connects Filipino entrepreneurs with influencers so a good product never launches to an empty room.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## What's inside

- **Discover**: hero, how it works, trending opportunities (photo-first cards), top creators, recent wins.
- **Opportunities**: two views. *I'm an Influencer* browses product listings with an explainable Match %; *I'm an Entrepreneur* browses creators ranked against one of your campaigns. Filters: budget, collaboration type, platform, location, sort, categories.
- **Opportunity detail**: photo gallery, brief, deliverables, budget, match breakdown, apply, save, message the brand.
- **Creator / brand profiles**: platforms, rate card, audience, sales driven on Buzz, past content, reviews, invite to campaign.
- **Community**: discussions by topic, likes, "Interested", replies, follow a project's updates, anonymous posts, and a **Collab Board** (bundles, joint giveaways, shared shoots, bazaar booths, creator squads).
- **My Workspace**: Overview, My Profile (creator and/or business), Campaigns (+ campaign manager with Auto-Match), Collaborations, Deliverables board, Analytics, Messages, Saved, Settings.
- **Tracking**: every accepted creator gets a promo code and a tracking link (`#/go/CODE`) that records the click and forwards to the shop. Brands log promo-code sales in Analytics.

## Trust, money and operations

- **Agreements**: every accepted collaboration creates an agreement (work, pay, disclosure, content rights, disputes) that both sides e-sign.
- **Escrow & disputes**: brands fund fees up front; approval releases them; a dispute freezes the money until Buzz decides (pay, refund or split).
- **Verification**: brands upload a DTI/SEC/BIR/business permit; creators submit insights screenshots. Admin reviews; matching trusts verified stats more.
- **Drafts & samples**: optional draft approval before posting; sample shipping with courier and tracking.
- **Budget helper & brief score** in the listing form; **rate guide** for creators.
- **Sales import**: CSV exports from Shopee, Lazada, TikTok Shop or Shopify are matched to creator promo codes.
- **Hand-picked matching**, **curated creator approval**, **referrals**, **support tickets**, **Free/Pro plans**.
- **Admin > Health**: listings with 3+ applicants in 72h, time to first applicant, money through escrow, repeat brands, and whether fit scores predict acceptance.
- Real URLs, share menus, link previews, installable app with offline support, data export and account closing.

## Tests

```bash
npm run test:match   # 31 ranking checks for the matching engine
npm run test:flows   # 22 end-to-end checks of the collaboration lifecycle
```

Both run before every deploy.

## Data

This build stores everything in the browser (`localStorage`) and ships with sample brands, creators, campaigns, sales and posts so every screen can be tested. Use the account menu → **Switch demo account** to act as the other side of a collaboration, and **Reset demo data** to start over.

All data access goes through `src/lib/store.js`, so moving to a real backend (e.g. Supabase for logins, database and photo storage) only touches that file. Metric definitions live in `src/lib/metrics.js`; match scoring in `src/lib/match.js`.

## Deploy

`.github/workflows/deploy.yml` runs the tests and builds the site on every push to `main`, then publishes it to the `gh-pages` branch, which GitHub Pages serves at https://siggiebahamas.github.io/buzz/.
