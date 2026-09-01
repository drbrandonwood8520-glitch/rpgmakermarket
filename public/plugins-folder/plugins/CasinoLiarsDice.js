//=============================================================================
// CasinoLiarsDice.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Liar's Dice bluff duel vs the house, for the CasinoCore
 * framework. Requires CasinoCore.js loaded ABOVE this plugin.
 * @author You
 * @base CasinoCore
 * @orderAfter CasinoCore
 *
 * @help
 * A single-round Liar's Dice wager against the house (even money on your ante).
 * You and the house each roll five hidden dice. Players take turns raising a
 * bid about how many of a face value are showing across ALL ten dice. A bid is
 * (quantity x face). Each raise must be a higher quantity, or the same quantity
 * with a higher face. Instead of raising, you may call "Liar!" on the last bid:
 *
 *   - If at least (quantity) dice really show that face, the bid was TRUE and
 *     the challenger loses.
 *   - Otherwise the bidder was bluffing and the bidder loses.
 *
 * Ones are NOT wild in this version (keeps the odds transparent). You bid first.
 * Win -> even money (2x ante). Lose -> forfeit the ante.
 *
 * Registers itself with CasinoCore; appears automatically in the hub. To turn
 * this into a multi-round elimination game later, keep the bid/probability
 * helpers and loop rounds, removing a die from the loser each round.
 */

