//=============================================================================
// FoundFootage.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Found-footage / VHS horror overlay: switchable camcorder modes, REC HUD, grain, scanlines, handheld shake, glitches & tracking distortion. Toggle via switch or script.
 * @author Built with Claude
 *
 * @param controlSwitchId
 * @text Control Switch ID
 * @type switch
 * @default 0
 * @desc When set (>0), this game switch turns the overlay ON/OFF and persists in saves. 0 = control only via script/plugin commands.
 *
 * @param modeVariableId
 * @text Mode Variable ID
 * @type variable
 * @default 0
 * @desc Optional. If set (>0), the current mode is stored here (0=VHS, 1=DIGITAL, 2=NIGHTVISION) so it saves. 0 = internal.
 *
 * @param defaultMode
 * @text Default Mode
 * @type select
 * @option VHS
 * @option DIGITAL
 * @option NIGHTVISION
 * @default VHS
 * @desc The camcorder look used when the overlay first turns on.
 *
 * @param masterIntensity
 * @text Master Intensity
 * @type number
 * @min 0
 * @max 100
 * @default 100
 * @desc Global multiplier (%) for all distortion effects. Lower this on weaker hardware.
 *
 * @param enableRecUI
 * @text Enable REC HUD
 * @type boolean
 * @default true
 * @desc Draw the blinking REC dot, recording timecode, wall-clock stamp and battery meter.
 *
 * @param enableShake
 * @text Enable Handheld Shake
 * @type boolean
 * @default true
 * @desc Adds constant subtle sway plus occasional jolts, like a hand-held camera.
 *
 * @param enableGlitch
 * @text Enable Ambient Glitches
 * @type boolean
 * @default true
 * @desc Randomly fire small glitch/tracking bursts on their own (in addition to scripted ones).
 *
 * @param ambientGlitchRate
 * @text Ambient Glitch Rate
 * @type number
 * @min 0
 * @max 100
 * @default 6
 * @desc Roughly how often (0=never, 100=constant) spontaneous glitches occur. Ignored if Ambient Glitches is off.
 *
 * @param batteryDrainMinutes
 * @text Battery Drain (minutes)
 * @type number
 * @min 0
 * @default 0
 * @desc Real minutes for the battery meter to drop from full to empty while recording. 0 = never drains.
 *
 * @param lowBatteryDisables
 * @text Empty Battery Turns Off
 * @type boolean
 * @default false
 * @desc If true, the overlay switches itself off when the battery hits 0% (great for a "camera died" beat).
 *
 * @param dateStampBase
 * @text Wall-Clock Start
 * @type string
 * @default 2024-10-31 23:57:00
 * @desc Starting date/time shown in the HUD. It ticks forward as recording continues. Format: YYYY-MM-DD HH:MM:SS
 *
 * @param recLabel
 * @text REC Label
 * @type string
 * @default REC
 * @desc Text shown next to the blinking dot.
 *
 * @command enable
 * @text Enable Overlay
 * @desc Turns the found-footage overlay on.
 *
 * @command disable
 * @text Disable Overlay
 * @desc Turns the found-footage overlay off.
 *
 * @command setMode
 * @text Set Mode
 * @desc Switches the camcorder look. The change eases in smoothly.
 * @arg mode
 * @type select
 * @option VHS
 * @option DIGITAL
 * @option NIGHTVISION
 * @default VHS
 *
 * @command glitchBurst
 * @text Glitch Burst
 * @desc Fires a one-shot glitch/tracking spike that decays. Perfect for scare beats.
 * @arg strength
 * @type number
 * @decimals 2
 * @min 0
 * @max 3
 * @default 1.00
 * @arg frames
 * @type number
 * @min 1
 * @default 30
 * @desc How many frames (60 = 1 second) the burst takes to fade out.
 *
 * @command setIntensity
 * @text Set Master Intensity
 * @desc Sets the global effect strength (%) at runtime.
 * @arg value
 * @type number
 * @min 0
 * @max 100
 * @default 100
 *
 * @help
 * ===========================================================================
 * Found Footage / VHS Horror Overlay  —  RPG Maker MZ
 * ===========================================================================
 *
 * Drop this file in your project's js/plugins/ folder and enable it in the
 * Plugin Manager. (Keep the filename as FoundFootage.js.)
 *
 * The overlay applies GPU shader effects to the entire screen and draws a
 * camcorder HUD on top. It runs across all scenes (map, menu, etc.) and its
 * state (mode, battery, timecode) is kept in a global manager, so scene
 * changes and save/load are handled for you.
 *
 * ---------------------------------------------------------------------------
 * TURNING IT ON/OFF
 * ---------------------------------------------------------------------------
 * Easiest: set "Control Switch ID" to a switch, then just flip that switch
 * ON/OFF anywhere in your events. It persists in saves automatically.
 *
 * Or use the Plugin Commands: Enable Overlay / Disable Overlay.
 *
 * Or use script calls (in event "Script" commands or other plugins):
 *
 *     FF.enable();
 *     FF.disable();
 *     FF.toggle();
 *
 * ---------------------------------------------------------------------------
 * SWITCHING THE LOOK
 * ---------------------------------------------------------------------------
 * Three built-in modes: "VHS", "DIGITAL", "NIGHTVISION".
 *
 *     FF.setMode("VHS");
 *     FF.setMode("NIGHTVISION");
 *
 * (Or the "Set Mode" plugin command.) If you set "Mode Variable ID", the
 * mode is mirrored to that variable so it saves and you can branch on it.
 *
 * ---------------------------------------------------------------------------
 * SCARE MOMENTS
 * ---------------------------------------------------------------------------
 * Fire a glitch spike on cue (strength, then duration in frames):
 *
 *     FF.glitch(1.0, 30);     // strong half-second burst
 *     FF.glitch(2.0, 90);     // nasty 1.5s tracking meltdown
 *
 * Adjust overall strength on the fly (0–100):
 *
 *     FF.setIntensity(40);    // calm
 *     FF.setIntensity(100);   // full
 *
 * Query state:
 *
 *     FF.isActive();          // true / false
 *     FF.getMode();           // "VHS" | "DIGITAL" | "NIGHTVISION"
 *     FF.getBattery();        // 0.0 – 1.0
 *
 * ---------------------------------------------------------------------------
 * NOTE ON THE HUD
 * ---------------------------------------------------------------------------
 * The camcorder HUD is intentionally rendered *inside* the filtered image, so
 * it takes on the VHS grain/scanlines like real burnt-in footage. During big
 * glitch bursts it may distort briefly — that's by design. If you'd rather
 * keep the HUD perfectly crisp above the effects, that's an easy follow-up
 * tweak.
 *
 * Terms of use: free for commercial and non-commercial projects. No credit
 * required (though appreciated).
 * ===========================================================================
 */

