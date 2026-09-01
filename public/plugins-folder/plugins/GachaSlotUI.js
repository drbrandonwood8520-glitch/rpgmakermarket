/*:
 * @target MZ
 * @plugindesc [v1.0.0] Slot-machine skin for Gacha System. Spinning reels, pull lever, blinking marquee, sound cues. Requires GachaSystem.js above it.
 * @author (you)
 * @base GachaSystem
 * @orderAfter GachaSystem
 * @url
 *
 * @help
 * ============================================================================
 * Gacha Slot Machine UI  (add-on for Gacha System)
 * ============================================================================
 * Turns the gacha pull into a casino slot machine: a framed cabinet, a lit
 * marquee, three spinning reels that land on your rarity symbols, a chrome
 * pull lever, and a deck of buttons (SPIN x1, SPIN x10, PAY TABLE, EXIT).
 * Everything is drawn in code — no image files to install.
 *
 * REQUIREMENTS
 *   Place this plugin BELOW "GachaSystem.js" in the Plugin Manager. It reuses
 *   your existing pools, rarities, costs, pity, and currency exactly as
 *   configured there.
 *
 * OPENING IT
 *   Use the plugin command "Open Slot Machine" (below), or leave
 *   "Replace default scene" ON and your existing "Open Gacha Scene" command
 *   will open the slot machine automatically.
 *
 * REELS -> RARITY
 *   When a player spins, the reels land on the symbol for the rarity that was
 *   rolled by the Gacha System, then the prize is revealed. Each rarity is
 *   auto-assigned a symbol (rarest gets the gold 7). You can override the
 *   mapping below.
 *
 * A SPIN x10 does one dramatic spin (landing on your best pull) and then shows
 * the full 10-prize results list.
 *
 * TERMS: Free for commercial and non-commercial projects. No warranty.
 *
 * ============================================================================
 *
 * @param marqueeText
 * @text Marquee Text
 * @desc Text on the lit sign. Leave blank to use the pool's name. %1 = pool name.
 * @default %1
 *
 * @param replaceDefault
 * @text Replace default scene
 * @desc If ON, the base plugin's "Open Gacha Scene" command opens this slot UI.
 * @type boolean
 * @default true
 *
 * @param symbolMap
 * @text Symbol Overrides
 * @desc Optional: force a symbol for a rarity key. Otherwise auto-assigned.
 * @type struct<SymMap>[]
 * @default []
 *
 * @param spinFrames
 * @text Reel Spin Frames
 * @desc How long the first reel spins (frames, 60 = 1s).
 * @type number
 * @min 20
 * @default 66
 *
 * @param reelStagger
 * @text Reel Stagger Frames
 * @desc Extra frames before each following reel stops.
 * @type number
 * @min 4
 * @default 16
 *
 * @param seLever
 * @text SE: Lever / Spin Start
 * @type file
 * @dir audio/se
 * @default Coin
 *
 * @param seReelStop
 * @text SE: Reel Stop
 * @type file
 * @dir audio/se
 * @default Switch2
 *
 * @param seWin
 * @text SE: Win Reveal
 * @type file
 * @dir audio/se
 * @default Saint5
 *
 * @param seJackpot
 * @text SE: Jackpot (top rarity)
 * @type file
 * @dir audio/se
 * @default Chime2
 *
 * @command openSlot
 * @text Open Slot Machine
 * @desc Opens the slot-machine gacha UI.
 *
 * @arg poolKey
 * @text Pool Key
 * @desc Which pool to open (blank = first pool).
 * @type string
 * @default
 */
/*~struct~SymMap:
 * @param rarity
 * @text Rarity Key
 * @type string
 * @param symbol
 * @text Symbol
 * @type select
 * @option Seven @value seven
 * @option Star @value star
 * @option Gem @value gem
 * @option Cherry @value cherry
 * @option Bar @value bar
 * @option Sword @value sword
 * @default seven
 */

