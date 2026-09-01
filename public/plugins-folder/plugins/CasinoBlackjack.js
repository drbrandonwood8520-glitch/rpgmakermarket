//=============================================================================
// CasinoBlackjack.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v2.0.0] Blackjack on a real casino "D" table with dealt cards and a
 * hole-card flip. Requires CasinoCore.js and CasinoVisuals.js above it.
 * @author You
 * @base CasinoCore
 * @orderAfter CasinoVisuals
 *
 * @help
 * Single-hand blackjack vs the dealer on a curved felt table. Cards are dealt in
 * one at a time and flip face-up; the dealer's hole card flips on the reveal.
 * Blackjack pays 3:2, dealer stands on 17, with Hit / Stand / Double Down.
 * Registers itself with CasinoCore and appears in the hub automatically.
 */

(() => {
    "use strict";
    if (!window.CasinoCore) { console.error("CasinoBlackjack.js requires CasinoCore.js."); return; }
    if (!window.CasinoGfx) { console.error("CasinoBlackjack.js requires CasinoVisuals.js above it."); return; }
    const G = CasinoGfx;

    const CW = 66, CH = 92;

    function handValue(cards) {
        let total = 0, aces = 0;
        for (const c of cards) {
            if (c.rank === "A") { aces++; total += 11; }
            else if (c.rank === "K" || c.rank === "Q" || c.rank === "J" || c.rank === "10") total += 10;
            else total += Number(c.rank);
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
    }
    const isNaturalBJ = cards => cards.length === 2 && handValue(cards) === 21;

    //-------------------------------------------------------------------------
    // Window_Overlay — transparent layer for value badges + centre message
    //-------------------------------------------------------------------------
    function Window_Overlay() { this.initialize(...arguments); }
    Window_Overlay.prototype = Object.create(Window_Base.prototype);
    Window_Overlay.prototype.constructor = Window_Overlay;
    Window_Overlay.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0;
        this._info = { dv: "", pv: "", msg: "", bet: 0 };
        this._layout = null;
    };
    Window_Overlay.prototype.updatePadding = function() { this.padding = 0; };
    Window_Overlay.prototype.setLayout = function(L) { this._layout = L; this.refresh(); };
    Window_Overlay.prototype.setInfo = function(info) { Object.assign(this._info, info); this.refresh(); };
    Window_Overlay.prototype.badge = function(ctx, text, cx, cy) {
        const w = Math.max(46, 22 + text.length * 13), h = 30;
        G.roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8);
        ctx.fillStyle = "rgba(6,26,17,0.85)"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = G.COLOR.gold; ctx.stroke();
        ctx.fillStyle = G.COLOR.goldHi; ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy + 1);
    };
    Window_Overlay.prototype.refresh = function() {
        this.contents.clear();
        if (!this._layout) return;
        const L = this._layout, ctx = G.ctx(this.contents), I = this._info;
        if (I.dv !== "") this.badge(ctx, "Dealer  " + I.dv, L.cx, L.dealerY - CH / 2 - 22);
        if (I.pv !== "") this.badge(ctx, "You  " + I.pv, L.cx, L.playerY + CH / 2 + 22);
        if (I.bet > 0) G.drawChip(this.contents, I.bet, L.cx - 120, L.playerY + CH / 2 + 22, 20);
        if (I.msg) {
            ctx.save();
            ctx.fillStyle = G.COLOR.goldHi; ctx.font = "bold 30px sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 6;
            ctx.fillText(I.msg, L.cx, (L.dealerY + L.playerY) / 2);
            ctx.restore();
        }
        G.update(this.contents);
    };

    //-------------------------------------------------------------------------
    // Shared themed bet stepper + choices
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
        ctx.fillText("Left/Right \u2022 Q/W = x10 \u2022 OK to deal", w / 2, lh * 2.6);
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
    // Scene_Blackjack
    //-------------------------------------------------------------------------
    function Scene_Blackjack() { this.initialize(...arguments); }
    Scene_Blackjack.prototype = Object.create(Scene_CasinoGameBase.prototype);
    Scene_Blackjack.prototype.constructor = Scene_Blackjack;

    Scene_Blackjack.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite(G.blackjackTableBitmap(Graphics.width, Graphics.height));
        this.addChild(this._backgroundSprite);
    };

    Scene_Blackjack.prototype.createGameObjects = function() {
        this._deck = new CasinoCore.Deck(6); this._deck.shuffle();
        this._panelH = this.calcWindowHeight(3, true);
        this._layout = {
            cx: Graphics.boxWidth / 2,
            dealerY: 150,
            playerY: Graphics.boxHeight - 250,
            shoeX: Graphics.boxWidth - 54, shoeY: 60
        };
        this._playerSprites = []; this._dealerSprites = [];
        this._waitFrames = 0; this._afterWait = null;
        this.createOverlay();
        this.createBetWindow();
        this.createChoiceWindow();
        this.setPhase("bet");
    };
    Scene_Blackjack.prototype.createOverlay = function() {
        this._overlay = new Window_Overlay(new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight));
        this._overlay.setLayout(this._layout);
        this.addWindow(this._overlay);
    };
    Scene_Blackjack.prototype.bottomRect = function(w) {
        return new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - this._panelH, w, this._panelH);
    };
    Scene_Blackjack.prototype.createBetWindow = function() {
        this._betWindow = new Window_Bet(this.bottomRect(460));
        this._betWindow.setHandler("ok", this.onBetOk.bind(this));
        this._betWindow.setHandler("cancel", this.returnToHub.bind(this));
        this.addWindow(this._betWindow);
    };
    Scene_Blackjack.prototype.createChoiceWindow = function() {
        this._choices = new Window_Choices(this.bottomRect(430));
        this._choices.setHandler("hit", this.onHit.bind(this));
        this._choices.setHandler("stand", this.onStand.bind(this));
        this._choices.setHandler("double", this.onDouble.bind(this));
        this._choices.setHandler("again", this.onPlayAgain.bind(this));
        this._choices.setHandler("leave", this.returnToHub.bind(this));
        this.addWindow(this._choices);
    };

    // --- animation gate ---
    Scene_Blackjack.prototype.wait = function(frames, cb) { this._waitFrames = frames; this._afterWait = cb; };
    Scene_Blackjack.prototype.update = function() {
        Scene_CasinoGameBase.prototype.update.call(this);
        if (this._waitFrames > 0) {
            this._waitFrames--;
            if (this._waitFrames === 0 && this._afterWait) { const cb = this._afterWait; this._afterWait = null; cb(); }
        }
    };

    // --- card helpers ---
    Scene_Blackjack.prototype.makeCard = function(card, faceUp) {
        const s = new Sprite_Card(card, faceUp, CW, CH);
        this.addChild(s);
        return s;
    };
    Scene_Blackjack.prototype.clearCards = function() {
        for (const s of this._playerSprites) this.removeChild(s);
        for (const s of this._dealerSprites) this.removeChild(s);
        this._playerSprites = []; this._dealerSprites = [];
    };
    Scene_Blackjack.prototype.layoutRow = function(sprites, y) {
        const spacing = CW + 18, n = sprites.length, total = (n - 1) * spacing;
        const startX = this._layout.cx - total / 2;
        sprites.forEach((s, i) => {
            s._homeX = startX + i * spacing; s._homeY = y;
            if (!s.isBusy()) { s.x = s._homeX; s.y = s._homeY; }
        });
    };
    Scene_Blackjack.prototype.layout = function() {
        this.layoutRow(this._dealerSprites, this._layout.dealerY);
        this.layoutRow(this._playerSprites, this._layout.playerY);
    };

    Scene_Blackjack.prototype.setPhase = function(phase) {
        this._phase = phase;
        const set = (win, on) => { if (win) { win.visible = on; win.active = on; } };
        set(this._betWindow, phase === "bet");
        set(this._choices, phase === "player" || phase === "result");
        if (phase === "bet") {
            this.clearCards();
            this._holeHidden = true;
            this._overlay.setInfo({ dv: "", pv: "", msg: "", bet: 0 });
            const max = this.maxBet();
            if (max < this.minBet()) {
                this._overlay.setInfo({ msg: "Not enough chips to play." });
                set(this._betWindow, false); set(this._choices, true);
                this._choices.setItems([{ name: "Leave", symbol: "leave" }]);
                return;
            }
            this._betWindow.setup(this.minBet(), max, this.minBet());
        }
    };

    Scene_Blackjack.prototype.maybeReshuffle = function() {
        if (this._deck.count < 15) { this._deck.reset(); this._deck.shuffle(); }
    };

    Scene_Blackjack.prototype.onBetOk = function() {
        const wager = this._betWindow.value();
        if (!this.bet(wager)) { this._betWindow.activate(); return; }
        this._stake = wager; this._doubled = false; this._holeHidden = true;
        this.maybeReshuffle();
        this._betWindow.visible = false; this._betWindow.active = false;
        this._player = this._deck.drawMany(2);
        this._dealer = this._deck.drawMany(2);
        this._playerSprites = this._player.map(() => this.makeCard(null, false));
        this._dealerSprites = this._dealer.map(() => this.makeCard(null, false));
        this._playerSprites.forEach((s, i) => s.setCard(this._player[i]));
        this._dealerSprites.forEach((s, i) => s.setCard(this._dealer[i]));
        this.layout();
        CasinoCore.se.deal();
        const sx = this._layout.shoeX, sy = this._layout.shoeY, mv = 14;
        const order = [
            [this._playerSprites[0], true, 0],
            [this._dealerSprites[0], true, 10],
            [this._playerSprites[1], true, 20],
            [this._dealerSprites[1], false, 30]
        ];
        for (const [sp, flip, d] of order) sp.dealFrom(sx, sy, sp._homeX, sp._homeY, mv, d, flip);
        this._overlay.setInfo({ dv: "?", pv: String(handValue(this._player)), bet: this._stake, msg: "" });
        this.wait(30 + mv + 18, () => this.afterDeal());
    };

    Scene_Blackjack.prototype.afterDeal = function() {
        this._overlay.setInfo({ pv: String(handValue(this._player)) });
        if (isNaturalBJ(this._player) || isNaturalBJ(this._dealer)) this.revealAndResolve();
        else this.enterPlayerPhase();
    };

    Scene_Blackjack.prototype.enterPlayerPhase = function() {
        this.setPhase("player");
        const canDouble = this._player.length === 2 && CasinoCore.canAfford(this._stake);
        const items = [{ name: "Hit", symbol: "hit" }, { name: "Stand", symbol: "stand" }];
        if (canDouble) items.push({ name: "Double Down", symbol: "double" });
        this._choices.setItems(items);
    };
    Scene_Blackjack.prototype.hideChoices = function() { this._choices.visible = false; this._choices.active = false; };

    Scene_Blackjack.prototype.dealPlayerCard = function(then) {
        const c = this._deck.draw(); this._player.push(c);
        const sp = this.makeCard(c, false); this._playerSprites.push(sp);
        this.layout();
        sp.dealFrom(this._layout.shoeX, this._layout.shoeY, sp._homeX, sp._homeY, 14, 0, true);
        CasinoCore.se.deal();
        this._overlay.setInfo({ pv: String(handValue(this._player)) });
        this.wait(34, then);
    };

    Scene_Blackjack.prototype.onHit = function() {
        this.hideChoices();
        this.dealPlayerCard(() => {
            const v = handValue(this._player);
            this._overlay.setInfo({ pv: String(v) });
            if (v > 21) this.revealAndResolve();
            else if (v === 21) this.dealerPlay();
            else this.enterPlayerPhase();
        });
    };
    Scene_Blackjack.prototype.onStand = function() { this.hideChoices(); this.dealerPlay(); };
    Scene_Blackjack.prototype.onDouble = function() {
        if (!this.bet(this._stake)) { this.enterPlayerPhase(); return; }
        this._stake += this._stake; this._doubled = true;
        this._overlay.setInfo({ bet: this._stake });
        this.hideChoices();
        this.dealPlayerCard(() => {
            if (handValue(this._player) > 21) this.revealAndResolve();
            else this.dealerPlay();
        });
    };

    Scene_Blackjack.prototype.revealHole = function() {
        if (this._holeHidden) {
            this._holeHidden = false;
            this._dealerSprites[1].startFlip(true, 16);
        }
    };
    Scene_Blackjack.prototype.dealerPlay = function() {
        this.hideChoices();
        this.revealHole();
        this.wait(22, () => { this._overlay.setInfo({ dv: String(handValue(this._dealer)) }); this.dealerStep(); });
    };
    Scene_Blackjack.prototype.dealerStep = function() {
        if (handValue(this._dealer) < 17) {
            const c = this._deck.draw(); this._dealer.push(c);
            const sp = this.makeCard(c, false); this._dealerSprites.push(sp);
            this.layout();
            sp.dealFrom(this._layout.shoeX, this._layout.shoeY, sp._homeX, sp._homeY, 14, 0, true);
            CasinoCore.se.deal();
            this.wait(34, () => { this._overlay.setInfo({ dv: String(handValue(this._dealer)) }); this.dealerStep(); });
        } else {
            this.resolve();
        }
    };
    Scene_Blackjack.prototype.revealAndResolve = function() {
        this.hideChoices();
        this.revealHole();
        this.wait(22, () => { this._overlay.setInfo({ dv: String(handValue(this._dealer)) }); this.resolve(); });
    };

    Scene_Blackjack.prototype.resolve = function() {
        const pv = handValue(this._player), dv = handValue(this._dealer);
        const pBJ = isNaturalBJ(this._player), dBJ = isNaturalBJ(this._dealer);
        let gross = 0, msg = "";
        if (pv > 21) msg = "Bust!";
        else if (pBJ && dBJ) { gross = this._stake; msg = "Push"; }
        else if (pBJ) { gross = Math.floor(this._stake * 2.5); msg = "Blackjack!"; }
        else if (dBJ) msg = "Dealer blackjack";
        else if (dv > 21) { gross = this._stake * 2; msg = "Dealer busts \u2014 you win!"; }
        else if (pv > dv) { gross = this._stake * 2; msg = "You win!"; }
        else if (pv === dv) { gross = this._stake; msg = "Push"; }
        else msg = "Dealer wins";
        if (gross > 0) this.payout(gross);
        if (gross > this._stake) CasinoCore.se.win(); else if (gross === 0) CasinoCore.se.lose();
        this.recordResult({ wagered: this._stake, won: gross });
        this._overlay.setInfo({ dv: String(dv), pv: String(pv), msg: msg });
        this.setPhase("result");
        this._choices.setItems([{ name: "Play Again", symbol: "again" }, { name: "Leave", symbol: "leave" }]);
    };

    Scene_Blackjack.prototype.onPlayAgain = function() { this.setPhase("bet"); };

    window.Scene_Blackjack = Scene_Blackjack;

    CasinoCore.registerGame({
        key: "blackjack",
        name: "Blackjack",
        description: "Beat the dealer to 21 without going over. Blackjack pays 3:2.",
        scene: Scene_Blackjack,
        minBet: 10,
        maxBet: 5000,
        unlockSwitchId: 0
    });
})();
