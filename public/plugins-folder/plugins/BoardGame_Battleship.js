/*:
 * @target MZ
 * @plugindesc [v1.0.0] Battleship for the Board Game engine. Place your fleet, then duel on hidden 10x10 grids. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Battleship.js  —  Game Id: "battleship"
 * ============================================================================
 * Install BoardGameCore.js ABOVE this plugin. Launch with "Start Board Game"
 * using Game Id: battleship.
 *
 * PLACEMENT: position each of your five ships. Move with the mouse (or arrow
 * keys), press PageUp to rotate, press Shift to randomize your whole fleet,
 * and click / OK to place the current ship.
 *
 * BATTLE: the LEFT grid is the enemy sea — click a cell to fire. The RIGHT grid
 * is your fleet and shows the enemy's shots. Turns alternate one shot each.
 * Sink all five enemy ships to win.
 *
 * Difficulty scales the opponent's targeting: low skill fires almost blindly;
 * high skill uses parity hunting and follows up hits along a line. Placement
 * validity, shot bookkeeping, termination and AI strength are simulation-tested.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Battleship] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const SIZE = 10;
    const FLEET = [{ name: 'Carrier', len: 5 }, { name: 'Battleship', len: 4 }, { name: 'Cruiser', len: 3 }, { name: 'Submarine', len: 3 }, { name: 'Destroyer', len: 2 }];
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const inb = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

    // -------- engine (simulation-tested) --------
    const emptyGrid = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(-1));
    const emptyMarks = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    function canPlace(grid, r, c, len, horiz) { for (let i = 0; i < len; i++) { const rr = horiz ? r : r + i, cc = horiz ? c + i : c; if (!inb(rr, cc) || grid[rr][cc] !== -1) return false; } return true; }
    function placeShip(grid, r, c, len, horiz, idx) { const cells = []; for (let i = 0; i < len; i++) { const rr = horiz ? r : r + i, cc = horiz ? c + i : c; grid[rr][cc] = idx; cells.push([rr, cc]); } return cells; }
    function randomFleet() {
        const grid = emptyGrid(), ships = [];
        FLEET.forEach((s, idx) => { let ok = false, g = 0; while (!ok && g++ < 2000) { const horiz = Math.random() < 0.5, r = BoardGameAI.randomInt(SIZE), c = BoardGameAI.randomInt(SIZE); if (canPlace(grid, r, c, s.len, horiz)) { const cells = placeShip(grid, r, c, s.len, horiz, idx); ships.push({ name: s.name, len: s.len, cells, hits: 0, sunk: false }); ok = true; } } });
        return { grid, ships, marks: emptyMarks() };
    }
    function fireAt(side, r, c) {
        if (side.marks[r][c] !== 0) return { result: 'repeat' };
        const idx = side.grid[r][c];
        if (idx === -1) { side.marks[r][c] = 1; return { result: 'miss' }; }
        side.marks[r][c] = 2; const ship = side.ships[idx]; ship.hits++;
        if (ship.hits >= ship.len) { ship.sunk = true; return { result: 'sunk', ship }; }
        return { result: 'hit', ship };
    }
    const allSunk = side => side.ships.every(s => s.sunk);
    const newAIMem = () => ({ queue: [], hitsOnCurrent: [] });
    function chooseShot(mem, marks, skill) {
        if (skill >= 2) while (mem.queue.length) { const [r, c] = mem.queue.shift(); if (inb(r, c) && marks[r][c] === 0) return [r, c]; }
        const parity = skill >= 3, cands = [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) { if (marks[r][c] !== 0) continue; if (parity && (r + c) % 2 !== 0) continue; cands.push([r, c]); }
        const pool = cands.length ? cands : allUnknown(marks);
        return BoardGameAI.pick(pool);
    }
    function allUnknown(marks) { const a = []; for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (marks[r][c] === 0) a.push([r, c]); return a; }
    function registerResult(mem, r, c, res) {
        if (res.result === 'hit') {
            mem.hitsOnCurrent.push([r, c]);
            if (mem.hitsOnCurrent.length >= 2) { const [r0, c0] = mem.hitsOnCurrent[0], [r1, c1] = mem.hitsOnCurrent[mem.hitsOnCurrent.length - 1]; if (r0 === r1) mem.queue.unshift([r, c + 1], [r, c - 1]); else if (c0 === c1) mem.queue.unshift([r + 1, c], [r - 1, c]); }
            else mem.queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
        } else if (res.result === 'sunk') { mem.hitsOnCurrent = []; mem.queue = []; }
    }

    // -------- scene --------
    class Scene_Battleship extends Scene_BoardGameBase {
        onMatchStart() {
            this.enemy = randomFleet();      // player fires at this
            this.own = { grid: emptyGrid(), ships: new Array(FLEET.length).fill(null), marks: emptyMarks() };
            this.aiMem = newAIMem();
            this._phase = 'place';
            this._placeIdx = 0; this._horiz = true; this._hover = [0, 0];
            this.buildSprite();
            this.redraw(); this.refreshStatus();
            this.showMessage("Place your fleet. Mouse to aim, PageUp rotate, Shift randomize, click to place.");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const labate = 16, gap = 18;
            const cell = Math.floor(Math.min((area.width - gap - labate * 2) / (SIZE * 2), (area.height - labate) / SIZE));
            this._cell = cell;
            const gpx = cell * SIZE;
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            const totalW = gpx * 2 + gap + labate * 2;
            const startX = area.x + Math.floor((area.width - totalW) / 2) + mX;
            const top = area.y + Math.floor((area.height - (gpx + labate)) / 2) + labate + mY;
            this._enemyO = [startX + labate, top];
            this._ownO = [startX + labate + gpx + gap + labate, top];
            this._sprite = new Sprite(new Bitmap(area.width + 40, area.height + 40));
            this._sprite.x = area.x + mX - 20; this._sprite.y = area.y + mY - 20;
            this._sox = this._sprite.x; this._soy = this._sprite.y;
            this.addChild(this._sprite);
        }
        // convert a screen origin to sprite-local
        localOf(origin) { return [origin[0] - this._sox, origin[1] - this._soy]; }

        updateGame() {
            if (this._phase === 'place') this.updatePlace();
            else if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'aiThink') { if (--this._timer <= 0) this.doAIShot(); }
        }
        cellAt(origin) {
            const x = TouchInput.x - origin[0], y = TouchInput.y - origin[1];
            if (x < 0 || y < 0) return null;
            const c = Math.floor(x / this._cell), r = Math.floor(y / this._cell);
            return inb(r, c) ? [r, c] : null;
        }
        // ---- placement ----
        updatePlace() {
            const cell = this.cellAt(this._ownO);
            if (cell) this._hover = cell;
            if (Input.isRepeated('right')) { this._hover = [this._hover[0], Math.min(SIZE - 1, this._hover[1] + 1)]; this.redraw(); }
            if (Input.isRepeated('left')) { this._hover = [this._hover[0], Math.max(0, this._hover[1] - 1)]; this.redraw(); }
            if (Input.isRepeated('down')) { this._hover = [Math.min(SIZE - 1, this._hover[0] + 1), this._hover[1]]; this.redraw(); }
            if (Input.isRepeated('up')) { this._hover = [Math.max(0, this._hover[0] - 1), this._hover[1]]; this.redraw(); }
            if (Input.isTriggered('pageup') || Input.isTriggered('pagedown')) { this._horiz = !this._horiz; this.playSe('select'); this.redraw(); }
            if (Input.isTriggered('shift')) { this.own = randomFleet(); this._placeIdx = FLEET.length; this.playSe('select'); this.showMessage("Fleet randomized. Click / OK to confirm and begin."); this.redraw(); return; }
            if (TouchInput.isTriggered() && cell) this.tryPlace(cell[0], cell[1]);
            else if (Input.isTriggered('ok')) this.tryPlace(this._hover[0], this._hover[1]);
            if (cell) this.redraw();
        }
        tryPlace(r, c) {
            if (this._placeIdx >= FLEET.length) { this.beginBattle(); return; }
            const s = FLEET[this._placeIdx];
            if (!canPlace(this.own.grid, r, c, s.len, this._horiz)) { this.playSe('buzzer'); return; }
            const cells = placeShip(this.own.grid, r, c, s.len, this._horiz, this._placeIdx);
            this.own.ships[this._placeIdx] = { name: s.name, len: s.len, cells, hits: 0, sunk: false };
            this.playSe('move'); this._placeIdx++;
            if (this._placeIdx >= FLEET.length) this.showMessage("Fleet ready. Click / OK to begin the battle.");
            else this.showMessage("Place your " + FLEET[this._placeIdx].name + " (" + FLEET[this._placeIdx].len + ").");
            this.redraw();
        }
        beginBattle() {
            // clear any placement-only ships from own already set; ensure own has full fleet
            this._phase = 'player'; this.taunt('greeting');
            this.showMessage("Battle! Fire at the enemy sea (left grid).");
            this.redraw();
        }
        // rebuild own fleet fresh at placement start (before manual placement)
        // (own already randomized in onMatchStart; manual placement overwrites)

        // ---- battle ----
        updatePlayer() {
            if (TouchInput.isTriggered()) { const cell = this.cellAt(this._enemyO); if (cell) this.playerShoot(cell[0], cell[1]); }
            if (Input.isRepeated('right')) this.moveCursor(0, 1);
            if (Input.isRepeated('left')) this.moveCursor(0, -1);
            if (Input.isRepeated('down')) this.moveCursor(1, 0);
            if (Input.isRepeated('up')) this.moveCursor(-1, 0);
            if (Input.isTriggered('ok')) this.playerShoot(this._hover[0], this._hover[1]);
        }
        moveCursor(dr, dc) { this._hover = [Math.max(0, Math.min(SIZE - 1, this._hover[0] + dr)), Math.max(0, Math.min(SIZE - 1, this._hover[1] + dc))]; this.playSe('select'); this.redraw(); }
        playerShoot(r, c) {
            if (this.enemy.marks[r][c] !== 0) { this.playSe('buzzer'); return; }
            const res = fireAt(this.enemy, r, c);
            this.playSe(res.result === 'miss' ? 'select' : 'move');
            this.redraw(); this.refreshStatus();
            if (res.result === 'sunk') this.showMessage("Hit! You sank their " + res.ship.name + "!");
            else this.showMessage(res.result === 'hit' ? "Direct hit!" : "Splash — a miss.");
            if (allSunk(this.enemy)) { this.endMatch('win'); return; }
            this._phase = 'aiThink'; this._timer = 30;
        }
        doAIShot() {
            const [r, c] = chooseShot(this.aiMem, this.own.marks, this.difficulty);
            const res = fireAt(this.own, r, c);
            registerResult(this.aiMem, r, c, res);
            this.playSe(res.result === 'miss' ? 'select' : 'move');
            this.redraw(); this.refreshStatus();
            if (res.result === 'sunk') { this.showMessage(this.opponent.name + " sank your " + res.ship.name + "!"); this.taunt('thinking'); }
            else this.showMessage(res.result === 'hit' ? this.opponent.name + " hit one of your ships!" : this.opponent.name + " missed.");
            if (allSunk(this.own)) { this.endMatch('lose'); return; }
            this._phase = 'player';
        }
        // ---- draw ----
        refreshStatus() {
            const eLeft = this.enemy.ships.filter(s => !s.sunk).length;
            const oLeft = this.own.ships.filter(s => !s.sunk).length;
            this.setStatus(["Enemy ships left: " + eLeft, "Your ships left: " + oLeft, "", "Skill: " + this.difficulty + "/" + MAX_SKILL]);
        }
        redraw() {
            const bmp = this._sprite.bitmap, cell = this._cell;
            bmp.clear();
            this.drawGrid(bmp, this.localOf(this._enemyO), true);
            this.drawGrid(bmp, this.localOf(this._ownO), false);
        }
        drawGrid(bmp, o, isEnemy) {
            const cell = this._cell, ox = o[0], oy = o[1];
            // labels
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.max(9, Math.floor(cell * 0.5)); bmp.textColor = rgba(C.textMain, 0.7);
            bmp.drawText(isEnemy ? "ENEMY SEA" : "YOUR FLEET", ox, oy - cell - 2, cell * SIZE, cell, 'center');
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                const x = ox + c * cell, y = oy + r * cell;
                bmp.fillRect(x, y, cell, cell, (r + c) % 2 === 0 ? rgba(C.highlight, 0.10) : rgba(C.highlight, 0.16));
                bmp.strokeRect(x, y, cell, cell, rgba(C.lineColor, 0.5));
            }
            // own ships
            if (!isEnemy) for (const s of this.own.ships) if (s && s.cells) for (const [r, c] of s.cells) { const x = ox + c * cell, y = oy + r * cell; bmp.fillRect(x + 2, y + 2, cell - 4, cell - 4, s.sunk ? rgba(C.lose, 0.85) : rgba(C.textDim, 0.85)); }
            // placement ghost
            if (isEnemy === false && this._phase === 'place' && this._placeIdx < FLEET.length) {
                const s = FLEET[this._placeIdx], ok = canPlace(this.own.grid, this._hover[0], this._hover[1], s.len, this._horiz);
                for (let i = 0; i < s.len; i++) { const rr = this._horiz ? this._hover[0] : this._hover[0] + i, cc = this._horiz ? this._hover[1] + i : this._hover[1]; if (!inb(rr, cc)) continue; bmp.fillRect(ox + cc * cell + 1, oy + rr * cell + 1, cell - 2, cell - 2, ok ? rgba(C.win, 0.55) : rgba(C.lose, 0.55)); }
            }
            // marks
            const marks = isEnemy ? this.enemy.marks : this.own.marks;
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                const m = marks[r][c]; if (!m) continue;
                const x = ox + c * cell, y = oy + r * cell, cx = x + cell / 2, cy = y + cell / 2;
                if (m === 1) bmp.drawCircle(cx, cy, Math.max(2, Math.floor(cell * 0.14)), rgba(C.textMain, 0.55));
                else { bmp.fillRect(x + 2, y + 2, cell - 4, cell - 4, rgba(C.lose, 0.9)); bmp.drawCircle(cx, cy, Math.floor(cell * 0.16), rgba('#ffe08a', 0.95)); }
            }
            // cursor on the active grid
            const activeEnemy = this._phase === 'player';
            if ((isEnemy && activeEnemy) || (!isEnemy && this._phase === 'place')) {
                const [hr, hc] = this._hover; bmp.strokeRect(ox + hc * cell + 1, oy + hr * cell + 1, cell - 2, cell - 2, C.highlight);
            }
        }
    }

    BoardGameManager.registerGame({ id: 'battleship', name: 'Battleship', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Battleship });
})();
