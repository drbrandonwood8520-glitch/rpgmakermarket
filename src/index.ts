// RPG Maker Market — whole app in one file (keeps repo uploads minimal).
// Storefront + email funnel + membership + contact + legal + admin.
import { Hono } from "hono";
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import Stripe from "stripe";

/* ============================ Types & bindings ============================ */

type Bindings = {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_TOKEN?: string;
  // Optional site config (set as plain-text Variables in the dashboard)
  CONTACT_EMAIL?: string;
  MEMBERSHIP_PRICE_CENTS?: string;
  CF_ANALYTICS_TOKEN?: string;
  DISCORD_URL?: string;
  YOUTUBE_URL?: string;
  TWITTER_URL?: string;
  ITCH_URL?: string;
  KOFI_URL?: string;
  PATREON_URL?: string;
};

type Product = {
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

const BRAND = "RPG Maker Market";
const DEFAULT_CONTACT = "rpgmakerplugins@protonmail.com";

const isSponsored = (p: Product) =>
  !!p.sponsored_until && new Date(p.sponsored_until) > new Date();
const priceLabel = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
const contactEmail = (env: Bindings) => env.CONTACT_EMAIL || DEFAULT_CONTACT;
const membershipCents = (env: Bindings) =>
  Math.max(100, parseInt(env.MEMBERSHIP_PRICE_CENTS || "500", 10) || 500);

/* ================================ Database ================================ */

async function listProducts(db: D1Database, kind?: string): Promise<Product[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM products WHERE published = 1
       ${kind ? "AND kind = ?1" : ""}
       ORDER BY CASE WHEN sponsored_until IS NOT NULL AND sponsored_until > datetime('now')
                     THEN 0 ELSE 1 END, created_at DESC`
    )
    .bind(...(kind ? [kind] : []))
    .all<Product>();
  return results ?? [];
}
const getBySlug = (db: D1Database, slug: string) =>
  db.prepare(`SELECT * FROM products WHERE slug = ? AND published = 1`).bind(slug).first<Product>();
const getById = (db: D1Database, id: number) =>
  db.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<Product>();

async function createProduct(db: D1Database, p: Partial<Product>) {
  await db
    .prepare(
      `INSERT INTO products (slug, title, summary, description, kind, price_cents, cover_image, file_key, external_url, sponsored_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      p.slug, p.title, p.summary ?? null, p.description ?? null, p.kind ?? "plugin",
      p.price_cents ?? 0, p.cover_image ?? null, p.file_key ?? null,
      p.external_url ?? null, p.sponsored_until ?? null
    )
    .run();
}

async function grantDownload(
  env: Bindings,
  o: { productId: number; sessionId: string; email: string | null; amount: number | null }
): Promise<string> {
  const existing = await env.DB.prepare(
    `SELECT download_token FROM orders WHERE stripe_session_id = ?`
  ).bind(o.sessionId).first<{ download_token: string }>();
  if (existing?.download_token) return existing.download_token;
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + 7 * 864e5).toISOString();
  await env.DB.prepare(
    `INSERT INTO orders (product_id, stripe_session_id, email, amount_cents, status, download_token, expires_at)
     VALUES (?, ?, ?, ?, 'paid', ?, ?)`
  ).bind(o.productId, o.sessionId, o.email, o.amount, token, expires).run();
  return token;
}
const orderByToken = (db: D1Database, token: string) =>
  db.prepare(
    `SELECT o.*, p.file_key, p.title AS product_title FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE o.download_token = ? AND o.status = 'paid'`
  ).bind(token).first<{ file_key: string | null; product_title: string; expires_at: string | null }>();

async function markEventOnce(db: D1Database, id: string): Promise<boolean> {
  try { await db.prepare(`INSERT INTO stripe_events (id) VALUES (?)`).bind(id).run(); return true; }
  catch { return false; }
}

