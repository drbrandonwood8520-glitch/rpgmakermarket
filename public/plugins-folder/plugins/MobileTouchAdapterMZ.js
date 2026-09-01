/*:
 * @target MZ
 * @plugindesc [v1.0.0] One-file mobile adapter: auto screen scaling (Android + iOS safe-area) plus an on-screen touch control overlay. No third-party app or emulator required.
 * @author You
 * @url
 *
 * @help
 * ============================================================================
 * Mobile Touch Adapter MZ
 * ============================================================================
 *
 * WHAT IT DOES
 * ------------
 * Drop this one file into your project and it makes an MZ game playable on
 * phones without any external emulator or wrapper app:
 *
 *   1. SCALING      Fits the game canvas to any screen and respects the iOS
 *                   notch / home-bar (safe-area insets). Works on Android and
 *                   Apple browsers and Cordova deployments alike.
 *
 *   2. CONTROLS     Draws an on-screen movement pad (joystick or D-pad) plus
 *                   action buttons and feeds them straight into MZ's normal
 *                   Input system, so every menu, event and battle "just works"
 *                   as if a keyboard were attached.
 *
 *   3. AUTO-DETECT  By default the overlay only appears on touch devices, so
 *                   your desktop / playtest build is untouched.
 *
 * INSTALL
 * -------
 *   1. Save this file as  js/plugins/MobileTouchAdapterMZ.js
 *      (the filename MUST stay MobileTouchAdapterMZ so parameters load).
 *   2. Open the Plugin Manager, add it, tweak the parameters, turn it ON.
 *   3. Test in a mobile browser, or deploy for Android / iOS as usual.
 *
 * INPUT MAPPING
 * -------------
 *   Movement pad  -> up / down / left / right
 *   A  button     -> ok      (confirm, Enter/Z)
 *   B  button     -> escape  (cancel; also opens the menu on the map)
 *   Dash button   -> shift   (hold to run)
 *
 * PLUGIN COMMANDS
 * ---------------
 *   Show Controls / Hide Controls  - toggle the overlay from an event.
 *
 * SCRIPT CALLS (advanced)
 * -----------------------
 *   MobileAdapter.show();      // force overlay on
 *   MobileAdapter.hide();      // force overlay off
 *   MobileAdapter.isActive();  // true if the overlay is running
 *
 * NOTES & LIMITS
 * --------------
 *   - Default MZ movement is 4-directional. Enable "8-Direction" only if you
 *     also use a diagonal-movement plugin, otherwise leave it off.
 *   - This does not compile your game into an app. Use MZ's built-in deploy
 *     (Android/iOS) or a Cordova wrapper for that; this plugin handles the
 *     in-game touch experience once it is running on the device.
 *   - No conflicts with core Input: it writes into the same state MZ reads,
 *     so keyboard, mouse, gamepad and touch can all be used together.
 *
 * ============================================================================
 * @param head1
 * @text ---- General ----
 * @default
 *
 * @param controlMode
 * @text Activation Mode
 * @parent head1
 * @type select
 * @option Auto (touch devices only)
 * @value auto
 * @option Always (also on desktop)
 * @value always
 * @option Never (scaling only, no buttons)
 * @value never
 * @default auto
 * @desc When the on-screen controls should appear.
 *
 * @param scalingMode
 * @text Screen Scaling
 * @parent head1
 * @type select
 * @option Fit (letterbox, show everything)
 * @value fit
 * @option Fill (crop edges, no black bars)
 * @value fill
 * @default fit
 * @desc How the game canvas is scaled to the device screen.
 *
 * @param respectSafeArea
 * @text Respect iOS Safe Area
 * @parent head1
 * @type boolean
 * @default true
 * @desc Keep controls clear of the notch and home indicator on iPhones.
 *
 * @param head2
 * @text ---- Movement ----
 * @default
 *
 * @param movementStyle
 * @text Movement Style
 * @parent head2
 * @type select
 * @option Joystick (analog thumb)
 * @value joystick
 * @option D-Pad (four buttons)
 * @value dpad
 * @default joystick
 * @desc Visual style of the left-hand movement control.
 *
 * @param eightDirection
 * @text 8-Direction
 * @parent head2
 * @type boolean
 * @default false
 * @desc Allow diagonals. Only turn on with a diagonal-movement plugin.
 *
 * @param deadZone
 * @text Joystick Dead-Zone
 * @parent head2
 * @type number
 * @decimals 2
 * @min 0
 * @max 0.9
 * @default 0.28
 * @desc Fraction of the stick radius ignored before movement starts.
 *
 * @param head3
 * @text ---- Buttons ----
 * @default
 *
 * @param showDash
 * @text Show Dash Button
 * @parent head3
 * @type boolean
 * @default true
 * @desc Adds a "hold to run" (Shift) button.
 *
 * @param showMenu
 * @text Show B / Menu Button
 * @parent head3
 * @type boolean
 * @default true
 * @desc Adds a cancel/menu (Escape) button.
 *
 * @param head4
 * @text ---- Appearance ----
 * @default
 *
 * @param uiScale
 * @text UI Scale
 * @parent head4
 * @type number
 * @decimals 2
 * @min 0.5
 * @max 2.5
 * @default 1.0
 * @desc Overall size multiplier for the controls.
 *
 * @param opacity
 * @text Opacity
 * @parent head4
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 1
 * @default 0.55
 * @desc Transparency of the controls (1 = solid).
 *
 * @param accentColor
 * @text Accent Color
 * @parent head4
 * @type string
 * @default #ffffff
 * @desc CSS color used for outlines / highlights.
 *
 * @param margin
 * @text Edge Margin
 * @parent head4
 * @type number
 * @min 0
 * @default 22
 * @desc Base distance (px) of controls from the screen edges.
 *
 * @command ShowControls
 * @text Show Controls
 * @desc Turn the on-screen controls on.
 *
 * @command HideControls
 * @text Hide Controls
 * @desc Turn the on-screen controls off.
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "MobileTouchAdapterMZ";
    const P = PluginManager.parameters(PLUGIN_NAME);

    const cfg = {
        controlMode:   String(P.controlMode || "auto"),
        scalingMode:   String(P.scalingMode || "fit"),
        safeArea:      P.respectSafeArea !== "false",
        movementStyle: String(P.movementStyle || "joystick"),
        eightDir:      P.eightDirection === "true",
        deadZone:      Number(P.deadZone || 0.28),
        showDash:      P.showDash !== "false",
        showMenu:      P.showMenu !== "false",
        uiScale:       Number(P.uiScale || 1.0),
        opacity:       Number(P.opacity || 0.55),
        accent:        String(P.accentColor || "#ffffff"),
        margin:        Number(P.margin || 22)
    };

    // Is the touch overlay active on this device?
    const overlayActive = (() => {
        if (cfg.controlMode === "never")  return false;
        if (cfg.controlMode === "always") return true;
        return Utils.isMobileDevice();
    })();

    // ------------------------------------------------------------------
    // 1) INPUT INJECTION
    // ------------------------------------------------------------------
    // We keep our own "held" map and re-assert it into Input._currentState
    // every frame *before* the core update runs. This lets MZ's own
    // trigger / repeat / press machinery treat our touches exactly like
    // real key presses, so nothing downstream needs to change.
    const held = Object.create(null); // { up:true, ok:true, ... }

    const _Input_update = Input.update;
    Input.update = function () {
        for (const name in held) {
            if (held[name]) this._currentState[name] = true;
            else if (this._currentState[name]) this._currentState[name] = false;
        }
        _Input_update.call(this);
    };

    function setKey(name, on) { held[name] = !!on; }
    function clearDirs() { held.up = held.down = held.left = held.right = false; }
    function clearAll() {
        clearDirs();
        held.ok = held.escape = held.shift = false;
    }

    // Release everything if the app loses focus (prevents "stuck walking").
    window.addEventListener("blur", () => { clearAll(); if (ui.node) ui.reset(); });

    // ------------------------------------------------------------------
    // 2) VIEWPORT + SCALING (Android & iOS)
    // ------------------------------------------------------------------
    function setupViewport() {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "viewport";
            document.head.appendChild(meta);
        }
        meta.setAttribute(
            "content",
            "width=device-width, initial-scale=1, maximum-scale=1, " +
            "minimum-scale=1, user-scalable=no, viewport-fit=cover"
        );
        const s = document.documentElement.style;
        s.height = "100%";
        s.background = "#000";
        const b = document.body.style;
        b.height = "100%";
        b.margin = "0";
        b.background = "#000";
        b.overflow = "hidden";
        b.overscrollBehavior = "none";

        // Kill iOS rubber-band / pull-to-refresh without blocking MZ's own
        // touch handling (we only preventDefault, never stopPropagation).
        document.addEventListener("touchmove", (e) => {
            if (e.cancelable) e.preventDefault();
        }, { passive: false });
    }

    function applyScaling() {
        // Make sure MZ stretches the canvas on this device.
        const _defStretch = Graphics._defaultStretchMode;
        Graphics._defaultStretchMode = function () {
            return overlayActive || _defStretch.call(this);
        };

        if (cfg.scalingMode === "fill") {
            // Scale to the LARGER of the two ratios so there are no bars;
            // the overflowing edges are cropped by body { overflow:hidden }.
            Graphics._updateRealScale = function () {
                if (this._stretchEnabled && this._width > 0 && this._height > 0) {
                    const h = this._stretchWidth() / this._width;
                    const v = this._stretchHeight() / this._height;
                    this._realScale = Math.max(h, v);
                } else {
                    this._realScale = this._scale;
                }
            };
        }
        // "fit" is MZ's default min()-based letterbox behaviour — nothing to do.
    }

    // ------------------------------------------------------------------
    // 3) THE OVERLAY UI
    // ------------------------------------------------------------------
    const ui = {
        node: null,
        thumb: null,
        stickRadius: 0,
        stickCenter: { x: 0, y: 0 },
        stickPointer: null
    };

    function px(n) { return Math.round(n) + "px"; }

    function injectStyles() {
        const safe = cfg.safeArea;
        const inset = (side) =>
            safe ? `calc(${px(cfg.margin)} + env(safe-area-inset-${side}, 0px))`
                 : px(cfg.margin);

        const css = `
        #mtaOverlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:1000;
            pointer-events:none;opacity:${cfg.opacity};
            -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
            font-family:sans-serif;}
        #mtaOverlay *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        .mta-hit{pointer-events:auto;touch-action:none;position:absolute;}
        .mta-round{border-radius:50%;border:2px solid ${cfg.accent};
            background:rgba(20,20,25,0.35);}
        #mtaStick{left:${inset("left")};bottom:${inset("bottom")};}
        #mtaThumb{position:absolute;left:50%;top:50%;border-radius:50%;
            background:${cfg.accent};opacity:0.85;pointer-events:none;
            transform:translate(-50%,-50%);transition:transform .05s linear;}
        .mta-dpad-btn{display:flex;align-items:center;justify-content:center;
            background:rgba(20,20,25,0.4);border:2px solid ${cfg.accent};
            color:${cfg.accent};font-size:20px;font-weight:bold;}
        .mta-dpad-btn.mta-on{background:${cfg.accent};color:#111;}
        .mta-btn{right:auto;display:flex;align-items:center;justify-content:center;
            color:${cfg.accent};font-size:22px;font-weight:bold;
            border:2px solid ${cfg.accent};background:rgba(20,20,25,0.4);
            border-radius:50%;}
        .mta-btn.mta-on{background:${cfg.accent};color:#111;}
        `;
        const tag = document.createElement("style");
        tag.id = "mtaStyle";
        tag.textContent = css;
        document.head.appendChild(tag);
    }

    // -- movement: joystick ------------------------------------------------
    function buildJoystick(base) {
        const size = 150 * cfg.uiScale;
        const stick = document.createElement("div");
        stick.id = "mtaStick";
        stick.className = "mta-hit mta-round";
        stick.style.width = px(size);
        stick.style.height = px(size);

        const thumb = document.createElement("div");
        thumb.id = "mtaThumb";
        thumb.style.width = px(size * 0.42);
        thumb.style.height = px(size * 0.42);
        stick.appendChild(thumb);

        ui.thumb = thumb;
        ui.stickRadius = size / 2;

        const start = (e) => {
            const t = e.changedTouches ? e.changedTouches[0] : e;
            if (ui.stickPointer !== null && e.pointerId !== undefined) return;
            const r = stick.getBoundingClientRect();
            ui.stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            ui.stickPointer = e.pointerId !== undefined ? e.pointerId : "t";
            if (stick.setPointerCapture && e.pointerId !== undefined) {
                stick.setPointerCapture(e.pointerId);
            }
            moveStick(t.clientX, t.clientY);
            block(e);
        };
        const move = (e) => {
            if (ui.stickPointer === null) return;
            const t = e.changedTouches ? e.changedTouches[0] : e;
            moveStick(t.clientX, t.clientY);
            block(e);
        };
        const end = (e) => {
            ui.stickPointer = null;
            clearDirs();
            thumb.style.transform = "translate(-50%,-50%)";
            block(e);
        };

        stick.addEventListener("pointerdown", start);
        stick.addEventListener("pointermove", move);
        stick.addEventListener("pointerup", end);
        stick.addEventListener("pointercancel", end);
        base.appendChild(stick);
    }

    function moveStick(clientX, clientY) {
        const dx = clientX - ui.stickCenter.x;
        const dy = clientY - ui.stickCenter.y;
        const r = ui.stickRadius;
        const mag = Math.hypot(dx, dy);
        clearDirs();
        if (mag < r * cfg.deadZone) {
            ui.thumb.style.transform = "translate(-50%,-50%)";
            return;
        }
        const deg = Math.atan2(-dy, dx) * 180 / Math.PI;
        if (cfg.eightDir) {
            if (deg > -22.5 && deg <= 22.5) setKey("right", 1);
            else if (deg > 22.5 && deg <= 67.5) { setKey("right", 1); setKey("up", 1); }
            else if (deg > 67.5 && deg <= 112.5) setKey("up", 1);
            else if (deg > 112.5 && deg <= 157.5) { setKey("up", 1); setKey("left", 1); }
            else if (deg > 157.5 || deg <= -157.5) setKey("left", 1);
            else if (deg > -157.5 && deg <= -112.5) { setKey("left", 1); setKey("down", 1); }
            else if (deg > -112.5 && deg <= -67.5) setKey("down", 1);
            else { setKey("down", 1); setKey("right", 1); }
        } else {
            if (Math.abs(dx) > Math.abs(dy)) setKey(dx > 0 ? "right" : "left", 1);
            else setKey(dy > 0 ? "down" : "up", 1);
        }
        const clamp = Math.min(mag, r);
        const tx = (dx / mag) * clamp;
        const ty = (dy / mag) * clamp;
        ui.thumb.style.transform =
            `translate(calc(-50% + ${px(tx)}), calc(-50% + ${px(ty)}))`;
    }

    // -- movement: D-pad ---------------------------------------------------
    function buildDpad(base) {
        const cell = 52 * cfg.uiScale;
        const inset = (side) =>
            cfg.safeArea
                ? `calc(${px(cfg.margin)} + env(safe-area-inset-${side}, 0px))`
                : px(cfg.margin);
        const wrap = document.createElement("div");
        wrap.id = "mtaDpad";
        wrap.style.position = "absolute";
        wrap.style.left = inset("left");
        wrap.style.bottom = inset("bottom");
        wrap.style.width = px(cell * 3);
        wrap.style.height = px(cell * 3);

        const defs = [
            { key: "up",    label: "\u25B2", col: 1, row: 0 },
            { key: "left",  label: "\u25C0", col: 0, row: 1 },
            { key: "right", label: "\u25B6", col: 2, row: 1 },
            { key: "down",  label: "\u25BC", col: 1, row: 2 }
        ];
        for (const d of defs) {
            const b = document.createElement("div");
            b.className = "mta-hit mta-dpad-btn";
            b.style.width = px(cell);
            b.style.height = px(cell);
            b.style.left = px(d.col * cell);
            b.style.top = px(d.row * cell);
            b.style.borderRadius = "10px";
            b.textContent = d.label;
            bindMomentary(b, d.key);
            wrap.appendChild(b);
        }
        base.appendChild(wrap);
    }

    // -- action buttons ----------------------------------------------------
    function buildActionButtons(base) {
        const size = 66 * cfg.uiScale;
        const inset = (side) =>
            cfg.safeArea
                ? `calc(${px(cfg.margin)} + env(safe-area-inset-${side}, 0px))`
                : px(cfg.margin);

        const make = (label, key, right, bottom) => {
            const b = document.createElement("div");
            b.className = "mta-hit mta-btn";
            b.style.width = px(size);
            b.style.height = px(size);
            b.style.right = `calc(${inset("right")} + ${px(right)})`;
            b.style.bottom = `calc(${inset("bottom")} + ${px(bottom)})`;
            b.textContent = label;
            bindMomentary(b, key);
            base.appendChild(b);
            return b;
        };

        // A = ok, sits lower-right; B = escape, up-left of A (classic layout).
        make("A", "ok", 0, 0);
        if (cfg.showMenu) make("B", "escape", size * 1.15, size * 0.6);
        if (cfg.showDash) {
            const dash = make("\u25B6\u25B6", "shift", size * 0.35, size * 1.35);
            dash.style.fontSize = px(16 * cfg.uiScale);
        }
    }

    function bindMomentary(el, key) {
        const down = (e) => { setKey(key, 1); el.classList.add("mta-on"); block(e); };
        const up   = (e) => { setKey(key, 0); el.classList.remove("mta-on"); block(e); };
        el.addEventListener("pointerdown", (e) => {
            if (el.setPointerCapture && e.pointerId !== undefined) {
                try { el.setPointerCapture(e.pointerId); } catch (_) {}
            }
            down(e);
        });
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        el.addEventListener("pointerleave", up);
    }

    function block(e) {
        // Stop the touch from also reaching MZ's map tap-to-move handler.
        e.preventDefault();
        e.stopPropagation();
    }

    function buildOverlay() {
        if (ui.node) return;
        injectStyles();
        const root = document.createElement("div");
        root.id = "mtaOverlay";
        document.body.appendChild(root);
        ui.node = root;

        if (cfg.movementStyle === "dpad") buildDpad(root);
        else buildJoystick(root);

        buildActionButtons(root);
    }

    ui.reset = function () {
        if (ui.thumb) ui.thumb.style.transform = "translate(-50%,-50%)";
        if (!ui.node) return;
        ui.node.querySelectorAll(".mta-on").forEach((n) => n.classList.remove("mta-on"));
        ui.stickPointer = null;
    };

    function setOverlayVisible(on) {
        if (!ui.node) return;
        ui.node.style.display = on ? "block" : "none";
        if (!on) { clearAll(); ui.reset(); }
    }

    // ------------------------------------------------------------------
    // 4) BOOTSTRAP + PUBLIC API
    // ------------------------------------------------------------------
    const _SceneBoot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _SceneBoot_start.call(this);
        setupViewport();
        applyScaling();
        if (overlayActive) buildOverlay();
    };

    window.MobileAdapter = {
        show() { if (!ui.node && overlayActive) buildOverlay(); setOverlayVisible(true); },
        hide() { setOverlayVisible(false); },
        isActive() { return !!(ui.node && ui.node.style.display !== "none"); }
    };

    PluginManager.registerCommand(PLUGIN_NAME, "ShowControls", () => window.MobileAdapter.show());
    PluginManager.registerCommand(PLUGIN_NAME, "HideControls", () => window.MobileAdapter.hide());
})();
