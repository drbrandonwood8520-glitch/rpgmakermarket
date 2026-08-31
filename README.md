# RPG Maker Plugins — Storefront

Full-stack storefront for RPG Maker MZ/MV plugins, assets, and in-browser generators.
Runs entirely on Cloudflare: **Workers** (app) + **Static Assets** (frontend) + **D1** (database) + **R2** (file storage), with **Stripe** for paid items and **Ko-fi/Patreon** for donations.

## What works out of the box
- Storefront home with cards, filtered by kind (plugin / asset / generator).
- Sponsored items are pinned to the top with a badge (set a "sponsored until" date in admin).
- Product pages with **free downloads** (streamed from R2) and **paid downloads** (Stripe Checkout → 7-day token link).
- Stripe webhook (verified the Workers-safe way with `constructEventAsync`) + a server-side success-page fallback, both idempotent.
- Password-protected **/admin** to add products and upload files to R2.
- Hosted generators as static tools under `/generators/...`.
- Ko-fi / Patreon links in the header.

## First-time setup

```bash
npm install

# 1) Create your Cloudflare resources
npx wrangler d1 create rpgm-store-db          # copy the database_id into wrangler.jsonc
npx wrangler r2 bucket create rpgm-store-files

# 2) Apply the database schema (local)
npm run db:migrate
npm run db:seed        # optional sample rows

# 3) Local secrets
cp .dev.vars.example .dev.vars   # then fill in real values

# 4) Run it
npm run dev            # http://localhost:8787
```

Log in at `/admin/login` with your `ADMIN_PASSWORD`, then add products and upload files.

## Deploy

```bash
# set production secrets (repeat per secret)
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put KOFI_URL
npx wrangler secret put PATREON_URL

npm run db:migrate:remote
npm run deploy
```

Then in the **Stripe dashboard**, add a webhook endpoint pointing at
`https://YOUR-DOMAIN/webhooks/stripe` for the `checkout.session.completed` event,
and paste its signing secret into `STRIPE_WEBHOOK_SECRET`.

## Where things live
- `src/index.ts` — all routes (store, checkout, downloads, webhook, admin).
- `src/db.ts` — D1 queries.
- `src/stripe.ts` — Stripe client (Workers fetch http client).
- `src/views/` — HTML templates.
- `migrations/` — D1 schema.
- `public/` — CSS, images, and hosted generators.

## Deliberately left for phase 2
- Real user accounts (needed when other creators upload/sell their own content).
- Self-serve **sponsorship checkout** (a Stripe product that sets `sponsored_until` via webhook) — right now you set the date manually in admin.
- Ko-fi webhooks, email receipts, cover-image uploads to R2, search/pagination.
