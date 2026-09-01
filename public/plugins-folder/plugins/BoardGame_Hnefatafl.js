/*:
 * @target MZ
 * @plugindesc [v1.0.0] Hnefatafl (Viking Chess) for the Board Game engine. Copenhagen 11x11 rules. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Hnefatafl.js  —  Game Id: "hnefatafl"
 * ============================================================================
 * The old Norse "king's table". Install BoardGameCore.js ABOVE this plugin,
 * then launch with "Start Board Game" using Game Id: hnefatafl.
 *
 * You command the DEFENDERS: the King (gold) and his 12 guards, starting in the
 * centre on the throne. The AI commands the 24 ATTACKERS around the edges and,
 * by tradition, moves FIRST.
 *
 *   - All pieces move like a rook: any distance in a straight line, no jumping.
 *   - Only the King may stop on the throne (centre) or the corners.
 *   - Capture an enemy by flanking it between two of your pieces (or a piece and
 *     a corner / the empty throne).
 *   - YOU WIN if the King reaches any CORNER.
 *   - The AI WINS if it surrounds the King on all four sides (the throne helps).
 *
 * Click a piece then its destination (or arrow keys + OK). Difficulty scales the
 * attacker AI's search depth and mistakes. Rules (movement, custodial + hostile
 * captures, king escape and surround) are engine-tested.
 *
 * OMITTED (rare Copenhagen extras): shield-wall captures and exit forts.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Hnefatafl] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

    // -------- engine (tested) --------
    const N = 11;
    const CORNERS = [[0, 0], [0, 10], [10, 0], [10, 10]];
    const isCorner = (r, c) => (r === 0 || r === 10) && (c === 0 || c === 10);
    const isThrone = (r, c) => r === 5 && c === 5;
    const inb = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const isDef = p => p === 'd' || p === 'k';
    const cloneBoard = b => b.map(row => row.slice());
    function initialBoard() {
        const b = Array.from({ length: N }, () => Array(N).fill(null));
        b[5][5] = 'k';
        for (const [r, c] of [[3, 5], [4, 5], [6, 5], [7, 5], [5, 3], [5, 4], [5, 6], [5, 7], [4, 4], [4, 6], [6, 4], [6, 6]]) b[r][c] = 'd';
        for (const [r, c] of [[0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 5], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [9, 5], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [5, 1], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [5, 9]]) b[r][c] = 'a';
        return b;
    }
    const initialState = () => ({ board: initialBoard(), turn: 'att', plies: 0 });
    function hostileAnvil(board, r, c) { if (isCorner(r, c)) return true; if (isThrone(r, c) && board[r][c] === null) return true; return false; }
    function findKing(board) { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === 'k') return [r, c]; return null; }
    function genMoves(state) {
        const { board, turn } = state; const moves = [];
        const mine = turn === 'att' ? (p => p === 'a') : isDef;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const p = board[r][c]; if (!p || !mine(p)) continue;
            const king = p === 'k';
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                let rr = r + dr, cc = c + dc;
                while (inb(rr, cc) && board[rr][cc] === null) {
                    const restricted = isThrone(rr, cc) || isCorner(rr, cc);
                    if (!restricted || king) moves.push({ from: [r, c], to: [rr, cc] });
                    if (isCorner(rr, cc) && !king) break;
                    rr += dr; cc += dc;
                }
            }
        }
        return moves;
    }
    function applyMove(state, m) {
        const board = cloneBoard(state.board);
        const [fr, fc] = m.from, [tr, tc] = m.to;
        const piece = board[fr][fc]; board[fr][fc] = null; board[tr][tc] = piece;
        const mover = state.turn;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const ar = tr + dr, ac = tc + dc, br = tr + 2 * dr, bc = tc + 2 * dc;
            if (!inb(ar, ac)) continue;
            const adj = board[ar][ac]; if (!adj) continue;
            const adjIsEnemy = mover === 'att' ? adj === 'd' : adj === 'a';
            if (!adjIsEnemy) continue;
            let anvil = false;
            if (inb(br, bc)) { const beyond = board[br][bc]; const friendly = mover === 'att' ? beyond === 'a' : (beyond === 'd' || beyond === 'k'); anvil = friendly || hostileAnvil(board, br, bc); }
            if (anvil) board[ar][ac] = null;
        }
        return { board, turn: mover === 'att' ? 'def' : 'att', plies: state.plies + 1, captured: countPieces(board) };
    }
    function kingSurrounded(board, k) { const [r, c] = k; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const rr = r + dr, cc = c + dc; if (!inb(rr, cc)) return false; if (!(board[rr][cc] === 'a' || isThrone(rr, cc))) return false; } return true; }
    function terminal(state, prevMover) {
        const board = state.board; const k = findKing(board);
        if (!k) return 'att';
        if (isCorner(k[0], k[1])) return 'def';
        if (prevMover === 'att' && kingSurrounded(board, k)) return 'att';
        if (genMoves(state).length === 0) return state.turn === 'att' ? 'def' : 'att';
        if (state.plies >= 400) return 'draw';
        return null;
    }
    function countPieces(board) { let a = 0, d = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (board[r][c] === 'a') a++; else if (board[r][c] === 'd') d++; } return { a, d }; }
    function kingDistToCorner(k) { let best = 99; for (const [cr, cc] of CORNERS) best = Math.min(best, Math.abs(k[0] - cr) + Math.abs(k[1] - cc)); return best; }
    function evalAtt(board) {
        const { a, d } = countPieces(board); const k = findKing(board);
        let s = (12 - d) * 10 - (24 - a) * 6;
        if (k) { s += kingDistToCorner(k) * 3; let sur = 0; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const rr = k[0] + dr, cc = k[1] + dc; if (inb(rr, cc) && (board[rr][cc] === 'a' || isThrone(rr, cc))) sur++; } s += sur * 12; }
        return s;
    }
    function search(state, depth, alpha, beta, prevMover) {
        const t = terminal(state, prevMover);
        if (t === 'att') return 100000 - (10 - depth);
        if (t === 'def') return -100000 + (10 - depth);
        if (t === 'draw') return 0;
        if (depth === 0) return evalAtt(state.board);
        let moves = genMoves(state).slice(0, 60);
        if (state.turn === 'att') { let best = -Infinity; for (const m of moves) { best = Math.max(best, search(applyMove(state, m), depth - 1, alpha, beta, 'att')); alpha = Math.max(alpha, best); if (beta <= alpha) break; } return best; }
        else { let best = Infinity; for (const m of moves) { best = Math.min(best, search(applyMove(state, m), depth - 1, alpha, beta, 'def')); beta = Math.min(beta, best); if (beta <= alpha) break; } return best; }
    }
    function chooseAIMoveSkilled(state, skill) {
        const moves = genMoves(state); if (!moves.length) return null;
        if (Math.random() < BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.5, 0.0)) return BoardGameAI.pick(moves);
        const att = state.turn === 'att';
        const depth = skill >= 4 ? 2 : 1;
        const scored = moves.map(m => ({ m, s: evalAtt(applyMove(state, m).board) }));
        scored.sort((x, y) => att ? y.s - x.s : x.s - y.s);
        const pool = (depth >= 2 ? scored.slice(0, 24) : scored).map(o => o.m);
        let best = att ? -Infinity : Infinity, cands = [];
        for (const m of pool) {
            const v = depth >= 2 ? search(applyMove(state, m), depth - 1, -Infinity, Infinity, state.turn) : evalAtt(applyMove(state, m).board);
            if (att ? v > best : v < best) { best = v; cands = [m]; } else if (v === best) cands.push(m);
        }
        return BoardGameAI.pick(cands);
    }

    // -------- scene --------
    class Scene_Hnefatafl extends Scene_BoardGameBase {
        onMatchStart() {
            this.state = initialState();
            this._sel = null; this._legal = []; this._cursor = [5, 5]; this._last = null;
            this._phase = 'aiThink'; this._timer = 40; // attackers (AI) move first
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.taunt('greeting');
            this.showMessage("You defend the King. Get him to a corner. The attackers move first...");
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
            const move = this._legal.find(m => m.to[0] === r && m.to[1] === c);
            if (this._sel && move) { this.applyPlayer(move); return; }
            const p = this.state.board[r][c];
            if (isDef(p)) { this._sel = [r, c]; this._legal = genMoves(this.state).filter(m => m.from[0] === r && m.from[1] === c); this.playSe('select'); }
            else { this._sel = null; this._legal = []; }
            this.redraw();
        }
        applyPlayer(m) {
            const before = countPieces(this.state.board).a;
            this.playSe('move'); this.state = applyMove(this.state, m); this._last = [m.from, m.to];
            this._sel = null; this._legal = [];
            const after = countPieces(this.state.board).a;
            this.redraw(); this.refreshStatus();
            if (after < before) this.showMessage("You captured " + (before - after) + " attacker(s)!");
            const t = terminal(this.state, 'def');
            if (t) { this.endMatch(t === 'def' ? 'win' : t === 'att' ? 'lose' : 'draw'); return; }
            this._phase = 'aiThink'; this._timer = 36; this.showMessage(this.opponent.name + " (attackers) is plotting...");
        }
        doAI() {
            const beforeD = countPieces(this.state.board).d;
            const m = chooseAIMoveSkilled(this.state, this.difficulty);
            if (!m) { this.endMatch('win'); return; } // attackers have no move -> defenders win
            this.playSe('move'); this.state = applyMove(this.state, m); this._last = [m.from, m.to];
            const afterD = countPieces(this.state.board).d;
            this.redraw(); this.refreshStatus();
            if (afterD < beforeD) { this.showMessage(this.opponent.name + " captured " + (beforeD - afterD) + " defender(s)!"); this.taunt('thinking'); }
            else this.showMessage("Your move — protect the King.");
            const t = terminal(this.state, 'att');
            if (t) { this.endMatch(t === 'def' ? 'win' : t === 'att' ? 'lose' : 'draw'); return; }
            this._phase = 'player';
        }
        refreshStatus() {
            const { a, d } = countPieces(this.state.board); const k = findKing(this.state.board);
            this.setStatus(["Defenders: " + d + " + King", "Attackers: " + a, "", "King → corner: " + (k ? kingDistToCorner(k) : '-'), "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }
        redraw() {
            const bmp = this._sprite.bitmap, cell = this._cell;
            bmp.clear();
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
                const x = c * cell, y = r * cell;
                let col = (r + c) % 2 === 0 ? C.boardLight : C.boardDark;
                bmp.fillRect(x, y, cell, cell, col);
                if (isCorner(r, c)) bmp.fillRect(x, y, cell, cell, rgba(C.win, 0.28));
                if (isThrone(r, c)) bmp.fillRect(x, y, cell, cell, rgba(C.highlight, 0.22));
                bmp.strokeRect(x, y, cell, cell, rgba(C.lineColor, 0.5));
            }
            if (this._last) for (const [r, c] of this._last) bmp.fillRect(c * cell, r * cell, cell, cell, rgba(C.draw, 0.25));
            if (this._sel) bmp.fillRect(this._sel[1] * cell, this._sel[0] * cell, cell, cell, rgba(C.highlight, 0.4));
            const [cr, cc] = this._cursor; bmp.strokeRect(cc * cell + 1, cr * cell + 1, cell - 2, cell - 2, C.highlight);
            for (const m of this._legal) { const x = m.to[1] * cell + cell / 2, y = m.to[0] * cell + cell / 2; bmp.drawCircle(x, y, Math.floor(cell * 0.12), rgba(C.highlight, 0.85)); }
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const p = this.state.board[r][c]; if (p) this.drawPiece(bmp, r, c, p); }
        }
        drawPiece(bmp, r, c, p) {
            const cell = this._cell, cx = c * cell + cell / 2, cy = r * cell + cell / 2, rad = Math.floor(cell * 0.36);
            if (p === 'a') { bmp.drawCircle(cx, cy, rad, rgba(C.lineColor, 0.4)); bmp.drawCircle(cx, cy, rad - 2, '#33303a'); bmp.drawCircle(cx, cy, Math.floor(rad * 0.5), '#4a4550'); }
            else if (p === 'd') { bmp.drawCircle(cx, cy, rad, rgba(C.lineColor, 0.4)); bmp.drawCircle(cx, cy, rad - 2, '#e7dcc0'); bmp.drawCircle(cx, cy, Math.floor(rad * 0.5), '#cdbf9c'); }
            else { bmp.drawCircle(cx, cy, rad, rgba('#7a5b12', 0.9)); bmp.drawCircle(cx, cy, rad - 2, '#e7c15a'); bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(cell * 0.4); bmp.textColor = '#5a4410'; bmp.drawText('K', c * cell, r * cell + Math.floor(cell * 0.06), cell, cell, 'center'); }
        }
    }

    BoardGameManager.registerGame({ id: 'hnefatafl', name: 'Hnefatafl', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Hnefatafl });
})();