async function addFreeSubscriber(db: D1Database, email: string) {
  await db.prepare(
    `INSERT INTO subscribers (email, tier, status) VALUES (?, 'free', 'active')
     ON CONFLICT(email) DO NOTHING`
  ).bind(email.toLowerCase()).run();
}
async function upsertMember(db: D1Database, m: { email: string; customer?: string; sub?: string }) {
  await db.prepare(
    `INSERT INTO subscribers (email, tier, status, stripe_customer_id, stripe_subscription_id)
     VALUES (?, 'member', 'active', ?, ?)
     ON CONFLICT(email) DO UPDATE SET tier='member', status='active',
       stripe_customer_id=excluded.stripe_customer_id,
       stripe_subscription_id=excluded.stripe_subscription_id`
  ).bind(m.email.toLowerCase(), m.customer ?? null, m.sub ?? null).run();
}
async function cancelMemberBySub(db: D1Database, sub: string) {
  await db.prepare(`UPDATE subscribers SET status='canceled', tier='free' WHERE stripe_subscription_id = ?`).bind(sub).run();
}
async function addMessage(db: D1Database, m: { name: string; email: string; message: string }) {
  await db.prepare(`INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`)
    .bind(m.name, m.email, m.message).run();
}
async function counts(db: D1Database) {
  const q = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0;
  return {
    products: await q(`SELECT COUNT(*) n FROM products`),
    subs: await q(`SELECT COUNT(*) n FROM subscribers`),
    members: await q(`SELECT COUNT(*) n FROM subscribers WHERE tier='member' AND status='active'`),
    messages: await q(`SELECT COUNT(*) n FROM contact_messages`),
  };
}

/* ================================= Stripe ================================= */

const stripeReady = (env: Bindings) => !!env.STRIPE_SECRET_KEY;
const getStripe = (env: Bindings) =>
  new Stripe(env.STRIPE_SECRET_KEY as string, { httpClient: Stripe.createFetchHttpClient() });

/* ================================== Views ================================= */

function socials(env: Bindings) {
  const links: Array<[string, string]> = [];
  if (env.DISCORD_URL) links.push(["Discord", env.DISCORD_URL]);
  if (env.YOUTUBE_URL) links.push(["YouTube", env.YOUTUBE_URL]);
  if (env.TWITTER_URL) links.push(["Twitter/X", env.TWITTER_URL]);
  if (env.ITCH_URL) links.push(["itch.io", env.ITCH_URL]);
  if (env.KOFI_URL) links.push(["Ko-fi", env.KOFI_URL]);
  if (env.PATREON_URL) links.push(["Patreon", env.PATREON_URL]);
  return links;
}

function layout(
  env: Bindings,
  opts: { title: string; description?: string; body: HtmlEscapedString | Promise<HtmlEscapedString>; active?: string }
) {
  const desc = opts.description || "New plugins, assets, and tools for RPG Maker MZ & MV — every month.";
  const nav = (href: string, label: string, key: string) =>
    raw(`<a class="${opts.active === key ? "on" : ""}" href="${href}">${label}</a>`);
  const social = socials(env);
  const beacon = env.CF_ANALYTICS_TOKEN
    ? raw(`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${env.CF_ANALYTICS_TOKEN}"}'></script>`)
    : "";
  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title} · ${BRAND}</title>
  <meta name="description" content="${desc}" />
  <meta property="og:title" content="${opts.title} · ${BRAND}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:type" content="website" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Press+Start+2P&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/"><span class="brand-mark">◆</span> RPG Maker Market</a>
    <nav class="mainnav">
      ${nav("/?kind=plugin", "Plugins", "plugin")}
      ${nav("/?kind=asset", "Assets", "asset")}
      ${nav("/?kind=generator", "Generators", "generator")}
      ${nav("/membership", "Membership", "membership")}
      <a class="join-btn" href="/#join">Join free</a>
    </nav>
  </header>
  <main>${opts.body}</main>
  <footer class="site-footer">
    <div class="foot-cols">
      <div>
        <p class="foot-title">${BRAND}</p>
        <p class="foot-note">Plugins, assets &amp; tools for RPG Maker MZ &amp; MV.</p>
      </div>
      <nav class="foot-links">
        <a href="/faq">FAQ</a><a href="/docs">Install docs</a><a href="/contact">Contact</a>
        <a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/refunds">Refunds</a>
        <a href="/license">License</a><a href="/dmca">DMCA</a>
      </nav>
      ${social.length
        ? raw(`<nav class="foot-social">${social.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join("")}</nav>`)
        : ""}
    </div>
    <p class="foot-fine">Built on Cloudflare · <a href="/admin">Admin</a> · &copy; ${new Date().getFullYear()}</p>
  </footer>
  ${beacon}