(() => {
    "use strict";
    if (!window.CasinoCore) {
        console.error("CasinoLiarsDice.js requires CasinoCore.js to be placed ABOVE it.");
        return;
    }
    if (!window.CasinoGfx) {
        console.error("CasinoLiarsDice.js requires CasinoVisuals.js above it (below CasinoCore).");
        return;
    }

    const countFace = (dice, f) => dice.filter(d => d === f).length;

    const bidHigher = (a, b) => {
        if (!b) return a.qty >= 1 && a.face >= 1 && a.face <= 6;
        return a.qty > b.qty || (a.qty === b.qty && a.face > b.face);
    };
    const nextMinimal = cur => {
        if (!cur) return { qty: 1, face: 2 };
        if (cur.face < 6) return { qty: cur.qty, face: cur.face + 1 };
        return { qty: cur.qty + 1, face: 1 };
    };
    const hasLegalRaise = cur => nextMinimal(cur).qty <= 10;

    function choose(n, k) {
        if (k < 0 || k > n) return 0;
        let r = 1;
        for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
        return r;
    }
    // P(X >= k) for X ~ Binomial(n, p)
    function binomAtLeast(k, n, p) {
        if (k <= 0) return 1;
        if (k > n) return 0;
        let prob = 0;
        for (let x = k; x <= n; x++) prob += choose(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x);
        return prob;
    }
    // House's confidence that a given bid is true, knowing its own 5 dice.
    function truthProb(bid, houseDice) {
        const known = countFace(houseDice, bid.face);
        const needed = bid.qty - known;
        return binomAtLeast(needed, 5, 1 / 6);
    }
    function chooseHouseRaise(cur, houseDice) {
        const cands = [];
        for (let f = (cur ? cur.face + 1 : 2); f <= 6; f++) cands.push({ qty: cur ? cur.qty : 1, face: f });
        const q2 = (cur ? cur.qty : 0) + 1;
        if (q2 <= 10) for (let f = 1; f <= 6; f++) cands.push({ qty: q2, face: f });
        const legal = cands.filter(c => bidHigher(c, cur));
        if (legal.length === 0) return null;
        legal.sort((a, b) => {
            const d = truthProb(b, houseDice) - truthProb(a, houseDice);
            if (Math.abs(d) > 0.001) return d;
            return a.qty - b.qty;
        });
        return legal[0];
    }

    function matBitmap(w, h) {
        const bmp = new Bitmap(w, h);
        const ctx = CasinoGfx.ctx(bmp);
        ctx.fillStyle = "#101013"; ctx.fillRect(0, 0, w, h);
        const m = 14;
        CasinoGfx.roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 26);
        ctx.fillStyle = "#0b0b0d"; ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = "#f4f4f4"; ctx.stroke();
        CasinoGfx.roundRect(ctx, m + 9, m + 9, w - 2 * m - 18, h - 2 * m - 18, 20);
        ctx.lineWidth = 2; ctx.strokeStyle = "#7a7a7a"; ctx.stroke();
        // faint rainbow "value" bars on each side (Perudo motif)
        const cols = ["#d5252b", "#e8802a", "#f2c53d", "#2fa15a", "#2f6fb0", "#2b2b2b"];
        ctx.globalAlpha = 0.4;
        for (let s = 0; s < 2; s++) {
            const bx = s === 0 ? m + 24 : w - m - 24 - cols.length * 9;
            for (let i = 0; i < cols.length; i++) {
                ctx.fillStyle = cols[i];
                ctx.fillRect(bx + i * 9, h * 0.28, 6, h * 0.44);
            }
        }
        ctx.globalAlpha = 1;
        CasinoGfx.update(bmp);
        return bmp;
    }

    //-------------------------------------------------------------------------
    // Window_LDStatus — table state
    //-------------------------------------------------------------------------
    function Window_LDStatus() { this.initialize(...arguments); }
    Window_LDStatus.prototype = Object.create(Window_Base.prototype);
    Window_LDStatus.prototype.constructor = Window_LDStatus;

    Window_LDStatus.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0;                      // draw straight onto the mat
        this._player = []; this._house = [];
        this._bid = null; this._reveal = false; this._result = "";
        this._log = [];
        this.computeLayout();
        this.refresh();
    };
    Window_LDStatus.prototype.computeLayout = function() {
        const w = this.innerWidth, h = this.innerHeight;
        const die = 46, gap = 12, rowW = 5 * die + 4 * gap;
        this._layout = {
            die, gap, rowW,
            startX: Math.round((w - rowW) / 2),
            houseY: 92,
            bidY: 158,
            playerY: h - die - 22
        };
    };
    Window_LDStatus.prototype.setDice = function(player, house) { this._player = player; this._house = house; this.refresh(); };
    Window_LDStatus.prototype.setBid = function(bid) { this._bid = bid; this.refresh(); };
    Window_LDStatus.prototype.setReveal = function(on, result) { this._reveal = on; this._result = result || ""; this.refresh(); };
    Window_LDStatus.prototype.reset = function() {
        this._player = []; this._house = []; this._bid = null;
        this._reveal = false; this._result = ""; this._log = []; this.refresh();
    };
    Window_LDStatus.prototype.log = function(text) {
        this._log.push(text); if (this._log.length > 4) this._log.shift(); this.refresh();
    };
    Window_LDStatus.prototype.rowSceneX = function() { return this.x + this.padding + this._layout.startX; };
    Window_LDStatus.prototype.houseCupBottom = function() {
        const L = this._layout; return this.y + this.padding + L.houseY + L.die + 8;
    };
    Window_LDStatus.prototype.playerRowScene = function() {
        const L = this._layout; return { x: this.rowSceneX(), y: this.y + this.padding + L.playerY };
    };
    Window_LDStatus.prototype.drawDiceRow = function(dice, x, y, body, pip) {
        const L = this._layout; let cx = x;
        for (const d of dice) { CasinoGfx.drawDie(this.contents, d, cx, y, L.die, body, pip); cx += L.die + L.gap; }
    };
    Window_LDStatus.prototype.drawSideLabel = function(text, rightX, cy) {
        const ctx = CasinoGfx.ctx(this.contents);
        ctx.save(); ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(text, rightX, cy); ctx.restore(); CasinoGfx.update(this.contents);
    };
    Window_LDStatus.prototype.drawBidPanel = function(y) {
        const w = this.innerWidth, ctx = CasinoGfx.ctx(this.contents);
        const pw = 264, ph = 64, px = (w - pw) / 2;
        CasinoGfx.drawPanel(this.contents, px, y, pw, ph, { radius: 10 });
        ctx.save(); ctx.textBaseline = "middle";
        if (this._bid) {
            ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.font = "16px sans-serif";
            ctx.fillText("Current bid", px + 16, y + 16);
            CasinoGfx.drawDie(this.contents, this._bid.face, px + 16, y + 26, 30, "#f2f2f2", "#1a1a1a");
            ctx.fillStyle = CasinoGfx.COLOR.goldHi; ctx.textAlign = "left"; ctx.font = "bold 26px sans-serif";
            ctx.fillText("\u00D7 " + this._bid.qty, px + 58, y + 40);
        } else {
            ctx.fillStyle = CasinoGfx.COLOR.goldHi; ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
            ctx.fillText("You open the bidding", w / 2, y + ph / 2);
        }
        ctx.restore(); CasinoGfx.update(this.contents);
    };
    Window_LDStatus.prototype.refresh = function() {
        this.contents.clear();
        const L = this._layout, w = this.innerWidth, ctx = CasinoGfx.ctx(this.contents);
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = CasinoGfx.COLOR.goldHi; ctx.font = "bold 26px sans-serif";
        ctx.fillText("LIAR'S DICE", w / 2, 16); ctx.restore();

        this.drawSideLabel("HOUSE", L.startX - 24, L.houseY + L.die / 2);
        this.drawDiceRow(this._house, L.startX, L.houseY, "#c1272d", "#ffffff");

        this.drawBidPanel(L.bidY);

        ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.font = "15px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const logY = L.bidY + 78;
        for (let i = 0; i < this._log.length; i++) ctx.fillText(this._log[i], w / 2, logY + i * 20);
        ctx.restore();

        if (this._result) {
            const good = this._result.startsWith("You win");
            ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = good ? CasinoGfx.COLOR.goldHi : "#e06666";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText(this._result, w / 2, L.playerY - 24); ctx.restore();
        }

        this.drawSideLabel("YOU", L.startX - 24, L.playerY + L.die / 2);
        this.drawDiceRow(this._player, L.startX, L.playerY, "#1f6fb0", "#ffffff");
        CasinoGfx.update(this.contents);
    };

    //-------------------------------------------------------------------------
    // Window_LDBid — build a (quantity x face) bid
    //-------------------------------------------------------------------------
    function Window_LDBid() { this.initialize(...arguments); }
    Window_LDBid.prototype = Object.create(Window_Selectable.prototype);
    Window_LDBid.prototype.constructor = Window_LDBid;

    Window_LDBid.prototype.initialize = function(rect) {
        this._qty = 1; this._face = 2; this._playerDice = [];
        Window_Selectable.prototype.initialize.call(this, rect);
        CasinoGfx.decoratePanel(this);
        this.refresh();
    };
    Window_LDBid.prototype.maxItems = function() { return 2; };
    Window_LDBid.prototype.maxCols = function() { return 1; };
    Window_LDBid.prototype.qty = function() { return this._qty; };
    Window_LDBid.prototype.face = function() { return this._face; };
    Window_LDBid.prototype.setup = function(cur, playerDice) {
        const m = nextMinimal(cur);
        this._qty = m.qty; this._face = m.face; this._playerDice = playerDice || [];
        this.refresh(); this.activate(); this.select(0);
    };
    Window_LDBid.prototype.adjust = function(d) {
        if (this.index() === 0) this._qty = Math.min(10, Math.max(1, this._qty + d));
        else this._face = Math.min(6, Math.max(1, this._face + d));
        SoundManager.playCursor();
        this.refresh();
    };
    Window_LDBid.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this.active) {
            if (Input.isRepeated("right")) this.adjust(1);
            else if (Input.isRepeated("left")) this.adjust(-1);
        }
    };
    Window_LDBid.prototype.updateCursor = function() { this.setCursorRect(0, 0, 0, 0); };
    Window_LDBid.prototype.ensureCursorVisible = function() { };
    Window_LDBid.prototype.select = function(i) {
        Window_Selectable.prototype.select.call(this, i);
        if (this.contents) this.refresh();
    };
    Window_LDBid.prototype.refresh = function() {
        this.contents.clear();
        const ctx = CasinoGfx.ctx(this.contents), w = this.innerWidth, lh = this.lineHeight();
        const idx = this.index();
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = CasinoGfx.COLOR.goldHi; ctx.font = "bold 20px sans-serif";
        ctx.fillText("RAISE YOUR BID", w / 2, lh * 0.5); ctx.restore();
        // quantity row
        const qy = lh * 1.5;
        if (idx === 0) { CasinoGfx.roundRect(ctx, 8, qy - lh * 0.45, w - 16, lh * 0.9, 8); ctx.fillStyle = "rgba(201,162,74,0.20)"; ctx.fill(); }
        ctx.save(); ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "left"; ctx.fillText("Quantity", 24, qy);
        ctx.textAlign = "center"; ctx.fillText("\u25C4    " + this._qty + "    \u25BA", w * 0.62, qy); ctx.restore();
        // face row with a die
        const fy = lh * 2.5;
        if (idx === 1) { CasinoGfx.roundRect(ctx, 8, fy - lh * 0.45, w - 16, lh * 0.9, 8); ctx.fillStyle = "rgba(201,162,74,0.20)"; ctx.fill(); }
        ctx.save(); ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "left"; ctx.fillText("Face", 24, fy);
        ctx.textAlign = "center"; ctx.fillText("\u25C4", w * 0.50, fy); ctx.fillText("\u25BA", w * 0.74, fy); ctx.restore();
        CasinoGfx.drawDie(this.contents, this._face, w * 0.62 - 16, fy - 16, 32, "#1f6fb0", "#fff");
        const have = countFace(this._playerDice, this._face);
        ctx.save(); ctx.textBaseline = "middle"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "14px sans-serif";
        ctx.fillText("you have " + have, w - 20, fy); ctx.restore();
        CasinoGfx.update(this.contents);
    };

    //-------------------------------------------------------------------------
    // Window_Bet (shared stepper)
    //-------------------------------------------------------------------------
    function Window_Bet() { this.initialize(...arguments); }
    Window_Bet.prototype = Object.create(Window_Selectable.prototype);
    Window_Bet.prototype.constructor = Window_Bet;
    Window_Bet.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._min = 1; this._max = 1; this._step = 1; this._value = 1;
        CasinoGfx.decoratePanel(this);
        this.refresh();
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
        const lh = this.lineHeight(), w = this.innerWidth;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Ante up", 0, 0, w, "center");
        this.resetTextColor();
        this.drawText("\u25C4   " + this._value + "   \u25BA", 0, lh, w, "center");
        this.changeTextColor(ColorManager.textColor(8));
        this.drawText("Left/Right \u2022 Q/W = x10 \u2022 OK to roll", 0, lh * 2, w, "center");
        this.resetTextColor();
    };

    //-------------------------------------------------------------------------
    // Window_Choices (shared)
    //-------------------------------------------------------------------------
    function Window_Choices() { this.initialize(...arguments); }
    Window_Choices.prototype = Object.create(Window_Command.prototype);
    Window_Choices.prototype.constructor = Window_Choices;
    Window_Choices.prototype.initialize = function(rect) {
        Window_Command.prototype.initialize.call(this, rect);
        CasinoGfx.decoratePanel(this);
    };
    Window_Choices.prototype.setItems = function(items) {
        this._items = items; this.refresh(); this.select(0); this.activate();
    };
    Window_Choices.prototype.makeCommandList = function() {
        if (!this._items) return;
        for (const it of this._items) this.addCommand(it.name, it.symbol, it.enabled !== false);
    };

    //-------------------------------------------------------------------------
    // Scene_LiarsDice
    //-------------------------------------------------------------------------
    function Scene_LiarsDice() { this.initialize(...arguments); }
    Scene_LiarsDice.prototype = Object.create(Scene_CasinoGameBase.prototype);
    Scene_LiarsDice.prototype.constructor = Scene_LiarsDice;

    Scene_LiarsDice.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite(matBitmap(Graphics.width, Graphics.height));
        this.addChild(this._backgroundSprite);
    };

    Scene_LiarsDice.prototype.createGameObjects = function() {
        this._topY = this._balanceWindow.height;
        this._panelH = this.calcWindowHeight(3, true);
        this._anim = null;
        this.createStatusWindow();
        this.createCups();
        this.createBetWindow();
        this.createBidWindow();
        this.createChoiceWindow();
        this.setPhase("ante");
    };
    Scene_LiarsDice.prototype.createCups = function() {
        const L = this._status._layout;
        // house cup (covers the house dice)
        this._houseCupBottomY = this._status.houseCupBottom();
        this._houseCup = new Sprite(CasinoGfx.cupBitmap(L.rowW + 40, 100, "#c1272d"));
        this._houseCup.anchor.set(0.5, 1);
        this._houseCup.x = this._status.rowSceneX() + L.rowW / 2;
        this._houseCup.y = this._houseCupBottomY;
        this._houseCup.visible = false;
        this.addChild(this._houseCup);
        // player cup (tilted/lifted beside the player dice, decorative)
        const pr = this._status.playerRowScene();
        this._playerCup = new Sprite(CasinoGfx.cupBitmap(78, 104, "#1f6fb0"));
        this._playerCup.anchor.set(0.5, 1);
        this._playerCup.rotation = -0.32;
        this._playerCup.x = pr.x - 52;
        this._playerCup.y = pr.y + L.die + 10;
        this._playerCup.visible = false;
        this.addChild(this._playerCup);
    };
    Scene_LiarsDice.prototype.createStatusWindow = function() {
        const h = Graphics.boxHeight - this._topY - this._panelH;
        this._status = new Window_LDStatus(new Rectangle(0, this._topY, Graphics.boxWidth, h));
        this.addWindow(this._status);
    };
    Scene_LiarsDice.prototype.createBetWindow = function() {
        const w = 440;
        this._betWindow = new Window_Bet(new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - this._panelH, w, this._panelH));
        this._betWindow.setHandler("ok", this.onAnteOk.bind(this));
        this._betWindow.setHandler("cancel", this.returnToHub.bind(this));
        this.addWindow(this._betWindow);
    };
    Scene_LiarsDice.prototype.createBidWindow = function() {
        const w = 480;
        this._bidWindow = new Window_LDBid(new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - this._panelH, w, this._panelH));
        this._bidWindow.setHandler("ok", this.onBidOk.bind(this));
        this._bidWindow.setHandler("cancel", this.onBidCancel.bind(this));
        this.addWindow(this._bidWindow);
    };
    Scene_LiarsDice.prototype.createChoiceWindow = function() {
        const w = 400;
        this._choices = new Window_Choices(new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - this._panelH, w, this._panelH));
        this._choices.setHandler("raise", this.onRaise.bind(this));
        this._choices.setHandler("challenge", this.onChallenge.bind(this));
        this._choices.setHandler("again", this.onPlayAgain.bind(this));
        this._choices.setHandler("leave", this.returnToHub.bind(this));
        this.addWindow(this._choices);
    };

    Scene_LiarsDice.prototype.setPhase = function(phase) {
        this._phase = phase;
        const set = (win, on) => { if (win) { win.visible = on; win.active = on; } };
        set(this._betWindow, phase === "ante");
        set(this._bidWindow, phase === "bid");
        set(this._choices, phase === "turn" || phase === "result");

        if (phase === "ante") {
            this._anim = null;
            if (this._houseCup) { this._houseCup.visible = false; this._houseCup.alpha = 1; }
            if (this._playerCup) this._playerCup.visible = false;
            this._status.reset();
            const max = this.maxBet();
            if (max < this.minBet()) {
                this._status.setReveal(false, "");
                this._status.log("Not enough chips to play.");
                set(this._betWindow, false);
                set(this._choices, true);
                this._choices.setItems([{ name: "Leave", symbol: "leave" }]);
                return;
            }
            this._betWindow.setup(this.minBet(), max, this.minBet());
        }
    };

    Scene_LiarsDice.prototype.onAnteOk = function() {
        const wager = this._betWindow.value();
        if (!this.bet(wager)) { this._betWindow.activate(); return; }
        this._stake = wager;
        this._playerDice = CasinoCore.rng.rollDice(5, 6);
        this._houseDice = CasinoCore.rng.rollDice(5, 6);
        this._currentBid = null;
        this._lastBidder = null;
        // put the cups on the table: house covered, your cup lifted
        this._houseCup.visible = true; this._houseCup.alpha = 1; this._houseCup.y = this._houseCupBottomY;
        this._playerCup.visible = true;
        this._betWindow.visible = false; this._betWindow.active = false;
        this._status.setBid(null); this._status.setReveal(false, "");
        CasinoCore.se.deal();
        // roll animation: your dice tumble in the open; the house dice stay hidden
        this._status.setDice(CasinoCore.rng.rollDice(5, 6), this._houseDice);
        this._phase = "roll";
        this._anim = { type: "roll", t: 0, dur: 26 };
    };
    Scene_LiarsDice.prototype.afterRoll = function() {
        this._status.log("You rolled. Make the opening bid.");
        this.enterPlayerTurn();
    };
    Scene_LiarsDice.prototype.easeOut = function(p) { return 1 - Math.pow(1 - p, 3); };
    Scene_LiarsDice.prototype.update = function() {
        Scene_CasinoGameBase.prototype.update.call(this);
        const a = this._anim;
        if (!a) return;
        a.t++;
        const p = Math.min(1, a.t / a.dur);
        if (a.type === "roll") {
            if (a.t % 3 === 0) this._status.setDice(CasinoCore.rng.rollDice(5, 6), this._houseDice);
            if (p >= 1) { this._anim = null; this._status.setDice(this._playerDice, this._houseDice); this.afterRoll(); }
        } else if (a.type === "lift") {
            this._houseCup.y = a.fromY - a.rise * this.easeOut(p);
            this._houseCup.alpha = 1 - p;
            if (p >= 1) {
                this._anim = null; this._houseCup.visible = false; this._houseCup.alpha = 1;
                if (a.onDone) a.onDone();
            }
        }
    };

    Scene_LiarsDice.prototype.enterPlayerTurn = function() {
        this._status.setBid(this._currentBid);
        this.setPhase("turn");
        const items = [];
        const canRaise = hasLegalRaise(this._currentBid);
        items.push({ name: canRaise ? "Raise Bid" : "Raise (maxed)", symbol: "raise", enabled: canRaise });
        if (this._currentBid) items.push({ name: "Call Liar!", symbol: "challenge" });
        this._choices.setItems(items);
    };

    Scene_LiarsDice.prototype.onRaise = function() {
        this.setPhase("bid");
        this._bidWindow.setup(this._currentBid, this._playerDice);
    };
    Scene_LiarsDice.prototype.onBidCancel = function() { this.enterPlayerTurn(); };

    Scene_LiarsDice.prototype.onBidOk = function() {
        const bid = { qty: this._bidWindow.qty(), face: this._bidWindow.face() };
        if (!bidHigher(bid, this._currentBid)) { SoundManager.playBuzzer(); this._bidWindow.activate(); return; }
        this._currentBid = bid;
        this._lastBidder = "player";
        this._status.log("You bid " + bid.qty + " x [" + bid.face + "]");
        this._status.setBid(bid);
        this.houseTurn();
    };

    Scene_LiarsDice.prototype.onChallenge = function() {
        this._status.log("You call LIAR on " + this._currentBid.qty + " x [" + this._currentBid.face + "]!");
        this.resolveChallenge("player");
    };

    Scene_LiarsDice.prototype.houseTurn = function() {
        const cur = this._currentBid;
        if (!hasLegalRaise(cur) || truthProb(cur, this._houseDice) < 0.30) {
            this._status.log("House calls LIAR on " + cur.qty + " x [" + cur.face + "]!");
            this.resolveChallenge("house");
            return;
        }
        const bid = chooseHouseRaise(cur, this._houseDice);
        if (!bid) { this.resolveChallenge("house"); return; }
        this._currentBid = bid;
        this._lastBidder = "house";
        this._status.log("House bids " + bid.qty + " x [" + bid.face + "]");
        this._status.setBid(bid);
        this.enterPlayerTurn();
    };

    Scene_LiarsDice.prototype.resolveChallenge = function(challenger) {
        const bid = this._currentBid;
        const pc = countFace(this._playerDice, bid.face);
        const hc = countFace(this._houseDice, bid.face);
        const total = pc + hc;
        const truthful = total >= bid.qty;
        const bidder = challenger === "house" ? "player" : "house";
        const loser = truthful ? challenger : bidder;
        const playerWins = loser !== "player";

        const gross = playerWins ? this._stake * 2 : 0;
        if (gross > 0) this.payout(gross);
        if (playerWins) CasinoCore.se.win(); else CasinoCore.se.lose();
        this.recordResult({ wagered: this._stake, won: gross });

        this._status.log("Face [" + bid.face + "] count: " + total + "  (you " + pc + ", house " + hc + ")  \u2014 needed " + bid.qty);
        const result = playerWins ? ("You win!  +" + this._stake) : ("You lose " + this._stake + ".");

        // hide interaction, then lift the house cup to reveal its dice
        [this._betWindow, this._bidWindow, this._choices].forEach(w => { w.visible = false; w.active = false; });
        this._phase = "reveal";
        this._houseCup.visible = true;
        this._anim = {
            type: "lift", t: 0, dur: 28, fromY: this._houseCup.y, rise: 160,
            onDone: () => {
                this._status.setReveal(true, result);
                this.setPhase("result");
                this._choices.setItems([
                    { name: "Play Again", symbol: "again" },
                    { name: "Leave", symbol: "leave" }
                ]);
            }
        };
    };

    Scene_LiarsDice.prototype.onPlayAgain = function() { this.setPhase("ante"); };

    window.Scene_LiarsDice = Scene_LiarsDice;

    CasinoCore.registerGame({
        key: "liarsdice",
        name: "Liar's Dice",
        description: "Out-bluff the house. Raise the bid or call their lie.",
        scene: Scene_LiarsDice,
        minBet: 10,
        maxBet: 3000,
        unlockSwitchId: 0
    });
})();
