/*:
 * @target MZ
 * @plugindesc [v1.0.0] Checkers (English draughts) for the Board Game engine. Forced captures, multi-jumps, kinging. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @param forcedCaptures
 * @text Forced Captures
 * @type boolean
 * @on Forced (standard)
 * @off Optional (casual)
 * @desc Standard draughts requires you to capture when able. Turn OFF for a casual variant where jumps are optional.
 * @default true
 *
 * @help
 * ============================================================================
 * BoardGame_Checkers.js  —  Game Id: "checkers"
 * ============================================================================
 * Standard American/English draughts. Install BoardGameCore.js ABOVE this
 * plugin, then launch with "Start Board Game" using Game Id: checkers.
 *
 * The player controls the light pieces at the bottom and moves first. Click a
 * piece to see its legal moves (dots), then click a destination. By default
 * captures are forced (standard rules) — if a jump is available, only jumps are
 * offered; set the Forced Captures parameter to Optional for a casual variant.
 * Multi-jumps execute as one click on the final landing square. Reaching the
 * far row kings a piece.
 *
 * Difficulty scales the AI search depth and blunder rate.
 * Rules are unit-tested (forced capture, chained multi-jumps, kinging,
 * loss-on-no-moves).
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") {
        console.error("[BoardGame_Checkers] Install BoardGameCore.js above this plugin."); return;
    }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const _pluginName = (document.currentScript && document.currentScript.src)
        ? decodeURIComponent(document.currentScript.src).replace(/^.*\/(.+)\.js.*$/, "$1")
        : "BoardGame_Checkers";
    const _params = PluginManager.parameters(_pluginName);
    const FORCED_CAPTURES = String(_params.forcedCaptures !== undefined ? _params.forcedCaptures : "true") === "true";

    // ========================================================================
    //  ENGINE (unit-tested). Player 'p' bottom moves up; AI 'a' top moves down.
    //  Playable dark squares: (r+c)%2===1.
    // ========================================================================
    const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const cloneB = b => b.map(row => row.map(p => p ? { c: p.c, k: p.k } : null));
    const UP = [[-1, -1], [-1, 1]], DOWN = [[1, -1], [1, 1]], ALL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const dirsOf = p => p.k ? ALL : (p.c === 'p' ? UP : DOWN);
    const promoRow = side => side === 'p' ? 0 : 7;

    function initialBoard() {
        const b = Array.from({ length: 8 }, () => Array(8).fill(null));
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 1) continue;
            if (r <= 2) b[r][c] = { c: 'a', k: false };
            else if (r >= 5) b[r][c] = { c: 'p', k: false };
        }
        return b;
    }
    const initialState = () => ({ board: initialBoard(), turn: 'p', noCap: 0 });

    function jumpsFrom(board, r, c, piece) {
        const res = [];
        for (const [dr, dc] of dirsOf(piece)) {
            const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
            if (!inb(lr, lc)) continue;
            const mid = board[mr][mc];
            if (!mid || mid.c === piece.c || board[lr][lc]) continue;
            const nb = cloneB(board); nb[r][c] = null; nb[mr][mc] = null;
            const becameKing = !piece.k && lr === promoRow(piece.c);
            const np = { c: piece.c, k: piece.k || becameKing };
            nb[lr][lc] = np;
            if (becameKing) res.push({ to: [lr, lc], captured: [[mr, mc]], promo: true, path: [[lr, lc]] });
            else {
                const cont = jumpsFrom(nb, lr, lc, np);
                if (cont.length === 0) res.push({ to: [lr, lc], captured: [[mr, mc]], promo: false, path: [[lr, lc]] });
                else for (const s of cont) res.push({ to: s.to, captured: [[mr, mc], ...s.captured], promo: s.promo, path: [[lr, lc], ...s.path] });
            }
        }
        return res;
    }
    function generateMoves(state) {
        const { board, turn } = state, caps = [], quiet = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c]; if (!p || p.c !== turn) continue;
            for (const j of jumpsFrom(board, r, c, p)) caps.push({ from: [r, c], to: j.to, captured: j.captured, promo: j.promo, path: j.path });
        }
        if (caps.length && FORCED_CAPTURES) return caps;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c]; if (!p || p.c !== turn) continue;
            for (const [dr, dc] of dirsOf(p)) { const nr = r + dr, nc = c + dc; if (inb(nr, nc) && !board[nr][nc]) quiet.push({ from: [r, c], to: [nr, nc], captured: [], promo: nr === promoRow(p.c), path: [[nr, nc]] }); }
        }
        if (caps.length) return caps.concat(quiet); // reached only when captures are optional
        return quiet;
    }
    function applyMove(state, m) {
        const board = cloneB(state.board);
        const [fr, fc] = m.from, [tr, tc] = m.to, piece = board[fr][fc];
        board[fr][fc] = null;
        for (const [cr, cc] of m.captured) board[cr][cc] = null;
        board[tr][tc] = { c: piece.c, k: piece.k || tr === promoRow(piece.c) };
        return { board, turn: state.turn === 'p' ? 'a' : 'p', noCap: m.captured.length ? 0 : state.noCap + 1 };
    }
    function terminalResult(state) {
        if (state.noCap >= 80) return 'draw';
        if (generateMoves(state).length === 0) return state.turn === 'p' ? 'lose' : 'win';
        return null;
    }

    // ---- AI: minimax (player maximizes 'p' advantage is negative for AI) ----
    function evaluate(board) {
        // Positive favours the AI ('a'); used from the AI's search viewpoint.
        let s = 0;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c]; if (!p) continue;
            const val = (p.k ? 175 : 100) + (p.c === 'a' ? r * 4 : (7 - r) * 4); // advance men
            s += p.c === 'a' ? val : -val;
        }
        return s;
    }
    function search(state, depth, alpha, beta) {
        const res = terminalResult(state);
        if (res === 'win') return -100000;   // player wins => bad for AI
        if (res === 'lose') return 100000;    // player loses => good for AI
        if (res === 'draw') return 0;
        if (depth === 0) return evaluate(state.board);
        const moves = generateMoves(state);
        if (state.turn === 'a') { // maximizing
            let best = -Infinity;
            for (const m of moves) { best = Math.max(best, search(applyMove(state, m), depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
            return best;
        } else { // minimizing (player)
            let best = Infinity;
            for (const m of moves) { best = Math.min(best, search(applyMove(state, m), depth - 1, alpha, beta)); beta = Math.min(beta, best); if (beta <= alpha) break; }
            return best;
        }
    }
    function chooseAIMove(state, skill) {
        const moves = generateMoves(state);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];
        if (Math.random() < BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.5, 0.0)) return BoardGameAI.pick(moves);
        const depth = BoardGameAI.depthForSkill(skill, 2, 7, MAX_SKILL);
        let best = -Infinity, cands = [];
        for (const m of moves) {
            const v = search(applyMove(state, m), depth - 1, -Infinity, Infinity);
            if (v > best + 5) { best = v; cands = [m]; }
            else if (v >= best - 5) { cands.push(m); best = Math.max(best, v); }
        }
        return BoardGameAI.pick(cands);
    }

    // ========================================================================
    //  SCENE
    // ========================================================================
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

    class Scene_Checkers extends Scene_BoardGameBase {
        onMatchStart() {
            this.state = initialState();
            this._sel = null; this._legalForSel = [];
            this._cursor = [5, 0]; this._lastMove = null;
            this._phase = 'player'; this._timer = 0;
            this.buildBoardSprite(); this.redraw(); this.refreshStatus();
            this.showMessage("Your move. Click a piece, then a highlighted square.");
        }
        buildBoardSprite() {
            const area = this.boardAreaRect();
            this._cell = Math.floor(Math.min(area.width, area.height) / 8);
            const px = this._cell * 8;
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._ox = area.x + Math.floor((area.width - px) / 2) + mX;
            this._oy = area.y + Math.floor((area.height - px) / 2) + mY;
            this._boardSprite = new Sprite(new Bitmap(px, px));
            this._boardSprite.x = this._ox; this._boardSprite.y = this._oy;
            this.addChild(this._boardSprite);
        }
        updateGame() {
            if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'aiThink') { if (--this._timer <= 0) this.doAIMove(); }
        }
        cellFromTouch() {
            const x = TouchInput.x - this._ox, y = TouchInput.y - this._oy;
            if (x < 0 || y < 0) return null;
            const c = Math.floor(x / this._cell), r = Math.floor(y / this._cell);
            return inb(r, c) ? [r, c] : null;
        }
        updatePlayer() {
            if (TouchInput.isTriggered()) { const cell = this.cellFromTouch(); if (cell) this.activateCell(cell[0], cell[1]); }
            if (Input.isRepeated('right')) this.moveCursor(0, 1);
            if (Input.isRepeated('left')) this.moveCursor(0, -1);
            if (Input.isRepeated('down')) this.moveCursor(1, 0);
            if (Input.isRepeated('up')) this.moveCursor(-1, 0);
            if (Input.isTriggered('ok')) this.activateCell(this._cursor[0], this._cursor[1]);
        }
        moveCursor(dr, dc) {
            this._cursor = [Math.max(0, Math.min(7, this._cursor[0] + dr)), Math.max(0, Math.min(7, this._cursor[1] + dc))];
            this.playSe('select'); this.redraw();
        }
        activateCell(r, c) {
            this._cursor = [r, c];
            // Pick the destination move; if several sequences share a landing, take the one capturing most.
            const matches = this._legalForSel.filter(m => m.to[0] === r && m.to[1] === c);
            if (this._sel && matches.length) {
                matches.sort((a, b) => b.captured.length - a.captured.length);
                this.applyPlayerMove(matches[0]); return;
            }
            const p = this.state.board[r][c];
            if (p && p.c === 'p') {
                this._sel = [r, c];
                this._legalForSel = generateMoves(this.state).filter(m => m.from[0] === r && m.from[1] === c);
                this.playSe('select');
            } else { this._sel = null; this._legalForSel = []; }
            this.redraw();
        }
        applyPlayerMove(m) {
            this.playSe('move');
            this.state = applyMove(this.state, m);
            this._lastMove = [m.from, m.to];
            this._sel = null; this._legalForSel = [];
            this.afterMove();
        }
        doAIMove() {
            const m = chooseAIMove(this.state, this.difficulty);
            if (!m) { this.afterMove(); return; }
            this.playSe('move');
            this.state = applyMove(this.state, m);
            this._lastMove = [m.from, m.to];
            this.afterMove();
        }
        afterMove() {
            this.redraw(); this.refreshStatus();
            const result = terminalResult(this.state);
            if (result) { this.endMatch(result); return; }
            if (this.state.turn === 'a') {
                this._phase = 'aiThink'; this._timer = 32;
                this.showMessage(this.opponent.name + " is thinking...");
                if (Math.random() < 0.4) this.taunt('thinking');
            } else { this._phase = 'player'; this.showMessage("Your move."); }
        }
        refreshStatus() {
            let pc = 0, ac = 0, pk = 0, ak = 0, b = this.state.board;
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = b[r][c]; if (!p) continue; if (p.c === 'p') { pc++; if (p.k) pk++; } else { ac++; if (p.k) ak++; } }
            this.setStatus(["You: " + pc + " (" + pk + " kings)", this.opponent.name + ": " + ac + " (" + ak + " kings)", "", "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }
        redraw() {
            const bmp = this._boardSprite.bitmap, cell = this._cell;
            bmp.clear();
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) bmp.fillRect(c * cell, r * cell, cell, cell, (r + c) % 2 === 1 ? C.boardDark : C.boardLight);
            if (this._lastMove) for (const [r, c] of this._lastMove) bmp.fillRect(c * cell, r * cell, cell, cell, rgba(C.draw, 0.28));
            if (this._sel) bmp.fillRect(this._sel[1] * cell, this._sel[0] * cell, cell, cell, rgba(C.highlight, 0.45));
            const [cr, cc] = this._cursor;
            bmp.strokeRect(cc * cell + 1, cr * cell + 1, cell - 2, cell - 2, C.highlight);
            for (const m of this._legalForSel) {
                const x = m.to[1] * cell + cell / 2, y = m.to[0] * cell + cell / 2;
                bmp.drawCircle(x, y, Math.floor(cell * (m.captured.length ? 0.18 : 0.12)), rgba(C.highlight, 0.85));
            }
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = this.state.board[r][c]; if (p) this.drawPiece(bmp, r, c, p); }
        }
        drawPiece(bmp, r, c, p) {
            const cell = this._cell, cx = c * cell + cell / 2, cy = r * cell + cell / 2, rad = Math.floor(cell * 0.36);
            const isP = p.c === 'p';
            bmp.drawCircle(cx, cy, rad, rgba(C.lineColor, 0.35));            // shadow ring
            bmp.drawCircle(cx, cy, rad - 2, isP ? '#e7dcc0' : '#3a2018');    // body (light vs dark brown)
            bmp.drawCircle(cx, cy, Math.floor(rad * 0.62), isP ? '#d8c79c' : '#4d2c22'); // inset
            if (p.k) { // king marker: golden ring
                bmp.drawCircle(cx, cy, Math.floor(rad * 0.34), rgba('#e7c15a', 0.95));
                bmp.drawCircle(cx, cy, Math.floor(rad * 0.20), isP ? '#d8c79c' : '#4d2c22');
            }
        }
    }

    BoardGameManager.registerGame({ id: 'checkers', name: 'Checkers', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Checkers });
})();
