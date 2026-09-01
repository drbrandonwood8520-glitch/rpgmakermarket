//=============================================================================
// MultiStream.js  —  Built-in multistreaming for RPG Maker MZ
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Encode the running game once and fan it out live to any number of RTMP/RTMPS endpoints via a bundled FFmpeg process. "OBS, built in."
 * @author You
 * @url https://example.com
 *
 * @help
 * MultiStream.js
 * ============================================================================
 * WHAT IT DOES
 *   Captures the game canvas + WebAudio, encodes it ONCE with FFmpeg, and
 *   pushes the same encoded stream to every endpoint you list (Twitch,
 *   YouTube, Kick, a private / local / international ingest, a self-hosted
 *   relay, etc.). Any target that speaks RTMP or RTMPS works.
 *
 * WHAT IT DOES NOT DO (read this before shipping)
 *   - It streams the GAME (playtest or deployed build), not the RPG Maker MZ
 *     editor window. The editor is a native app this plugin cannot reach.
 *   - It cannot avoid stream keys. Every platform needs its own key; you enter
 *     them once here, but there is no "auth on your behalf".
 *   - Local fan-out uploads one copy per endpoint. Upload cost = bitrate x
 *     number of enabled endpoints. If that hurts, point ONE endpoint at a
 *     relay/restreamer and let it fan out.
 *
 * REQUIREMENTS
 *   - A DESKTOP (NW.js) deployment or playtest. Browser builds have no Node
 *     and cannot spawn FFmpeg; use a WHIP/relay setup instead.
 *   - FFmpeg installed and reachable. Either put it on PATH, drop the binary
 *     next to the game, or set the "FFmpeg Path" parameter to its full path.
 *     FFmpeg must be built with libx264 + (for rtmps) TLS support.
 *
 * SETUP
 *   1. Fill in "Endpoints" in the Plugin Manager. Each = Name + Ingest URL +
 *      Stream Key. Examples:
 *        Twitch    URL: rtmp://live.twitch.tv/app        Key: live_xxx
 *        YouTube   URL: rtmp://a.rtmp.youtube.com/live2  Key: xxxx-xxxx
 *        Local     URL: rtmp://127.0.0.1:1935/live       Key: game
 *   2. Set bitrate / fps / FFmpeg path as needed.
 *   3. Start streaming via the plugin command "Start Streaming", or turn on
 *      "Auto Start" to begin on the first map.
 *
 * PLUGIN COMMANDS
 *   Start Streaming / Stop Streaming / Toggle Streaming
 *
 * NOTE
 *   This is a working skeleton, not a hardened product. Streaming is finicky
 *   (keyframe interval, bitrate ceilings per platform, TLS certs). Test with
 *   one endpoint first, watch the console (F12 in playtest) for FFmpeg output.
 * ============================================================================
 *
 * @param endpoints
 * @text Endpoints
 * @desc The streaming destinations to fan out to. Encoded once, sent to all enabled ones.
 * @type struct<Endpoint>[]
 * @default []
 *
 * @param videoBitrate
 * @text Video Bitrate (kbps)
 * @desc Target/max video bitrate per stream, in kbps. Twitch caps ~6000; check each platform.
 * @type number
 * @min 500
 * @default 4500
 *
 * @param audioBitrate
 * @text Audio Bitrate (kbps)
 * @type number
 * @min 32
 * @default 160
 *
 * @param fps
 * @text Frame Rate
 * @desc Capture frame rate. Keyframe interval is set to 2 seconds automatically.
 * @type number
 * @min 5
 * @max 60
 * @default 30
 *
 * @param preset
 * @text x264 Preset
 * @desc Faster = less CPU, larger files. veryfast is a good default for live.
 * @type select
 * @option ultrafast
 * @option superfast
 * @option veryfast
 * @option faster
 * @option fast
 * @option medium
 * @default veryfast
 *
 * @param ffmpegPath
 * @text FFmpeg Path
 * @desc Full path to the ffmpeg binary, or just "ffmpeg" if it is on PATH.
 * @type string
 * @default ffmpeg
 *
 * @param autoStart
 * @text Auto Start
 * @desc Begin streaming automatically when the first map loads.
 * @type boolean
 * @default false
 *
 * @param showLiveBadge
 * @text Show LIVE Badge
 * @desc Overlay a small red LIVE indicator while streaming.
 * @type boolean
 * @default true
 *
 * @param menuCommand
 * @text Show in Main Menu
 * @desc Add an entry to the game's main menu that opens the endpoint toggle screen.
 * @type boolean
 * @default true
 *
 * @param menuCommandName
 * @text Menu Entry Label
 * @desc Text for the main-menu entry (when the above is on).
 * @type string
 * @default Streaming
 *
 * @param hotkey
 * @text Open-Menu Hotkey
 * @desc Optional key that opens the toggle screen from the map. F8/F12 are avoided (reload / devtools).
 * @type select
 * @option none
 * @option F6
 * @option F7
 * @option F9
 * @option F10
 * @default none
 *
 * @command start
 * @text Start Streaming
 * @desc Begin capturing and pushing to all enabled endpoints.
 *
 * @command stop
 * @text Stop Streaming
 * @desc Stop the FFmpeg process and release capture.
 *
 * @command toggle
 * @text Toggle Streaming
 * @desc Start if stopped, stop if running.
 *
 * @command openMenu
 * @text Open Toggle Menu
 * @desc Open the in-game screen for toggling endpoints and starting/stopping the stream.
 */
