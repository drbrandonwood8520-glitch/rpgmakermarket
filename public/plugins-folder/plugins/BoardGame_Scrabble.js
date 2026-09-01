/*:
 * @target MZ
 * @plugindesc [v1.0.0] Scrabble-style word game for the Board Game engine. Full 15x15 board, premiums, blanks, bingo bonus, dictionary AI. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Scrabble.js  —  Game Id: "scrabble"
 * ============================================================================
 * Install BoardGameCore.js ABOVE this plugin, then launch with "Start Board
 * Game" using Game Id: scrabble.
 *
 * DICTIONARY (required for full play):
 *   Copy the provided "scrabble_words.txt" into your project's  data/  folder
 *   (so it sits at  <project>/data/scrabble_words.txt ). The plugin loads it at
 *   the start of a match. If it's missing, a tiny built-in fallback list is used
 *   and a warning is shown — most words will be rejected, so install the file.
 *
 * HOW TO PLAY:
 *   - Click a tile in your rack to pick it up, then click an empty board square
 *     to place it. Place a blank ('?') and choose its letter from the picker.
 *   - Your first word must cross the centre star. Later words must connect to
 *     tiles already on the board. All words formed must be in the dictionary.
 *   - Buttons: SUBMIT (play), RECALL (take back), SHUFFLE, PASS, and SWAP
 *     (exchange the selected tile for a new one, ending your turn).
 *   - Premium squares: TW/DW multiply a word, TL/DL multiply a letter (new tiles
 *     only). Using all 7 tiles scores a +50 "bingo" bonus.
 *
 * The game ends when the bag is empty and a rack is cleared, or after repeated
 * passes; leftover rack points are deducted. Highest score wins. Difficulty
 * controls how strong a word the opponent will look for. Scoring, validation
 * and move generation are engine-tested against the real word list.
 *
 * NOTE: "Scrabble" is a trademark of its owners; this implements only the game
 * mechanics with original presentation. Rename it for commercial projects.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Scrabble] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const SIZE = 15;
    const inb = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

    // ---- premiums / values / distribution ----
    const PREM = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const setP = (list, v) => list.forEach(([r, c]) => PREM[r][c] = v);
    setP([[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]], 'TW');
    setP([[1, 1], [2, 2], [3, 3], [4, 4], [10, 10], [11, 11], [12, 12], [13, 13], [1, 13], [2, 12], [3, 11], [4, 10], [13, 1], [12, 2], [11, 3], [10, 4], [7, 7]], 'DW');
    setP([[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]], 'TL');
    setP([[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]], 'DL');
    const PREM_COLOR = { '': null, TW: '#c65b4e', DW: '#d98a94', TL: '#4f7fb5', DL: '#7fb0d8' };
    const VALUES = { a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, s: 1, t: 1, r: 1, d: 2, g: 2, b: 3, c: 3, m: 3, p: 3, f: 4, h: 4, v: 4, w: 4, y: 4, k: 5, j: 8, x: 8, q: 10, z: 10 };
    const DIST = { a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9, j: 1, k: 1, l: 4, m: 2, n: 6, o: 8, p: 2, q: 1, r: 6, s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1 };
    const makeBag = () => { const b = []; for (const L in DIST) for (let i = 0; i < DIST[L]; i++) b.push(L); b.push('*', '*'); return b; };
    const letterVal = t => t === '*' ? 0 : (VALUES[t] || 0);
    const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

    // ---- dictionary (module-cached) ----
    const FALLBACK = ("aa ab ad ae ag ai an as at aw ax ay ba be bi bo by de do ed ef eh el em en er es et ex fa go ha he hi hm ho id if in is it jo ka ki la li lo ma me mi mo mu my na ne no nu od oe of oh oi om on op or os ow ox oy pa pe pi qi re sh si so ta ti to uh um un up us ut we wo xi xu ya ye yo za " +
        "cat cot dog log run sun bat bad tab tan ten net set sit sat rat rate late gate gaze zone quiz jazz word game play tile star bingo house mouse plant train brain chair table apple grape lemon melon stone stane stane " +
        "the and are for you not but his her had has one all out day get has him how man new now old see two way who boy did its let put say she too use dad mom cab car").split(/\s+/).filter(Boolean);
    let DICT = null; // {set, sorted, full}
    function loadDictionary() {
        return new Promise(resolve => {
            if (DICT) { resolve(DICT); return; }
            const done = (list, full) => { const set = new Set(list); const sorted = list.slice().sort(); DICT = { set, sorted, full }; resolve(DICT); };
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', 'data/scrabble_words.txt');
                xhr.onload = () => { if (xhr.status < 400 && xhr.responseText) { const list = xhr.responseText.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 2); done(list, true); } else done(FALLBACK, false); };
                xhr.onerror = () => done(FALLBACK, false);
                xhr.send();
            } catch (e) { done(FALLBACK, false); }
        });
    }
    const isWord = w => DICT.set.has(w);
    function isPrefix(p) { const S = DICT.sorted; let lo = 0, hi = S.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (S[mid] < p) lo = mid + 1; else hi = mid; } return lo < S.length && S[lo].startsWith(p); }

    // ---- scoring / validation ----
    function scoreAndValidate(board, placed, isFirst) {
        if (placed.length === 0) return { ok: false };
        const b = board.map(row => row.slice());
        const key = new Set(placed.map(p => p.r + ',' + p.c));
        for (const p of placed) { if (b[p.r][p.c]) return { ok: false }; b[p.r][p.c] = { letter: p.letter, blank: p.blank }; }
        const rows = new Set(placed.map(p => p.r)), cols = new Set(placed.map(p => p.c));
        if (rows.size > 1 && cols.size > 1) return { ok: false, reason: 'tiles must be in one line' };
        if (rows.size === 1) { const r = placed[0].r, cs = placed.map(p => p.c).sort((a, z) => a - z); for (let c = cs[0]; c <= cs[cs.length - 1]; c++) if (!b[r][c]) return { ok: false, reason: 'gaps in the word' }; }
        if (cols.size === 1) { const c = placed[0].c, rs = placed.map(p => p.r).sort((a, z) => a - z); for (let r = rs[0]; r <= rs[rs.length - 1]; r++) if (!b[r][c]) return { ok: false, reason: 'gaps in the word' }; }
        const seen = new Set(), formed = [];
        const gather = (r, c, dr, dc) => {
            let sr = r, sc = c; while (inb(sr - dr, sc - dc) && b[sr - dr][sc - dc]) { sr -= dr; sc -= dc; }
            let er = r, ec = c; while (inb(er + dr, ec + dc) && b[er + dr][ec + dc]) { er += dr; ec += dc; }
            const len = Math.abs(er - sr) + Math.abs(ec - sc) + 1; if (len < 2) return;
            const k = dr + ',' + dc + ',' + sr + ',' + sc + ',' + len; if (seen.has(k)) return; seen.add(k);
            let str = '', score = 0, mult = 1, hasPlaced = false, hasExisting = false, rr = sr, cc = sc;
            for (let i = 0; i < len; i++, rr += dr, cc += dc) {
                const cell = b[rr][cc]; str += cell.letter; const placedHere = key.has(rr + ',' + cc);
                let lv = cell.blank ? 0 : letterVal(cell.letter);
                if (placedHere) { hasPlaced = true; const pm = PREM[rr][cc]; if (pm === 'DL') lv *= 2; else if (pm === 'TL') lv *= 3; else if (pm === 'DW') mult *= 2; else if (pm === 'TW') mult *= 3; } else hasExisting = true;
                score += lv;
            }
            formed.push({ str, score: score * mult, hasPlaced, hasExisting });
        };
        for (const p of placed) { gather(p.r, p.c, 0, 1); gather(p.r, p.c, 1, 0); }
        const rel = formed.filter(w => w.hasPlaced);
        if (!rel.length) return { ok: false };
        for (const w of rel) if (!isWord(w.str)) return { ok: false, reason: '"' + w.str.toUpperCase() + '" is not a word' };
        if (isFirst) { if (!key.has('7,7')) return { ok: false, reason: 'first word must cross the centre' }; }
        else { const connects = rel.some(w => w.hasExisting) || placed.some(p => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => inb(p.r + dr, p.c + dc) && board[p.r + dr][p.c + dc])); if (!connects) return { ok: false, reason: 'must connect to the board' }; }
        let total = rel.reduce((s, w) => s + w.score, 0); if (placed.length === 7) total += 50;
        return { ok: true, score: total, words: rel.map(w => w.str) };
    }

    // ---- AI move generation ----
    const neighborsFilled = (board, r, c) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => inb(r + dr, c + dc) && board[r + dr][c + dc]);
    function crossOK(board, r, c, letter) {
        if (!(inb(r - 1, c) && board[r - 1][c]) && !(inb(r + 1, c) && board[r + 1][c])) return true;
        let sr = r; while (inb(sr - 1, c) && board[sr - 1][c]) sr--; let er = r; while (inb(er + 1, c) && board[er + 1][c]) er++;
        let str = ''; for (let rr = sr; rr <= er; rr++) str += rr === r ? letter : board[rr][c].letter; return isWord(str);
    }
    const transpose = board => { const t = emptyBoard(); for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) t[c][r] = board[r][c]; return t; };
    function genRowMoves(board, r, rack, isFirst, out, cap) {
        const distinct = () => [...new Set(rack.filter(t => t !== '*'))];
        for (let s = 0; s < SIZE; s++) { if (inb(r, s - 1) && board[r][s - 1]) continue; rec(s, '', [], rack.slice(), false); if (out.length >= cap) return; }
        function rec(c, word, placed, rackLeft, anchored) {
            if (out.length >= cap) return;
            if (word.length >= 2 && placed.length >= 1 && (!inb(r, c) || !board[r][c])) { if (isWord(word) && (isFirst ? placed.some(p => p.r === 7 && p.c === 7) : anchored)) out.push(placed.slice()); }
            if (!inb(r, c)) return;
            const cell = board[r][c];
            if (cell) { const w2 = word + cell.letter; if (isPrefix(w2)) rec(c + 1, w2, placed, rackLeft, true); return; }
            const anchorHere = isFirst ? (r === 7 && c === 7) : neighborsFilled(board, r, c);
            const tries = distinct().map(L => ({ L, blank: false }));
            if (rackLeft.includes('*')) for (let i = 0; i < 26; i++) tries.push({ L: String.fromCharCode(97 + i), blank: true });
            for (const t of tries) {
                const w2 = word + t.L; if (!isPrefix(w2)) continue; if (!crossOK(board, r, c, t.L)) continue;
                const idx = t.blank ? rackLeft.indexOf('*') : rackLeft.indexOf(t.L); if (idx < 0) continue;
                const rl = rackLeft.slice(); rl.splice(idx, 1);
                rec(c + 1, w2, placed.concat([{ r, c, letter: t.L, blank: t.blank }]), rl, anchored || anchorHere);
                if (out.length >= cap) return;
            }
        }
    }
    function generateMoves(board, rack, isFirst) {
        const cap = 2500, raw = [];
        for (let r = 0; r < SIZE && raw.length < cap; r++) genRowMoves(board, r, rack, isFirst, raw, cap);
        const tb = transpose(board), down = [];
        for (let r = 0; r < SIZE && down.length < cap; r++) genRowMoves(tb, r, rack, isFirst, down, cap);
        for (const placed of down) raw.push(placed.map(p => ({ r: p.c, c: p.r, letter: p.letter, blank: p.blank })));
        const seen = new Set(), moves = [];
        for (const placed of raw) { const sig = placed.map(p => p.r + ',' + p.c + p.letter).sort().join('|'); if (seen.has(sig)) continue; seen.add(sig); const res = scoreAndValidate(board, placed, isFirst); if (res.ok) moves.push({ placed, score: res.score, words: res.words }); }
        return moves;
    }

    // ======================= SCENE =======================
    const A_Z = 'abcdefghijklmnopqrstuvwxyz'.split('');
    class Scene_Scrabble extends Scene_BoardGameBase {
        onMatchStart() {
            this._phase = 'loading';
            this._sprite = null; this._buttons = []; this._rackRects = []; this._cellRects = [];
            this.buildSprite();
            this.showMessage("Loading dictionary...");
            loadDictionary().then(d => { this._dictFull = d.full; this.initGame(); });
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._w = area.width; this._h = area.height;
            this._sprite = new Sprite(new Bitmap(area.width, area.height));
            this._sprite.x = area.x + mX; this._sprite.y = area.y + mY;
            this._sox = this._sprite.x; this._soy = this._sprite.y;
            this.addChild(this._sprite);
            const rackH = 40, btnH = 26, gap = 6;
            this._cell = Math.floor(Math.min(this._w / SIZE, (this._h - rackH - btnH - gap * 2) / SIZE));
            const bpx = this._cell * SIZE;
            this._bx = Math.floor((this._w - bpx) / 2); this._by = 0;
            this._rackY = this._by + bpx + gap; this._rackH = rackH; this._btnY = this._rackY + rackH + gap; this._btnH = btnH;
        }
        initGame() {
            this.bag = makeBag(); this.shuffleBag();
            this.board = emptyBoard();
            this.rack = []; this.aiRack = [];
            this.drawTiles(this.rack); this.drawTiles(this.aiRack);
            this.score = { p: 0, a: 0 };
            this.pending = []; this._selRack = -1; this._blankPend = -1;
            this.passes = 0; this.isFirst = true;
            this._phase = 'player'; this._timer = 0;
            this.redraw(); this.refreshStatus();
            if (!this._dictFull) this.showMessage("Dictionary file not found — using a tiny fallback list. Add data/scrabble_words.txt!");
            else this.showMessage("Your move. Build a word crossing the centre star.");
        }
        shuffleBag() { for (let i = this.bag.length - 1; i > 0; i--) { const j = BoardGameAI.randomInt(i + 1);[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; } }
        drawTiles(rack) { while (rack.length < 7 && this.bag.length) rack.push(this.bag.pop()); }

        updateGame() {
            if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'blank') this.updateBlank();
            else if (this._phase === 'aiThink') { if (--this._timer <= 0) this.doAI(); }
        }
        localTouch() { return [TouchInput.x - this._sox, TouchInput.y - this._soy]; }
        hitRect(rects, x, y) { for (const r of rects) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r; return null; }

        updatePlayer() {
            if (!TouchInput.isTriggered()) return;
            const [x, y] = this.localTouch();
            const btn = this.hitButton(x, y); if (btn) { this.doButton(btn); return; }
            const rk = this.hitRect(this._rackRects, x, y); if (rk) { this._selRack = (this._selRack === rk.index ? -1 : rk.index); this.playSe('select'); this.redraw(); return; }
            const cell = this.cellAt(x, y); if (cell) this.clickCell(cell[0], cell[1]);
        }
        hitButton(x, y) { for (const b of this._buttons) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.id; return null; }
        cellAt(x, y) { if (x < this._bx || y < this._by) return null; const c = Math.floor((x - this._bx) / this._cell), r = Math.floor((y - this._by) / this._cell); return inb(r, c) ? [r, c] : null; }

        clickCell(r, c) {
            // pick up a pending tile
            const pi = this.pending.findIndex(p => p.r === r && p.c === c);
            if (pi >= 0) { const p = this.pending.splice(pi, 1)[0]; this.rack.push(p.tile); this.playSe('select'); this.redraw(); return; }
            if (this.board[r][c]) return;                 // occupied by a committed tile
            if (this._selRack < 0) return;                // nothing selected
            const tile = this.rack[this._selRack];
            if (tile === '*') { this._blankPend = { r, c, rackIndex: this._selRack }; this._phase = 'blank'; this.showMessage("Choose a letter for the blank."); this.redraw(); return; }
            this.placePending(r, c, tile, tile, false, this._selRack);
        }
        placePending(r, c, tile, letter, blank, rackIndex) {
            this.rack.splice(rackIndex, 1); this._selRack = -1;
            this.pending.push({ r, c, tile, letter, blank }); this.playSe('move'); this.redraw();
        }
        updateBlank() {
            if (!TouchInput.isTriggered()) return;
            const [x, y] = this.localTouch(); const hit = this.hitRect(this._letterRects || [], x, y);
            if (hit) { const bp = this._blankPend; this.placePending(bp.r, bp.c, '*', hit.letter, true, bp.rackIndex); this._blankPend = -1; this._phase = 'player'; this.redraw(); }
        }
        doButton(id) {
            if (id === 'submit') this.submit();
            else if (id === 'recall') { for (const p of this.pending) this.rack.push(p.tile); this.pending = []; this._selRack = -1; this.playSe('select'); this.redraw(); }
            else if (id === 'shuffle') { for (let i = this.rack.length - 1; i > 0; i--) { const j = BoardGameAI.randomInt(i + 1);[this.rack[i], this.rack[j]] = [this.rack[j], this.rack[i]]; } this.playSe('select'); this.redraw(); }
            else if (id === 'pass') { this.recallAll(); this.endTurn(true); }
            else if (id === 'swap') this.swapTile();
        }
        recallAll() { for (const p of this.pending) this.rack.push(p.tile); this.pending = []; this._selRack = -1; }
        submit() {
            if (!this.pending.length) { this.playSe('buzzer'); this.showMessage("Place some tiles first."); return; }
            const placed = this.pending.map(p => ({ r: p.r, c: p.c, letter: p.letter, blank: p.blank }));
            const res = scoreAndValidate(this.board, placed, this.isFirst);
            if (!res.ok) { this.playSe('buzzer'); this.showMessage("Invalid: " + (res.reason || "illegal placement") + "."); return; }
            for (const p of this.pending) this.board[p.r][p.c] = { letter: p.letter, blank: p.blank };
            this.score.p += res.score; this.pending = []; this.playSe('win');
            this.drawTiles(this.rack); this.isFirst = false; this.passes = 0;
            this.redraw(); this.refreshStatus();
            this.showMessage("You played " + res.words.map(w => w.toUpperCase()).join(", ") + " for " + res.score + "!");
            if (this.checkGameEnd('p')) return;
            this.endTurn(false);
        }
        swapTile() {
            if (this.pending.length) { this.showMessage("Recall your tiles before swapping."); return; }
            if (this._selRack < 0) { this.showMessage("Select a rack tile to swap first."); return; }
            if (this.bag.length === 0) { this.showMessage("The bag is empty — can't swap."); return; }
            const t = this.rack.splice(this._selRack, 1)[0]; this.bag.push(t); this.shuffleBag(); this.drawTiles(this.rack); this._selRack = -1;
            this.playSe('select'); this.redraw(); this.showMessage("Swapped a tile. Turn passes.");
            this.endTurn(true);
        }
        endTurn(passed) {
            if (passed) this.passes++;
            if (this.passes >= 4) return this.finishByScore();
            this._phase = 'aiThink'; this._timer = 30; this.showMessage(this.opponent.name + " is thinking...");
        }
        doAI() {
            let moves = [];
            try { moves = generateMoves(this.board, this.aiRack, this.isFirst); } catch (e) { moves = []; }
            if (moves.length) {
                moves.sort((a, b) => b.score - a.score);
                const frac = BoardGameAI.skillToMistakeRate(this.difficulty, MAX_SKILL, 0.85, 0.0);
                const idx = Math.floor(frac * (moves.length - 1) * Math.random());
                const mv = moves[Math.min(moves.length - 1, idx)];
                for (const p of mv.placed) { this.board[p.r][p.c] = { letter: p.letter, blank: p.blank }; const t = p.blank ? '*' : p.letter; const i = this.aiRack.indexOf(t); if (i >= 0) this.aiRack.splice(i, 1); }
                this.score.a += mv.score; this.drawTiles(this.aiRack); this.isFirst = false; this.passes = 0;
                this.redraw(); this.refreshStatus();
                this.showMessage(this.opponent.name + " played " + mv.words.map(w => w.toUpperCase()).join(", ") + " for " + mv.score + ".");
                if (Math.random() < 0.3) this.taunt('thinking');
                if (this.checkGameEnd('a')) return;
            } else {
                // exchange or pass
                if (this.bag.length >= 1) { const t = this.aiRack.pop(); this.bag.push(t); this.shuffleBag(); this.drawTiles(this.aiRack); this.showMessage(this.opponent.name + " swaps a tile."); }
                else this.showMessage(this.opponent.name + " passes.");
                this.passes++;
                if (this.passes >= 4) return this.finishByScore();
            }
            this._phase = 'player';
            this.showMessage("Your move.  (You: " + this.score.p + "  " + this.opponent.name + ": " + this.score.a + ")");
        }
        checkGameEnd(who) {
            const rack = who === 'p' ? this.rack : this.aiRack;
            if (rack.length === 0 && this.bag.length === 0) { this.finishByScore(who); return true; }
            return false;
        }
        finishByScore(wentOut) {
            // subtract leftover rack values; the player who went out gains opponents' leftovers
            const pLeft = this.rack.reduce((s, t) => s + letterVal(t), 0);
            const aLeft = this.aiRack.reduce((s, t) => s + letterVal(t), 0);
            this.score.p -= pLeft; this.score.a -= aLeft;
            if (wentOut === 'p') this.score.p += aLeft; if (wentOut === 'a') this.score.a += pLeft;
            this.refreshStatus();
            const r = this.score.p === this.score.a ? 'draw' : (this.score.p > this.score.a ? 'win' : 'lose');
            this.showMessage("Final — You: " + this.score.p + "  " + this.opponent.name + ": " + this.score.a);
            this.endMatch(r);
        }
        refreshStatus() {
            this.setStatus(["You: " + this.score.p, this.opponent.name + ": " + this.score.a, "", "Bag: " + this.bag.length + " tiles", "Their tiles: " + this.aiRack.length, "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }

        // -------- draw --------
        redraw() {
            const bmp = this._sprite.bitmap; bmp.clear(); this._buttons = []; this._rackRects = []; this._letterRects = [];
            if (this._phase === 'loading') { bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 22; bmp.textColor = C.textMain; bmp.drawText("Loading dictionary...", 0, Math.floor(this._h / 2), this._w, 30, 'center'); return; }
            const cell = this._cell;
            // board
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                const x = this._bx + c * cell, y = this._by + r * cell;
                const pc = PREM_COLOR[PREM[r][c]];
                bmp.fillRect(x, y, cell, cell, pc ? pc : rgba(C.highlight, 0.08));
                bmp.strokeRect(x, y, cell, cell, rgba(C.lineColor, 0.5));
                if (r === 7 && c === 7) { bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(cell * 0.7); bmp.textColor = rgba(C.textMain, 0.5); bmp.drawText('\u2605', x, y, cell, cell, 'center'); }
            }
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (this.board[r][c]) this.drawTile(bmp, this._bx + c * cell, this._by + r * cell, cell, this.board[r][c].letter, this.board[r][c].blank, false);
            for (const p of this.pending) this.drawTile(bmp, this._bx + p.c * cell, this._by + p.r * cell, cell, p.letter, p.blank, true);
            // rack
            const n = this.rack.length, tw = Math.min(40, Math.floor((this._w - 20) / 7)), th = this._rackH;
            const startX = Math.floor((this._w - (tw + 4) * 7) / 2);
            for (let i = 0; i < 7; i++) {
                const x = startX + i * (tw + 4), y = this._rackY;
                bmp.fillRect(x, y, tw, th, rgba(C.panel, 0.9)); bmp.strokeRect(x, y, tw, th, rgba(C.lineColor, 0.6));
                if (i < n) { this.drawTile(bmp, x, y, Math.min(tw, th), this.rack[i] === '*' ? '?' : this.rack[i], this.rack[i] === '*', false, this._selRack === i); this._rackRects.push({ x, y, w: tw, h: th, index: i }); }
            }
            // buttons
            const ids = [['submit', 'SUBMIT'], ['recall', 'RECALL'], ['shuffle', 'SHUFFLE'], ['swap', 'SWAP'], ['pass', 'PASS']];
            const bw = Math.floor((this._w - 8) / ids.length), bh = this._btnH;
            ids.forEach(([id, label], i) => { const x = 4 + i * bw, y = this._btnY; const col = id === 'submit' ? C.win : id === 'pass' ? C.lose : C.highlight; bmp.fillRect(x, y, bw - 4, bh, rgba(col, 0.22)); bmp.strokeRect(x, y, bw - 4, bh, col); bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 13; bmp.textColor = C.textMain; bmp.drawText(label, x, y + 4, bw - 4, 18, 'center'); this._buttons.push({ id, x, y, w: bw - 4, h: bh }); });
            // blank picker overlay
            if (this._phase === 'blank') this.drawBlankPicker(bmp);
        }
        drawTile(bmp, x, y, size, letter, blank, pending, selected) {
            const pad = 2;
            bmp.fillRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, pending ? '#cfe6c2' : '#efe2bf');
            bmp.strokeRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, selected ? C.highlight : rgba('#8a7a4a', 0.9));
            if (selected) bmp.strokeRect(x + pad + 1, y + pad + 1, size - 2 * pad - 2, size - 2 * pad - 2, C.highlight);
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(size * 0.5); bmp.textColor = '#2a2416';
            bmp.drawText((letter || '').toUpperCase(), x, y + Math.floor(size * 0.08), size, Math.floor(size * 0.7), 'center');
            if (!blank && letter && letter !== '?') { bmp.fontSize = Math.max(8, Math.floor(size * 0.24)); bmp.textColor = '#5a4e2a'; bmp.drawText(String(letterVal(letter)), x, y + size - Math.floor(size * 0.34), size - 3, Math.floor(size * 0.3), 'right'); }
        }
        drawBlankPicker(bmp) {
            const cols = 7, cw = Math.floor((this._w - 40) / cols), ch = 30, rows = Math.ceil(26 / cols);
            const gx = 20, gy = Math.floor(this._h * 0.25);
            bmp.fillRect(0, gy - 34, this._w, ch * rows + 50, rgba('#000000', 0.6));
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 18; bmp.textColor = '#fff'; bmp.drawText("Blank = which letter?", 0, gy - 30, this._w, 22, 'center');
            A_Z.forEach((L, i) => { const x = gx + (i % cols) * cw, y = gy + Math.floor(i / cols) * ch; bmp.fillRect(x, y, cw - 3, ch - 3, rgba(C.panel, 0.95)); bmp.strokeRect(x, y, cw - 3, ch - 3, C.highlight); bmp.textColor = C.textMain; bmp.fontSize = 16; bmp.drawText(L.toUpperCase(), x, y + 4, cw - 3, 20, 'center'); this._letterRects.push({ x, y, w: cw - 3, h: ch - 3, letter: L }); });
        }
    }

    BoardGameManager.registerGame({ id: 'scrabble', name: 'Scrabble', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Scrabble });
})();
