//=============================================================================
// AshenTitle.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Dresses the title screen to match the game: carved title, ash on the wind, and a dark command panel instead of the default blue window.
 * @author Claude
 * @url
 *
 * @param subtitle
 * @text Subtitle
 * @default Rite of the Fallen Gate
 * @desc Small line under the game title. Leave blank for none.
 *
 * @param titleColor
 * @text Title Colour
 * @default #e8dcc0
 * @desc Colour of the game title.
 *
 * @param accentColor
 * @text Accent Colour
 * @default #ffd08a
 * @desc Firelight gold, used for the selected menu entry and the rule under the title.
 *
 * @param idleColor
 * @text Unselected Colour
 * @default #ded5c2
 * @desc Colour of menu entries that are not selected.

 * @param menuFontSize
 * @text Menu Text Size
 * @type number
 * @min 12
 * @max 48
 * @default 27
 * @desc Point size of the New Game / Continue / Options lettering.

 * @param menuWidth
 * @text Menu Width
 * @type number
 * @min 200
 * @max 800
 * @default 372
 * @desc Width of the command panel, in pixels.
 *
 * @param ashCount
 * @text Ash Motes
 * @type number
 * @min 0
 * @max 200
 * @default 40
 * @desc Ash drifting over the title screen. 0 turns it off.
 *
 * @param fadeFrames
 * @text Title Fade-In
 * @type number
 * @min 0
 * @default 90
 * @desc Frames for the title and menu to fade up when the screen opens.
 *
 * @help
 * ============================================================================
 * Ashen Title
 * ============================================================================
 * The title screen was the last stock-looking part of the game: default font,
 * default blue window frame, default white text. This dresses it in the same
 * language as the maps - cold stone, firelight gold, drifting ash.
 *
 * It changes presentation only. New Game, Continue and Options behave exactly
 * as they did.
 *
 * The wording of the commands themselves lives in the database, under
 * Terms -> Messages, so it can be edited without touching code.
 * ============================================================================
 */

