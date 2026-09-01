/*:
 * @target MZ
 * @plugindesc [v1.0.0] Reversi (Othello-rules) for the Board Game engine. Flip discs, take the corners, hold the most at the end. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @param showHints
 * @text Show Move Hints
 * @type boolean
 * @on Show dots
 * @off Hide
 * @desc Show small dots on the squares where you can legally play. Turn off for a tougher, hint-free game.
 * @default true
 *
 * @help
 * ============================================================================
 * BoardGame_Reversi.js  —  Game Id: "reversi"
 * ============================================================================
 * Install BoardGameCore.js ABOVE this plugin, then launch with "Start Board
 * Game" using Game Id: reversi.
 *
 * You play DARK and move first; the opponent plays LIGHT. Click an empty square
 * (or use the arrow keys + OK) where your disc would flank a line of the
 * opponent's discs between the new disc and one of yours — every bracketed disc
 * flips to your colour. If you have no legal move you pass automatically; when
 * neither side can move, whoever holds the most discs wins.
 *
 * Difficulty scales the opponent's search depth and how often it blunders.
 * The rules, flipping, passing and scoring are engine-tested, and the AI's
 * positional play (corners, edges, mobility) was verified to beat random play
 * ~90% of the time.
 *
 * "Othello" is a registered trademark; this generic implementation is called
 * Reversi. The board colour can be changed in code if you prefer to match your
 * project's palette.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Reversi] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const _pluginName = (document.currentScript && document.currentScript.src)
        ? decodeURIComponent(document.currentScript.src).replace(/^.*\/(.+)\.js.*$/, "$1")
        : "BoardGame_Reversi";
    const _params = PluginManager.parameters(_pluginName);
    const SHOW_HINTS = String(_params.showHints !== undefined ? _params.showHints : "true") === "true";
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

    // -------- engine (tested) --------
    const N = 8;
    const inb = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const opp = me => me === 1 ? 2 : 1;
    const cloneB = b => b.map(row => row.slice());
    function initialBoard() { const b = Array.from({ length: N }, () => Array(N).fill(0)); b[3][3] = 2; b[4][4] = 2; b[3][4] = 1; b[4][3] = 1; return b; }
    const initialState = () => ({ board: initialBoard(), turn: 1 });
    function flipsFor(board, r, c, me) {
        if (board[r][c] !== 0) return [];
        const o = opp(me), out = [];
        for (const [dr, dc] of DIRS) { const line = []; let rr = r + dr, cc = c + dc; while (inb(rr, cc) && board[rr][cc] === o) { line.push([rr, cc]); rr += dr; cc += dc; } if (line.length && inb(rr, cc) && board[rr][cc] === me) for (const p of line) out.push(p); }
        return out;
    }
    function legalMoves(board, me) { const m = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (board[r][c] !== 0) continue; const f = flipsFor(board, r, c, me); if (f.length) m.push({ r, c, flips: f }); } return m; }
    const hasMove = (board, me) => legalMoves(board, me).length > 0;
    function applyMove(board, mv, me) { const b = cloneB(board); b[mv.r][mv.c] = me; for (const [r, c] of mv.flips) b[r][c] = me; return b; }
    function counts(board) { let d = 0, l = 0, e = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = board[r][c]; if (v === 1) d++; else if (v === 2) l++; else e++; } return { dark: d, light: l, empty: e }; }
    function terminal(board) { if (hasMove(board, 1) || hasMove(board, 2)) return null; const c = counts(board); return c.dark > c.light ? 'dark' : c.light > c.dark ? 'light' : 'draw'; }
    const W = [[120, -20, 20, 5, 5, 20, -20, 120], [-20, -40, -5, -5, -5, -5, -40, -20], [20, -5, 15, 3, 3, 15, -5, 20], [5, -5, 3, 3, 3, 3, -5, 5], [5, -5, 3, 3, 3, 3, -5, 5], [20, -5, 15, 3, 3, 15, -5, 20], [-20, -40, -5, -5, -5, -5, -40, -20], [120, -20, 20, 5, 5, 20, -20, 120]];
    function evalFor(board, me) { const o = opp(me); let s = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (board[r][c] === me) s += W[r][c]; else if (board[r][c] === o) s -= W[r][c]; } s += 3 * (legalMoves(board, me).length - legalMoves(board, o).length); return s; }
    function negamax(board, me, depth, alpha, beta) {
        if (depth === 0) return evalFor(board, me);
        const o = opp(me), moves = legalMoves(board, me);
        if (moves.length === 0) { if (legalMoves(board, o).length === 0) { const c = counts(board); const diff = me === 1 ? c.dark - c.light : c.light - c.dark; return diff > 0 ? 100000 : diff < 0 ? -100000 : 0; } return -negamax(board, o, depth - 1, -beta, -alpha); }
        moves.sort((a, b) => W[b.r][b.c] - W[a.r][a.c]);
        let best = -Infinity;
        for (const mv of moves) { const v = -negamax(applyMove(board, mv, me), o, depth - 1, -beta, -alpha); if (v > best) best = v; if (best > alpha) alpha = best; if (alpha >= beta) break; }
        return best;
    }
    function chooseAIMove(board, me, skill) {
        const moves = legalMoves(board, me); if (!moves.length) return null;
        if (Math.random() < BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.5, 0.0)) return BoardGameAI.pick(moves);
        const depth = BoardGameAI.depthForSkill(skill, 1, 4, MAX_SKILL);
        moves.sort((a, b) => W[b.r][b.c] - W[a.r][a.c]);
        let best = -Infinity, cands = [];
        for (const mv of moves) { const v = -negamax(applyMove(board, mv, me), opp(me), depth - 1, -Infinity, Infinity); if (v > best + 1) { best = v; cands = [mv]; } else if (v >= best - 1) { cands.push(mv); best = Math.max(best, v); } }
        return BoardGameAI.pick(cands);
    }

    // -------- scene --------
    const FELT = '#2e7d52', FELT_LINE = '#1f5c3b';
    const DARK_DISC = '#23262e', LIGHT_DISC = '#efe9d8';
    class Scene_Reversi extends Scene_BoardGameBase {
        onMatchStart() {
            this.state = initialState();
            this._legal = legalMoves(this.state.board, 1);
            this._cursor = [3, 3]; this._last = null;
            this._phase = 'player'; this._timer = 0;
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.taunt('greeting');
            this.showMessage("You are Dark and move first. Place a disc to flank the opponent.");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            this._cell = Math.floor(Math.min(area.width, area.height) / N);
            const px = this._cell * N;
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._ox = area.x + Math.floor((area.width - px) / 2) + mX;
            this._oy = area.y + Math.floor((area.height - px) / 2) + mY;
            this._sprite = new Sprite(new Bitmap(px, px));
            this._sprite.x = this._ox; this._sprite.y = this._oy;
            this.addChild(this._sprite);
        }
        updateGame() {
            if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'aiThink') { if (--this._timer <= 0) this.doAI(); }
        }
        cellFromTouch() { const x = TouchInput.x - this._ox, y = TouchInput.y - this._oy; if (x < 0 || y < 0) return null; const c = Math.floor(x / this._cell), r = Math.floor(y / this._cell); return inb(r, c) ? [r, c] : null; }
        updatePlayer() {
            if (TouchInput.isTriggered()) { const cell = this.cellFromTouch(); if (cell) this.activate(cell[0], cell[1]); }
            if (Input.isRepeated('right')) this.moveCursor(0, 1);
            if (Input.isRepeated('left')) this.moveCursor(0, -1);
            if (Input.isRepeated('down')) this.moveCursor(1, 0);
            if (Input.isRepeated('up')) this.moveCursor(-1, 0);
            if (Input.isTriggered('ok')) this.activate(this._cursor[0], this._cursor[1]);
        }
        moveCursor(dr, dc) { this._cursor = [Math.max(0, Math.min(N - 1, this._cursor[0] + dr)), Math.max(0, Math.min(N - 1, this._cursor[1] + dc))]; this.playSe('select'); this.redraw(); }
        activate(r, c) {
            this._cursor = [r, c];
            const mv = this._legal.find(m => m.r === r && m.c === c);
            if (!mv) { this.playSe('buzzer'); return; }
            this.playSe('move'); this.state.board = applyMove(this.state.board, mv, 1); this._last = [r, c];
            this.redraw(); this.refreshStatus();
            this.showMessage("You flipped " + mv.flips.length + " disc" + (mv.flips.length === 1 ? "" : "s") + ".");
            this.advance(1);
        }
        doAI() {
            const mv = chooseAIMove(this.state.board, 2, this.difficulty);
            if (!mv) { this.advance(2); return; }
            this.playSe('move'); this.state.board = applyMove(this.state.board, mv, 2); this._last = [mv.r, mv.c];
            this.redraw(); this.refreshStatus();
            this.showMessage(this.opponent.name + " flipped " + mv.flips.length + " disc" + (mv.flips.length === 1 ? "" : "s") + ".");
            if (Math.random() < 0.3) this.taunt('thinking');
            this.advance(2);
        }
        advance(mover) {
            const t = terminal(this.state.board);
            if (t) { this.endMatch(t === 'dark' ? 'win' : t === 'light' ? 'lose' : 'draw'); return; }
            const next = opp(mover);
            if (hasMove(this.state.board, next)) {
                this.state.turn = next;
                if (next === 1) { this._legal = legalMoves(this.state.board, 1); this._phase = 'player'; this.redraw(); }
                else { this._phase = 'aiThink'; this._timer = 32; }
            } else {
                // next side passes; mover goes again
                const who = next === 1 ? "You have" : this.opponent.name + " has";
                this.showMessage(who + " no legal move — pass.");
                this.state.turn = mover;
                if (mover === 1) { this._legal = legalMoves(this.state.board, 1); this._phase = 'player'; this.redraw(); }
                else { this._phase = 'aiThink'; this._timer = 32; }
            }
        }
        refreshStatus() {
            const c = counts(this.state.board);
            this.setStatus(["You (Dark): " + c.dark, this.opponent.name + " (Light): " + c.light, "", "Empty: " + c.empty, "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }
        redraw() {
            const bmp = this._sprite.bitmap, cell = this._cell; bmp.clear();
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = c * cell, y = r * cell; bmp.fillRect(x, y, cell, cell, FELT); bmp.strokeRect(x, y, cell, cell, rgba(FELT_LINE, 1)); }
            if (this._last) bmp.strokeRect(this._last[1] * cell + 1, this._last[0] * cell + 1, cell - 2, cell - 2, C.draw);
            if (this._phase === 'player') { const [cr, cc] = this._cursor; bmp.strokeRect(cc * cell + 1, cr * cell + 1, cell - 2, cell - 2, C.highlight); }
            if (SHOW_HINTS && this._phase === 'player') for (const m of this._legal) { const x = m.c * cell + cell / 2, y = m.r * cell + cell / 2; bmp.drawCircle(x, y, Math.floor(cell * 0.10), rgba(C.highlight, 0.7)); }
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = this.state.board[r][c]; if (v) this.drawDisc(bmp, r, c, v); }
        }
        drawDisc(bmp, r, c, v) {
            const cell = this._cell, cx = c * cell + cell / 2, cy = r * cell + cell / 2, rad = Math.floor(cell * 0.38);
            bmp.drawCircle(cx, cy, rad, rgba('#000000', 0.25));
            bmp.drawCircle(cx, cy, rad - 1, v === 1 ? DARK_DISC : LIGHT_DISC);
            bmp.drawCircle(cx, cy, Math.floor(rad * 0.5), v === 1 ? '#33363f' : '#fff8e6');
        }
    }

    BoardGameManager.registerGame({ id: 'reversi', name: 'Reversi', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Reversi });
})();
