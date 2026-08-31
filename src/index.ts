import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Bindings } from "./types";
import { layout } from "./views/layout";
import {
  homePage,
  productPage,
  successPage,
  messagePage,
  adminLogin,
  adminDashboard,
} from "./views/pages";
import {
  listProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  grantDownload,
  orderByToken,
  markEventOnce,
} from "./db";
import { getStripe } from "./stripe";

const app = new Hono<{ Bindings: Bindings }>();

const page = (env: Bindings, title: string, body: any) =>
  layout({ title, body, kofiUrl: env.KOFI_URL, patreonUrl: env.PATREON_URL });

/* ---------------- Storefront ---------------- */

app.get("/", async (c) => {
  const products = await listProducts(c.env.DB);
  const kind = c.req.query("kind");
  return c.html(page(c.env, "Store", homePage(products, kind)));
});

app.get("/p/:slug", async (c) => {
  const p = await getProductBySlug(c.env.DB, c.req.param("slug"));
  if (!p) return c.notFound();
  return c.html(page(c.env, p.title, productPage(p)));
});

/* ---------------- Free downloads ---------------- */

app.get("/download/free/:slug", async (c) => {
  const p = await getProductBySlug(c.env.DB, c.req.param("slug"));
  if (!p || p.price_cents !== 0 || !p.file_key) return c.notFound();
  return streamFile(c.env, p.file_key, filenameFor(p.slug, p.file_key));
});

/* ---------------- Paid downloads (token-gated) ---------------- */

app.get("/download/:token", async (c) => {
  const order = await orderByToken(c.env.DB, c.req.param("token"));
  if (!order || !order.file_key) return c.notFound();
  if (order.expires_at && new Date(order.expires_at) < new Date()) {
    return c.html(page(c.env, "Expired", messagePage("Link expired", "This download link is no longer valid. Contact us if you need a fresh one.")), 410);
  }
  return streamFile(c.env, order.file_key, filenameFor("download", order.file_key));
});

/* ---------------- Stripe Checkout ---------------- */

app.post("/buy/:slug", async (c) => {
  const p = await getProductBySlug(c.env.DB, c.req.param("slug"));
  if (!p || p.price_cents <= 0) return c.notFound();

  const stripe = getStripe(c.env);
  const origin = new URL(c.req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: p.price_cents,
          product_data: { name: p.title },
        },
      },
    ],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/p/${p.slug}`,
    metadata: { product_id: String(p.id) },
  });

  return c.redirect(session.url!, 303);
});

// Robust fallback: confirm the session server-side and mint the download.
// (The webhook also does this; whichever runs first wins — grantDownload is idempotent.)
app.get("/success", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) return c.redirect("/");

  const stripe = getStripe(c.env);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return c.html(page(c.env, "Pending", messagePage("Payment pending", "We haven't confirmed your payment yet. Refresh in a moment.")));
  }

  const productId = Number(session.metadata?.product_id);
  const product = await getProductById(c.env.DB, productId);
  if (!product) return c.notFound();

  const token = await grantDownload(c.env, {
    productId,
    stripeSessionId: session.id,
    email: session.customer_details?.email ?? null,
    amountCents: session.amount_total ?? product.price_cents,
  });

  return c.html(page(c.env, "Thank you", successPage(product.title, token)));
});

// Stripe webhook — MUST read the raw body and use constructEventAsync on Workers.
app.post("/webhooks/stripe", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.text("missing signature", 400);
  const raw = await c.req.text();

  const stripe = getStripe(c.env);
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return c.text(`bad signature: ${(err as Error).message}`, 400);
  }

  const fresh = await markEventOnce(c.env.DB, event.id);
  if (!fresh) return c.text("ok (dup)", 200);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const productId = Number(session.metadata?.product_id);
    if (productId) {
      await grantDownload(c.env, {
        productId,
        stripeSessionId: session.id,
        email: session.customer_details?.email ?? null,
        amountCents: session.amount_total ?? null,
      });
    }
  }

  return c.text("ok", 200);
});

/* ---------------- Admin (single-password) ---------------- */

app.get("/admin/login", (c) => c.html(page(c.env, "Login", adminLogin())));

app.post("/admin/login", async (c) => {
  const form = await c.req.parseBody();
  if (form.password === c.env.ADMIN_PASSWORD) {
    setCookie(c, "admin", c.env.ADMIN_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return c.redirect("/admin");
  }
  return c.html(page(c.env, "Login", adminLogin("Wrong password.")));
});

// Auth gate for everything else under /admin.
app.use("/admin", async (c, next) => {
  if (!c.env.ADMIN_TOKEN || getCookie(c, "admin") !== c.env.ADMIN_TOKEN)
    return c.redirect("/admin/login");
  await next();
});
app.use("/admin/*", async (c, next) => {
  if (c.req.path === "/admin/login") return next();
  if (!c.env.ADMIN_TOKEN || getCookie(c, "admin") !== c.env.ADMIN_TOKEN)
    return c.redirect("/admin/login");
  await next();
});

app.get("/admin", async (c) => {
  const products = await listProducts(c.env.DB);
  return c.html(page(c.env, "Admin", adminDashboard(products)));
});

app.post("/admin/logout", (c) => {
  deleteCookie(c, "admin", { path: "/" });
  return c.redirect("/admin/login");
});

app.post("/admin/products", async (c) => {
  const form = await c.req.parseBody();
  const slug = String(form.slug).trim();
  const file = form.file as File | undefined;

  let fileKey: string | null = null;
  if (file && typeof file === "object" && file.size > 0) {
    fileKey = `files/${slug}/${file.name}`;
    await c.env.FILES.put(fileKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
  }

  const dollars = parseFloat(String(form.price || "0"));
  await createProduct(c.env.DB, {
    slug,
    title: String(form.title),
    summary: String(form.summary || ""),
    description: String(form.description || ""),
    kind: (String(form.kind) as any) || "plugin",
    price_cents: Math.round((isNaN(dollars) ? 0 : dollars) * 100),
    cover_image: String(form.cover_image || "") || null,
    external_url: String(form.external_url || "") || null,
    sponsored_until: form.sponsored_until ? `${form.sponsored_until} 23:59:59` : null,
    file_key: fileKey,
  });

  return c.redirect("/admin");
});

/* ---------------- helpers ---------------- */

async function streamFile(env: Bindings, key: string, filename: string) {
  const obj = await env.FILES.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
}

function filenameFor(prefix: string, key: string) {
  const base = key.split("/").pop() || `${prefix}.bin`;
  return base;
}

export default app;
