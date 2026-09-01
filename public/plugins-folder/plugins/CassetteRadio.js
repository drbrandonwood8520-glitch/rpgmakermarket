//=============================================================================
// CassetteRadio.js  (v0.1.0)
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v0.1.0] Internet-radio "cassette deck" with reactive VU meters and
 * live now-playing titles. Desktop (NW.js) only.
 * @author (you)
 * @url
 *
 * @help
 * ============================================================================
 * CassetteRadio  —  in-game internet radio, styled as a retro cassette deck
 * ============================================================================
 *
 * DESKTOP ONLY. This plugin uses NW.js / Node.js features (a local stream
 * proxy) to enable a real audio-reactive visualizer and live song titles.
 * It will NOT work in web or mobile deployment.
 *
 * SETUP
 *   1. Place this file in js/plugins/ and enable it in the Plugin Manager.
 *   2. Fill the "Stations" parameter with name + stream URL for each preset.
 *      Direct MP3/AAC Icecast/Shoutcast stream URLs work best (not .pls/.m3u
 *      playlist files, and not HLS .m3u8). A few SomaFM examples are included
 *      by default so you can test immediately.
 *   3. Open the deck via the menu (if "Add To Menu" is on) or the
 *      "Open Radio" plugin command.
 *
 * CONTROLS (in the deck)
 *   Left / Right ....... previous / next preset (tune)
 *   OK / Enter ......... play / stop
 *   PageUp / PageDown .. volume down / up
 *   Cancel ............. close the deck (radio keeps playing)
 *
 * LICENSING NOTE
 *   This plugin is a player only. You are responsible for ensuring you have
 *   the right to stream any station you bundle in a commercial release.
 *   Station directories are not a grant of rights.
 *
 * ---------------------------------------------------------------------------
 * @param stations
 * @text Stations (presets)
 * @type struct<Station>[]
 * @desc The preset stations the player tunes through.
 * @default ["{\"name\":\"Groove Salad\",\"url\":\"https://ice1.somafm.com/groovesalad-128-mp3\",\"genre\":\"Ambient/Downtempo\"}","{\"name\":\"Drone Zone\",\"url\":\"https://ice1.somafm.com/dronezone-128-mp3\",\"genre\":\"Ambient\"}","{\"name\":\"Indie Pop Rocks\",\"url\":\"https://ice1.somafm.com/indiepop-128-mp3\",\"genre\":\"Indie\"}"]
 *
 * @param defaultVolume
 * @text Default Volume
 * @type number
 * @min 0
 * @max 100
 * @default 70
 *
 * @param bgmBehavior
 * @text Radio vs Game BGM
 * @type select
 * @option Replace game BGM while radio is on (recommended)
 * @value replace
 * @option Play over game BGM (layer)
 * @value layer
 * @option Radio yields: pause while BGM plays
 * @value yield
 * @default replace
 * @desc How the radio interacts with the game's own BGM. MEs always pause/resume the radio.
 *
 * @param rememberStation
 * @text Remember Last Station
 * @type boolean
 * @default true
 * @desc Persist the selected preset and volume in the game config.
 *
 * @param visualizer
 * @text Visualizer Style
 * @type select
 * @option VU meters (twin analog needles)
 * @value vu
 * @option Spectrum bars
 * @value spectrum
 * @default vu
 *
 * @param enableBrowsing
 * @text Enable Directory Browsing (stub)
 * @type boolean
 * @default false
 * @desc Reserved for a future radio-browser.info search screen. Not active in v0.1.
 *
 * @param addToMenu
 * @text Add To Main Menu
 * @type boolean
 * @default true
 *
 * @param menuCommandName
 * @text Menu Command Name
 * @type string
 * @default Radio
 *
 * @param proxyPort
 * @text Local Proxy Port
 * @type number
 * @min 0
 * @max 65535
 * @default 0
 * @desc 0 = pick a free port automatically. Advanced.
 *
 * ---------------------------------------------------------------------------
 * @command OpenRadio
 * @text Open Radio Deck
 * @desc Opens the cassette deck scene.
 *
 * @command PlayRadio
 * @text Play Radio
 * @arg preset
 * @text Preset Index
 * @type number
 * @min 0
 * @default 0
 * @desc Start playing the preset at this index (0-based).
 *
 * @command StopRadio
 * @text Stop Radio
 *
 * @command ToggleRadio
 * @text Toggle Radio
 *
 * @command NextStation
 * @text Next Station
 *
 * @command PrevStation
 * @text Previous Station
 *
 * @command SetVolume
 * @text Set Volume
 * @arg volume
 * @text Volume (0-100)
 * @type number
 * @min 0
 * @max 100
 * @default 70
 */
