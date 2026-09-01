/*:
 * @target MZ
 * @plugindesc [v1.0.0] Uno-style card game for the Board Game engine. Match color/number/symbol, wilds, draw-twos, draw-fours. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Uno.js  —  Game Id: "uno"
 * ============================================================================
 * A crazy-eights / Uno-style shedding game. Install BoardGameCore.js ABOVE this
 * plugin, then launch with "Start Board Game" using Game Id: uno.
 *
 * Play a card from your hand that matches the discard's COLOUR, NUMBER, or
 * SYMBOL. Click a card to play it (wilds let you pick the next colour). Click
 * the DRAW pile if you can't or don't want to play; if the drawn card is
 * playable you may play it immediately, otherwise your turn passes. Skip,
 * Reverse and +2 give you another turn in this two-player duel. First to empty
 * their hand wins.
 *
 * Difficulty scales how cleverly the opponent sheds cards and saves its wilds.
 * The 108-card deck, legal-play rules and reshuffling are simulation-tested
 * (card count is conserved every turn).
 *
 * NOTE: "Uno" is a trademark of Mattel. This implements only the game
 * mechanics with original presentation; rename it for any commercial project.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Uno] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const COLORS = ['#e5645b', '#e7c15a', '#66d17a', '#4aa3ff']; // red, yellow, green, blue
    const COLOR_NAME = ['Red', 'Yellow', 'Green', 'Blue'];
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

    // -------- engine (simulation-tested) --------
    function buildDeck() {
        const d = [];
        for (let col = 0; col < 4; col++) {
            d.push({ color: col, kind: 0 });
            for (let n = 1; n <= 9; n++) { d.push({ color: col, kind: n }); d.push({ color: col, kind: n }); }
            for (const k of ['skip', 'rev', 'd2']) { d.push({ color: col, kind: k }); d.push({ color: col, kind: k }); }
        }
        for (let i = 0; i < 4; i++) { d.push({ color: 'w', kind: 'wild' }); d.push({ color: 'w', kind: 'wd4' }); }
        return d;
    }
    const legalCard = (card, s) => card.color === 'w' || card.color === s.currentColor || card.kind === s.currentKind;
    const other = w => w === 'p' ? 'a' : 'p';
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = BoardGameAI.randomInt(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }
    function newGame() {
        const draw = shuffle(buildDeck());
        const hands = { p: [], a: [] };
        for (let i = 0; i < 7; i++) { hands.p.push(draw.pop()); hands.a.push(draw.pop()); }
        let start = draw.pop();
        while (typeof start.kind !== 'number') { draw.unshift(start); start = draw.pop(); }
        return { draw, discard: [start], hands, turn: 'p', currentColor: start.color, currentKind: start.kind, winner: null };
    }
    function reshuffle(s) { if (s.discard.length <= 1) return; const top = s.discard.pop(); const rest = s.discard; s.discard = [top]; shuffle(rest); s.draw = rest; }
    function drawOne(s) { if (s.draw.length === 0) reshuffle(s); return s.draw.length ? s.draw.pop() : null; }
    function drawN(s, who, n) { for (let i = 0; i < n; i++) { const c = drawOne(s); if (c) s.hands[who].push(c); } }
    function playCard(s, who, idx, chosenColor) {
        const card = s.hands[who][idx]; s.hands[who].splice(idx, 1); s.discard.push(card);
        s.currentKind = card.kind; s.currentColor = card.color === 'w' ? chosenColor : card.color;
        const opp = other(who); let extra = false;
        if (card.kind === 'skip' || card.kind === 'rev') extra = true;
        else if (card.kind === 'd2') { drawN(s, opp, 2); extra = true; }
        else if (card.kind === 'wd4') { drawN(s, opp, 4); extra = true; }
        if (s.hands[who].length === 0) { s.winner = who; return { win: true, card }; }
        s.turn = extra ? who : opp;
        return { win: false, extra, card };
    }
    function pickColor(hand) { const c = [0, 0, 0, 0]; for (const k of hand) if (k.color !== 'w') c[k.color]++; let b = 0; for (let i = 1; i < 4; i++) if (c[i] > c[b]) b = i; return b; }
    function aiTurn(s, who, skill) {
        const hand = s.hands[who]; const legal = [];
        for (let i = 0; i < hand.length; i++) if (legalCard(hand[i], s)) legal.push(i);
        if (legal.length === 0) { const c = drawOne(s); if (c) hand.push(c); if (c && legalCard(c, s)) return playCard(s, who, hand.length - 1, c.color === 'w' ? pickColor(hand) : undefined); s.turn = other(who); return { win: false, drew: true }; }
        const mistake = BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.7, 0.0);
        let idx;
        if (Math.random() < mistake) idx = BoardGameAI.pick(legal);
        else {
            const oppLow = s.hands[other(who)].length <= 2;
            const score = i => { const c = hand[i]; if (c.kind === 'wd4') return oppLow ? 90 : 5; if (c.kind === 'wild') return oppLow ? 40 : 8; if (c.kind === 'd2') return oppLow ? 85 : 55; if (c.kind === 'skip' || c.kind === 'rev') return oppLow ? 80 : 50; return 10 + c.kind; };
            idx = legal.reduce((b, i) => score(i) > score(b) ? i : b, legal[0]);
        }
        const card = hand[idx];
        return playCard(s, who, idx, card.color === 'w' ? pickColor(hand) : undefined);
    }

    // -------- scene --------
    class Scene_Uno extends Scene_BoardGameBase {
        onMatchStart() {
            this.s = newGame();
            this._phase = 'player'; this._timer = 0; this._drawnPending = false; this._pendingWild = -1;
            this._handRects = []; this._deckRect = null; this._colorRects = [];
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.showMessage("Your turn. Play a matching card or click the deck to draw.");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._area = new Rectangle(area.x, area.y, area.width, area.height);
            this._sprite = new Sprite(new Bitmap(area.width, area.height));
            this._sprite.x = area.x + mX; this._sprite.y = area.y + mY;
            this._sox = this._sprite.x; this._soy = this._sprite.y;
            this.addChild(this._sprite);
        }
        updateGame() {
            if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'chooseColor') this.updateChoose();
            else if (this._phase === 'aiThink') { if (--this._timer <= 0) this.doAI(); }
        }
        localTouch() { return [TouchInput.x - this._sox, TouchInput.y - this._soy]; }
        hitRect(rects, x, y) { for (let i = rects.length - 1; i >= 0; i--) { const r = rects[i]; if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r; } return null; }

        updatePlayer() {
            if (!TouchInput.isTriggered()) return;
            const [x, y] = this.localTouch();
            const card = this.hitRect(this._handRects, x, y);
            if (card) { this.tryPlay(card.index); return; }
            if (this._deckRect && x >= this._deckRect.x && x < this._deckRect.x + this._deckRect.w && y >= this._deckRect.y && y < this._deckRect.y + this._deckRect.h) this.playerDraw();
        }
        tryPlay(idx) {
            const card = this.s.hands.p[idx];
            if (!legalCard(card, this.s)) { this.playSe('buzzer'); return; }
            if (card.color === 'w') { this._pendingWild = idx; this._phase = 'chooseColor'; this.showMessage("Choose the next colour."); this.redraw(); return; }
            this.playSe('move'); const res = playCard(this.s, 'p', idx); this.afterPlay(res, 'p');
        }
        playerDraw() {
            if (this._drawnPending) { // keep the drawn card, pass
                this.s.turn = 'a'; this._drawnPending = false; this.playSe('select'); this.showMessage("You kept the card. " + this.opponent.name + "'s turn.");
                this.redraw(); this.toAI(); return;
            }
            const c = drawOne(this.s); if (c) this.s.hands.p.push(c);
            this.playSe('select'); this.redraw(); this.refreshStatus();
            if (c && legalCard(c, this.s)) { this._drawnPending = true; this.showMessage("You drew a playable card — click it to play, or the deck to keep it."); }
            else { this.s.turn = 'a'; this.showMessage("You drew and passed. " + this.opponent.name + "'s turn."); this.toAI(); }
        }
        updateChoose() {
            if (!TouchInput.isTriggered()) return;
            const [x, y] = this.localTouch();
            const hit = this.hitRect(this._colorRects, x, y);
            if (hit) { this.playSe('move'); const res = playCard(this.s, 'p', this._pendingWild, hit.index); this._pendingWild = -1; this._drawnPending = false; this._phase = 'player'; this.afterPlay(res, 'p'); }
        }
        afterPlay(res, who) {
            this._drawnPending = false;
            this.redraw(); this.refreshStatus();
            if (res.win) { this.endMatch(who === 'p' ? 'win' : 'lose'); return; }
            this.announce(res, who);
            if (this.s.turn === 'p') { this._phase = 'player'; if (this.s.hands.p.length === 1) this.showMessage("Uno! One card left."); }
            else this.toAI();
        }
        announce(res, who) {
            if (!res.card) return;
            const label = this.cardWord(res.card);
            if (who === 'p') { if (res.extra) this.showMessage("You played " + label + " — go again."); }
        }
        toAI() { this._phase = 'aiThink'; this._timer = 32; this.showMessage(this.opponent.name + " is thinking..."); }
        doAI() {
            const res = aiTurn(this.s, 'a', this.difficulty);
            this.redraw(); this.refreshStatus();
            if (res.win) { this.endMatch('lose'); return; }
            if (res.drew) this.showMessage(this.opponent.name + " drew a card.");
            else if (res.card) {
                let msg = this.opponent.name + " played " + this.cardWord(res.card) + ".";
                if (res.card.kind === 'd2') msg += " You draw 2.";
                if (res.card.kind === 'wd4') msg += " You draw 4! Colour is now " + COLOR_NAME[this.s.currentColor] + ".";
                if (res.card.color === 'w' && res.card.kind === 'wild') msg += " Colour is now " + COLOR_NAME[this.s.currentColor] + ".";
                this.showMessage(msg);
                if (Math.random() < 0.35) this.taunt('thinking');
            }
            if (this.s.hands.a.length === 1) this.showMessage(this.opponent.name + " has UNO — one card left!");
            if (this.s.winner) { this.endMatch('lose'); return; }
            if (this.s.turn === 'a') { this._timer = 40; } // extra turn: chain
            else this._phase = 'player';
        }
        cardWord(card) {
            const col = card.color === 'w' ? '' : COLOR_NAME[card.color] + ' ';
            const k = card.kind;
            const name = k === 'skip' ? 'Skip' : k === 'rev' ? 'Reverse' : k === 'd2' ? '+2' : k === 'wild' ? 'Wild' : k === 'wd4' ? 'Wild +4' : String(k);
            return col + name;
        }
        refreshStatus() {
            this.setStatus(["Your cards: " + this.s.hands.p.length, this.opponent.name + "'s cards: " + this.s.hands.a.length, "Colour: " + COLOR_NAME[this.s.currentColor], "Deck: " + this.s.draw.length]);
        }

        // -------- draw --------
        redraw() {
            const bmp = this._sprite.bitmap, W = bmp.width, H = bmp.height;
            bmp.clear();
            this._handRects = []; this._colorRects = [];
            bmp.fontFace = BoardGameTheme.fonts.main();
            // opponent hand (face-down) top
            const oCount = this.s.hands.a.length;
            const backW = Math.min(40, Math.floor((W - 40) / Math.max(oCount, 1)));
            for (let i = 0; i < oCount; i++) { const x = 20 + i * Math.min(backW, 22); this.drawBack(bmp, x, 8, 34, 48); }
            bmp.fontSize = 16; bmp.textColor = rgba(C.textDim, 0.9);
            bmp.drawText(this.opponent.name + " — " + oCount + " cards", 20, 60, W - 40, 20, 'left');
            // center: discard + draw + colour
            const cy = Math.floor(H * 0.42);
            const cardW = 62, cardH = 88;
            const dispX = Math.floor(W / 2) - cardW - 20;
            this.drawFace(bmp, dispX, cy, cardW, cardH, this.s.discard[this.s.discard.length - 1]);
            const deckX = Math.floor(W / 2) + 20;
            this.drawBack(bmp, deckX, cy, cardW, cardH);
            bmp.fontSize = 14; bmp.textColor = rgba(C.textMain, 0.85); bmp.drawText("DRAW", deckX, cy + cardH + 2, cardW, 18, 'center');
            this._deckRect = { x: deckX, y: cy, w: cardW, h: cardH };
            // current colour swatch
            bmp.fillRect(Math.floor(W / 2) - 8, cy - 26, 16, 16, COLORS[this.s.currentColor]);
            // colour picker overlay
            if (this._phase === 'chooseColor') {
                const sw = 60, gap = 12, totalW = sw * 4 + gap * 3, sx = Math.floor((W - totalW) / 2), sy = cy - 4;
                bmp.fillRect(0, sy - 30, W, sw + 60, rgba('#000000', 0.55));
                bmp.fontSize = 18; bmp.textColor = '#ffffff'; bmp.drawText("Pick a colour", 0, sy - 26, W, 22, 'center');
                for (let i = 0; i < 4; i++) { const x = sx + i * (sw + gap); bmp.fillRect(x, sy, sw, sw, COLORS[i]); bmp.strokeRect(x, sy, sw, sw, '#ffffff'); this._colorRects.push({ x, y: sy, w: sw, h: sw, index: i }); }
            }
            // player hand bottom
            const hand = this.s.hands.p, n = hand.length;
            const phW = 58, phH = 84, margin = 16;
            const avail = W - margin * 2;
            const step = n > 1 ? Math.min(phW + 6, (avail - phW) / (n - 1)) : 0;
            const totalW = n > 0 ? step * (n - 1) + phW : 0;
            const startX = Math.floor((W - totalW) / 2);
            const hy = H - phH - 8;
            for (let i = 0; i < n; i++) {
                const x = Math.floor(startX + i * step);
                const legal = legalCard(hand[i], this.s) && this._phase === 'player';
                this.drawFace(bmp, x, hy - (legal ? 8 : 0), phW, phH, hand[i], legal);
                this._handRects.push({ x, y: hy - (legal ? 8 : 0), w: (i === n - 1 ? phW : step), h: phH, index: i });
            }
        }
        drawBack(bmp, x, y, w, h) {
            bmp.fillRect(x, y, w, h, '#2a2d3a'); bmp.strokeRect(x, y, w, h, rgba(C.lineColor, 0.9));
            bmp.drawCircle(x + w / 2, y + h / 2, Math.floor(Math.min(w, h) * 0.28), rgba(C.highlight, 0.55));
        }
        drawFace(bmp, x, y, w, h, card, highlight) {
            const isWild = card.color === 'w';
            bmp.fillRect(x, y, w, h, isWild ? '#22242e' : COLORS[card.color]);
            if (isWild) { const q = Math.floor(Math.min(w, h) * 0.28); bmp.fillRect(x + 6, y + 6, q, q, COLORS[0]); bmp.fillRect(x + w - 6 - q, y + 6, q, q, COLORS[1]); bmp.fillRect(x + 6, y + h - 6 - q, q, q, COLORS[2]); bmp.fillRect(x + w - 6 - q, y + h - 6 - q, q, q, COLORS[3]); }
            bmp.strokeRect(x, y, w, h, highlight ? C.highlight : rgba(C.lineColor, 0.9));
            if (highlight) bmp.strokeRect(x + 1, y + 1, w - 2, h - 2, C.highlight);
            // label
            const k = card.kind;
            const label = typeof k === 'number' ? String(k) : k === 'skip' ? 'S' : k === 'rev' ? 'R' : k === 'd2' ? '+2' : k === 'wd4' ? '+4' : 'W';
            bmp.fontFace = BoardGameTheme.fonts.main();
            bmp.fontSize = Math.floor(h * 0.34);
            bmp.textColor = isWild ? '#ffffff' : (card.color === 1 ? '#3a3320' : '#ffffff');
            bmp.drawText(label, x, y + Math.floor(h * 0.30), w, Math.floor(h * 0.4), 'center');
        }
    }

    BoardGameManager.registerGame({ id: 'uno', name: 'Uno', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Uno });
})();
