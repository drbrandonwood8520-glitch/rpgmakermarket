//=============================================================================
// TQE_Lockpick.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Modern lockpicking minigame: Skyrim-style rotating pick + timed QTE marker bar. Zero image assets, one-command setup.
 * @author Claude
 * @url
 *
 * @help
 * ===========================================================================
 * TQE Lockpick — quick start
 * ===========================================================================
 * Keep this file named  TQE_Lockpick.js  and enable it in Plugin Manager.
 * No images or sound files are required — everything is drawn in code and it
 * uses the default MZ system sound effects.
 *
 * ---------------------------------------------------------------------------
 * The easiest setup (opening a chest / door with NO global switch):
 * ---------------------------------------------------------------------------
 *   1. On the chest/door event PAGE 1, add:
 *          Plugin Command > TQE_Lockpick > Start Lockpicking
 *          - Mechanic:            Rotating Pick   (or Marker Bar)
 *          - Difficulty:          Apprentice
 *          - Self Switch On Success:  A
 *   2. Add a PAGE 2 to the same event with the condition "Self Switch A ON".
 *      Put the opened-chest graphic + "Got item" contents there.
 *
 *   That's it. Success flips the event's own Self Switch A -> page 2 shows.
 *   On failure nothing happens (the player can walk up and try again),
 *   unless you configure a penalty below.
 *
 * ---------------------------------------------------------------------------
 * Branching setup (using a Game Switch):
 * ---------------------------------------------------------------------------
 *   Plugin Command > Start Lockpicking, set "Result Switch" to e.g. #20.
 *   Then:  Conditional Branch: Switch #20 is ON  ->  success stuff
 *                                            Else ->  failure stuff
 *   The switch is set ON for success, OFF for failure before the event resumes.
 *   "Result Variable" (optional) is set to 1 (success) or 0 (fail).
 *
 * ---------------------------------------------------------------------------
 * Controls (auto-supports keyboard, gamepad, mouse & touch)
 * ---------------------------------------------------------------------------
 *   ROTATING PICK:
 *     Aim   -> Left / Right arrows, gamepad d-pad, or drag the mouse.
 *     Force -> hold OK (Z / Enter / Space / gamepad A) or hold the FORCE button.
 *     Keep the pick near the sweet spot while forcing to turn the lock.
 *     Force at a bad angle too long and the pick breaks.
 *   MARKER BAR:
 *     Strike -> OK (Z / Enter / Space / gamepad A) or click / tap anywhere.
 *     Stop the sweeping marker inside the glowing zone. Hit the bright core
 *     for a "PERFECT". Land all required hits to win.
 *   Cancel (X / Esc / right-click) backs out — counts as a failure, no penalty.
 *
 * ---------------------------------------------------------------------------
 * Difficulty tiers (edit the DIFFICULTY object near the top of the code if you
 * want to fine-tune). Higher tiers = tighter sweet spot / faster & smaller
 * zone / more required hits / fewer picks.
 *   Novice · Apprentice · Adept · Expert · Master
 * ---------------------------------------------------------------------------
 * Terms of use: free for commercial & non-commercial projects. Credit optional.
 * ===========================================================================
 *
 * @param ----- Appearance -----
 * @default
 *
 * @param accentColor
 * @parent ----- Appearance -----
 * @text Accent Color
 * @desc Main UI / glow color (hex). Used for zones, sweet-spot glow, progress.
 * @default #4fd1c5
 *
 * @param pickColor
 * @parent ----- Appearance -----
 * @text Pick Color
 * @desc Color of the lockpick / marker (hex).
 * @default #e2b04a
 *
 * @param dangerColor
 * @parent ----- Appearance -----
 * @text Danger Color
 * @desc Color used for strain, breaks and failure (hex).
 * @default #ff5d5d
 *
 * @param backgroundDim
 * @parent ----- Appearance -----
 * @text Background Dim
 * @type number
 * @min 0
 * @max 255
 * @desc How much to darken the map behind the minigame (0 = none, 255 = black).
 * @default 150
 *
 * @param ----- Defaults -----
 * @default
 *
 * @param defaultMechanic
 * @parent ----- Defaults -----
 * @text Default Mechanic
 * @type select
 * @option Rotating Pick
 * @value rotate
 * @option Marker Bar
 * @value bar
 * @desc Used when a command's Mechanic is set to "Plugin Default".
 * @default rotate
 *
 * @param defaultResultSwitch
 * @parent ----- Defaults -----
 * @text Default Result Switch
 * @type switch
 * @desc Fallback switch set ON=success / OFF=fail when a command leaves Result Switch at 0.
 * @default 0
 *
 * @param defaultResultVariable
 * @parent ----- Defaults -----
 * @text Default Result Variable
 * @type variable
 * @desc Fallback variable set to 1=success / 0=fail when a command leaves Result Variable at 0.
 * @default 0
 *
 * @param ----- Lockpick Items -----
 * @default
 *
 * @param useLockpickItems
 * @parent ----- Lockpick Items -----
 * @text Use Lockpick Items
 * @type boolean
 * @desc If ON, the player must own the lockpick item; each break consumes one. Running out = failure.
 * @default false
 *
 * @param lockpickItemId
 * @parent ----- Lockpick Items -----
 * @text Lockpick Item
 * @type item
 * @desc The consumable item used as a lockpick (only if Use Lockpick Items is ON).
 * @default 0
 *
 * @param ----- Failure Behavior -----
 * @default
 *
 * @param allowRetryOnBreak
 * @parent ----- Failure Behavior -----
 * @text Allow Retry On Break
 * @type boolean
 * @desc ON: keep trying after a pick breaks until picks run out. OFF: one break = instant failure.
 * @default true
 *
 * @param damagePerBreak
 * @parent ----- Failure Behavior -----
 * @text Damage Per Break
 * @type number
 * @min 0
 * @desc HP damage dealt to the party leader each time a pick breaks (0 = none).
 * @default 0
 *
 * @param damageIsPercent
 * @parent ----- Failure Behavior -----
 * @text Damage Is Percent
 * @type boolean
 * @desc If ON, Damage Per Break is a % of the leader's Max HP instead of a flat amount.
 * @default false
 *
 * @param failCommonEvent
 * @parent ----- Failure Behavior -----
 * @text Fail Common Event
 * @type common_event
 * @desc Common event reserved (runs after returning to the map) when the whole attempt fails. 0 = none.
 * @default 0
 *
 * @param breakScreenShake
 * @parent ----- Failure Behavior -----
 * @text Break Screen Shake
 * @type boolean
 * @desc Shake the screen when a pick breaks.
 * @default true
 *
 * @param ----- Sound Effects -----
 * @default
 *
 * @param seClick
 * @parent ----- Sound Effects -----
 * @text SE: Strike / Force
 * @type struct<Se>
 * @desc Played when striking the bar / starting to force the pick.
 * @default {"name":"Cursor2","volume":"70","pitch":"110"}
 *
 * @param seTick
 * @parent ----- Sound Effects -----
 * @text SE: Good Hit
 * @type struct<Se>
 * @desc Played on a successful bar hit / progress tick.
 * @default {"name":"Cursor1","volume":"80","pitch":"120"}
 *
 * @param seBreak
 * @parent ----- Sound Effects -----
 * @text SE: Pick Break
 * @type struct<Se>
 * @desc Played when a lockpick breaks.
 * @default {"name":"Buzzer1","volume":"80","pitch":"110"}
 *
 * @param seSuccess
 * @parent ----- Sound Effects -----
 * @text SE: Success
 * @type struct<Se>
 * @desc Played when the lock is opened.
 * @default {"name":"Item3","volume":"90","pitch":"100"}
 *
 * @param seFail
 * @parent ----- Sound Effects -----
 * @text SE: Failure
 * @type struct<Se>
 * @desc Played when the whole attempt fails.
 * @default {"name":"Buzzer1","volume":"90","pitch":"80"}
 *
 * @command StartLockpick
 * @text Start Lockpicking
 * @desc Opens the lockpicking minigame, then sets your chosen switch/variable/self-switch based on the outcome.
 *
 * @arg mechanic
 * @text Mechanic
 * @type select
 * @option Plugin Default
 * @value default
 * @option Rotating Pick
 * @value rotate
 * @option Marker Bar
 * @value bar
 * @default default
 *
 * @arg difficulty
 * @text Difficulty
 * @type select
 * @option Novice
 * @option Apprentice
 * @option Adept
 * @option Expert
 * @option Master
 * @default Apprentice
 *
 * @arg resultSwitch
 * @text Result Switch
 * @type switch
 * @desc Set ON for success, OFF for failure. Leave at 0 to use the plugin default.
 * @default 0
 *
 * @arg resultVariable
 * @text Result Variable
 * @type variable
 * @desc Set to 1 for success, 0 for failure. Leave at 0 to use the plugin default.
 * @default 0
 *
 * @arg selfSwitchOnSuccess
 * @text Self Switch On Success
 * @type select
 * @option (none)
 * @value none
 * @option A
 * @option B
 * @option C
 * @option D
 * @desc If set, flips THIS event's self switch ON when the lock is opened. Great for chests/doors.
 * @default none
 */