/*~struct~Endpoint:
 * @param name
 * @text Platform Name
 * @desc A label for you (Twitch, YouTube, MyServer...). Not sent anywhere.
 * @type string
 * @default New Platform
 *
 * @param url
 * @text Ingest URL
 * @desc The RTMP/RTMPS ingest URL WITHOUT the stream key. e.g. rtmp://live.twitch.tv/app
 * @type string
 * @default
 *
 * @param key
 * @text Stream Key
 * @desc The stream key for this platform. Appended to the URL.
 * @type string
 * @default
 *
 * @param enabled
 * @text Enabled
 * @type boolean
 * @default true
 */

(() => {
    "use strict";

    const pluginName = decodeURIComponent(
        (document.currentScript.src.match(/([^/]+)\.js$/) || [, "MultiStream"])[1]
    );
    const raw = PluginManager.parameters(pluginName);

    const parseEndpoints = (json) => {
        try {
            return JSON.parse(json || "[]").map((e) => JSON.parse(e));
        } catch (err) {
            console.error(`[${pluginName}] Could not parse endpoints:`, err);
            return [];
        }
    };

    const config = {
        endpoints: parseEndpoints(raw.endpoints),
        videoBitrate: Number(raw.videoBitrate || 4500),
        audioBitrate: Number(raw.audioBitrate || 160),
        fps: Number(raw.fps || 30),
        preset: String(raw.preset || "veryfast"),
        ffmpegPath: String(raw.ffmpegPath || "ffmpeg"),
        autoStart: raw.autoStart === "true",
        showLiveBadge: raw.showLiveBadge === "true",
        menuCommand: raw.menuCommand !== "false",
        menuCommandName: String(raw.menuCommandName || "Streaming"),
        hotkey: String(raw.hotkey || "none"),
    };

    //-------------------------------------------------------------------------
    // StreamController: the whole pipeline lives here.
    //   canvas.captureStream + WebAudio tap  ->  MediaRecorder (webm)
    //     ->  ffmpeg stdin  ->  transcode h264/aac  ->  tee to N rtmp targets
    //-------------------------------------------------------------------------
    const StreamController = {
        active: false,
        recorder: null,
        ffmpeg: null,
        audioDest: null,
        badgeEl: null,
        states: null,        // per-endpoint on/off, lazily seeded from params
        needsRestart: false, // set when a toggle happens mid-stream

        // Seed the runtime on/off state from the Plugin Manager defaults once.
        initStates() {
            if (this.states) return;
            this.states = config.endpoints.map(
                (e) => e.enabled === "true" || e.enabled === true
            );
        },

        setEndpointEnabled(index, on) {
            this.initStates();
            if (index < 0 || index >= this.states.length) return;
            this.states[index] = !!on;
            // FFmpeg's tee targets are fixed at spawn time, so a live change
            // only takes effect after a restart.
            if (this.active) this.needsRestart = true;
        },

        // Restart the pipeline to apply a changed endpoint set (brief reconnect).
        restart() {
            if (!this.active) return;
            this.stop();
            this.needsRestart = false;
            setTimeout(() => this.start(), 500);
        },

        isSupported() {
            return typeof Utils !== "undefined" && Utils.isNwjs();
        },

        enabledEndpoints() {
            this.initStates();
            return config.endpoints.filter((e, i) => this.states[i]);
        },

        // Build the FFmpeg "tee" target string: [f=flv]url/key|[f=flv]url2/key2
        buildTeeTargets() {
            return this.enabledEndpoints()
                .map((e) => {
                    const base = String(e.url || "").replace(/\/+$/, "");
                    const key = String(e.key || "").trim();
                    const dest = key ? `${base}/${key}` : base;
                    return `[f=flv:onfail=ignore]${dest}`;
                })
                .join("|");
        },

        getCanvas() {
            // Graphics.app is the PIXI application in MZ; fall back to the DOM.
            if (typeof Graphics !== "undefined" && Graphics.app && Graphics.app.view) {
                return Graphics.app.view;
            }
            return document.querySelector("canvas");
        },

        // Tap the shared WebAudio graph so game BGM/SE are captured too.
        captureAudioTrack() {
            try {
                if (typeof WebAudio === "undefined" || !WebAudio._context) return null;
                const ctx = WebAudio._context;
                if (ctx.state === "suspended") ctx.resume();
                this.audioDest = ctx.createMediaStreamDestination();
                const source = WebAudio._masterGainNode || ctx.destination;
                // Connecting to a second destination tees the signal; the
                // original route to the speakers is untouched.
                if (source.connect) source.connect(this.audioDest);
                return this.audioDest.stream.getAudioTracks()[0] || null;
            } catch (err) {
                console.warn(`[${pluginName}] Audio capture unavailable:`, err);
                return null;
            }
        },

        pickMimeType() {
            const candidates = [
                "video/webm;codecs=vp9,opus",
                "video/webm;codecs=vp8,opus",
                "video/webm",
            ];
            return (
                candidates.find(
                    (t) =>
                        typeof MediaRecorder !== "undefined" &&
                        MediaRecorder.isTypeSupported(t)
                ) || ""
            );
        },

        start() {
            if (this.active) return;
            if (!this.isSupported()) {
                console.error(
                    `[${pluginName}] Not an NW.js/desktop build. FFmpeg streaming needs Node; ` +
                        `use a WHIP/relay setup for browser deployments.`
                );
                return;
            }
            const targets = this.buildTeeTargets();
            if (!targets) {
                console.error(`[${pluginName}] No enabled endpoints configured.`);
                return;
            }

            const canvas = this.getCanvas();
            if (!canvas || !canvas.captureStream) {
                console.error(`[${pluginName}] No capturable canvas found.`);
                return;
            }

            let ffmpeg;
            try {
                const { spawn } = require("child_process");
                const gop = String(config.fps * 2); // 2-second keyframe interval
                const vb = `${config.videoBitrate}k`;
                const buf = `${config.videoBitrate * 2}k`;
                const args = [
                    "-loglevel", "warning",
                    "-thread_queue_size", "1024",
                    "-i", "pipe:0",
                    "-c:v", "libx264",
                    "-preset", config.preset,
                    "-tune", "zerolatency",
                    "-pix_fmt", "yuv420p",
                    "-b:v", vb, "-maxrate", vb, "-bufsize", buf,
                    "-g", gop, "-keyint_min", gop, "-sc_threshold", "0",
                    "-c:a", "aac", "-b:a", `${config.audioBitrate}k`, "-ar", "44100",
                    "-f", "tee", "-map", "0:v", "-map", "0:a",
                    targets,
                ];
                ffmpeg = spawn(config.ffmpegPath, args, {
                    stdio: ["pipe", "pipe", "pipe"],
                });
            } catch (err) {
                console.error(`[${pluginName}] Failed to launch FFmpeg:`, err);
                return;
            }

            ffmpeg.stderr.on("data", (d) =>
                console.log(`[ffmpeg] ${d.toString().trim()}`)
            );
            ffmpeg.stdin.on("error", (err) => {
                // EPIPE when ffmpeg exits early (bad key, network) — stop cleanly.
                if (err && err.code === "EPIPE") this.stop();
                else console.error(`[${pluginName}] ffmpeg stdin error:`, err);
            });
            ffmpeg.on("close", (code) => {
                console.log(`[${pluginName}] FFmpeg exited (code ${code}).`);
                if (this.active) this.stop();
            });
            this.ffmpeg = ffmpeg;

            // Assemble the media stream: game video + game audio.
            const videoStream = canvas.captureStream(config.fps);
            const tracks = [...videoStream.getVideoTracks()];
            const audioTrack = this.captureAudioTrack();
            if (audioTrack) tracks.push(audioTrack);
            const stream = new MediaStream(tracks);

            const mimeType = this.pickMimeType();
            let recorder;
            try {
                recorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: config.videoBitrate * 1000,
                    audioBitsPerSecond: config.audioBitrate * 1000,
                });
            } catch (err) {
                console.error(`[${pluginName}] MediaRecorder failed:`, err);
                this.stop();
                return;
            }

            recorder.ondataavailable = (e) => {
                if (!e.data || !e.data.size || !this.ffmpeg) return;
                e.data
                    .arrayBuffer()
                    .then((b) => {
                        if (this.ffmpeg && this.ffmpeg.stdin.writable) {
                            this.ffmpeg.stdin.write(Buffer.from(b));
                        }
                    })
                    .catch(() => {});
            };
            recorder.onerror = (e) =>
                console.error(`[${pluginName}] Recorder error:`, e.error);

            recorder.start(250); // emit a chunk every 250ms
            this.recorder = recorder;
            this.active = true;
            this.showBadge();
            console.log(
                `[${pluginName}] LIVE to ${this.enabledEndpoints().length} endpoint(s).`
            );
        },

        stop() {
            if (!this.active && !this.ffmpeg && !this.recorder) return;
            this.active = false;
            try {
                if (this.recorder && this.recorder.state !== "inactive") {
                    this.recorder.stop();
                }
            } catch (e) {}
            this.recorder = null;

            if (this.ffmpeg) {
                try {
                    if (this.ffmpeg.stdin.writable) this.ffmpeg.stdin.end();
                } catch (e) {}
                // Give FFmpeg a moment to flush, then ensure it's gone.
                const proc = this.ffmpeg;
                setTimeout(() => {
                    try {
                        proc.kill("SIGINT");
                    } catch (e) {}
                }, 1500);
                this.ffmpeg = null;
            }
            if (this.audioDest) {
                try {
                    this.audioDest.disconnect();
                } catch (e) {}
                this.audioDest = null;
            }
            this.hideBadge();
            console.log(`[${pluginName}] Stopped.`);
        },

        toggle() {
            this.active ? this.stop() : this.start();
        },

        showBadge() {
            if (!config.showLiveBadge || this.badgeEl) return;
            const el = document.createElement("div");
            el.textContent = "\u25CF LIVE";
            Object.assign(el.style, {
                position: "fixed",
                top: "10px",
                right: "12px",
                zIndex: "1000",
                font: "bold 14px sans-serif",
                color: "#fff",
                background: "rgba(200,0,0,0.85)",
                padding: "3px 8px",
                borderRadius: "4px",
                pointerEvents: "none",
            });
            document.body.appendChild(el);
            this.badgeEl = el;
        },

        hideBadge() {
            if (this.badgeEl && this.badgeEl.parentNode) {
                this.badgeEl.parentNode.removeChild(this.badgeEl);
            }
            this.badgeEl = null;
        },
    };

    // Expose for console debugging: $multiStream.start() / .stop()
    window.$multiStream = StreamController;

    //-------------------------------------------------------------------------
    // Plugin commands
    //-------------------------------------------------------------------------
    PluginManager.registerCommand(pluginName, "start", () => StreamController.start());
    PluginManager.registerCommand(pluginName, "stop", () => StreamController.stop());
    PluginManager.registerCommand(pluginName, "toggle", () => StreamController.toggle());
    PluginManager.registerCommand(pluginName, "openMenu", () =>
        SceneManager.push(Scene_MultiStream)
    );

    //=========================================================================
    // In-game endpoint toggle menu
    //=========================================================================

    // --- Status header (LIVE state + summary) --------------------------------
    function Window_MultiStreamStatus() {
        this.initialize(...arguments);
    }
    Window_MultiStreamStatus.prototype = Object.create(Window_Base.prototype);
    Window_MultiStreamStatus.prototype.constructor = Window_MultiStreamStatus;

    Window_MultiStreamStatus.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_MultiStreamStatus.prototype.refresh = function () {
        this.contents.clear();
        const lh = this.lineHeight();
        const w = this.innerWidth;
        const live = StreamController.active;
        const total = config.endpoints.length;
        const on = StreamController.enabledEndpoints().length;

        this.changeTextColor(
            live ? ColorManager.powerUpColor() : ColorManager.normalColor()
        );
        this.drawText(live ? "\u25CF LIVE" : "OFFLINE", 0, 0, w, "left");
        this.resetTextColor();
        this.drawText(`${on} of ${total} endpoints on`, 0, 0, w, "right");
        this.drawText(
            `${config.videoBitrate} kbps  \u00B7  ${config.fps} fps`,
            0,
            lh,
            w,
            "left"
        );
        if (live && StreamController.needsRestart) {
            this.changeTextColor(ColorManager.crisisColor());
            this.drawText("Changes pending \u2014 select Apply", 0, lh * 2, w, "left");
            this.resetTextColor();
        }
    };

    // --- Command list (one row per endpoint + actions) -----------------------
    function Window_MultiStreamList() {
        this.initialize(...arguments);
    }
    Window_MultiStreamList.prototype = Object.create(Window_Command.prototype);
    Window_MultiStreamList.prototype.constructor = Window_MultiStreamList;

    Window_MultiStreamList.prototype.initialize = function (rect) {
        Window_Command.prototype.initialize.call(this, rect);
    };

    Window_MultiStreamList.prototype.itemTextAlign = function () {
        return "left";
    };

    Window_MultiStreamList.prototype.makeCommandList = function () {
        StreamController.initStates();
        if (config.endpoints.length === 0) {
            this.addCommand("No endpoints configured", "none", false);
        } else {
            config.endpoints.forEach((e, i) => {
                this.addCommand(e.name || `Endpoint ${i + 1}`, "endpoint", true, i);
            });
        }
        const live = StreamController.active;
        this.addCommand(
            live ? "Stop streaming" : "Start streaming",
            "stream",
            config.endpoints.length > 0
        );
        if (live && StreamController.needsRestart) {
            this.addCommand("Apply changes (restart)", "apply", true);
        }
        this.addCommand("Close", "close", true);
    };

    Window_MultiStreamList.prototype.drawItem = function (index) {
        const rect = this.itemLineRect(index);
        const symbol = this.commandSymbol(index);
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        if (symbol === "endpoint") {
            const epIndex = this._list[index].ext;
            const on = StreamController.states[epIndex];
            this.drawText(this.commandName(index), rect.x, rect.y, rect.width - 64, "left");
            this.changeTextColor(
                on ? ColorManager.powerUpColor() : ColorManager.powerDownColor()
            );
            this.drawText(on ? "ON" : "OFF", rect.x, rect.y, rect.width, "right");
            this.resetTextColor();
        } else {
            this.drawText(
                this.commandName(index),
                rect.x,
                rect.y,
                rect.width,
                this.itemTextAlign()
            );
        }
        this.changePaintOpacity(true);
    };

    // --- The scene -----------------------------------------------------------
    function Scene_MultiStream() {
        this.initialize(...arguments);
    }
    Scene_MultiStream.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_MultiStream.prototype.constructor = Scene_MultiStream;

    Scene_MultiStream.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        StreamController.initStates();
        this.createStatusWindow();
        this.createListWindow();
    };

    Scene_MultiStream.prototype.createStatusWindow = function () {
        const ww = Math.min(608, Graphics.boxWidth - 80);
        const wh = this.calcWindowHeight(3, false);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = 48;
        this._statusWindow = new Window_MultiStreamStatus(
            new Rectangle(wx, wy, ww, wh)
        );
        this.addWindow(this._statusWindow);
    };

    Scene_MultiStream.prototype.createListWindow = function () {
        const ww = Math.min(608, Graphics.boxWidth - 80);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this._statusWindow.y + this._statusWindow.height + 8;
        const wh = Math.min(
            Graphics.boxHeight - wy - 48,
            this.calcWindowHeight(8, true)
        );
        const win = new Window_MultiStreamList(new Rectangle(wx, wy, ww, wh));
        win.setHandler("endpoint", this.onToggleEndpoint.bind(this));
        win.setHandler("stream", this.onStartStop.bind(this));
        win.setHandler("apply", this.onApply.bind(this));
        win.setHandler("close", this.popScene.bind(this));
        win.setHandler("cancel", this.popScene.bind(this));
        this._listWindow = win;
        this.addWindow(win);
    };

    Scene_MultiStream.prototype.refreshWindows = function () {
        this._listWindow.refresh();
        this._statusWindow.refresh();
        this._listWindow.activate();
    };

    Scene_MultiStream.prototype.onToggleEndpoint = function () {
        const i = this._listWindow.currentExt();
        StreamController.setEndpointEnabled(i, !StreamController.states[i]);
        this.refreshWindows();
    };

    Scene_MultiStream.prototype.onStartStop = function () {
        StreamController.toggle();
        this.refreshWindows();
    };

    Scene_MultiStream.prototype.onApply = function () {
        StreamController.restart();
        this.refreshWindows();
    };

    // --- Main-menu entry -----------------------------------------------------
    if (config.menuCommand) {
        const _addOriginalCommands =
            Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function () {
            _addOriginalCommands.call(this);
            this.addCommand(config.menuCommandName, "multistream", true);
        };

        const _createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function () {
            _createCommandWindow.call(this);
            this._commandWindow.setHandler(
                "multistream",
                this.commandMultiStream.bind(this)
            );
        };

        Scene_Menu.prototype.commandMultiStream = function () {
            SceneManager.push(Scene_MultiStream);
        };
    }

    // --- Optional hotkey (map only) ------------------------------------------
    if (config.hotkey && config.hotkey !== "none") {
        const KEYS = { F6: 117, F7: 118, F9: 120, F10: 121 };
        const code = KEYS[config.hotkey];
        if (code) {
            document.addEventListener("keydown", (event) => {
                if (event.keyCode !== code) return;
                const scene = SceneManager._scene;
                if (scene instanceof Scene_Map && !$gameMessage.isBusy()) {
                    event.preventDefault();
                    SceneManager.push(Scene_MultiStream);
                }
            });
        }
    }

    // Expose the scene for other plugins / console use.
    window.Scene_MultiStream = Scene_MultiStream;

    //-------------------------------------------------------------------------
    // Auto-start on first map (audio context is usually resumed by then)
    //-------------------------------------------------------------------------
    if (config.autoStart) {
        const _Scene_Map_start = Scene_Map.prototype.start;
        let started = false;
        Scene_Map.prototype.start = function () {
            _Scene_Map_start.call(this);
            if (!started) {
                started = true;
                setTimeout(() => StreamController.start(), 500);
            }
        };
    }

    // Best-effort cleanup so FFmpeg never lingers after the window closes.
    window.addEventListener("beforeunload", () => StreamController.stop());
})();