</body>
</html>`;
}

function emailForm(id: string, cta: string) {
  return html`<form class="join-form" method="post" action="/subscribe">
    <input type="email" name="email" placeholder="you@email.com" required aria-label="Email address" />
    <button class="btn gold" type="submit">${cta}</button>
    <input type="hidden" name="src" value="${id}" />
  </form>`;
}

function productCard(p: Product) {
  const sp = isSponsored(p);
  return html`<a class="window card ${sp ? "sponsored" : ""}" href="/p/${p.slug}">
    ${sp ? html`<span class="chip gold">★ Sponsored</span>` : ""}
    <span class="cover" style="background-image:url('${p.cover_image ?? ""}')"></span>
    <span class="card-meta">
      <span class="kind">${p.kind}</span>
      <span class="ttl">${p.title}</span>
      <span class="sub">${p.summary ?? ""}</span>
      <span class="price ${p.price_cents === 0 ? "free" : "gold"}">${priceLabel(p.price_cents)}</span>
    </span>
  </a>`;
}

function homePage(env: Bindings, products: Product[], kind?: string) {
  const price = priceLabel(membershipCents(env));
  const heading = kind ? `${kind[0].toUpperCase()}${kind.slice(1)}s` : "New this week";
  return html`
    <section class="hero" id="join">
      <div class="window hero-window">
        <p class="eyebrow"><span class="cursor">▸</span> Welcome, traveler</p>
        <h1>New RPG Maker plugins &amp; assets — every month.</h1>
        <p class="lede">Join the list and get this month's <strong>free plugin bundle</strong> in your inbox. Members get a fresh <strong>paid bundle every week</strong>, at no extra cost.</p>
        ${emailForm("hero", "Claim free bundle")}
        <p class="microcopy">No spam. One email when a bundle drops. Unsubscribe anytime.</p>
      </div>
    </section>

    <section class="row">
      <div class="row-head"><h2>${heading}</h2>
        ${kind ? html`<a class="text-link" href="/">Show everything</a>` : html`<a class="text-link" href="/membership">See membership →</a>`}
      </div>
      <div class="grid">
        ${products.length
          ? raw(products.map((p) => productCard(p).toString()).join(""))
          : html`<div class="window empty"><p>The shop is being stocked. New plugins and assets are on the way — <a href="/#join">join the list</a> to hear first.</p></div>`}
      </div>
    </section>

    <section class="tiers">
      <div class="window tier">
        <p class="tier-name">Free list</p>
        <p class="tier-price free">$0</p>
        <ul><li>One free plugin bundle each month</li><li>First to hear about new drops</li><li>No account, just your email</li></ul>
        ${emailForm("tier", "Join free")}
      </div>
      <div class="window tier featured">
        <span class="chip gold">Best value</span>
        <p class="tier-name">Membership</p>
        <p class="tier-price gold">${price}<span>/mo</span></p>
        <ul><li>A paid bundle emailed to you <strong>every week</strong></li><li>Everything in the free list</li><li>Directly supports new tools</li><li>Cancel anytime</li></ul>
        <a class="btn gold" href="/membership">Become a member</a>
      </div>
    </section>
  `;
}

function productPage(env: Bindings, p: Product) {
  const paid = p.price_cents > 0;
  let action;
  if (p.kind === "generator" && p.external_url)
    action = html`<a class="btn gold" href="${p.external_url}">Open generator</a>`;
  else if (paid)
    action = html`<form method="post" action="/buy/${p.slug}"><button class="btn gold" type="submit">Buy · ${priceLabel(p.price_cents)}</button></form>`;
  else
    action = html`<a class="btn gold" href="/download/free/${p.slug}">Download free</a>`;

  return html`
    <section class="detail">
      <a class="text-link back" href="/">← Back to shop</a>
      <div class="detail-grid">
        <div class="window cover-lg" style="background-image:url('${p.cover_image ?? ""}')"></div>
        <div class="detail-info">
          <span class="kind">${p.kind}</span>
          <h1>${p.title}</h1>
          <p class="lede">${p.summary ?? ""}</p>
          <div class="buy-row"><span class="price big ${p.price_cents === 0 ? "free" : "gold"}">${priceLabel(p.price_cents)}</span>${action}</div>
          <div class="prose">${raw((p.description ?? "").replace(/</g, "&lt;").replace(/\n/g, "<br>"))}</div>
          <div class="window license-note">
            <p class="eyebrow">License</p>
            <p>Buy once, use forever. <strong>Commercial use allowed</strong> in your games, <strong>no credit required</strong>. You may not resell or redistribute the files. Full terms on the <a href="/license">license page</a>.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function membershipPage(env: Bindings) {
  const price = priceLabel(membershipCents(env));
  return html`
    <section class="narrow">
      <div class="window hero-window">
        <p class="eyebrow"><span class="cursor">▸</span> Membership</p>
        <h1>A new paid bundle, every week — free for members.</h1>
        <p class="lede">Membership is ${price}/month. Each week we email members a bundle of premium plugins and assets at no extra cost. Everything you'd normally pay for, included.</p>
        <form method="post" action="/membership/subscribe" class="join-form">
          <input type="email" name="email" placeholder="you@email.com" required aria-label="Email address" />
          <button class="btn gold" type="submit">Start membership · ${price}/mo</button>
        </form>
        <p class="microcopy">Secure checkout by Stripe. Cancel anytime — no lock-in.</p>
      </div>
      <div class="two-up">
        <div class="window tier"><p class="tier-name">Free list</p><p class="tier-price free">$0</p>
          <ul><li>Monthly free bundle</li><li>Drop announcements</li></ul></div>
        <div class="window tier featured"><p class="tier-name">Member</p><p class="tier-price gold">${price}<span>/mo</span></p>
          <ul><li>Weekly paid bundle, free</li><li>Everything in the free list</li><li>Support new development</li></ul></div>
      </div>
    </section>
  `;
}

