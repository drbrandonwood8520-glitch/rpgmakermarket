/*:
 * @target MZ
 * @plugindesc [v1.0.0] Mahjong Solitaire for the Board Game engine. Clear the layered layout by matching free tiles. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Mahjong.js  —  Game Id: "mahjong"
 * ============================================================================
 * The classic tile-matching solitaire (not 4-player Riichi). Install
 * BoardGameCore.js ABOVE this plugin, then launch with "Start Board Game"
 * using Game Id: mahjong.
 *
 * Remove all 144 tiles by matching pairs of FREE tiles. A tile is free if it
 * has no tile on top of it and an open left or right edge. Two tiles match if
 * they are identical; any two Flowers match each other, and any two Seasons
 * match each other. Click one free tile, then a matching one.
 *
 * Every layout is generated to be solvable. If you get stuck, SHUFFLE re-deals
 * the remaining tiles (still solvable); HINT flashes a matching pair. Clear the
 * board to WIN. Difficulty sets how many shuffles you get (harder = fewer).
 *
 * NOTE: this is a single-player puzzle, so there's no live opponent — you're
 * beating the layout itself. Tile set, matching and solvability are engine-
 * tested. (Ask if you'd prefer a full 4-player Mahjong instead.)
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Mahjong] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const matches = (a, b) => a === b || (a[0] === 'F' && b[0] === 'F') || (a[0] === 'S' && b[0] === 'S');
    const rint = n => BoardGameAI.randomInt(n);
    const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };

    function buildPairs() {
        const pairs = [];
        for (const suit of ['B', 'C', 'D']) for (let r = 1; r <= 9; r++) { pairs.push([suit + r, suit + r]); pairs.push([suit + r, suit + r]); }
        for (const w of ['WE', 'WS', 'WW', 'WN']) { pairs.push([w, w]); pairs.push([w, w]); }
        for (const d of ['DR', 'DG', 'DW']) { pairs.push([d, d]); pairs.push([d, d]); }
        pairs.push(['F1', 'F2'], ['F3', 'F4'], ['S1', 'S2'], ['S3', 'S4']);
        return pairs;
    }
    function buildLayout() {
        const layers = [{ layer: 0, r0: 0, r1: 5, c0: 0, c1: 13 }, { layer: 1, r0: 1, r1: 4, c0: 2, c1: 11 }, { layer: 2, r0: 2, r1: 3, c0: 4, c1: 9 }, { layer: 3, r0: 2, r1: 3, c0: 5, c1: 8 }];
        const slots = []; let id = 0;
        for (const L of layers) for (let r = L.r0; r <= L.r1; r++) for (let c = L.c0; c <= L.c1; c++) slots.push({ id: id++, layer: L.layer, r, c, tile: null, removed: false });
        return slots;
    }
    const kk = (l, r, c) => l + ':' + r + ':' + c;
    function freeSlotsOf(slots, present) { const out = []; for (const s of slots) { const key = kk(s.layer, s.r, s.c); if (!present.has(key)) continue; if (present.has(kk(s.layer + 1, s.r, s.c))) continue; const L = present.has(kk(s.layer, s.r, s.c - 1)), R = present.has(kk(s.layer, s.r, s.c + 1)); if (!L || !R) out.push(s); } return out; }
    // assign a set of face-pairs onto a present structure by reverse removal (keeps solvable)
    function assignSolvable(slots, present, pairs) {
        const work = new Set(present); const bag = pairs.slice();
        while (work.size > 0) {
            const free = freeSlotsOf(slots, work); if (free.length < 2) return false;
            shuffleArr(free); const a = free[0], b = free[1], pair = bag.pop();
            a.tile = pair[0]; b.tile = pair[1];
            work.delete(kk(a.layer, a.r, a.c)); work.delete(kk(b.layer, b.r, b.c));
        }
        return true;
    }
    function newBoard() {
        for (let attempt = 0; attempt < 40; attempt++) {
            const slots = buildLayout(); const present = new Set(slots.map(s => kk(s.layer, s.r, s.c)));
            if (assignSolvable(slots, present, shuffleArr(buildPairs()))) return slots;
        }
        return buildLayout();
    }
    // pair up an arbitrary multiset of remaining faces (identical first, then flowers/seasons by group)
    function pairFaces(faces) {
        const byFace = {}, flowers = [], seasons = [], pairs = [];
        for (const f of faces) { if (f[0] === 'F') flowers.push(f); else if (f[0] === 'S') seasons.push(f); else (byFace[f] = byFace[f] || []).push(f); }
        for (const f in byFace) { const arr = byFace[f]; for (let i = 0; i + 1 < arr.length; i += 2) pairs.push([arr[i], arr[i + 1]]); }
        for (let i = 0; i + 1 < flowers.length; i += 2) pairs.push([flowers[i], flowers[i + 1]]);
        for (let i = 0; i + 1 < seasons.length; i += 2) pairs.push([seasons[i], seasons[i + 1]]);
        return pairs;
    }

    // face rendering data
    const CAT_COLOR = { B: '#3fa35a', C: '#35507a', D: '#c0504d', W: '#4a4550', DR: '#c0504d', DG: '#3fa35a', DW: '#7a7f88', F: '#d17ba3', S: '#e0a33c' };
    function faceColor(f) { if (f[0] === 'W') return CAT_COLOR.W; if (f[0] === 'D') return CAT_COLOR[f] || CAT_COLOR.W; if (f[0] === 'F') return CAT_COLOR.F; if (f[0] === 'S') return CAT_COLOR.S; return CAT_COLOR[f[0]]; }
    function faceLabel(f) {
        if (f[0] === 'B' || f[0] === 'C' || f[0] === 'D') return { big: f.slice(1), small: f[0] };
        if (f[0] === 'W') return { big: { E: 'E', S: 'S', W: 'W', N: 'N' }[f[1]], small: 'wind' };
        if (f === 'DR') return { big: 'R', small: 'drgn' }; if (f === 'DG') return { big: 'G', small: 'drgn' }; if (f === 'DW') return { big: 'W', small: 'drgn' };
        if (f[0] === 'F') return { big: '\u273F', small: 'flwr' };
        if (f[0] === 'S') return { big: f.slice(1), small: 'ssn' };
        return { big: '?', small: '' };
    }

    class Scene_Mahjong extends Scene_BoardGameBase {
        onMatchStart() {
            this.slots = newBoard();
            this.present = new Set(this.slots.map(s => kk(s.layer, s.r, s.c)));
            this.byId = new Map(this.slots.map(s => [s.id, s]));
            this._sel = null; this._hint = null; this._hintTimer = 0;
            this.shufflesLeft = Math.max(1, 6 - this.difficulty);
            this.hintsLeft = 5;
            this._phase = 'player'; this._buttons = [];
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.showMessage("Match free tiles to clear the board. Identical tiles (or any two flowers / seasons).");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._w = area.width; this._h = area.height;
            const cols = 14, rows = 6, layers = 4, btnH = 28;
            this._tw = Math.floor((area.width - 8) / (cols + layers * 0.2));
            this._th = Math.floor((area.height - btnH - 12) / (rows + layers * 0.22));
            this._offX = Math.floor(this._tw * 0.2); this._offY = Math.floor(this._th * 0.22);
            const usedW = cols * this._tw + layers * this._offX, usedH = rows * this._th + layers * this._offY;
            this._ox = Math.floor((area.width - usedW) / 2) + layers * this._offX;
            this._oy = Math.floor((area.height - btnH - 12 - usedH) / 2) + layers * this._offY;
            this._btnY = area.height - btnH - 4; this._btnH = btnH;
            this._sprite = new Sprite(new Bitmap(area.width, area.height));
            this._sprite.x = area.x + mX; this._sprite.y = area.y + mY;
            this._sox = this._sprite.x; this._soy = this._sprite.y;
            this.addChild(this._sprite);
        }
        tileRect(s) { return { x: this._ox + s.c * this._tw - s.layer * this._offX, y: this._oy + s.r * this._th - s.layer * this._offY, w: this._tw, h: this._th }; }
        isFree(s) { if (s.removed) return false; if (this.present.has(kk(s.layer + 1, s.r, s.c))) return false; const L = this.present.has(kk(s.layer, s.r, s.c - 1)), R = this.present.has(kk(s.layer, s.r, s.c + 1)); return !L || !R; }

        updateGame() {
            if (this._hintTimer > 0 && --this._hintTimer === 0) { this._hint = null; this.redraw(); }
            if (this._phase !== 'player') return;
            if (!TouchInput.isTriggered()) return;
            const [x, y] = [TouchInput.x - this._sox, TouchInput.y - this._soy];
            const bid = this.hitButton(x, y); if (bid) { this.doButton(bid); return; }
            const s = this.topTileAt(x, y); if (s) this.clickTile(s);
        }
        hitButton(x, y) { for (const b of this._buttons) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.id; return null; }
        topTileAt(x, y) {
            let best = null;
            for (const s of this.slots) { if (s.removed) continue; const r = this.tileRect(s); if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { if (!best || s.layer > best.layer) best = s; } }
            return best;
        }
        clickTile(s) {
            if (!this.isFree(s)) { this.playSe('buzzer'); this.showMessage("That tile is blocked."); return; }
            if (this._sel && this._sel.id === s.id) { this._sel = null; this.playSe('select'); this.redraw(); return; }
            if (!this._sel) { this._sel = s; this.playSe('select'); this.redraw(); return; }
            if (matches(this._sel.tile, s.tile)) {
                this.remove(this._sel); this.remove(s); this._sel = null; this.playSe('move');
                this.redraw(); this.refreshStatus();
                if (this.present.size === 0) { this.endMatch('win'); return; }
                this.checkStuck();
            } else { this._sel = s; this.playSe('select'); this.redraw(); }
        }
        remove(s) { s.removed = true; this.present.delete(kk(s.layer, s.r, s.c)); }
        anyMatch() { const free = freeSlotsOf(this.slots, this.present); for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (matches(free[i].tile, free[j].tile)) return [free[i], free[j]]; return null; }
        checkStuck() {
            if (this.anyMatch()) return;
            if (this.shufflesLeft > 0) this.showMessage("No moves! Press SHUFFLE (" + this.shufflesLeft + " left).");
            else { this.showMessage("No moves left and no shuffles — you're stuck."); this.endMatch('lose'); }
        }
        doButton(id) {
            if (id === 'shuffle') this.doShuffle();
            else if (id === 'hint') this.doHint();
        }
        doShuffle() {
            if (this.shufflesLeft <= 0) { this.playSe('buzzer'); this.showMessage("No shuffles left."); return; }
            const faces = []; for (const s of this.slots) if (!s.removed) faces.push(s.tile);
            const pairs = shuffleArr(pairFaces(faces));
            const ok = assignSolvable(this.slots, this.present, pairs);
            if (!ok) { // fallback: random permutation of faces
                shuffleArr(faces); let i = 0; for (const s of this.slots) if (!s.removed) s.tile = faces[i++];
            }
            this.shufflesLeft--; this._sel = null; this.playSe('select');
            this.redraw(); this.refreshStatus(); this.showMessage("Tiles reshuffled (" + this.shufflesLeft + " left).");
            this.checkStuck();
        }
        doHint() {
            if (this.hintsLeft <= 0) { this.playSe('buzzer'); this.showMessage("No hints left."); return; }
            const pair = this.anyMatch();
            if (!pair) { this.showMessage("No matches available — try SHUFFLE."); return; }
            this.hintsLeft--; this._hint = pair; this._hintTimer = 90; this.playSe('select');
            this.redraw(); this.showMessage("Hint: this pair matches (" + this.hintsLeft + " left).");
        }
        refreshStatus() { this.setStatus(["Tiles left: " + this.present.size, "", "Shuffles: " + this.shufflesLeft, "Hints: " + this.hintsLeft, "", "Skill: " + this.difficulty + "/" + MAX_SKILL]); }

        redraw() {
            const bmp = this._sprite.bitmap; bmp.clear(); this._buttons = [];
            // draw tiles bottom-to-top so upper layers overlay
            const order = this.slots.filter(s => !s.removed).sort((a, b) => a.layer - b.layer || a.r - b.r || a.c - b.c);
            for (const s of order) this.drawTile(bmp, s);
            // buttons
            const ids = [['shuffle', 'SHUFFLE (' + this.shufflesLeft + ')'], ['hint', 'HINT (' + this.hintsLeft + ')']];
            const bw = Math.floor((this._w - 12) / 2);
            ids.forEach(([id, label], i) => { const x = 4 + i * (bw + 4), y = this._btnY; bmp.fillRect(x, y, bw, this._btnH, rgba(C.highlight, 0.22)); bmp.strokeRect(x, y, bw, this._btnH, C.highlight); bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 14; bmp.textColor = C.textMain; bmp.drawText(label, x, y + 5, bw, 20, 'center'); this._buttons.push({ id, x, y, w: bw, h: this._btnH }); });
        }
        drawTile(bmp, s) {
            const r = this.tileRect(s), free = this.isFree(s);
            // shadow / 3D edge
            bmp.fillRect(r.x + 3, r.y + 3, r.w, r.h, rgba('#000000', 0.28));
            bmp.fillRect(r.x, r.y, r.w, r.h, free ? '#faf3e0' : '#e4dcc6');
            bmp.strokeRect(r.x, r.y, r.w, r.h, rgba('#7a6a44', 0.9));
            bmp.fillRect(r.x, r.y, r.w, 3, rgba('#ffffff', 0.5)); bmp.fillRect(r.x, r.y, 3, r.h, rgba('#ffffff', 0.4));
            const selected = this._sel && this._sel.id === s.id;
            const hinted = this._hint && (this._hint[0].id === s.id || this._hint[1].id === s.id);
            if (selected) { bmp.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, C.highlight); bmp.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.highlight); }
            else if (hinted) bmp.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, C.win);
            if (!free) bmp.fillRect(r.x, r.y, r.w, r.h, rgba('#3a3020', 0.22));
            const lab = faceLabel(s.tile), col = faceColor(s.tile);
            bmp.fontFace = BoardGameTheme.fonts.main();
            bmp.fontSize = Math.floor(r.h * 0.42); bmp.textColor = col;
            bmp.drawText(lab.big, r.x, r.y + Math.floor(r.h * 0.12), r.w, Math.floor(r.h * 0.5), 'center');
            bmp.fontSize = Math.max(8, Math.floor(r.h * 0.2)); bmp.textColor = rgba(col, 0.9);
            bmp.drawText(lab.small, r.x, r.y + r.h - Math.floor(r.h * 0.26), r.w, Math.floor(r.h * 0.22), 'center');
        }
    }

    BoardGameManager.registerGame({ id: 'mahjong', name: 'Mahjong Solitaire', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Mahjong });
})();
