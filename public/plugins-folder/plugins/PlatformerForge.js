/*:
 * @target MZ
 * @plugindesc PlatformerForge — a drag-n-drop side-scroller level editor & engine. Build 2D platformers in minutes using your own MZ tilesets. v1.0.0
 * @author Claude (for you)
 * @url
 *
 * @help
 * ============================================================================
 * PlatformerForge  v1.0.0
 * ============================================================================
 * Turn RPG Maker MZ into a Mario-style side-scroller studio.
 *
 * ROLE OF THIS PLUGIN
 *   MZ is a top-down, grid RPG engine. This plugin adds (1) its own platformer
 *   physics (gravity, jumping, AABB collision) and (2) a custom in-game
 *   drag-n-drop editor. Everything runs at game-time — it does NOT modify the
 *   MZ desktop editor.
 *
 * QUICK START
 *   1. Put your ground/decor art in a normal MZ tileset (Database > Tilesets).
 *      Any B/C/D/E page works; A-pages (autotiles) are supported as flat tiles.
 *   2. Add this plugin. Set "Default Tileset ID" to that tileset.
 *   3. In a map, press the Editor Hotkey (default F10) — or use the Plugin
 *      Command "Open Editor". Build a level, hit Test Play.
 *   4. Ship a level to players with the "Play Level" plugin command.
 *
 * EDITOR CONTROLS
 *   Left click / drag ....... use current tool (Paint / Erase / Entity / Select)
 *   Right click / drag ...... quick-erase
 *   Mouse wheel ............. scroll horizontally  (Shift+wheel = vertical)
 *   Arrow keys / WASD ....... pan camera
 *   Space + drag ............ pan camera
 *   Palette (right panel) ... click a tile or entity to select it
 *   Material buttons ........ set behavior of painted tiles (Solid/1-way/etc.)
 *   Toolbar buttons ......... Paint, Erase, Entity, Select, Save, Load, Play
 *   Delete / Backspace ...... delete selected entity (Select tool)
 *
 * PLAY CONTROLS
 *   Left / Right (or A/D) ... move
 *   Up / W / Space / Z ...... jump  (hold for higher jumps)
 *   Esc / X ................. back to editor (when launched from editor)
 *
 * MATERIALS (tile behavior)
 *   Solid ...... blocks from all sides
 *   One-way .... stand on top, jump up through it
 *   Hazard ..... hurts the player on touch (spikes/lava art)
 *   Decor ...... no collision (background dressing)
 *
 * ENTITIES
 *   Player Start, Coin, Walker enemy, Flyer enemy, Grow Power-up,
 *   Moving Platform (drag to set a 2nd waypoint), Checkpoint, Goal Flag.
 *
 * All physics values are plugin parameters so you can tune game feel.
 * ============================================================================
 *
 * @param ----Game Feel----
 * @default
 *
 * @param gridSize
 * @parent ----Game Feel----
 * @text Grid / Tile Size (px)
 * @type number
 * @min 8
 * @default 48
 *
 * @param gravity
 * @parent ----Game Feel----
 * @text Gravity
 * @desc Downward acceleration per frame (px/frame^2).
 * @default 0.55
 *
 * @param maxFall
 * @parent ----Game Feel----
 * @text Max Fall Speed
 * @default 13
 *
 * @param runAccel
 * @parent ----Game Feel----
 * @text Run Acceleration
 * @default 0.7
 *
 * @param runMax
 * @parent ----Game Feel----
 * @text Max Run Speed
 * @default 5.5
 *
 * @param friction
 * @parent ----Game Feel----
 * @text Ground Friction (0-1)
 * @desc Lower = more slippery. Multiplied into velocity when no input.
 * @default 0.72
 *
 * @param airControl
 * @parent ----Game Feel----
 * @text Air Control (0-1)
 * @default 0.65
 *
 * @param jumpVelocity
 * @parent ----Game Feel----
 * @text Jump Strength
 * @default 11.5
 *
 * @param jumpCut
 * @parent ----Game Feel----
 * @text Jump Cut Factor (0-1)
 * @desc Velocity kept when jump released early (variable height).
 * @default 0.45
 *
 * @param coyoteFrames
 * @parent ----Game Feel----
 * @text Coyote Time (frames)
 * @type number
 * @default 6
 *
 * @param jumpBufferFrames
 * @parent ----Game Feel----
 * @text Jump Buffer (frames)
 * @type number
 * @default 6
 *
 * @param bounceVelocity
 * @parent ----Game Feel----
 * @text Stomp Bounce Strength
 * @default 8
 *
 * @param ----Defaults----
 * @default
 *
 * @param defaultTilesetId
 * @parent ----Defaults----
 * @text Default Tileset ID
 * @type number
 * @min 1
 * @default 1
 *
 * @param parallaxName
 * @parent ----Defaults----
 * @text Parallax Background
 * @desc Image from img/parallaxes/ used as scrolling background. Blank = none.
 * @type file
 * @dir img/parallaxes/
 * @default
 *
 * @param parallaxRate
 * @parent ----Defaults----
 * @text Parallax Scroll Rate
 * @desc 0 = fixed, 1 = moves with camera. Try 0.35.
 * @default 0.35
 *
 * @param playerChar
 * @parent ----Defaults----
 * @text Player Sprite
 * @type file
 * @dir img/characters/
 * @default Actor1
 *
 * @param playerIndex
 * @parent ----Defaults----
 * @text Player Sprite Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @param enemyChar
 * @parent ----Defaults----
 * @text Enemy Sprite
 * @type file
 * @dir img/characters/
 * @default Monster
 *
 * @param enemyIndex
 * @parent ----Defaults----
 * @text Enemy Sprite Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @param coinChar
 * @parent ----Defaults----
 * @text Coin / Item Sprite
 * @type file
 * @dir img/characters/
 * @default !Crystal
 *
 * @param coinIndex
 * @parent ----Defaults----
 * @text Coin Sprite Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @param startLives
 * @parent ----Defaults----
 * @text Starting Lives
 * @type number
 * @default 3
 *
 * @param ----Editor UI----
 * @default
 *
 * @param editorHotkey
 * @parent ----Editor UI----
 * @text Editor Hotkey (keyCode)
 * @desc JS keyCode to open the editor from a map. 121 = F10. 0 = disabled.
 * @type number
 * @default 121
 *
 * @param colorBg
 * @parent ----Editor UI----
 * @text Canvas Background
 * @default #1b2030
 *
 * @param colorPanel
 * @parent ----Editor UI----
 * @text Panel Color
 * @default #232a3d
 *
 * @param colorPanel2
 * @parent ----Editor UI----
 * @text Panel Color (raised)
 * @default #2c3550
 *
 * @param colorAccent
 * @parent ----Editor UI----
 * @text Accent Color
 * @default #4ea1ff
 *
 * @param colorGrid
 * @parent ----Editor UI----
 * @text Grid Line Color
 * @default rgba(255,255,255,0.06)
 *
 * @param colorText
 * @parent ----Editor UI----
 * @text Text Color
 * @default #e7ecf5
 *
 * @command openEditor
 * @text Open Editor
 * @desc Opens the drag-n-drop level editor.
 * @arg levelName
 * @text Load Level (optional)
 * @desc Name of a saved level to open. Blank = new level.
 * @default
 *
 * @command playLevel
 * @text Play Level
 * @desc Loads a saved level and plays it as a platformer.
 * @arg levelName
 * @text Level Name
 * @default
 * @arg returnToEditor
 * @text Allow Return to Editor
 * @type boolean
 * @default false
 */