function contactPage(env: Bindings) {
  return html`
    <section class="narrow">
      <div class="window">
        <p class="eyebrow"><span class="cursor">▸</span> Contact</p>
        <h1>Get in touch</h1>
        <p class="lede">Questions about a plugin, a license, or a partnership? Send a note and we'll reply by email. You can also reach us directly at <a href="mailto:${contactEmail(env)}">${contactEmail(env)}</a>.</p>
        <form class="stack-form" method="post" action="/contact">
          <label>Name<input name="name" required /></label>
          <label>Email<input type="email" name="email" required /></label>
          <label>Message<textarea name="message" rows="6" required></textarea></label>
          <button class="btn gold" type="submit">Send message</button>
        </form>
      </div>
    </section>
  `;
}

function thanksPage(env: Bindings, kind: string) {
  const map: Record<string, [string, string]> = {
    free: ["You're on the list!", "Watch your inbox for this month's free bundle. Want the weekly paid bundles too? Membership is one click away."],
    member: ["Welcome to the crew! 🎉", "Your membership is active. Your first weekly bundle will arrive by email shortly."],
    contact: ["Message sent.", "Thanks for reaching out — we'll get back to you by email soon."],
  };
  const [h, b] = map[kind] || ["Done.", ""];
  return html`<section class="narrow"><div class="window notice">
    <h1>${h}</h1><p class="lede">${b}</p>
    ${kind === "free" ? html`<a class="btn gold" href="/membership">See membership</a>` : html`<a class="btn ghost" href="/">Back to shop</a>`}
  </div></section>`;
}

function successPage(title: string, token: string) {
  return html`<section class="narrow"><div class="window notice ok">
    <h1>Thanks for your purchase! 🎉</h1>
    <p class="lede">Your download for <strong>${title}</strong> is ready. This link works for 7 days.</p>
    <a class="btn gold" href="/download/${token}">Download now</a>
  </div></section>`;
}

function messagePage(h: string, b: string) {
  return html`<section class="narrow"><div class="window notice"><h1>${h}</h1><p class="lede">${b}</p><a class="btn ghost" href="/">Back to shop</a></div></section>`;
}

function legalPage(env: Bindings, title: string, bodyHtml: string) {
  return html`<section class="narrow legal"><div class="window">
    <p class="eyebrow"><span class="cursor">▸</span> ${title}</p>
    <h1>${title}</h1>
    <p class="updated">Last updated ${new Date().toISOString().slice(0, 10)}</p>
    ${raw(bodyHtml)}
    <p class="legal-contact">Questions? <a href="mailto:${contactEmail(env)}">${contactEmail(env)}</a></p>
  </div></section>`;
}

/* ------------------------------ Legal content ----------------------------- */

