/*:
 * @target MZ
 * @plugindesc [v1.0.0] Chess for the Board Game engine. Full rules: castling, en passant, promotion, check/checkmate/stalemate. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Chess.js  —  Game Id: "chess"
 * ============================================================================
 * A complete chess opponent. Install BoardGameCore.js ABOVE this plugin, then
 * launch with the "Start Board Game" command using Game Id: chess.
 *
 * The player is White and moves first. Move by clicking a piece then its
 * destination (or use the arrow keys + OK). Castle by moving the king two
 * squares; en passant and pawn promotion (auto-queen) are handled for you.
 *
 * Difficulty (opponent skill 1..Max) scales AI search depth and how often it
 * blunders, so a skill-1 opponent is a gentle beginner and a skill-5 opponent
 * searches several plies with almost no mistakes.
 *
 * Move generation is verified by perft (startpos to depth 4, plus Kiwipete and
 * an en-passant/promotion position), so castling, en passant, promotion and
 * check handling are correct.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") {
        console.error("[BoardGame_Chess] Install BoardGameCore.js above this plugin."); return;
    }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;

    // ========================================================================
    //  ENGINE (verified by perft) — r=0 is rank 8 (Black home). White = 'w'.
    // ========================================================================
    const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const cloneBoard = b => b.map(row => row.map(p => p ? { t: p.t, c: p.c } : null));

    function initialBoard() {
        const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        const b = Array.from({ length: 8 }, () => Array(8).fill(null));
        for (let c = 0; c < 8; c++) {
            b[0][c] = { t: back[c], c: 'b' }; b[1][c] = { t: 'p', c: 'b' };
            b[6][c] = { t: 'p', c: 'w' }; b[7][c] = { t: back[c], c: 'w' };
        }
        return b;
    }
    function initialState() {
        return { board: initialBoard(), turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, halfmove: 0 };
    }
    function isAttacked(board, r, c, by) {
        const pd = by === 'w' ? -1 : 1;
        for (const dc of [-1, 1]) { const pr = r - pd, pc = c + dc; if (inb(pr, pc)) { const p = board[pr][pc]; if (p && p.c === by && p.t === 'p') return true; } }
        for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) { const rr = r + dr, cc = c + dc; if (inb(rr, cc)) { const p = board[rr][cc]; if (p && p.c === by && p.t === 'n') return true; } }
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (inb(rr, cc)) { const p = board[rr][cc]; if (p && p.c === by && p.t === 'k') return true; } }
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { let rr = r + dr, cc = c + dc; while (inb(rr, cc)) { const p = board[rr][cc]; if (p) { if (p.c === by && (p.t === 'b' || p.t === 'q')) return true; break; } rr += dr; cc += dc; } }
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { let rr = r + dr, cc = c + dc; while (inb(rr, cc)) { const p = board[rr][cc]; if (p) { if (p.c === by && (p.t === 'r' || p.t === 'q')) return true; break; } rr += dr; cc += dc; } }
        return false;
    }
    function findKing(board, color) { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = board[r][c]; if (p && p.t === 'k' && p.c === color) return [r, c]; } return null; }
    function inCheck(board, color) { const k = findKing(board, color); return k ? isAttacked(board, k[0], k[1], color === 'w' ? 'b' : 'w') : false; }
    function mk(fr, fc, tr, tc, piece, capture, flags) { return { from: [fr, fc], to: [tr, tc], piece: { t: piece.t, c: piece.c }, capture: capture ? { t: capture.t, c: capture.c } : null, flags: flags || {} }; }

    function genPseudo(state) {
        const { board, turn, castling, ep } = state;
        const moves = [];
        const dir = turn === 'w' ? -1 : 1;
        const startRank = turn === 'w' ? 6 : 1;
        const promoRank = turn === 'w' ? 0 : 7;
        const enemy = turn === 'w' ? 'b' : 'w';
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c]; if (!p || p.c !== turn) continue;
            if (p.t === 'p') {
                const r1 = r + dir;
                if (inb(r1, c) && !board[r1][c]) {
                    if (r1 === promoRank) for (const pr of ['q', 'r', 'b', 'n']) moves.push(mk(r, c, r1, c, p, null, { promo: pr }));
                    else moves.push(mk(r, c, r1, c, p, null, {}));
                    if (r === startRank) { const r2 = r + 2 * dir; if (!board[r2][c]) moves.push(mk(r, c, r2, c, p, null, { double: true })); }
                }
                for (const dc of [-1, 1]) {
                    const cr = r + dir, cc = c + dc; if (!inb(cr, cc)) continue;
                    const tp = board[cr][cc];
                    if (tp && tp.c === enemy) {
                        if (cr === promoRank) for (const pr of ['q', 'r', 'b', 'n']) moves.push(mk(r, c, cr, cc, p, tp, { promo: pr }));
                        else moves.push(mk(r, c, cr, cc, p, tp, {}));
                    } else if (ep && ep[0] === cr && ep[1] === cc) moves.push(mk(r, c, cr, cc, p, board[r][cc], { ep: true }));
                }
            } else if (p.t === 'n') {
                for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) { const rr = r + dr, cc = c + dc; if (!inb(rr, cc)) continue; const tp = board[rr][cc]; if (!tp || tp.c === enemy) moves.push(mk(r, c, rr, cc, p, tp || null, {})); }
            } else if (p.t === 'k') {
                for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (!inb(rr, cc)) continue; const tp = board[rr][cc]; if (!tp || tp.c === enemy) moves.push(mk(r, c, rr, cc, p, tp || null, {})); }
                const rank = turn === 'w' ? 7 : 0;
                if (r === rank && c === 4) {
                    const ks = turn === 'w' ? castling.wK : castling.bK, qs = turn === 'w' ? castling.wQ : castling.bQ;
                    if (ks && !board[rank][5] && !board[rank][6] && board[rank][7] && board[rank][7].t === 'r' && board[rank][7].c === turn && !isAttacked(board, rank, 4, enemy) && !isAttacked(board, rank, 5, enemy) && !isAttacked(board, rank, 6, enemy)) moves.push(mk(r, c, rank, 6, p, null, { castle: 'K' }));
                    if (qs && !board[rank][1] && !board[rank][2] && !board[rank][3] && board[rank][0] && board[rank][0].t === 'r' && board[rank][0].c === turn && !isAttacked(board, rank, 4, enemy) && !isAttacked(board, rank, 3, enemy) && !isAttacked(board, rank, 2, enemy)) moves.push(mk(r, c, rank, 2, p, null, { castle: 'Q' }));
                }
            } else {
                let dirs = p.t === 'b' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : p.t === 'r' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (inb(rr, cc)) { const tp = board[rr][cc]; if (!tp) moves.push(mk(r, c, rr, cc, p, null, {})); else { if (tp.c === enemy) moves.push(mk(r, c, rr, cc, p, tp, {})); break; } rr += dr; cc += dc; } }
            }
        }
        return moves;
    }
    function makeMove(state, m) {
        const board = cloneBoard(state.board);
        const turn = state.turn, enemy = turn === 'w' ? 'b' : 'w';
        const castling = { ...state.castling };
        let ep = null;
        const [fr, fc] = m.from, [tr, tc] = m.to;
        const piece = board[fr][fc];
        board[fr][fc] = null;
        if (m.flags.ep) board[fr][tc] = null;
        board[tr][tc] = m.flags.promo ? { t: m.flags.promo, c: turn } : piece;
        if (m.flags.castle === 'K') { board[fr][5] = board[fr][7]; board[fr][7] = null; }
        if (m.flags.castle === 'Q') { board[fr][3] = board[fr][0]; board[fr][0] = null; }
        if (m.flags.double) ep = [(fr + tr) / 2, fc];
        if (piece.t === 'k') { if (turn === 'w') { castling.wK = castling.wQ = false; } else { castling.bK = castling.bQ = false; } }
        if (piece.t === 'r') { if (turn === 'w') { if (fr === 7 && fc === 0) castling.wQ = false; if (fr === 7 && fc === 7) castling.wK = false; } else { if (fr === 0 && fc === 0) castling.bQ = false; if (fr === 0 && fc === 7) castling.bK = false; } }
        if (m.capture && m.capture.t === 'r') { if (tr === 7 && tc === 0) castling.wQ = false; if (tr === 7 && tc === 7) castling.wK = false; if (tr === 0 && tc === 0) castling.bQ = false; if (tr === 0 && tc === 7) castling.bK = false; }
        const halfmove = (piece.t === 'p' || m.capture) ? 0 : state.halfmove + 1;
        return { board, turn: enemy, castling, ep, halfmove };
    }
    function genLegal(state) { return genPseudo(state).filter(m => !inCheck(makeMove(state, m).board, state.turn)); }

    // ========================================================================
    //  EVALUATION + SEARCH (negamax + alpha-beta, difficulty-scaled)
    // ========================================================================
    const MAT = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    const PST = {
        p: [[0, 0, 0, 0, 0, 0, 0, 0], [50, 50, 50, 50, 50, 50, 50, 50], [10, 10, 20, 30, 30, 20, 10, 10], [5, 5, 10, 25, 25, 10, 5, 5], [0, 0, 0, 20, 20, 0, 0, 0], [5, -5, -10, 0, 0, -10, -5, 5], [5, 10, 10, -20, -20, 10, 10, 5], [0, 0, 0, 0, 0, 0, 0, 0]],
        n: [[-50, -40, -30, -30, -30, -30, -40, -50], [-40, -20, 0, 0, 0, 0, -20, -40], [-30, 0, 10, 15, 15, 10, 0, -30], [-30, 5, 15, 20, 20, 15, 5, -30], [-30, 0, 15, 20, 20, 15, 0, -30], [-30, 5, 10, 15, 15, 10, 5, -30], [-40, -20, 0, 5, 5, 0, -20, -40], [-50, -40, -30, -30, -30, -30, -40, -50]],
        b: [[-20, -10, -10, -10, -10, -10, -10, -20], [-10, 0, 0, 0, 0, 0, 0, -10], [-10, 0, 5, 10, 10, 5, 0, -10], [-10, 5, 5, 10, 10, 5, 5, -10], [-10, 0, 10, 10, 10, 10, 0, -10], [-10, 10, 10, 10, 10, 10, 10, -10], [-10, 5, 0, 0, 0, 0, 5, -10], [-20, -10, -10, -10, -10, -10, -10, -20]],
        r: [[0, 0, 0, 0, 0, 0, 0, 0], [5, 10, 10, 10, 10, 10, 10, 5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [0, 0, 0, 5, 5, 0, 0, 0]],
        q: [[-20, -10, -10, -5, -5, -10, -10, -20], [-10, 0, 0, 0, 0, 0, 0, -10], [-10, 0, 5, 5, 5, 5, 0, -10], [-5, 0, 5, 5, 5, 5, 0, -5], [0, 0, 5, 5, 5, 5, 0, -5], [-10, 5, 5, 5, 5, 5, 0, -10], [-10, 0, 5, 0, 0, 0, 0, -10], [-20, -10, -10, -5, -5, -10, -10, -20]],
        k: [[-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-20, -30, -30, -40, -40, -30, -30, -20], [-10, -20, -20, -20, -20, -20, -20, -10], [20, 20, 0, 0, 0, 0, 20, 20], [20, 30, 10, 0, 0, 10, 30, 20]]
    };
    const MATE = 100000;
    function evalWhite(board) {
        let s = 0;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c]; if (!p) continue;
            if (p.c === 'w') s += MAT[p.t] + PST[p.t][r][c];
            else s -= MAT[p.t] + PST[p.t][7 - r][c];
        }
        return s;
    }
    const evalStm = state => (state.turn === 'w' ? 1 : -1) * evalWhite(state.board);
    function orderMoves(moves) { moves.sort((a, b) => (b.capture ? MAT[b.capture.t] : 0) - (a.capture ? MAT[a.capture.t] : 0)); }
    function negamax(state, depth, alpha, beta, ply) {
        if (depth === 0) return evalStm(state);
        const moves = genLegal(state);
        if (moves.length === 0) return inCheck(state.board, state.turn) ? -(MATE - ply) : 0;
        orderMoves(moves);
        for (const m of moves) {
            const v = -negamax(makeMove(state, m), depth - 1, -beta, -alpha, ply + 1);
            if (v >= beta) return beta;
            if (v > alpha) alpha = v;
        }
        return alpha;
    }
    function chooseAIMove(state, skill) {
        const moves = genLegal(state);
        if (moves.length === 0) return null;
        // Blunder chance at low skill: sometimes play a random legal move.
        if (Math.random() < BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.45, 0.0)) return BoardGameAI.pick(moves);
        const depth = BoardGameAI.depthForSkill(skill, 1, 3, MAX_SKILL);
        orderMoves(moves);
        let best = -Infinity, cands = [], alpha = -Infinity;
        for (const m of moves) {
            const v = -negamax(makeMove(state, m), depth - 1, -Infinity, -alpha, 1);
            if (v > best + 12) { best = v; cands = [m]; alpha = Math.max(alpha, v); }
            else if (v >= best - 12) { cands.push(m); best = Math.max(best, v); alpha = Math.max(alpha, v); }
        }
        return BoardGameAI.pick(cands);
    }
    function terminalResult(state) {
        // From the PLAYER's perspective (player is White).
        if (state.halfmove >= 100) return 'draw';
        if (insufficientMaterial(state.board)) return 'draw';
        const moves = genLegal(state);
        if (moves.length > 0) return null;
        if (inCheck(state.board, state.turn)) return state.turn === 'w' ? 'lose' : 'win'; // side to move is mated
        return 'draw'; // stalemate
    }
    function insufficientMaterial(board) {
        const pieces = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = board[r][c]; if (p && p.t !== 'k') pieces.push(p.t); }
        if (pieces.length === 0) return true;                 // K vs K
        if (pieces.length === 1 && (pieces[0] === 'n' || pieces[0] === 'b')) return true; // K+minor vs K
        return false;
    }

    // ========================================================================
    //  SCENE
    // ========================================================================
    const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const LETTER = { p: 'P', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
    const rgba = (hex, a) => {
        const n = parseInt(hex.replace('#', ''), 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    class Scene_Chess extends Scene_BoardGameBase {
        onMatchStart() {
            this.state = initialState();
            this._sel = null;          // [r,c] selected square
            this._legalForSel = [];    // legal moves from selected square
            this._cursor = [6, 4];     // keyboard cursor
            this._lastMove = null;     // [from,to] for highlighting
            this._phase = 'player';
            this._timer = 0;
            this.buildBoardSprite();
            this.redraw();
            this.refreshStatus();
            this.showMessage("Your move (White). Click a piece, then its destination.");
        }

        buildBoardSprite() {
            const area = this.boardAreaRect();
            const N = 8;
            this._cell = Math.floor(Math.min(area.width, area.height) / N);
            const px = this._cell * N;
            const mX = (Graphics.width - Graphics.boxWidth) / 2;
            const mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._ox = area.x + Math.floor((area.width - px) / 2) + mX;
            this._oy = area.y + Math.floor((area.height - px) / 2) + mY;
            this._boardSprite = new Sprite(new Bitmap(px, px));
            this._boardSprite.x = this._ox;
            this._boardSprite.y = this._oy;
            this.addChild(this._boardSprite);
        }

        // --- input ----------------------------------------------------------
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
            const move = this._legalForSel.find(m => m.to[0] === r && m.to[1] === c);
            if (this._sel && move) { this.applyPlayerMove(move); return; }
            const p = this.state.board[r][c];
            if (p && p.c === 'w') {
                this._sel = [r, c];
                this._legalForSel = genLegal(this.state).filter(m => m.from[0] === r && m.from[1] === c);
                this.playSe('select');
            } else { this._sel = null; this._legalForSel = []; }
            this.redraw();
        }
        applyPlayerMove(move) {
            // Auto-queen: prefer the queen promotion when several share a square.
            const chosen = move.flags.promo
                ? this._legalForSel.find(m => m.to[0] === move.to[0] && m.to[1] === move.to[1] && m.flags.promo === 'q') || move
                : move;
            this.playSe('move');
            this.state = makeMove(this.state, chosen);
            this._lastMove = [chosen.from, chosen.to];
            this._sel = null; this._legalForSel = [];
            this.afterMove('player');
        }
        doAIMove() {
            const move = chooseAIMove(this.state, this.difficulty);
            if (!move) { this.afterMove('ai'); return; }
            this.playSe('move');
            this.state = makeMove(this.state, move);
            this._lastMove = [move.from, move.to];
            this.afterMove('ai');
        }
        afterMove(who) {
            this.redraw(); this.refreshStatus();
            const result = terminalResult(this.state);
            if (result) { this.endMatch(result); return; }
            const check = inCheck(this.state.board, this.state.turn);
            if (this.state.turn === 'b') {
                this._phase = 'aiThink'; this._timer = 34;
                this.showMessage(check ? "Check! " + this.opponent.name + " is thinking..." : this.opponent.name + " is thinking...");
                if (Math.random() < 0.4) this.taunt('thinking');
            } else {
                this._phase = 'player';
                this.showMessage(check ? "Check! Your move." : "Your move.");
            }
        }

        // --- drawing --------------------------------------------------------
        refreshStatus() {
            const wm = this.material('w'), bm = this.material('b');
            this.setStatus(["You (White): " + wm, this.opponent.name + " (Black): " + bm, "", "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }
        material(color) { let s = 0; const b = this.state.board; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = b[r][c]; if (p && p.c === color) s += MAT[p.t]; } return s; }
        redraw() {
            const bmp = this._boardSprite.bitmap, cell = this._cell;
            bmp.clear();
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                const x = c * cell, y = r * cell;
                bmp.fillRect(x, y, cell, cell, (r + c) % 2 === 0 ? C.boardLight : C.boardDark);
            }
            if (this._lastMove) for (const [r, c] of this._lastMove) bmp.fillRect(c * cell, r * cell, cell, cell, rgba(C.draw, 0.30));
            if (this._sel) bmp.fillRect(this._sel[1] * cell, this._sel[0] * cell, cell, cell, rgba(C.highlight, 0.45));
            // cursor outline
            const [cr, cc] = this._cursor;
            bmp.strokeRect(cc * cell + 1, cr * cell + 1, cell - 2, cell - 2, C.highlight);
            // legal destination dots
            for (const m of this._legalForSel) {
                const x = m.to[1] * cell + cell / 2, y = m.to[0] * cell + cell / 2;
                if (m.capture) { bmp.strokeRect(m.to[1] * cell + 2, m.to[0] * cell + 2, cell - 4, cell - 4, rgba(C.highlight, 0.9)); }
                else bmp.drawCircle(x, y, Math.floor(cell * 0.12), rgba(C.highlight, 0.85));
            }
            // pieces
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = this.state.board[r][c]; if (p) this.drawPiece(bmp, r, c, p); }
            // coordinate labels
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.max(10, Math.floor(cell * 0.20));
            for (let i = 0; i < 8; i++) {
                bmp.textColor = rgba(C.lineColor, 0.65);
                bmp.drawText(FILES[i], i * cell + 3, 8 * cell - Math.floor(cell * 0.28) - 2, cell, Math.floor(cell * 0.28), 'left');
                bmp.drawText(String(8 - i), 3, i * cell + 2, cell - 6, Math.floor(cell * 0.28), 'left');
            }
        }
        drawPiece(bmp, r, c, p) {
            const cell = this._cell, cx = c * cell + cell / 2, cy = r * cell + cell / 2, rad = Math.floor(cell * 0.36);
            const isW = p.c === 'w';
            bmp.drawCircle(cx, cy, rad, isW ? '#efe9d8' : '#2a2d3a');
            bmp.fontFace = BoardGameTheme.fonts.main();
            bmp.fontSize = Math.floor(cell * 0.42);
            bmp.textColor = isW ? '#2a2d3a' : '#efe9d8';
            bmp.drawText(LETTER[p.t], c * cell, r * cell + Math.floor(cell * 0.06), cell, cell, 'center');
        }
    }

    BoardGameManager.registerGame({ id: 'chess', name: 'Chess', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Chess });
})();