/*~struct~Station:
 * @param name
 * @text Station Name
 * @type string
 * @param url
 * @text Stream URL
 * @type string
 * @desc Direct MP3/AAC stream URL (Icecast/Shoutcast). Not a .pls/.m3u playlist or HLS.
 * @param genre
 * @text Genre / Label
 * @type string
 */

(() => {
  "use strict";

  const PLUGIN_NAME = "CassetteRadio";
  const P = PluginManager.parameters(PLUGIN_NAME);

  //---------------------------------------------------------------------------
  // Parameter parsing
  //---------------------------------------------------------------------------
  function parseStations(raw) {
    let out = [];
    try {
      const arr = JSON.parse(raw || "[]");
      out = arr.map((s) => {
        const o = JSON.parse(s);
        return { name: o.name || "Unknown", url: o.url || "", genre: o.genre || "" };
      }).filter((s) => s.url);
    } catch (e) {
      console.error(`${PLUGIN_NAME}: failed to parse stations`, e);
    }
    return out;
  }

  const CR = {
    stations: parseStations(P.stations),
    defaultVolume: Number(P.defaultVolume || 70) / 100,
    bgmBehavior: String(P.bgmBehavior || "replace"),
    rememberStation: P.rememberStation === "true",
    visualizer: String(P.visualizer || "vu"),
    enableBrowsing: P.enableBrowsing === "true",
    addToMenu: P.addToMenu === "true",
    menuCommandName: String(P.menuCommandName || "Radio"),
    proxyPort: Number(P.proxyPort || 0),
  };

  const isNwjs = (typeof require === "function" && typeof process !== "undefined" && !!process.versions && !!process.versions["node-webkit"]) ||
                 (typeof require === "function" && typeof process !== "undefined" && !!process.versions && !!process.versions.nw);

  //===========================================================================
  // RadioProxy — local Node HTTP server that fetches the remote stream,
  // de-interleaves ICY metadata (now-playing), strips it, and re-serves clean
  // audio on 127.0.0.1 with permissive CORS so the Web Audio analyser works.
  //===========================================================================
  class RadioProxy {
    constructor() {
      this.server = null;
      this.port = 0;
      this.onMeta = null;      // callback(titleString)
      this._active = null;     // current upstream request, so we can abort on retune
    }

    start(port) {
      return new Promise((resolve, reject) => {
        if (!isNwjs) { reject(new Error("Not running under NW.js")); return; }
        const http = require("http");
        this.server = http.createServer((req, res) => this._handle(req, res));
        this.server.on("error", reject);
        this.server.listen(port || 0, "127.0.0.1", () => {
          this.port = this.server.address().port;
          resolve(this.port);
        });
      });
    }

    stop() {
      try { if (this._active) this._active.destroy(); } catch (e) {}
      try { if (this.server) this.server.close(); } catch (e) {}
      this.server = null;
    }

    _handle(req, res) {
      const u = new URL(req.url, "http://127.0.0.1");
      const target = u.searchParams.get("u");
      if (!target) { res.writeHead(400); res.end("no url"); return; }
      // Abort any previously running upstream (retune).
      try { if (this._active) this._active.destroy(); } catch (e) {}
      this._proxy(decodeURIComponent(target), res, 0);
    }

    _proxy(target, res, depth) {
      if (depth > 5) { try { res.writeHead(508); } catch (e) {} res.end(); return; }
      let lib, options;
      try {
        const isHttps = target.toLowerCase().startsWith("https");
        lib = require(isHttps ? "https" : "http");
        const parsed = new URL(target);
        options = {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          headers: {
            "Icy-MetaData": "1",
            "User-Agent": "CassetteRadio/0.1",
            "Accept": "*/*",
          },
        };
      } catch (e) { try { res.writeHead(400); } catch (er) {} res.end(); return; }

      const up = lib.get(options, (upstream) => {
        const status = upstream.statusCode;
        // Follow redirects
        if (status >= 300 && status < 400 && upstream.headers.location) {
          const next = new URL(upstream.headers.location, target).href;
          upstream.destroy();
          this._proxy(next, res, depth + 1);
          return;
        }
        const metaint = parseInt(upstream.headers["icy-metaint"], 10) || 0;
        const ctype = upstream.headers["content-type"] || "audio/mpeg";
        try {
          res.writeHead(200, {
            "Content-Type": ctype,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "close",
          });
        } catch (e) { upstream.destroy(); return; }

        if (!metaint) { upstream.pipe(res); return; }

        // De-interleave ICY metadata from the audio byte stream.
        let bytesUntilMeta = metaint;
        let readingMeta = false;
        let metaRemaining = 0;
        let metaBuf = Buffer.alloc(0);

        upstream.on("data", (chunk) => {
          let offset = 0;
          while (offset < chunk.length) {
            if (readingMeta) {
              const take = Math.min(metaRemaining, chunk.length - offset);
              metaBuf = Buffer.concat([metaBuf, chunk.slice(offset, offset + take)]);
              offset += take;
              metaRemaining -= take;
              if (metaRemaining === 0) {
                this._parseMeta(metaBuf);
                metaBuf = Buffer.alloc(0);
                readingMeta = false;
                bytesUntilMeta = metaint;
              }
            } else if (bytesUntilMeta > 0) {
              const take = Math.min(bytesUntilMeta, chunk.length - offset);
              try { res.write(chunk.slice(offset, offset + take)); } catch (e) {}
              offset += take;
              bytesUntilMeta -= take;
            } else {
              // length byte: block size = byte * 16
              const metaLen = chunk[offset] * 16;
              offset += 1;
              if (metaLen === 0) {
                bytesUntilMeta = metaint;
              } else {
                readingMeta = true;
                metaRemaining = metaLen;
              }
            }
          }
        });
        upstream.on("end", () => { try { res.end(); } catch (e) {} });
        upstream.on("error", () => { try { res.end(); } catch (e) {} });
      });

      up.on("error", () => { try { res.writeHead(502); } catch (e) {} try { res.end(); } catch (e) {} });
      res.on("close", () => { try { up.destroy(); } catch (e) {} });
      this._active = up;
    }

    _parseMeta(buf) {
      try {
        const s = buf.toString("utf8");
        const m = s.match(/StreamTitle='(.*?)';/);
        if (m && this.onMeta) this.onMeta(m[1].trim());
      } catch (e) {}
    }
  }

  //===========================================================================
  // RadioEngine — owns a persistent <audio> element + Web Audio graph.
  // Lives outside the scene lifecycle, so playback survives map/menu/battle.
  //===========================================================================
  class RadioEngine {
    constructor() {
      this.audio = null;
      this.ctx = null;
      this.gain = null;
      this.analyserL = null;
      this.analyserR = null;
      this.proxy = new RadioProxy();
      this.proxyPort = 0;
      this.ready = false;
      this.supported = isNwjs;
      this.playing = false;
      this.index = -1;
      this.stationName = "";
      this.nowPlaying = "";
      this.volume = CR.defaultVolume;
      this._duckedForMe = false;
      this._lastError = "";
    }

    async init() {
      if (this.ready || !this.supported) return this.ready;
      try {
        this.audio = document.createElement("audio");
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "none";
        document.body.appendChild(this.audio);

        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        const src = this.ctx.createMediaElementSource(this.audio);
        this.gain = this.ctx.createGain();
        this.gain.gain.value = this.volume;

        const splitter = this.ctx.createChannelSplitter(2);
        this.analyserL = this.ctx.createAnalyser();
        this.analyserR = this.ctx.createAnalyser();
        this.analyserL.fftSize = 256;
        this.analyserR.fftSize = 256;

        src.connect(this.gain);
        this.gain.connect(this.ctx.destination);
        this.gain.connect(splitter);
        splitter.connect(this.analyserL, 0);
        splitter.connect(this.analyserR, 1);

        this.proxy.onMeta = (title) => { this.nowPlaying = title; };
        this.proxyPort = await this.proxy.start(CR.proxyPort);
        this.ready = true;
      } catch (e) {
        console.error(`${PLUGIN_NAME}: engine init failed`, e);
        this._lastError = String(e && e.message || e);
        this.ready = false;
      }
      return this.ready;
    }

    _proxied(url) {
      return `http://127.0.0.1:${this.proxyPort}/stream?u=${encodeURIComponent(url)}`;
    }

    async play(index) {
      if (!this.supported) { this._lastError = "Radio requires desktop (NW.js)."; return; }
      if (!this.ready) { await this.init(); }
      if (!this.ready) return;
      const station = CR.stations[index];
      if (!station) return;
      this.index = index;
      this.stationName = station.name;
      this.nowPlaying = "";
      if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch (e) {} }
      this.audio.src = this._proxied(station.url);
      const pr = this.audio.play();
      if (pr && pr.catch) pr.catch((err) => { this._lastError = String(err && err.message || err); });
      this.playing = true;
      RadioBgm.apply();
    }

    stop() {
      if (this.audio) {
        this.audio.pause();
        this.audio.removeAttribute("src");
        try { this.audio.load(); } catch (e) {}
      }
      this.playing = false;
      this._duckedForMe = false;
      this.nowPlaying = "";
      RadioBgm.restore();
    }

    toggle() {
      if (this.playing) this.stop();
      else this.play(this.index >= 0 ? this.index : 0);
    }

    next() { if (CR.stations.length) this.play(((this.index < 0 ? 0 : this.index) + 1) % CR.stations.length); }
    prev() { if (CR.stations.length) this.play(((this.index < 0 ? 0 : this.index) - 1 + CR.stations.length) % CR.stations.length); }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.gain) this.gain.gain.value = this.volume;
    }

    // Auto-pause/resume the radio around Movie Effects (ME).
    updateDucking() {
      if (!this.playing || CR.bgmBehavior === "layer") { /* MEs still duck below */ }
      try {
        const me = AudioManager._meBuffer;
        const mePlaying = !!(me && me.isPlaying && me.isPlaying());
        if (mePlaying && this.playing && !this._duckedForMe) {
          this.audio.pause();
          this._duckedForMe = true;
        } else if (!mePlaying && this._duckedForMe) {
          const pr = this.audio.play();
          if (pr && pr.catch) pr.catch(() => {});
          this._duckedForMe = false;
        }
      } catch (e) {}
    }

    // Time-domain RMS per channel -> VU deflection 0..1
    levels() {
      const rms = (an) => {
        if (!an) return 0;
        const buf = new Uint8Array(an.fftSize);
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
        return Math.min(1, Math.sqrt(sum / buf.length) * 2.2);
      };
      return { l: rms(this.analyserL), r: rms(this.analyserR) };
    }

    spectrum() {
      if (!this.analyserL) return new Uint8Array(0);
      const buf = new Uint8Array(this.analyserL.frequencyBinCount);
      this.analyserL.getByteFrequencyData(buf);
      return buf;
    }
  }

  //===========================================================================
  // RadioBgm — how the radio interacts with the game's own BGM.
  //===========================================================================
  const RadioBgm = {
    suppress: false,
    saved: null,
    pending: null,

    apply() {
      if (CR.bgmBehavior === "replace") {
        try {
          this.saved = AudioManager.saveBgm();
        } catch (e) { this.saved = null; }
        AudioManager.stopBgm();
        this.suppress = true;
      }
      // "layer": do nothing. "yield" is handled by the update loop.
    },

    restore() {
      if (CR.bgmBehavior === "replace") {
        this.suppress = false;
        const bgm = this.pending || this.saved;
        this.pending = null;
        if (bgm && bgm.name) {
          try { AudioManager.replayBgm(bgm); } catch (e) {}
        }
      }
    },
  };

  const _AudioManager_playBgm = AudioManager.playBgm;
  AudioManager.playBgm = function (bgm, pos) {
    if (RadioBgm.suppress && CR.bgmBehavior === "replace") {
      RadioBgm.pending = bgm; // remember what the map wanted; don't actually play it
      return;
    }
    _AudioManager_playBgm.call(this, bgm, pos);
  };

  //===========================================================================
  // Singleton engine + per-frame update hook
  //===========================================================================
  const Radio = new RadioEngine();
  window.$cassetteRadio = Radio; // exposed for advanced/eventing use

  const _SceneManager_updateMain = SceneManager.updateMain;
  SceneManager.updateMain = function () {
    _SceneManager_updateMain.call(this);
    Radio.updateDucking();
    // "yield" mode: pause radio whenever real BGM is audible.
    if (CR.bgmBehavior === "yield" && Radio.playing) {
      try {
        const bgmOn = !!(AudioManager._bgmBuffer && AudioManager._bgmBuffer.isPlaying && AudioManager._bgmBuffer.isPlaying());
        if (bgmOn && !Radio._duckedForMe && !Radio.audio.paused) Radio.audio.pause();
        else if (!bgmOn && !Radio._duckedForMe && Radio.audio.paused) { const p = Radio.audio.play(); if (p && p.catch) p.catch(() => {}); }
      } catch (e) {}
    }
  };

  //===========================================================================
  // Config persistence (volume + last station)
  //===========================================================================
  Object.defineProperty(ConfigManager, "radioVolume", {
    get() { return Math.round(Radio.volume * 100); },
    set(v) { Radio.setVolume(Number(v) / 100); },
    configurable: true,
  });

  const _ConfigManager_makeData = ConfigManager.makeData;
  ConfigManager.makeData = function () {
    const c = _ConfigManager_makeData.call(this);
    c.radioVolume = this.radioVolume;
    if (CR.rememberStation) c.radioLastIndex = Radio.index;
    return c;
  };

  const _ConfigManager_applyData = ConfigManager.applyData;
  ConfigManager.applyData = function (config) {
    _ConfigManager_applyData.call(this, config);
    const v = config.radioVolume;
    this.radioVolume = (v !== undefined) ? v : Math.round(CR.defaultVolume * 100);
    if (CR.rememberStation && config.radioLastIndex !== undefined) {
      Radio.index = config.radioLastIndex;
    }
  };

  // Radio volume slider in Options.
  const _Window_Options_addVolumeOptions = Window_Options.prototype.addVolumeOptions;
  Window_Options.prototype.addVolumeOptions = function () {
    _Window_Options_addVolumeOptions.call(this);
    this.addCommand("Radio Volume", "radioVolume");
  };

  const _Window_Options_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;
  Window_Options.prototype.isVolumeSymbol = function (symbol) {
    return symbol === "radioVolume" || _Window_Options_isVolumeSymbol.call(this, symbol);
  };

  //===========================================================================
  // Plugin commands
  //===========================================================================
  PluginManager.registerCommand(PLUGIN_NAME, "OpenRadio", () => {
    SceneManager.push(Scene_Radio);
  });
  PluginManager.registerCommand(PLUGIN_NAME, "PlayRadio", (args) => {
    Radio.play(Number(args.preset || 0));
  });
  PluginManager.registerCommand(PLUGIN_NAME, "StopRadio", () => Radio.stop());
  PluginManager.registerCommand(PLUGIN_NAME, "ToggleRadio", () => Radio.toggle());
  PluginManager.registerCommand(PLUGIN_NAME, "NextStation", () => Radio.next());
  PluginManager.registerCommand(PLUGIN_NAME, "PrevStation", () => Radio.prev());
  PluginManager.registerCommand(PLUGIN_NAME, "SetVolume", (args) => {
    Radio.setVolume(Number(args.volume || 0) / 100);
  });

  //===========================================================================
  // Menu integration
  //===========================================================================
  if (CR.addToMenu) {
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function () {
      _Window_MenuCommand_addOriginalCommands.call(this);
      this.addCommand(CR.menuCommandName, "cassetteRadio", true);
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function () {
      _Scene_Menu_createCommandWindow.call(this);
      this._commandWindow.setHandler("cassetteRadio", () => SceneManager.push(Scene_Radio));
    };
  }

  //===========================================================================
  // Scene_Radio — the cassette deck. All visuals generated at runtime (no
  // image assets required).
  //===========================================================================
  const PALETTE = {
    shell: "#2b2b30",
    shellHi: "#3a3a42",
    face: "#1a1a1e",
    tape: "#0d0d10",
    reel: "#c9a24b",
    reelDark: "#7c6224",
    lcd: "#0b1a12",
    lcdText: "#7dffb0",
    needle: "#ff5a3c",
    tick: "#c8c8c8",
    label: "#e8e4d8",
  };

  class Scene_Radio extends Scene_MenuBase {
    create() {
      super.create();
      this._reelAngle = 0;
      this._vuL = 0;
      this._vuR = 0;
      this._scroll = 0;
      this.createDeck();
      // Auto-init the engine when the deck opens (this is a user gesture).
      Radio.init();
    }

    createDeck() {
      const w = Graphics.width;
      const h = Graphics.height;
      // Static shell/face drawn once.
      this._deck = new Sprite(new Bitmap(w, h));
      this.addChild(this._deck);
      this.drawShell(this._deck.bitmap);

      const cx = w / 2;
      const deckTop = h * 0.22;
      const deckH = h * 0.56;
      const deckBottom = deckTop + deckH;

      // Reels
      this._reelBitmap = this.makeReelBitmap(Math.floor(deckH * 0.42));
      this._reelL = new Sprite(this._reelBitmap);
      this._reelR = new Sprite(this._reelBitmap);
      for (const r of [this._reelL, this._reelR]) { r.anchor.x = 0.5; r.anchor.y = 0.5; this.addChild(r); }
      const reelY = deckTop + deckH * 0.42;
      this._reelL.x = cx - deckH * 0.42; this._reelL.y = reelY;
      this._reelR.x = cx + deckH * 0.42; this._reelR.y = reelY;

      // VU / spectrum canvas (redrawn each frame)
      this._meter = new Sprite(new Bitmap(Math.floor(w * 0.64), Math.floor(h * 0.16)));
      this._meter.x = Math.floor(cx - this._meter.bitmap.width / 2);
      this._meter.y = Math.floor(deckBottom - h * 0.20);
      this.addChild(this._meter);

      // LCD text (station + now playing)
      this._lcd = new Sprite(new Bitmap(Math.floor(w * 0.72), Math.floor(h * 0.11)));
      this._lcd.x = Math.floor(cx - this._lcd.bitmap.width / 2);
      this._lcd.y = Math.floor(deckTop - h * 0.10);
      this.addChild(this._lcd);

      // Hint line
      this._hint = new Sprite(new Bitmap(w, 40));
      this._hint.y = h - 44;
      this.addChild(this._hint);
      const hb = this._hint.bitmap;
      hb.fontSize = 18;
      hb.textColor = "#8a8a92";
      hb.drawText("\u2190/\u2192 tune    OK play/stop    PgUp/PgDn volume    Cancel close",
        0, 0, w, 40, "center");
    }

    drawShell(bmp) {
      const w = bmp.width, h = bmp.height;
      bmp.fillRect(0, 0, w, h, "#111114");
      // shell
      const mx = w * 0.08, my = h * 0.10;
      bmp.gradientFillRect(mx, my, w - mx * 2, h - my * 2, PALETTE.shell, PALETTE.shellHi, true);
      // face plate
      const fx = w * 0.12, fy = h * 0.20, fw = w - fx * 2, fh = h * 0.60;
      bmp.fillRect(fx, fy, fw, fh, PALETTE.face);
      // tape window
      const tx = w * 0.20, ty = h * 0.30, tw = w - tx * 2, th = h * 0.30;
      bmp.fillRect(tx, ty, tw, th, PALETTE.tape);
    }

    makeReelBitmap(size) {
      const b = new Bitmap(size, size);
      const c = size / 2;
      // outer ring
      b.drawCircle(c, c, c - 2, PALETTE.reelDark);
      b.drawCircle(c, c, c - 6, PALETTE.reel);
      // hub
      b.drawCircle(c, c, c * 0.28, PALETTE.reelDark);
      // spokes as radial notches
      const spokes = 6;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const x = c + Math.cos(a) * c * 0.55;
        const y = c + Math.sin(a) * c * 0.55;
        b.drawCircle(x, y, c * 0.10, PALETTE.reelDark);
      }
      return b;
    }

    update() {
      super.update();
      this.updateInput();
      this.updateReels();
      this.updateMeter();
      this.updateLcd();
    }

    updateInput() {
      if (Input.isRepeated("right") || TouchInput.isTriggered() && this.touchZone() === "right") { SoundManager.playCursor(); Radio.next(); }
      else if (Input.isRepeated("left") || (TouchInput.isTriggered() && this.touchZone() === "left")) { SoundManager.playCursor(); Radio.prev(); }
      else if (Input.isTriggered("ok") || (TouchInput.isTriggered() && this.touchZone() === "center")) { SoundManager.playOk(); Radio.toggle(); }
      else if (Input.isRepeated("pageup")) { Radio.setVolume(Radio.volume - 0.05); }
      else if (Input.isRepeated("pagedown")) { Radio.setVolume(Radio.volume + 0.05); }
      else if (Input.isTriggered("cancel") || TouchInput.isCancelled()) { SoundManager.playCancel(); this.popScene(); }
    }

    touchZone() {
      const x = TouchInput.x, third = Graphics.width / 3;
      if (x < third) return "left";
      if (x > third * 2) return "right";
      return "center";
    }

    updateReels() {
      const speed = Radio.playing && !Radio.audio.paused ? 0.08 : 0;
      this._reelAngle += speed;
      this._reelL.rotation = this._reelAngle;
      this._reelR.rotation = this._reelAngle;
    }

    updateMeter() {
      const b = this._meter.bitmap;
      b.clear();
      const w = b.width, h = b.height;
      if (CR.visualizer === "spectrum") {
        const data = Radio.playing ? Radio.spectrum() : new Uint8Array(0);
        const bars = 32;
        const bw = w / bars;
        for (let i = 0; i < bars; i++) {
          const idx = Math.floor((i / bars) * data.length);
          const v = data.length ? data[idx] / 255 : 0;
          const bh = Math.max(2, v * h);
          b.fillRect(i * bw + 1, h - bh, bw - 2, bh, PALETTE.lcdText);
        }
        return;
      }
      // VU meters (twin needles)
      const lv = Radio.playing ? Radio.levels() : { l: 0, r: 0 };
      this._vuL += (lv.l - this._vuL) * 0.25;  // attack/decay smoothing
      this._vuR += (lv.r - this._vuR) * 0.25;
      this.drawVu(b, 0, w / 2, this._vuL, "L");
      this.drawVu(b, w / 2, w / 2, this._vuR, "R");
    }

    drawVu(bmp, x0, w, level, label) {
      const h = bmp.height;
      const cx = x0 + w / 2;
      const cy = h * 0.95;
      const radius = h * 0.78;
      // arc backdrop
      bmp.fillRect(x0 + 4, 2, w - 8, h - 4, "#e9e3cf");
      // ticks
      const start = Math.PI * 0.80;
      const end = Math.PI * 0.20;
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = start + (end - start) * t;
        const x1 = cx + Math.cos(a) * radius;
        const y1 = cy - Math.sin(a) * radius;
        const x2 = cx + Math.cos(a) * (radius - 6);
        const y2 = cy - Math.sin(a) * (radius - 6);
        const col = t > 0.7 ? PALETTE.needle : "#555";
        this.drawLine(bmp, x1, y1, x2, y2, col, 2);
      }
      // needle
      const a = start + (end - start) * Math.max(0, Math.min(1, level));
      const nx = cx + Math.cos(a) * radius;
      const ny = cy - Math.sin(a) * radius;
      this.drawLine(bmp, cx, cy, nx, ny, PALETTE.needle, 2);
      bmp.drawCircle(cx, cy, 3, "#333");
      // label
      bmp.fontSize = 12;
      bmp.textColor = "#444";
      bmp.drawText(label, x0, h - 16, w, 14, "center");
    }

    drawLine(bmp, x1, y1, x2, y2, color, thickness) {
      // Bresenham-ish square-dab line (Bitmap has no native line).
      const ctx = bmp._context;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness || 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
      bmp._baseTexture.update();
    }

    updateLcd() {
      const b = this._lcd.bitmap;
      b.clear();
      const w = b.width, h = b.height;
      b.fillRect(0, 0, w, h, PALETTE.lcd);
      b.fillRect(2, 2, w - 4, h - 4, "#06110b");

      let name = Radio.stationName || (CR.stations[Radio.index] && CR.stations[Radio.index].name) || "-- no station --";
      if (!Radio.supported) name = "Radio requires desktop (NW.js)";

      b.fontSize = 22;
      b.textColor = PALETTE.lcdText;
      b.drawText(name, 12, 2, w - 24, h / 2, "left");

      // now playing scrolls if long
      const np = Radio.playing ? (Radio.nowPlaying || "\u266a  tuning\u2026") : "\u25a0  stopped";
      b.fontSize = 16;
      b.textColor = "#4fd88a";
      b.drawText(np, 12, h / 2, w - 24, h / 2 - 4, "left");

      // volume pips
      const pips = Math.round(Radio.volume * 10);
      for (let i = 0; i < 10; i++) {
        const on = i < pips;
        b.fillRect(w - 130 + i * 11, 8, 8, 10, on ? PALETTE.lcdText : "#123");
      }
    }
  }

  window.Scene_Radio = Scene_Radio;

})();