const p = (s: string) => `<p>${s}</p>`;
const h = (s: string) => `<h2>${s}</h2>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

const legal = {
  terms: () =>
    h("Agreement") + p(`By using ${BRAND} ("the site") you agree to these terms. If you don't agree, please don't use the site.`) +
    h("What we sell") + p("The site distributes digital plugins, art and audio assets, and browser-based tools for RPG Maker MZ and MV. All products are digital goods delivered by download or email link.") +
    h("Your account and email") + p("When you join our list or buy a product you give us an email address. You're responsible for keeping it accurate. You can leave the list at any time using the unsubscribe link.") +
    h("Payments") + p("Payments are processed by Stripe. We never see or store your full card details. Prices are shown in USD and may change over time.") +
    h("Acceptable use") + ul(["Don't resell, redistribute, or publicly share the files you download.", "Don't attempt to break, overload, or gain unauthorized access to the site.", "Don't upload or send unlawful, infringing, or malicious content through our forms."]) +
    h("Intellectual property") + p("All products remain the property of their creators. Your rights to use them are set out on the License page.") +
    h("Disclaimer") + p('The site and its products are provided "as is," without warranties of any kind. We do our best to keep everything working but can\'t guarantee uninterrupted or error-free service.') +
    h("Limitation of liability") + p("To the maximum extent permitted by law, we aren't liable for indirect or consequential damages arising from your use of the site or products.") +
    h("Changes") + p("We may update these terms; the latest version always lives on this page."),
  privacy: () =>
    h("What we collect") + ul(["The email address you give us when you join the list, buy a product, or contact us.", "Basic purchase records (what you bought and when) needed to deliver your download and keep accounts straight.", "Aggregate, privacy-friendly traffic stats via Cloudflare Web Analytics — no cookies, and no cross-site tracking."]) +
    h("How we use it") + ul(["To send you the bundles and product downloads you signed up for.", "To reply when you contact us.", "To understand roughly how many people visit, so we can improve the site."]) +
    h("Who we share it with") + p("We use Stripe to process payments and (when enabled) an email provider to send messages. They only receive what's needed to do their job. We don't sell your data.") +
    h("Cookies") + p("The site uses a single cookie only to keep the admin logged in. Visitors browsing and buying are not tracked with advertising cookies.") +
    h("Your choices") + p(`You can unsubscribe from emails anytime, and you can ask us to delete your data by emailing us. `) +
    h("Data retention") + p("We keep purchase and subscriber records for as long as needed to run the shop and meet legal obligations."),
  refunds: () =>
    h("Digital goods") + p("Because products are digital and delivered instantly, all sales are final and we generally don't offer refunds once a file has been downloaded or a bundle emailed.") +
    h("When we'll make it right") + ul(["A file is broken, corrupted, or won't install and we can't fix it.", "You were charged twice for the same item.", "You bought the wrong item and haven't downloaded it yet."]) +
    h("How to ask") + p("Email us within 14 days of purchase with your receipt and what went wrong. We read every message and try to be fair.") +
    h("Memberships") + p("You can cancel your membership anytime; it stays active until the end of the period you already paid for. We don't pro-rate partial months."),
  license: () =>
    h("The short version") + p("Buy once, use forever. Use our plugins and assets in as many of your own RPG Maker games as you like, including commercial ones. No credit required. Don't share or resell the raw files.") +
    h("You may") + ul(["Use the files in personal and commercial RPG Maker MZ/MV projects.", "Modify plugins and assets to fit your game.", "Ship your finished game to any store or platform."]) +
    h("You may not") + ul(["Resell, sublicense, or redistribute the original files (modified or not).", "Share your download or bundle with people who didn't get it from us.", "Include the raw files in an asset pack, template, or tool made for others to reuse."]) +
    h("Free items") + p("The same rules apply to free bundle items unless a product page says otherwise.") +
    h("Ownership") + p("You get a license to use the files; the creators keep ownership and copyright."),
  dmca: () =>
    h("Reporting infringement") + p("We respect intellectual property and will act on valid takedown notices. If you believe content on the site infringes your copyright, send us a notice.") +
    h("Include in your notice") + ul(["Your contact information.", "A description of the work you say is infringed.", "The URL or exact location of the material on our site.", "A statement, under penalty of perjury, that you're the rights holder or authorized to act for them.", "Your physical or electronic signature."]) +
    h("What happens next") + p("We'll review promptly and remove or disable access to material that appears to infringe. Repeat infringers may be banned.") +
    h("Counter-notice") + p("If your content was removed and you believe that was a mistake, you may send a counter-notice with the same details and we'll review it.") +
    p(`Send notices to <a href="mailto:${contactEmail0()}">${contactEmail0()}</a>.`),
};
// small helper so the DMCA string can reference the default without env in scope
function contactEmail0() { return DEFAULT_CONTACT; }

const faqBody = () =>
  h("Which RPG Maker versions are supported?") + p("Everything here targets RPG Maker MZ and MV. Product pages note anything version-specific.") +
  h("How do I install a plugin?") + p('Unzip the download, drop the .js file into your project\'s <code>js/plugins</code> folder, then enable it in the Plugin Manager. See the <a href="/docs">install docs</a> for a step-by-step.') +
  h("Can I use these in a commercial game?") + p('Yes — commercial use is allowed and no credit is required. Full details on the <a href="/license">license page</a>.') +
  h("What's the difference between the free list and membership?") + p("The free list emails you one free bundle a month. Membership emails you a premium bundle every week and directly funds new tools.") +
  h("How do I get my download?") + p("Free items download straight from the product page. Paid items unlock a download link right after checkout (good for 7 days) — save your files somewhere safe.") +
  h("I need help.") + p('Use the <a href="/contact">contact form</a> and we\'ll reply by email.');

const docsBody = () =>
  h("Installing a plugin (MZ & MV)") +
  `<ol><li>Download and unzip the plugin.</li><li>Copy the <code>.js</code> file into your project's <code>js/plugins</code> folder.</li><li>Open RPG Maker, go to <strong>Tools → Plugin Manager</strong>.</li><li>Double-click an empty row, pick the plugin, and set its parameters.</li><li>Make sure the status is <strong>ON</strong>, then playtest.</li></ol>` +
  h("Installing art & audio assets") +
  `<ol><li>Unzip the pack.</li><li>Drop image files into the matching folder under <code>img/</code> and audio into <code>audio/</code>.</li><li>Reference them in your events, database, or tilesets as usual.</li></ol>` +
  h("Load order") + p("If two plugins conflict, try changing their order in the Plugin Manager — plugins run top to bottom. Product pages call out any required order.") +
  h("Still stuck?") + p('Reach out via the <a href="/contact">contact form</a>.');