(() => {
  "use strict";

  const PLUGIN_NAME = "PlatformerForge";
  const RAW = PluginManager.parameters(PLUGIN_NAME);

  const num = (k, d) => {
    const v = Number(RAW[k]);
    return Number.isFinite(v) ? v : d;
  };
  const str = (k, d) => (RAW[k] != null && RAW[k] !== "" ? String(RAW[k]) : d);

  const CFG = {
    TS: Math.max(8, num("gridSize", 48)),
    gravity: num("gravity", 0.55),
    maxFall: num("maxFall", 13),
    runAccel: num("runAccel", 0.7),
    runMax: num("runMax", 5.5),
    friction: num("friction", 0.72),
    airControl: num("airControl", 0.65),
    jumpVel: num("jumpVelocity", 11.5),
    jumpCut: num("jumpCut", 0.45),
    coyote: num("coyoteFrames", 6),
    jumpBuffer: num("jumpBufferFrames", 6),
    bounce: num("bounceVelocity", 8),
    tilesetId: Math.max(1, num("defaultTilesetId", 1)),
    parallax: str("parallaxName", ""),
    parallaxRate: num("parallaxRate", 0.35),
    playerChar: str("playerChar", "Actor1"),
    playerIndex: num("playerIndex", 0),
    enemyChar: str("enemyChar", "Monster"),
    enemyIndex: num("enemyIndex", 0),
    coinChar: str("coinChar", "!Crystal"),
    coinIndex: num("coinIndex", 0),
    startLives: num("startLives", 3),
    hotkey: num("editorHotkey", 121),
    colBg: str("colorBg", "#1b2030"),
    colPanel: str("colorPanel", "#232a3d"),
    colPanel2: str("colorPanel2", "#2c3550"),
    colAccent: str("colorAccent", "#4ea1ff"),
    colGrid: str("colorGrid", "rgba(255,255,255,0.06)"),
    colText: str("colorText", "#e7ecf5"),
  };

  // Expose so other subsystems / dev tweaks can reach it.
  window.PlatformerForge = window.PlatformerForge || {};
  const PF = window.PlatformerForge;
  PF.CFG = CFG;

  // --- Enums -----------------------------------------------------------------
  const MAT = { SOLID: 0, ONEWAY: 1, HAZARD: 2, DECOR: 3 };
  const MAT_LABEL = ["Solid", "One-way", "Hazard", "Decor"];
  const MAT_TINT = ["#4ea1ff", "#5dd66f", "#ff6b6b", "#9aa4bd"];

  const ENT = {
    PLAYER: "player",
    COIN: "coin",
    WALKER: "walker",
    FLYER: "flyer",
    POWERUP: "powerup",
    PLATFORM: "platform",
    CHECKPOINT: "checkpoint",
    GOAL: "goal",
  };

  // Palette of placeable entities (order = display order)
  const ENTITY_DEFS = [
    { type: ENT.PLAYER, label: "Player", color: "#4ea1ff", char: () => [CFG.playerChar, CFG.playerIndex] },
    { type: ENT.COIN, label: "Coin", color: "#ffd166", char: () => [CFG.coinChar, CFG.coinIndex] },
    { type: ENT.WALKER, label: "Walker", color: "#ff6b6b", char: () => [CFG.enemyChar, CFG.enemyIndex] },
    { type: ENT.FLYER, label: "Flyer", color: "#c77dff", char: () => [CFG.enemyChar, CFG.enemyIndex] },
    { type: ENT.POWERUP, label: "Grow", color: "#5dd66f", char: () => [CFG.coinChar, CFG.coinIndex] },
    { type: ENT.PLATFORM, label: "Platform", color: "#8ecae6", char: () => null },
    { type: ENT.CHECKPOINT, label: "Check", color: "#adb5ff", char: () => null },
    { type: ENT.GOAL, label: "Goal", color: "#ffe066", char: () => null },
  ];

  // --- Small helpers ---------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const key = (gx, gy) => gx + "," + gy;
  const parseKey = (k) => {
    const p = k.split(",");
    return [parseInt(p[0], 10), parseInt(p[1], 10)];
  };
  const aabb = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  PF.MAT = MAT; PF.ENT = ENT; PF.clamp = clamp;

  // ---------------------------------------------------------------------------
  // Level data model
  //   tiles:   { "gx,gy": { img:[pageIndex,col,row], mat:int } }
  //   entities:[ { id, type, x, y, w, h, ...extra } ]  (x/y in tile units)
  // ---------------------------------------------------------------------------
  class PF_Level {
    constructor(name) {
      this.name = name || "Untitled";
      this.tilesetId = CFG.tilesetId;
      this.parallax = CFG.parallax;
      this.width = 60;   // tiles
      this.height = 16;  // tiles
      this.tiles = {};
      this.entities = [];
      this._eid = 1;
    }
    static fromJSON(o) {
      const lv = new PF_Level(o.name);
      lv.tilesetId = o.tilesetId || CFG.tilesetId;
      lv.parallax = o.parallax || CFG.parallax;
      lv.width = o.width || 60;
      lv.height = o.height || 16;
      lv.tiles = o.tiles || {};
      lv.entities = o.entities || [];
      lv._eid = o._eid || (lv.entities.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1);
      return lv;
    }
    toJSON() {
      return {
        name: this.name, tilesetId: this.tilesetId, parallax: this.parallax,
        width: this.width, height: this.height, tiles: this.tiles,
        entities: this.entities, _eid: this._eid,
      };
    }
    setTile(gx, gy, img, mat) {
      if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return;
      this.tiles[key(gx, gy)] = { img: img.slice(), mat };
    }
    eraseTile(gx, gy) { delete this.tiles[key(gx, gy)]; }
    getTile(gx, gy) { return this.tiles[key(gx, gy)]; }
    addEntity(type, gx, gy, extra) {
      const def = ENTITY_DEFS.find((d) => d.type === type);
      const e = Object.assign(
        { id: this._eid++, type, x: gx, y: gy, w: 1, h: 1 },
        extra || {}
      );
      if (type === ENT.PLAYER) {
        // only one player start — replace existing
        this.entities = this.entities.filter((x) => x.type !== ENT.PLAYER);
      }
      if (type === ENT.PLATFORM) { e.wx = gx + 4; e.wy = gy; e.w = 2; } // 2nd waypoint
      this.entities.push(e);
      return e;
    }
    entityAt(gx, gy) {
      // topmost entity whose footprint covers this cell
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i];
        if (gx >= e.x && gx < e.x + (e.w || 1) && gy >= e.y && gy < e.y + (e.h || 1)) return e;
      }
      return null;
    }
    removeEntity(e) {
      const i = this.entities.indexOf(e);
      if (i >= 0) this.entities.splice(i, 1);
    }
    playerStart() {
      const p = this.entities.find((e) => e.type === ENT.PLAYER);
      return p ? { x: p.x, y: p.y } : { x: 2, y: this.height - 4 };
    }
    pixelWidth() { return this.width * CFG.TS; }
    pixelHeight() { return this.height * CFG.TS; }
  }
  PF.Level = PF_Level;

  // ---------------------------------------------------------------------------
  // Storage (uses MZ StorageManager; falls back gracefully)
  // ---------------------------------------------------------------------------
  const INDEX_KEY = "pf_index";
  const levelSaveName = (name) => "pf_level_" + name.replace(/[^a-zA-Z0-9_\- ]/g, "_");

  const PF_Store = {
    async listLevels() {
      try {
        if (StorageManager.exists(INDEX_KEY)) {
          const idx = await StorageManager.loadObject(INDEX_KEY);
          if (Array.isArray(idx)) return idx;
        }
      } catch (e) { /* ignore */ }
      return [];
    },
    async _updateIndex(name) {
      const list = await this.listLevels();
      if (!list.includes(name)) {
        list.push(name);
        try { await StorageManager.saveObject(INDEX_KEY, list); } catch (e) {}
      }
    },
    async save(level) {
      try {
        await StorageManager.saveObject(levelSaveName(level.name), level.toJSON());
        await this._updateIndex(level.name);
        return true;
      } catch (e) {
        console.error("[PlatformerForge] save failed:", e);
        return false;
      }
    },
    async load(name) {
      try {
        const o = await StorageManager.loadObject(levelSaveName(name));
        return PF_Level.fromJSON(o);
      } catch (e) {
        console.error("[PlatformerForge] load failed:", e);
        return null;
      }
    },
    exists(name) {
      try { return StorageManager.exists(levelSaveName(name)); } catch (e) { return false; }
    },
  };
  PF.Store = PF_Store;

  // ---------------------------------------------------------------------------
  // Asset frame helpers (reuse MZ tilesets & character sheets)
  // ---------------------------------------------------------------------------
  const isBigChar = (name) => !!name && (name.charAt(0) === "$");
  const hasSignChar = (name) => !!name && (name.charAt(0) === "!"); // no shadow etc.

  // Return {bitmap, sx, sy, sw, sh} for a character sheet frame.
  // dir: 2=down,4=left,6=right,8=up (RPG Maker convention). pattern 0..2.
  function charFrame(name, index, dir, pattern) {
    const bitmap = ImageManager.loadCharacter(name);
    if (!bitmap || !bitmap.isReady() || bitmap.width === 0) return null;
    const big = isBigChar(name);
    const pw = bitmap.width / (big ? 3 : 12);
    const ph = bitmap.height / (big ? 4 : 8);
    const n = big ? 0 : index;
    const blockCol = (n % 4) * 3;
    const blockRow = Math.floor(n / 4) * 4;
    const dirRow = { 2: 0, 4: 1, 6: 2, 8: 3 }[dir] || 0;
    const sx = (blockCol + pattern) * pw;
    const sy = (blockRow + dirRow) * ph;
    return { bitmap, sx, sy, sw: pw, sh: ph };
  }

  // Tileset image resolver. pageIndex 0..8 maps to tilesetNames slots.
  function tilesetBitmap(tilesetId, pageIndex) {
    const data = $dataTilesets[tilesetId];
    if (!data) return null;
    const nm = data.tilesetNames[pageIndex];
    if (!nm) return null;
    return ImageManager.loadTileset(nm);
  }

  // ---------------------------------------------------------------------------
  // PF_TileLayer — culled tile renderer.
  // Only builds sprites for tiles currently inside the viewport, so arbitrarily
  // wide levels stay within GPU texture limits and scroll smoothly.
  // ---------------------------------------------------------------------------
  class PF_TileLayer extends PIXI.Container {
    constructor(level, viewW, viewH) {
      super();
      this.level = level;
      this.viewW = viewW;
      this.viewH = viewH;
      this._pool = [];
      this._camX = -99999;
      this._camY = -99999;
      this._dirty = true;
    }
    setViewport(w, h) { this.viewW = w; this.viewH = h; this._dirty = true; }
    markDirty() { this._dirty = true; }
    _getSprite(i) {
      if (this._pool[i]) return this._pool[i];
      const s = new Sprite();
      this.addChild(s);
      this._pool[i] = s;
      return s;
    }
    refresh(camX, camY) {
      const TS = CFG.TS;
      const moved = camX !== this._camX || camY !== this._camY;
      if (!moved && !this._dirty) return;
      this._camX = camX; this._camY = camY; this._dirty = false;

      const gx0 = Math.floor(camX / TS) - 1;
      const gy0 = Math.floor(camY / TS) - 1;
      const gx1 = Math.ceil((camX + this.viewW) / TS) + 1;
      const gy1 = Math.ceil((camY + this.viewH) / TS) + 1;

      let i = 0;
      for (let gy = gy0; gy < gy1; gy++) {
        for (let gx = gx0; gx < gx1; gx++) {
          const t = this.level.tiles[key(gx, gy)];
          if (!t) continue;
          const bmp = tilesetBitmap(this.level.tilesetId, t.img[0]);
          if (!bmp || !bmp.isReady()) { this._dirty = true; continue; }
          const s = this._getSprite(i++);
          s.visible = true;
          s.bitmap = bmp;
          s.setFrame(t.img[1] * TS, t.img[2] * TS, TS, TS);
          s.x = Math.round(gx * TS - camX);
          s.y = Math.round(gy * TS - camY);
          s.tint = 0xffffff;
        }
      }
      for (let j = i; j < this._pool.length; j++) this._pool[j].visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Parallax background sprite
  // ---------------------------------------------------------------------------
  class PF_Parallax extends TilingSprite {
    constructor(name, viewW, viewH) {
      const bmp = name ? ImageManager.loadParallax(name) : new Bitmap(viewW, viewH);
      super(bmp);
      this.move(0, 0, viewW, viewH);
      this._empty = !name;
      if (this._empty) {
        // pleasant vertical gradient fallback
        bmp.gradientFillRect(0, 0, viewW, viewH, "#2a3557", "#12172a", true);
      }
    }
    scrollTo(camX, camY, rate) {
      this.origin.x = camX * rate;
      this.origin.y = camY * rate * 0.5;
    }
  }

  // ---------------------------------------------------------------------------
  // UI helper — draw flat panels, buttons, labels onto a Bitmap
  // ---------------------------------------------------------------------------
  const UI = {
    panel(bmp, x, y, w, h, color, border) {
      bmp.fillRect(x, y, w, h, color);
      if (border) {
        bmp.fillRect(x, y, w, 1, border);
        bmp.fillRect(x, y + h - 1, w, 1, border);
        bmp.fillRect(x, y, 1, h, border);
        bmp.fillRect(x + w - 1, y, 1, h, border);
      }
    },
    button(bmp, x, y, w, h, label, active, accent) {
      const base = active ? (accent || CFG.colAccent) : CFG.colPanel2;
      bmp.fillRect(x, y, w, h, base);
      bmp.fillRect(x, y, w, 1, "rgba(255,255,255,0.10)");
      bmp.fillRect(x, y + h - 1, w, 1, "rgba(0,0,0,0.25)");
      bmp.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
      bmp.fontSize = Math.min(20, Math.floor(h * 0.5));
      bmp.textColor = active ? "#0c1220" : CFG.colText;
      bmp.outlineWidth = 0;
      bmp.drawText(label, x, y, w, h, "center");
    },
    label(bmp, text, x, y, w, size, color, align) {
      bmp.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
      bmp.fontSize = size || 18;
      bmp.textColor = color || CFG.colText;
      bmp.outlineWidth = 3;
      bmp.outlineColor = "rgba(0,0,0,0.5)";
      bmp.drawText(text, x, y, w || 200, (size || 18) + 8, align || "left");
    },
  };
  PF.UI = UI;
  PF.charFrame = charFrame;
  PF.PF_TileLayer = PF_TileLayer;

  // ---------------------------------------------------------------------------
  // Scene_PFEditor — the drag-n-drop level editor
  // ---------------------------------------------------------------------------
  const TOOLBAR_H = 44;
  const PANEL_W = 212;
  const MAT_BAR_H = 34;

  class Scene_PFEditor extends Scene_Base {
    initialize() {
      super.initialize();
      this.level = PF._pendingLevel || new PF_Level("Untitled");
      PF._pendingLevel = null;
      this.tool = "paint";
      this.material = MAT.SOLID;
      this.tab = "tiles";
      this.selTile = null;        // [page,col,row]
      this.selEntityType = ENT.PLAYER;
      this.selEntity = null;
      this.camX = 0; this.camY = 0;
      this.palScroll = 0;
      this._paintedKey = null;
      this._panning = false;
      this._panStart = null;
      this._dragEntity = null;
      this._loadMenu = null;      // array of names when open
      this._toast = null; this._toastT = 0;
      this._uiDirty = true;
      this._prevTouch = false;
    }

    canvasRect() {
      return { x: 0, y: TOOLBAR_H, w: Graphics.width - PANEL_W, h: Graphics.height - TOOLBAR_H };
    }

    create() {
      super.create();
      const c = this.canvasRect();

      // Canvas background
      this._bg = new Sprite(new Bitmap(Graphics.width, Graphics.height));
      this._bg.bitmap.fillRect(0, 0, Graphics.width, Graphics.height, CFG.colBg);
      this.addChild(this._bg);

      // Tile layer (culled), clipped visually to canvas via position
      this._tileLayer = new PF_TileLayer(this.level, c.w, c.h);
      this._tileLayer.x = c.x; this._tileLayer.y = c.y;
      this.addChild(this._tileLayer);

      // Overlay (grid, bounds, entities, selection) — canvas sized
      this._overlay = new Sprite(new Bitmap(c.w, c.h));
      this._overlay.x = c.x; this._overlay.y = c.y;
      this.addChild(this._overlay);

      // UI (toolbar + panel) — full screen, transparent base
      this._ui = new Sprite(new Bitmap(Graphics.width, Graphics.height));
      this.addChild(this._ui);

      this.buildTilePalette();
      this._overlayDirty = true;
    }

    start() {
      super.start();
      const ps = this.level.playerStart();
      this.centerOn(ps.x, ps.y);
      this._uiDirty = true;
      this._overlayDirty = true;
    }

    centerOn(gx, gy) {
      const c = this.canvasRect();
      this.camX = clamp(gx * CFG.TS - c.w / 2, 0, Math.max(0, this.level.pixelWidth() - c.w));
      this.camY = clamp(gy * CFG.TS - c.h / 2, 0, Math.max(0, this.level.pixelHeight() - c.h));
    }

    // ---- Palette --------------------------------------------------------------
    buildTilePalette() {
      this.paletteTiles = [];
      const pages = [4, 5, 6, 7, 8]; // A5, B, C, D, E (flat tile pages)
      for (const p of pages) {
        const bmp = tilesetBitmap(this.level.tilesetId, p);
        if (!bmp) continue;
        if (!bmp.isReady()) { this._needPaletteRebuild = true; continue; }
        const cols = Math.floor(bmp.width / CFG.TS);
        const rows = Math.floor(bmp.height / CFG.TS);
        for (let r = 0; r < rows; r++)
          for (let col = 0; col < cols; col++) this.paletteTiles.push([p, col, r]);
      }
      if (this.paletteTiles.length && !this.selTile) this.selTile = this.paletteTiles[0];
    }

    palGeom() {
      const px = Graphics.width - PANEL_W;
      const top = TOOLBAR_H + MAT_BAR_H + 26; // header row
      const cell = 42, gap = 6, pad = 10;
      const cols = Math.floor((PANEL_W - pad * 2 + gap) / (cell + gap));
      return { px, top, cell, gap, pad, cols, viewH: Graphics.height - top - 10 };
    }

    // ---- Update loop ----------------------------------------------------------
    update() {
      super.update();
      if (this._needPaletteRebuild && this.paletteReady()) {
        this._needPaletteRebuild = false; this.buildTilePalette(); this._uiDirty = true;
      }
      this.updateInput();
      this._tileLayer.refresh(this.camX, this.camY);
      if (this._overlayDirty || this._camMoved) { this.redrawOverlay(); this._overlayDirty = false; this._camMoved = false; }
      if (this._uiDirty) { this.redrawUI(); this._uiDirty = false; }
      if (this._toastT > 0) { this._toastT--; if (this._toastT === 0) { this._toast = null; this._uiDirty = true; } }
    }

    paletteReady() {
      return [4, 5, 6, 7, 8].every((p) => {
        const b = tilesetBitmap(this.level.tilesetId, p);
        return !b || b.isReady();
      });
    }

    // ---- Input ----------------------------------------------------------------
    updateInput() {
      this.updateKeys();
      if (this._loadMenu) { this.updateLoadMenu(); return; }

      const mx = TouchInput.x, my = TouchInput.y;
      const pressed = TouchInput.isPressed();
      const triggered = TouchInput.isTriggered();
      const released = TouchInput.isReleased();
      const wheel = TouchInput.wheelY;

      // wheel scroll
      if (wheel !== 0) {
        if (this.inPanel(mx, my)) {
          this.palScroll = Math.max(0, this.palScroll + (wheel > 0 ? 1 : -1));
          this._uiDirty = true;
        } else if (Input.isPressed("shift")) {
          this.camY = clamp(this.camY + (wheel > 0 ? CFG.TS : -CFG.TS), 0, Math.max(0, this.level.pixelHeight() - this.canvasRect().h));
          this._camMoved = true;
        } else {
          this.camX = clamp(this.camX + (wheel > 0 ? CFG.TS : -CFG.TS), 0, Math.max(0, this.level.pixelWidth() - this.canvasRect().w));
          this._camMoved = true;
        }
      }

      // space-drag pan
      if (Input.isPressed("shift") === false && this.isSpaceDown() && pressed) {
        if (!this._panning) { this._panning = true; this._panStart = { mx, my, cx: this.camX, cy: this.camY }; }
        const c = this.canvasRect();
        this.camX = clamp(this._panStart.cx - (mx - this._panStart.mx), 0, Math.max(0, this.level.pixelWidth() - c.w));
        this.camY = clamp(this._panStart.cy - (my - this._panStart.my), 0, Math.max(0, this.level.pixelHeight() - c.h));
        this._camMoved = true;
        return;
      } else if (this._panning && released) { this._panning = false; }

      if (triggered) {
        if (my < TOOLBAR_H) { this.hitToolbar(mx, my); return; }
        if (this.inPanel(mx, my)) { this.hitPanel(mx, my); return; }
      }

      // Canvas interaction
      if (this.inCanvas(mx, my)) {
        const right = this.isRightDown();
        if (right) {
          const g = this.screenToGrid(mx, my);
          this.eraseAt(g.gx, g.gy);
        } else if (pressed || triggered) {
          const g = this.screenToGrid(mx, my);
          this.applyTool(g.gx, g.gy, triggered);
        }
        if (!pressed && !right) { this._paintedKey = null; this._dragEntity = null; }
      }
    }

    updateKeys() {
      const step = CFG.TS;
      const c = this.canvasRect();
      let moved = false;
      if (this.keyDown(37) || this.keyDown(65)) { this.camX -= step; moved = true; }
      if (this.keyDown(39) || this.keyDown(68)) { this.camX += step; moved = true; }
      if (this.keyDown(38) || this.keyDown(87)) { this.camY -= step; moved = true; }
      if (this.keyDown(40) || this.keyDown(83)) { this.camY += step; moved = true; }
      if (moved) {
        this.camX = clamp(this.camX, 0, Math.max(0, this.level.pixelWidth() - c.w));
        this.camY = clamp(this.camY, 0, Math.max(0, this.level.pixelHeight() - c.h));
        this._camMoved = true;
      }
      if ((this.keyTriggered(46) || this.keyTriggered(8)) && this.selEntity && this.tool === "select") {
        this.level.removeEntity(this.selEntity); this.selEntity = null;
        this._overlayDirty = true;
      }
      if (Input.isTriggered("cancel") || this.keyTriggered(27)) this.exitEditor();
    }

    // Raw key polling (adds beyond MZ's default keyMapper)
    keyDown(code) { return !!PF._keys[code]; }
    keyTriggered(code) { const d = !!PF._keys[code], p = !!PF._keysPrev[code]; return d && !p; }
    isSpaceDown() { return this.keyDown(32); }
    isRightDown() { return !!PF._rmb; }

    // ---- Region tests ---------------------------------------------------------
    inCanvas(x, y) { const c = this.canvasRect(); return x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h; }
    inPanel(x, y) { return x >= Graphics.width - PANEL_W && y >= TOOLBAR_H; }

    screenToGrid(mx, my) {
      const c = this.canvasRect();
      const wx = mx - c.x + this.camX;
      const wy = my - c.y + this.camY;
      return { gx: Math.floor(wx / CFG.TS), gy: Math.floor(wy / CFG.TS) };
    }

    // ---- Tools ----------------------------------------------------------------
    applyTool(gx, gy, firstClick) {
      if (this.tool === "paint") {
        if (!this.selTile) return;
        const k = key(gx, gy);
        if (this._paintedKey === k && !firstClick) return;
        this._paintedKey = k;
        this.level.setTile(gx, gy, this.selTile, this.material);
        this._tileLayer.markDirty(); this._overlayDirty = true;
      } else if (this.tool === "erase") {
        this.eraseAt(gx, gy);
      } else if (this.tool === "entity") {
        if (firstClick) this.placeEntity(gx, gy);
        else if (this._dragEntity && this._dragEntity.type === ENT.PLATFORM) {
          this._dragEntity.wx = gx; this._dragEntity.wy = gy; this._overlayDirty = true;
        }
      } else if (this.tool === "select") {
        if (firstClick) { this.selEntity = this.level.entityAt(gx, gy); this._overlayDirty = true; }
        else if (this.selEntity) { this.selEntity.x = gx; this.selEntity.y = gy; this._overlayDirty = true; }
      }
    }

    eraseAt(gx, gy) {
      const k = key(gx, gy);
      if (this._paintedKey === k) return;
      this._paintedKey = k;
      const e = this.level.entityAt(gx, gy);
      if (e && (this.tool === "erase" || this.isRightDown())) { this.level.removeEntity(e); }
      else this.level.eraseTile(gx, gy);
      this._tileLayer.markDirty(); this._overlayDirty = true;
    }

    placeEntity(gx, gy) {
      if (gx < 0 || gy < 0 || gx >= this.level.width || gy >= this.level.height) return;
      const e = this.level.addEntity(this.selEntityType, gx, gy);
      if (e.type === ENT.PLATFORM) this._dragEntity = e;
      this._overlayDirty = true;
    }

    // ---- Toolbar / panel hit-testing -----------------------------------------
    toolbarButtons() {
      const btns = [];
      let x = 8; const w = 74, h = 30, y = 7, gap = 4;
      const tools = [["paint", "Paint"], ["erase", "Erase"], ["entity", "Entity"], ["select", "Select"]];
      for (const [id, label] of tools) { btns.push({ x, y, w, h, kind: "tool", id, label }); x += w + gap; }
      // right cluster
      let rx = Graphics.width - 8 - (w * 4 + gap * 3);
      for (const [id, label] of [["save", "Save"], ["load", "Load"], ["play", "▶ Play"], ["exit", "Exit"]]) {
        btns.push({ x: rx, y, w, h, kind: "action", id, label }); rx += w + gap;
      }
      return btns;
    }

    hitToolbar(mx, my) {
      for (const b of this.toolbarButtons()) {
        if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) {
          if (b.kind === "tool") { this.tool = b.id; if (b.id !== "select") this.selEntity = null; }
          else this.doAction(b.id);
          this._uiDirty = true; this._overlayDirty = true;
          return;
        }
      }
    }

    hitPanel(mx, my) {
      // Tabs
      const tabW = PANEL_W / 2, tabY = TOOLBAR_H, tabH = 24, px = Graphics.width - PANEL_W;
      if (my >= tabY && my < tabY + tabH) {
        this.tab = (mx < px + tabW) ? "tiles" : "entities"; this._uiDirty = true; return;
      }
      if (this.tab === "tiles") {
        // Material buttons
        const mY = TOOLBAR_H + tabH, mH = MAT_BAR_H - tabH + 10;
        if (my >= mY && my < mY + MAT_BAR_H) {
          const bw = PANEL_W / 4;
          const i = Math.floor((mx - px) / bw);
          if (i >= 0 && i < 4) { this.material = i; this._uiDirty = true; }
          return;
        }
        // Tile grid
        const g = this.palGeom();
        if (my >= g.top) {
          const rel = my - g.top; const col = Math.floor((mx - g.px - g.pad) / (g.cell + g.gap));
          const row = Math.floor(rel / (g.cell + g.gap)) + this.palScroll;
          if (col >= 0 && col < g.cols) {
            const idx = row * g.cols + col;
            if (idx >= 0 && idx < this.paletteTiles.length) { this.selTile = this.paletteTiles[idx]; this.tool = "paint"; this._uiDirty = true; }
          }
        }
      } else {
        // Entities list
        const rowH = 40, top = TOOLBAR_H + tabH + 8;
        const i = Math.floor((my - top) / rowH);
        if (i >= 0 && i < ENTITY_DEFS.length) {
          this.selEntityType = ENTITY_DEFS[i].type; this.tool = "entity"; this._uiDirty = true;
        }
      }
    }

    doAction(id) {
      if (id === "save") this.saveLevel();
      else if (id === "load") this.openLoadMenu();
      else if (id === "play") this.testPlay();
      else if (id === "exit") this.exitEditor();
    }

    // ---- Actions --------------------------------------------------------------
    saveLevel() {
      let name = this.level.name;
      if ((name === "Untitled" || this.isRightDown()) && typeof window.prompt === "function") {
        const r = window.prompt("Level name:", name === "Untitled" ? "Level 1" : name);
        if (!r) return; name = r.trim() || name;
      }
      this.level.name = name;
      PF_Store.save(this.level).then((ok) => this.toast(ok ? "Saved: " + name : "Save failed"));
    }

    openLoadMenu() {
      PF_Store.listLevels().then((list) => {
        this._loadMenu = list.length ? list : null;
        if (!this._loadMenu) this.toast("No saved levels yet");
        this._uiDirty = true;
      });
    }

    updateLoadMenu() {
      if (!this._loadMenu) return;
      const box = this.loadMenuGeom();
      if (TouchInput.isTriggered()) {
        const mx = TouchInput.x, my = TouchInput.y;
        if (mx < box.x || mx > box.x + box.w || my < box.y || my > box.y + box.h) {
          this._loadMenu = null; this._uiDirty = true; return;
        }
        const i = Math.floor((my - (box.y + 40)) / box.rowH);
        if (i >= 0 && i < this._loadMenu.length) {
          const nm = this._loadMenu[i];
          PF_Store.load(nm).then((lv) => {
            if (lv) { this.level = lv; this._tileLayer.level = lv; this.buildTilePalette(); const ps = lv.playerStart(); this.centerOn(ps.x, ps.y); this.toast("Loaded: " + nm); }
            this._loadMenu = null; this._tileLayer.markDirty(); this._overlayDirty = true; this._uiDirty = true;
          });
        }
      }
      if (this.keyTriggered(27) || Input.isTriggered("cancel")) { this._loadMenu = null; this._uiDirty = true; }
    }

    loadMenuGeom() {
      const w = 320, rowH = 34, n = this._loadMenu ? this._loadMenu.length : 0;
      const h = 50 + Math.min(n, 10) * rowH;
      return { x: (Graphics.width - w) / 2, y: (Graphics.height - h) / 2, w, h, rowH };
    }

    testPlay() {
      if (!this.level.entities.some((e) => e.type === ENT.PLAYER)) {
        this.toast("Place a Player Start first!"); return;
      }
      PF._playLevel = this.level;
      PF._returnToEditor = true;
      SceneManager.push(Scene_PFPlay);
    }

    exitEditor() { SceneManager.pop(); }

    toast(msg) { this._toast = msg; this._toastT = 120; this._uiDirty = true; }

    // ---- Drawing --------------------------------------------------------------
    ensureCursor() {
      if (this._cursor) return;
      const b = new Bitmap(CFG.TS, CFG.TS);
      const col = CFG.colAccent;
      b.fillRect(0, 0, CFG.TS, 2, col); b.fillRect(0, CFG.TS - 2, CFG.TS, 2, col);
      b.fillRect(0, 0, 2, CFG.TS, col); b.fillRect(CFG.TS - 2, 0, 2, CFG.TS, col);
      this._cursor = new Sprite(b);
      this._cursor.opacity = 180;
      this.addChild(this._cursor);
    }

    redrawOverlay() {
      const bmp = this._overlay.bitmap; const c = this.canvasRect();
      bmp.clear();
      const TS = CFG.TS;
      // grid lines
      const startX = -(this.camX % TS);
      const startY = -(this.camY % TS);
      for (let x = startX; x < c.w; x += TS) bmp.fillRect(Math.round(x), 0, 1, c.h, CFG.colGrid);
      for (let y = startY; y < c.h; y += TS) bmp.fillRect(0, Math.round(y), c.w, 1, CFG.colGrid);
      // level bounds
      const bx = -this.camX, by = -this.camY, bw = this.level.pixelWidth(), bh = this.level.pixelHeight();
      bmp.fillRect(Math.max(0, bx), Math.max(0, by), 2, Math.min(c.h, bh), "rgba(120,160,255,0.4)");
      const rightEdge = bx + bw;
      if (rightEdge >= 0 && rightEdge < c.w) bmp.fillRect(Math.round(rightEdge), 0, 2, c.h, "rgba(120,160,255,0.4)");
      const botEdge = by + bh;
      if (botEdge >= 0 && botEdge < c.h) bmp.fillRect(0, Math.round(botEdge), c.w, 2, "rgba(120,160,255,0.4)");

      // entities
      for (const e of this.level.entities) {
        const ox = e.x * TS - this.camX, oy = e.y * TS - this.camY;
        const w = (e.w || 1) * TS, h = (e.h || 1) * TS;
        if (ox + w < 0 || oy + h < 0 || ox > c.w || oy > c.h) {
          if (e.type !== ENT.PLATFORM) continue;
        }
        this.drawEntityMarker(bmp, e, ox, oy, w, h);
      }
      // selection
      if (this.selEntity) {
        const e = this.selEntity;
        const ox = e.x * TS - this.camX, oy = e.y * TS - this.camY;
        const w = (e.w || 1) * TS, h = (e.h || 1) * TS;
        this.strokeRect(bmp, ox - 2, oy - 2, w + 4, h + 4, CFG.colAccent, 2);
      }
    }

    strokeRect(bmp, x, y, w, h, color, t) {
      t = t || 1;
      bmp.fillRect(x, y, w, t, color); bmp.fillRect(x, y + h - t, w, t, color);
      bmp.fillRect(x, y, t, h, color); bmp.fillRect(x + w - t, y, t, h, color);
    }

    drawEntityMarker(bmp, e, ox, oy, w, h) {
      const def = ENTITY_DEFS.find((d) => d.type === e.type) || { color: "#fff", label: "?" };
      // platform waypoint line
      if (e.type === ENT.PLATFORM && e.wx != null) {
        const wx = e.wx * CFG.TS - this.camX + w / 2, wy = e.wy * CFG.TS - this.camY + h / 2;
        bmp.fillRect(Math.min(ox + w / 2, wx), Math.min(oy + h / 2, wy), Math.abs(wx - (ox + w / 2)) + 1, 2, "rgba(142,202,230,0.7)");
        bmp.fillRect(Math.min(ox + w / 2, wx), Math.min(oy + h / 2, wy), 2, Math.abs(wy - (oy + h / 2)) + 1, "rgba(142,202,230,0.7)");
        this.strokeRect(bmp, wx - CFG.TS / 2, wy - CFG.TS / 2, CFG.TS, CFG.TS / 2, "rgba(142,202,230,0.7)", 2);
      }
      // body
      bmp.paintOpacity = 90; bmp.fillRect(ox, oy, w, h, def.color); bmp.paintOpacity = 255;
      this.strokeRect(bmp, ox, oy, w, h, def.color, 2);
      // character preview
      const cc = def.char ? def.char() : null;
      if (cc && cc[0]) {
        const f = charFrame(cc[0], cc[1], 2, 1);
        if (f) {
          const s = Math.min(w, h) / Math.max(f.sw, f.sh) * 0.9;
          const dw = f.sw * s, dh = f.sh * s;
          bmp.blt(f.bitmap, f.sx, f.sy, f.sw, f.sh, ox + (w - dw) / 2, oy + (h - dh) / 2, dw, dh);
        }
      }
      // label
      bmp.fontFace = $gameSystem.mainFontFace(); bmp.fontSize = 13;
      bmp.textColor = "#0c1220"; bmp.outlineColor = def.color; bmp.outlineWidth = 3;
      bmp.drawText(def.label, ox, oy + h - 15, w, 14, "center");
    }

    redrawUI() {
      const bmp = this._ui.bitmap; bmp.clear();
      const GW = Graphics.width;
      // Toolbar
      UI.panel(bmp, 0, 0, GW, TOOLBAR_H, CFG.colPanel, "rgba(0,0,0,0.4)");
      for (const b of this.toolbarButtons()) {
        const active = (b.kind === "tool" && this.tool === b.id);
        const accent = b.id === "play" ? "#5dd66f" : b.id === "exit" ? "#ff6b6b" : CFG.colAccent;
        UI.button(bmp, b.x, b.y, b.w, b.h, b.label, active || b.kind === "action" && (b.id === "play"), accent);
      }
      // center title
      UI.label(bmp, this.level.name + "   (" + this.level.width + "×" + this.level.height + ")",
        GW / 2 - 130, 12, 260, 18, CFG.colText, "center");

      // Panel
      const px = GW - PANEL_W;
      UI.panel(bmp, px, TOOLBAR_H, PANEL_W, Graphics.height - TOOLBAR_H, CFG.colPanel, "rgba(0,0,0,0.4)");
      // Tabs
      const tabW = PANEL_W / 2, tabH = 24;
      UI.button(bmp, px, TOOLBAR_H, tabW, tabH, "Tiles", this.tab === "tiles");
      UI.button(bmp, px + tabW, TOOLBAR_H, tabW, tabH, "Entities", this.tab === "entities");

      if (this.tab === "tiles") this.drawTilePanel(bmp, px, tabH);
      else this.drawEntityPanel(bmp, px, tabH);

      // status hint
      UI.label(bmp, "Wheel: scroll · Space+drag: pan · RMB: erase",
        8, Graphics.height - 22, GW - PANEL_W - 16, 14, "rgba(231,236,245,0.5)", "left");

      // toast
      if (this._toast) {
        const tw = 300, tx = (GW - PANEL_W) / 2 - tw / 2, ty = Graphics.height - 60;
        UI.panel(bmp, tx, ty, tw, 30, CFG.colAccent);
        bmp.fontSize = 16; bmp.textColor = "#0c1220"; bmp.outlineWidth = 0;
        bmp.drawText(this._toast, tx, ty, tw, 30, "center");
      }
      if (this._loadMenu) this.drawLoadMenu(bmp);
    }

    drawTilePanel(bmp, px, tabH) {
      // material bar
      const mY = TOOLBAR_H + tabH, bw = PANEL_W / 4;
      for (let i = 0; i < 4; i++) {
        UI.button(bmp, px + i * bw, mY, bw, MAT_BAR_H - 4, MAT_LABEL[i], this.material === i, MAT_TINT[i]);
      }
      // tiles
      const g = this.palGeom();
      const rowsVisible = Math.ceil(g.viewH / (g.cell + g.gap));
      const totalRows = Math.ceil(this.paletteTiles.length / g.cols);
      this.palScroll = clamp(this.palScroll, 0, Math.max(0, totalRows - rowsVisible + 1));
      let drawn = 0;
      for (let r = 0; r < rowsVisible + 1; r++) {
        const row = r + this.palScroll;
        for (let col = 0; col < g.cols; col++) {
          const idx = row * g.cols + col;
          if (idx >= this.paletteTiles.length) break;
          const t = this.paletteTiles[idx];
          const cx = g.px + g.pad + col * (g.cell + g.gap);
          const cy = g.top + r * (g.cell + g.gap);
          if (cy > Graphics.height - 4) continue;
          const b2 = tilesetBitmap(this.level.tilesetId, t[0]);
          UI.panel(bmp, cx, cy, g.cell, g.cell, CFG.colPanel2);
          if (b2 && b2.isReady()) bmp.blt(b2, t[1] * CFG.TS, t[2] * CFG.TS, CFG.TS, CFG.TS, cx + 1, cy + 1, g.cell - 2, g.cell - 2);
          if (this.selTile && this.selTile[0] === t[0] && this.selTile[1] === t[1] && this.selTile[2] === t[2]) {
            this.strokeRect(bmp, cx, cy, g.cell, g.cell, CFG.colAccent, 2);
          }
          drawn++;
        }
      }
    }

    drawEntityPanel(bmp, px, tabH) {
      const rowH = 40, top = TOOLBAR_H + tabH + 8;
      for (let i = 0; i < ENTITY_DEFS.length; i++) {
        const d = ENTITY_DEFS[i]; const y = top + i * rowH;
        const active = this.selEntityType === d.type;
        UI.panel(bmp, px + 6, y, PANEL_W - 12, rowH - 6, active ? CFG.colAccent : CFG.colPanel2);
        // color chip / preview
        bmp.paintOpacity = 255;
        const cc = d.char ? d.char() : null;
        if (cc && cc[0]) {
          const f = charFrame(cc[0], cc[1], 2, 1);
          if (f) { const s = 30 / Math.max(f.sw, f.sh); bmp.blt(f.bitmap, f.sx, f.sy, f.sw, f.sh, px + 12, y + 2, f.sw * s, f.sh * s); }
          else bmp.fillRect(px + 12, y + 6, 24, 24, d.color);
        } else { bmp.fillRect(px + 12, y + 6, 24, 24, d.color); }
        bmp.fontSize = 17; bmp.textColor = active ? "#0c1220" : CFG.colText; bmp.outlineWidth = 0;
        bmp.drawText(d.label, px + 48, y, PANEL_W - 56, rowH - 6, "left");
      }
      UI.label(bmp, "Click canvas to place. Platform: drag to set path.",
        px + 8, top + ENTITY_DEFS.length * rowH + 6, PANEL_W - 16, 13, "rgba(231,236,245,0.55)", "left");
    }

    drawLoadMenu(bmp) {
      const box = this.loadMenuGeom();
      UI.panel(bmp, box.x, box.y, box.w, box.h, CFG.colPanel2, CFG.colAccent);
      bmp.fontSize = 18; bmp.textColor = CFG.colText; bmp.outlineWidth = 0;
      bmp.drawText("Load Level", box.x, box.y + 8, box.w, 24, "center");
      for (let i = 0; i < this._loadMenu.length && i < 10; i++) {
        const y = box.y + 40 + i * box.rowH;
        UI.panel(bmp, box.x + 8, y, box.w - 16, box.rowH - 4, CFG.colPanel);
        bmp.fontSize = 16; bmp.textColor = CFG.colText;
        bmp.drawText(this._loadMenu[i], box.x + 20, y, box.w - 32, box.rowH - 4, "left");
      }
    }
  }
  PF.Scene_PFEditor = Scene_PFEditor;

  // Keep cursor + palette scroll bounds fresh each frame
  const _editorUpdate = Scene_PFEditor.prototype.update;
  Scene_PFEditor.prototype.update = function () {
    _editorUpdate.call(this);
    this.ensureCursor();
    if (this._cursor) {
      const mx = TouchInput.x, my = TouchInput.y;
      if (this.inCanvas(mx, my) && !this._loadMenu) {
        const g = this.screenToGrid(mx, my);
        this._cursor.visible = true;
        this._cursor.x = this.canvasRect().x + g.gx * CFG.TS - this.camX;
        this._cursor.y = this.canvasRect().y + g.gy * CFG.TS - this.camY;
      } else this._cursor.visible = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Scene_PFPlay — the platformer runtime
  // ---------------------------------------------------------------------------
  const SOLID = MAT.SOLID, ONEWAY = MAT.ONEWAY, HAZARD = MAT.HAZARD;

  class Scene_PFPlay extends Scene_Base {
    initialize() {
      super.initialize();
      this.level = PF._playLevel;
      this.returnToEditor = !!PF._returnToEditor;
      this.camX = 0; this.camY = 0;
      this.coins = 0;
      this.lives = CFG.startLives;
      this.state = "play"; // play | win | dead | gameover
      this.stateT = 0;
      this._hudDirty = true;
    }

    create() {
      super.create();
      const GW = Graphics.width, GH = Graphics.height;
      this._parallax = new PF_Parallax(this.level.parallax, GW, GH);
      this.addChild(this._parallax);

      this._tileLayer = new PF_TileLayer(this.level, GW, GH);
      this.addChild(this._tileLayer);

      this._entLayer = new Sprite(); this.addChild(this._entLayer);
      this._playerSprite = new Sprite(); this._playerSprite.anchor.set(0.5, 1); this.addChild(this._playerSprite);

      this._hud = new Sprite(new Bitmap(GW, 40)); this.addChild(this._hud);
      this._msg = new Sprite(new Bitmap(GW, GH)); this.addChild(this._msg);

      this.buildEntities();
    }

    start() { super.start(); this.updateCamera(true); }

    // ---- Build ---------------------------------------------------------------
    buildEntities() {
      const TS = CFG.TS;
      this.enemies = []; this.coinItems = []; this.platforms = []; this.triggers = [];
      const ps = this.level.playerStart();
      this.respawnPoint = { gx: ps.x, gy: ps.y };
      this.spawnPlayer(ps.x, ps.y);

      for (const e of this.level.entities) {
        if (e.type === ENT.PLAYER) continue;
        if (e.type === ENT.COIN) this.coinItems.push(this.makeItem(e, "#ffd166"));
        else if (e.type === ENT.POWERUP) this.triggers.push(this.makeItem(e, "#5dd66f", ENT.POWERUP));
        else if (e.type === ENT.WALKER || e.type === ENT.FLYER) this.makeEnemy(e);
        else if (e.type === ENT.PLATFORM) this.makePlatform(e);
        else if (e.type === ENT.CHECKPOINT) this.triggers.push(this.makeMarker(e, "#adb5ff", ENT.CHECKPOINT));
        else if (e.type === ENT.GOAL) this.triggers.push(this.makeMarker(e, "#ffe066", ENT.GOAL));
      }
    }

    charSprite(name, index) {
      const s = new Sprite(); s.anchor.set(0.5, 1);
      s._char = [name, index]; this._entLayer.addChild(s); return s;
    }
    solidBitmapSprite(w, h, color, poleColor) {
      const b = new Bitmap(w, h);
      if (poleColor) { b.fillRect(w / 2 - 3, 0, 6, h, poleColor); b.fillRect(w / 2 + 3, 4, w / 2 - 4, h * 0.35, color); }
      else { b.fillRect(0, 0, w, h, color); b.fillRect(0, 0, w, 3, "rgba(255,255,255,0.3)"); }
      const s = new Sprite(b); this._entLayer.addChild(s); return s;
    }

    spawnPlayer(gx, gy) {
      const TS = CFG.TS;
      this.player = {
        w: TS * 0.62, hSmall: TS * 0.92, hBig: TS * 1.42, big: false,
        px: 0, py: 0, vx: 0, vy: 0, dir: 6, pattern: 0, animT: 0,
        grounded: false, coyote: 0, jumpBuf: 0, jumpHeld: false,
        invuln: 0, ridePlat: null,
      };
      this.player.h = this.player.hSmall;
      this.player.px = gx * TS + (TS - this.player.w) / 2;
      this.player.py = (gy + 1) * TS - this.player.h;
    }

    makeItem(e, color, kind) {
      const TS = CFG.TS;
      const spr = this.charSprite(...(kind === ENT.POWERUP ? [CFG.coinChar, CFG.coinIndex] : [CFG.coinChar, CFG.coinIndex]));
      return { e, kind: kind || ENT.COIN, px: e.x * TS + TS / 2, py: (e.y + 1) * TS - TS / 2, dead: false, sprite: spr, t: Math.random() * 6 };
    }
    makeMarker(e, color, kind) {
      const TS = CFG.TS;
      const spr = this.solidBitmapSprite(TS, TS * 1.6, color, kind === ENT.GOAL ? "#c9a227" : "#7d86c9");
      spr.y = 0;
      return { e, kind, px: e.x * TS, py: (e.y + 1) * TS - TS * 1.6, w: TS, h: TS * 1.6, sprite: spr, activated: false };
    }
    makeEnemy(e) {
      const TS = CFG.TS;
      const spr = this.charSprite(CFG.enemyChar, CFG.enemyIndex);
      const flyer = e.type === ENT.FLYER;
      this.enemies.push({
        e, type: e.type, w: TS * 0.8, h: TS * 0.8,
        px: e.x * TS + TS * 0.1, py: (e.y + 1) * TS - TS * 0.8,
        vx: flyer ? 0 : -1.3, vy: 0, dir: 4, grounded: false, dead: false,
        flyer, baseY: (e.y + 1) * TS - TS * 0.8, t: 0, sprite: spr,
      });
    }
    makePlatform(e) {
      const TS = CFG.TS;
      const w = (e.w || 2) * TS, h = Math.floor(TS * 0.5);
      const spr = this.solidBitmapSprite(w, h, "#8ecae6");
      const ax = e.x * TS, ay = e.y * TS;
      const bx = (e.wx != null ? e.wx : e.x) * TS, by = (e.wy != null ? e.wy : e.y) * TS;
      this.platforms.push({ e, w, h, ax, ay, bx, by, px: ax, py: ay, ppx: ax, ppy: ay, t: 0, sprite: spr, speed: 0.012 });
    }

    // ---- Tile queries --------------------------------------------------------
    tileMat(gx, gy) { const t = this.level.tiles[key(gx, gy)]; return t ? t.mat : -1; }
    isSolid(gx, gy) { return this.tileMat(gx, gy) === SOLID; }
    isOneWay(gx, gy) { return this.tileMat(gx, gy) === ONEWAY; }

    // ---- Physics collision (per axis) ----------------------------------------
    collideX(o) {
      const TS = CFG.TS; o.px += o.vx;
      const top = Math.floor(o.py / TS), bot = Math.floor((o.py + o.h - 1) / TS);
      if (o.vx > 0) {
        const r = Math.floor((o.px + o.w - 1) / TS);
        for (let gy = top; gy <= bot; gy++) if (this.isSolid(r, gy)) { o.px = r * TS - o.w; o.vx = 0; o.hitWall = true; return; }
      } else if (o.vx < 0) {
        const l = Math.floor(o.px / TS);
        for (let gy = top; gy <= bot; gy++) if (this.isSolid(l, gy)) { o.px = (l + 1) * TS; o.vx = 0; o.hitWall = true; return; }
      }
    }
    collideY(o, allowOneWay) {
      const TS = CFG.TS; o.grounded = false; o.py += o.vy;
      const left = Math.floor(o.px / TS), right = Math.floor((o.px + o.w - 1) / TS);
      if (o.vy > 0) {
        const b = Math.floor((o.py + o.h - 1) / TS);
        for (let gx = left; gx <= right; gx++) {
          const solid = this.isSolid(gx, b);
          const oneway = allowOneWay && this.isOneWay(gx, b) && (o.py + o.h - o.vy) <= b * TS + 2;
          if (solid || oneway) { o.py = b * TS - o.h; o.vy = 0; o.grounded = true; return; }
        }
      } else if (o.vy < 0) {
        const t = Math.floor(o.py / TS);
        for (let gx = left; gx <= right; gx++) if (this.isSolid(gx, t)) { o.py = (t + 1) * TS; o.vy = 0; return; }
      }
    }

    touchesHazard(o) {
      const TS = CFG.TS;
      const l = Math.floor((o.px + 3) / TS), r = Math.floor((o.px + o.w - 4) / TS);
      const t = Math.floor((o.py + 3) / TS), b = Math.floor((o.py + o.h - 4) / TS);
      for (let gy = t; gy <= b; gy++) for (let gx = l; gx <= r; gx++) if (this.tileMat(gx, gy) === HAZARD) return true;
      return false;
    }

    // ---- Update --------------------------------------------------------------
    update() {
      super.update();
      if (this.state === "play") {
        this.updatePlayer();
        this.updateEnemies();
        this.updatePlatforms();
        this.updateItems();
        this.checkTriggers();
        this.checkDeath();
      } else {
        this.updateEndState();
      }
      this.updateCamera();
      this._tileLayer.refresh(this.camX, this.camY);
      this._parallax.scrollTo(this.camX, this.camY, CFG.parallaxRate);
      this.syncSprites();
      if (this._hudDirty) { this.drawHud(); this._hudDirty = false; }
    }

    // ---- Input helpers -------------------------------------------------------
    leftHeld() { return Input.isPressed("left") || !!PF._keys[65]; }
    rightHeld() { return Input.isPressed("right") || !!PF._keys[68]; }
    jumpHeld() { return Input.isPressed("ok") || Input.isPressed("up") || !!PF._keys[87] || !!PF._keys[32]; }
    jumpTriggered() {
      return Input.isTriggered("ok") || Input.isTriggered("up") ||
        (!!PF._keys[87] && !PF._keysPrev[87]) || (!!PF._keys[32] && !PF._keysPrev[32]) || (!!PF._keys[90] && !PF._keysPrev[90]);
    }

    updatePlayer() {
      const p = this.player, C = CFG;
      const accel = p.grounded ? C.runAccel : C.runAccel * C.airControl;
      let dirx = 0;
      if (this.leftHeld()) dirx -= 1;
      if (this.rightHeld()) dirx += 1;
      if (dirx !== 0) { p.vx += dirx * accel; p.dir = dirx > 0 ? 6 : 4; }
      else if (p.grounded) p.vx *= C.friction;
      p.vx = clamp(p.vx, -C.runMax, C.runMax);

      // jump buffer & coyote
      if (this.jumpTriggered()) p.jumpBuf = C.jumpBuffer;
      else if (p.jumpBuf > 0) p.jumpBuf--;
      if (p.grounded) p.coyote = C.coyote; else if (p.coyote > 0) p.coyote--;
      if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -C.jumpVel; p.coyote = 0; p.jumpBuf = 0; p.grounded = false; SoundManager.playOk && SoundManager.playOk(); }
      // variable height
      if (p.vy < 0 && !this.jumpHeld()) p.vy *= C.jumpCut, (p.vy = Math.max(p.vy, -C.jumpVel * C.jumpCut));

      p.vy = Math.min(p.vy + C.gravity, C.maxFall);
      p.hitWall = false; p.ridePlat = null;
      this.collideX(p);
      this.collideY(p, true);
      this.ridePlatforms(p);

      if (p.invuln > 0) p.invuln--;
      // animation
      p.animT += Math.abs(p.vx);
      if (p.animT > 8) { p.animT = 0; p.pattern = (p.pattern + 1) % 3; }
      if (Math.abs(p.vx) < 0.2 && p.grounded) p.pattern = 1;
    }

    ridePlatforms(p) {
      for (const pl of this.platforms) {
        const onTop = p.py + p.h <= pl.py + 8 && p.py + p.h >= pl.py - 2 &&
          p.px + p.w > pl.px && p.px < pl.px + pl.w && p.vy >= 0;
        if (onTop) {
          p.py = pl.py - p.h; p.vy = 0; p.grounded = true; p.coyote = CFG.coyote;
          p.px += (pl.px - pl.ppx); p.py += (pl.py - pl.ppy); p.ridePlat = pl;
        }
      }
    }

    updateEnemies() {
      const TS = CFG.TS, C = CFG;
      for (const en of this.enemies) {
        if (en.dead) continue;
        en.t++;
        if (en.flyer) {
          en.px += Math.cos(en.t * 0.03) * 1.4;
          en.py = en.baseY + Math.sin(en.t * 0.05) * TS * 1.2;
        } else {
          en.hitWall = false;
          en.vy = Math.min(en.vy + C.gravity, C.maxFall);
          this.collideX(en);
          // turn at wall
          if (en.hitWall) en.vx = -en.vx || (en.dir === 4 ? 1.3 : -1.3);
          this.collideY(en, false);
          // turn at ledge
          if (en.grounded) {
            const ahead = en.vx > 0 ? Math.floor((en.px + en.w + 2) / TS) : Math.floor((en.px - 2) / TS);
            const below = Math.floor((en.py + en.h + 2) / TS);
            if (!this.isSolid(ahead, below) && !this.isOneWay(ahead, below)) en.vx = -en.vx;
          }
          en.dir = en.vx > 0 ? 6 : 4;
        }
        // player collision
        const p = this.player;
        if (aabb(p.px, p.py, p.w, p.h, en.px, en.py, en.w, en.h)) {
          const stomping = p.vy > 1 && (p.py + p.h) - en.py < en.h * 0.7;
          if (stomping) { en.dead = true; en.sprite.visible = false; p.vy = -C.bounce; this.coins += 0; SoundManager.playEnemyCollapse && SoundManager.playEnemyCollapse(); }
          else this.hurtPlayer();
        }
      }
    }

    updatePlatforms() {
      for (const pl of this.platforms) {
        pl.ppx = pl.px; pl.ppy = pl.py;
        pl.t += pl.speed;
        const k = (Math.sin(pl.t) + 1) / 2;
        pl.px = pl.ax + (pl.bx - pl.ax) * k;
        pl.py = pl.ay + (pl.by - pl.ay) * k;
      }
    }

    updateItems() {
      const p = this.player;
      for (const c of this.coinItems) {
        if (c.dead) continue; c.t += 0.15;
        if (aabb(p.px, p.py, p.w, p.h, c.px - CFG.TS / 3, c.py - CFG.TS / 3, CFG.TS * 0.66, CFG.TS * 0.66)) {
          c.dead = true; c.sprite.visible = false; this.coins++; this._hudDirty = true;
          SoundManager.playUseItem && SoundManager.playUseItem();
        }
      }
    }

    checkTriggers() {
      const p = this.player;
      for (const tr of this.triggers) {
        if (tr.dead) continue;
        const w = tr.w || CFG.TS, h = tr.h || CFG.TS;
        const tx = tr.px, ty = tr.py;
        if (!aabb(p.px, p.py, p.w, p.h, tx, ty + (tr.h ? tr.h - CFG.TS : 0), w, tr.h ? CFG.TS : h)) continue;
        if (tr.kind === ENT.POWERUP) { tr.dead = true; tr.sprite.visible = false; this.growPlayer(); this._hudDirty = true; }
        else if (tr.kind === ENT.CHECKPOINT) {
          if (!tr.activated) { tr.activated = true; tr.sprite.tint = 0x5dd66f; this.respawnPoint = { gx: tr.e.x, gy: tr.e.y }; }
        } else if (tr.kind === ENT.GOAL) { this.winLevel(); }
      }
    }

    growPlayer() {
      const p = this.player;
      if (!p.big) { p.big = true; const dh = p.hBig - p.hSmall; p.h = p.hBig; p.py -= dh; }
      SoundManager.playRecovery && SoundManager.playRecovery();
    }
    shrinkPlayer() {
      const p = this.player;
      if (p.big) { p.big = false; const dh = p.hBig - p.hSmall; p.h = p.hSmall; p.py += dh; }
    }

    hurtPlayer() {
      const p = this.player;
      if (p.invuln > 0) return;
      if (p.big) { this.shrinkPlayer(); p.invuln = 60; p.vy = -4; SoundManager.playDamage && SoundManager.playDamage(); }
      else this.killPlayer();
    }

    checkDeath() {
      const p = this.player;
      if (p.py > this.level.pixelHeight() + CFG.TS * 2) this.killPlayer();
      else if (this.touchesHazard(p) && p.invuln <= 0) this.hurtPlayer();
    }

    killPlayer() {
      if (this.state !== "play") return;
      this.lives--; this._hudDirty = true;
      SoundManager.playDamage && SoundManager.playDamage();
      if (this.lives < 0) { this.state = "gameover"; this.stateT = 0; this.drawMessage("GAME OVER", "#ff6b6b"); }
      else { this.respawn(); }
    }
    respawn() {
      const rp = this.respawnPoint;
      this.spawnPlayer(rp.gx, rp.gy);
    }
    winLevel() {
      if (this.state !== "play") return;
      this.state = "win"; this.stateT = 0;
      SoundManager.playVictory && SoundManager.playVictory();
      this.drawMessage("LEVEL COMPLETE!", "#5dd66f");
    }

    updateEndState() {
      this.stateT++;
      if (this.stateT > 40 && (this.jumpTriggered() || Input.isTriggered("cancel") || TouchInput.isTriggered())) this.leave();
    }
    leave() {
      if (this.returnToEditor) SceneManager.pop();
      else SceneManager.goto(Scene_Map);
    }

    // ---- Camera --------------------------------------------------------------
    updateCamera(snap) {
      const GW = Graphics.width, GH = Graphics.height, p = this.player;
      const tx = clamp(p.px + p.w / 2 - GW / 2, 0, Math.max(0, this.level.pixelWidth() - GW));
      const ty = clamp(p.py + p.h / 2 - GH * 0.58, 0, Math.max(0, this.level.pixelHeight() - GH));
      if (snap) { this.camX = tx; this.camY = ty; }
      else { this.camX += (tx - this.camX) * 0.18; this.camY += (ty - this.camY) * 0.14; }
    }

    // ---- Sprite sync ---------------------------------------------------------
    setCharFrame(spr, dir, pattern) {
      const nm = spr._char[0], idx = spr._char[1];
      const f = charFrame(nm, idx, dir, pattern);
      if (!f) return; spr.bitmap = f.bitmap; spr.setFrame(f.sx, f.sy, f.sw, f.sh);
    }
    syncSprites() {
      const cx = this.camX, cy = this.camY, p = this.player;
      // player
      this._playerSprite._char = [CFG.playerChar, CFG.playerIndex];
      const f = charFrame(CFG.playerChar, CFG.playerIndex, p.dir, p.pattern);
      if (f) { this._playerSprite.bitmap = f.bitmap; this._playerSprite.setFrame(f.sx, f.sy, f.sw, f.sh); }
      this._playerSprite.x = Math.round(p.px + p.w / 2 - cx);
      this._playerSprite.y = Math.round(p.py + p.h - cy);
      this._playerSprite.scale.y = p.big ? 1.35 : 1;
      this._playerSprite.opacity = (p.invuln > 0 && Math.floor(p.invuln / 4) % 2) ? 90 : 255;

      for (const en of this.enemies) { if (en.dead) continue; this.setCharFrame(en.sprite, en.dir, Math.floor(en.t / 10) % 3); en.sprite.x = Math.round(en.px + en.w / 2 - cx); en.sprite.y = Math.round(en.py + en.h - cy); }
      for (const c of this.coinItems) { if (c.dead) continue; this.setCharFrame(c.sprite, 2, Math.floor(c.t) % 3); c.sprite.x = Math.round(c.px - cx); c.sprite.y = Math.round(c.py + CFG.TS / 2 - cy + Math.sin(c.t) * 3); }
      for (const tr of this.triggers) { if (tr.dead) continue; if (tr.sprite._char) { this.setCharFrame(tr.sprite, 2, Math.floor((tr.t = (tr.t || 0) + 0.1)) % 3); tr.sprite.x = Math.round(tr.px - cx); tr.sprite.y = Math.round(tr.py + CFG.TS / 2 - cy); } else { tr.sprite.x = Math.round(tr.px - cx); tr.sprite.y = Math.round(tr.py - cy); } }
      for (const pl of this.platforms) { pl.sprite.x = Math.round(pl.px - cx); pl.sprite.y = Math.round(pl.py - cy); }
    }

    // ---- HUD & messages ------------------------------------------------------
    drawHud() {
      const b = this._hud.bitmap; b.clear();
      b.fontFace = $gameSystem.mainFontFace(); b.fontSize = 22; b.outlineWidth = 4; b.outlineColor = "rgba(0,0,0,0.6)";
      b.textColor = "#ffd166"; b.drawText("● " + this.coins, 16, 6, 120, 28, "left");
      b.textColor = "#ff8fa3"; b.drawText("♥ " + Math.max(0, this.lives), 150, 6, 120, 28, "left");
      if (this.player && this.player.big) { b.textColor = "#5dd66f"; b.drawText("BIG", 280, 6, 100, 28, "left"); }
    }
    drawMessage(text, color) {
      const b = this._msg.bitmap; b.clear();
      b.paintOpacity = 150; b.fillRect(0, Graphics.height / 2 - 60, Graphics.width, 120, "rgba(10,14,26,0.7)"); b.paintOpacity = 255;
      b.fontFace = $gameSystem.mainFontFace(); b.fontSize = 48; b.outlineWidth = 6; b.outlineColor = "rgba(0,0,0,0.7)";
      b.textColor = color; b.drawText(text, 0, Graphics.height / 2 - 44, Graphics.width, 56, "center");
      b.fontSize = 18; b.textColor = "#e7ecf5";
      b.drawText("Press Jump / Click to continue", 0, Graphics.height / 2 + 18, Graphics.width, 26, "center");
    }
  }
  PF.Scene_PFPlay = Scene_PFPlay;

  // ---------------------------------------------------------------------------
  // Global raw input tracking (adds keys MZ doesn't map + right mouse button)
  // ---------------------------------------------------------------------------
  PF._keys = {};
  PF._keysPrev = {};
  PF._rmb = false;

  if (!PF._inputHooked) {
    PF._inputHooked = true;
    document.addEventListener("keydown", (e) => { PF._keys[e.keyCode] = true; });
    document.addEventListener("keyup", (e) => { PF._keys[e.keyCode] = false; });
    document.addEventListener("mousedown", (e) => { if (e.button === 2) PF._rmb = true; });
    document.addEventListener("mouseup", (e) => { if (e.button === 2) PF._rmb = false; });
    document.addEventListener("contextmenu", (e) => {
      if (SceneManager._scene instanceof Scene_PFEditor) e.preventDefault();
    });

    // Snapshot previous key state AFTER each scene update so keyTriggered works.
    const _updateScene = SceneManager.updateScene;
    SceneManager.updateScene = function () {
      _updateScene.call(this);
      PF._keysPrev = Object.assign({}, PF._keys);
    };
  }

  // ---------------------------------------------------------------------------
  // Map hotkey → open editor
  // ---------------------------------------------------------------------------
  const _SceneMap_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function () {
    _SceneMap_update.call(this);
    if (CFG.hotkey && PF._keys[CFG.hotkey] && !PF._keysPrev[CFG.hotkey] && !$gameMessage.isBusy()) {
      PF._pendingLevel = null;
      SceneManager.push(Scene_PFEditor);
    }
  };

  // ---------------------------------------------------------------------------
  // Public API + Plugin commands
  // ---------------------------------------------------------------------------
  PF.openEditor = function (name) {
    if (name) {
      PF_Store.load(name).then((lv) => {
        PF._pendingLevel = lv || new PF_Level(name);
        SceneManager.push(Scene_PFEditor);
      });
    } else {
      PF._pendingLevel = null;
      SceneManager.push(Scene_PFEditor);
    }
  };
  PF.playLevel = function (name, allowReturn) {
    PF_Store.load(name).then((lv) => {
      if (!lv) { console.error("[PlatformerForge] level not found:", name); return; }
      PF._playLevel = lv;
      PF._returnToEditor = !!allowReturn;
      SceneManager.push(Scene_PFPlay);
    });
  };

  PluginManager.registerCommand(PLUGIN_NAME, "openEditor", (args) => {
    PF.openEditor(args.levelName && args.levelName.trim() ? args.levelName.trim() : null);
  });
  PluginManager.registerCommand(PLUGIN_NAME, "playLevel", (args) => {
    if (!args.levelName) return;
    PF.playLevel(args.levelName.trim(), args.returnToEditor === "true");
  });

})();