(() => {
    "use strict";

    const PLUGIN = "GachaSlotUI";
    const P = PluginManager.parameters(PLUGIN);
    const MARQUEE = String(P.marqueeText || "%1");
    const REPLACE = String(P.replaceDefault) === "true";
    const SPIN_FRAMES = Number(P.spinFrames || 66);
    const STAGGER = Number(P.reelStagger || 16);
    const SE_LEVER = String(P.seLever || "");
    const SE_STOP = String(P.seReelStop || "");
    const SE_WIN = String(P.seWin || "");
    const SE_JACKPOT = String(P.seJackpot || "");

    let SYM_OVERRIDE = {};
    try {
        (JSON.parse(P.symbolMap || "[]")).forEach(s => {
            const o = JSON.parse(s);
            if (o && o.rarity) SYM_OVERRIDE[String(o.rarity)] = String(o.symbol || "seven");
        });
    } catch (e) { SYM_OVERRIDE = {}; }

    if (typeof window.GachaManager === "undefined") {
        console.error("GachaSlotUI: GachaSystem.js must be installed ABOVE this plugin.");
    }

    // Design coordinate space (scaled to fit the actual screen).
    const DW = 816, DH = 624;

    // ---- SE helper ----
    function playSe(name, vol, pitch) {
        if (name) AudioManager.playSe({ name: name, volume: vol || 90, pitch: pitch || 100, pan: 0 });
    }

    // ---- bitmap dirty helper (after raw-context drawing) ----
    function dirty(bitmap) {
        if (bitmap._setDirty) bitmap._setDirty();
        else if (bitmap._baseTexture && bitmap._baseTexture.update) bitmap._baseTexture.update();
    }
    function ctxOf(bitmap) { return bitmap.context; }

    // ---- drawing primitives ----
    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    function vgrad(ctx, x, y0, y1, stops) {
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        stops.forEach(s => g.addColorStop(s[0], s[1]));
        return g;
    }
    function hgrad(ctx, x0, x1, stops) {
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        stops.forEach(s => g.addColorStop(s[0], s[1]));
        return g;
    }
    const GOLD = [[0, "#fff3bf"], [0.35, "#f2c33f"], [0.7, "#c8892a"], [1, "#7d4f16"]];
    const GOLD_DARK = [[0, "#a9781f"], [1, "#5c3a10"]];
    const BODY = [[0, "#7a1122"], [0.5, "#560c18"], [1, "#38070f"]];
    const DECK = [[0, "#3a3f47"], [0.5, "#23272d"], [1, "#14171b"]];
    const CHROME = [[0, "#6b7681"], [0.25, "#eef3f7"], [0.5, "#aeb8c2"], [0.75, "#dfe6ec"], [1, "#5b6570"]];

    function fillRR(ctx, x, y, w, h, r, style) { roundRect(ctx, x, y, w, h, r); ctx.fillStyle = style; ctx.fill(); }
    function strokeRR(ctx, x, y, w, h, r, style, lw) { roundRect(ctx, x, y, w, h, r); ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.stroke(); }

    // ---- reel symbols (vector; no custom fonts needed) ----
    function star(ctx, cx, cy, s, color) {
        color = color || "#ffd24a";
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const rr = (i % 2 === 0) ? s : s * 0.42;
            const a = Math.PI * i / 5 - Math.PI / 2;
            const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = "#a8791a"; ctx.stroke();
    }
    function seven(ctx, cx, cy, s) {
        ctx.save();
        ctx.font = "bold " + Math.round(s * 2.1) + "px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 6; ctx.strokeStyle = "#7a2a00";
        ctx.strokeText("7", cx, cy + 2);
        const g = ctx.createLinearGradient(0, cy - s, 0, cy + s);
        g.addColorStop(0, "#fff3bf"); g.addColorStop(0.5, "#ffcf3f"); g.addColorStop(1, "#e07a17");
        ctx.fillStyle = g; ctx.fillText("7", cx, cy + 2);
        ctx.restore();
    }
    function gem(ctx, cx, cy, s) {
        const g = s * 0.95;
        const pts = [[0, -g], [g * 0.8, -g * 0.25], [g * 0.5, g], [-g * 0.5, g], [-g * 0.8, -g * 0.25]];
        ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(cx + p[0], cy + p[1]) : ctx.moveTo(cx + p[0], cy + p[1]));
        ctx.closePath(); ctx.fillStyle = "#8ef2ff"; ctx.fill();
        function tri(a, b, c, col) { ctx.beginPath(); ctx.moveTo(cx + a[0], cy + a[1]); ctx.lineTo(cx + b[0], cy + b[1]); ctx.lineTo(cx + c[0], cy + c[1]); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
        tri([0, -g], [g * 0.8, -g * 0.25], [0, -g * 0.1], "#c9faff");
        tri([0, -g], [-g * 0.8, -g * 0.25], [0, -g * 0.1], "#6ad6f5");
        tri([-g * 0.5, g], [0, -g * 0.1], [g * 0.5, g], "#2aa0d0");
        tri([g * 0.8, -g * 0.25], [0, -g * 0.1], [g * 0.5, g], "#59c8ec");
    }
    function cherry(ctx, cx, cy, s) {
        ctx.save();
        ctx.strokeStyle = "#2e8b2e"; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx - 5, cy - s * 0.7); ctx.bezierCurveTo(cx + 16, cy - s * 0.9, cx + 30, cy - s * 0.4, cx + s * 0.35, cy - s * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 5, cy - s * 0.7); ctx.bezierCurveTo(cx - 20, cy - s * 0.5, cx - 28, cy - s * 0.1, cx - s * 0.35, cy + s * 0.05); ctx.stroke();
        ctx.fillStyle = "#e21f3a"; ctx.beginPath(); ctx.arc(cx - s * 0.35, cy + s * 0.35, s * 0.32, 0, 7); ctx.fill();
        ctx.fillStyle = "#c11530"; ctx.beginPath(); ctx.arc(cx + s * 0.35, cy + s * 0.42, s * 0.32, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffd0d8"; ctx.beginPath(); ctx.arc(cx - s * 0.45, cy + s * 0.25, s * 0.09, 0, 7); ctx.fill();
        ctx.restore();
    }
    function bar(ctx, cx, cy, s) {
        const w = s * 1.7, h = s * 0.62;
        const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
        GOLD.forEach(st => g.addColorStop(st[0], st[1]));
        fillRR(ctx, cx - w / 2, cy - h / 2, w, h, 7, g);
        strokeRR(ctx, cx - w / 2, cy - h / 2, w, h, 7, "#7a4e12", 3);
        ctx.save(); ctx.font = "bold " + Math.round(h * 0.82) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#5a3208"; ctx.fillText("BAR", cx, cy + 1); ctx.restore();
    }
    function sword(ctx, cx, cy, s) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35);
        ctx.fillStyle = "#eef3f7"; fillRR(ctx, -6, -s * 0.85, 12, s * 0.85, 5);
        ctx.beginPath(); ctx.moveTo(-6, -s * 0.85); ctx.lineTo(0, -s); ctx.lineTo(6, -s * 0.85); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.fillStyle = "#ffcf52"; fillRR(ctx, -20, 0, 40, 10, 5);
        ctx.fillStyle = "#8a5a2b"; fillRR(ctx, -5, 10, 10, 24, 4);
        ctx.restore();
    }
    const SYMBOLS = { seven, star, gem, cherry, bar, sword };
    const SYMBOL_PRIORITY = ["seven", "gem", "star", "cherry", "bar", "sword"];

    // rarity key -> symbol
    let SYMBOL_FOR = {};
    function buildSymbolMap() {
        SYMBOL_FOR = {};
        const rs = (window.GachaManager && GachaManager.rarities) ? GachaManager.rarities.slice() : [];
        // rarest first (higher index = rarer in GachaSystem)
        const ordered = rs.map((r, i) => ({ key: r.key, i })).sort((a, b) => b.i - a.i);
        ordered.forEach((r, n) => {
            SYMBOL_FOR[r.key] = SYM_OVERRIDE[r.key] || SYMBOL_PRIORITY[Math.min(n, SYMBOL_PRIORITY.length - 1)];
        });
    }
    function symbolForRarity(key) { return SYMBOL_FOR[key] || "star"; }

    // easing
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeOutBack = t => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

    // ============================================================
    // Scene_GachaSlot
    // ============================================================
    function Scene_GachaSlot() { this.initialize(...arguments); }
    Scene_GachaSlot.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_GachaSlot.prototype.constructor = Scene_GachaSlot;

    Scene_GachaSlot.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
        this._pool = GachaManager.findPool(GachaManager._defaultPoolKey);
        this._state = "idle";
        this._btnIndex = 0;
        this._bulbPhase = 0;
        this._bulbTick = 0;
        this._creditsShown = GachaManager.currency();
        this._results = null;
        this._count = 1;
        buildSymbolMap();
    };

    Scene_GachaSlot.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        buildSymbolMap();
        this.createRoot();
        this.layout();
        this.createBackdrop();
        this.createCabinet();
        this.createBulbs();
        this.createReels();
        this.createLever();
        this.createMeters();
        this.createSelection();
        this.createOverlays();
        this.refreshSelection();
    };

    // scaled, centered design-space container
    Scene_GachaSlot.prototype.createRoot = function () {
        this._root = new Sprite();
        const s = Math.min(Graphics.boxWidth / DW, Graphics.boxHeight / DH);
        this._root.scale.set(s, s);
        this._root.x = Math.floor((Graphics.boxWidth - DW * s) / 2);
        this._root.y = Math.floor((Graphics.boxHeight - DH * s) / 2);
        this._rootScale = s;
        this.addChild(this._root);
    };

    // convert a screen touch to design coords
    Scene_GachaSlot.prototype.touchDesign = function () {
        return {
            x: (TouchInput.x - this._root.x) / this._rootScale,
            y: (TouchInput.y - this._root.y) / this._rootScale
        };
    };

    Scene_GachaSlot.prototype.layout = function () {
        const L = {};
        L.marquee = { x: 75, y: 46, w: DW - 150, h: 88 };
        L.reel = { x: 59, y: 160, w: 540, h: 256, pad: 9, gap: 7 };
        L.reel.gx = L.reel.x + L.reel.pad;
        L.reel.gy = L.reel.y + L.reel.pad;
        L.reel.gw = L.reel.w - L.reel.pad * 2;
        L.reel.gh = L.reel.h - L.reel.pad * 2;
        L.reel.rw = (L.reel.gw - L.reel.gap * 2) / 3;
        L.reel.payY = L.reel.gy + L.reel.gh / 2;
        L.lever = { x: 666, pivotY: 350, topY: 172, ballR: 28 };
        L.deck = { x: 48, y: 446, w: DW - 96, h: 134 };
        L.credits = { x: 75, y: 467, w: 235, h: 75 };
        L.bet = { x: 330, y: 467, w: 150, h: 75 };
        const bw = 138, bh = 56;
        L.buttons = [
            { x: 498, y: 460, w: bw, h: bh, label: "SPIN \u00D71", grad: [[0, "#7dffa6"], [0.5, "#22c258"], [1, "#0c7a34"]], glow: "#39ff88", act: "spin1" },
            { x: 646, y: 460, w: bw, h: bh, label: "SPIN \u00D710", grad: [[0, "#ffe79a"], [0.5, "#f6b12a"], [1, "#b56d0e"]], glow: "#ffcf3f", act: "spin10" },
            { x: 498, y: 522, w: bw, h: bh, label: "PAY TABLE", grad: [[0, "#a7dcff"], [0.5, "#2f9de0"], [1, "#155a9c"]], glow: "#4fc3ff", act: "rates" },
            { x: 646, y: 522, w: bw, h: bh, label: "EXIT", grad: [[0, "#ff9fae"], [0.5, "#e83247"], [1, "#9c1122"]], glow: "#ff5566", act: "exit" }
        ];
        this._L = L;
    };

    Scene_GachaSlot.prototype.newSprite = function (w, h, x, y) {
        const sp = new Sprite(new Bitmap(w, h));
        sp.x = x || 0; sp.y = y || 0;
        this._root.addChild(sp);
        return sp;
    };

    // dark casino backdrop
    Scene_GachaSlot.prototype.createBackdrop = function () {
        const sp = this.newSprite(DW, DH, 0, 0);
        const ctx = ctxOf(sp.bitmap);
        const g = ctx.createRadialGradient(DW / 2, DH * 0.42, 60, DW / 2, DH * 0.42, DW * 0.75);
        g.addColorStop(0, "#2a0d3a"); g.addColorStop(0.6, "#160726"); g.addColorStop(1, "#070310");
        ctx.fillStyle = g; ctx.fillRect(0, 0, DW, DH);
        dirty(sp.bitmap);
        this._backdrop = sp;
    };

    // static cabinet
    Scene_GachaSlot.prototype.createCabinet = function () {
        const L = this._L;
        const sp = this.newSprite(DW, DH, 0, 0);
        const ctx = ctxOf(sp.bitmap);
        // frame bevel
        fillRR(ctx, 13, 13, DW - 26, DH - 26, 27, vgrad(ctx, 0, 13, DH - 13, GOLD));
        fillRR(ctx, 20, 20, DW - 40, DH - 40, 22, vgrad(ctx, 0, 20, DH - 20, GOLD_DARK));
        fillRR(ctx, 29, 29, DW - 58, DH - 58, 17, vgrad(ctx, 0, 29, DH - 29, BODY));
        strokeRR(ctx, 29, 29, DW - 58, DH - 58, 17, "rgba(255,224,138,0.5)", 2);

        // marquee panel
        const m = L.marquee;
        fillRR(ctx, m.x - 8, m.y - 8, m.w + 16, m.h + 16, 17, vgrad(ctx, 0, m.y - 8, m.y + m.h + 8, GOLD_DARK));
        fillRR(ctx, m.x, m.y, m.w, m.h, 13, vgrad(ctx, 0, m.y, m.y + m.h, [[0, "#2b1147"], [1, "#160a2b"]]));
        strokeRR(ctx, m.x, m.y, m.w, m.h, 13, "rgba(255,224,138,0.6)", 2);
        // marquee title
        const title = MARQUEE.replace("%1", this._pool ? this._pool.name : "GACHA").toUpperCase();
        ctx.save();
        let fs = 46;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        do { ctx.font = "bold " + fs + "px sans-serif"; if (ctx.measureText(title).width <= m.w - 120) break; fs -= 2; } while (fs > 18);
        const tx = DW / 2, ty = m.y + m.h * 0.56;
        ctx.shadowColor = "rgba(255,180,40,0.9)"; ctx.shadowBlur = 16;
        ctx.lineWidth = 6; ctx.strokeStyle = "#4a1030"; ctx.strokeText(title, tx, ty);
        const tg = ctx.createLinearGradient(0, m.y, 0, m.y + m.h);
        tg.addColorStop(0, "#fff3bf"); tg.addColorStop(0.5, "#ffcf3f"); tg.addColorStop(1, "#e07a17");
        ctx.fillStyle = tg; ctx.fillText(title, tx, ty);
        ctx.restore();
        // small stars flanking
        star(ctx, m.x + 40, m.y + m.h / 2, 15, "#ffdf6b");
        star(ctx, m.x + m.w - 40, m.y + m.h / 2, 15, "#ffdf6b");

        // reel window bezel + glass
        const r = L.reel;
        fillRR(ctx, r.x - 7, r.y - 7, r.w + 14, r.h + 14, 15, vgrad(ctx, 0, r.y - 7, r.y + r.h + 7, GOLD_DARK));
        fillRR(ctx, r.x, r.y, r.w, r.h, 11, "#1a0f22");
        for (let c = 0; c < 3; c++) {
            const rx = r.gx + c * (r.rw + r.gap);
            fillRR(ctx, rx, r.gy, r.rw, r.gh, 7, vgrad(ctx, 0, r.gy, r.gy + r.gh, [[0, "#ffffff"], [0.5, "#efeadd"], [1, "#d7cfbe"]]));
        }
        // payline
        ctx.fillStyle = "rgba(255,58,79,0.10)"; ctx.fillRect(r.gx - 3, r.payY - 35, r.gw + 6, 70);
        ctx.fillStyle = "rgba(255,58,79,0.85)"; ctx.fillRect(r.gx - 3, r.payY - 2, r.gw + 6, 4);
        function tri(x, dir) { ctx.beginPath(); ctx.moveTo(x, r.payY - 11); ctx.lineTo(x + dir * 14, r.payY); ctx.lineTo(x, r.payY + 11); ctx.closePath(); ctx.fillStyle = "#ff3a4f"; ctx.fill(); }
        tri(r.gx - 15, 1); tri(r.gx + r.gw + 15, -1);

        // lever bracket + hub (static)
        const lv = L.lever;
        fillRR(ctx, lv.x - 26, lv.pivotY + 13, 52, 48, 9, vgrad(ctx, 0, lv.pivotY + 13, lv.pivotY + 61, GOLD_DARK));
        ctx.beginPath(); ctx.arc(lv.x, lv.pivotY, 19, 0, 7); ctx.fillStyle = hgrad(ctx, lv.x - 19, lv.x + 19, CHROME); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#39424b"; ctx.stroke();
        ctx.beginPath(); ctx.arc(lv.x, lv.pivotY, 6, 0, 7); ctx.fillStyle = "#2a2f35"; ctx.fill();

        // deck
        const d = L.deck;
        fillRR(ctx, d.x, d.y, d.w, d.h, 13, vgrad(ctx, 0, d.y, d.y + d.h, GOLD_DARK));
        fillRR(ctx, d.x + 8, d.y + 7, d.w - 16, d.h - 14, 10, vgrad(ctx, 0, d.y + 7, d.y + d.h - 7, DECK));

        // LCD frames + labels (values drawn on meter sprite)
        this.drawLcdFrame(ctx, L.credits, "CREDITS");
        this.drawLcdFrame(ctx, L.bet, "BET");

        // buttons (faces)
        L.buttons.forEach(b => this.drawButton(ctx, b));

        dirty(sp.bitmap);
        this._cabinet = sp;
    };

    Scene_GachaSlot.prototype.drawLcdFrame = function (ctx, box, label) {
        fillRR(ctx, box.x, box.y, box.w, box.h, 8, vgrad(ctx, 0, box.y, box.y + box.h, GOLD_DARK));
        fillRR(ctx, box.x + 4, box.y + 4, box.w - 8, box.h - 8, 6, vgrad(ctx, 0, box.y + 4, box.y + box.h - 4, [[0, "#0b1a0a"], [1, "#04120a"]]));
        ctx.save(); ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(138,223,136,0.85)"; ctx.fillText(label, box.x + 12, box.y + 10); ctx.restore();
    };

    Scene_GachaSlot.prototype.drawButton = function (ctx, b, pressed) {
        // socket
        fillRR(ctx, b.x - 4, b.y - 4, b.w + 8, b.h + 8, b.h / 2 + 4, "#0c0e11");
        const off = pressed ? 2 : 0;
        const g = ctx.createLinearGradient(0, b.y + off, 0, b.y + b.h + off);
        b.grad.forEach(st => g.addColorStop(st[0], st[1]));
        fillRR(ctx, b.x, b.y + off, b.w, b.h, b.h / 2, g);
        strokeRR(ctx, b.x, b.y + off, b.w, b.h, b.h / 2, "rgba(0,0,0,0.33)", 2);
        // specular
        fillRR(ctx, b.x + 8, b.y + 6 + off, b.w - 16, b.h * 0.4, b.h * 0.2, "rgba(255,255,255,0.35)");
        // label
        ctx.save(); ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.strokeText(b.label, b.x + b.w / 2, b.y + b.h / 2 + off);
        ctx.fillStyle = "#fff"; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + off); ctx.restore();
    };

    // ---- marquee bulbs (animated) ----
    Scene_GachaSlot.prototype.createBulbs = function () {
        this._bulbs = this.newSprite(DW, DH, 0, 0);
        this._bulbPositions = [];
        const m = this._L.marquee;
        const nx = 15;
        for (let i = 0; i <= nx; i++) {
            const x = m.x + 12 + (m.w - 24) * i / nx;
            this._bulbPositions.push([x, m.y - 1, i % 2]);
            this._bulbPositions.push([x, m.y + m.h + 1, (i + 1) % 2]);
        }
        const ny = 3;
        for (let j = 1; j < ny; j++) {
            const y = m.y + 12 + (m.h - 24) * j / ny;
            this._bulbPositions.push([m.x - 1, y, j % 2]);
            this._bulbPositions.push([m.x + m.w + 1, y, (j + 1) % 2]);
        }
        this.drawBulbs();
    };
    Scene_GachaSlot.prototype.drawBulbs = function () {
        const bm = this._bulbs.bitmap; bm.clear();
        const ctx = ctxOf(bm);
        this._bulbPositions.forEach(p => {
            const on = ((p[2] + this._bulbPhase) % 2) === 0;
            const r = 6;
            const gg = ctx.createRadialGradient(p[0], p[1], 1, p[0], p[1], r * 2.4);
            gg.addColorStop(0, on ? "rgba(255,224,122,0.95)" : "rgba(255,224,122,0.2)");
            gg.addColorStop(1, "rgba(255,224,122,0)");
            ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p[0], p[1], r * 2.4, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7);
            ctx.fillStyle = on ? "#fff2c0" : "#7a5a20"; ctx.fill();
            ctx.lineWidth = 1.2; ctx.strokeStyle = "#8a6a24"; ctx.stroke();
            if (on) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p[0] - 1.6, p[1] - 1.6, 2, 0, 7); ctx.fill(); }
        });
        dirty(bm);
    };

    // ---- reels ----
    Scene_GachaSlot.prototype.createReels = function () {
        const r = this._L.reel;
        this._reels = [];
        for (let c = 0; c < 3; c++) {
            const rx = r.gx + c * (r.rw + r.gap);
            const bmp = new Bitmap(Math.ceil(r.rw), Math.ceil(r.gh));
            const sp = new Sprite(bmp);
            sp.x = rx; sp.y = r.gy;
            this._root.addChild(sp);
            const reel = {
                sprite: sp, bitmap: bmp, w: r.rw, h: r.gh, cellH: r.gh / 3,
                seq: [], offset: 0, startOff: 0, endOff: 0,
                t: 0, dur: 1, delay: 0, spinning: false, landed: true, stopped: true
            };
            this._reels.push(reel);
            this.fillReelIdle(reel);
        }
        // glass sheen overlay (drawn above reels)
        const sh = this.newSprite(Math.ceil(r.gw), Math.ceil(r.gh / 2), r.gx, r.gy);
        const sctx = ctxOf(sh.bitmap);
        const g = sctx.createLinearGradient(0, 0, r.gw, r.gh / 2);
        g.addColorStop(0, "rgba(255,255,255,0.45)"); g.addColorStop(0.3, "rgba(255,255,255,0.05)"); g.addColorStop(1, "rgba(255,255,255,0)");
        sctx.fillStyle = g; sctx.fillRect(0, 0, r.gw, r.gh / 2);
        dirty(sh.bitmap);
        sh.alpha = 0.6;
    };
    Scene_GachaSlot.prototype.randSym = function () {
        return SYMBOL_PRIORITY[Math.floor(Math.random() * SYMBOL_PRIORITY.length)];
    };
    Scene_GachaSlot.prototype.fillReelIdle = function (reel) {
        reel.seq = [this.randSym(), this.randSym(), this.randSym()];
        reel.offset = 0;
        this.drawReel(reel, [reel.seq[0], reel.seq[1], reel.seq[2]]);
    };
    Scene_GachaSlot.prototype.drawSymbolCell = function (ctx, key, cx, cy) {
        const fn = SYMBOLS[key] || star;
        fn(ctx, cx, cy, this._L.reel.gh / 3 * 0.34);
    };
    // draw reel from its seq + current offset (scrolling)
    Scene_GachaSlot.prototype.drawReel = function (reel, forced) {
        const bm = reel.bitmap; bm.clear();
        const ctx = ctxOf(bm);
        if (forced) {
            for (let k = 0; k < 3; k++) this.drawSymbolCell(ctx, forced[k], reel.w / 2, reel.cellH * (k + 0.5));
            dirty(bm); return;
        }
        const cellH = reel.cellH;
        const top = Math.floor(reel.offset / cellH);
        const count = Math.ceil(reel.h / cellH) + 2;
        for (let k = -1; k < count; k++) {
            const idx = top + k;
            if (idx < 0 || idx >= reel.seq.length) continue;
            const y = idx * cellH - reel.offset + cellH / 2;
            if (y < -cellH || y > reel.h + cellH) continue;
            this.drawSymbolCell(ctx, reel.seq[idx], reel.w / 2, y);
        }
        dirty(bm);
    };
    // configure a reel to spin and land on target symbol
    Scene_GachaSlot.prototype.armReel = function (reel, targetSym, dur, delay) {
        const N = 34;              // target lands at this index
        const seq = [];
        for (let i = 0; i < N; i++) seq.push(this.randSym());
        seq.push(targetSym);       // index N = target
        seq.push(this.randSym()); seq.push(this.randSym());
        reel.seq = seq;
        const cellH = reel.cellH;
        reel.endOff = N * cellH + cellH / 2 - reel.h / 2;
        reel.startOff = reel.endOff - 26 * cellH;
        if (reel.startOff < 0) reel.startOff = 0;
        reel.offset = reel.startOff;
        reel.t = 0; reel.dur = dur; reel.delay = delay;
        reel.spinning = true; reel.landed = false; reel.stopped = false;
        this.drawReel(reel);
    };

    // ---- lever (rotating) ----
    Scene_GachaSlot.prototype.createLever = function () {
        const lv = this._L.lever;
        const rodLen = lv.pivotY - lv.topY;
        const w = 90, h = rodLen + lv.ballR + 40;
        const bmp = new Bitmap(w, h);
        const ctx = ctxOf(bmp);
        const cx = w / 2;
        const ballCy = lv.ballR + 6;
        const pivotCy = h - 20;
        // rod
        fillRR(ctx, cx - 6, ballCy, 12, pivotCy - ballCy, 6, hgrad(ctx, cx - 6, cx + 6, CHROME));
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(cx - 2, ballCy + 6, 2, pivotCy - ballCy - 10);
        // ball
        const bg = ctx.createRadialGradient(cx - 8, ballCy - 8, 3, cx, ballCy, lv.ballR);
        bg.addColorStop(0, "#ff9db0"); bg.addColorStop(0.35, "#e8253f"); bg.addColorStop(1, "#8c0d1c");
        ctx.beginPath(); ctx.arc(cx, ballCy, lv.ballR, 0, 7); ctx.fillStyle = bg; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#5c0a14"; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx - 8, ballCy - 9, 9, 5, 0, 0, 7); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
        dirty(bmp);
        const sp = new Sprite(bmp);
        sp.anchor.set(0.5, 1);                // pivot at bottom-center
        sp.x = lv.x; sp.y = lv.pivotY + (h - pivotCy);
        this._root.addChild(sp);
        this._lever = sp;
        this._leverT = 0; this._leverActive = false; this._leverDir = 1;
    };
    Scene_GachaSlot.prototype.updateLeverAnim = function () {
        if (!this._leverActive) return false;
        this._leverT += 1;
        const down = 10, up = 18, total = down + up;
        if (this._leverT <= down) {
            this._lever.rotation = 0.5 * easeOutCubic(this._leverT / down);
        } else if (this._leverT <= total) {
            const t = (this._leverT - down) / up;
            this._lever.rotation = 0.5 * (1 - easeOutBack(t));
        } else {
            this._lever.rotation = 0; this._leverActive = false;
        }
        return this._leverT === down; // returns true on the frame it hits bottom
    };

    // ---- meters ----
    Scene_GachaSlot.prototype.createMeters = function () {
        this._meter = this.newSprite(DW, DH, 0, 0);
        this.drawMeters();
    };
    Scene_GachaSlot.prototype.drawMeters = function () {
        const bm = this._meter.bitmap; bm.clear();
        const ctx = ctxOf(bm);
        const cr = this._L.credits, bt = this._L.bet;
        ctx.textBaseline = "alphabetic";
        ctx.font = "bold 34px sans-serif"; ctx.textAlign = "right";
        ctx.fillStyle = "#7dff7a";
        ctx.fillText(Math.floor(this._creditsShown).toLocaleString(), cr.x + cr.w - 14, cr.y + cr.h - 14);
        const cost = this._pool ? (this._btnIndex === 1 ? this._pool.costMulti : this._pool.costSingle) : 0;
        ctx.fillStyle = "#ffd24a";
        ctx.fillText(String(cost), bt.x + bt.w - 14, bt.y + bt.h - 14);
        dirty(bm);
    };

    // ---- selection highlight ----
    Scene_GachaSlot.prototype.createSelection = function () {
        this._sel = this.newSprite(DW, DH, 0, 0);
    };
    Scene_GachaSlot.prototype.refreshSelection = function () {
        const bm = this._sel.bitmap; bm.clear();
        const b = this._L.buttons[this._btnIndex];
        if (b) {
            const ctx = ctxOf(bm);
            const pulse = 3 + 2 * Math.sin(Graphics.frameCount * 0.15);
            strokeRR(ctx, b.x - 4, b.y - 4, b.w + 8, b.h + 8, b.h / 2 + 4, "#fff7c8", pulse);
            strokeRR(ctx, b.x - 4, b.y - 4, b.w + 8, b.h + 8, b.h / 2 + 4, b.glow, 1.5);
            dirty(bm);
        }
        this.drawMeters();
    };

    // ---- overlays (pay table / result) ----
    Scene_GachaSlot.prototype.createOverlays = function () {
        this._overlay = this.newSprite(DW, DH, 0, 0);
        this._overlay.visible = false;
    };
    Scene_GachaSlot.prototype.hideOverlay = function () { this._overlay.visible = false; this._overlay.bitmap.clear(); };

    Scene_GachaSlot.prototype.showPayTable = function () {
        const bm = this._overlay.bitmap; bm.clear();
        const ctx = ctxOf(bm);
        ctx.fillStyle = "rgba(6,3,16,0.72)"; ctx.fillRect(0, 0, DW, DH);
        const px = 208, py = 120, pw = 400, ph = 384;
        fillRR(ctx, px - 6, py - 6, pw + 12, ph + 12, 16, vgrad(ctx, 0, py, py + ph, GOLD));
        fillRR(ctx, px, py, pw, ph, 12, vgrad(ctx, 0, py, py + ph, [[0, "#2b1147"], [1, "#160a2b"]]));
        ctx.save(); ctx.textAlign = "center"; ctx.font = "bold 26px sans-serif"; ctx.fillStyle = "#ffd24a";
        ctx.fillText("PAY TABLE", DW / 2, py + 40); ctx.restore();
        const pool = this._pool;
        const avail = GachaManager.availableRarities(pool);
        const total = avail.reduce((s, r) => s + Math.max(0, r.rate), 0) || 1;
        let y = py + 78;
        avail.slice().reverse().forEach(r => {
            const sym = symbolForRarity(r.key);
            (SYMBOLS[sym] || star)(ctx, px + 42, y + 4, 16);
            ctx.save(); ctx.textAlign = "left"; ctx.font = "bold 20px sans-serif"; ctx.fillStyle = r.color;
            ctx.fillText(r.name, px + 78, y + 11);
            ctx.textAlign = "right"; ctx.fillStyle = "#fdf3ff";
            ctx.fillText((Math.max(0, r.rate) / total * 100).toFixed(2) + "%", px + pw - 24, y + 11);
            ctx.restore();
            y += 46;
        });
        if (pool.pityCount > 0) {
            const pr = GachaManager.findRarity(pool.pityRarity);
            ctx.save(); ctx.textAlign = "center"; ctx.font = "16px sans-serif"; ctx.fillStyle = "#c9b6e6";
            ctx.fillText("Guaranteed " + (pr ? pr.name : pool.pityRarity) + " within " + pool.pityCount + " spins", DW / 2, y + 14);
            ctx.restore();
        }
        ctx.save(); ctx.textAlign = "center"; ctx.font = "15px sans-serif"; ctx.fillStyle = "#ffe08a";
        ctx.fillText("Press OK / tap to close", DW / 2, py + ph - 20); ctx.restore();
        dirty(bm);
        this._overlay.visible = true;
        this._state = "paytable";
    };

    Scene_GachaSlot.prototype.showResult = function () {
        const bm = this._overlay.bitmap; bm.clear();
        const ctx = ctxOf(bm);
        ctx.fillStyle = "rgba(6,3,16,0.72)"; ctx.fillRect(0, 0, DW, DH);
        const results = this._results || [];
        if (this._count > 1) {
            const px = 158, py = 70, pw = 500, ph = 484;
            fillRR(ctx, px - 6, py - 6, pw + 12, ph + 12, 16, vgrad(ctx, 0, py, py + ph, GOLD));
            fillRR(ctx, px, py, pw, ph, 12, vgrad(ctx, 0, py, py + ph, [[0, "#241041"], [1, "#140a26"]]));
            ctx.save(); ctx.textAlign = "center"; ctx.font = "bold 24px sans-serif"; ctx.fillStyle = "#ffd24a";
            ctx.fillText(results.length + "-PULL RESULTS", DW / 2, py + 34); ctx.restore();
            let y = py + 60;
            const rowH = (ph - 96) / Math.max(results.length, 1);
            results.forEach(res => {
                const sym = symbolForRarity(res.rarity ? res.rarity.key : "");
                (SYMBOLS[sym] || star)(ctx, px + 34, y + rowH / 2, Math.min(15, rowH * 0.32));
                ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle";
                ctx.font = "bold 18px sans-serif"; ctx.fillStyle = res.rarity ? res.rarity.color : "#fff";
                const name = GachaManager.entryName(res.entry) + (res.entry && res.entry.type === "actor" ? " (Character)" : "");
                ctx.fillText(name, px + 62, y + rowH / 2);
                if (res.converted) { ctx.textAlign = "right"; ctx.fillStyle = "#ffd24a"; ctx.font = "15px sans-serif"; ctx.fillText("Dupe +" + res.reward, px + pw - 20, y + rowH / 2); }
                ctx.restore();
                y += rowH;
            });
        } else {
            const res = results[0] || {};
            const px = 228, py = 150, pw = 360, ph = 300;
            fillRR(ctx, px - 6, py - 6, pw + 12, ph + 12, 18, vgrad(ctx, 0, py, py + ph, GOLD));
            fillRR(ctx, px, py, pw, ph, 14, vgrad(ctx, 0, py, py + ph, [[0, "#241041"], [1, "#140a26"]]));
            ctx.save(); ctx.textAlign = "center";
            ctx.font = "bold 22px sans-serif"; ctx.fillStyle = "#ffe08a"; ctx.fillText("YOU WON", DW / 2, py + 40);
            const sym = symbolForRarity(res.rarity ? res.rarity.key : "");
            (SYMBOLS[sym] || star)(ctx, DW / 2, py + 108, 44);
            ctx.font = "bold 15px sans-serif"; ctx.fillStyle = res.rarity ? res.rarity.color : "#fff";
            ctx.fillText((res.rarity ? res.rarity.name : "").toUpperCase(), DW / 2, py + 158);
            ctx.font = "bold 24px sans-serif"; ctx.fillStyle = "#fdf3ff";
            const name = GachaManager.entryName(res.entry) + (res.entry && res.entry.type === "actor" ? " (Character)" : "");
            ctx.fillText(name, DW / 2, py + 196);
            if (res.converted) { ctx.font = "16px sans-serif"; ctx.fillStyle = "#ffd24a"; ctx.fillText("Duplicate \u2192 +" + res.reward + " Gems", DW / 2, py + 228); }
            ctx.font = "14px sans-serif"; ctx.fillStyle = "#ffe08a"; ctx.fillText("Press OK / tap to continue", DW / 2, py + ph - 22);
            ctx.restore();
        }
        dirty(bm);
        this._overlay.visible = true;
        this._state = "reveal";
    };

    // ============================================================
    // update loop
    // ============================================================
    Scene_GachaSlot.prototype.update = function () {
        Scene_MenuBase.prototype.update.call(this);
        this.updateBulbTick();
        switch (this._state) {
            case "idle": this.updateIdle(); break;
            case "lever": this.updateLeverState(); break;
            case "spin": this.updateSpinState(); break;
            case "reveal": this.updateRevealState(); break;
            case "paytable": this.updatePayTableState(); break;
        }
        this.updateCreditsTick();
        if (this._state === "idle") { this.refreshSelection(); }
    };

    Scene_GachaSlot.prototype.updateBulbTick = function () {
        if (++this._bulbTick >= 18) { this._bulbTick = 0; this._bulbPhase ^= 1; this.drawBulbs(); }
    };
    Scene_GachaSlot.prototype.updateCreditsTick = function () {
        const target = GachaManager.currency();
        if (this._creditsShown !== target) {
            const d = target - this._creditsShown;
            const step = Math.max(1, Math.floor(Math.abs(d) / 8));
            this._creditsShown += Math.sign(d) * Math.min(step, Math.abs(d));
            if (Math.abs(target - this._creditsShown) < 1) this._creditsShown = target;
            this.drawMeters();
        }
    };

    Scene_GachaSlot.prototype.updateIdle = function () {
        // keyboard nav
        if (Input.isRepeated("right")) { this._btnIndex = (this._btnIndex + 1) % 4; SoundManager.playCursor(); }
        else if (Input.isRepeated("left")) { this._btnIndex = (this._btnIndex + 3) % 4; SoundManager.playCursor(); }
        else if (Input.isRepeated("down")) { this._btnIndex = (this._btnIndex + 2) % 4; SoundManager.playCursor(); }
        else if (Input.isRepeated("up")) { this._btnIndex = (this._btnIndex + 2) % 4; SoundManager.playCursor(); }

        if (Input.isTriggered("ok")) { this.activate(this._L.buttons[this._btnIndex].act); return; }
        if (Input.isTriggered("cancel")) { this.commandExit(); return; }

        if (TouchInput.isTriggered()) {
            const p = this.touchDesign();
            // button hit?
            for (let i = 0; i < this._L.buttons.length; i++) {
                const b = this._L.buttons[i];
                if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
                    this._btnIndex = i; this.activate(b.act); return;
                }
            }
            // lever hit?
            const lv = this._L.lever;
            if (Math.abs(p.x - lv.x) < 46 && p.y > lv.topY - 40 && p.y < lv.pivotY + 20) { this.startSpin(1); return; }
        }
        if (TouchInput.isCancelled()) { this.commandExit(); }
    };

    Scene_GachaSlot.prototype.activate = function (act) {
        switch (act) {
            case "spin1": this.startSpin(1); break;
            case "spin10": this.startSpin(this._pool ? this._pool.multiCount : 10); break;
            case "rates": SoundManager.playOk(); this.showPayTable(); break;
            case "exit": this.commandExit(); break;
        }
    };
    Scene_GachaSlot.prototype.commandExit = function () { SoundManager.playCancel(); this.popScene(); };

    Scene_GachaSlot.prototype.startSpin = function (count) {
        const pool = this._pool;
        if (!pool) return;
        const cost = GachaManager.costFor(pool, count);
        if (!GachaManager.canAfford(cost)) { SoundManager.playBuzzer(); return; }
        const results = GachaManager.performPull(pool, count);
        if (!results) { SoundManager.playBuzzer(); return; }
        this._results = results; this._count = count;
        // best rarity for the reel symbol
        let best = results[0].rarity;
        results.forEach(r => { if (r.rarity && GachaManager.rarityIndex(r.rarity.key) > GachaManager.rarityIndex(best.key)) best = r.rarity; });
        this._bestRarity = best;
        const sym = symbolForRarity(best ? best.key : "");
        const topTier = best && GachaManager.rarityIndex(best.key) >= GachaManager.rarities.length - 1;
        // arm reels with stagger; extra suspense for top tier on the last reel
        this._reels.forEach((reel, i) => {
            let dur = SPIN_FRAMES + i * STAGGER;
            if (i === 2 && topTier) dur += 34;
            this.armReel(reel, sym, dur, 0);
        });
        this._pendingSym = sym;
        // start lever
        this._leverT = 0; this._leverActive = true;
        this._reelsStarted = false;
        playSe(SE_LEVER, 90, 100);
        this._state = "lever";
    };

    Scene_GachaSlot.prototype.updateLeverState = function () {
        const hitBottom = this.updateLeverAnim();
        if (hitBottom || !this._leverActive) {
            // begin reels once the lever reaches the bottom of its throw
            if (!this._reelsStarted) { this._reelsStarted = true; this._state = "spin"; }
        }
    };

    Scene_GachaSlot.prototype.updateSpinState = function () {
        this.updateLeverAnim(); // let it spring back while reels spin
        let allStopped = true;
        this._reels.forEach(reel => {
            if (!reel.spinning) return;
            reel.t += 1;
            const t = Math.min(1, reel.t / reel.dur);
            reel.offset = reel.startOff + (reel.endOff - reel.startOff) * easeOutCubic(t);
            this.drawReel(reel);
            if (t >= 1) {
                reel.spinning = false; reel.stopped = true;
                reel.offset = reel.endOff; this.drawReel(reel);
                playSe(SE_STOP, 80, 100);
            } else { allStopped = false; }
        });
        if (allStopped) {
            this._revealDelay = 18;
            const topTier = this._bestRarity && GachaManager.rarityIndex(this._bestRarity.key) >= GachaManager.rarities.length - 1;
            playSe(topTier ? SE_JACKPOT : SE_WIN, 95, 100);
            this._state = "reveal";
            this._pendingReveal = true;
        }
    };

    Scene_GachaSlot.prototype.updateRevealState = function () {
        if (this._pendingReveal) {
            if (this._revealDelay > 0) { this._revealDelay--; return; }
            this._pendingReveal = false;
            this.showResult();
            return;
        }
        if (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered()) {
            this.hideOverlay();
            this._reels.forEach(r => this.fillReelIdle(r));
            this._state = "idle";
        }
    };

    Scene_GachaSlot.prototype.updatePayTableState = function () {
        if (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered()) {
            SoundManager.playCancel(); this.hideOverlay(); this._state = "idle";
        }
    };

    // ============================================================
    // registration
    // ============================================================
    window.Scene_GachaSlot = Scene_GachaSlot;

    PluginManager.registerCommand(PLUGIN, "openSlot", args => {
        GachaManager._defaultPoolKey = String(args.poolKey || "").trim() || null;
        SceneManager.push(Scene_GachaSlot);
    });

    // Optionally redirect the base plugin's "Open Gacha Scene" to the slot UI.
    if (REPLACE) {
        PluginManager.registerCommand("GachaSystem", "openScene", args => {
            GachaManager._defaultPoolKey = String(args.poolKey || "").trim() || null;
            SceneManager.push(Scene_GachaSlot);
        });
    }
})();