/* --------------------------------- Admin ---------------------------------- */

function adminLogin(error?: string) {
  return html`<section class="narrow"><div class="window">
    <p class="eyebrow"><span class="cursor">▸</span> Admin</p><h1>Log in</h1>
    ${error ? html`<p class="err">${error}</p>` : ""}
    <form class="stack-form" method="post" action="/admin/login">
      <label>Password<input type="password" name="password" required /></label>
      <button class="btn gold" type="submit">Log in</button>
    </form>
  </div></section>`;
}

function adminDash(c: { products: number; subs: number; members: number; messages: number }, products: Product[], msgs: Array<{ name: string; email: string; message: string; created_at: string }>) {
  const rows = products.map((p) =>
    `<tr><td>${p.title}</td><td>${p.kind}</td><td>${priceLabel(p.price_cents)}</td><td>${isSponsored(p) ? "★" : ""}</td><td>${p.file_key ? "✓" : "—"}</td></tr>`
  ).join("");
  return html`<section class="admin">
    <div class="admin-head"><h1>Admin</h1>
      <form method="post" action="/admin/logout"><button class="btn ghost">Log out</button></form></div>
    <div class="stats">
      <div class="window stat"><span>${c.products}</span>Products</div>
      <div class="window stat"><span>${c.subs}</span>Subscribers</div>
      <div class="window stat"><span>${c.members}</span>Members</div>
      <div class="window stat"><span>${c.messages}</span>Messages</div>
    </div>
    <p><a class="btn ghost" href="/admin/subscribers.csv">Export subscribers (CSV)</a></p>

    <div class="window">
      <h2>Add a product</h2>
      <form class="stack-form" method="post" action="/admin/products" enctype="multipart/form-data">
        <label>Slug<input name="slug" placeholder="quest-log-mz" required /></label>
        <label>Title<input name="title" required /></label>
        <label>Summary<input name="summary" /></label>
        <label>Description<textarea name="description" rows="4"></textarea></label>
        <label>Kind<select name="kind"><option value="plugin">plugin</option><option value="asset">asset</option><option value="generator">generator</option></select></label>
        <label>Price in USD (0 for free)<input name="price" value="0" /></label>
        <label>Cover image URL<input name="cover_image" placeholder="https://…" /></label>
        <label>External URL (generators)<input name="external_url" placeholder="/generators/…" /></label>
        <label>Sponsored until (YYYY-MM-DD, optional)<input name="sponsored_until" /></label>
        <label>Downloadable file (.js / .zip)<input type="file" name="file" /></label>
        <button class="btn gold" type="submit">Create product</button>
      </form>
    </div>

    <div class="window">
      <h2>Products</h2>
      <table class="tbl"><thead><tr><th>Title</th><th>Kind</th><th>Price</th><th>Sponsored</th><th>File</th></tr></thead><tbody>${raw(rows)}</tbody></table>
    </div>

    <div class="window">
      <h2>Recent messages</h2>
      ${msgs.length
        ? raw(msgs.map((m) => `<div class="msg"><strong>${escapeHtml(m.name)}</strong> &lt;${escapeHtml(m.email)}&gt; · <span class="muted">${m.created_at}</span><p>${escapeHtml(m.message)}</p></div>`).join(""))
        : html`<p class="muted">No messages yet.</p>`}
    </div>
  </section>`;
}
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ================================= Routes ================================= */

const app = new Hono<{ Bindings: Bindings }>();
const page = (env: Bindings, o: any) => layout(env, o);

app.get("/", async (c) => {
  const kind = c.req.query("kind");
  const products = await listProducts(c.env.DB, kind);
  return c.html(page(c.env, { title: "Shop", body: homePage(c.env, products, kind), active: kind }));
});

app.post("/subscribe", async (c) => {
  const f = await c.req.parseBody();
  const email = String(f.email || "").trim();
  if (email && email.includes("@")) await addFreeSubscriber(c.env.DB, email);
  return c.redirect("/thanks?kind=free");
});

