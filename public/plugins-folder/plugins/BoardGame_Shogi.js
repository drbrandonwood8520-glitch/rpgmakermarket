/*:
 * @target MZ
 * @plugindesc [v1.0.0] Shogi (Japanese Chess) for the Board Game engine. Drops, promotion, full legal rules. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Shogi.js  —  Game Id: "shogi"
 * ============================================================================
 * Install BoardGameCore.js ABOVE this plugin, then launch with "Start Board
 * Game" using Game Id: shogi.
 *
 * You are Sente (Black), at the bottom, and move first. Pieces are labelled by
 * letter (K R B G S N L P); PROMOTED pieces are shown in red with a '+'. When a
 * move can promote you'll be asked; forced promotions happen automatically.
 *
 * DROPS: captured pieces join your hand (shown beside the board). Click a hand
 * piece, then an empty square to drop it back into play on your side. Standard
 * restrictions apply (no two unpromoted pawns in a file, no drops with no move,
 * no pawn-drop checkmate).
 *
 * Checkmate the opposing King to win. Difficulty scales the AI's search depth
 * and mistakes. Move generation is perft-verified (30 / 900 / 25470 / 719731),
 * so drops, promotion and the drop rules are correct.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Shogi] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const inb = (r, c) => r >= 0 && r < 9 && c >= 0 && c < 9;
    const cloneBoard = b => b.map(row => row.map(p => p ? { t: p.t, c: p.c, p: p.p } : null));
    const cloneHands = h => ({ b: { ...h.b }, w: { ...h.w } });
    const HAND_TYPES = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

    // -------- engine (perft-verified) --------
    function initialState() {
        const b = Array.from({ length: 9 }, () => Array(9).fill(null));
        const back = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
        for (let c = 0; c < 9; c++) { b[0][c] = { t: back[c], c: 'w', p: false }; b[8][c] = { t: back[c], c: 'b', p: false }; }
        b[2] = b[2].map(() => ({ t: 'P', c: 'w', p: false })); b[6] = b[6].map(() => ({ t: 'P', c: 'b', p: false }));
        b[1][1] = { t: 'R', c: 'w', p: false }; b[1][7] = { t: 'B', c: 'w', p: false };
        b[7][1] = { t: 'B', c: 'b', p: false }; b[7][7] = { t: 'R', c: 'b', p: false };
        return { board: b, turn: 'b', hands: { b: {}, w: {} } };
    }
    function pieceTargets(board, r, c, p) {
        const f = p.c === 'b' ? -1 : 1, out = [];
        const single = dirs => { for (const [dr, dc] of dirs) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && (!board[rr][cc] || board[rr][cc].c !== p.c)) out.push([rr, cc]); } };
        const slide = dirs => { for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (inb(rr, cc)) { if (!board[rr][cc]) out.push([rr, cc]); else { if (board[rr][cc].c !== p.c) out.push([rr, cc]); break; } rr += dr; cc += dc; } } };
        const gold = [[f, 0], [f, -1], [f, 1], [0, -1], [0, 1], [-f, 0]];
        const goldLike = p.p && (p.t === 'S' || p.t === 'N' || p.t === 'L' || p.t === 'P');
        if (p.t === 'K') single([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
        else if (p.t === 'G' || goldLike) single(gold);
        else if (p.t === 'S') single([[f, 0], [f, -1], [f, 1], [-f, -1], [-f, 1]]);
        else if (p.t === 'N') single([[2 * f, -1], [2 * f, 1]]);
        else if (p.t === 'L') slide([[f, 0]]);
        else if (p.t === 'P') single([[f, 0]]);
        else if (p.t === 'B') { slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]); if (p.p) single([[1, 0], [-1, 0], [0, 1], [0, -1]]); }
        else if (p.t === 'R') { slide([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (p.p) single([[1, 1], [1, -1], [-1, 1], [-1, -1]]); }
        return out;
    }
    function findKing(board, color) { for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const p = board[r][c]; if (p && p.t === 'K' && p.c === color) return [r, c]; } return null; }
    function isKingAttacked(board, color) { const ks = findKing(board, color); if (!ks) return true; const en = color === 'b' ? 'w' : 'b'; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const p = board[r][c]; if (!p || p.c !== en) continue; for (const [tr, tc] of pieceTargets(board, r, c, p)) if (tr === ks[0] && tc === ks[1]) return true; } return false; }
    const inZone = (color, r) => color === 'b' ? r <= 2 : r >= 6;
    function mustPromote(p, tr) { if (p.p) return false; if (p.t === 'P' || p.t === 'L') return p.c === 'b' ? tr === 0 : tr === 8; if (p.t === 'N') return p.c === 'b' ? tr <= 1 : tr >= 7; return false; }
    const canPromoteType = t => t === 'P' || t === 'L' || t === 'N' || t === 'S' || t === 'B' || t === 'R';
    function genPseudo(state) {
        const { board, turn, hands } = state, moves = [];
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const p = board[r][c]; if (!p || p.c !== turn) continue; for (const [tr, tc] of pieceTargets(board, r, c, p)) { const promotable = !p.p && canPromoteType(p.t) && (inZone(turn, r) || inZone(turn, tr)); if (promotable) { if (mustPromote(p, tr)) moves.push({ from: [r, c], to: [tr, tc], promo: true }); else { moves.push({ from: [r, c], to: [tr, tc], promo: false }); moves.push({ from: [r, c], to: [tr, tc], promo: true }); } } else moves.push({ from: [r, c], to: [tr, tc], promo: false }); } }
        const hand = hands[turn];
        for (const t of HAND_TYPES) { if (!hand[t]) continue; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { if (board[r][c]) continue; if ((t === 'P' || t === 'L') && (turn === 'b' ? r === 0 : r === 8)) continue; if (t === 'N' && (turn === 'b' ? r <= 1 : r >= 7)) continue; if (t === 'P') { let nifu = false; for (let rr = 0; rr < 9; rr++) { const q = board[rr][c]; if (q && q.c === turn && q.t === 'P' && !q.p) { nifu = true; break; } } if (nifu) continue; } moves.push({ drop: t, to: [r, c] }); } }
        return moves;
    }
    function makeMove(state, m) {
        const board = cloneBoard(state.board), hands = cloneHands(state.hands), turn = state.turn, enemy = turn === 'b' ? 'w' : 'b';
        if (m.drop) { board[m.to[0]][m.to[1]] = { t: m.drop, c: turn, p: false }; hands[turn][m.drop]--; }
        else { const [fr, fc] = m.from, [tr, tc] = m.to, p = board[fr][fc], cap = board[tr][tc]; if (cap) hands[turn][cap.t] = (hands[turn][cap.t] || 0) + 1; board[fr][fc] = null; board[tr][tc] = { t: p.t, c: p.c, p: p.p || m.promo }; }
        return { board, turn: enemy, hands };
    }
    function genLegal(state) {
        return genPseudo(state).filter(m => { const ns = makeMove(state, m); if (isKingAttacked(ns.board, state.turn)) return false; if (m.drop === 'P' && isKingAttacked(ns.board, ns.turn)) { if (genLegalNoUchi(ns).length === 0) return false; } return true; });
    }
    function genLegalNoUchi(state) { return genPseudo(state).filter(m => !isKingAttacked(makeMove(state, m).board, state.turn)); }

    // -------- AI --------
    const MATE = 1e7;
    function pieceValue(p) { const base = { P: 1, L: 4, N: 4, S: 6, G: 7, B: 9, R: 11, K: 1000 }[p.t]; if (p.p) { if (p.t === 'B') return 13; if (p.t === 'R') return 15; return 7; } return base; }
    const HANDVAL = { P: 1, L: 4, N: 4, S: 6, G: 7, B: 10, R: 12 };
    function evalBlack(state) {
        let s = 0; const b = state.board;
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const p = b[r][c]; if (!p) continue; s += (p.c === 'b' ? 1 : -1) * pieceValue(p); }
        for (const t of HAND_TYPES) { s += (state.hands.b[t] || 0) * HANDVAL[t]; s -= (state.hands.w[t] || 0) * HANDVAL[t]; }
        return s;
    }
    function orderMoves(state, moves) { return moves.map(m => { let k = 0; if (!m.drop) { const cap = state.board[m.to[0]][m.to[1]]; if (cap) k += pieceValue(cap) * 10; if (m.promo) k += 5; } return { m, k }; }).sort((a, b) => b.k - a.k).map(o => o.m); }
    function search(state, depth, alpha, beta) {
        const legal = genLegal(state);
        if (legal.length === 0) return state.turn === 'b' ? -MATE - depth : MATE + depth; // side to move is mated
        if (depth === 0) return evalBlack(state);
        const moves = orderMoves(state, legal).slice(0, 14);
        if (state.turn === 'b') { let best = -Infinity; for (const m of moves) { best = Math.max(best, search(makeMove(state, m), depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (beta <= alpha) break; } return best; }
        else { let best = Infinity; for (const m of moves) { best = Math.min(best, search(makeMove(state, m), depth - 1, alpha, beta)); beta = Math.min(beta, best); if (beta <= alpha) break; } return best; }
    }
    function chooseAIMove(state, skill) {
        const legal = genLegal(state); if (!legal.length) return null;
        if (Math.random() < BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.5, 0.0)) return BoardGameAI.pick(legal);
        const depth = skill >= 4 ? 2 : 1;
        const moves = depth >= 2 ? orderMoves(state, legal).slice(0, 16) : legal;
        let best = Infinity, cands = []; // white minimizes evalBlack
        for (const m of moves) { const v = search(makeMove(state, m), depth - 1, -Infinity, Infinity); if (v < best) { best = v; cands = [m]; } else if (v === best) cands.push(m); }
        return BoardGameAI.pick(cands);
    }

    // -------- scene --------
    const LETTER = { K: 'K', R: 'R', B: 'B', G: 'G', S: 'S', N: 'N', L: 'L', P: 'P' };
    class Scene_Shogi extends Scene_BoardGameBase {
        onMatchStart() {
            this.state = initialState();
            this._sel = null; this._selDrop = null; this._legal = []; this._last = null;
            this._phase = 'player'; this._timer = 0; this._promoPend = null; this._buttons = [];
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.taunt('greeting');
            this.showMessage("You are Sente (Black). Your move.");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._w = area.width; this._h = area.height;
            const handH = 30;
            this._cell = Math.floor(Math.min(area.width / 9, (area.height - handH * 2 - 8) / 9));
            const bpx = this._cell * 9;
            this._bx = Math.floor((area.width - bpx) / 2);
            this._aiHandY = 2; this._by = handH + 6; this._myHandY = this._by + bpx + 4;
            this._sprite = new Sprite(new Bitmap(area.width, area.height));
            this._sprite.x = area.x + mX; this._sprite.y = area.y + mY;
            this._sox = this._sprite.x; this._soy = this._sprite.y;
            this.addChild(this._sprite);
        }
        updateGame() {
            if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'promote') this.updatePromote();
            else if (this._phase === 'aiThink') { if (--this._timer <= 0) this.doAI(); }
        }
        localTouch() { return [TouchInput.x - this._sox, TouchInput.y - this._soy]; }
        cellAt(x, y) { if (x < this._bx || y < this._by) return null; const c = Math.floor((x - this._bx) / this._cell), r = Math.floor((y - this._by) / this._cell); return inb(r, c) ? [r, c] : null; }
        hitRect(rects, x, y) { for (const rr of rects) if (x >= rr.x && x < rr.x + rr.w && y >= rr.y && y < rr.y + rr.h) return rr; return null; }

        updatePlayer() {
            if (!TouchInput.isTriggered()) return;
            const [x, y] = this.localTouch();
            const h = this.hitRect(this._handRects || [], x, y);
            if (h && h.owner === 'b') { this._selDrop = (this._selDrop === h.type ? null : h.type); this._sel = null; this._legal = this._selDrop ? genLegal(this.state).filter(m => m.drop === this._selDrop) : []; this.playSe('select'); this.redraw(); return; }
            const cell = this.cellAt(x, y); if (!cell) return;
            this.activate(cell[0], cell[1]);
        }
        activate(r, c) {
            if (this._selDrop) { const m = this._legal.find(mm => mm.to[0] === r && mm.to[1] === c); if (m) { this.applyMove(m); this._selDrop = null; } else { this._selDrop = null; this._legal = []; this.redraw(); } return; }
            if (this._sel) {
                const matches = this._legal.filter(m => m.to && m.to[0] === r && m.to[1] === c);
                if (matches.length === 1) { this.applyMove(matches[0]); return; }
                if (matches.length === 2) { this._promoPend = matches; this._phase = 'promote'; this.showMessage("Promote?  OK = yes,  PageDown = no."); this.redraw(); return; }
            }
            const p = this.state.board[r][c];
            if (p && p.c === 'b') { this._sel = [r, c]; this._legal = genLegal(this.state).filter(m => m.from && m.from[0] === r && m.from[1] === c); this.playSe('select'); }
            else { this._sel = null; this._legal = []; }
            this.redraw();
        }
        updatePromote() {
            let choice = null;
            if (TouchInput.isTriggered()) { const [x, y] = this.localTouch(); const b = this.hitRect(this._buttons, x, y); if (b) choice = b.id; }
            if (Input.isTriggered('ok')) choice = 'yes'; if (Input.isTriggered('pagedown')) choice = 'no';
            if (!choice) return;
            const m = this._promoPend.find(mm => mm.promo === (choice === 'yes'));
            this._promoPend = null; this._phase = 'player'; this.applyMove(m);
        }
        applyMove(m) {
            this.playSe('move'); this.state = makeMove(this.state, m); this._last = m.to;
            this._sel = null; this._selDrop = null; this._legal = [];
            this.redraw(); this.refreshStatus();
            if (genLegal(this.state).length === 0) { this.endMatch('win'); return; } // white mated
            if (isKingAttacked(this.state.board, 'w')) this.showMessage("Check!");
            this._phase = 'aiThink'; this._timer = 36; this.showMessage(this.opponent.name + " is thinking...");
        }
        doAI() {
            const m = chooseAIMove(this.state, this.difficulty);
            if (!m) { this.endMatch('win'); return; }
            this.playSe('move'); this.state = makeMove(this.state, m); this._last = m.to;
            this.redraw(); this.refreshStatus();
            if (genLegal(this.state).length === 0) { this.endMatch('lose'); return; } // black (you) mated
            if (isKingAttacked(this.state.board, 'b')) { this.showMessage("Check! Defend your King."); this.taunt('thinking'); }
            else this.showMessage("Your move.");
            this._phase = 'player';
        }
        refreshStatus() {
            const val = c => { let s = 0; const b = this.state.board; for (let r = 0; r < 9; r++) for (let cc = 0; cc < 9; cc++) { const p = b[r][cc]; if (p && p.c === c) s += pieceValue(p); } for (const t of HAND_TYPES) s += (this.state.hands[c][t] || 0) * (HANDVAL[t] || 0); return s; };
            this.setStatus(["You (Sente): " + val('b'), this.opponent.name + " (Gote): " + val('w'), "", "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }
        redraw() {
            const bmp = this._sprite.bitmap, cell = this._cell; bmp.clear(); this._handRects = []; this._buttons = [];
            // hands
            this.drawHand(bmp, 'w', this._aiHandY); this.drawHand(bmp, 'b', this._myHandY);
            // board
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const x = this._bx + c * cell, y = this._by + r * cell; bmp.fillRect(x, y, cell, cell, rgba('#e7c98a', 0.22)); bmp.strokeRect(x, y, cell, cell, rgba(C.lineColor, 0.6)); }
            if (this._last) bmp.fillRect(this._bx + this._last[1] * cell, this._by + this._last[0] * cell, cell, cell, rgba(C.draw, 0.25));
            if (this._sel) bmp.fillRect(this._bx + this._sel[1] * cell, this._by + this._sel[0] * cell, cell, cell, rgba(C.highlight, 0.4));
            for (const m of this._legal) { if (!m.to) continue; const x = this._bx + m.to[1] * cell + cell / 2, y = this._by + m.to[0] * cell + cell / 2; bmp.drawCircle(x, y, Math.floor(cell * 0.13), rgba(C.highlight, 0.85)); }
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const p = this.state.board[r][c]; if (p) this.drawPiece(bmp, this._bx + c * cell, this._by + r * cell, cell, p); }
            if (this._phase === 'promote') this.drawPromote(bmp);
        }
        drawPiece(bmp, x, y, size, p) {
            const isB = p.c === 'b', pad = 2;
            bmp.fillRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, isB ? '#f0dca8' : '#8a6a3a');
            bmp.strokeRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, rgba('#5a4420', 0.9));
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(size * 0.44);
            bmp.textColor = p.p ? '#c23b34' : (isB ? '#2a2010' : '#f0dca8');
            const label = (p.p ? '+' : '') + LETTER[p.t];
            bmp.drawText(label, x, y + Math.floor(size * 0.14), size, Math.floor(size * 0.7), 'center');
        }
        drawHand(bmp, owner, y) {
            const hand = this.state.hands[owner]; let x = 4;
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 13; bmp.textColor = rgba(C.textDim, 0.9);
            bmp.drawText(owner === 'b' ? "Your hand:" : this.opponent.name + ":", x, y + 6, 90, 18, 'left'); x += 92;
            for (const t of HAND_TYPES) { const n = hand[t] || 0; if (!n) continue; const w = 26, hh = 26; const sel = owner === 'b' && this._selDrop === t; bmp.fillRect(x, y, w, hh, sel ? rgba(C.highlight, 0.4) : rgba('#f0dca8', 0.85)); bmp.strokeRect(x, y, w, hh, sel ? C.highlight : rgba('#5a4420', 0.8)); bmp.fontSize = 15; bmp.textColor = '#2a2010'; bmp.drawText(LETTER[t], x, y + 4, w, 18, 'center'); bmp.fontSize = 11; bmp.textColor = '#7a3a2a'; bmp.drawText('x' + n, x + w - 14, y + hh - 12, 14, 12, 'left'); this._handRects.push({ x, y, w, h: hh, owner, type: t }); x += w + 4; }
        }
        drawPromote(bmp) {
            const w = 220, h = 80, x = Math.floor((this._w - w) / 2), y = Math.floor((this._h - h) / 2);
            bmp.fillRect(x, y, w, h, rgba('#000000', 0.7)); bmp.strokeRect(x, y, w, h, C.highlight);
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 16; bmp.textColor = '#fff'; bmp.drawText("Promote this piece?", x, y + 8, w, 20, 'center');
            const bw = 90, bh = 30, by = y + 40;
            bmp.fillRect(x + 12, by, bw, bh, rgba(C.win, 0.3)); bmp.strokeRect(x + 12, by, bw, bh, C.win); bmp.textColor = C.textMain; bmp.drawText("Promote", x + 12, by + 6, bw, 20, 'center');
            bmp.fillRect(x + w - bw - 12, by, bw, bh, rgba(C.lose, 0.3)); bmp.strokeRect(x + w - bw - 12, by, bw, bh, C.lose); bmp.drawText("Keep", x + w - bw - 12, by + 6, bw, 20, 'center');
            this._buttons.push({ id: 'yes', x: x + 12, y: by, w: bw, h: bh }, { id: 'no', x: x + w - bw - 12, y: by, w: bw, h: bh });
        }
    }

    BoardGameManager.registerGame({ id: 'shogi', name: 'Shogi', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Shogi });
})();