/*~struct~Se:
 * @param name
 * @text File
 * @type file
 * @dir audio/se
 * @default Cursor1
 * @param volume
 * @text Volume
 * @type number
 * @min 0
 * @max 100
 * @default 80
 * @param pitch
 * @text Pitch
 * @type number
 * @min 50
 * @max 150
 * @default 100
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "TQE_Lockpick";
    const P = PluginManager.parameters(PLUGIN_NAME);

    //---------------------------------------------------------------------
    // Parameter helpers
    //---------------------------------------------------------------------
    const asBool = (v) => v === true || v === "true";
    const asNum = (v, d) => {
        const n = Number(v);
        return isNaN(n) ? d : n;
    };
    const parseSe = (json, fallback) => {
        try {
            const o = JSON.parse(json);
            return {
                name: o.name || fallback.name,
                volume: asNum(o.volume, fallback.volume),
                pitch: asNum(o.pitch, fallback.pitch),
                pan: 0,
            };
        } catch (e) {
            return { ...fallback, pan: 0 };
        }
    };

    const CFG = {
        accent: P.accentColor || "#4fd1c5",
        pick: P.pickColor || "#e2b04a",
        danger: P.dangerColor || "#ff5d5d",
        dim: asNum(P.backgroundDim, 150),
        defaultMechanic: P.defaultMechanic || "rotate",
        defResultSwitch: asNum(P.defaultResultSwitch, 0),
        defResultVar: asNum(P.defaultResultVariable, 0),
        useItems: asBool(P.useLockpickItems),
        itemId: asNum(P.lockpickItemId, 0),
        allowRetry: asBool(P.allowRetryOnBreak),
        damagePerBreak: asNum(P.damagePerBreak, 0),
        damagePercent: asBool(P.damageIsPercent),
        failCE: asNum(P.failCommonEvent, 0),
        shake: asBool(P.breakScreenShake),
        se: {
            click: parseSe(P.seClick, { name: "Cursor2", volume: 70, pitch: 110 }),
            tick: parseSe(P.seTick, { name: "Cursor1", volume: 80, pitch: 120 }),
            break: parseSe(P.seBreak, { name: "Buzzer1", volume: 80, pitch: 110 }),
            success: parseSe(P.seSuccess, { name: "Item3", volume: 90, pitch: 100 }),
            fail: parseSe(P.seFail, { name: "Buzzer1", volume: 90, pitch: 80 }),
        },
    };

    // Difficulty presets. Tune freely.
    //   tol      = half-width (degrees) of the sweet-spot window for Rotating Pick
    //   speed    = marker sweep speed (% of track per frame) for Marker Bar
    //   zone     = target-zone width as a fraction of the track for Marker Bar
    //   hits     = required successful hits for Marker Bar
    //   picks    = breaks allowed before failing (when NOT using item economy)
    const DIFFICULTY = {
        novice: { tol: 32, speed: 0.9, zone: 0.26, hits: 1, picks: 6 },
        apprentice: { tol: 24, speed: 1.2, zone: 0.2, hits: 1, picks: 5 },
        adept: { tol: 16, speed: 1.55, zone: 0.15, hits: 2, picks: 4 },
        expert: { tol: 10, speed: 1.95, zone: 0.11, hits: 2, picks: 3 },
        master: { tol: 6, speed: 2.4, zone: 0.08, hits: 3, picks: 3 },
    };
    const getPreset = (name) =>
        DIFFICULTY[String(name || "").toLowerCase()] || DIFFICULTY.apprentice;

    const playSe = (se) => {
        if (se && se.name) AudioManager.playSe(se);
    };

    //---------------------------------------------------------------------
    // Small drawing helpers (procedural bitmaps — no image files needed)
    //---------------------------------------------------------------------
    const markDirty = (bmp) => {
        if (bmp._baseTexture && bmp._baseTexture.update) bmp._baseTexture.update();
        else if (bmp._setDirty) bmp._setDirty();
    };
    const roundRectPath = (ctx, x, y, w, h, r) => {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };
    const hexToRgba = (hex, a) => {
        const h = hex.replace("#", "");
        const n = parseInt(
            h.length === 3
                ? h.split("").map((c) => c + c).join("")
                : h,
            16
        );
        const r = (n >> 16) & 255,
            g = (n >> 8) & 255,
            b = n & 255;
        return `rgba(${r},${g},${b},${a})`;
    };

    const newSprite = (bmp, ax = 0.5, ay = 0.5) => {
        const s = new Sprite(bmp);
        s.anchor.x = ax;
        s.anchor.y = ay;
        return s;
    };

    // ---- static bitmap builders ----
    const buildPanel = (w, h) => {
        const b = new Bitmap(w, h);
        const ctx = b.context;
        ctx.save();
        roundRectPath(ctx, 2, 2, w - 4, h - 4, 22);
        ctx.fillStyle = "rgba(14,16,22,0.82)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = hexToRgba(CFG.accent, 0.35);
        ctx.stroke();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildBezel = (r) => {
        const size = r * 2 + 20;
        const b = new Bitmap(size, size);
        const ctx = b.context;
        const c = size / 2;
        const grad = ctx.createRadialGradient(c, c, r * 0.6, c, c, r);
        grad.addColorStop(0, "rgba(40,44,54,1)");
        grad.addColorStop(0.82, "rgba(70,76,90,1)");
        grad.addColorStop(1, "rgba(22,24,30,1)");
        ctx.save();
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        // inner well
        ctx.beginPath();
        ctx.arc(c, c, r * 0.66, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10,11,15,1)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(120,128,145,0.5)";
        ctx.stroke();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildCylinder = (r) => {
        const size = r * 2 + 8;
        const b = new Bitmap(size, size);
        const ctx = b.context;
        const c = size / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(c, c, 0, c, c, r);
        grad.addColorStop(0, "rgba(46,50,60,1)");
        grad.addColorStop(1, "rgba(24,26,33,1)");
        ctx.fillStyle = grad;
        ctx.fill();
        // keyway slot (points "up" at rotation 0)
        ctx.fillStyle = "rgba(6,7,10,1)";
        roundRectPath(ctx, c - r * 0.11, c - r * 0.92, r * 0.22, r * 0.9, r * 0.11);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c, c, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6,7,10,1)";
        ctx.fill();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildPick = (len) => {
        const w = 26;
        const h = len;
        const b = new Bitmap(w, h);
        const ctx = b.context;
        const cx = w / 2;
        ctx.save();
        // shaft
        ctx.lineCap = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = CFG.pick;
        ctx.beginPath();
        ctx.moveTo(cx, h - 4);
        ctx.lineTo(cx, 14);
        ctx.stroke();
        // hooked tip
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, 16);
        ctx.quadraticCurveTo(cx, 4, cx + 8, 5);
        ctx.stroke();
        // highlight
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.moveTo(cx - 1.5, h - 10);
        ctx.lineTo(cx - 1.5, 20);
        ctx.stroke();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildGlow = (r, color) => {
        const size = r * 2;
        const b = new Bitmap(size, size);
        const ctx = b.context;
        const c = size / 2;
        const grad = ctx.createRadialGradient(c, c, 0, c, c, r);
        grad.addColorStop(0, hexToRgba(color, 0.55));
        grad.addColorStop(0.5, hexToRgba(color, 0.22));
        grad.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        markDirty(b);
        return b;
    };

    const buildTrack = (w, h) => {
        const b = new Bitmap(w, h);
        const ctx = b.context;
        ctx.save();
        roundRectPath(ctx, 0, 0, w, h, h / 2);
        ctx.fillStyle = "rgba(8,9,13,0.95)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(120,128,145,0.35)";
        ctx.stroke();
        // inner groove
        roundRectPath(ctx, 6, h * 0.32, w - 12, h * 0.36, h * 0.18);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildZone = (w, h, color) => {
        const b = new Bitmap(Math.max(2, Math.ceil(w)), h);
        const ctx = b.context;
        ctx.save();
        roundRectPath(ctx, 0, 0, b.width, h, Math.min(h / 2, b.width / 2));
        ctx.fillStyle = hexToRgba(color, 0.28);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = hexToRgba(color, 0.9);
        ctx.stroke();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildPlayhead = (h) => {
        const w = 14;
        const b = new Bitmap(w, h + 16);
        const ctx = b.context;
        const cx = w / 2;
        ctx.save();
        ctx.fillStyle = CFG.pick;
        ctx.shadowColor = CFG.pick;
        ctx.shadowBlur = 10;
        roundRectPath(ctx, cx - 2.5, 8, 5, h, 2.5);
        ctx.fill();
        // top diamond
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + 6, 8);
        ctx.lineTo(cx - 6, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildPip = (r, filled, color) => {
        const size = r * 2 + 6;
        const b = new Bitmap(size, size);
        const ctx = b.context;
        const c = size / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        if (filled) {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.fill();
        } else {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(180,186,200,0.6)";
            ctx.stroke();
        }
        ctx.restore();
        markDirty(b);
        return b;
    };

    const buildForceButton = (w, h) => {
        const b = new Bitmap(w, h);
        const ctx = b.context;
        ctx.save();
        roundRectPath(ctx, 1, 1, w - 2, h - 2, h / 2);
        ctx.fillStyle = hexToRgba(CFG.accent, 0.16);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = hexToRgba(CFG.accent, 0.7);
        ctx.stroke();
        ctx.restore();
        markDirty(b);
        b.fontFace = $gameSystem.mainFontFace();
        b.fontSize = 20;
        b.textColor = "#ffffff";
        b.outlineColor = "rgba(0,0,0,0.6)";
        b.drawText("FORCE", 0, 0, w, h, "center");
        return b;
    };

    //=====================================================================
    // Scene_Lockpick
    //=====================================================================
    function Scene_Lockpick() {
        this.initialize(...arguments);
    }
    Scene_Lockpick.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Lockpick.prototype.constructor = Scene_Lockpick;

    Scene_Lockpick.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_Lockpick.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.setupConfig();
        this.createDim();
        this.createRoot();
        if (this._mode === "rotate") this.createRotateSprites();
        else this.createBarSprites();
        this.createHud();
        this._phase = "play"; // play | ending
        this._result = false;
        this._shakeAmt = 0;
        this._flash = null; // {color, life, max}
        this._endTimer = 0;
    };

    Scene_Lockpick.prototype.setupConfig = function () {
        const cfg = $gameTemp._lockpickConfig || {};
        this._mode =
            cfg.mechanic && cfg.mechanic !== "default"
                ? cfg.mechanic
                : CFG.defaultMechanic;
        this._preset = getPreset(cfg.difficulty);
        this._outCfg = cfg;

        // How many pick-breaks are allowed before the whole attempt fails.
        let total = CFG.useItems
            ? $gameParty.numItems($dataItems[CFG.itemId])
            : this._preset.picks;
        if (!CFG.allowRetry) total = Math.min(total, 1);
        this._breaksAllowed = Math.max(1, total);
        this._breaksUsed = 0;
        this._picksLeft = this._breaksAllowed;
    };

    Scene_Lockpick.prototype.createBackground = function () {
        // Blurred snapshot of the map, like other menu scenes.
        Scene_MenuBase.prototype.createBackground.call(this);
    };

    // Route the built-in top-right cancel button through our clean exit so it
    // still sets results correctly (and doesn't double as a "strike").
    Scene_Lockpick.prototype.createButtons = function () {
        Scene_MenuBase.prototype.createButtons.call(this);
        if (this._cancelButton) {
            this._cancelButton.setClickHandler(() => this.finish(false, true));
        }
    };

    Scene_Lockpick.prototype.isOnCancelButton = function () {
        const b = this._cancelButton;
        if (!b) return false;
        return (
            TouchInput.x >= b.x &&
            TouchInput.x <= b.x + b.width &&
            TouchInput.y >= b.y &&
            TouchInput.y <= b.y + b.height
        );
    };

    Scene_Lockpick.prototype.createDim = function () {
        const b = new Bitmap(Graphics.width, Graphics.height);
        b.fillRect(0, 0, Graphics.width, Graphics.height, "#000000");
        const s = new Sprite(b);
        s.opacity = CFG.dim;
        this.addChild(s);
        // vignette
        const v = new Bitmap(Graphics.width, Graphics.height);
        const ctx = v.context;
        const g = ctx.createRadialGradient(
            Graphics.width / 2,
            Graphics.height / 2,
            Graphics.height * 0.35,
            Graphics.width / 2,
            Graphics.height / 2,
            Graphics.height * 0.75
        );
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, Graphics.width, Graphics.height);
        markDirty(v);
        this.addChild(new Sprite(v));
    };

    Scene_Lockpick.prototype.createRoot = function () {
        this._root = new Sprite();
        this.addChild(this._root);
        this._cx = Graphics.width / 2;
        this._cy = Graphics.height / 2;
    };

    // ---------- ROTATE MODE ----------
    Scene_Lockpick.prototype.createRotateSprites = function () {
        const cx = this._cx,
            cy = this._cy - 10;
        const R = 108;

        this._panel = newSprite(buildPanel(360, 360));
        this._panel.x = cx;
        this._panel.y = cy;
        this._root.addChild(this._panel);

        this._glow = newSprite(buildGlow(R + 60, CFG.accent));
        this._glow.x = cx;
        this._glow.y = cy;
        this._glow.opacity = 0;
        this._root.addChild(this._glow);

        this._bezel = newSprite(buildBezel(R));
        this._bezel.x = cx;
        this._bezel.y = cy;
        this._root.addChild(this._bezel);

        // core = cylinder + pick, rotates together when forced
        this._core = new Sprite();
        this._core.x = cx;
        this._core.y = cy;
        this._root.addChild(this._core);

        this._cylinder = newSprite(buildCylinder(R * 0.62));
        this._core.addChild(this._cylinder);

        this._pick = newSprite(buildPick(R + 46), 0.5, 1.0);
        this._pick.x = 0;
        this._pick.y = 6;
        this._core.addChild(this._pick);

        this._progress = newSprite(new Bitmap(R * 2 + 30, R * 2 + 30));
        this._progress.x = cx;
        this._progress.y = cy;
        this._root.addChild(this._progress);

        this.createForceButton();

        // state
        this._pickAngle = 0; // degrees, 0 = up
        this._maxAngle = 90;
        this._sweet = (Math.random() * 2 - 1) * (this._maxAngle - 8);
        this._turn = 0; // 0..90 current cylinder turn
        this._strain = 0;
        this._forcing = false;
        this._lastForce = false;
        this._prevTurn = -1;
    };

    Scene_Lockpick.prototype.createForceButton = function () {
        const w = 200,
            h = 48;
        this._forceBtn = newSprite(buildForceButton(w, h));
        this._forceBtn.x = this._cx;
        this._forceBtn.y = this._cy + 158;
        this._forceBtn._w = w;
        this._forceBtn._h = h;
        this._root.addChild(this._forceBtn);
    };

    // ---------- BAR MODE ----------
    Scene_Lockpick.prototype.createBarSprites = function () {
        const cx = this._cx,
            cy = this._cy;
        const tw = 520,
            th = 54;
        this._trackW = tw;
        this._trackH = th;
        this._trackLeft = cx - tw / 2;

        this._panel = newSprite(buildPanel(tw + 80, 260));
        this._panel.x = cx;
        this._panel.y = cy;
        this._root.addChild(this._panel);

        this._track = newSprite(buildTrack(tw, th));
        this._track.x = cx;
        this._track.y = cy;
        this._root.addChild(this._track);

        const zoneW = Math.max(14, Math.round(tw * this._preset.zone));
        this._zoneW = zoneW;
        this._zone = newSprite(buildZone(zoneW, th - 8, CFG.accent));
        this._zone.y = cy;
        this._root.addChild(this._zone);

        const coreW = Math.max(6, Math.round(zoneW * 0.34));
        this._coreW = coreW;
        this._core2 = newSprite(buildZone(coreW, th - 14, "#ffffff"));
        this._core2.y = cy;
        this._root.addChild(this._core2);

        this._playhead = newSprite(buildPlayhead(th + 8), 0.5, 0.5);
        this._playhead.y = cy;
        this._root.addChild(this._playhead);

        // hit pips
        this._pips = [];
        const need = this._preset.hits;
        const gap = 26;
        const startX = cx - ((need - 1) * gap) / 2;
        for (let i = 0; i < need; i++) {
            const pip = newSprite(buildPip(7, false, CFG.accent));
            pip.x = startX + i * gap;
            pip.y = cy - 92;
            this._root.addChild(pip);
            this._pips.push(pip);
        }

        // state
        this._pos = 0; // 0..1 along track
        this._dir = 1;
        this._speed = this._preset.speed / 100; // per frame fraction
        this._hitsDone = 0;
        this._hitsNeeded = need;
        this.placeZone();
    };

    Scene_Lockpick.prototype.placeZone = function () {
        const margin = this._zoneW / 2 / this._trackW + 0.04;
        this._zoneCenter = margin + Math.random() * (1 - margin * 2);
        const px = this._trackLeft + this._zoneCenter * this._trackW;
        this._zone.x = px;
        this._core2.x = px;
        this._zonePulse = 0;
    };

    // ---------- HUD ----------
    Scene_Lockpick.prototype.createHud = function () {
        this._hud = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._hud.bitmap.fontFace = $gameSystem.mainFontFace();
        this.addChild(this._hud);
        this._hudCache = "";
        this.refreshHud();
    };

    Scene_Lockpick.prototype.hudSubtitle = function () {
        if (this._mode === "rotate") {
            return "Aim  \u2190 \u2192   ·   Hold  Force";
        }
        return `Strike in the zone   ·   ${this._hitsDone}/${this._hitsNeeded}`;
    };

    Scene_Lockpick.prototype.refreshHud = function () {
        const key = `${this._picksLeft}|${this.hudSubtitle()}`;
        if (key === this._hudCache) return;
        this._hudCache = key;
        const b = this._hud.bitmap;
        b.clear();
        b.outlineColor = "rgba(0,0,0,0.7)";
        b.outlineWidth = 4;
        // title
        b.fontSize = 30;
        b.textColor = "#ffffff";
        const title = this._mode === "rotate" ? "PICK THE LOCK" : "TIME THE STRIKE";
        b.drawText(title, 0, this._cy - 178, Graphics.width, 36, "center");
        // subtitle / prompt
        b.fontSize = 20;
        b.textColor = hexToRgba(CFG.accent, 1);
        b.drawText(
            this.hudSubtitle(),
            0,
            this._cy - 146,
            Graphics.width,
            28,
            "center"
        );
        // picks remaining
        b.fontSize = 20;
        b.textColor = this._picksLeft <= 1 ? CFG.danger : "#dfe3ec";
        const label = CFG.useItems ? "Lockpicks" : "Attempts";
        b.drawText(
            `${label}: ${this._picksLeft}`,
            0,
            this._cy + 196,
            Graphics.width,
            28,
            "center"
        );
        // cancel hint
        b.fontSize = 16;
        b.textColor = "rgba(200,205,216,0.7)";
        b.drawText(
            "Cancel to leave",
            0,
            Graphics.height - 40,
            Graphics.width,
            24,
            "center"
        );
    };

    //---------------------------------------------------------------------
    // Update loop
    //---------------------------------------------------------------------
    Scene_Lockpick.prototype.update = function () {
        Scene_MenuBase.prototype.update.call(this);
        if (this._phase === "play") {
            if (this._mode === "rotate") this.updateRotate();
            else this.updateBar();
            this.updateCancel();
        } else {
            this.updateEnding();
        }
        this.updateEffects();
        this.refreshHud();
    };

    Scene_Lockpick.prototype.updateCancel = function () {
        if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
            this.finish(false, true); // exit with no penalty
        }
    };

    // ----- ROTATE update -----
    Scene_Lockpick.prototype.updateRotate = function () {
        const spd = 2.2;
        if (Input.isPressed("left")) this._pickAngle -= spd;
        if (Input.isPressed("right")) this._pickAngle += spd;
        // mouse / touch drag to aim (ignore taps on the force button)
        if (TouchInput.isPressed() && !this.isOnForceButton()) {
            const dx = TouchInput.x - this._cx;
            const dy = this._cy - 10 - TouchInput.y;
            let ang = (Math.atan2(dx, dy) * 180) / Math.PI;
            this._pickAngle = ang;
        }
        this._pickAngle = this._pickAngle.clamp(-this._maxAngle, this._maxAngle);

        // determine tension
        const forcing =
            Input.isPressed("ok") ||
            (TouchInput.isPressed() && this.isOnForceButton());
        if (forcing && !this._lastForce) playSe(CFG.se.click);
        this._lastForce = forcing;
        this._forcing = forcing;

        // closeness -> turn cap
        const diff = Math.abs(this._pickAngle - this._sweet);
        const tol = this._preset.tol;
        const inner = tol * 0.3;
        let closeness, cap;
        if (diff <= inner) {
            closeness = 1;
            cap = 90;
        } else if (diff <= tol) {
            closeness = 1 - (diff - inner) / (tol - inner);
            cap = 12 + 70 * closeness;
        } else {
            closeness = 0;
            cap = 8; // barely budges
        }

        // ease turn
        const target = forcing ? cap : 0;
        this._turn += (target - this._turn) * 0.18;

        // sweet-spot glow feedback
        this._glow.opacity = Math.round(200 * closeness);
        this._glow.scale.x = this._glow.scale.y = 0.92 + closeness * 0.14;

        // apply rotation visuals
        const turnRad = (this._turn * Math.PI) / 180;
        this._core.rotation = turnRad;
        this._pick.rotation = (this._pickAngle * Math.PI) / 180;

        // progress ring
        this.drawProgressRing(this._turn / 90, closeness >= 1);

        // success / strain
        if (forcing && closeness >= 1 && this._turn >= 88) {
            this.onSuccess();
            return;
        }
        if (forcing && cap < 90 && this._turn > cap - 3) {
            this._strain += 1;
            const j = Math.min(6, this._strain * 0.12);
            this._core.x = this._cx + (Math.random() - 0.5) * j;
            this._core.y = this._cy - 10 + (Math.random() - 0.5) * j;
            if (this._strain > 46) {
                this._core.x = this._cx;
                this._core.y = this._cy - 10;
                this.onBreak();
            }
        } else {
            this._strain = Math.max(0, this._strain - 3);
            this._core.x = this._cx;
            this._core.y = this._cy - 10;
        }
    };

    Scene_Lockpick.prototype.isOnForceButton = function () {
        if (!this._forceBtn) return false;
        const b = this._forceBtn;
        return (
            Math.abs(TouchInput.x - b.x) <= b._w / 2 + 20 &&
            Math.abs(TouchInput.y - b.y) <= b._h / 2 + 20
        );
    };

    Scene_Lockpick.prototype.drawProgressRing = function (ratio, hot) {
        ratio = ratio.clamp(0, 1);
        const key = Math.round(ratio * 100) + (hot ? "h" : "c");
        if (key === this._prevTurn) return;
        this._prevTurn = key;
        const bmp = this._progress.bitmap;
        bmp.clear();
        const ctx = bmp.context;
        const c = bmp.width / 2;
        const rr = bmp.width / 2 - 8;
        ctx.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.arc(c, c, rr, 0, Math.PI * 2);
        ctx.stroke();
        if (ratio > 0.01) {
            ctx.strokeStyle = hot ? CFG.accent : hexToRgba(CFG.pick, 0.9);
            ctx.shadowColor = hot ? CFG.accent : CFG.pick;
            ctx.shadowBlur = hot ? 14 : 6;
            ctx.beginPath();
            const start = -Math.PI / 2;
            ctx.arc(c, c, rr, start, start + Math.PI * 2 * ratio);
            ctx.stroke();
        }
        ctx.restore();
        markDirty(bmp);
    };

    // ----- BAR update -----
    Scene_Lockpick.prototype.updateBar = function () {
        // move playhead (ping-pong)
        this._pos += this._speed * this._dir;
        if (this._pos >= 1) {
            this._pos = 1;
            this._dir = -1;
        } else if (this._pos <= 0) {
            this._pos = 0;
            this._dir = 1;
        }
        this._playhead.x = this._trackLeft + this._pos * this._trackW;

        // zone pulse
        this._zonePulse += 0.12;
        const pulse = 1 + Math.sin(this._zonePulse) * 0.06;
        this._zone.scale.y = pulse;
        this._core2.scale.y = pulse;

        const strike =
            Input.isTriggered("ok") ||
            (TouchInput.isTriggered() &&
                !TouchInput.isCancelled() &&
                !this.isOnCancelButton());
        if (strike) {
            const half = this._zoneW / 2 / this._trackW;
            const coreHalf = this._coreW / 2 / this._trackW;
            const d = Math.abs(this._pos - this._zoneCenter);
            if (d <= coreHalf) {
                this.onHit(true);
            } else if (d <= half) {
                this.onHit(false);
            } else {
                this.onBreak();
            }
        }
    };

    Scene_Lockpick.prototype.onHit = function (perfect) {
        playSe(CFG.se.tick);
        if (this._pips[this._hitsDone]) {
            this._root.removeChild(this._pips[this._hitsDone]);
            const pip = newSprite(buildPip(7, true, perfect ? "#ffffff" : CFG.accent));
            pip.x = this._pips[this._hitsDone].x;
            pip.y = this._pips[this._hitsDone].y;
            this._root.addChild(pip);
            this._pips[this._hitsDone] = pip;
        }
        this._hitsDone += 1;
        this._flash = {
            color: perfect ? "#ffffff" : CFG.accent,
            life: 12,
            max: 12,
        };
        if (this._hitsDone >= this._hitsNeeded) {
            this.onSuccess();
        } else {
            this.placeZone();
            this._speed *= 1.06; // ramp up slightly
        }
    };

    //---------------------------------------------------------------------
    // Outcomes
    //---------------------------------------------------------------------
    Scene_Lockpick.prototype.onBreak = function () {
        playSe(CFG.se.break);
        this._breaksUsed += 1;
        this._picksLeft = this._breaksAllowed - this._breaksUsed;
        this._pendingBreakDamage = (this._pendingBreakDamage || 0) + 1;
        if (CFG.shake) this._shakeAmt = 12;
        this._flash = { color: CFG.danger, life: 14, max: 14 };

        if (this._breaksUsed >= this._breaksAllowed) {
            this.finish(false, false);
            return;
        }
        // reset for another try
        if (this._mode === "rotate") {
            this._strain = 0;
            this._turn = 0;
        } else {
            this._speed = this._preset.speed / 100;
            this.placeZone();
        }
    };

    Scene_Lockpick.prototype.onSuccess = function () {
        this._flash = { color: CFG.accent, life: 22, max: 22 };
        if (this._mode === "rotate") {
            this._turn = 90;
            this._core.rotation = Math.PI / 2;
        }
        this.finish(true, false);
    };

    // result: true=success. exited: player cancelled (no penalty).
    Scene_Lockpick.prototype.finish = function (success, exited) {
        if (this._phase === "ending") return;
        this._phase = "ending";
        this._result = success;
        this._exited = exited;
        this._endTimer = success ? 30 : 24;
        playSe(success ? CFG.se.success : exited ? null : CFG.se.fail);
    };

    Scene_Lockpick.prototype.updateEnding = function () {
        this._endTimer -= 1;
        if (this._endTimer <= 0) {
            this.applyResults();
            this.popScene();
        }
    };

    Scene_Lockpick.prototype.applyResults = function () {
        const cfg = this._outCfg || {};
        const success = this._result;

        // damage per break (applied to leader), even on a cancelled exit only if breaks occurred
        if (CFG.damagePerBreak > 0 && this._pendingBreakDamage) {
            const leader = $gameParty.leader();
            if (leader) {
                for (let i = 0; i < this._pendingBreakDamage; i++) {
                    let dmg = CFG.damagePercent
                        ? Math.floor((leader.mhp * CFG.damagePerBreak) / 100)
                        : CFG.damagePerBreak;
                    leader.gainHp(-dmg);
                }
            }
        }

        // result switch / variable (explicit arg overrides plugin default)
        const sw = cfg.resultSwitch || CFG.defResultSwitch;
        if (sw > 0) $gameSwitches.setValue(sw, success);
        const va = cfg.resultVariable || CFG.defResultVar;
        if (va > 0) $gameVariables.setValue(va, success ? 1 : 0);

        // self switch on success
        if (success && cfg.selfSwitch && cfg.selfSwitch !== "none" && cfg.eventKey) {
            const key = [cfg.mapId, cfg.eventId, cfg.selfSwitch];
            $gameSelfSwitches.setValue(key, true);
        }

        // fail common event (only on a real failure, not a clean exit)
        if (!success && !this._exited && CFG.failCE > 0) {
            $gameTemp.reserveCommonEvent(CFG.failCE);
        }
    };

    //---------------------------------------------------------------------
    // Effects: flash + shake
    //---------------------------------------------------------------------
    Scene_Lockpick.prototype.updateEffects = function () {
        // shake
        if (this._shakeAmt > 0.2) {
            this._root.x = (Math.random() - 0.5) * this._shakeAmt;
            this._root.y = (Math.random() - 0.5) * this._shakeAmt;
            this._shakeAmt *= 0.85;
        } else {
            this._root.x = 0;
            this._root.y = 0;
            this._shakeAmt = 0;
        }
        // flash overlay (full-screen tinted fade)
        if (!this._flashSprite) {
            this._flashSprite = new Sprite(
                new Bitmap(Graphics.width, Graphics.height)
            );
            this._flashSprite.opacity = 0;
            this.addChild(this._flashSprite);
            this._flashColor = null;
        }
        if (this._flash) {
            const f = this._flash;
            if (this._flashColor !== f.color) {
                this._flashColor = f.color;
                const b = this._flashSprite.bitmap;
                b.clear();
                b.fillRect(0, 0, Graphics.width, Graphics.height, f.color);
            }
            this._flashSprite.opacity = Math.round((f.life / f.max) * 160);
            f.life -= 1;
            if (f.life <= 0) {
                this._flash = null;
                this._flashSprite.opacity = 0;
            }
        } else {
            this._flashSprite.opacity = 0;
        }
    };

    //=====================================================================
    // Plugin command
    //=====================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "StartLockpick", function (args) {
        // Item gate: if using items and the player has none, fail immediately.
        if (CFG.useItems) {
            const item = $dataItems[CFG.itemId];
            if (!item || $gameParty.numItems(item) <= 0) {
                const sw = Number(args.resultSwitch) || CFG.defResultSwitch;
                if (sw > 0) $gameSwitches.setValue(sw, false);
                const va = Number(args.resultVariable) || CFG.defResultVar;
                if (va > 0) $gameVariables.setValue(va, 0);
                if (CFG.failCE > 0) $gameTemp.reserveCommonEvent(CFG.failCE);
                playSe(CFG.se.fail);
                return;
            }
        }

        $gameTemp._lockpickConfig = {
            mechanic: args.mechanic || "default",
            difficulty: args.difficulty || "Apprentice",
            resultSwitch: Number(args.resultSwitch) || 0,
            resultVariable: Number(args.resultVariable) || 0,
            selfSwitch: args.selfSwitchOnSuccess || "none",
            mapId: $gameMap.mapId(),
            eventId: this.eventId(),
            eventKey: this.eventId() > 0,
        };

        // Pause this interpreter until the scene returns, then resume.
        $gameTemp._lockpickBusy = true;
        this.setWaitMode("tqeLockpick");
        SceneManager.push(Scene_Lockpick);
    });

    // Clear the flag when the scene ends so the interpreter can resume.
    const _Scene_Lockpick_terminate = Scene_Lockpick.prototype.terminate;
    Scene_Lockpick.prototype.terminate = function () {
        Scene_MenuBase.prototype.terminate.call(this);
        $gameTemp._lockpickBusy = false;
    };

    const _GI_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function () {
        if (this._waitMode === "tqeLockpick") {
            if ($gameTemp._lockpickBusy) return true; // keep waiting
            this._waitMode = "";
            return false;
        }
        return _GI_updateWaitMode.call(this);
    };
})();