app.get("/thanks", (c) => c.html(page(c.env, { title: "Thanks", body: thanksPage(c.env, c.req.query("kind") || "") })));

app.get("/membership", (c) => c.html(page(c.env, { title: "Membership", body: membershipPage(c.env), active: "membership" })));

app.post("/membership/subscribe", async (c) => {
  const f = await c.req.parseBody();
  const email = String(f.email || "").trim();
  if (!stripeReady(c.env))
    return c.html(page(c.env, { title: "Membership", body: messagePage("Almost ready", "Memberships open as soon as payments are switched on. Join the free list in the meantime and you'll be first to know.") }));
  const stripe = getStripe(c.env);
  const origin = new URL(c.req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: membershipCents(c.env),
        recurring: { interval: "month" },
        product_data: { name: `${BRAND} Membership` },
      },
    }],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/membership`,
    metadata: { tier: "member" },
  });
  return c.redirect(session.url!, 303);
});

app.get("/contact", (c) => c.html(page(c.env, { title: "Contact", body: contactPage(c.env) })));
app.post("/contact", async (c) => {
  const f = await c.req.parseBody();
  const message = String(f.message || "").trim();
  if (message) await addMessage(c.env.DB, { name: String(f.name || ""), email: String(f.email || ""), message });
  return c.redirect("/thanks?kind=contact");
});

app.get("/faq", (c) => c.html(page(c.env, { title: "FAQ", body: legalPage(c.env, "FAQ", faqBody()) })));
app.get("/docs", (c) => c.html(page(c.env, { title: "Install docs", body: legalPage(c.env, "Install docs", docsBody()) })));
app.get("/terms", (c) => c.html(page(c.env, { title: "Terms", body: legalPage(c.env, "Terms of Service", legal.terms()) })));
app.get("/privacy", (c) => c.html(page(c.env, { title: "Privacy", body: legalPage(c.env, "Privacy Policy", legal.privacy()) })));
app.get("/refunds", (c) => c.html(page(c.env, { title: "Refunds", body: legalPage(c.env, "Refund Policy", legal.refunds()) })));
app.get("/license", (c) => c.html(page(c.env, { title: "License", body: legalPage(c.env, "License", legal.license()) })));
app.get("/dmca", (c) => c.html(page(c.env, { title: "DMCA", body: legalPage(c.env, "DMCA Policy", legal.dmca()) })));

app.get("/p/:slug", async (c) => {
  const prod = await getBySlug(c.env.DB, c.req.param("slug"));
  if (!prod) return c.notFound();
  return c.html(page(c.env, { title: prod.title, description: prod.summary || undefined, body: productPage(c.env, prod) }));
});

app.get("/download/free/:slug", async (c) => {
  const prod = await getBySlug(c.env.DB, c.req.param("slug"));
  if (!prod || prod.price_cents !== 0 || !prod.file_key) return c.notFound();
  return streamFile(c.env, prod.file_key);
});

app.get("/download/:token", async (c) => {
  const order = await orderByToken(c.env.DB, c.req.param("token"));
  if (!order || !order.file_key) return c.notFound();
  if (order.expires_at && new Date(order.expires_at) < new Date())
    return c.html(page(c.env, { title: "Expired", body: messagePage("Link expired", "This download link has expired. Contact us and we'll send a fresh one.") }), 410);
  return streamFile(c.env, order.file_key);
});

app.post("/buy/:slug", async (c) => {
  const prod = await getBySlug(c.env.DB, c.req.param("slug"));
  if (!prod || prod.price_cents <= 0) return c.notFound();
  if (!stripeReady(c.env))
    return c.html(page(c.env, { title: prod.title, body: messagePage("Payments coming soon", "Card payments aren't switched on yet. Check back shortly!") }));
  const stripe = getStripe(c.env);
  const origin = new URL(c.req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: prod.price_cents, product_data: { name: prod.title } } }],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/p/${prod.slug}`,
    metadata: { product_id: String(prod.id) },
  });
  return c.redirect(session.url!, 303);
});

app.get("/success", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId || !stripeReady(c.env)) return c.redirect("/");
  const stripe = getStripe(c.env);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode === "subscription") {
    const email = session.customer_details?.email || "";
    if (email) await upsertMember(c.env.DB, { email, customer: session.customer as string, sub: session.subscription as string });
    return c.html(page(c.env, { title: "Welcome", body: thanksPage(c.env, "member") }));
  }

  if (session.payment_status !== "paid")
    return c.html(page(c.env, { title: "Pending", body: messagePage("Payment pending", "We haven't confirmed your payment yet. Refresh in a moment.") }));
  const productId = Number(session.metadata?.product_id);
  const prod = await getById(c.env.DB, productId);
  if (!prod) return c.notFound();
  const token = await grantDownload(c.env, {
    productId, sessionId: session.id,
    email: session.customer_details?.email ?? null,
    amount: session.amount_total ?? prod.price_cents,
  });
  return c.html(page(c.env, { title: "Thank you", body: successPage(prod.title, token) }));
});

