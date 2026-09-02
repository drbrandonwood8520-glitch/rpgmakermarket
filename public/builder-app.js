// Visual page-builder editor. Loaded by /admin/builder (behind admin auth).
// No build step: Preact + htm come from a CDN, loaded in your browser only.
import { h, render } from "https://esm.sh/preact@10.23.2";
import { useState, useEffect } from "https://esm.sh/preact@10.23.2/hooks";
import htm from "https://esm.sh/htm@3.1.1";
const html = htm.bind(h);

/* ---------- widget registry (add more widgets here) ---------- */
const widgets = {};
const register = (w) => (widgets[w.type] = w);
const defaults = (t) => Object.fromEntries(widgets[t].controls.map((c) => [c.name, c.default ?? ""]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const makeNode = (t) => ({
  id: uid(),
  type: t,
  settings: defaults(t),
  children: widgets[t].isContainer ? [] : undefined,
});

register({
  type: "container",
  title: "Container",
  isContainer: true,
  controls: [
    { name: "gap", label: "Gap (px)", type: "number", default: 12 },
    { name: "padding", label: "Padding (px)", type: "number", default: 24 },
    { name: "align", label: "Align", type: "select", default: "stretch",
      options: { stretch: "Stretch", "flex-start": "Left", center: "Center", "flex-end": "Right" } },
    { name: "background", label: "Background", type: "color", default: "#ffffff" },
  ],
  render: (s, kids) =>
    html`<div style=${{ display: "flex", flexDirection: "column", gap: (+s.gap || 0) + "px",
      padding: (+s.padding || 0) + "px", alignItems: s.align, background: s.background }}>${kids}</div>`,
});

register({
  type: "heading",
  title: "Heading",
  controls: [
    { name: "text", label: "Text", type: "text", default: "Your Heading" },
    { name: "level", label: "Level", type: "select", default: "h2", options: { h1: "H1", h2: "H2", h3: "H3" } },
    { name: "color", label: "Color", type: "color", default: "#111111" },
    { name: "align", label: "Align", type: "select", default: "left", options: { left: "Left", center: "Center", right: "Right" } },
  ],
  render: (s) => {
    const tag = ["h1", "h2", "h3"].includes(s.level) ? s.level : "h2";
    return html`<${tag} style=${{ color: s.color, textAlign: s.align, margin: 0 }}>${s.text}</${tag}>`;
  },
});

register({
  type: "text",
  title: "Text",
  controls: [
    { name: "text", label: "Text", type: "textarea", default: "Some paragraph text." },
    { name: "color", label: "Color", type: "color", default: "#333333" },
    { name: "size", label: "Font size (px)", type: "number", default: 16 },
  ],
  render: (s) =>
    html`<p style=${{ color: s.color, fontSize: (+s.size || 16) + "px", margin: 0, lineHeight: 1.6 }}>${s.text}</p>`,
});

register({
  type: "button",
  title: "Button",
  controls: [
    { name: "label", label: "Label", type: "text", default: "Click me" },
    { name: "href", label: "Link URL", type: "text", default: "#" },
    { name: "bg", label: "Background", type: "color", default: "#2563eb" },
    { name: "color", label: "Text color", type: "color", default: "#ffffff" },
  ],
  render: (s) =>
    html`<a href=${s.href || "#"} onClick=${(e) => e.preventDefault()}
      style=${{ display: "inline-block", padding: "10px 18px", background: s.bg, color: s.color,
        borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}>${s.label}</a>`,
});

/* ---------- immutable tree helpers ---------- */
const mapSettings = (n, id, p) =>
  n.id === id ? { ...n, settings: { ...n.settings, ...p } }
  : { ...n, children: n.children && n.children.map((c) => mapSettings(c, id, p)) };
const insertChild = (n, pid, ch) =>
  n.id === pid ? { ...n, children: [...(n.children || []), ch] }
  : { ...n, children: n.children && n.children.map((c) => insertChild(c, pid, ch)) };
const removeNode = (n, id) =>
  ({ ...n, children: n.children && n.children.filter((c) => c.id !== id).map((c) => removeNode(c, id)) });
const moveChild = (n, id, dir) => {
  if (!n.children) return n;
  const i = n.children.findIndex((c) => c.id === id);
  if (i > -1) {
    const j = i + dir;
    if (j < 0 || j >= n.children.length) return n;
    const a = n.children.slice();
    [a[i], a[j]] = [a[j], a[i]];
    return { ...n, children: a };
  }
  return { ...n, children: n.children.map((c) => moveChild(c, id, dir)) };
};
const findNode = (n, id) => {
  if (n.id === id) return n;
  for (const c of n.children || []) { const r = findNode(c, id); if (r) return r; }
  return null;
};

/* ---------- the ONE renderer; edit mode adds selection chrome ---------- */
function RenderNode({ node, edit, selId, onSel }) {
  const w = widgets[node.type];
  if (!w) return null;
  const kids = (node.children || []).map(
    (c) => html`<${RenderNode} key=${c.id} node=${c} edit=${edit} selId=${selId} onSel=${onSel} />`
  );
  const out = w.render(node.settings, kids);
  if (!edit) return out;
  return html`<div class=${"node" + (selId === node.id ? " sel" : "")}
    onClick=${(e) => { e.stopPropagation(); onSel(node.id); }}>${out}</div>`;
}

/* ---------- settings panel generated from the control schema ---------- */
function Field({ c, value, onChange }) {
  const on = (e) => onChange(e.target.value);
  let input;
  if (c.type === "textarea") input = html`<textarea rows="3" value=${value} onInput=${on}></textarea>`;
  else if (c.type === "select")
    input = html`<select value=${value} onChange=${on}>
      ${Object.entries(c.options || {}).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
    </select>`;
  else if (c.type === "color") input = html`<input type="color" value=${value} onInput=${on} />`;
  else if (c.type === "number") input = html`<input type="number" value=${value} onInput=${on} />`;
  else input = html`<input type="text" value=${value} onInput=${on} />`;
  return html`<label class="field"><span>${c.label}</span>${input}</label>`;
}
function Panel({ node, onChange }) {
  return widgets[node.type].controls.map(
    (c) => html`<${Field} key=${c.name} c=${c} value=${node.settings[c.name]} onChange=${(v) => onChange({ [c.name]: v })} />`
  );
}

/* ---------- app ---------- */
const API = "/admin/builder/api/pages";
const emptyTree = () => ({ id: "root", type: "container", settings: defaults("container"), children: [] });

function App() {
  const [list, setList] = useState([]);
  const [slug, setSlug] = useState(null);
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [tree, setTree] = useState(emptyTree());
  const [selId, setSelId] = useState(null);
  const [status, setStatus] = useState("");

  const refresh = () => fetch(API).then((r) => r.json()).then(setList).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const open = async (s) => {
    const d = await fetch(API + "/" + encodeURIComponent(s)).then((r) => r.json());
    if (!d) return;
    setSlug(d.slug); setTitle(d.title || ""); setPublished(!!d.published); setSelId(null);
    let t; try { t = JSON.parse(d.tree); } catch { t = emptyTree(); }
    setTree(t && t.id ? t : emptyTree());
    setStatus("");
  };
  const create = () => {
    const s = prompt("New page slug (letters, numbers, dashes):", "my-page");
    if (!s) return;
    setSlug(s.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
    setTitle("New page"); setPublished(false); setTree(emptyTree()); setSelId(null);
    setStatus("Unsaved — click Save to create");
  };

  const sel = selId ? findNode(tree, selId) : null;
  const selW = sel ? widgets[sel.type] : null;
  const patch = (p) => selId && setTree((t) => mapSettings(t, selId, p));
  const add = (type) => {
    const parent = sel && selW && selW.isContainer ? sel.id : "root";
    const n = makeNode(type);
    setTree((t) => insertChild(t, parent, n));
    setSelId(n.id);
  };
  const save = async () => {
    if (!slug) { setStatus("Create a page first"); return; }
    setStatus("Saving…");
    try {
      await fetch(API + "/" + encodeURIComponent(slug), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, published, tree }),
      });
      setStatus("Saved ✓"); refresh();
    } catch { setStatus("Save failed"); }
    setTimeout(() => setStatus(""), 2500);
  };
  const del = async () => {
    if (!slug || !confirm("Delete this page?")) return;
    await fetch(API + "/" + encodeURIComponent(slug), { method: "DELETE" });
    setSlug(null); setTree(emptyTree()); setSelId(null); refresh();
  };

  return html`
    <div class="top">
      <button onClick=${create}>+ New page</button>
      <input type="text" placeholder="Page title" value=${title} disabled=${!slug}
        onInput=${(e) => setTitle(e.target.value)} />
      <label style="font-size:13px"><input type="checkbox" checked=${published} disabled=${!slug}
        onChange=${(e) => setPublished(e.target.checked)} /> Published</label>
      <button onClick=${save} disabled=${!slug}>Save</button>
      ${slug && html`<a href=${"/admin/builder/preview/" + slug} target="_blank">Preview</a>`}
      ${slug && published && html`<a href=${"/pg/" + slug} target="_blank">Live ↗</a>`}
      ${slug && html`<button onClick=${del}>Delete</button>`}
      <span class="status">${status}</span>
      <span style="flex:1"></span>
      <a href="/admin">← Admin</a>
    </div>
    <div class="app">
      <div class="list">
        <h4>Pages</h4>
        ${list.length === 0 && html`<p class="hint">No pages yet.</p>`}
        ${list.map((p) => html`<button key=${p.slug} class=${"pg" + (p.slug === slug ? " sel" : "")}
          onClick=${() => open(p.slug)}>${p.title || p.slug}${p.published ? "" : " (draft)"}</button>`)}
      </div>
      <div class="canvas" onClick=${() => setSelId(null)}>
        ${slug
          ? html`<${RenderNode} node=${tree} edit=${true} selId=${selId} onSel=${setSelId} />`
          : html`<p class="hint">Pick a page on the left, or create one.</p>`}
      </div>
      <div class="side">
        ${!slug
          ? html`<p class="hint">No page open.</p>`
          : html`
            <div class="add">
              <b>Add ${sel && selW && selW.isContainer ? "inside selected" : "to page"}</b>
              ${Object.values(widgets).map((w) => html`<button key=${w.type} onClick=${() => add(w.type)}>${w.title}</button>`)}
            </div>
            ${sel
              ? html`
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <b>${selW.title}</b>
                  ${sel.id !== "root" && html`<span style="display:flex;gap:4px">
                    <button onClick=${() => setTree((t) => moveChild(t, sel.id, -1))}>↑</button>
                    <button onClick=${() => setTree((t) => moveChild(t, sel.id, 1))}>↓</button>
                    <button onClick=${() => { setTree((t) => removeNode(t, sel.id)); setSelId(null); }}>Delete</button>
                  </span>`}
                </div>
                <${Panel} node=${sel} onChange=${patch} />`
              : html`<p class="hint">Click an element to edit it.</p>`}`}
      </div>
    </div>`;
}

render(html`<${App} />`, document.getElementById("root"));
