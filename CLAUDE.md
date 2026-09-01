# Project: JS-native visual page builder (personal use)

A drag-and-drop website builder inspired by Elementor's architecture, rebuilt
from scratch in JavaScript for Cloudflare. This is NOT a port of Elementor's
PHP — we reimplement the *concepts* (a page = a tree of nodes; a widget =
a settings schema + a renderer). Elementor's own code is only a reference for
its control-type catalog and data model; do not copy its source.

Personal, non-distributed project.

## Stack (fixed — do not swap without asking)

- **Editor app:** React + Vite, deployed to **Cloudflare Pages**
- **API / SSR:** a **Cloudflare Worker** using **Hono**
- **Storage:** page trees in **Workers KV** for v1 (move to **D1** later if we
  need versioning/history); media in **R2**
- **Drag & drop:** dnd-kit
- **Language:** TypeScript throughout

## Core architecture (the whole engine)

1. **Node** — a page is a tree of nodes. One shape for everything:
   ```ts
   type Node = {
     id: string;
     type: string;              // registered widget id, e.g. "heading", "container"
     settings: Record<string, unknown>;
     children?: Node[];
   };
   ```
2. **Widget registry** — each widget registers a definition:
   `{ type, title, controls: Control[], render(settings, children) }`.
   `controls` is a data schema (name, label, type, tab, default, responsive?),
   NOT hand-built UI.
3. **Single renderer** — ONE `render()` per widget, used by both the editor
   preview and the published page. Do not build two renderers. A recursive
   `RenderNode` walks the tree and calls each widget's `render`.
4. **Schema-driven panel** — the settings panel is generated automatically by
   mapping each control `type` to an input component. Adding a widget or a
   control must never require writing bespoke panel UI.

## Build phases — do these IN ORDER, one per session, commit between each

1. Node type + widget registry + `RenderNode`. Render a hardcoded tree to
   static HTML. Add unit tests for the renderer.
2. Control-type components (textarea, select, choose, color, slider, dimensions,
   typography group) + a panel that auto-generates from a node's `controls`.
3. Selection + live editing: click a node -> panel shows its controls -> edits
   update the tree -> preview re-renders via the same `RenderNode`.
4. Layout: a `container` widget + dnd-kit for reorder/nest.
5. Persistence: Hono Worker with load/save endpoints; store tree JSON in KV.
6. Publish: Worker route that SSRs a saved tree to HTML/CSS (or static export).
7. Port more widgets one at a time, only ones actually needed.

## MVP scope guardrails (resist over-building)

- Single breakpoint first. NO responsive system until phase 7+.
- Inline styles from settings first. NO CSS-generation engine yet.
- No global styles / kit / theme builder in v1.
- Keep the engine (Node, registry, RenderNode) framework-agnostic and tiny;
  React is only the host.

## Working style

- Read this file first. Propose a plan before writing code; wait for approval.
- Work within the current phase only. Flag if a request pulls in a later phase.
- Small, reviewable commits with clear messages.
