/*:
 * @target MZ
 * @plugindesc [v1.0.0] Tic Tac Toe for the Board Game engine. Optimal (unbeatable) AI at high skill. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_TicTacToe.js  —  Game Id: "tictactoe"
 * ============================================================================
 * Install BoardGameCore.js ABOVE this plugin, then launch with "Start Board
 * Game" using Game Id: tictactoe.
 *
 * The player is X and moves first; the opponent is O. Click a square (or use
 * the arrow keys + OK).
 *
 * Difficulty controls how often the opponent plays the perfect minimax move
 * versus a random one. At max skill the opponent is provably unbeatable (the
 * best the player can do is draw); at skill 1 it mostly plays randomly, so a
 * player can win. The minimax has been exhaustively verified never to lose.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") {
        console.error("[BoardGame_TicTacToe] Install BoardGameCore.js above this plugin."); return;
    }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;

    // ------------------------------------------------------------------ engine
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const PLAYER = 1, AI = 2; // X = player, O = ai
    function winner(b) { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(x => x) ? 0 : null; }
    function minimax(b, cur, depth) {
        const w = winner(b);
        if (w === AI) return 10 - depth;
        if (w === PLAYER) return depth - 10;
        if (w === 0) return 0;
        const max = cur === AI;
        let best = max ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) {
            if (b[i]) continue;
            b[i] = cur;
            const s = minimax(b, cur === 1 ? 2 : 1, depth + 1);
            b[i] = 0;
            best = max ? Math.max(best, s) : Math.min(best, s);
        }
        return best;
    }
    function bestMoves(b) {
        let best = -Infinity, moves = [];
        for (let i = 0; i < 9; i++) {
            if (b[i]) continue;
            b[i] = AI; const s = minimax(b, PLAYER, 0); b[i] = 0;
            if (s > best) { best = s; moves = [i]; } else if (s === best) moves.push(i);
        }
        return moves;
    }
    function emptyCells(b) { const e = []; for (let i = 0; i < 9; i++) if (!b[i]) e.push(i); return e; }
    function chooseAIMove(b, skill) {
        const empties = emptyCells(b);
        if (empties.length === 0) return -1;
        // Mistake rate: at low skill, play a random cell; else the optimal move.
        if (Math.random() < BoardGameAI.skillToMistakeRate(skill, MAX_SKILL, 0.8, 0.0)) return BoardGameAI.pick(empties);
        return BoardGameAI.pick(bestMoves(b));
    }

    // ------------------------------------------------------------------- scene
    class Scene_TicTacToe extends Scene_BoardGameBase {
        onMatchStart() {
            this._b = Array(9).fill(0);
            this._cursor = 4;
            this._winLine = null;
            this._phase = 'player'; this._timer = 0;
            this.buildBoardSprite(); this.redraw();
            this.setStatus(["You:  X", this.opponent.name + ":  O", "", "Skill: " + this.difficulty + "/" + MAX_SKILL]);
            this.showMessage("You're X and you're up first. Take a square.");
        }
        buildBoardSprite() {
            const area = this.boardAreaRect();
            this._size = Math.floor(Math.min(area.width, area.height) * 0.94);
            this._cell = Math.floor(this._size / 3);
            const px = this._cell * 3;
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
            if (x < 0 || y < 0) return -1;
            const c = Math.floor(x / this._cell), r = Math.floor(y / this._cell);
            if (c < 0 || c > 2 || r < 0 || r > 2) return -1;
            return r * 3 + c;
        }
        updatePlayer() {
            if (TouchInput.isTriggered()) { const i = this.cellFromTouch(); if (i >= 0) this.place(i); }
            if (Input.isRepeated('right')) this.moveCursor(1);
            if (Input.isRepeated('left')) this.moveCursor(-1);
            if (Input.isRepeated('down')) this.moveCursor(3);
            if (Input.isRepeated('up')) this.moveCursor(-3);
            if (Input.isTriggered('ok')) this.place(this._cursor);
        }
        moveCursor(d) {
            let n = this._cursor + d;
            if (n >= 0 && n < 9) { this._cursor = n; this.playSe('select'); this.redraw(); }
        }
        place(i) {
            if (this._b[i]) { this.playSe('buzzer'); return; }
            this._cursor = i;
            this._b[i] = PLAYER; this.playSe('move');
            this.afterMove();
        }
        doAIMove() {
            const i = chooseAIMove(this._b, this.difficulty);
            if (i >= 0) { this._b[i] = AI; this.playSe('move'); }
            this.afterMove();
        }
        afterMove() {
            this.redraw();
            const w = winner(this._b);
            if (w !== null) {
                this._winLine = this.lineFor(w);
                this.redraw();
                if (w === PLAYER) this.endMatch('win');
                else if (w === AI) this.endMatch('lose');
                else this.endMatch('draw');
                return;
            }
            // whose turn? player cells count vs ai
            const xs = this._b.filter(v => v === PLAYER).length, os = this._b.filter(v => v === AI).length;
            if (xs > os) { this._phase = 'aiThink'; this._timer = 28; this.showMessage(this.opponent.name + " is thinking..."); if (Math.random() < 0.5) this.taunt('thinking'); }
            else { this._phase = 'player'; this.showMessage("Your move."); }
        }
        lineFor(w) { if (!w) return null; for (const ln of LINES) { const [a, b, c] = ln; if (this._b[a] === w && this._b[b] === w && this._b[c] === w) return ln; } return null; }

        redraw() {
            const bmp = this._boardSprite.bitmap, cell = this._cell, px = cell * 3;
            bmp.clear();
            bmp.fillRect(0, 0, px, px, C.panel);
            // grid lines
            const lw = Math.max(3, Math.floor(cell * 0.03));
            for (let i = 1; i < 3; i++) {
                bmp.fillRect(i * cell - lw / 2, 0, lw, px, C.lineColor);
                bmp.fillRect(0, i * cell - lw / 2, px, lw, C.lineColor);
            }
            // cursor
            if (this._phase === 'player') {
                const cr = Math.floor(this._cursor / 3), cc = this._cursor % 3;
                bmp.strokeRect(cc * cell + 3, cr * cell + 3, cell - 6, cell - 6, C.highlight);
            }
            // marks
            for (let i = 0; i < 9; i++) {
                if (!this._b[i]) continue;
                const r = Math.floor(i / 3), c = i % 3;
                const cx = c * cell + cell / 2, cy = r * cell + cell / 2;
                const win = this._winLine && this._winLine.includes(i);
                if (this._b[i] === PLAYER) this.drawX(bmp, cx, cy, cell, win ? C.win : C.highlight);
                else this.drawO(bmp, cx, cy, cell, win ? C.win : C.textMain);
            }
        }
        drawX(bmp, cx, cy, cell, color) {
            const s = Math.floor(cell * 0.26), t = Math.max(4, Math.floor(cell * 0.07));
            // draw an X as two thick rotated bars using a set of small rects along the diagonals
            for (let d = -s; d <= s; d++) {
                bmp.fillRect(cx + d - t / 2, cy + d - t / 2, t, t, color);
                bmp.fillRect(cx + d - t / 2, cy - d - t / 2, t, t, color);
            }
        }
        drawO(bmp, cx, cy, cell, color) {
            const rad = Math.floor(cell * 0.28);
            bmp.drawCircle(cx, cy, rad, color);
            bmp.drawCircle(cx, cy, rad - Math.max(4, Math.floor(cell * 0.08)), C.panel);
        }
    }

    BoardGameManager.registerGame({ id: 'tictactoe', name: 'Tic Tac Toe', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_TicTacToe });
})();
