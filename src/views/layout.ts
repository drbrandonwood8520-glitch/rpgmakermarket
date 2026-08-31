import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

type LayoutOpts = {
  title: string;
  body: HtmlEscapedString | Promise<HtmlEscapedString>;
  kofiUrl?: string;
  patreonUrl?: string;
};

export function layout({ title, body, kofiUrl, patreonUrl }: LayoutOpts) {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title} · RPG Maker Plugins</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="site-header">
          <a class="brand" href="/">🎮 RPG Maker Plugins</a>
          <nav>
            <a href="/?kind=plugin">Plugins</a>
            <a href="/?kind=asset">Assets</a>
            <a href="/?kind=generator">Generators</a>
            ${kofiUrl ? raw(`<a class="support" href="${kofiUrl}" target="_blank" rel="noopener">☕ Ko-fi</a>`) : ""}
            ${patreonUrl ? raw(`<a class="support" href="${patreonUrl}" target="_blank" rel="noopener">Patreon</a>`) : ""}
          </nav>
        </header>
        <main class="container">${body}</main>
        <footer class="site-footer">
          <p>Built on Cloudflare Workers · D1 · R2. &copy; ${new Date().getFullYear()}</p>
          <p><a href="/admin">Admin</a></p>
        </footer>
      </body>
    </html>`;
}
