//=============================================================================
// AshenTrials.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Ward trials - self-contained minigames used to unseal each area. Sigil Sequence (memory) and Rune Toll (timing).
 * @author Ashen Keep
 *
 * @param dimOpacity
 * @text Background Dim
 * @type number
 * @min 0
 * @max 255
 * @default 170
 *
 * @param accent
 * @text Accent Colour
 * @default #4fd1c5
 *
 * @param danger
 * @text Failure Colour
 * @default #ff5d5d
 *
 * @command sigil
 * @text Trial: Sigil Sequence
 * @desc Shows a sequence of W/A/S/D sigils; the player must repeat it from memory.
 * @arg length
 * @text Sequence Length
 * @type number
 * @min 2
 * @default 5
 * @arg lives
 * @text Mistakes Allowed
 * @type number
 * @min 0
 * @default 2
 * @arg resultSwitch
 * @text Result Switch
 * @type switch
 * @default 0
 *
 * @command toll
 * @text Trial: Rune Toll
 * @desc A marker sweeps a bar; strike inside the glowing band the required number of times.
 * @arg hits
 * @text Hits Required
 * @type number
 * @min 1
 * @default 4
 * @arg speed
 * @text Marker Speed
 * @type number
 * @min 1
 * @default 5
 * @arg band
 * @text Band Width (%)
 * @type number
 * @min 4
 * @max 50
 * @default 20
 * @arg lives
 * @text Misses Allowed
 * @type number
 * @min 0
 * @default 2
 * @arg resultSwitch
 * @text Result Switch
 * @type switch
 * @default 0
 *
 * @help
 * ============================================================================
 * Ashen Trials
 * ============================================================================
 * Two small minigames used as area "wards". Neither needs any image or audio
 * asset - everything is drawn in code and uses stock MZ sound effects.
 *
 *   Sigil Sequence : a sequence of W/A/S/D sigils lights up, then you repeat
 *                    it. Wrong key costs a life and replays the sequence.
 *   Rune Toll      : a marker sweeps a bar. Press OK / left-click inside the
 *                    glowing band. Land the required number of tolls.
 *
 * Both set a switch ON for success, OFF for failure, then return to the map,
 * so an event can simply branch on that switch.
 * ============================================================================
 */

(() => {
"use strict";
const PN = "AshenTrials";
const P  = PluginManager.parameters(PN);
const DIM    = Number(P.dimOpacity || 170);
const ACCENT = String(P.accent || "#4fd1c5");
const DANGER = String(P.danger || "#ff5d5d");

//---------------------------------------------------------------------------
// shared base
//---------------------------------------------------------------------------
function Scene_AshenTrial() { this.initialize(...arguments); }
Scene_AshenTrial.prototype = Object.create(Scene_Base.prototype);
Scene_AshenTrial.prototype.constructor = Scene_AshenTrial;

Scene_AshenTrial.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._done = false; this._result = false; this._exitT = 0;
};

Scene_AshenTrial.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this.createBackground();
    this._panel = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    this.addChild(this._panel);
};

Scene_AshenTrial.prototype.createBackground = function() {
    this._back = new Sprite(SceneManager.backgroundBitmap());
    this._back.opacity = 255;
    this.addChild(this._back);
    const d = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    d.bitmap.fillAll("rgba(4,6,10,1)");
    d.opacity = DIM;
    this.addChild(d);
};

Scene_AshenTrial.prototype.finish = function(ok) {
    if (this._done) return;
    this._done = true; this._result = ok; this._exitT = 48;
    AudioManager.playSe({ name: ok ? "Item3" : "Buzzer1", volume: 90, pitch: ok ? 100 : 80, pan: 0 });
    if (this._switchId > 0) $gameSwitches.setValue(this._switchId, ok);
};

Scene_AshenTrial.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (this._done) {
        if (--this._exitT <= 0) this.popScene();
        this.draw();
        return;
    }
    this.step();
    this.draw();
};

// ---- drawing helpers ----
Scene_AshenTrial.prototype.frame = function(title, sub) {
    const b = this._panel.bitmap;
    b.clear();
    const W = Graphics.width, H = Graphics.height;
    const bw = 560, bh = 300, bx = (W - bw) / 2, by = (H - bh) / 2;
    b.fillRect(bx, by, bw, bh, "rgba(8,10,14,0.86)");
    b.fillRect(bx, by, bw, 2, ACCENT);
    b.fillRect(bx, by + bh - 2, bw, 2, "rgba(0,0,0,0.6)");
    b.fontFace = $gameSystem.mainFontFace();
    b.outlineWidth = 4; b.outlineColor = "rgba(0,0,0,0.9)";
    b.fontSize = 24; b.fontBold = true; b.textColor = ACCENT;
    b.drawText(title, bx, by + 16, bw, 30, "center");
    b.fontSize = 16; b.fontBold = false; b.textColor = "#c9d1d9";
    b.drawText(sub, bx, by + 52, bw, 24, "center");
    return { b, bx, by, bw, bh };
};