app.post("/webhooks/stripe", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig || !c.env.STRIPE_WEBHOOK_SECRET) return c.text("missing signature", 400);
  const rawBody = await c.req.text();
  const stripe = getStripe(c.env);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return c.text(`bad signature: ${(err as Error).message}`, 400); }

  if (!(await markEventOnce(c.env.DB, event.id))) return c.text("ok (dup)", 200);

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as any;
    if (s.mode === "subscription") {
      const email = s.customer_details?.email;
      if (email) await upsertMember(c.env.DB, { email, customer: s.customer, sub: s.subscription });
    } else {
      const productId = Number(s.metadata?.product_id);
      if (productId) await grantDownload(c.env, { productId, sessionId: s.id, email: s.customer_details?.email ?? null, amount: s.amount_total ?? null });
    }
  } else if (event.type === "customer.subscription.deleted") {
    const s = event.data.object as any;
    if (s.id) await cancelMemberBySub(c.env.DB, s.id);
  }
  return c.text("ok", 200);
});

/* --------------------------------- Admin ---------------------------------- */

app.get("/admin/login", (c) => c.html(page(c.env, { title: "Admin", body: adminLogin() })));
app.post("/admin/login", async (c) => {
  const f = await c.req.parseBody();
  if (c.env.ADMIN_PASSWORD && f.password === c.env.ADMIN_PASSWORD) {
    setCookie(c, "admin", c.env.ADMIN_TOKEN || "", { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: 43200 });
    return c.redirect("/admin");
  }
  return c.html(page(c.env, { title: "Admin", body: adminLogin("That password didn't match.") }));
});
app.use("/admin/*", async (c, next) => {
  if (c.req.path === "/admin/login") return next();
  if (!c.env.ADMIN_TOKEN || getCookie(c, "admin") !== c.env.ADMIN_TOKEN) return c.redirect("/admin/login");
  await next();
});
app.use("/admin", async (c, next) => {
  if (!c.env.ADMIN_TOKEN || getCookie(c, "admin") !== c.env.ADMIN_TOKEN) return c.redirect("/admin/login");
  await next();
});

app.get("/admin", async (c) => {
  const cts = await counts(c.env.DB);
  const products = await listProducts(c.env.DB);
  const { results } = await c.env.DB.prepare(
    `SELECT name, email, message, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 20`
  ).all<{ name: string; email: string; message: string; created_at: string }>();
  return c.html(page(c.env, { title: "Admin", body: adminDash(cts, products, results ?? []) }));
});
app.post("/admin/logout", (c) => { deleteCookie(c, "admin", { path: "/" }); return c.redirect("/admin/login"); });

app.get("/admin/subscribers.csv", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT email, tier, status, created_at FROM subscribers ORDER BY created_at DESC`
  ).all<{ email: string; tier: string; status: string; created_at: string }>();
  const rows = (results ?? []).map((r) => `${r.email},${r.tier},${r.status},${r.created_at}`).join("\n");
  return new Response(`email,tier,status,created_at\n${rows}\n`, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="subscribers.csv"' },
  });
});

app.post("/admin/products", async (c) => {
  const f = await c.req.parseBody();
  const slug = String(f.slug).trim();
  const file = f.file as File | undefined;
  let fileKey: string | null = null;
  if (file && typeof file === "object" && file.size > 0) {
    fileKey = `files/${slug}/${file.name}`;
    await c.env.FILES.put(fileKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  }
  const dollars = parseFloat(String(f.price || "0"));
  await createProduct(c.env.DB, {
    slug, title: String(f.title), summary: String(f.summary || ""), description: String(f.description || ""),
    kind: (String(f.kind) as any) || "plugin",
    price_cents: Math.round((isNaN(dollars) ? 0 : dollars) * 100),
    cover_image: String(f.cover_image || "") || null,
    external_url: String(f.external_url || "") || null,
    sponsored_until: f.sponsored_until ? `${f.sponsored_until} 23:59:59` : null,
    file_key: fileKey,
  });
  return c.redirect("/admin");
});

/* -------------------------------- helpers --------------------------------- */

async function streamFile(env: Bindings, key: string) {
  const obj = await env.FILES.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `attachment; filename="${key.split("/").pop() || "download.bin"}"`);
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
}

export default app;
