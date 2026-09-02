import type { Hono } from "hono";
import type { Bindings } from "./types";

type App = Hono<{ Bindings: Bindings }>;
type Node = { id: string; type: string; settings: Record<string, any>; children?: Node[] };

const EMPTY: Node = { id: "root", type: "container", settings: {}, children: [] };

const esc = (s: any) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[m])
  );

/* -------- server-side render of a page tree (for public /pg/:slug) --------
   Keep every `case` here in sync with a register({...}) in public/builder-app.js */
function renderNode(n: Node): string {
  const s = n.settings || {};
  const kids = (n.children || []).map(renderNode).join("");
  switch (n.type) {
    case "container": {
      const mw = +s.maxWidth || 0;
      const style = [
        "display:flex",
        `flex-direction:${esc(s.direction || "column")}`,
        `justify-content:${esc(s.justify || "flex-start")}`,
        `align-items:${esc(s.align || "stretch")}`,
        `flex-wrap:${esc(s.wrap || "wrap")}`,
        `gap:${+s.gap || 0}px`,
        `padding:${+s.padding || 0}px`,
        `background:${esc(s.background || "transparent")}`,
        mw ? `max-width:${mw}px;margin-left:auto;margin-right:auto` : "",
      ].filter(Boolean).join(";");
      return `<div style="${style}">${kids}</div>`;
    }
    case "grid": {
      const cols = Math.max(1, +s.columns || 1);
      return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${
        +s.gap || 0
      }px;padding:${+s.padding || 0}px">${kids}</div>`;
    }
    case "heading": {
      const tag = ["h1", "h2", "h3"].includes(s.level) ? s.level : "h2";
      return `<${tag} style="color:${esc(s.color || "#111")};text-align:${esc(
        s.align || "left"
      )};margin:0">${esc(s.text)}</${tag}>`;
    }
    case "text":
      return `<p style="color:${esc(s.color || "#333")};font-size:${
        +s.size || 16
      }px;text-align:${esc(s.align || "left")};margin:0;line-height:1.6">${esc(s.text)}</p>`;
    case "button":
      return `<div style="text-align:${esc(s.align || "left")}"><a href="${esc(
        s.href || "#"
      )}" style="display:inline-block;padding:10px 18px;background:${esc(
        s.bg || "#2563eb"
      )};color:${esc(s.color || "#fff")};border-radius:6px;text-decoration:none;font-weight:600">${esc(
        s.label
      )}</a></div>`;
    case "image":
      return `<div style="text-align:${esc(s.align || "center")}"><img src="${esc(
        s.src
      )}" alt="${esc(s.alt)}" style="width:${+s.width || 100}%;max-width:100%;border-radius:${
        +s.radius || 0
      }px;display:inline-block"/></div>`;
    case "spacer":
      return `<div style="height:${+s.height || 0}px"></div>`;
    case "divider":
      return `<hr style="border:none;border-top:${+s.thickness || 1}px solid ${esc(
        s.color || "#e5e7eb"
      )};margin:${+s.margin || 0}px 0"/>`;
    default:
      return "";
  }
}

