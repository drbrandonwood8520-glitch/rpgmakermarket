import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

/* ============ data model ============ */
type Ctrl = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "color" | "number";
  options?: Record<string, string>;
  default?: any;
};
type Widget = {
  type: string;
  title: string;
  isContainer?: boolean;
  controls: Ctrl[];
  render: (s: any, kids: React.ReactNode) => React.ReactNode;
};
type Node = { id: string; type: string; settings: Record<string, any>; children?: Node[] };

/* ============ widget registry ============ */
const widgets: Record<string, Widget> = {};
const register = (w: Widget) => (widgets[w.type] = w);
const defaults = (t: string) =>
  Object.fromEntries(widgets[t].controls.map((c) => [c.name, c.default ?? ""]));
const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const makeNode = (t: string): Node => ({
  id: uid(),
  type: t,
  settings: defaults(t),
  children: widgets[t].isContainer ? [] : undefined,
});

/* ============ widgets (add more here) ============ */
register({
  type: "container",
  title: "Container",
  isContainer: true,
  controls: [
    { name: "gap", label: "Gap (px)", type: "number", default: 12 },
    { name: "padding", label: "Padding (px)", type: "number", default: 16 },
    {
      name: "align",
      label: "Align",
      type: "select",
      default: "stretch",
      options: { stretch: "Stretch", "flex-start": "Left", center: "Center", "flex-end": "Right" },
    },
    { name: "background", label: "Background", type: "color", default: "#ffffff" },
  ],
  render: (s, kids) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: +s.gap || 0,
        padding: +s.padding || 0,
        alignItems: s.align,
        background: s.background,
      }}
    >
      {kids}
    </div>
  ),
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
    const Tag: any = ["h1", "h2", "h3"].includes(s.level) ? s.level : "h2";
    return <Tag style={{ color: s.color, textAlign: s.align, margin: 0 }}>{s.text}</Tag>;
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
  render: (s) => <p style={{ color: s.color, fontSize: +s.size || 16, margin: 0 }}>{s.text}</p>,
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
  render: (s) => (
    <a
      href={s.href || "#"}
      style={{
        display: "inline-block",
        padding: "10px 18px",
        background: s.bg,
        color: s.color,
        borderRadius: 6,
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      {s.label}
    </a>
  ),
});

/* ============ immutable tree helpers ============ */
const mapSettings = (n: Node, id: string, patch: any): Node =>
  n.id === id
    ? { ...n, settings: { ...n.settings, ...patch } }
    : { ...n, children: n.children?.map((c) => mapSettings(c, id, patch)) };

const insertChild = (n: Node, parentId: string, child: Node): Node =>
  n.id === parentId
    ? { ...n, children: [...(n.children ?? []), child] }
    : { ...n, children: n.children?.map((c) => insertChild(c, parentId, child)) };

const removeNode = (n: Node, id: string): Node => ({
  ...n,
  children: n.children?.filter((c) => c.id !== id).map((c) => removeNode(c, id)),
});

const moveChild = (n: Node, id: string, dir: number): Node => {
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

const findNode = (n: Node, id: string): Node | null => {
  if (n.id === id) return n;
  for (const c of n.children ?? []) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
};

/* ============ the ONE renderer (edit + published) ============ */
function RenderNode({
  node,
  edit,
  selId,
  onSel,
}: {
  node: Node;
  edit?: boolean;
  selId?: string | null;
  onSel?: (id: string) => void;
}) {
  const w = widgets[node.type];
  if (!w) return null;
  const kids = node.children?.map((c) => (
    <RenderNode key={c.id} node={c} edit={edit} selId={selId} onSel={onSel} />
  ));
  const out = w.render(node.settings, kids);
  if (!edit) return <>{out}</>;
  return (
    <div
      className={"node" + (selId === node.id ? " sel" : "")}
      onClick={(e) => {
        e.stopPropagation();
        onSel?.(node.id);
      }}
    >
      {out}
    </div>
  );
}

/* ============ schema-driven settings panel ============ */
function Field({ c, value, onChange }: { c: Ctrl; value: any; onChange: (v: any) => void }) {
  const p = { value: value ?? "", onChange: (e: any) => onChange(e.target.value) };
  let input: React.ReactNode;
  if (c.type === "textarea") input = <textarea rows={3} {...p} />;
  else if (c.type === "select")
    input = (
      <select {...p}>
        {Object.entries(c.options || {}).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    );
  else if (c.type === "color") input = <input type="color" {...p} />;
  else if (c.type === "number") input = <input type="number" {...p} />;
  else input = <input type="text" {...p} />;
  return (
    <label className="field">
      <span>{c.label}</span>
      {input}
    </label>
  );
}

function Panel({ node, onChange }: { node: Node; onChange: (patch: any) => void }) {
  return (
    <>
      {widgets[node.type].controls.map((c) => (
        <Field key={c.name} c={c} value={node.settings[c.name]} onChange={(v) => onChange({ [c.name]: v })} />
      ))}
    </>
  );
}

/* ============ app ============ */
const PAGE_ID = "home";
const API = "/api/pages/" + PAGE_ID;
const empty: Node = { id: "root", type: "container", settings: defaults("container"), children: [] };

function App() {
  const [tree, setTree] = useState<Node>(empty);
  const [selId, setSelId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const view = new URLSearchParams(location.search).has("view");

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((d) => d && setTree(d))
      .catch(() => {});
  }, []);

  if (view) return <RenderNode node={tree} edit={false} />;

  const sel = selId ? findNode(tree, selId) : null;
  const selW = sel ? widgets[sel.type] : null;

  const patch = (p: any) => selId && setTree((t) => mapSettings(t, selId, p));
  const add = (type: string) => {
    const parent = sel && selW?.isContainer ? sel.id : "root";
    const n = makeNode(type);
    setTree((t) => insertChild(t, parent, n));
    setSelId(n.id);
  };
  const save = async () => {
    setStatus("Saving…");
    try {
      await fetch(API, { method: "PUT", body: JSON.stringify(tree) });
      setStatus("Saved ✓");
    } catch {
      setStatus("Save failed");
    }
    setTimeout(() => setStatus(""), 2000);
  };

  return (
    <div className="app">
      <div className="canvas" onClick={() => setSelId(null)}>
        <RenderNode node={tree} edit selId={selId} onSel={setSelId} />
      </div>
      <div className="side">
        <div className="bar">
          <button onClick={save}>Save</button>
          <a href="?view" target="_blank">Preview</a>
          <span className="status">{status}</span>
        </div>
        <div className="add">
          <b>Add {sel && selW?.isContainer ? "inside selected" : "to page"}</b>
          {Object.values(widgets).map((w) => (
            <button key={w.type} onClick={() => add(w.type)}>{w.title}</button>
          ))}
        </div>
        {sel ? (
          <div className="props">
            <div className="phead">
              <b>{selW?.title}</b>
              {sel.id !== "root" && (
                <span>
                  <button onClick={() => setTree((t) => moveChild(t, sel.id, -1))}>↑</button>
                  <button onClick={() => setTree((t) => moveChild(t, sel.id, 1))}>↓</button>
                  <button
                    onClick={() => {
                      setTree((t) => removeNode(t, sel.id));
                      setSelId(null);
                    }}
                  >
                    Delete
                  </button>
                </span>
              )}
            </div>
            <Panel node={sel} onChange={patch} />
          </div>
        ) : (
          <p className="hint">Click an element to edit it.</p>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
