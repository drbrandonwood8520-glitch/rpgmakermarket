import type { Bindings, Product } from "./types";

export async function listProducts(db: D1Database): Promise<Product[]> {
  // Sponsored (still active) first, then newest.
  const { results } = await db
    .prepare(
      `SELECT * FROM products
       WHERE published = 1
       ORDER BY
         CASE WHEN sponsored_until IS NOT NULL AND sponsored_until > datetime('now')
              THEN 0 ELSE 1 END,
         created_at DESC`
    )
    .all<Product>();
  return results ?? [];
}

export async function getProductBySlug(
  db: D1Database,
  slug: string
): Promise<Product | null> {
  return db
    .prepare(`SELECT * FROM products WHERE slug = ? AND published = 1`)
    .bind(slug)
    .first<Product>();
}

export async function getProductById(
  db: D1Database,
  id: number
): Promise<Product | null> {
  return db.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<Product>();
}

export async function createProduct(
  db: D1Database,
  p: Partial<Product>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO products (slug, title, summary, description, kind, price_cents, cover_image, file_key, external_url, sponsored_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      p.slug,
      p.title,
      p.summary ?? null,
      p.description ?? null,
      p.kind ?? "plugin",
      p.price_cents ?? 0,
      p.cover_image ?? null,
      p.file_key ?? null,
      p.external_url ?? null,
      p.sponsored_until ?? null
    )
    .run();
}

/** Idempotently create a paid download grant for a Stripe session. */
export async function grantDownload(
  env: Bindings,
  opts: {
    productId: number;
    stripeSessionId: string;
    email: string | null;
    amountCents: number | null;
  }
): Promise<string> {
  const existing = await env.DB.prepare(
    `SELECT download_token FROM orders WHERE stripe_session_id = ?`
  )
    .bind(opts.stripeSessionId)
    .first<{ download_token: string }>();
  if (existing?.download_token) return existing.download_token;

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

  await env.DB.prepare(
    `INSERT INTO orders (product_id, stripe_session_id, email, amount_cents, status, download_token, expires_at)
     VALUES (?, ?, ?, ?, 'paid', ?, ?)`
  )
    .bind(
      opts.productId,
      opts.stripeSessionId,
      opts.email,
      opts.amountCents,
      token,
      expires
    )
    .run();

  return token;
}

export async function orderByToken(db: D1Database, token: string) {
  return db
    .prepare(
      `SELECT o.*, p.file_key, p.title AS product_title
       FROM orders o JOIN products p ON p.id = o.product_id
       WHERE o.download_token = ? AND o.status = 'paid'`
    )
    .bind(token)
    .first<{
      file_key: string | null;
      product_title: string;
      expires_at: string | null;
    }>();
}

/** Returns true the first time an event id is seen (so we only process once). */
export async function markEventOnce(db: D1Database, id: string): Promise<boolean> {
  try {
    await db.prepare(`INSERT INTO stripe_events (id) VALUES (?)`).bind(id).run();
    return true;
  } catch {
    return false; // duplicate -> already processed
  }
}
