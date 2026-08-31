export type Bindings = {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_PASSWORD: string;
  ADMIN_TOKEN: string;
  KOFI_URL?: string;
  PATREON_URL?: string;
};

export type Product = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  kind: "plugin" | "asset" | "generator";
  price_cents: number;
  cover_image: string | null;
  file_key: string | null;
  external_url: string | null;
  published: number;
  sponsored_until: string | null;
  created_at: string;
};

export const isSponsored = (p: Product) =>
  !!p.sponsored_until && new Date(p.sponsored_until) > new Date();

export const priceLabel = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
