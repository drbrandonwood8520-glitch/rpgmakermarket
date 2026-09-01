//=============================================================================
// RSS_FeedDisplay.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Live RSS/Atom feed terminal for RPG Maker MZ. Works on desktop (NW.js) and web builds. Display-only.
 * @author Built with Claude
 * @url
 *
 * @help
 * ============================================================================
 * RSS Feed Display  —  a live "news terminal" inside your game
 * ============================================================================
 *
 * Pulls real RSS 2.0 / RDF / Atom feeds and shows them in an in-game terminal:
 * a headline list on the left and a scrollable article reader on the right.
 * Great for Wall-Street tickers, newsroom sims, cyberpunk terminals, etc.
 *
 * This build is DISPLAY-ONLY (feeds do not change variables or switches).
 *
 * ----------------------------------------------------------------------------
 * DESKTOP vs WEB (important)
 * ----------------------------------------------------------------------------
 * - Desktop (Deployment > Windows/Mac, i.e. NW.js): the plugin uses Node's
 *   networking, so it can fetch ANY feed with no CORS restrictions. Nothing
 *   to configure.
 * - Web (Deployment > Web / browser): browsers block cross-origin requests
 *   (CORS). A feed only loads directly if its server sends CORS headers.
 *   Otherwise set the "CORS Proxy" parameter to a proxy you trust that
 *   prepends to the URL, e.g.  https://your-proxy.example/?url=
 *   The plugin appends the URL-encoded feed URL to whatever you put there.
 *
 * The plugin auto-detects which environment it is in — the SAME plugin file
 * works for both. If "Both / not sure" is your situation, just fill in the
 * CORS Proxy so web builds have a fallback; desktop ignores it.
 *
 * ----------------------------------------------------------------------------
 * SETUP
 * ----------------------------------------------------------------------------
 * 1. Place this file in js/plugins/ and enable it in the Plugin Manager.
 * 2. Open the "Feeds" parameter and add one entry per feed (Name + URL,
 *    optional Category).
 * 3. (Optional) turn on "Add to Main Menu" to give players a menu command.
 *
 * ----------------------------------------------------------------------------
 * OPENING THE TERMINAL FROM AN EVENT (the in-game "computer")
 * ----------------------------------------------------------------------------
 * On any event (a PC, a newspaper stand, a trading terminal), add:
 *   Plugin Command > RSS_FeedDisplay > Open Feed Terminal
 * Optionally set "Start Feed" to a feed Name (or a 0-based index) to open
 * straight to that feed.
 *
 * ----------------------------------------------------------------------------
 * CONTROLS (in the terminal)
 * ----------------------------------------------------------------------------
 *   Up / Down .......... move through headlines
 *   OK (Enter/Z) ....... open the highlighted article for scrolling
 *   Up/Down in reader .. scroll the article; PageUp/Down = jump
 *   Cancel (Esc/X) ..... back out of reader / close terminal
 *   PageUp / PageDown ... switch between feeds (also Q / W)
 *   Shift .............. refresh the current feed now
 *
 * ----------------------------------------------------------------------------
 * NOTES
 * ----------------------------------------------------------------------------
 * - Last-good results are cached, so the terminal shows content instantly and
 *   still displays something (marked OFFLINE) if a later refresh fails.
 * - Only point this at feeds you trust. Article HTML is stripped to plain text
 *   before display; nothing from a feed is ever executed as code.
 * - For a proper "terminal" look, assign a dark WindowSkin to this scene by
 *   using a dark img/system/Window.png, and tweak the color params below.
 *
 * ============================================================================
 *
 * @param feeds
 * @text Feeds
 * @type struct<Feed>[]
 * @desc The RSS/Atom feeds available in the terminal.
 * @default []
 *
 * @param corsProxy
 * @text CORS Proxy (web builds only)
 * @type string
 * @desc Prefix for web builds, e.g. https://proxy.example/?url= . The URL-encoded feed URL is appended. Ignored on desktop.
 * @default
 *
 * @param maxItems
 * @text Max Items Per Feed
 * @type number
 * @min 1
 * @max 200
 * @default 25
 *
 * @param refreshInterval
 * @text Background Refresh (minutes)
 * @type number
 * @min 0
 * @max 1440
 * @desc How often to refresh feeds in the background. 0 = only fetch on boot and when the terminal opens.
 * @default 10
 *
 * @param addToMenu
 * @text Add To Main Menu
 * @type boolean
 * @on Yes
 * @off No
 * @default false
 *
 * @param menuCommandName
 * @text Menu Command Name
 * @type string
 * @default News Feed
 *
 * @param terminalTitle
 * @text Terminal Title
 * @type string
 * @desc Optional label shown before the feed name in the header, e.g. "NET-TERMINAL" or "MARKET WIRE".
 * @default
 *
 * @param accentColor
 * @text Accent Color
 * @type string
 * @desc CSS hex used for status/LIVE, dividers, timestamps.
 * @default #7fe07f
 *
 * @param headlineColor
 * @text Headline Color
 * @type string
 * @desc CSS hex used for headlines and article titles.
 * @default #e6e6e6
 *
 * @command openTerminal
 * @text Open Feed Terminal
 * @desc Opens the RSS terminal scene.
 *
 * @arg feed
 * @text Start Feed
 * @type string
 * @desc Feed Name (or 0-based index) to open first. Leave blank for the first feed.
 * @default
 *
 * @command refreshFeeds
 * @text Refresh All Feeds
 * @desc Triggers a background refresh of every feed.
 */