Scene_AshenTrial.prototype.lifePips = function(g, lives, max) {
    const { b, bx, by, bw, bh } = g;
    for (let i = 0; i < max; i++) {
        const x = bx + bw / 2 - (max * 16) / 2 + i * 16;
        b.fillRect(x, by + bh - 34, 11, 11, i < lives ? ACCENT : "rgba(120,120,130,0.35)");
    }
};

Scene_AshenTrial.prototype.banner = function(g) {
    if (!this._done) return;
    const { b, bx, by, bw, bh } = g;
    b.fontSize = 30; b.fontBold = true;
    b.textColor = this._result ? ACCENT : DANGER;
    b.drawText(this._result ? "THE WARD YIELDS" : "THE WARD HOLDS", bx, by + bh / 2 - 20, bw, 40, "center");
};

//---------------------------------------------------------------------------
// Trial 1 - Sigil Sequence (memory)
//---------------------------------------------------------------------------
function Scene_AshenSigil() { this.initialize(...arguments); }
Scene_AshenSigil.prototype = Object.create(Scene_AshenTrial.prototype);
Scene_AshenSigil.prototype.constructor = Scene_AshenSigil;

const SIG = [
    { key: "up",    label: "W" },
    { key: "left",  label: "A" },
    { key: "down",  label: "S" },
    { key: "right", label: "D" }
];

Scene_AshenSigil.prototype.prepare = function(len, lives, switchId) {
    this._len = len; this._lives = lives; this._maxLives = lives; this._switchId = switchId;
};

Scene_AshenSigil.prototype.create = function() {
    Scene_AshenTrial.prototype.create.call(this);
    this.roll();
};

Scene_AshenSigil.prototype.roll = function() {
    this._seq = [];
    for (let i = 0; i < this._len; i++) this._seq.push(Math.randomInt(4));
    this._phase = "show"; this._idx = 0; this._t = 44; this._lit = -1;
};

Scene_AshenSigil.prototype.step = function() {
    if (this._phase === "show") {
        this._t--;
        const slot = Math.floor((this._len * 44 - (this._t + this._idx * 44)) / 44);
        if (this._t <= 0) {
            this._lit = this._idx;
            this._idx++;
            this._t = 44;
            if (this._idx > this._len) { this._phase = "input"; this._idx = 0; this._lit = -1; }
            else AudioManager.playSe({ name: "Cursor1", volume: 70, pitch: 100 + this._seq[this._idx - 1] * 12, pan: 0 });
        }
        void slot;
        return;
    }
    // input phase
    for (let i = 0; i < 4; i++) {
        if (Input.isTriggered(SIG[i].key)) {
            if (i === this._seq[this._idx]) {
                AudioManager.playSe({ name: "Cursor2", volume: 70, pitch: 110 + i * 10, pan: 0 });
                this._idx++;
                if (this._idx >= this._len) this.finish(true);
            } else {
                AudioManager.playSe({ name: "Buzzer1", volume: 70, pitch: 110, pan: 0 });
                this._lives--;
                if (this._lives < 0) this.finish(false);
                else { this._phase = "show"; this._idx = 0; this._t = 40; this._lit = -1; }
            }
            break;
        }
    }
    if (Input.isTriggered("escape") || Input.isTriggered("cancel")) this.finish(false);
};