// Minimal standalone shell for published pages. Upgrade later by passing
// `renderNode(tree)` into your existing `page()` layout for full site chrome.
const publicShell = (title: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(
    title
  )}</title><style>body{margin:0;font-family:system-ui,sans-serif}main{max-width:1100px;margin:0 auto}img{height:auto}</style></head><body><main>${body}</main></body></html>`;

// Editor entry (served behind /admin auth). Loads the app script from /public.
const editorShell = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page Builder</title>
<style>
*{box-sizing:border-box;font-family:system-ui,sans-serif}body{margin:0}
.top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid #e5e7eb;background:#fff}
.top input[type=text]{padding:5px;border:1px solid #d1d5db;border-radius:5px;font-size:13px}
.app{display:flex;height:calc(100vh - 49px)}
.list{width:200px;border-right:1px solid #e5e7eb;padding:10px;overflow:auto;background:#fafafa}
.list h4{margin:6px 0}
.list .pg{display:block;width:100%;text-align:left;margin:2px 0}
.list .pg.sel{background:#e0e7ff;border-color:#93c5fd}
.canvas{flex:1;overflow:auto;padding:24px;background:#f3f4f6}
.side{width:300px;border-left:1px solid #e5e7eb;background:#fff;overflow:auto;padding:12px}
.node:hover{outline:1px dashed #93c5fd}.node.sel{outline:2px solid #2563eb}
.status{font-size:12px;color:#16a34a}
.add{margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px}.add b{width:100%;font-size:12px;color:#6b7280}
button{cursor:pointer;padding:5px 10px;border:1px solid #d1d5db;background:#fff;border-radius:6px;font-size:13px}button:hover{background:#f9fafb}
.field{display:block;margin-bottom:10px;font-size:12px;color:#374151}.field span{display:block;margin-bottom:3px}
.field input,.field textarea,.field select{width:100%;padding:5px;border:1px solid #d1d5db;border-radius:5px;font-size:13px}
.field input[type=color]{height:32px;padding:2px}
.hint{color:#9ca3af;font-size:13px}
</style></head><body><div id="root">Loading…</div>
<script type="module" src="/builder-app.js"></script>
</body></html>`;

/* -------------------------------- D1 access ------------------------------- */
function loadPage(db: D1Database, slug: string) {
  return db
    .prepare(`SELECT slug,title,tree,published FROM pages WHERE slug=?`)
    .bind(slug)
    .first<{ slug: string; title: string; tree: string; published: number }>();
}
async function listPages(db: D1Database) {
  const { results } = await db
    .prepare(`SELECT slug,title,published,updated_at FROM pages ORDER BY updated_at DESC`)
    .all();
  return results ?? [];
}
function upsertPage(db: D1Database, slug: string, title: string, tree: string, published: number) {
  return db
    .prepare(
      `INSERT INTO pages (slug,title,tree,published,updated_at)
       VALUES (?,?,?,?,datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         title=excluded.title, tree=excluded.tree,
         published=excluded.published, updated_at=datetime('now')`
    )
    .bind(slug, title, tree, published)
    .run();
}
const parseTree = (raw: string): Node => {
  try {
    const t = JSON.parse(raw);
    return t && t.id ? t : EMPTY;
  } catch {
    return EMPTY;
  }
};

/* --------------------------------- routes --------------------------------- */
// Call this once in src/index.ts, AFTER the /admin/* auth middleware:
//   registerBuilder(app);
export function registerBuilder(app: App) {
  app.get("/pg/:slug", async (c) => {
    const row = await loadPage(c.env.DB, c.req.param("slug"));
    if (!row || !row.published) return c.notFound();
    return c.html(publicShell(row.title, renderNode(parseTree(row.tree))));
  });

  app.get("/admin/builder", (c) => c.html(editorShell));

  app.get("/admin/builder/preview/:slug", async (c) => {
    const row = await loadPage(c.env.DB, c.req.param("slug"));
    if (!row) return c.notFound();
    return c.html(publicShell(row.title + " — preview", renderNode(parseTree(row.tree))));
  });

  app.get("/admin/builder/api/pages", async (c) => c.json(await listPages(c.env.DB)));

  app.get("/admin/builder/api/pages/:slug", async (c) => {
    const row = await loadPage(c.env.DB, c.req.param("slug"));
    return c.json(row ?? null);
  });

  app.put("/admin/builder/api/pages/:slug", async (c) => {
    const slug = (c.req.param("slug") || "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug) return c.json({ ok: false, error: "bad slug" }, 400);
    const b: any = await c.req.json().catch(() => ({}));
    const tree = typeof b.tree === "string" ? b.tree : JSON.stringify(b.tree ?? {});
    await upsertPage(c.env.DB, slug, b.title || "Untitled", tree, b.published ? 1 : 0);
    return c.json({ ok: true, slug });
  });

  app.delete("/admin/builder/api/pages/:slug", async (c) => {
    await c.env.DB.prepare(`DELETE FROM pages WHERE slug=?`).bind(c.req.param("slug")).run();
    return c.json({ ok: true });
  });
}