/*~struct~Feed:
 * @param name
 * @text Name
 * @type string
 * @default Feed
 *
 * @param url
 * @text URL
 * @type string
 * @desc Full RSS/Atom URL, e.g. https://example.com/rss.xml
 * @default
 *
 * @param category
 * @text Category
 * @type string
 * @desc Optional label shown in the header (e.g. Markets, World, Tech).
 * @default
 */

(() => {
  "use strict";

  const PLUGIN_NAME = "RSS_FeedDisplay";
  const raw = PluginManager.parameters(PLUGIN_NAME);

  let feedDefs = [];
  try {
    feedDefs = JSON.parse(raw.feeds || "[]").map((s) => {
      const o = JSON.parse(s);
      return { name: o.name || "Feed", url: (o.url || "").trim(), category: o.category || "" };
    }).filter((f) => f.url);
  } catch (e) {
    console.error(PLUGIN_NAME + ": could not parse Feeds parameter.", e);
  }

  const P = {
    corsProxy: (raw.corsProxy || "").trim(),
    maxItems: Number(raw.maxItems || 25),
    refreshInterval: Number(raw.refreshInterval || 0),
    addToMenu: raw.addToMenu === "true",
    menuCommandName: raw.menuCommandName || "News Feed",
    terminalTitle: raw.terminalTitle || "",
    accentColor: raw.accentColor || "#7fe07f",
    headlineColor: raw.headlineColor || "#e6e6e6",
  };

  //==========================================================================
  // Parsing / text helpers  (validated against RSS 2.0 + Atom + content:encoded)
  //==========================================================================

  function getEls(node, local) {
    let els = node.getElementsByTagNameNS ? node.getElementsByTagNameNS("*", local) : null;
    if (!els || els.length === 0) els = node.getElementsByTagName(local);
    return els;
  }

  function childText(node, tagName) {
    const els = getEls(node, tagName);
    for (let i = 0; i < els.length; i++) {
      if (els[i].textContent != null) return els[i].textContent.trim();
    }
    return "";
  }

  function atomLink(node) {
    const links = getEls(node, "link");
    let href = "";
    for (let i = 0; i < links.length; i++) {
      const rel = links[i].getAttribute("rel");
      const h = links[i].getAttribute("href");
      if (!h) continue;
      if (!rel || rel === "alternate") return h;
      if (!href) href = h;
    }
    return href;
  }

  function stripHtml(html) {
    if (!html) return "";
    let s = html.replace(/<\s*br\s*\/?\s*>/gi, "\n");
    s = s.replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n");
    s = s.replace(/<[^>]*>/g, "");
    try {
      const ta = document.createElement("textarea");
      ta.innerHTML = s; // decodes entities without rendering/executing anything
      s = ta.value;
    } catch (e) { /* keep s as-is */ }
    s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
    return s.trim();
  }

  function parseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function parseFeed(xml, maxItems) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("XML parse error");
    }
    let nodes = doc.getElementsByTagName("item"); // RSS 2.0 / RDF
    let atom = false;
    if (nodes.length === 0) {
      nodes = doc.getElementsByTagName("entry"); // Atom
      atom = true;
    }
    const items = [];
    const limit = maxItems > 0 ? Math.min(nodes.length, maxItems) : nodes.length;
    for (let i = 0; i < limit; i++) {
      const n = nodes[i];
      const title = childText(n, "title") || "(untitled)";
      const link = atom ? atomLink(n) : childText(n, "link");
      const dateStr =
        childText(n, "pubDate") || childText(n, "published") ||
        childText(n, "updated") || childText(n, "date");
      const desc =
        childText(n, "encoded") || childText(n, "description") ||
        childText(n, "summary") || childText(n, "content");
      items.push({
        title: stripHtml(title),
        link: link,
        date: parseDate(dateStr),
        description: stripHtml(desc),
      });
    }
    return items;
  }

  // measure is a width function (this.textWidth in windows)
  function wrapText(text, maxWidth, measure) {
    const out = [];
    const paragraphs = String(text || "").split("\n");
    for (const para of paragraphs) {
      if (para === "") { out.push(""); continue; }
      const words = para.split(" ");
      let line = "";
      for (let w of words) {
        while (measure(w) > maxWidth && w.length > 1) {
          let cut = w.length;
          while (cut > 1 && measure(w.slice(0, cut)) > maxWidth) cut--;
          out.push((line ? line + " " : "") + w.slice(0, cut));
          line = "";
          w = w.slice(cut);
        }
        const test = line ? line + " " + w : w;
        if (measure(test) > maxWidth && line) { out.push(line); line = w; }
        else { line = test; }
      }
      if (line) out.push(line);
    }
    return out;
  }

  function relativeTime(date) {
    if (!date) return "";
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 0) return "just now";
    if (secs < 60) return "just now";
    if (secs < 3600) return Math.floor(secs / 60) + "m ago";
    if (secs < 86400) return Math.floor(secs / 3600) + "h ago";
    return Math.floor(secs / 86400) + "d ago";
  }

  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function formatDate(d) {
    if (!d) return "";
    const pad = (n) => (n < 10 ? "0" : "") + n;
    return MON[d.getMonth()] + " " + d.getDate() + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  //==========================================================================
  // Networking  (NW.js uses Node http/https -> no CORS; web uses fetch + proxy)
  //==========================================================================

  function isNwjs() {
    return typeof require === "function" &&
      typeof process !== "undefined" &&
      !!(process.versions && process.versions.nw);
  }

  function nodeGet(url, redirects) {
    redirects = redirects || 0;
    return new Promise((resolve, reject) => {
      let lib;
      try { lib = require(url.indexOf("https") === 0 ? "https" : "http"); }
      catch (e) { reject(e); return; }
      const opts = {
        headers: {
          "User-Agent": "RPGMakerMZ-RSSFeedDisplay/1.0",
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
      };
      const req = lib.get(url, opts, (res) => {
        const status = res.statusCode;
        if (status >= 300 && status < 400 && res.headers.location && redirects < 5) {
          res.resume();
          let next;
          try { next = new URL(res.headers.location, url).href; }
          catch (e) { next = res.headers.location; }
          resolve(nodeGet(next, redirects + 1));
          return;
        }
        if (status < 200 || status >= 300) { res.resume(); reject(new Error("HTTP " + status)); return; }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    });
  }

  function webGet(url) {
    const target = P.corsProxy ? P.corsProxy + encodeURIComponent(url) : url;
    return fetch(target, {
      headers: { "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  function httpGet(url) {
    return isNwjs() ? nodeGet(url, 0) : webGet(url);
  }

  //==========================================================================
  // Feed manager (singleton state + caching)
  //==========================================================================

  const CACHE_KEY = "RSS_FeedDisplay_cache_v1";

  const RSSFeedManager = {
    feeds: [],
    version: 0,
    currentIndex: 0,

    init() {
      this.feeds = feedDefs.map((d) => ({
        name: d.name, url: d.url, category: d.category,
        items: [], status: "idle", lastUpdated: null, error: null,
      }));
      this.loadCache();
    },

    bump() { this.version++; },

    current() { return this.feeds[this.currentIndex] || null; },

    fetchFeed(i) {
      const f = this.feeds[i];
      if (!f || f.status === "loading") return;
      f.status = "loading";
      f.error = null;
      this.bump();
      httpGet(f.url).then((xml) => {
        f.items = parseFeed(xml, P.maxItems);
        f.status = "ok";
        f.lastUpdated = new Date();
        f.error = null;
        this.saveCache();
        this.bump();
      }).catch((err) => {
        f.status = (f.items && f.items.length) ? "stale" : "error";
        f.error = String((err && err.message) || err);
        this.bump();
      });
    },

    fetchAll() { for (let i = 0; i < this.feeds.length; i++) this.fetchFeed(i); },

    // fetch if never loaded or only from cache
    ensure(i) {
      const f = this.feeds[i];
      if (f && (f.status === "idle" || f.status === "cached")) this.fetchFeed(i);
    },

    saveCache() {
      try {
        const obj = {};
        this.feeds.forEach((f) => {
          if (f.items && f.items.length) {
            obj[f.url] = {
              items: f.items.map((it) => ({
                title: it.title, link: it.link,
                date: it.date ? it.date.getTime() : null,
                description: it.description,
              })),
              lastUpdated: f.lastUpdated ? f.lastUpdated.getTime() : null,
            };
          }
        });
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
      } catch (e) { /* private mode / quota — ignore */ }
    },

    loadCache() {
      try {
        const rawc = window.localStorage.getItem(CACHE_KEY);
        if (!rawc) return;
        const obj = JSON.parse(rawc);
        this.feeds.forEach((f) => {
          const c = obj[f.url];
          if (c && c.items) {
            f.items = c.items.map((it) => ({
              title: it.title, link: it.link,
              date: it.date ? new Date(it.date) : null,
              description: it.description,
            }));
            f.lastUpdated = c.lastUpdated ? new Date(c.lastUpdated) : null;
            f.status = "cached";
          }
        });
      } catch (e) { /* ignore corrupt cache */ }
    },
  };

  //==========================================================================
  // Boot hook
  //==========================================================================

  const _Scene_Boot_start = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function () {
    _Scene_Boot_start.call(this);
    try {
      RSSFeedManager.init();
      RSSFeedManager.fetchAll();
      if (P.refreshInterval > 0) {
        setInterval(() => RSSFeedManager.fetchAll(), P.refreshInterval * 60000);
      }
    } catch (e) {
      console.error(PLUGIN_NAME + ": boot error", e);
    }
  };

  //==========================================================================
  // Window: Header / status bar
  //==========================================================================

  function Window_RSSHeader() { this.initialize(...arguments); }
  Window_RSSHeader.prototype = Object.create(Window_Base.prototype);
  Window_RSSHeader.prototype.constructor = Window_RSSHeader;

  Window_RSSHeader.prototype.initialize = function (rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
  };

  Window_RSSHeader.prototype.statusInfo = function (f) {
    switch (f.status) {
      case "loading": return { text: "\u25CC LOADING", color: "#f0c674" };
      case "ok":      return { text: "\u25CF LIVE",    color: P.accentColor };
      case "cached":  return { text: "\u25D0 CACHED",  color: "#de935f" };
      case "stale":   return { text: "\u25D0 OFFLINE (cached)", color: "#de935f" };
      case "error":   return { text: "\u2715 OFFLINE", color: "#cc6666" };
      default:        return { text: "\u2026", color: "#999999" };
    }
  };

  Window_RSSHeader.prototype.refresh = function () {
    this.contents.clear();
    this.resetFontSettings();
    const w = this.innerWidth;
    const f = RSSFeedManager.current();
    if (!f) {
      this.changeTextColor("#cc6666");
      this.drawText("No feeds configured — add feeds in the Plugin Manager.", 0, 0, w);
      this.resetFontSettings();
      return;
    }
    // Line 1: title + status
    this.contents.fontBold = true;
    this.changeTextColor(P.headlineColor);
    const title = P.terminalTitle ? P.terminalTitle + "  //  " + f.name : f.name;
    this.drawText(title, 0, 0, Math.floor(w * 0.62), "left");
    this.contents.fontBold = false;
    const info = this.statusInfo(f);
    this.changeTextColor(info.color);
    this.drawText(info.text, Math.floor(w * 0.62), 0, Math.floor(w * 0.38), "right");

    // Line 2: meta + hints (smaller)
    const y = this.lineHeight();
    this.contents.fontSize = $gameSystem.mainFontSize() - 8;
    this.changeTextColor(P.accentColor);
    const meta =
      (f.category ? "[" + f.category + "]  " : "") +
      (f.items ? f.items.length : 0) + " items" +
      (f.lastUpdated ? "  \u2022  updated " + relativeTime(f.lastUpdated) : "");
    this.drawText(meta, 0, y, Math.floor(w * 0.5), "left");
    this.changeTextColor("#9aa0a6");
    this.drawText("PgUp/PgDn feed  \u2022  \u2191\u2193 scroll  \u2022  Shift refresh  \u2022  Esc exit",
      Math.floor(w * 0.35), y, Math.floor(w * 0.65), "right");
    this.resetFontSettings();
  };

  //==========================================================================
  // Window: Headline list
  //==========================================================================

  function Window_RSSList() { this.initialize(...arguments); }
  Window_RSSList.prototype = Object.create(Window_Selectable.prototype);
  Window_RSSList.prototype.constructor = Window_RSSList;

  Window_RSSList.prototype.initialize = function (rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.select(0);
    this.refresh();
  };

  Window_RSSList.prototype.maxItems = function () {
    const f = RSSFeedManager.current();
    return f && f.items && f.items.length ? f.items.length : 1;
  };

  Window_RSSList.prototype.itemHeight = function () {
    return this.lineHeight() * 2;
  };

  Window_RSSList.prototype.isCurrentItemEnabled = function () {
    const f = RSSFeedManager.current();
    return !!(f && f.items && f.items.length);
  };

  Window_RSSList.prototype.truncate = function (text, maxWidth) {
    if (this.textWidth(text) <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && this.textWidth(t + "\u2026") > maxWidth) t = t.slice(0, -1);
    return t + "\u2026";
  };

  Window_RSSList.prototype.drawItem = function (index) {
    const f = RSSFeedManager.current();
    const rect = this.itemRect(index);
    const pad = 8;
    if (!f || !f.items || !f.items.length) {
      this.resetFontSettings();
      this.changeTextColor("#9aa0a6");
      let msg = "No items.";
      if (f) {
        if (f.status === "loading") msg = "Loading\u2026";
        else if (f.status === "error") msg = "Offline — could not load feed.";
      } else {
        msg = "No feeds configured.";
      }
      this.drawText(msg, rect.x + pad, rect.y + this.lineHeight() / 2, rect.width - pad * 2);
      this.resetFontSettings();
      return;
    }
    const it = f.items[index];
    this.resetFontSettings();
    this.changeTextColor(P.headlineColor);
    this.drawText(this.truncate(it.title, rect.width - pad * 2), rect.x + pad, rect.y + 2, rect.width - pad * 2);
    this.contents.fontSize = $gameSystem.mainFontSize() - 8;
    this.changeTextColor(P.accentColor);
    const meta = it.date ? formatDate(it.date) + "   " + relativeTime(it.date) : "";
    this.drawText(meta, rect.x + pad, rect.y + this.lineHeight() - 2, rect.width - pad * 2);
    this.resetFontSettings();
  };

  //==========================================================================
  // Window: Article reader (scrollable)
  //==========================================================================

  function Window_RSSDetail() { this.initialize(...arguments); }
  Window_RSSDetail.prototype = Object.create(Window_Base.prototype);
  Window_RSSDetail.prototype.constructor = Window_RSSDetail;

  Window_RSSDetail.prototype.initialize = function (rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._item = null;
    this._lines = [];
    this._offset = 0;
    this.refresh();
  };

  Window_RSSDetail.prototype.setItem = function (item) {
    this._item = item;
    this._offset = 0;
    this.rebuild();
    this.refresh();
  };

  Window_RSSDetail.prototype.rebuild = function () {
    this._lines = [];
    if (!this._item) return;
    const w = this.innerWidth - 16;
    const measure = (s) => this.textWidth(s);
    this.resetFontSettings();

    this.contents.fontBold = true;
    const titleLines = wrapText(this._item.title, w, measure);
    this.contents.fontBold = false;
    const bodyLines = wrapText(this._item.description || "(no description provided)", w, measure);
    this.resetFontSettings();

    titleLines.forEach((l) => this._lines.push({ t: "title", s: l }));
    if (this._item.date) this._lines.push({ t: "meta", s: formatDate(this._item.date) });
    if (this._item.link) this._lines.push({ t: "meta", s: this._item.link });
    this._lines.push({ t: "rule" });
    bodyLines.forEach((l) => this._lines.push({ t: "body", s: l }));
  };

  Window_RSSDetail.prototype.visibleLines = function () {
    return Math.floor(this.innerHeight / this.lineHeight());
  };

  Window_RSSDetail.prototype.maxOffset = function () {
    return Math.max(0, this._lines.length - this.visibleLines());
  };

  Window_RSSDetail.prototype.scroll = function (delta) {
    const next = Math.max(0, Math.min(this.maxOffset(), this._offset + delta));
    if (next !== this._offset) { this._offset = next; this.refresh(); }
  };

  Window_RSSDetail.prototype.refresh = function () {
    this.contents.clear();
    this.resetFontSettings();
    const pad = 8;
    if (!this._item) {
      this.changeTextColor("#9aa0a6");
      this.drawText("Select a headline to read.", pad, 0, this.innerWidth - pad * 2);
      this.resetFontSettings();
      return;
    }
    const lh = this.lineHeight();
    const vis = this.visibleLines();
    for (let i = 0; i < vis; i++) {
      const li = this._offset + i;
      if (li >= this._lines.length) break;
      const ln = this._lines[li];
      const y = i * lh;
      if (ln.t === "title") {
        this.contents.fontBold = true;
        this.changeTextColor(P.headlineColor);
        this.drawText(ln.s, pad, y, this.innerWidth - pad * 2);
        this.contents.fontBold = false;
      } else if (ln.t === "meta") {
        this.contents.fontSize = $gameSystem.mainFontSize() - 8;
        this.changeTextColor(P.accentColor);
        this.drawText(ln.s, pad, y + 4, this.innerWidth - pad * 2);
        this.resetFontSettings();
      } else if (ln.t === "rule") {
        this.contents.fillRect(pad, y + Math.floor(lh / 2), this.innerWidth - pad * 2, 2, P.accentColor);
      } else {
        this.resetTextColor();
        this.drawText(ln.s, pad, y, this.innerWidth - pad * 2);
      }
    }
    if (this.maxOffset() > 0) {
      const pct = Math.round((this._offset / this.maxOffset()) * 100);
      this.contents.fontSize = $gameSystem.mainFontSize() - 8;
      this.changeTextColor(P.accentColor);
      const arrow = this._offset >= this.maxOffset() ? "\u25B2" : "\u25BC";
      this.drawText(arrow + " " + pct + "%", this.innerWidth - 96, this.innerHeight - lh, 88, "right");
      this.resetFontSettings();
    }
  };

  //==========================================================================
  // Scene
  //==========================================================================

  function Scene_RSSFeed() { this.initialize(...arguments); }
  Scene_RSSFeed.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_RSSFeed.prototype.constructor = Scene_RSSFeed;
  Scene_RSSFeed.startIndex = 0;

  Scene_RSSFeed.prototype.create = function () {
    Scene_MenuBase.prototype.create.call(this);
    const n = RSSFeedManager.feeds.length;
    RSSFeedManager.currentIndex = n > 0 ? Math.min(Math.max(0, Scene_RSSFeed.startIndex), n - 1) : 0;
    RSSFeedManager.ensure(RSSFeedManager.currentIndex);
    this._lastVersion = RSSFeedManager.version;
    this._lastIndex = -1;
    this._detailActive = false;
    this.createHeaderWindow();
    this.createListWindow();
    this.createDetailWindow();
    this.syncDetailToSelection();
  };

  Scene_RSSFeed.prototype.headerHeight = function () {
    return this.calcWindowHeight(2, false);
  };

  Scene_RSSFeed.prototype.createHeaderWindow = function () {
    const rect = new Rectangle(0, 0, Graphics.boxWidth, this.headerHeight());
    this._headerWindow = new Window_RSSHeader(rect);
    this.addWindow(this._headerWindow);
  };

  Scene_RSSFeed.prototype.createListWindow = function () {
    const y = this.headerHeight();
    const w = Math.floor(Graphics.boxWidth * 0.42);
    const h = Graphics.boxHeight - y;
    const rect = new Rectangle(0, y, w, h);
    this._listWindow = new Window_RSSList(rect);
    this._listWindow.setHandler("ok", this.onListOk.bind(this));
    this._listWindow.setHandler("cancel", this.popScene.bind(this));
    this._listWindow.setHandler("pagedown", this.nextFeed.bind(this));
    this._listWindow.setHandler("pageup", this.prevFeed.bind(this));
    this.addWindow(this._listWindow);
    this._listWindow.activate();
  };

  Scene_RSSFeed.prototype.createDetailWindow = function () {
    const y = this.headerHeight();
    const x = Math.floor(Graphics.boxWidth * 0.42);
    const w = Graphics.boxWidth - x;
    const h = Graphics.boxHeight - y;
    const rect = new Rectangle(x, y, w, h);
    this._detailWindow = new Window_RSSDetail(rect);
    this.addWindow(this._detailWindow);
  };

  Scene_RSSFeed.prototype.syncDetailToSelection = function () {
    const f = RSSFeedManager.current();
    const idx = this._listWindow ? this._listWindow.index() : 0;
    const item = f && f.items && f.items[idx] ? f.items[idx] : null;
    this._detailWindow.setItem(item);
    this._lastIndex = idx;
  };

  Scene_RSSFeed.prototype.onListOk = function () {
    // enabled check already guarantees items exist
    this._detailActive = true;
    this._listWindow.deactivate();
  };

  Scene_RSSFeed.prototype.focusList = function () {
    this._detailActive = false;
    this._listWindow.activate();
  };

  Scene_RSSFeed.prototype.nextFeed = function () { this.changeFeed(1); };
  Scene_RSSFeed.prototype.prevFeed = function () { this.changeFeed(-1); };

  Scene_RSSFeed.prototype.changeFeed = function (dir) {
    const n = RSSFeedManager.feeds.length;
    if (n <= 1) { this._listWindow.activate(); return; }
    SoundManager.playCursor();
    RSSFeedManager.currentIndex = (RSSFeedManager.currentIndex + dir + n) % n;
    RSSFeedManager.ensure(RSSFeedManager.currentIndex);
    this._detailActive = false;
    this._listWindow.select(0);
    this._headerWindow.refresh();
    this._listWindow.refresh();
    this.syncDetailToSelection();
    this._listWindow.activate();
  };

  Scene_RSSFeed.prototype.update = function () {
    Scene_MenuBase.prototype.update.call(this);

    // New data landed for any feed -> refresh the visible windows.
    if (this._lastVersion !== RSSFeedManager.version) {
      this._lastVersion = RSSFeedManager.version;
      this._headerWindow.refresh();
      this._listWindow.refresh();
      this.syncDetailToSelection();
    }

    if (this._detailActive) {
      if (Input.isRepeated("down")) this._detailWindow.scroll(1);
      if (Input.isRepeated("up")) this._detailWindow.scroll(-1);
      if (Input.isTriggered("pagedown")) this._detailWindow.scroll(this._detailWindow.visibleLines() - 1);
      if (Input.isTriggered("pageup")) this._detailWindow.scroll(-(this._detailWindow.visibleLines() - 1));
      if (Input.isTriggered("cancel") || Input.isTriggered("ok")) {
        SoundManager.playCancel();
        this.focusList();
      }
    } else {
      if (this._listWindow.index() !== this._lastIndex) {
        this.syncDetailToSelection();
      }
      if (Input.isTriggered("shift")) {
        SoundManager.playCursor();
        RSSFeedManager.fetchFeed(RSSFeedManager.currentIndex);
      }
    }
  };

  //==========================================================================
  // Plugin commands
  //==========================================================================

  PluginManager.registerCommand(PLUGIN_NAME, "openTerminal", (args) => {
    let idx = 0;
    const key = (args.feed || "").trim();
    if (key) {
      const byName = RSSFeedManager.feeds.findIndex((f) => f.name === key);
      if (byName >= 0) idx = byName;
      else {
        const asNum = parseInt(key, 10);
        if (!isNaN(asNum)) idx = asNum;
      }
    }
    Scene_RSSFeed.startIndex = idx;
    SceneManager.push(Scene_RSSFeed);
  });

  PluginManager.registerCommand(PLUGIN_NAME, "refreshFeeds", () => {
    RSSFeedManager.fetchAll();
  });

  //==========================================================================
  // Optional main-menu integration
  //==========================================================================

  if (P.addToMenu) {
    const _addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function () {
      _addOriginalCommands.call(this);
      this.addCommand(P.menuCommandName, "rssFeed", true);
    };

    const _createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function () {
      _createCommandWindow.call(this);
      this._commandWindow.setHandler("rssFeed", this.commandRssFeed.bind(this));
    };

    Scene_Menu.prototype.commandRssFeed = function () {
      Scene_RSSFeed.startIndex = 0;
      SceneManager.push(Scene_RSSFeed);
    };
  }

  // Expose for other plugins / debugging
  window.RSSFeedManager = RSSFeedManager;
  window.Scene_RSSFeed = Scene_RSSFeed;
})();
