//=============================================================================
// CasinoPoker.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v2.0.0] Video Poker (Jacks or Better) on an oval poker table with
 * dealt, flipping cards. Requires CasinoCore.js and CasinoVisuals.js above it.
 * @author You
 * @base CasinoCore
 * @orderAfter CasinoVisuals
 *
 * @help
 * Jacks-or-Better video poker on a felt poker table. Five cards are dealt in and
 * flip face-up; hold the ones you want, then draw and the rest flip to new cards.
 * Payout = bet x the paytable multiplier.
 *
 * Controls during the hold phase:
 *   Arrows  - move between cards
 *   OK      - toggle HOLD on the selected card
 *   Shift   - draw
 */

(() => {
    "use strict";
    if (!window.CasinoCore) { console.error("CasinoPoker.js requires CasinoCore.js."); return; }
    if (!window.CasinoGfx) { console.error("CasinoPoker.js requires CasinoVisuals.js above it."); return; }
    const G = CasinoGfx;
    const CW = 64, CH = 90;

    const PAYS = [
        ["Royal Flush", 250, "royal"], ["Straight Flush", 50, "sflush"],
        ["Four of a Kind", 25, "four"], ["Full House", 9, "full"],
        ["Flush", 6, "flush"], ["Straight", 4, "straight"],
        ["Three of a Kind", 3, "trips"], ["Two Pair", 2, "twopair"],
        ["Jacks or Better", 1, "jacks"]
    ];

    function evaluate(cards) {
        const values = cards.map(c => (c.rank === "A" ? 14 : c.rankIndex + 1));
        const counts = {};
        for (const v of values) counts[v] = (counts[v] || 0) + 1;
        const countVals = Object.values(counts).sort((a, b) => b - a);
        const suits = cards.map(c => c.suit);
        const isFlush = suits.every(s => s === suits[0]);
        const uniq = [...new Set(values)].sort((a, b) => a - b);
        let isStraight = false, high = 0;
        if (uniq.length === 5) {
            if (uniq[4] - uniq[0] === 4) { isStraight = true; high = uniq[4]; }
            else if (uniq[0] === 2 && uniq[1] === 3 && uniq[2] === 4 && uniq[3] === 5 && uniq[4] === 14) { isStraight = true; high = 5; }
        }
        const isRoyal = isStraight && isFlush && high === 14;
        const hasHighPair = Object.entries(counts).some(([v, c]) => c === 2 && Number(v) >= 11);
        if (isRoyal) return { name: "Royal Flush", mult: 250, key: "royal" };
        if (isStraight && isFlush) return { name: "Straight Flush", mult: 50, key: "sflush" };
        if (countVals[0] === 4) return { name: "Four of a Kind", mult: 25, key: "four" };
        if (countVals[0] === 3 && countVals[1] === 2) return { name: "Full House", mult: 9, key: "full" };
        if (isFlush) return { name: "Flush", mult: 6, key: "flush" };
        if (isStraight) return { name: "Straight", mult: 4, key: "straight" };
        if (countVals[0] === 3) return { name: "Three of a Kind", mult: 3, key: "trips" };
        if (countVals[0] === 2 && countVals[1] === 2) return { name: "Two Pair", mult: 2, key: "twopair" };
        if (hasHighPair) return { name: "Jacks or Better", mult: 1, key: "jacks" };
        return { name: "No Win", mult: 0, key: "none" };
    }

    //-------------------------------------------------------------------------
    // Window_VPPaytable (themed)
    //-------------------------------------------------------------------------
    function Window_VPPaytable() { this.initialize(...arguments); }
    Window_VPPaytable.prototype = Object.create(Window_CasinoBase.prototype);
    Window_VPPaytable.prototype.constructor = Window_VPPaytable;
    Window_VPPaytable.prototype.initialize = function(rect) {
        Window_CasinoBase.prototype.initialize.call(this, rect);
        this._highlight = ""; this.refresh();
    };
    Window_VPPaytable.prototype.setHighlight = function(k) { this._highlight = k; this.refresh(); };
    Window_VPPaytable.prototype.refresh = function() {
        this.contents.clear();
        const lh = this.lineHeight(), w = this.innerWidth, ctx = G.ctx(this.contents);
        ctx.save(); ctx.fillStyle = G.COLOR.goldHi; ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("PAYTABLE", w / 2, lh / 2); ctx.restore();
        PAYS.forEach((row, i) => {
            const y = lh * (i + 1) + lh / 2, hit = row[2] === this._highlight;
            if (hit) { G.roundRect(ctx, -2, y - lh / 2 + 2, w + 4, lh - 4, 6); ctx.fillStyle = "rgba(201,162,74,0.22)"; ctx.fill(); }
            ctx.save(); ctx.fillStyle = hit ? G.COLOR.goldHi : "#e8e8e8";
            ctx.font = (hit ? "bold " : "") + "17px sans-serif"; ctx.textBaseline = "middle";
            ctx.textAlign = "left"; ctx.fillText(row[0], 4, y);
            ctx.textAlign = "right"; ctx.fillText("x" + row[1], w - 4, y); ctx.restore();
        });
        G.update(this.contents);
    };

    //-------------------------------------------------------------------------
    // Window_VPHand — transparent selection layer over the card sprites
    //-------------------------------------------------------------------------
    function Window_VPHand() { this.initialize(...arguments); }
    Window_VPHand.prototype = Object.create(Window_Selectable.prototype);
    Window_VPHand.prototype.constructor = Window_VPHand;
    Window_VPHand.prototype.initialize = function(rect) {
        this._held = [false, false, false, false, false];
        this._slots = [];             // scene-space centres of the 5 cards
        this._drawHandler = null;
        Window_Selectable.prototype.initialize.call(this, rect);
        this.opacity = 0;
        this.refresh();
    };
    Window_VPHand.prototype.updatePadding = function() { this.padding = 0; };
    Window_VPHand.prototype.setSlots = function(slots) { this._slots = slots; this.refresh(); };
    Window_VPHand.prototype.resetHolds = function() { this._held = [false, false, false, false, false]; this.refresh(); };
    Window_VPHand.prototype.setDrawHandler = function(fn) { this._drawHandler = fn; };
    Window_VPHand.prototype.maxCols = function() { return 5; };
    Window_VPHand.prototype.maxItems = function() { return 5; };
    Window_VPHand.prototype.heldFlags = function() { return this._held.slice(); };
    Window_VPHand.prototype.toggleHold = function() { const i = this.index(); if (i >= 0) { this._held[i] = !this._held[i]; this.refresh(); } };
    Window_VPHand.prototype.updateCursor = function() { this.setCursorRect(0, 0, 0, 0); };
    Window_VPHand.prototype.ensureCursorVisible = function() { };
    Window_VPHand.prototype.itemRect = function(i) {
        const s = this._slots[i]; if (!s) return new Rectangle(0, 0, 1, 1);
        return new Rectangle(s.x - CW / 2 - 6, s.y - CH / 2 - 6, CW + 12, CH + 12);
    };
    Window_VPHand.prototype.refresh = function() {
        this.contents.clear();
        const ctx = G.ctx(this.contents);
        const slots = this._slots || [], held = this._held || [];
        for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            if (held[i]) {
                G.roundRect(ctx, s.x - CW / 2 - 6, s.y - CH / 2 - 6, CW + 12, CH + 12, 10);
                ctx.lineWidth = 3; ctx.strokeStyle = G.COLOR.goldHi; ctx.stroke();
                const rw = 54, rh = 20, rx = s.x - rw / 2, ry = s.y + CH / 2 + 8;
                G.roundRect(ctx, rx, ry, rw, rh, 6); ctx.fillStyle = G.COLOR.gold; ctx.fill();
                ctx.fillStyle = "#1a1000"; ctx.font = "bold 14px sans-serif";
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText("HELD", s.x, ry + rh / 2);
            }
            if (i === this.index() && this.active) {
                G.roundRect(ctx, s.x - CW / 2 - 8, s.y - CH / 2 - 8, CW + 16, CH + 16, 12);
                ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.stroke();
            }
        }
        G.update(this.contents);
    };
    Window_VPHand.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this.active && this._drawHandler && Input.isTriggered("shift")) this._drawHandler();
    };
    const _sel = Window_VPHand.prototype.select;
    Window_VPHand.prototype.select = function(i) { _sel.call(this, i); this.refresh(); };

    //-------------------------------------------------------------------------
    // Window_VPInfo + shared bet/choices
    //-------------------------------------------------------------------------
    function Window_VPInfo() { this.initialize(...arguments); }
    Window_VPInfo.prototype = Object.create(Window_CasinoBase.prototype);
    Window_VPInfo.prototype.constructor = Window_VPInfo;
    Window_VPInfo.prototype.initialize = function(rect) {
        Window_CasinoBase.prototype.initialize.call(this, rect);
        this._l1 = ""; this._l2 = ""; this.refresh();
    };
    Window_VPInfo.prototype.setText = function(a, b) { this._l1 = a || ""; this._l2 = b || ""; this.refresh(); };
    Window_VPInfo.prototype.refresh = function() {
        this.contents.clear();
        const ctx = G.ctx(this.contents);
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = G.COLOR.goldHi; ctx.font = "bold 20px sans-serif";
        ctx.fillText(this._l1, this.innerWidth / 2, this.lineHeight() * 0.6);
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "14px sans-serif";
        ctx.fillText(this._l2, this.innerWidth / 2, this.lineHeight() * 1.5);
        ctx.restore(); G.update(this.contents);
    };

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
        ctx.fillText("Left/Right \u2022 Q/W = x10 \u2022 OK to deal", w / 2, lh * 2.6);
        ctx.restore(); G.update(this.contents);
    };

    function Window_Choices() { this.initialize(...arguments); }
    Window_Choices.prototype = Object.create(Window_Command.prototype);
    Window_Choices.prototype.constructor = Window_Choices;
    Window_Choices.prototype.initialize = function(rect) { Window_Command.prototype.initialize.call(this, rect); G.decoratePanel(this); };
    Window_Choices.prototype.setItems = function(items) { this._items = items; this.refresh(); this.select(0); this.activate(); };
    Window_Choices.prototype.makeCommandList = function() {
        if (!this._items) return;
        for (const it of this._items) this.addCommand(it.name, it.symbol, it.enabled !== false);
    };

    //-------------------------------------------------------------------------
    // Scene_VideoPoker
    //-------------------------------------------------------------------------
    function Scene_VideoPoker() { this.initialize(...arguments); }
    Scene_VideoPoker.prototype = Object.create(Scene_CasinoGameBase.prototype);
    Scene_VideoPoker.prototype.constructor = Scene_VideoPoker;

    Scene_VideoPoker.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite(G.pokerTableBitmap(Graphics.width, Graphics.height));
        this.addChild(this._backgroundSprite);
    };
    Scene_VideoPoker.prototype.createGameObjects = function() {
        this._deck = new CasinoCore.Deck(1);
        this._panelH = this.calcWindowHeight(3, true);
        this._cardSprites = [];
        this._waitFrames = 0; this._afterWait = null;
        this._slots = this.computeSlots();
        this.createPaytableWindow();
        this.createHandWindow();
        this.createInfoWindow();
        this.createBetWindow();
        this.createChoiceWindow();
        this.setPhase("bet");
    };
    Scene_VideoPoker.prototype.computeSlots = function() {
        const cy = Graphics.boxHeight * 0.5;
        // Sit the hand to the right of the paytable panel (which ends near x=278).
        const spacing = CW + 32, startX = 320;
        this._groupCx = startX + spacing * 2;
        const slots = [];
        for (let i = 0; i < 5; i++) slots.push({ x: startX + i * spacing, y: cy });
        return slots;
    };
    Scene_VideoPoker.prototype.createPaytableWindow = function() {
        const h = this.calcWindowHeight(10, true);
        this._paytable = new Window_VPPaytable(new Rectangle(14, 70, 264, h));
        this.addWindow(this._paytable);
    };
    Scene_VideoPoker.prototype.createHandWindow = function() {
        this._hand = new Window_VPHand(new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight));
        this._hand.setSlots(this._slots);
        this._hand.setHandler("ok", this.onToggleHold.bind(this));
        this._hand.setDrawHandler(this.onDraw.bind(this));
        this.addWindow(this._hand);
    };
    Scene_VideoPoker.prototype.createInfoWindow = function() {
        const w = 460, gx = this._groupCx || Graphics.boxWidth / 2;
        this._info = new Window_VPInfo(new Rectangle(gx - w / 2, Graphics.boxHeight * 0.5 + CH / 2 + 44, w, this.calcWindowHeight(2, false)));
        this.addWindow(this._info);
    };
    Scene_VideoPoker.prototype.bottomRect = function(w) {
        return new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - this._panelH, w, this._panelH);
    };
    Scene_VideoPoker.prototype.createBetWindow = function() {
        this._betWindow = new Window_Bet(this.bottomRect(460));
        this._betWindow.setHandler("ok", this.onBetOk.bind(this));
        this._betWindow.setHandler("cancel", this.returnToHub.bind(this));
        this.addWindow(this._betWindow);
    };
    Scene_VideoPoker.prototype.createChoiceWindow = function() {
        this._choices = new Window_Choices(this.bottomRect(380));
        this._choices.setHandler("again", this.onPlayAgain.bind(this));
        this._choices.setHandler("leave", this.returnToHub.bind(this));
        this.addWindow(this._choices);
    };

    Scene_VideoPoker.prototype.wait = function(frames, cb) { this._waitFrames = frames; this._afterWait = cb; };
    Scene_VideoPoker.prototype.update = function() {
        Scene_CasinoGameBase.prototype.update.call(this);
        if (this._waitFrames > 0) {
            this._waitFrames--;
            if (this._waitFrames === 0 && this._afterWait) { const cb = this._afterWait; this._afterWait = null; cb(); }
        }
    };
    Scene_VideoPoker.prototype.clearCards = function() {
        for (const s of this._cardSprites) this.removeChild(s);
        this._cardSprites = [];
    };

    Scene_VideoPoker.prototype.setPhase = function(phase) {
        this._phase = phase;
        this._betWindow.visible = this._betWindow.active = (phase === "bet");
        this._hand.active = (phase === "hold");
        this._choices.visible = this._choices.active = (phase === "result");
        if (phase === "bet") {
            this.clearCards();
            this._paytable.setHighlight("");
            this._hand.resetHolds();
            this._info.setText("", "");
            const max = this.maxBet();
            if (max < this.minBet()) {
                this._info.setText("Not enough chips to play.", "");
                this._betWindow.visible = false;
                this._choices.visible = true;
                this._choices.setItems([{ name: "Leave", symbol: "leave" }]);
                return;
            }
            this._betWindow.setup(this.minBet(), max, this.minBet());
        } else if (phase === "hold") {
            this._hand.activate(); this._hand.select(0);
            this._info.setText("Hold cards to keep.", "OK = hold  \u2022  Shift = draw");
        }
    };

    Scene_VideoPoker.prototype.onBetOk = function() {
        const wager = this._betWindow.value();
        if (!this.bet(wager)) { this._betWindow.activate(); return; }
        this._stake = wager;
        this._deck.reset(); this._deck.shuffle();
        this._cards = this._deck.drawMany(5);
        this._betWindow.visible = false; this._betWindow.active = false;
        this._hand.resetHolds();
        this.clearCards();
        this._cardSprites = this._cards.map((c, i) => {
            const s = new Sprite_Card(c, false, CW, CH);
            this.addChild(s);
            const slot = this._slots[i];
            s.dealFrom(Graphics.boxWidth - 54, 60, slot.x, slot.y, 14, i * 8, true);
            return s;
        });
        CasinoCore.se.deal();
        this._info.setText("Dealing\u2026", "");
        this.wait(4 * 8 + 14 + 18, () => this.setPhase("hold"));
    };

    Scene_VideoPoker.prototype.onToggleHold = function() { this._hand.toggleHold(); this._hand.activate(); };

    Scene_VideoPoker.prototype.onDraw = function() {
        const held = this._hand.heldFlags();
        this._hand.active = false;
        let anyReplaced = false;
        for (let i = 0; i < 5; i++) {
            if (!held[i]) {
                this._cards[i] = this._deck.draw();
                this._cardSprites[i].replaceWithFlip(this._cards[i], 16);
                anyReplaced = true;
            }
        }
        CasinoCore.se.deal();
        this._info.setText("Drawing\u2026", "");
        this.wait(anyReplaced ? 40 : 6, () => this.finishHand());
    };

    Scene_VideoPoker.prototype.finishHand = function() {
        const res = evaluate(this._cards);
        const gross = this._stake * res.mult;
        if (gross > 0) this.payout(gross);
        if (res.mult > 1) CasinoCore.se.win(); else if (res.mult === 0) CasinoCore.se.lose();
        this.recordResult({ wagered: this._stake, won: gross });
        this._paytable.setHighlight(res.key);
        let l1;
        if (res.mult === 0) l1 = "No win \u2014 lost " + this._stake + ".";
        else if (res.mult === 1) l1 = res.name + " \u2014 bet returned.";
        else l1 = res.name + "!  +" + (gross - this._stake);
        this._info.setText(l1, "");
        this.setPhase("result");
        this._choices.setItems([{ name: "Play Again", symbol: "again" }, { name: "Leave", symbol: "leave" }]);
    };

    Scene_VideoPoker.prototype.onPlayAgain = function() { this.setPhase("bet"); };

    window.Scene_VideoPoker = Scene_VideoPoker;

    CasinoCore.registerGame({
        key: "videopoker",
        name: "Video Poker",
        description: "Jacks or Better. Hold, draw, and hit the paytable.",
        scene: Scene_VideoPoker,
        minBet: 5,
        maxBet: 2000,
        unlockSwitchId: 0
    });
})();
