import { html, raw } from "hono/html";
import { isSponsored, priceLabel, type Product } from "../types";

function card(p: Product) {
  const sponsored = isSponsored(p);
  return html`<a class="card ${sponsored ? "sponsored" : ""}" href="/p/${p.slug}">
    ${sponsored ? html`<span class="badge">★ Sponsored</span>` : ""}
    <div class="cover" style="background-image:url('${p.cover_image ?? ""}')"></div>
    <div class="card-body">
      <span class="kind">${p.kind}</span>
      <h3>${p.title}</h3>
      <p>${p.summary ?? ""}</p>
      <span class="price">${priceLabel(p.price_cents)}</span>
    </div>
  </a>`;
}

export function homePage(products: Product[], activeKind?: string) {
  const filtered = activeKind
    ? products.filter((p) => p.kind === activeKind)
    : products;
  return html`
    <section class="hero">
      <h1>RPG Maker MZ/MV plugins, assets &amp; tools</h1>
      <p>Download free &amp; premium content, or support the project directly.</p>
    </section>
    <section class="grid">
      ${filtered.length
        ? raw(filtered.map((p) => card(p).toString()).join(""))
        : html`<p class="empty">No items yet. Add some in the admin.</p>`}
    </section>
  `;
}

export function productPage(p: Product) {
  const paid = p.price_cents > 0;
  let action;
  if (p.kind === "generator" && p.external_url) {
    action = html`<a class="btn primary" href="${p.external_url}">Open generator</a>`;
  } else if (paid) {
    action = html`<form method="post" action="/buy/${p.slug}">
      <button class="btn primary" type="submit">Buy · ${priceLabel(p.price_cents)}</button>
    </form>`;
  } else {
    action = html`<a class="btn primary" href="/download/free/${p.slug}">Download (Free)</a>`;
  }

  return html`
    <a class="back" href="/">← All items</a>
    <article class="product">
      <div class="product-cover" style="background-image:url('${p.cover_image ?? ""}')"></div>
      <div class="product-info">
        <span class="kind">${p.kind}</span>
        <h1>${p.title}</h1>
        <p class="summary">${p.summary ?? ""}</p>
        <div class="price-row">
          <span class="price big">${priceLabel(p.price_cents)}</span>
          ${action}
        </div>
        <div class="description">${raw((p.description ?? "").replace(/\n/g, "<br>"))}</div>
      </div>
    </article>
  `;
}

export function successPage(title: string, token: string) {
  return html`
    <section class="notice ok">
      <h1>Thanks for your purchase! 🎉</h1>
      <p>Your download for <strong>${title}</strong> is ready. This link works for 7 days.</p>
      <a class="btn primary" href="/download/${token}">Download now</a>
    </section>
  `;
}

export function messagePage(heading: string, body: string) {
  return html`<section class="notice">
    <h1>${heading}</h1>
    <p>${body}</p>
    <a class="btn" href="/">Back to store</a>
  </section>`;
}

/* -------- Admin -------- */

export function adminLogin(error?: string) {
  return html`
    <section class="admin-login">
      <h1>Admin login</h1>
      ${error ? html`<p class="error">${error}</p>` : ""}
      <form method="post" action="/admin/login">
        <label>Password <input type="password" name="password" required /></label>
        <button class="btn primary" type="submit">Log in</button>
      </form>
    </section>
  `;
}

export function adminDashboard(products: Product[]) {
  const rows = products
    .map(
      (p) => `<tr>
        <td>${p.title}</td><td>${p.kind}</td><td>${priceLabel(p.price_cents)}</td>
        <td>${isSponsored(p) ? "★" : ""}</td><td>${p.file_key ? "✓" : "—"}</td>
      </tr>`
    )
    .join("");

  return html`
    <section class="admin">
      <div class="admin-head">
        <h1>Admin</h1>
        <form method="post" action="/admin/logout"><button class="btn">Log out</button></form>
      </div>

      <h2>Add a product</h2>
      <form class="admin-form" method="post" action="/admin/products" enctype="multipart/form-data">
        <label>Slug <input name="slug" placeholder="quest-log-mz" required /></label>
        <label>Title <input name="title" required /></label>
        <label>Summary <input name="summary" /></label>
        <label>Description <textarea name="description" rows="4"></textarea></label>
        <label>Kind
          <select name="kind">
            <option value="plugin">plugin</option>
            <option value="asset">asset</option>
            <option value="generator">generator</option>
          </select>
        </label>
        <label>Price (USD, e.g. 4.99 — leave 0 for free) <input name="price" value="0" /></label>
        <label>Cover image URL <input name="cover_image" placeholder="https://…" /></label>
        <label>External URL (for generators) <input name="external_url" placeholder="/generators/…" /></label>
        <label>Sponsored until (YYYY-MM-DD, optional) <input name="sponsored_until" /></label>
        <label>Downloadable file (.js / .zip) <input type="file" name="file" /></label>
        <button class="btn primary" type="submit">Create</button>
      </form>

      <h2>Existing products</h2>
      <table class="admin-table">
        <thead><tr><th>Title</th><th>Kind</th><th>Price</th><th>Sponsored</th><th>File</th></tr></thead>
        <tbody>${raw(rows)}</tbody>
      </table>
    </section>
  `;
}