(() => {
  "use strict";

  //---------------------------------------------------------------------------
  // Resolve this plugin's own filename so parameters / commands always bind,
  // even if the file is renamed.
  //---------------------------------------------------------------------------
  const PLUGIN_NAME = (() => {
    const src = (document.currentScript && document.currentScript.src) || "";
    const m = src.match(/\/([^\/]+)\.js$/);
    return m ? decodeURIComponent(m[1]) : "FoundFootage";
  })();

  const params = PluginManager.parameters(PLUGIN_NAME);
  const asBool = (v, d) => (v === undefined ? d : v === "true");
  const asNum = (v, d) => (v === undefined || v === "" ? d : Number(v));

  const CONFIG = {
    controlSwitchId: asNum(params.controlSwitchId, 0),
    modeVariableId: asNum(params.modeVariableId, 0),
    defaultMode: params.defaultMode || "VHS",
    masterIntensity: asNum(params.masterIntensity, 100) / 100,
    enableRecUI: asBool(params.enableRecUI, true),
    enableShake: asBool(params.enableShake, true),
    enableGlitch: asBool(params.enableGlitch, true),
    ambientGlitchRate: asNum(params.ambientGlitchRate, 6) / 100,
    batteryDrainMinutes: asNum(params.batteryDrainMinutes, 0),
    lowBatteryDisables: asBool(params.lowBatteryDisables, false),
    dateStampBase: params.dateStampBase || "2024-10-31 23:57:00",
    recLabel: params.recLabel || "REC",
  };

  const MODE_NAMES = ["VHS", "DIGITAL", "NIGHTVISION"];
  const modeIndex = (name) => Math.max(0, MODE_NAMES.indexOf(name));

  //---------------------------------------------------------------------------
  // Per-mode target uniform presets. These are eased toward on mode changes.
  //---------------------------------------------------------------------------
  const MODE_PRESETS = {
    VHS: {
      aberration: 0.006, scanline: 0.35, scanCount: 900,
      grain: 0.12, vignette: 0.5, static: 0.25, tracking: 0.4,
      tint: [1.02, 1.0, 1.03], sat: 0.9, bright: 1.0,
    },
    DIGITAL: {
      aberration: 0.0022, scanline: 0.08, scanCount: 1400,
      grain: 0.05, vignette: 0.28, static: 0.05, tracking: 0.0,
      tint: [1.0, 1.0, 1.0], sat: 1.0, bright: 1.03,
    },
    NIGHTVISION: {
      aberration: 0.0012, scanline: 0.2, scanCount: 700,
      grain: 0.3, vignette: 0.72, static: 0.15, tracking: 0.1,
      tint: [0.35, 1.45, 0.5], sat: 0.0, bright: 1.28,
    },
  };

  //---------------------------------------------------------------------------
  // Shaders
  //---------------------------------------------------------------------------
  const FRAG_SRC = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAberration;
    uniform float uScanline;
    uniform float uScanCount;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uStatic;
    uniform float uGlitch;
    uniform vec3 uTint;
    uniform float uSat;
    uniform float uBright;
    uniform vec2 uShake;
    uniform float uZoom;
    uniform float uTracking;

    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

    void main(){
      vec2 suv = vTextureCoord;                 // screen-fixed coord
      vec2 uv = (suv - 0.5) / uZoom + 0.5;      // slight overscan zoom
      uv += uShake;                             // handheld offset

      float g = uGlitch;
      if (g > 0.001){
        float line = floor(suv.y * 90.0);
        float n = rand(vec2(line, floor(uTime * 12.0)));
        float amt = step(0.82, n) * (n - 0.82) * 5.0 * g;
        uv.x += amt * (rand(vec2(line, uTime)) - 0.5);
      }

      float band = 0.0;
      if (uTracking > 0.001){
        float pos = fract(uTime * 0.15);
        band = smoothstep(0.05, 0.0, abs(suv.y - pos)) * uTracking;
        uv.x += band * 0.02 * sin(suv.y * 260.0 + uTime * 40.0);
      }

      float ab = uAberration + g * 0.012 + band * 0.02;
      vec2 dir = uv - 0.5;
      vec3 col;
      col.r = texture2D(uSampler, uv + dir * ab).r;
      col.g = texture2D(uSampler, uv).g;
      col.b = texture2D(uSampler, uv - dir * ab).b;

      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, uSat);
      col *= uTint * uBright;

      float sl = sin(suv.y * uScanCount) * 0.5 + 0.5;
      col *= 1.0 - uScanline * (1.0 - sl);

      float grain = rand(suv * uResolution + fract(uTime) * 97.0);
      col += (grain - 0.5) * uGrain;

      if (uStatic > 0.001){
        float s = rand(suv * uResolution * 0.7 + uTime * 13.0);
        col += step(1.0 - uStatic * 0.12, s) * 0.7;
      }

      float vig = smoothstep(0.85, 0.25, length((suv - 0.5) * vec2(1.15, 1.0)));
      col *= mix(1.0, vig, uVignette);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  function makeUniforms() {
    return {
      uTime: 0.0,
      uResolution: [Graphics.width || 816, Graphics.height || 624],
      uAberration: 0.0,
      uScanline: 0.0,
      uScanCount: 900.0,
      uGrain: 0.0,
      uVignette: 0.0,
      uStatic: 0.0,
      uGlitch: 0.0,
      uTint: [1.0, 1.0, 1.0],
      uSat: 1.0,
      uBright: 1.0,
      uShake: [0.0, 0.0],
      uZoom: 1.05,
      uTracking: 0.0,
    };
  }

  //---------------------------------------------------------------------------
  // FoundFootage manager (global state that survives scene changes & saves).
  //---------------------------------------------------------------------------
  const FF = {
    _internalActive: false,
    _mode: CONFIG.defaultMode,
    _cur: null,        // current (eased) effect values
    _target: null,     // target effect values for the active mode
    _time: 0.0,        // seconds of accumulated time (drives shaders)
    _recFrames: 0,     // frames counted while active (timecode + clock)
    _battery: 1.0,     // 0..1
    _intensity: CONFIG.masterIntensity,
    _glitchBurst: 0.0, // one-shot / ambient glitch amount
    _glitchDecay: 0.0, // per-frame decay applied to _glitchBurst
    _joltX: 0.0,
    _joltY: 0.0,

    // ---- lifecycle -------------------------------------------------------
    _ensureInit() {
      if (!this._cur) {
        this._cur = this._blankFx();
        this._target = Object.assign({}, MODE_PRESETS[this._mode]);
        // snap current straight to target on first init (no fade-in from nothing)
        this._cur = Object.assign({}, this._target);
      }
    },

    _blankFx() {
      return {
        aberration: 0, scanline: 0, scanCount: 900, grain: 0,
        vignette: 0, static: 0, tracking: 0,
        tint: [1, 1, 1], sat: 1, bright: 1,
      };
    },

    // ---- public API ------------------------------------------------------
    enable() {
      if (CONFIG.controlSwitchId > 0 && $gameSwitches) {
        $gameSwitches.setValue(CONFIG.controlSwitchId, true);
      } else {
        this._internalActive = true;
      }
    },

    disable() {
      if (CONFIG.controlSwitchId > 0 && $gameSwitches) {
        $gameSwitches.setValue(CONFIG.controlSwitchId, false);
      } else {
        this._internalActive = false;
      }
    },

    toggle() {
      this.isActive() ? this.disable() : this.enable();
    },

    isActive() {
      if (CONFIG.controlSwitchId > 0 && $gameSwitches) {
        return $gameSwitches.value(CONFIG.controlSwitchId);
      }
      return this._internalActive;
    },

    setMode(name) {
      if (!MODE_PRESETS[name]) return;
      this._mode = name;
      this._ensureInit();
      this._target = Object.assign({}, MODE_PRESETS[name]);
      if (CONFIG.modeVariableId > 0 && $gameVariables) {
        $gameVariables.setValue(CONFIG.modeVariableId, modeIndex(name));
      }
    },

    getMode() {
      return this._mode;
    },

    glitch(strength = 1.0, frames = 30) {
      strength = Math.max(0, Number(strength) || 0);
      frames = Math.max(1, Number(frames) || 1);
      this._glitchBurst = Math.max(this._glitchBurst, strength);
      this._glitchDecay = strength / frames;
    },

    setIntensity(pct) {
      this._intensity = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
    },

    getBattery() {
      return this._battery;
    },

    // ---- per-frame update (called once per frame by the scene hook) ------
    tick() {
      this._ensureInit();

      // Sync mode from variable if that mode of control is in use.
      if (CONFIG.modeVariableId > 0 && $gameVariables) {
        const idx = $gameVariables.value(CONFIG.modeVariableId) | 0;
        const name = MODE_NAMES[idx] || CONFIG.defaultMode;
        if (name !== this._mode) this.setMode(name);
      }

      const active = this.isActive();
      this._time += 1 / 60;

      if (!active) {
        // Let glitch fade so a re-enable doesn't flash a stale burst.
        this._glitchBurst = Math.max(0, this._glitchBurst - (this._glitchDecay || 0.05));
        return;
      }

      // Recording counters
      this._recFrames++;

      // Battery drain
      if (CONFIG.batteryDrainMinutes > 0) {
        const perFrame = 1 / (CONFIG.batteryDrainMinutes * 60 * 60);
        this._battery = Math.max(0, this._battery - perFrame);
        if (this._battery <= 0 && CONFIG.lowBatteryDisables) {
          this.disable();
        }
      }

      // Ease current effect values toward the target mode.
      this._easeToTarget(0.08);

      // Ambient glitches
      if (CONFIG.enableGlitch && CONFIG.ambientGlitchRate > 0) {
        if (Math.random() < CONFIG.ambientGlitchRate * 0.05) {
          const s = 0.4 + Math.random() * 0.8;
          const f = 10 + Math.floor(Math.random() * 30);
          this.glitch(s, f);
        }
      }

      // Decay the current glitch burst.
      if (this._glitchBurst > 0) {
        this._glitchBurst = Math.max(0, this._glitchBurst - (this._glitchDecay || 0.05));
      }

      // Handheld jolts (occasional stronger kicks on top of constant sway).
      if (CONFIG.enableShake) {
        if (Math.random() < 0.02) {
          this._joltX = (Math.random() - 0.5) * 0.03;
          this._joltY = (Math.random() - 0.5) * 0.03;
        }
        this._joltX *= 0.85;
        this._joltY *= 0.85;
      } else {
        this._joltX = this._joltY = 0;
      }
    },

    _easeToTarget(k) {
      const c = this._cur, t = this._target;
      const lerp = (a, b) => a + (b - a) * k;
      c.aberration = lerp(c.aberration, t.aberration);
      c.scanline = lerp(c.scanline, t.scanline);
      c.scanCount = lerp(c.scanCount, t.scanCount);
      c.grain = lerp(c.grain, t.grain);
      c.vignette = lerp(c.vignette, t.vignette);
      c.static = lerp(c.static, t.static);
      c.tracking = lerp(c.tracking, t.tracking);
      c.sat = lerp(c.sat, t.sat);
      c.bright = lerp(c.bright, t.bright);
      for (let i = 0; i < 3; i++) c.tint[i] = lerp(c.tint[i], t.tint[i]);
    },

    // ---- write the current state into a filter's uniforms ----------------
    applyUniforms(u) {
      this._ensureInit();
      const c = this._cur;
      const I = this._intensity;

      u.uTime = this._time;
      u.uResolution[0] = Graphics.width;
      u.uResolution[1] = Graphics.height;

      // Distortion terms scale with master intensity; color grade does not.
      u.uAberration = c.aberration * I;
      u.uScanline = c.scanline * I;
      u.uScanCount = c.scanCount;
      u.uGrain = c.grain * I;
      u.uVignette = Math.min(1, c.vignette * I);
      u.uStatic = c.static * I;
      u.uTracking = c.tracking * I;
      u.uGlitch = this._glitchBurst * (0.5 + 0.5 * I);
      u.uTint[0] = c.tint[0];
      u.uTint[1] = c.tint[1];
      u.uTint[2] = c.tint[2];
      u.uSat = c.sat;
      u.uBright = c.bright;

      // Handheld sway (smooth sines) + jolts.
      if (CONFIG.enableShake) {
        const t = this._time;
        const sway = 0.0025 * I;
        const sx = sway * (Math.sin(t * 1.3) + 0.5 * Math.sin(t * 2.7));
        const sy = sway * (Math.cos(t * 1.1) + 0.5 * Math.sin(t * 3.1));
        u.uShake[0] = sx + this._joltX * I;
        u.uShake[1] = sy + this._joltY * I;
        u.uZoom = 1.06;
      } else {
        u.uShake[0] = 0;
        u.uShake[1] = 0;
        u.uZoom = 1.02;
      }
    },

    // ---- HUD data helpers ------------------------------------------------
    recTimecode() {
      const total = Math.floor(this._recFrames / 60);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      const pad = (n) => String(n).padStart(2, "0");
      return `${h}:${pad(m)}:${pad(s)}`;
    },

    wallClock() {
      const base = this._parseBaseDate();
      const d = new Date(base.getTime() + (this._recFrames / 60) * 1000);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
             `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },

    _parseBaseDate() {
      const m = String(CONFIG.dateStampBase).match(
        /(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})/
      );
      if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      }
      return new Date(2024, 9, 31, 23, 57, 0);
    },

    // ---- save / load persistence ----------------------------------------
    serialize() {
      return {
        active: this._internalActive,
        mode: this._mode,
        time: this._time,
        recFrames: this._recFrames,
        battery: this._battery,
        intensity: this._intensity,
      };
    },

    deserialize(data) {
      if (!data) return;
      this._internalActive = !!data.active;
      this._mode = MODE_PRESETS[data.mode] ? data.mode : CONFIG.defaultMode;
      this._time = data.time || 0;
      this._recFrames = data.recFrames || 0;
      this._battery = data.battery == null ? 1.0 : data.battery;
      this._intensity = data.intensity == null ? CONFIG.masterIntensity : data.intensity;
      this._cur = null;
      this._ensureInit();
      this._target = Object.assign({}, MODE_PRESETS[this._mode]);
      this._cur = Object.assign({}, this._target);
    },
  };

  // Expose globally for script calls.
  window.FF = FF;
  window.FoundFootage = FF;

  //---------------------------------------------------------------------------
  // Plugin commands
  //---------------------------------------------------------------------------
  PluginManager.registerCommand(PLUGIN_NAME, "enable", () => FF.enable());
  PluginManager.registerCommand(PLUGIN_NAME, "disable", () => FF.disable());
  PluginManager.registerCommand(PLUGIN_NAME, "setMode", (args) => FF.setMode(args.mode));
  PluginManager.registerCommand(PLUGIN_NAME, "glitchBurst", (args) =>
    FF.glitch(Number(args.strength), Number(args.frames))
  );
  PluginManager.registerCommand(PLUGIN_NAME, "setIntensity", (args) =>
    FF.setIntensity(Number(args.value))
  );

  //---------------------------------------------------------------------------
  // Save/load hooks
  //---------------------------------------------------------------------------
  const _DataManager_makeSaveContents = DataManager.makeSaveContents;
  DataManager.makeSaveContents = function () {
    const contents = _DataManager_makeSaveContents.call(this);
    contents.foundFootage = FF.serialize();
    return contents;
  };

  const _DataManager_extractSaveContents = DataManager.extractSaveContents;
  DataManager.extractSaveContents = function (contents) {
    _DataManager_extractSaveContents.call(this, contents);
    FF.deserialize(contents.foundFootage);
  };

  //---------------------------------------------------------------------------
  // HUD sprite
  //---------------------------------------------------------------------------
  class Sprite_FoundFootageHud extends Sprite {
    constructor() {
      super(new Bitmap(Graphics.width, Graphics.height));
      this._lastKey = "";
      this._blinkOn = true;
      this._blinkTimer = 0;
    }

    update() {
      super.update();
      this._blinkTimer++;
      if (this._blinkTimer >= 30) { // ~0.5s
        this._blinkTimer = 0;
        this._blinkOn = !this._blinkOn;
      }
      // Only repaint when something visibly changes (cheap uploads).
      const key = [
        FF.recTimecode(),
        this._blinkOn ? 1 : 0,
        Math.round(FF.getBattery() * 20),
        FF.getMode(),
      ].join("|");
      if (key !== this._lastKey) {
        this._lastKey = key;
        this._redraw();
      }
    }

    _redraw() {
      const b = this.bitmap;
      const W = b.width, H = b.height;
      b.clear();
      b.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
      b.outlineColor = "rgba(0,0,0,0.85)";
      b.outlineWidth = 4;

      // --- Mode label (top-left) ---
      b.fontSize = 20;
      b.textColor = "#e8e8e8";
      const modeLabel = FF.getMode() === "NIGHTVISION" ? "NIGHT SHOT" : FF.getMode();
      b.drawText(modeLabel, 24, 20, 300, 28, "left");

      // --- REC (top-right) ---
      const rx = W - 190;
      if (this._blinkOn) {
        b.drawCircle(rx, 34, 9, "#ff2a2a");
      }
      b.fontSize = 24;
      b.textColor = "#ffffff";
      b.drawText(CONFIG.recLabel, rx + 18, 20, 120, 28, "left");

      // Recording timecode under REC
      b.fontSize = 20;
      b.textColor = "#e0e0e0";
      b.drawText(FF.recTimecode(), rx + 18, 48, 140, 26, "left");

      // --- Wall clock (bottom-left) ---
      b.fontSize = 22;
      b.textColor = "#e8e8e8";
      b.drawText(FF.wallClock(), 24, H - 44, 360, 28, "left");

      // --- Battery (bottom-right) ---
      this._drawBattery(b, W - 130, H - 42, 96, 26, FF.getBattery());
    }

    _drawBattery(b, x, y, w, h, pct) {
      // Outer shell (2px hollow border via fill + clear).
      b.fillRect(x, y, w, h, "#e8e8e8");
      b.clearRect(x + 2, y + 2, w - 4, h - 4);
      // Terminal nub.
      b.fillRect(x + w, y + h / 2 - 5, 5, 10, "#e8e8e8");
      // Fill level.
      const inner = (w - 8) * Math.max(0, Math.min(1, pct));
      let color = "#4caf50";
      if (pct < 0.2) {
        color = this._blinkOn ? "#ff3b3b" : "rgba(255,59,59,0.25)"; // flash when low
      } else if (pct < 0.4) {
        color = "#ffc107";
      }
      if (inner > 0) b.fillRect(x + 4, y + 4, inner, h - 8, color);
    }
  }

  //---------------------------------------------------------------------------
  // Scene integration: apply the filter + HUD to whatever scene is active.
  //---------------------------------------------------------------------------
  const _Scene_Base_update = Scene_Base.prototype.update;
  Scene_Base.prototype.update = function () {
    _Scene_Base_update.call(this);
    updateFoundFootage(this);
  };

  function updateFoundFootage(scene) {
    // Advance global state once per frame.
    FF.tick();

    const active = FF.isActive();

    if (active) {
      // Ensure shader filter.
      if (!scene._ffFilter) {
        try {
          const uniforms = makeUniforms();
          const filter = new PIXI.Filter(undefined, FRAG_SRC, uniforms);
          filter.padding = 0;
          scene._ffFilter = filter;
          const existing = scene.filters ? scene.filters.slice() : [];
          existing.push(filter);
          scene.filters = existing;
        } catch (e) {
          console.error("[FoundFootage] Failed to create shader filter:", e);
          scene._ffFilter = null;
        }
      }
      if (scene._ffFilter) {
        FF.applyUniforms(scene._ffFilter.uniforms);
      }

      // Ensure HUD (drawn last => on top of scene contents).
      if (CONFIG.enableRecUI) {
        if (!scene._ffHud) {
          scene._ffHud = new Sprite_FoundFootageHud();
          scene.addChild(scene._ffHud);
        } else if (scene._ffHud.parent !== scene) {
          scene.addChild(scene._ffHud);
        } else {
          // Keep HUD on top even if the scene added children after us.
          const idx = scene.getChildIndex(scene._ffHud);
          if (idx !== scene.children.length - 1) {
            scene.setChildIndex(scene._ffHud, scene.children.length - 1);
          }
        }
      }
    } else {
      // Tear down when inactive.
      if (scene._ffFilter && scene.filters) {
        scene.filters = scene.filters.filter((f) => f !== scene._ffFilter);
        if (scene.filters.length === 0) scene.filters = null;
        scene._ffFilter = null;
      }
      if (scene._ffHud) {
        if (scene._ffHud.parent) scene._ffHud.parent.removeChild(scene._ffHud);
        scene._ffHud.destroy({ children: true });
        scene._ffHud = null;
      }
    }
  }
})();
