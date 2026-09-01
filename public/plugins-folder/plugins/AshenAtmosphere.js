//=============================================================================
// AshenAtmosphere.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Per-map atmosphere: colour grade, drifting ash, haze, vignette and additive light pools around fires. No image assets required.
 * @author Claude
 * @url
 *
 * @param defaultAsh
 * @text Default Ash Density
 * @type number
 * @min 0
 * @max 200
 * @default 0
 * @desc Falling ash motes on maps that don't specify their own. 0 = off.
 *
 * @param defaultHaze
 * @text Default Haze Opacity
 * @type number
 * @min 0
 * @max 255
 * @default 0
 * @desc Drifting haze on maps that don't specify their own. 0 = off.
 *
 * @param defaultVignette
 * @text Default Vignette Opacity
 * @type number
 * @min 0
 * @max 255
 * @default 0
 * @desc Corner darkening on maps that don't specify their own. 0 = off.
 *
 * @param lightFlicker
 * @text Light Flicker
 * @type boolean
 * @default true
 * @desc Fire-lit pools breathe instead of sitting at a fixed brightness.
 *
 * @param enabled
 * @text Enabled
 * @type boolean
 * @default true
 * @desc Master switch. Turn off to strip every effect without editing maps.
 *
 * @help
 * ============================================================================
 * Ashen Atmosphere
 * ============================================================================
 * Everything is drawn in code - there are no images to import and nothing to
 * copy into img/. Each map opts in through notetags in its Note box
 * (Map Properties -> Note).
 *
 * ----------------------------------------------------------------------------
 * NOTETAGS (map note box)
 * ----------------------------------------------------------------------------
 *   <AshenTint: r, g, b, gray>
 *       Colour grade applied when the map loads, e.g. <AshenTint: -34,-26,-8,60>
 *       Ranges are the same as the Tint Screen command (-255..255, gray 0..255).
 *       An event that tints the screen later still wins, so cutscene tints and
 *       the ending's colour restore are unaffected.
 *
 *   <AshenAsh: n>          n motes of ash drifting down-screen (try 30-70).
 *   <AshenHaze: n>         drifting haze, 0-255 opacity (try 40-90).
 *   <AshenVignette: n>     corner darkening, 0-255 opacity (try 60-110).
 *
 *   <AshenLight: x, y, radius, #rrggbb, opacity>
 *       An additive pool of light centred on map tile (x, y). Radius is in
 *       tiles. Opacity 0-255. Repeat the tag once per light source.
 *       Example:  <AshenLight: 8, 13, 3.5, #ffb45a, 150>
 *
 * ----------------------------------------------------------------------------
 * NOTES
 * ----------------------------------------------------------------------------
 * - Light pools sit above the tilemap and above characters, so a brazier lights
 *   the player standing next to it.
 * - Ash, haze and vignette are screen-space and sit above everything on the map
 *   but below all windows and messages.
 * - Nothing here touches passability, events, or the battle system. Turning the
 *   "Enabled" parameter off removes every effect instantly.
 * ============================================================================
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "AshenAtmosphere";
    const P = PluginManager.parameters(PLUGIN_NAME);
    const num = (k, d) => (P[k] !== undefined && P[k] !== "" ? Number(P[k]) : d);
    const bool = (k, d) => (P[k] !== undefined ? P[k] === "true" : d);

    const CFG = {
        ash: num("defaultAsh", 0),
        haze: num("defaultHaze", 0),
        vignette: num("defaultVignette", 0),
        flicker: bool("lightFlicker", true),
        enabled: bool("enabled", true)
    };

    //-----------------------------------------------------------------------
    // Note parsing
    //-----------------------------------------------------------------------
    function parseNote(note) {
        const cfg = {
            tint: null,
            ash: CFG.ash,
            haze: CFG.haze,
            vignette: CFG.vignette,
            lights: []
        };
        if (!note) return cfg;

        let m = note.match(/<AshenTint:\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*>/i);
        if (m) cfg.tint = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];

        m = note.match(/<AshenAsh:\s*(\d+)\s*>/i);
        if (m) cfg.ash = Number(m[1]);

        m = note.match(/<AshenHaze:\s*(\d+)\s*>/i);
        if (m) cfg.haze = Number(m[1]);

        m = note.match(/<AshenVignette:\s*(\d+)\s*>/i);
        if (m) cfg.vignette = Number(m[1]);

        const re = /<AshenLight:\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(#[0-9a-f]{6})\s*,\s*(\d+)\s*>/gi;
        let l;
        while ((l = re.exec(note)) !== null) {
            cfg.lights.push({
                x: Number(l[1]),
                y: Number(l[2]),
                r: Number(l[3]),
                color: l[4],
                opacity: Number(l[5])
            });
        }
        return cfg;
    }

    function currentConfig() {
        if (!CFG.enabled || !$dataMap) return null;
        return parseNote($dataMap.note);
    }

    //-----------------------------------------------------------------------
    // Procedural bitmaps (cached - these are shared by every sprite)
    //-----------------------------------------------------------------------
    const _cache = {};

    function markDirty(bitmap) {
        if (bitmap._baseTexture) bitmap._baseTexture.update();
        else if (bitmap._setDirty) bitmap._setDirty();
    }

    /** Soft radial blob, white, fading to transparent. */
    function radialBitmap(size) {
        const key = "radial" + size;
        if (_cache[key]) return _cache[key];
        const bmp = new Bitmap(size, size);
        const ctx = bmp.context;
        const r = size / 2;
        const g = ctx.createRadialGradient(r, r, 0, r, r, r);
        // deliberately soft: a hot white core reads as a blown-out blob rather
        // than firelight, so the centre stops well short of full alpha
        g.addColorStop(0.0, "rgba(255,255,255,0.78)");
        g.addColorStop(0.28, "rgba(255,255,255,0.50)");
        g.addColorStop(0.58, "rgba(255,255,255,0.20)");
        g.addColorStop(0.82, "rgba(255,255,255,0.06)");
        g.addColorStop(1.0, "rgba(255,255,255,0.0)");
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        markDirty(bmp);
        _cache[key] = bmp;
        return bmp;
    }

    /** A single soft mote. */
    function moteBitmap() {
        if (_cache.mote) return _cache.mote;
        const s = 12;
        const bmp = new Bitmap(s, s);
        const ctx = bmp.context;
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0.0, "rgba(255,246,230,0.95)");
        g.addColorStop(0.5, "rgba(226,214,196,0.45)");
        g.addColorStop(1.0, "rgba(200,190,175,0.0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        markDirty(bmp);
        _cache.mote = bmp;
        return bmp;
    }

    /** Screen-sized vignette: transparent centre, dark corners. */
    function vignetteBitmap(w, h) {
        const key = `vig${w}x${h}`;
        if (_cache[key]) return _cache[key];
        const bmp = new Bitmap(w, h);
        const ctx = bmp.context;
        const cx = w / 2;
        const cy = h / 2;
        const outer = Math.sqrt(cx * cx + cy * cy);
        const g = ctx.createRadialGradient(cx, cy, outer * 0.42, cx, cy, outer);
        g.addColorStop(0.0, "rgba(0,0,0,0)");
        g.addColorStop(0.62, "rgba(0,0,0,0.35)");
        g.addColorStop(1.0, "rgba(0,0,0,1)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        markDirty(bmp);
        _cache[key] = bmp;
        return bmp;
    }

    //-----------------------------------------------------------------------
    // Light pool - locked to a map tile, sits above characters
    //-----------------------------------------------------------------------
    function Sprite_AshenLight() {
        this.initialize(...arguments);
    }
    Sprite_AshenLight.prototype = Object.create(Sprite.prototype);
    Sprite_AshenLight.prototype.constructor = Sprite_AshenLight;

    Sprite_AshenLight.prototype.initialize = function (data) {
        Sprite.prototype.initialize.call(this, radialBitmap(256));
        this._data = data;
        this._phase = Math.random() * Math.PI * 2;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.blendMode = PIXI.BLEND_MODES.ADD;
        // tint the white blob to the light's colour
        this.tint = parseInt(data.color.slice(1), 16);
        const diameter = data.r * 2 * $gameMap.tileWidth();
        this.scale.x = diameter / 256;
        this.scale.y = diameter / 256;
        this.opacity = data.opacity;
        this._baseOpacity = data.opacity;
    };

    Sprite_AshenLight.prototype.update = function () {
        Sprite.prototype.update.call(this);
        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();
        this.x = ($gameMap.adjustX(this._data.x) + 0.5) * tw;
        this.y = ($gameMap.adjustY(this._data.y) + 0.5) * th;
        if (CFG.flicker) {
            this._phase += 0.045;
            const f = 0.88 + 0.12 * Math.sin(this._phase) + 0.04 * Math.sin(this._phase * 3.1);
            this.opacity = this._baseOpacity * f;
        }
        // cheap cull
        this.visible =
            this.x > -300 && this.x < Graphics.width + 300 &&
            this.y > -300 && this.y < Graphics.height + 300;
    };

    //-----------------------------------------------------------------------
    // Falling ash - screen space, wraps around
    //-----------------------------------------------------------------------
    function Sprite_AshMote() {
        this.initialize(...arguments);
    }
    Sprite_AshMote.prototype = Object.create(Sprite.prototype);
    Sprite_AshMote.prototype.constructor = Sprite_AshMote;

    Sprite_AshMote.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this, moteBitmap());
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.reset(true);
    };

    Sprite_AshMote.prototype.reset = function (anywhere) {
        this.x = Math.random() * (Graphics.width + 80) - 40;
        this.y = anywhere ? Math.random() * Graphics.height : -20;
        const s = 0.35 + Math.random() * 0.85;
        this.scale.x = s;
        this.scale.y = s;
        this._fall = 0.25 + Math.random() * 0.9;
        this._drift = (Math.random() - 0.5) * 0.6;
        this._sway = Math.random() * Math.PI * 2;
        this._swaySpeed = 0.01 + Math.random() * 0.03;
        this.opacity = 40 + Math.random() * 130;
    };

    Sprite_AshMote.prototype.update = function () {
        Sprite.prototype.update.call(this);
        this._sway += this._swaySpeed;
        this.y += this._fall;
        this.x += this._drift + Math.sin(this._sway) * 0.35;
        if (this.y > Graphics.height + 20 || this.x < -60 || this.x > Graphics.width + 60) {
            this.reset(false);
        }
    };

    //-----------------------------------------------------------------------
    // Drifting haze - a few very large soft blobs
    //-----------------------------------------------------------------------
    function Sprite_AshenHaze() {
        this.initialize(...arguments);
    }
    Sprite_AshenHaze.prototype = Object.create(Sprite.prototype);
    Sprite_AshenHaze.prototype.constructor = Sprite_AshenHaze;

    Sprite_AshenHaze.prototype.initialize = function (opacity, seed) {
        Sprite.prototype.initialize.call(this, radialBitmap(256));
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.tint = 0xb9bcc4;
        this.opacity = opacity;
        const s = (Graphics.width * (0.85 + (seed % 3) * 0.35)) / 256;
        this.scale.x = s;
        this.scale.y = s * 0.55;
        this.x = ((seed * 397) % (Graphics.width + 400)) - 200;
        this.y = ((seed * 271) % Graphics.height);
        this._vx = 0.12 + (seed % 5) * 0.06;
        this._phase = seed;
    };

    Sprite_AshenHaze.prototype.update = function () {
        Sprite.prototype.update.call(this);
        this._phase += 0.004;
        this.x += this._vx;
        this.y += Math.sin(this._phase) * 0.09;
        if (this.x - (this.width * this.scale.x) / 2 > Graphics.width) {
            this.x = -(this.width * this.scale.x) / 2;
        }
    };

    //-----------------------------------------------------------------------
    // Wire it into the map spriteset
    //-----------------------------------------------------------------------
    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function () {
        _Spriteset_Map_createLowerLayer.call(this);
        this.createAshenLights();
    };

    Spriteset_Map.prototype.createAshenLights = function () {
        this._ashenLights = [];
        const cfg = currentConfig();
        if (!cfg) return;
        this._ashenLightLayer = new Sprite();
        for (const data of cfg.lights) {
            const s = new Sprite_AshenLight(data);
            this._ashenLightLayer.addChild(s);
            this._ashenLights.push(s);
        }
        // above the tilemap AND above characters, so fires light the player
        this._baseSprite.addChild(this._ashenLightLayer);
    };

    // Spriteset_Map does not define createUpperLayer, so alias the base class
    // explicitly rather than relying on the prototype chain.
    const _Spriteset_Base_createUpperLayer = Spriteset_Base.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function () {
        this.createAshenScreenEffects();
        _Spriteset_Base_createUpperLayer.call(this);
    };

    Spriteset_Map.prototype.createAshenScreenEffects = function () {
        const cfg = currentConfig();
        if (!cfg) return;

        if (cfg.haze > 0) {
            this._ashenHaze = new Sprite();
            for (let i = 0; i < 4; i++) {
                this._ashenHaze.addChild(new Sprite_AshenHaze(cfg.haze, i * 7 + 3));
            }
            this.addChild(this._ashenHaze);
        }

        if (cfg.ash > 0) {
            this._ashenAsh = new Sprite();
            const n = Math.min(cfg.ash, 200);
            for (let i = 0; i < n; i++) {
                this._ashenAsh.addChild(new Sprite_AshMote());
            }
            this.addChild(this._ashenAsh);
        }

        if (cfg.vignette > 0) {
            const v = new Sprite(vignetteBitmap(Graphics.width, Graphics.height));
            v.opacity = cfg.vignette;
            this._ashenVignette = v;
            this.addChild(v);
        }
    };

    //-----------------------------------------------------------------------
    // Per-map colour grade, applied on load. Event tints still win.
    //-----------------------------------------------------------------------
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function () {
        _Scene_Map_onMapLoaded.call(this);
        if (!CFG.enabled) return;
        const cfg = currentConfig();
        if (cfg && cfg.tint) {
            // Applied before any autorun event runs, so a cutscene tint or the
            // ending's colour restore still overrides this.
            $gameScreen.startTint(cfg.tint, 0);
        }
    };
})();
