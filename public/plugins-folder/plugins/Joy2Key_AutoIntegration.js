//=============================================================================
// Joy2Key_AutoIntegration.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Plug-and-play USB joystick / arcade-stick support with an
 * in-game press-to-bind config menu, button-prompt icons, and rumble.
 * @author Built with Claude
 * @url
 *
 * @help
 * ============================================================================
 * Joy2Key_AutoIntegration
 * ============================================================================
 * Connects a USB joystick, arcade stick or fight stick directly to RPG Maker
 * MZ's own input system — no external Joy2Key tool required. Buttons and the
 * stick drive the standard game actions (OK, Cancel, Dash, Menu, PageUp,
 * PageDown, and the four directions).
 *
 * Because arcade sticks and DIY encoders (Zero Delay, Brook, etc.) report their
 * buttons with unpredictable indices, the player-facing config uses a
 * "press-to-bind" flow: choose an action, then press the button (or push the
 * stick) you want for it. This makes any controller work automatically.
 *
 * The plugin visual style matches the game's default window skin, so it blends
 * in with your project with no theming needed.
 *
 * ----------------------------------------------------------------------------
 * How players open the config
 * ----------------------------------------------------------------------------
 *   - Automatically added to the Options menu (toggle with a parameter), and/or
 *   - Via the plugin command "Open Controller Config", and/or
 *   - Via script call:  Joy2Key.openConfig();
 *
 * Bindings are saved with the game's config file, so they persist across play
 * sessions and are per-player.
 *
 * ----------------------------------------------------------------------------
 * Rumble
 * ----------------------------------------------------------------------------
 * Vibration uses the Gamepad Haptics API and fails gracefully — if the stick
 * has no motor, it simply does nothing. By default a light rumble plays on the
 * error buzzer. Trigger your own from events with the "Rumble" plugin command
 * or:  Joy2Key.vibrate(durationMs, strength0to100);
 *
 * ----------------------------------------------------------------------------
 * For developers: draw a button prompt anywhere
 * ----------------------------------------------------------------------------
 * Inside any Window's drawing code you can render the current binding for an
 * action as a native chip:
 *   Joy2Key.drawButtonGlyph(this, "ok", x, y);   // returns the chip width
 *   Joy2Key.glyphWidth(this, "ok");              // measure without drawing
 * Valid symbols: ok, cancel, shift, menu, pageup, pagedown, up, down, left, right
 *
 * ----------------------------------------------------------------------------
 * Terms of use: free for commercial and non-commercial projects.
 * ============================================================================
 *
 * @command openConfig
 * @text Open Controller Config
 * @desc Opens the press-to-bind controller configuration scene.
 *
 * @command rumble
 * @text Rumble
 * @desc Plays a vibration effect on connected controllers (no-op if unsupported).
 *
 * @arg duration
 * @text Duration (ms)
 * @type number
 * @min 1
 * @default 200
 *
 * @arg strength
 * @text Strength (0-100)
 * @type number
 * @min 0
 * @max 100
 * @default 50
 *
 * @command resetMapping
 * @text Reset Controls To Default
 * @desc Restores all controller bindings to the developer defaults below.
 *
 * @param ---Defaults---
 * @default
 *
 * @param okButton
 * @parent ---Defaults---
 * @text Default OK Button
 * @type number
 * @min 0
 * @desc Gamepad button index used for OK/confirm before the player rebinds.
 * @default 0
 *
 * @param cancelButton
 * @parent ---Defaults---
 * @text Default Cancel Button
 * @type number
 * @min 0
 * @default 1
 *
 * @param dashButton
 * @parent ---Defaults---
 * @text Default Dash Button
 * @type number
 * @min 0
 * @default 2
 *
 * @param menuButton
 * @parent ---Defaults---
 * @text Default Menu Button
 * @type number
 * @min 0
 * @default 3
 *
 * @param pageupButton
 * @parent ---Defaults---
 * @text Default PageUp Button
 * @type number
 * @min 0
 * @default 4
 *
 * @param pagedownButton
 * @parent ---Defaults---
 * @text Default PageDown Button
 * @type number
 * @min 0
 * @default 5
 *
 * @param stickX
 * @parent ---Defaults---
 * @text Stick X Axis
 * @type number
 * @min 0
 * @desc Axis index for left/right on the main stick.
 * @default 0
 *
 * @param stickY
 * @parent ---Defaults---
 * @text Stick Y Axis
 * @type number
 * @min 0
 * @desc Axis index for up/down on the main stick.
 * @default 1
 *
 * @param axisThreshold
 * @parent ---Defaults---
 * @text Axis Threshold
 * @type number
 * @decimals 2
 * @min 0.10
 * @max 1.00
 * @desc How far the stick must move to register (0.10 - 1.00).
 * @default 0.50
 *
 * @param ---Integration---
 * @default
 *
 * @param addToOptions
 * @parent ---Integration---
 * @text Add To Options Menu
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @param optionsCommandName
 * @parent ---Integration---
 * @text Options Entry Name
 * @type string
 * @default Controller Config
 *
 * @param showPrompts
 * @parent ---Integration---
 * @text Show Prompts In Menus
 * @type boolean
 * @on Yes
 * @off No
 * @desc Shows a compact button-prompt bar at the bottom of menu scenes.
 * @default true
 *
 * @param ---Rumble---
 * @default
 *
 * @param enableRumble
 * @parent ---Rumble---
 * @text Enable Rumble
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @param rumbleOnBuzzer
 * @parent ---Rumble---
 * @text Rumble On Error
 * @type boolean
 * @on Yes
 * @off No
 * @desc Light rumble whenever the error/buzzer sound plays.
 * @default true
 *
 * @param rumbleStrength
 * @parent ---Rumble---
 * @text Default Strength (0-100)
 * @type number
 * @min 0
 * @max 100
 * @default 40
 *
 * @param ---Text---
 * @default
 *
 * @param resetCommandName
 * @parent ---Text---
 * @text "Reset" Label
 * @type string
 * @default Reset to Defaults
 *
 * @param helpText
 * @parent ---Text---
 * @text Config Help Text
 * @type string
 * @default Select an action, then press a button or push the stick. (Esc / right-click cancels)
 *
 * @param listenText
 * @parent ---Text---
 * @text Listening Text
 * @type string
 * @desc %1 = action name.
 * @default Press a button or push the stick for: %1
 *
 * @param nameOk
 * @parent ---Text---
 * @text Action Name: OK
 * @type string
 * @default Confirm (OK)
 *
 * @param nameCancel
 * @parent ---Text---
 * @text Action Name: Cancel
 * @type string
 * @default Cancel / Back
 *
 * @param nameMenu
 * @parent ---Text---
 * @text Action Name: Menu
 * @type string
 * @default Menu
 *
 * @param nameDash
 * @parent ---Text---
 * @text Action Name: Dash
 * @type string
 * @default Dash
 *
 * @param namePageup
 * @parent ---Text---
 * @text Action Name: PageUp
 * @type string
 * @default Page Up (L)
 *
 * @param namePagedown
 * @parent ---Text---
 * @text Action Name: PageDown
 * @type string
 * @default Page Down (R)
 *
 * @param nameUp
 * @parent ---Text---
 * @text Action Name: Up
 * @type string
 * @default Move Up
 *
 * @param nameDown
 * @parent ---Text---
 * @text Action Name: Down
 * @type string
 * @default Move Down
 *
 * @param nameLeft
 * @parent ---Text---
 * @text Action Name: Left
 * @type string
 * @default Move Left
 *
 * @param nameRight
 * @parent ---Text---
 * @text Action Name: Right
 * @type string
 * @default Move Right
 *
 * @param guideMove
 * @parent ---Text---
 * @text Prompt Bar: Move
 * @type string
 * @default Move
 *
 * @param guideConfirm
 * @parent ---Text---
 * @text Prompt Bar: Confirm
 * @type string
 * @default Confirm
 *
 * @param guideBack
 * @parent ---Text---
 * @text Prompt Bar: Back
 * @type string
 * @default Back
 *
 * @param guideMenu
 * @parent ---Text---
 * @text Prompt Bar: Menu
 * @type string
 * @default Menu
 */