(() => {
    "use strict";

    const PN = "AshenTitle";
    const P = PluginManager.parameters(PN);
    const str = (k, d) => (P[k] !== undefined && P[k] !== "" ? String(P[k]) : d);
    const num = (k, d) => (isNaN(Number(P[k])) ? d : Number(P[k]));

    const CFG = {
        subtitle: P.subtitle !== undefined ? String(P.subtitle) : "Rite of the Fallen Gate",
        title: str("titleColor", "#e8dcc0"),
        accent: str("accentColor", "#ffd08a"),
        idle: str("idleColor", "#ded5c2"),
        ash: num("ashCount", 40),
        fade: num("fadeFrames", 90),
        size: num("menuFontSize", 27),
        menuW: num("menuWidth", 372)
    };

    //-----------------------------------------------------------------------
    // The title itself: carved into the frame rather than stamped on it
    //-----------------------------------------------------------------------
    Scene_Title.prototype.drawGameTitle = function () {
        const x = 20;
        const y = Graphics.height / 4 - 40;
        const w = Graphics.width - x * 2;
        const b = this._gameTitleSprite.bitmap;
        b.clear();
        b.fontFace = $gameSystem.mainFontFace();
        b.outlineColor = "rgba(0,0,0,0.95)";

        // a soft dark shadow under the lettering so it reads on any frame
        b.fontSize = 62;
        b.fontBold = false;
        b.outlineWidth = 12;
        b.textColor = "rgba(0,0,0,0.65)";
        b.drawText($dataSystem.gameTitle, x, y + 4, w, 70, "center");

        b.textColor = CFG.title;
        b.outlineWidth = 8;
        b.drawText($dataSystem.gameTitle, x, y, w, 70, "center");

        // a thin ember rule beneath it
        const cx = Graphics.width / 2;
        const rw = 190;
        b.fillRect(cx - rw, y + 78, rw * 2, 2, "rgba(255,208,138,0.55)");
        b.fillRect(cx - 46, y + 77, 92, 4, "rgba(255,208,138,0.85)");

        if (CFG.subtitle) {
            b.fontSize = 19;
            b.outlineWidth = 5;
            b.textColor = "rgba(214,206,190,0.92)";
            b.drawText(CFG.subtitle, x, y + 88, w, 30, "center");
        }
    };

    //-----------------------------------------------------------------------
    // Command panel: no default frame, gold on near-black
    //-----------------------------------------------------------------------
    const _WTC_initialize = Window_TitleCommand.prototype.initialize;
    Window_TitleCommand.prototype.initialize = function (rect) {
        _WTC_initialize.call(this, rect);
        this.opacity = 0;          // drop the blue frame
        this.backOpacity = 0;      // and its fill
    };

    Window_TitleCommand.prototype.itemTextAlign = function () {
        return "center";
    };

    // The lines need room to breathe now that they are set larger.
    Window_TitleCommand.prototype.itemHeight = function () {
        return 44;
    };

    // a warm bed of light behind the highlighted entry instead of the default cursor
    Window_TitleCommand.prototype.drawItemBackground = function (index) {
        const r = this.itemRect(index);
        const b = this.contentsBack;
        if (index !== this.index()) {
            // a hairline BETWEEN entries so they read as a list - not under the
            // last one, where it looks like a stray underline
            if (index < this.maxItems() - 1) {
                b.fillRect(r.x + 20, r.y + r.height - 1, r.width - 40, 1,
                    "rgba(255,208,138,0.12)");
            }
            return;
        }
        // a short gradient of firelight, brightest at the left edge
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const w = Math.floor((r.width - 8) * (1 - i / steps));
            b.fillRect(r.x + 4, r.y + 3, w, r.height - 6,
                "rgba(255,180,96,0.022)");
        }
        b.fillRect(r.x + 4, r.y + 3, 3, r.height - 6, "rgba(255,214,150,0.95)");
        b.fillRect(r.x + 4, r.y + 3, r.width - 8, 1, "rgba(255,208,138,0.30)");
        b.fillRect(r.x + 4, r.y + r.height - 4, r.width - 8, 1, "rgba(255,208,138,0.30)");
    };

    // the bar drawn above is the cursor now, so suppress the engine's
    Window_TitleCommand.prototype.refreshCursor = function () {
        this.setCursorRect(0, 0, 0, 0);
    };

    Window_TitleCommand.prototype.drawItem = function (index) {
        const rect = this.itemLineRect(index);
        const selected = index === this.index();
        const name = this.commandName(index);
        const b = this.contents;
        b.fontFace = $gameSystem.mainFontFace();
        b.outlineColor = "rgba(0,0,0,0.95)";
        this.changePaintOpacity(this.isCommandEnabled(index));

        // A heavy dark pass first: the title art behind is busy, and without
        // this the lettering dissolves into it wherever the art is light.
        b.fontSize = CFG.size;
        b.fontBold = selected;
        b.outlineWidth = 7;
        b.textColor = "rgba(0,0,0,0.55)";
        b.drawText(name, rect.x, rect.y + 2, rect.width, rect.height, "center");

        // then the lettering. The selected line is drawn twice so the gold
        // builds into a glow rather than sitting flat.
        b.outlineWidth = 4;
        if (selected) {
            b.textColor = "rgba(255,168,72,0.55)";
            b.drawText(name, rect.x, rect.y + 1, rect.width, rect.height, "center");
        }
        b.textColor = selected ? CFG.accent : CFG.idle;
        b.drawText(name, rect.x, rect.y, rect.width, rect.height, "center");

        // ember marks bracketing the line the player is on
        if (selected) {
            const tw = b.measureTextWidth(name);
            const cx = rect.x + rect.width / 2;
            const my = rect.y + rect.height / 2;
            for (const mx of [cx - tw / 2 - 20, cx + tw / 2 + 20]) {
                b.fillRect(mx - 3, my - 1, 6, 2, "rgba(255,214,150,0.9)");
                b.fillRect(mx - 1, my - 3, 2, 6, "rgba(255,214,150,0.9)");
            }
        }
        b.fontBold = false;
        this.changePaintOpacity(true);
    };

    // redraw when the selection moves so the colours follow it
    const _WTC_select = Window_TitleCommand.prototype.select;
    Window_TitleCommand.prototype.select = function (index) {
        const before = this.index();
        _WTC_select.call(this, index);
        if (this.index() !== before && this.contents) this.refresh();
    };

    //-----------------------------------------------------------------------
    // Backdrop behind the commands, and ash over everything
    //-----------------------------------------------------------------------
    function panelBitmap(w, h) {
        const bmp = new Bitmap(w, h);
        bmp.fillRect(0, 0, w, h, "rgba(8,10,14,0.62)");
        bmp.fillRect(0, 0, w, 2, "rgba(255,208,138,0.32)");
        bmp.fillRect(0, h - 2, w, 2, "rgba(0,0,0,0.55)");
        return bmp;
    }

    // the stock rect is 240 wide and sized for 22pt text; give it room
    const _ST_commandWindowRect = Scene_Title.prototype.commandWindowRect;
    Scene_Title.prototype.commandWindowRect = function () {
        const r = _ST_commandWindowRect.call(this);
        const w = Math.min(CFG.menuW, Graphics.boxWidth - 40);
        // the engine sized the height for 36px lines; ours are 44
        const h = r.height + 3 * (44 - 36);
        return new Rectangle(Math.round((Graphics.boxWidth - w) / 2), r.y, w, h);
    };

    const _ST_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _ST_createCommandWindow.call(this);
        const w = this._commandWindow;
        const pad = 16;
        const panel = new Sprite(panelBitmap(w.width + pad * 2, w.height));
        panel.x = w.x - pad;
        panel.y = w.y;
        panel.opacity = 0;
        this._ashenPanel = panel;
        const at = this.children.indexOf(w);
        this.addChildAt(panel, at >= 0 ? at : this.children.length);
        w.refresh();
    };

    function moteBitmap() {
        const s = 12;
        const bmp = new Bitmap(s, s);
        const ctx = bmp.context;
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0.0, "rgba(255,246,230,0.95)");
        g.addColorStop(0.5, "rgba(226,214,196,0.45)");
        g.addColorStop(1.0, "rgba(200,190,175,0.0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        if (bmp._baseTexture) bmp._baseTexture.update();
        return bmp;
    }

    function Sprite_TitleAsh() { this.initialize(...arguments); }
    Sprite_TitleAsh.prototype = Object.create(Sprite.prototype);
    Sprite_TitleAsh.prototype.constructor = Sprite_TitleAsh;

    Sprite_TitleAsh.prototype.initialize = function (bmp) {
        Sprite.prototype.initialize.call(this, bmp);
        this.anchor.x = this.anchor.y = 0.5;
        this.reset(true);
    };
    Sprite_TitleAsh.prototype.reset = function (anywhere) {
        this.x = Math.random() * (Graphics.width + 80) - 40;
        this.y = anywhere ? Math.random() * Graphics.height : -20;
        const s = 0.35 + Math.random() * 0.8;
        this.scale.x = this.scale.y = s;
        this._fall = 0.22 + Math.random() * 0.8;
        this._drift = (Math.random() - 0.5) * 0.5;
        this._sway = Math.random() * Math.PI * 2;
        this._swaySpeed = 0.01 + Math.random() * 0.028;
        this._maxOp = 35 + Math.random() * 120;
        this.opacity = this._maxOp;
    };
    Sprite_TitleAsh.prototype.update = function () {
        Sprite.prototype.update.call(this);
        this._sway += this._swaySpeed;
        this.y += this._fall;
        this.x += this._drift + Math.sin(this._sway) * 0.3;
        if (this.y > Graphics.height + 20 || this.x < -60 || this.x > Graphics.width + 60) {
            this.reset(false);
        }
    };

    const _ST_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function () {
        _ST_create.call(this);
        this._ashenFade = 0;
        if (CFG.ash > 0) {
            const shared = moteBitmap();
            this._ashenAsh = new Sprite();
            for (let i = 0; i < CFG.ash; i++) {
                this._ashenAsh.addChild(new Sprite_TitleAsh(shared));
            }
            // above the art, below the title lettering and the menu
            const at = this.children.indexOf(this._gameTitleSprite);
            this.addChildAt(this._ashenAsh, at >= 0 ? at : this.children.length);
        }
        // fade the lettering and the menu up out of the dark
        if (CFG.fade > 0) {
            if (this._gameTitleSprite) this._gameTitleSprite.opacity = 0;
            if (this._commandWindow) this._commandWindow.contentsOpacity = 0;
        }
    };

    const _ST_update = Scene_Title.prototype.update;
    Scene_Title.prototype.update = function () {
        _ST_update.call(this);
        if (CFG.fade <= 0) return;
        if (this._ashenFade >= CFG.fade) return;
        this._ashenFade++;
        const r = this._ashenFade / CFG.fade;
        const op = Math.floor(255 * r);
        if (this._gameTitleSprite) this._gameTitleSprite.opacity = op;
        if (this._commandWindow) this._commandWindow.contentsOpacity = op;
        if (this._ashenPanel) this._ashenPanel.opacity = Math.floor(255 * r);
    };
})();
