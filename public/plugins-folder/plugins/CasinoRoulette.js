//=============================================================================
// CasinoRoulette.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v3.0.0] American Roulette for CasinoCore rendered as a top-down blue
 * table: wheel + board + chips. Requires CasinoCore.js and CasinoVisuals.js above it.
 * @author You
 * @base CasinoCore
 * @orderAfter CasinoVisuals
 *
 * @help
 * A top-down American (double-zero) roulette table: blue felt, a wheel with a
 * center spindle, chip stacks on the table, and a bright red/black betting board
 * with 0, 00, dozens, columns and the red/black diamond bets. Move the gold
 * cursor over the board with the arrow keys (or click a cell), press OK to drop
 * your chip, and the wheel spins to a result.
 *
 *   Even-money bets (Red/Black, Even/Odd, 1-18/19-36) ....... pay 1:1
 *   Dozens & Columns (2 to 1) ............................... pay 2:1
 *   Single number (straight up, incl. 0 / 00) ............... pays 35:1
 *
 * ---- Switching back to EUROPEAN (single zero) ----
 * 1) Delete the "00" entry from WHEEL and from the board's zero cells.
 * 2) Remove the 00 handling in betWins.
 * European has a lower house edge (one green pocket instead of two).
 */

(() => {
    "use strict";
    if (!window.CasinoCore) { console.error("CasinoRoulette.js requires CasinoCore.js."); return; }
    if (!window.CasinoGfx) { console.error("CasinoRoulette.js requires CasinoVisuals.js above it."); return; }

    const G = CasinoGfx;
    const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    // American wheel order (double zero), clockwise.
    const WHEEL = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
        "00", 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];

    const COL = {
        feltTop: "#4a83b8", feltMid: "#3f74a6", feltBot: "#2f5c86",
        red: "#d5252b", black: "#171717", green: "#1f9d55",
        wood: "#5a3a1e", woodDark: "#3a2412", surround: "#0b0b0d",
        line: "rgba(255,255,255,0.55)", outside: "rgba(10,32,52,0.55)"
    };
    const tokenColor = r => (r === "00" || r === 0) ? "green" : (RED.has(r) ? "red" : "black");
    const fillFor = c => (c === "green" ? COL.green : (c === "red" ? COL.red : COL.black));

    function betWins(key, r, single) {
        if (r === "00") return key === "single" && single === "00";
        switch (key) {
            case "single": return single === r;
            case "red": return RED.has(r);
            case "black": return r !== 0 && !RED.has(r);
            case "even": return r !== 0 && r % 2 === 0;
            case "odd": return r % 2 === 1;
            case "low": return r >= 1 && r <= 18;
            case "high": return r >= 19 && r <= 36;
            case "dozen1": return r >= 1 && r <= 12;
            case "dozen2": return r >= 13 && r <= 24;
            case "dozen3": return r >= 25 && r <= 36;
            case "col1": return r >= 1 && r % 3 === 1;
            case "col2": return r >= 1 && r % 3 === 2;
            case "col3": return r >= 1 && r % 3 === 0;
        }
        return false;
    }
    function betMultiplier(key) {
        if (key === "single") return 36;
        if (["dozen1", "dozen2", "dozen3", "col1", "col2", "col3"].includes(key)) return 3;
        return 2;
    }
    function betLabel(bet) {
        if (bet.key === "single") return "Straight up " + bet.single;
        return { red: "Red", black: "Black", even: "Even", odd: "Odd", low: "1-18", high: "19-36",
            dozen1: "1st 12", dozen2: "2nd 12", dozen3: "3rd 12",
            col1: "Column 1", col2: "Column 2", col3: "Column 3" }[bet.key] || bet.key;
    }

    // Wheel geometry (kept in sync between the wood base on the felt and the sprite)
    const WHEEL_CX = 150, WHEEL_CY = 104, WHEEL_D = 176;

    //--------------------------------------------------- decorative chip stack
    function drawChipStack(bmp, x, y, vals) {
        for (let i = 0; i < vals.length; i++) G.drawChip(bmp, vals[i], x, y - i * 6, 15);
    }

    //--------------------------------------------------- blue felt table (bg)
    function buildTable(w, h) {
        const bmp = new Bitmap(w, h);
        const ctx = G.ctx(bmp);
        ctx.fillStyle = COL.surround; ctx.fillRect(0, 0, w, h);
        const m = 10;
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, COL.feltTop); g.addColorStop(0.55, COL.feltMid); g.addColorStop(1, COL.feltBot);
        G.roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 24); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = "#12314a"; ctx.stroke();
        // wheel wood base
        const wr = WHEEL_D / 2 + 14;
        ctx.beginPath(); ctx.arc(WHEEL_CX, WHEEL_CY, wr, 0, Math.PI * 2);
        ctx.fillStyle = COL.wood; ctx.fill();
        ctx.lineWidth = 8; ctx.strokeStyle = COL.woodDark; ctx.stroke();
        ctx.beginPath(); ctx.arc(WHEEL_CX, WHEEL_CY, wr - 9, 0, Math.PI * 2);
        ctx.strokeStyle = G.COLOR.gold; ctx.lineWidth = 2; ctx.stroke();
        // chip stacks on the felt near the wheel
        drawChipStack(bmp, 300, 74, [25, 25, 100, 100, 500]);
        drawChipStack(bmp, 336, 84, [10, 10, 25, 100]);
        drawChipStack(bmp, 268, 92, [1, 1, 25]);
        G.update(bmp);
        return bmp;
    }

    //--------------------------------------------------- top-down wheel sprite
    function buildWheel(D) {
        const bmp = new Bitmap(D, D);
        const ctx = G.ctx(bmp);
        const cx = D / 2, cy = D / 2, R = D / 2 - 2;
        const n = WHEEL.length, step = (Math.PI * 2) / n;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = "#2a1a0c"; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = G.COLOR.gold; ctx.stroke();
        for (let i = 0; i < n; i++) {
            const a0 = -Math.PI / 2 + i * step - step / 2;
            const a1 = a0 + step;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R * 0.95, a0, a1); ctx.closePath();
            ctx.fillStyle = fillFor(tokenColor(WHEEL[i])); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.stroke();
            const am = a0 + step / 2;
            ctx.save();
            ctx.translate(cx + Math.cos(am) * R * 0.82, cy + Math.sin(am) * R * 0.82);
            ctx.rotate(am + Math.PI / 2);
            ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(D * 0.042) + "px sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(String(WHEEL[i]), 0, 0);
            ctx.restore();
        }
        // hub + gold spindle (top-down turret)
        const rIn = R * 0.42;
        ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
        ctx.fillStyle = "#6a4a24"; ctx.fill();
        ctx.strokeStyle = G.COLOR.goldHi; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = G.COLOR.goldHi; ctx.lineWidth = Math.max(3, D * 0.02);
        for (let k = 0; k < 4; k++) {
            const a = k * Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, rIn * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = G.COLOR.goldHi; ctx.fill();
        G.update(bmp);
        return bmp;
    }
    function wheelAngleFor(result, spins) {
        const i = Math.max(0, WHEEL.indexOf(result));
        const step = (Math.PI * 2) / WHEEL.length;
        return -(i * step) + (spins || 6) * Math.PI * 2;
    }

    //-------------------------------------------------------------------------
    // Window_RouletteBoard
    //-------------------------------------------------------------------------
    function Window_RouletteBoard() { this.initialize(...arguments); }
    Window_RouletteBoard.prototype = Object.create(Window_Selectable.prototype);
    Window_RouletteBoard.prototype.constructor = Window_RouletteBoard;

    Window_RouletteBoard.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.opacity = 0;                    // board draws its own felt cells
        this._items = [];
        this._placed = -1; this._placedAmt = 0;
        this.buildLayout();
        this.select(2);
        this.refresh();
    };
    Window_RouletteBoard.prototype.maxItems = function() { return this._items.length; };
    Window_RouletteBoard.prototype.currentBet = function() {
        const it = this._items[this.index()];
        return it ? { key: it.key, single: it.single } : { key: "red" };
    };
    Window_RouletteBoard.prototype.setPlaced = function(index, amount) {
        this._placed = index; this._placedAmt = amount; this.refresh();
    };
    Window_RouletteBoard.prototype.updateCursor = function() { this.setCursorRect(0, 0, 0, 0); };
    Window_RouletteBoard.prototype.ensureCursorVisible = function() { };
    Window_RouletteBoard.prototype.hitIndex = function() {
        const touchPos = new Point(TouchInput.x, TouchInput.y);
        const local = this.worldTransform.applyInverse(touchPos);
        const lx = local.x - this.padding + this.origin.x;
        const ly = local.y - this.padding + this.origin.y;
        for (let i = 0; i < this._items.length; i++) {
            const r = this._items[i].rect;
            if (lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h) return i;
        }
        return -1;
    };

    Window_RouletteBoard.prototype.buildLayout = function() {
        const W = this.innerWidth, H = this.innerHeight, pad = 6;
        const units = 1 + 12 + 1.2;                 // zeros col + 12 number cols + 2:1 col
        const cw = (W - pad * 2) / units;
        const rh = (H - pad * 2) / 5;                // 3 number rows + dozens + outside
        const x0 = pad, gx = x0 + cw, items = [];
        const push = (key, single, x, y, w, h, label, kind) =>
            items.push({ key, single, rect: { x, y, w, h }, cx: x + w / 2, cy: y + h / 2, label, kind });
        // zeros (0 over top 1.5 rows, 00 over bottom 1.5 rows)
        push("single", 0, x0, pad, cw, rh * 1.5, "0", "zero");
        push("single", "00", x0, pad + rh * 1.5, cw, rh * 1.5, "00", "zero");
        // number grid 12 cols x 3 rows: top 3,6..; mid 2,5..; bottom 1,4..
        for (let c = 0; c < 12; c++)
            for (let r = 0; r < 3; r++)
                push("single", 3 * c + (3 - r), gx + c * cw, pad + r * rh, cw, rh, String(3 * c + (3 - r)), "num");
        // 2:1 column bets
        const colX = gx + 12 * cw;
        push("col3", null, colX, pad, cw * 1.2, rh, "2:1", "side");
        push("col2", null, colX, pad + rh, cw * 1.2, rh, "2:1", "side");
        push("col1", null, colX, pad + rh * 2, cw * 1.2, rh, "2:1", "side");
        // dozens
        const dy = pad + rh * 3;
        push("dozen1", null, gx, dy, cw * 4, rh, "1st 12", "outside");
        push("dozen2", null, gx + cw * 4, dy, cw * 4, rh, "2nd 12", "outside");
        push("dozen3", null, gx + cw * 8, dy, cw * 4, rh, "3rd 12", "outside");
        // outside even-money
        const oy = pad + rh * 4;
        push("low", null, gx, oy, cw * 2, rh, "1 to 18", "outside");
        push("even", null, gx + cw * 2, oy, cw * 2, rh, "EVEN", "outside");
        push("red", null, gx + cw * 4, oy, cw * 2, rh, "", "diared");
        push("black", null, gx + cw * 6, oy, cw * 2, rh, "", "diablack");
        push("odd", null, gx + cw * 8, oy, cw * 2, rh, "ODD", "outside");
        push("high", null, gx + cw * 10, oy, cw * 2, rh, "19 to 36", "outside");
        this._items = items;
    };

    Window_RouletteBoard.prototype.processCursorMove = function() {
        if (!this.isCursorMovable()) return;
        let moved = false;
        if (Input.isRepeated("right")) moved = this.moveNearest(1, 0);
        else if (Input.isRepeated("left")) moved = this.moveNearest(-1, 0);
        else if (Input.isRepeated("down")) moved = this.moveNearest(0, 1);
        else if (Input.isRepeated("up")) moved = this.moveNearest(0, -1);
        if (moved) { SoundManager.playCursor(); this.refresh(); }
    };
    Window_RouletteBoard.prototype.moveNearest = function(dx, dy) {
        const cur = this._items[this.index()]; if (!cur) return false;
        let best = -1, bestScore = Infinity;
        for (let i = 0; i < this._items.length; i++) {
            if (i === this.index()) continue;
            const it = this._items[i];
            const ddx = it.cx - cur.cx, ddy = it.cy - cur.cy;
            const primary = dx !== 0 ? ddx * dx : ddy * dy;
            if (primary <= 2) continue;
            const perp = dx !== 0 ? Math.abs(ddy) : Math.abs(ddx);
            const score = primary + perp * 2.2;
            if (score < bestScore) { bestScore = score; best = i; }
        }
        if (best >= 0) { this.select(best); return true; }
        return false;
    };

    Window_RouletteBoard.prototype.refresh = function() {
        this.contents.clear();
        const ctx = G.ctx(this.contents);
        for (let i = 0; i < this._items.length; i++) this.drawCell(ctx, this._items[i], i);
        // placed chip
        if (this._placed >= 0 && this._items[this._placed]) {
            const it = this._items[this._placed];
            G.drawChip(this.contents, this._placedAmt, it.cx, it.cy, Math.min(18, it.rect.h * 0.42));
        }
        G.update(this.contents);
    };
    Window_RouletteBoard.prototype.drawCell = function(ctx, it, i) {
        const r = it.rect;
        ctx.save();
        G.roundRect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 3);
        if (it.kind === "num" || it.kind === "zero") ctx.fillStyle = fillFor(tokenColor(it.single));
        else if (it.kind === "diared") ctx.fillStyle = "rgba(10,32,52,0.55)";
        else if (it.kind === "diablack") ctx.fillStyle = "rgba(10,32,52,0.55)";
        else ctx.fillStyle = COL.outside;
        ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
        if (it.kind === "diared" || it.kind === "diablack") {
            G.drawSuit(ctx, "\u2666", it.cx, it.cy, r.h * 0.3, it.kind === "diared" ? COL.red : COL.black);
        } else if (it.label) {
            ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            const fs = (it.kind === "num" || it.kind === "zero") ? Math.min(r.h * 0.44, 24) : Math.min(r.h * 0.34, 16);
            ctx.font = "bold " + Math.round(fs) + "px sans-serif";
            ctx.fillText(it.label, it.cx, it.cy + 1);
        }
        if (i === this.index()) {
            G.roundRect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 3);
            ctx.lineWidth = 3; ctx.strokeStyle = G.COLOR.goldHi; ctx.stroke();
        }
        ctx.restore();
    };

    //-------------------------------------------------------------------------
    // Window_RouletteStatus
    //-------------------------------------------------------------------------
    function Window_RouletteStatus() { this.initialize(...arguments); }
    Window_RouletteStatus.prototype = Object.create(Window_Base.prototype);
    Window_RouletteStatus.prototype.constructor = Window_RouletteStatus;
    Window_RouletteStatus.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0;
        this._line = "Choose your bet amount."; this._num = null; this._win = false;
        this.refresh();
    };
    Window_RouletteStatus.prototype.set = function(line, num, win) {
        this._line = line || ""; this._num = (num === undefined ? null : num); this._win = !!win; this.refresh();
    };
    Window_RouletteStatus.prototype.refresh = function() {
        this.contents.clear();
        const ctx = G.ctx(this.contents);
        ctx.save(); ctx.textBaseline = "middle";
        let tx = 4;
        if (this._num !== null) {
            const r = this.innerHeight / 2 - 3;
            ctx.beginPath(); ctx.arc(r + 4, this.innerHeight / 2, r, 0, Math.PI * 2);
            ctx.fillStyle = fillFor(tokenColor(this._num)); ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = G.COLOR.gold; ctx.stroke();
            ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(String(this._num), r + 4, this.innerHeight / 2 + 1);
            tx = r * 2 + 14;
        }
        ctx.textAlign = "left";
        ctx.fillStyle = this._win ? G.COLOR.goldHi : "#eef3f7";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(this._line, tx, this.innerHeight / 2);
        ctx.restore();
        G.update(this.contents);
    };

    //-------------------------------------------------------------------------
    // Window_Bet (stepper) + Window_Choices
    //-------------------------------------------------------------------------
    function Window_Bet() { this.initialize(...arguments); }
    Window_Bet.prototype = Object.create(Window_Selectable.prototype);
    Window_Bet.prototype.constructor = Window_Bet;
    Window_Bet.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        G.decoratePanel(this);
        this._min = 1; this._max = 1; this._step = 1; this._value = 1; this.refresh();
    };
    Window_Bet.prototype.setup = function(min, max, step) {
        this._min = min; this._max = Math.max(min, max); this._step = Math.max(1, step);
        this._value = Math.min(this._max, Math.max(this._min, this._value || min));
        this.refresh(); this.activate(); this.select(0);
    };
    Window_Bet.prototype.maxItems = function() { return 1; };
    Window_Bet.prototype.value = function() { return this._value; };
    Window_Bet.prototype.updateCursor = function() { this.setCursorRect(0, 0, 0, 0); };
    Window_Bet.prototype.changeValue = function(d) {
        const v = Math.min(this._max, Math.max(this._min, this._value + d));
        if (v !== this._value) { this._value = v; SoundManager.playCursor(); this.refresh(); }
    };
    Window_Bet.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this.active && this._max >= this._min) {
            if (Input.isRepeated("right")) this.changeValue(this._step);
            else if (Input.isRepeated("left")) this.changeValue(-this._step);
            else if (Input.isRepeated("pageup")) this.changeValue(this._step * 10);
            else if (Input.isRepeated("pagedown")) this.changeValue(-this._step * 10);
        }
    };
    Window_Bet.prototype.refresh = function() {
        this.contents.clear();
        const ctx = G.ctx(this.contents), w = this.innerWidth, lh = this.lineHeight();
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = G.COLOR.goldHi; ctx.font = "bold 20px sans-serif";
        ctx.fillText("PLACE YOUR BET", w / 2, lh * 0.5); ctx.restore();
        G.drawChip(this.contents, this._value, w / 2, lh * 1.55, 22);
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif";
        ctx.fillText("\u25C4        \u25BA", w / 2, lh * 1.55);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "13px sans-serif";
        ctx.fillText("Left/Right \u2022 Q/W = x10 \u2022 OK to continue", w / 2, lh * 2.6);
        ctx.restore(); G.update(this.contents);
    };

    function Window_Choices() { this.initialize(...arguments); }
    Window_Choices.prototype = Object.create(Window_Command.prototype);
    Window_Choices.prototype.constructor = Window_Choices;
    Window_Choices.prototype.initialize = function(rect) {
        Window_Command.prototype.initialize.call(this, rect); G.decoratePanel(this);
    };
    Window_Choices.prototype.setItems = function(items) {
        this._items = items; this.refresh(); this.select(0); this.activate();
    };
    Window_Choices.prototype.makeCommandList = function() {
        if (!this._items) return;
        for (const it of this._items) this.addCommand(it.name, it.symbol, it.enabled !== false);
    };

    //-------------------------------------------------------------------------
    // Scene_Roulette
    //-------------------------------------------------------------------------
    function Scene_Roulette() { this.initialize(...arguments); }
    Scene_Roulette.prototype = Object.create(Scene_CasinoGameBase.prototype);
    Scene_Roulette.prototype.constructor = Scene_Roulette;

    // Blue felt table instead of the green felt used elsewhere.
    Scene_Roulette.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite(buildTable(Graphics.width, Graphics.height));
        this.addChild(this._backgroundSprite);
    };

    Scene_Roulette.prototype.createGameObjects = function() {
        this._panelH = this.calcWindowHeight(3, true);
        this._spinning = false;
        this.createWheel();
        this.createStatusWindow();
        this.createBoardWindow();
        this.createBetWindow();
        this.createChoiceWindow();
        this.setPhase("amount");
    };

    Scene_Roulette.prototype.createWheel = function() {
        this._wheel = new Sprite(buildWheel(WHEEL_D));
        this._wheel.anchor.set(0.5);
        this._wheel.x = WHEEL_CX; this._wheel.y = WHEEL_CY;
        this.addChild(this._wheel);
        // pointer at top
        const pb = new Bitmap(26, 24);
        const pc = G.ctx(pb);
        pc.beginPath(); pc.moveTo(13, 23); pc.lineTo(2, 0); pc.lineTo(24, 0); pc.closePath();
        pc.fillStyle = G.COLOR.goldHi; pc.fill(); pc.strokeStyle = "#4a2f14"; pc.lineWidth = 1; pc.stroke();
        G.update(pb);
        this._pointer = new Sprite(pb); this._pointer.anchor.set(0.5, 1);
        this._pointer.x = WHEEL_CX; this._pointer.y = WHEEL_CY - WHEEL_D / 2 + 2;
        this.addChild(this._pointer);
        // ball
        const bb = new Bitmap(14, 14);
        const bc = G.ctx(bb);
        bc.beginPath(); bc.arc(7, 7, 5, 0, Math.PI * 2); bc.fillStyle = "#f6f6f2"; bc.fill();
        bc.strokeStyle = "#999"; bc.lineWidth = 1; bc.stroke(); G.update(bb);
        this._ball = new Sprite(bb); this._ball.anchor.set(0.5);
        this._ball.x = WHEEL_CX; this._ball.y = WHEEL_CY - WHEEL_D * 0.4;
        this._ball.visible = false; this.addChild(this._ball);
    };

    Scene_Roulette.prototype.createStatusWindow = function() {
        const y = WHEEL_CY + WHEEL_D / 2 + 14;
        this._status = new Window_RouletteStatus(new Rectangle(12, y, Graphics.boxWidth - 24, this.calcWindowHeight(1, false)));
        this._boardTop = y + this._status.height + 6;
        this.addWindow(this._status);
    };
    Scene_Roulette.prototype.boardRect = function() {
        const h = Graphics.boxHeight - this._boardTop - 8;
        return new Rectangle(12, this._boardTop, Graphics.boxWidth - 24, h);
    };
    Scene_Roulette.prototype.createBoardWindow = function() {
        this._board = new Window_RouletteBoard(this.boardRect());
        this._board.setHandler("ok", this.onBoardOk.bind(this));
        this._board.setHandler("cancel", this.onBackToAmount.bind(this));
        this.addWindow(this._board);
    };
    Scene_Roulette.prototype.bottomRect = function(w) {
        return new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - this._panelH, w, this._panelH);
    };
    Scene_Roulette.prototype.createBetWindow = function() {
        this._betWindow = new Window_Bet(this.bottomRect(460));
        this._betWindow.setHandler("ok", this.onAmountOk.bind(this));
        this._betWindow.setHandler("cancel", this.returnToHub.bind(this));
        this.addWindow(this._betWindow);
    };
    Scene_Roulette.prototype.createChoiceWindow = function() {
        this._choices = new Window_Choices(this.bottomRect(380));
        this._choices.setHandler("again", this.onPlayAgain.bind(this));
        this._choices.setHandler("leave", this.returnToHub.bind(this));
        this.addWindow(this._choices);
    };

    Scene_Roulette.prototype.setPhase = function(phase) {
        this._phase = phase;
        const set = (win, on) => { if (win) { win.visible = on; win.active = on; } };
        set(this._betWindow, phase === "amount");
        set(this._board, phase === "bet");
        set(this._choices, phase === "result");
        this._board.visible = true; // the board is always on the table
        if (phase === "amount") {
            this._board.setPlaced(-1, 0);
            this._ball.visible = false;
            this._status.set("Choose your bet amount.");
            const max = this.maxBet();
            if (max < this.minBet()) {
                this._status.set("Not enough chips to play.");
                set(this._betWindow, false);
                set(this._choices, true);
                this._choices.setItems([{ name: "Leave", symbol: "leave" }]);
                return;
            }
            this._betWindow.setup(this.minBet(), max, this.minBet());
        } else if (phase === "bet") {
            this._status.set("Bet " + this._wager + " \u2014 pick a spot, then OK.");
            this._board.activate();
        }
    };

    Scene_Roulette.prototype.onAmountOk = function() { this._wager = this._betWindow.value(); this.setPhase("bet"); };
    Scene_Roulette.prototype.onBackToAmount = function() { this.setPhase("amount"); };

    Scene_Roulette.prototype.onBoardOk = function() {
        const bet = this._board.currentBet();
        if (!this.bet(this._wager)) { this.setPhase("amount"); return; }
        this._stake = this._wager;
        this._bet = bet;
        this._board.setPlaced(this._board.index(), this._stake);
        this._board.active = false;
        this._spinResult = WHEEL[CasinoCore.rng.int(0, WHEEL.length - 1)];
        this._status.set("On " + betLabel(bet) + "  \u2014  spinning\u2026");
        CasinoCore.se.deal();
        this._ball.visible = false;
        const spins = 5 + CasinoCore.rng.int(0, 2);
        this._spinFrom = this._wheel.rotation % (Math.PI * 2);
        this._spinTo = wheelAngleFor(this._spinResult, spins);
        this._spinT = 0; this._spinDur = 170; this._spinning = true; this._phase = "spin";
    };

    Scene_Roulette.prototype.update = function() {
        Scene_CasinoGameBase.prototype.update.call(this);
        if (this._spinning) {
            this._spinT++;
            const p = Math.min(1, this._spinT / this._spinDur);
            const e = 1 - Math.pow(1 - p, 3);
            this._wheel.rotation = this._spinFrom + (this._spinTo - this._spinFrom) * e;
            if (p >= 1) { this._spinning = false; this.onSpinEnd(); }
        }
    };

    Scene_Roulette.prototype.onSpinEnd = function() {
        const n = this._spinResult;
        this._ball.visible = true;
        const win = betWins(this._bet.key, n, this._bet.single);
        const gross = win ? this._stake * betMultiplier(this._bet.key) : 0;
        if (gross > 0) this.payout(gross);
        if (win) CasinoCore.se.win(); else CasinoCore.se.lose();
        this.recordResult({ wagered: this._stake, won: gross });
        const msg = win ? ("WIN!  +" + (gross - this._stake)) : ("No win  \u2212" + this._stake);
        this._status.set(msg, n, win);
        this.setPhase("result");
        this._choices.setItems([{ name: "Play Again", symbol: "again" }, { name: "Leave", symbol: "leave" }]);
    };

    Scene_Roulette.prototype.onPlayAgain = function() { this.setPhase("amount"); };

    window.Scene_Roulette = Scene_Roulette;

    CasinoCore.registerGame({
        key: "roulette",
        name: "Roulette",
        description: "American double-zero wheel. Straight up pays 35:1.",
        scene: Scene_Roulette,
        minBet: 5,
        maxBet: 5000,
        unlockSwitchId: 0
    });
})();