Scene_AshenSigil.prototype.draw = function() {
    const g = this.frame("SIGIL WARD",
        this._phase === "show" ? "Watch the sigils." : "Repeat the sequence.   W A S D");
    const { b, bx, by, bw } = g;
    const n = this._len, cw = 62, total = n * cw, x0 = bx + (bw - total) / 2;
    for (let i = 0; i < n; i++) {
        const x = x0 + i * cw, y = by + 110;
        let on = false, col = "rgba(255,255,255,0.10)";
        if (this._phase === "show") { on = (this._lit === i); if (on) col = ACCENT; }
        else if (i < this._idx) { on = true; col = ACCENT; }
        b.fillRect(x + 4, y, cw - 12, 56, on ? "rgba(79,209,197,0.30)" : "rgba(255,255,255,0.07)");
        b.fillRect(x + 4, y, cw - 12, 2, on ? col : "rgba(255,255,255,0.18)");
        b.fontSize = 26; b.fontBold = true;
        b.textColor = on ? "#eafffd" : "rgba(200,210,220,0.35)";
        const show = (this._phase === "show" && this._lit === i) || (this._phase === "input" && i < this._idx);
        b.drawText(show ? SIG[this._seq[i]].label : "?", x + 4, y + 12, cw - 12, 32, "center");
    }
    this.lifePips(g, this._lives, this._maxLives);
    this.banner(g);
};

//---------------------------------------------------------------------------
// Trial 2 - Rune Toll (timing)
//---------------------------------------------------------------------------
function Scene_AshenToll() { this.initialize(...arguments); }
Scene_AshenToll.prototype = Object.create(Scene_AshenTrial.prototype);
Scene_AshenToll.prototype.constructor = Scene_AshenToll;

Scene_AshenToll.prototype.prepare = function(hits, speed, band, lives, switchId) {
    this._need = hits; this._speed = speed; this._band = band / 100;
    this._lives = lives; this._maxLives = lives; this._switchId = switchId;
    this._hits = 0; this._pos = 0; this._dir = 1; this._flash = 0;
    this.reband();
};

Scene_AshenToll.prototype.reband = function() {
    this._bandStart = 0.10 + Math.random() * (0.80 - this._band);
};

Scene_AshenToll.prototype.step = function() {
    if (this._flash > 0) this._flash--;
    this._pos += this._dir * (this._speed / 100);
    if (this._pos >= 1) { this._pos = 1; this._dir = -1; }
    if (this._pos <= 0) { this._pos = 0; this._dir = 1; }
    const hit = Input.isTriggered("ok") || TouchInput.isTriggered();
    if (hit) {
        const inBand = this._pos >= this._bandStart && this._pos <= this._bandStart + this._band;
        if (inBand) {
            this._hits++; this._flash = 10;
            AudioManager.playSe({ name: "Bell1", volume: 80, pitch: 100 + this._hits * 8, pan: 0 });
            if (this._hits >= this._need) { this.finish(true); return; }
            this._speed += 1.1;
            this.reband();
        } else {
            this._lives--;
            AudioManager.playSe({ name: "Buzzer1", volume: 70, pitch: 100, pan: 0 });
            if (this._lives < 0) { this.finish(false); return; }
        }
    }
    if (Input.isTriggered("escape") || Input.isTriggered("cancel")) this.finish(false);
};

Scene_AshenToll.prototype.draw = function() {
    const g = this.frame("TOLLING WARD", "Strike inside the light.   Z / Left click");
    const { b, bx, by, bw } = g;
    const tw = bw - 96, tx = bx + 48, ty = by + 128;
    b.fillRect(tx, ty, tw, 26, "rgba(0,0,0,0.55)");
    b.fillRect(tx + tw * this._bandStart, ty, tw * this._band, 26,
        this._flash > 0 ? "rgba(255,255,255,0.55)" : "rgba(79,209,197,0.42)");
    const mx = tx + tw * this._pos;
    b.fillRect(mx - 2, ty - 8, 4, 42, "#e2b04a");
    b.fontSize = 18; b.fontBold = true; b.textColor = "#c9d1d9";
    b.drawText(`${this._hits} / ${this._need}`, bx, ty + 44, bw, 24, "center");
    this.lifePips(g, this._lives, this._maxLives);
    this.banner(g);
};

//---------------------------------------------------------------------------
// plugin commands
//---------------------------------------------------------------------------
PluginManager.registerCommand(PN, "sigil", args => {
    SceneManager.push(Scene_AshenSigil);
    SceneManager.prepareNextScene(
        Math.max(2, Number(args.length || 5)),
        Math.max(0, Number(args.lives || 2)),
        Number(args.resultSwitch || 0));
});

PluginManager.registerCommand(PN, "toll", args => {
    SceneManager.push(Scene_AshenToll);
    SceneManager.prepareNextScene(
        Math.max(1, Number(args.hits || 4)),
        Math.max(1, Number(args.speed || 5)),
        Math.max(4, Number(args.band || 20)),
        Math.max(0, Number(args.lives || 2)),
        Number(args.resultSwitch || 0));
});

window.AshenTrials = { Scene_AshenSigil, Scene_AshenToll };
})();