var Joy2Key = Joy2Key || {};

(() => {
    "use strict";

    const PLUGIN_NAME = "Joy2Key_AutoIntegration";
    const raw = PluginManager.parameters(PLUGIN_NAME);

    const num = (k, d) => {
        const v = Number(raw[k]);
        return Number.isFinite(v) ? v : d;
    };
    const bool = (k, d) => (raw[k] != null ? raw[k] === "true" : d);
    const str = (k, d) => (raw[k] != null && raw[k] !== "" ? String(raw[k]) : d);

    const P = {
        okButton: num("okButton", 0),
        cancelButton: num("cancelButton", 1),
        dashButton: num("dashButton", 2),
        menuButton: num("menuButton", 3),
        pageupButton: num("pageupButton", 4),
        pagedownButton: num("pagedownButton", 5),
        stickX: num("stickX", 0),
        stickY: num("stickY", 1),
        axisThreshold: num("axisThreshold", 0.5),
        addToOptions: bool("addToOptions", true),
        optionsCommandName: str("optionsCommandName", "Controller Config"),
        showPrompts: bool("showPrompts", true),
        enableRumble: bool("enableRumble", true),
        rumbleOnBuzzer: bool("rumbleOnBuzzer", true),
        rumbleStrength: num("rumbleStrength", 40),
        resetCommandName: str("resetCommandName", "Reset to Defaults"),
        helpText: str("helpText", "Select an action, then press a button or push the stick. (Esc / right-click cancels)"),
        listenText: str("listenText", "Press a button or push the stick for: %1"),
        names: {
            ok: str("nameOk", "Confirm (OK)"),
            cancel: str("nameCancel", "Cancel / Back"),
            menu: str("nameMenu", "Menu"),
            shift: str("nameDash", "Dash"),
            pageup: str("namePageup", "Page Up (L)"),
            pagedown: str("namePagedown", "Page Down (R)"),
            up: str("nameUp", "Move Up"),
            down: str("nameDown", "Move Down"),
            left: str("nameLeft", "Move Left"),
            right: str("nameRight", "Move Right"),
        },
        guideMove: str("guideMove", "Move"),
        guideConfirm: str("guideConfirm", "Confirm"),
        guideBack: str("guideBack", "Back"),
        guideMenu: str("guideMenu", "Menu"),
    };

    Joy2Key.params = P;

    // Ordered list of actions shown in the config menu.
    Joy2Key.actionOrder = [
        "ok", "cancel", "menu", "shift",
        "pageup", "pagedown",
        "up", "down", "left", "right",
    ];

    Joy2Key.actionName = symbol => P.names[symbol] || symbol;

    //-------------------------------------------------------------------------
    // Binding model
    //   button binding:  { type: "button", index: <int> }
    //   axis binding:    { type: "axis", axis: <int>, dir: 1 | -1 }
    //   null            = unbound
    //-------------------------------------------------------------------------
    Joy2Key.defaultMapping = () => ({
        ok:       { type: "button", index: P.okButton },
        cancel:   { type: "button", index: P.cancelButton },
        shift:    { type: "button", index: P.dashButton },
        menu:     { type: "button", index: P.menuButton },
        pageup:   { type: "button", index: P.pageupButton },
        pagedown: { type: "button", index: P.pagedownButton },
        up:       { type: "axis", axis: P.stickY, dir: -1 },
        down:     { type: "axis", axis: P.stickY, dir: 1 },
        left:     { type: "axis", axis: P.stickX, dir: -1 },
        right:    { type: "axis", axis: P.stickX, dir: 1 },
    });

    Joy2Key.validBinding = b => {
        if (!b || typeof b !== "object") return false;
        if (b.type === "button") return Number.isInteger(b.index) && b.index >= 0;
        if (b.type === "axis") return Number.isInteger(b.axis) && (b.dir === 1 || b.dir === -1);
        return false;
    };

    Joy2Key.sameBinding = (a, b) => {
        if (!a || !b) return false;
        if (a.type !== b.type) return false;
        if (a.type === "button") return a.index === b.index;
        return a.axis === b.axis && a.dir === b.dir;
    };

    // Fill in any missing/invalid entries from defaults; preserve explicit nulls.
    Joy2Key.sanitizeMapping = m => {
        const def = Joy2Key.defaultMapping();
        const out = {};
        for (const sym of Object.keys(def)) {
            if (m && Object.prototype.hasOwnProperty.call(m, sym)) {
                const b = m[sym];
                out[sym] = (b === null || Joy2Key.validBinding(b)) ? b : def[sym];
            } else {
                out[sym] = def[sym];
            }
        }
        return out;
    };

    // Live mapping (valid before the config file loads).
    Joy2Key.mapping = Joy2Key.defaultMapping();

    // Bind an input to a symbol; if that input already belongs to another
    // action, swap the two so nothing is silently lost.
    Joy2Key.setBinding = function (symbol, input) {
        let owner = null;
        for (const sym of Object.keys(Joy2Key.mapping)) {
            if (Joy2Key.sameBinding(Joy2Key.mapping[sym], input)) {
                owner = sym;
                break;
            }
        }
        const old = Joy2Key.mapping[symbol] || null;
        if (owner && owner !== symbol) {
            Joy2Key.mapping[owner] = old;
        }
        Joy2Key.mapping[symbol] = input;
        ConfigManager.save();
    };

    Joy2Key.resetMapping = function () {
        Joy2Key.mapping = Joy2Key.defaultMapping();
        ConfigManager.save();
    };

    //-------------------------------------------------------------------------
    // Persistence (rides along with the game's config file)
    //-------------------------------------------------------------------------
    const _CM_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        const config = _CM_makeData.call(this);
        config.joy2keyMapping = Joy2Key.mapping;
        return config;
    };

    const _CM_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _CM_applyData.call(this, config);
        Joy2Key.mapping = Joy2Key.sanitizeMapping(config.joy2keyMapping);
    };

    //-------------------------------------------------------------------------
    // Input polling — replace MZ's gamepad reader with binding-aware logic.
    // Only the current state is written on change, mirroring vanilla behaviour
    // so keyboard input and repeat timing keep working normally.
    //-------------------------------------------------------------------------
    Input._updateGamepadState = function (gamepad) {
        const last = this._gamepadStates[gamepad.index] || {};
        const next = {};
        const buttons = gamepad.buttons;
        const axes = gamepad.axes;
        const threshold = P.axisThreshold;
        const mapping = Joy2Key.mapping;
        for (const symbol of Object.keys(mapping)) {
            const b = mapping[symbol];
            let active = false;
            if (b) {
                if (b.type === "button") {
                    const btn = buttons[b.index];
                    active = !!(btn && btn.pressed);
                } else if (b.type === "axis") {
                    const v = axes[b.axis];
                    if (typeof v === "number") {
                        active = b.dir > 0 ? v >= threshold : v <= -threshold;
                    }
                }
            }
            next[symbol] = active;
            if (active !== !!last[symbol]) {
                this._currentState[symbol] = active;
            }
        }
        this._gamepadStates[gamepad.index] = next;
    };

    //-------------------------------------------------------------------------
    // Raw reads used by the press-to-bind capture (bypasses the mapping).
    //-------------------------------------------------------------------------
    const getPads = () => (navigator.getGamepads ? navigator.getGamepads() : []);

    // Snapshot resting axis values so triggers that rest at -1 (and other
    // idle axes) don't get mistaken for intentional movement.
    Joy2Key.snapshotAxes = function () {
        const snap = {};
        for (const pad of getPads()) {
            if (!pad) continue;
            for (let a = 0; a < pad.axes.length; a++) {
                snap[pad.index + ":" + a] = typeof pad.axes[a] === "number" ? pad.axes[a] : 0;
            }
        }
        return snap;
    };

    Joy2Key.readActiveInputs = function (baseline) {
        const res = [];
        const th = P.axisThreshold;
        for (const pad of getPads()) {
            if (!pad) continue;
            for (let i = 0; i < pad.buttons.length; i++) {
                const btn = pad.buttons[i];
                if (btn && (btn.pressed || btn.value > 0.5)) {
                    res.push({ type: "button", index: i });
                }
            }
            for (let a = 0; a < pad.axes.length; a++) {
                const v = pad.axes[a];
                if (typeof v !== "number") continue;
                const base = baseline ? (baseline[pad.index + ":" + a] || 0) : 0;
                const d = v - base;
                if (d >= th) res.push({ type: "axis", axis: a, dir: 1 });
                else if (d <= -th) res.push({ type: "axis", axis: a, dir: -1 });
            }
        }
        return res;
    };

    //-------------------------------------------------------------------------
    // Rumble (graceful no-op when unsupported)
    //-------------------------------------------------------------------------
    Joy2Key.vibrate = function (duration, strength) {
        if (!P.enableRumble) return;
        const mag = Math.max(0, Math.min(100, strength == null ? P.rumbleStrength : strength)) / 100;
        if (mag <= 0) return;
        for (const pad of getPads()) {
            const act = pad && pad.vibrationActuator;
            if (act && typeof act.playEffect === "function") {
                try {
                    act.playEffect("dual-rumble", {
                        startDelay: 0,
                        duration: Math.max(1, duration || 200),
                        weakMagnitude: mag,
                        strongMagnitude: mag,
                    });
                } catch (e) {
                    /* device can't rumble — ignore */
                }
            }
        }
    };

    const _SM_playBuzzer = SoundManager.playBuzzer;
    SoundManager.playBuzzer = function () {
        _SM_playBuzzer.call(this);
        if (P.rumbleOnBuzzer) Joy2Key.vibrate(150, P.rumbleStrength);
    };

    //-------------------------------------------------------------------------
    // Button-prompt glyphs (drawn with the game's own windowskin colors)
    //-------------------------------------------------------------------------
    Joy2Key.bindingLabel = function (symbol) {
        const b = Joy2Key.mapping[symbol];
        if (!b) return "--";
        if (b.type === "button") return "B" + b.index;
        if (b.type === "axis") {
            if (b.axis === P.stickX) return b.dir > 0 ? "\u25B6" : "\u25C0"; // ▶ ◀
            if (b.axis === P.stickY) return b.dir > 0 ? "\u25BC" : "\u25B2"; // ▼ ▲
            return "Ax" + b.axis + (b.dir > 0 ? "+" : "-");
        }
        return "?";
    };

    Joy2Key.glyphWidth = function (win, symbol) {
        const label = Joy2Key.bindingLabel(symbol);
        return Math.max(48, Math.ceil(win.textWidth(label)) + 24);
    };

    const strokeRect = (bmp, x, y, w, h, color) => {
        bmp.fillRect(x, y, w, 2, color);
        bmp.fillRect(x, y + h - 2, w, 2, color);
        bmp.fillRect(x, y, 2, h, color);
        bmp.fillRect(x + w - 2, y, 2, h, color);
    };

    // Draws a chip at (x, y); returns its width so callers can advance.
    Joy2Key.drawButtonGlyph = function (win, symbol, x, y) {
        const label = Joy2Key.bindingLabel(symbol);
        const w = Joy2Key.glyphWidth(win, symbol);
        const h = win.lineHeight() - 8;
        const cy = y + 4;
        win.contents.fillRect(x, cy, w, h, ColorManager.gaugeBackColor());
        strokeRect(win.contents, x, cy, w, h, ColorManager.systemColor());
        const prevSize = win.contents.fontSize;
        win.contents.fontSize = Math.min(prevSize, 22);
        win.changeTextColor(ColorManager.normalColor());
        win.drawText(label, x, y, w, "center");
        win.contents.fontSize = prevSize;
        win.resetTextColor();
        return w;
    };

    //=========================================================================
    // Window_Joy2KeyBind — the list of actions with their current bindings.
    //=========================================================================
    function Window_Joy2KeyBind() {
        this.initialize(...arguments);
    }
    Window_Joy2KeyBind.prototype = Object.create(Window_Command.prototype);
    Window_Joy2KeyBind.prototype.constructor = Window_Joy2KeyBind;

    Window_Joy2KeyBind.prototype.makeCommandList = function () {
        for (const symbol of Joy2Key.actionOrder) {
            this.addCommand(Joy2Key.actionName(symbol), symbol);
        }
        this.addCommand(P.resetCommandName, "joy2keyReset");
    };

    Window_Joy2KeyBind.prototype.drawItem = function (index) {
        const rect = this.itemLineRect(index);
        const symbol = this.commandSymbol(index);
        const name = this.commandName(index);
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        if (symbol === "joy2keyReset") {
            this.drawText(name, rect.x, rect.y, rect.width, "center");
        } else {
            const gw = Joy2Key.glyphWidth(this, symbol);
            this.drawText(name, rect.x, rect.y, rect.width - gw - 8, "left");
            Joy2Key.drawButtonGlyph(this, symbol, rect.x + rect.width - gw, rect.y);
        }
        this.changePaintOpacity(true);
    };

    //=========================================================================
    // Window_Joy2KeyGuide — compact prompt bar shown on menu scenes.
    //=========================================================================
    function Window_Joy2KeyGuide() {
        this.initialize(...arguments);
    }
    Window_Joy2KeyGuide.prototype = Object.create(Window_Base.prototype);
    Window_Joy2KeyGuide.prototype.constructor = Window_Joy2KeyGuide;

    Window_Joy2KeyGuide.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_Joy2KeyGuide.prototype.refresh = function () {
        this.contents.clear();
        const y = 0;
        let x = 0;
        const gap = 6;
        const drawText = (text) => {
            this.changeTextColor(ColorManager.normalColor());
            const w = Math.ceil(this.textWidth(text));
            this.drawText(text, x, y, w + 4, "left");
            x += w + gap + 6;
        };
        // Move (stick arrows)
        this.changeTextColor(ColorManager.systemColor());
        const arrows = "\u25B2\u25BC\u25C0\u25B6"; // ▲▼◀▶
        const aw = Math.ceil(this.textWidth(arrows));
        this.drawText(arrows, x, y, aw + 4, "left");
        x += aw + gap;
        this.resetTextColor();
        drawText(P.guideMove);
        // Confirm / Back / Menu chips
        const pairs = [
            ["ok", P.guideConfirm],
            ["cancel", P.guideBack],
            ["menu", P.guideMenu],
        ];
        for (const [symbol, text] of pairs) {
            x += Joy2Key.drawButtonGlyph(this, symbol, x, y) + gap;
            drawText(text);
        }
    };

    //=========================================================================
    // Scene_Joy2Key — press-to-bind configuration scene.
    //=========================================================================
    function Scene_Joy2Key() {
        this.initialize(...arguments);
    }
    Scene_Joy2Key.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Joy2Key.prototype.constructor = Scene_Joy2Key;

    Scene_Joy2Key.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this._listening = false;
        this._listenSymbol = null;
        this._captureReady = false;
        this._axisBaseline = null;
        this._escHandler = null;
        this.createHelpArea();
        this.createBindWindow();
    };

    Scene_Joy2Key.prototype.createHelpArea = function () {
        const rect = new Rectangle(
            0,
            this.mainAreaTop(),
            Graphics.boxWidth,
            this.calcWindowHeight(2, false)
        );
        this._helpWindow = new Window_Help(rect);
        this._helpWindow.setText(P.helpText);
        this.addWindow(this._helpWindow);
    };

    Scene_Joy2Key.prototype.createBindWindow = function () {
        const y = this._helpWindow.y + this._helpWindow.height;
        const rect = new Rectangle(0, y, Graphics.boxWidth, this.mainAreaBottom() - y);
        this._bindWindow = new Window_Joy2KeyBind(rect);
        this._bindWindow.setHandler("ok", this.onBindOk.bind(this));
        this._bindWindow.setHandler("joy2keyReset", this.onReset.bind(this));
        this._bindWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._bindWindow);
    };

    Scene_Joy2Key.prototype.onBindOk = function () {
        this.startListening(this._bindWindow.currentSymbol());
    };

    Scene_Joy2Key.prototype.onReset = function () {
        Joy2Key.resetMapping();
        SoundManager.playOk();
        Joy2Key.vibrate(80, Math.min(60, P.rumbleStrength));
        this._bindWindow.refresh();
        this._bindWindow.activate();
    };

    Scene_Joy2Key.prototype.startListening = function (symbol) {
        this._listening = true;
        this._listenSymbol = symbol;
        this._captureReady = false;
        this._axisBaseline = Joy2Key.snapshotAxes();
        this._bindWindow.deactivate();
        this._helpWindow.setText(P.listenText.replace("%1", Joy2Key.actionName(symbol)));
        this._escHandler = (e) => {
            if (e.key === "Escape") this.cancelListening();
        };
        document.addEventListener("keydown", this._escHandler);
    };

    Scene_Joy2Key.prototype.stopListening = function () {
        this._listening = false;
        this._listenSymbol = null;
        if (this._escHandler) {
            document.removeEventListener("keydown", this._escHandler);
            this._escHandler = null;
        }
        this._helpWindow.setText(P.helpText);
        this._bindWindow.activate();
    };

    Scene_Joy2Key.prototype.cancelListening = function () {
        SoundManager.playCancel();
        this.stopListening();
    };

    Scene_Joy2Key.prototype.update = function () {
        Scene_MenuBase.prototype.update.call(this);
        if (this._listening) this.updateListening();
    };

    Scene_Joy2Key.prototype.updateListening = function () {
        if (TouchInput.isCancelled()) {
            this.cancelListening();
            return;
        }
        const active = Joy2Key.readActiveInputs(this._axisBaseline);
        if (!this._captureReady) {
            // Wait until everything is released so we don't capture the button
            // that was used to enter this mode.
            if (active.length === 0) this._captureReady = true;
            return;
        }
        if (active.length > 0) {
            Joy2Key.setBinding(this._listenSymbol, active[0]);
            SoundManager.playOk();
            Joy2Key.vibrate(80, Math.min(60, P.rumbleStrength));
            this._bindWindow.refresh();
            this.stopListening();
        }
    };

    Joy2Key.openConfig = function () {
        if (!SceneManager._scene || SceneManager.isSceneChanging()) return;
        SceneManager.push(Scene_Joy2Key);
    };

    //=========================================================================
    // Options menu integration — a launcher entry that opens Scene_Joy2Key.
    //=========================================================================
    const _WO_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function () {
        _WO_addGeneralOptions.call(this);
        if (P.addToOptions) this.addCommand(P.optionsCommandName, "joy2keyConfig");
    };

    const _WO_statusText = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function (index) {
        if (this.commandSymbol(index) === "joy2keyConfig") return ">";
        return _WO_statusText.call(this, index);
    };

    const _WO_processOk = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function () {
        if (this.commandSymbol(this.index()) === "joy2keyConfig") {
            this.playOkSound();
            SceneManager.push(Scene_Joy2Key);
            return;
        }
        _WO_processOk.call(this);
    };

    const _WO_cursorRight = Window_Options.prototype.cursorRight;
    Window_Options.prototype.cursorRight = function () {
        if (this.commandSymbol(this.index()) === "joy2keyConfig") return;
        _WO_cursorRight.call(this);
    };

    const _WO_cursorLeft = Window_Options.prototype.cursorLeft;
    Window_Options.prototype.cursorLeft = function () {
        if (this.commandSymbol(this.index()) === "joy2keyConfig") return;
        _WO_cursorLeft.call(this);
    };

    //=========================================================================
    // Prompt bar on menu scenes (skips gameplay and the config scene itself).
    //=========================================================================
    const _SMB_create = Scene_MenuBase.prototype.create;
    Scene_MenuBase.prototype.create = function () {
        _SMB_create.call(this);
        if (P.showPrompts && !(this instanceof Scene_Joy2Key)) {
            this.createJoy2KeyGuide();
        }
    };

    Scene_MenuBase.prototype.createJoy2KeyGuide = function () {
        const width = Math.min(Graphics.boxWidth - 32, 620);
        const height = this.calcWindowHeight(1, false);
        const x = Math.floor((Graphics.boxWidth - width) / 2);
        const y = Graphics.boxHeight - height - 8;
        const rect = new Rectangle(x, y, width, height);
        this._joy2keyGuide = new Window_Joy2KeyGuide(rect);
        this.addWindow(this._joy2keyGuide);
    };

    //=========================================================================
    // Plugin commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "openConfig", () => {
        Joy2Key.openConfig();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "rumble", (args) => {
        const duration = Number(args.duration) || 200;
        const strength = Number(args.strength);
        Joy2Key.vibrate(duration, Number.isFinite(strength) ? strength : P.rumbleStrength);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "resetMapping", () => {
        Joy2Key.resetMapping();
    });

    // Expose scene class for advanced use.
    Joy2Key.Scene_Joy2Key = Scene_Joy2Key;
})();
