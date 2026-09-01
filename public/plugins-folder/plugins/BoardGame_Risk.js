/*:
 * @target MZ
 * @plugindesc [v1.0.0] Risk-style world conquest for the Board Game engine. Reinforce, attack with dice, fortify. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Risk.js  —  Game Id: "risk"
 * ============================================================================
 * Two-player world domination on the classic 42-territory / 6-continent map.
 * Install BoardGameCore.js ABOVE this plugin, then launch with "Start Board
 * Game" using Game Id: risk.
 *
 * Your territories are BLUE, the opponent's are RED. Each turn has three phases
 * (shown in the side panel); press END PHASE to advance.
 *   REINFORCE: click your territories to place your new armies.
 *   ATTACK: click one of your territories (2+ armies), then an adjacent enemy
 *           territory to roll. Keep clicking to press the attack; capture a
 *           territory by reducing it to zero.
 *   FORTIFY: click one of your territories, then a connected friendly one to
 *           move armies. One fortify per turn, then your turn ends.
 * Eliminate the opponent to win. (If a long game hits the round cap, the larger
 * empire wins.)
 *
 * Difficulty scales how aggressively and efficiently the opponent fights.
 * The map, dice combat and reinforcement bonuses are engine-tested.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Risk] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

    // -------- engine (tested) --------
    const CONTINENTS = { NA: { name: 'North America', bonus: 5 }, SA: { name: 'South America', bonus: 2 }, EU: { name: 'Europe', bonus: 5 }, AF: { name: 'Africa', bonus: 3 }, AS: { name: 'Asia', bonus: 7 }, AU: { name: 'Australia', bonus: 2 } };
    const CONT_COLOR = { NA: '#e0b34a', SA: '#7fc36a', EU: '#7fa8e0', AF: '#e08a5a', AS: '#c77fe0', AU: '#e07fa8' };
    const RAW = [
        ['AK', 'Alaska', 'NA', .06, .10, ['NWT', 'ALB', 'KAM']], ['NWT', 'NW Terr.', 'NA', .15, .10, ['AK', 'ALB', 'ONT', 'GRN']], ['GRN', 'Greenland', 'NA', .31, .06, ['NWT', 'ONT', 'QUE', 'ICE']],
        ['ALB', 'Alberta', 'NA', .12, .21, ['AK', 'NWT', 'ONT', 'WUS']], ['ONT', 'Ontario', 'NA', .21, .21, ['NWT', 'ALB', 'GRN', 'QUE', 'WUS', 'EUS']], ['QUE', 'Quebec', 'NA', .30, .21, ['GRN', 'ONT', 'EUS']],
        ['WUS', 'W. US', 'NA', .14, .31, ['ALB', 'ONT', 'EUS', 'CAM']], ['EUS', 'E. US', 'NA', .23, .33, ['ONT', 'QUE', 'WUS', 'CAM']], ['CAM', 'C. America', 'NA', .16, .43, ['WUS', 'EUS', 'VEN']],
        ['VEN', 'Venezuela', 'SA', .21, .53, ['CAM', 'PER', 'BRA']], ['BRA', 'Brazil', 'SA', .29, .63, ['VEN', 'PER', 'ARG', 'NAF']], ['PER', 'Peru', 'SA', .20, .67, ['VEN', 'BRA', 'ARG']], ['ARG', 'Argentina', 'SA', .22, .79, ['PER', 'BRA']],
        ['ICE', 'Iceland', 'EU', .42, .14, ['GRN', 'GB', 'SCA']], ['GB', 'Britain', 'EU', .42, .25, ['ICE', 'SCA', 'NEU', 'WEU']], ['SCA', 'Scandinavia', 'EU', .51, .12, ['ICE', 'GB', 'NEU', 'UKR']],
        ['NEU', 'N. Europe', 'EU', .51, .25, ['SCA', 'GB', 'WEU', 'SEU', 'UKR']], ['WEU', 'W. Europe', 'EU', .45, .35, ['GB', 'NEU', 'SEU', 'NAF']], ['SEU', 'S. Europe', 'EU', .53, .35, ['NEU', 'WEU', 'UKR', 'NAF', 'EGY', 'MEA']],
        ['UKR', 'Ukraine', 'EU', .61, .21, ['SCA', 'NEU', 'SEU', 'URA', 'AFG', 'MEA']], ['NAF', 'N. Africa', 'AF', .47, .51, ['BRA', 'WEU', 'SEU', 'EGY', 'EAF', 'CON']], ['EGY', 'Egypt', 'AF', .55, .49, ['SEU', 'NAF', 'EAF', 'MEA']],
        ['EAF', 'E. Africa', 'AF', .59, .61, ['EGY', 'NAF', 'CON', 'SAF', 'MAD', 'MEA']], ['CON', 'Congo', 'AF', .53, .65, ['NAF', 'EAF', 'SAF']], ['SAF', 'S. Africa', 'AF', .55, .77, ['CON', 'EAF', 'MAD']], ['MAD', 'Madagascar', 'AF', .63, .73, ['EAF', 'SAF']],
        ['URA', 'Ural', 'AS', .68, .17, ['UKR', 'SIB', 'AFG', 'CHI']], ['SIB', 'Siberia', 'AS', .74, .12, ['URA', 'YAK', 'IRK', 'MON', 'CHI']], ['YAK', 'Yakutsk', 'AS', .82, .08, ['SIB', 'IRK', 'KAM']],
        ['KAM', 'Kamchatka', 'AS', .91, .10, ['YAK', 'IRK', 'MON', 'JAP', 'AK']], ['IRK', 'Irkutsk', 'AS', .78, .19, ['SIB', 'YAK', 'KAM', 'MON']], ['MON', 'Mongolia', 'AS', .82, .25, ['SIB', 'IRK', 'KAM', 'JAP', 'CHI']],
        ['JAP', 'Japan', 'AS', .92, .23, ['KAM', 'MON']], ['AFG', 'Afghan.', 'AS', .66, .31, ['UKR', 'URA', 'CHI', 'IND', 'MEA']], ['CHI', 'China', 'AS', .78, .31, ['URA', 'SIB', 'MON', 'AFG', 'IND', 'SIA']],
        ['MEA', 'Mid-East', 'AS', .62, .43, ['SEU', 'UKR', 'EGY', 'EAF', 'AFG', 'IND']], ['IND', 'India', 'AS', .72, .41, ['AFG', 'CHI', 'MEA', 'SIA']], ['SIA', 'Siam', 'AS', .80, .43, ['CHI', 'IND', 'INDO']],
        ['INDO', 'Indonesia', 'AU', .82, .55, ['SIA', 'NG', 'WA']], ['NG', 'New Guinea', 'AU', .91, .55, ['INDO', 'WA', 'EA']], ['WA', 'W. Australia', 'AU', .84, .67, ['INDO', 'NG', 'EA']], ['EA', 'E. Australia', 'AU', .92, .67, ['NG', 'WA']]
    ];
    const IDX = {}; RAW.forEach((t, i) => IDX[t[0]] = i);
    const MAP = RAW.map(t => ({ id: t[0], name: t[1], cont: t[2], x: t[3], y: t[4], adj: t[5].map(a => IDX[a]) }));
    const contTerrs = cont => MAP.map((_, i) => i).filter(i => MAP[i].cont === cont);
    const EDGES = []; for (let i = 0; i < MAP.length; i++) for (const j of MAP[i].adj) if (i < j) EDGES.push([i, j]);

    function rollSorted(n) { const a = []; for (let i = 0; i < n; i++) a.push(1 + BoardGameAI.randomInt(6)); return a.sort((x, y) => y - x); }
    function resolveBattle(aA, dA) {
        const na = Math.min(3, aA - 1), nd = Math.min(2, dA), ad = rollSorted(na), dd = rollSorted(nd);
        let attLoss = 0, defLoss = 0; const cmp = Math.min(na, nd);
        for (let i = 0; i < cmp; i++) { if (ad[i] > dd[i]) defLoss++; else attLoss++; }
        return { attLoss, defLoss, na, nd, ad, dd };
    }
    function newGame() {
        const terr = MAP.map(() => ({ owner: null, armies: 0 }));
        const order = MAP.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = BoardGameAI.randomInt(i + 1);[order[i], order[j]] = [order[j], order[i]]; }
        order.forEach((idx, k) => { terr[idx].owner = k % 2 === 0 ? 'p' : 'a'; terr[idx].armies = 2; });
        for (const who of ['p', 'a']) { const mine = terr.map((_, i) => i).filter(i => terr[i].owner === who); for (let k = 0; k < 8; k++) terr[BoardGameAI.pick(mine)].armies++; }
        return { terr, turn: 'p', phase: 'reinforce', pool: 0, fortified: false, plies: 0, over: false, result: null, cap: 300 };
    }
    const ownedBy = (st, who) => st.terr.map((_, i) => i).filter(i => st.terr[i].owner === who);
    const ownsContinent = (st, who, cont) => contTerrs(cont).every(i => st.terr[i].owner === who);
    function reinforcements(st, who) { const n = ownedBy(st, who).length; let r = Math.max(3, Math.floor(n / 3)); for (const c in CONTINENTS) if (ownsContinent(st, who, c)) r += CONTINENTS[c].bonus; return r; }
    function terminalResult(st) {
        if (ownedBy(st, 'p').length === 0) return 'a';
        if (ownedBy(st, 'a').length === 0) return 'p';
        if (st.plies >= st.cap) { const pp = ownedBy(st, 'p').length, aa = ownedBy(st, 'a').length; if (pp !== aa) return pp > aa ? 'p' : 'a'; const pm = ownedBy(st, 'p').reduce((s, i) => s + st.terr[i].armies, 0), am = ownedBy(st, 'a').reduce((s, i) => s + st.terr[i].armies, 0); return pm === am ? 'draw' : pm > am ? 'p' : 'a'; }
        return null;
    }
    const isBorder = (st, i) => MAP[i].adj.some(j => st.terr[j].owner !== st.terr[i].owner);
    function aiReinforce(st, who) { let pool = reinforcements(st, who); const b = ownedBy(st, who).filter(i => isBorder(st, i)); const targets = b.length ? b : ownedBy(st, who); while (pool-- > 0) st.terr[BoardGameAI.pick(targets)].armies++; }
    function aiAttack(st, who, skill) {
        let guard = 0, captures = 0;
        while (guard++ < 60) {
            let best = null;
            for (const i of ownedBy(st, who)) { if (st.terr[i].armies < 2) continue; for (const j of MAP[i].adj) { if (st.terr[j].owner === who) continue; const margin = st.terr[i].armies - st.terr[j].armies; const need = skill >= 3 ? 1 : 2; if (margin >= need && (!best || margin > best.margin)) best = { i, j, margin }; } }
            if (!best) break;
            const r = resolveBattle(st.terr[best.i].armies, st.terr[best.j].armies);
            st.terr[best.i].armies -= r.attLoss; st.terr[best.j].armies -= r.defLoss;
            if (st.terr[best.j].armies <= 0) { const move = Math.min(st.terr[best.i].armies - 1, Math.max(r.na, 1)); st.terr[best.j].owner = who; st.terr[best.j].armies = move; st.terr[best.i].armies -= move; captures++; if (terminalResult(st)) return captures; }
            if (Math.random() < (skill >= 4 ? 0.05 : 0.25)) break;
        }
        return captures;
    }
    function aiFortify(st, who) { const interior = ownedBy(st, who).filter(i => !isBorder(st, i) && st.terr[i].armies > 1); for (const i of interior) { const b = MAP[i].adj.find(j => st.terr[j].owner === who && isBorder(st, j)); if (b !== undefined) { const mv = st.terr[i].armies - 1; st.terr[b].armies += mv; st.terr[i].armies = 1; return; } } }

    // -------- scene --------
    const P_COLOR = '#4aa3ff', A_COLOR = '#e5645b';
    class Scene_Risk extends Scene_BoardGameBase {
        onMatchStart() {
            this.g = newGame();
            this.g.phase = 'reinforce'; this.g.pool = reinforcements(this.g, 'p');
            this._src = -1; this._buttons = []; this._dice = null;
            this._phase = 'player'; this._timer = 0; this._aiStep = 0;
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.taunt('greeting');
            this.showMessage("Reinforce: click your (blue) territories to place " + this.g.pool + " armies.");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._w = area.width; this._h = area.height;
            this._sprite = new Sprite(new Bitmap(area.width, area.height));
            this._sprite.x = area.x + mX; this._sprite.y = area.y + mY;
            this._sox = this._sprite.x; this._soy = this._sprite.y;
            this.addChild(this._sprite);
            this._pad = Math.floor(this._w * 0.05);
            this._nodeR = Math.max(11, Math.floor(this._w * 0.026));
        }
        nodePos(i) { const t = MAP[i]; const x = this._pad + t.x * (this._w - 2 * this._pad); const y = this._pad + t.y * (this._h - 2 * this._pad - 30); return [x, y]; }

        updateGame() {
            if (this._phase === 'player') this.updatePlayer();
            else if (this._phase === 'ai') { if (--this._timer <= 0) this.aiStep(); }
        }
        localTouch() { return [TouchInput.x - this._sox, TouchInput.y - this._soy]; }
        nodeAt(x, y) { let best = -1, bd = this._nodeR * this._nodeR * 1.7; for (let i = 0; i < MAP.length; i++) { const [nx, ny] = this.nodePos(i); const d = (nx - x) * (nx - x) + (ny - y) * (ny - y); if (d < bd) { bd = d; best = i; } } return best; }
        hitButton(x, y) { for (const b of this._buttons) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.id; return null; }

        updatePlayer() {
            if (!TouchInput.isTriggered()) return;
            const [x, y] = this.localTouch();
            const btn = this.hitButton(x, y);
            if (btn === 'end') { this.endPhase(); return; }
            const i = this.nodeAt(x, y);
            if (i < 0) return;
            if (this.g.phase === 'reinforce') this.clickReinforce(i);
            else if (this.g.phase === 'attack') this.clickAttack(i);
            else if (this.g.phase === 'fortify') this.clickFortify(i);
        }
        clickReinforce(i) {
            if (this.g.terr[i].owner !== 'p' || this.g.pool <= 0) { this.playSe('buzzer'); return; }
            this.g.terr[i].armies++; this.g.pool--; this.playSe('select');
            this.redraw(); this.refreshStatus();
            if (this.g.pool === 0) { this.g.phase = 'attack'; this.showMessage("Attack: click your territory (2+), then an adjacent enemy. END PHASE when done."); }
            else this.showMessage("Placed on " + MAP[i].name + ". " + this.g.pool + " armies left.");
        }
        clickAttack(i) {
            const t = this.g.terr[i];
            if (this._src < 0) { if (t.owner === 'p' && t.armies >= 2) { this._src = i; this.playSe('select'); this.showMessage("Attacking from " + MAP[i].name + " — pick an adjacent enemy."); } else this.playSe('buzzer'); this.redraw(); return; }
            if (i === this._src) { this._src = -1; this.redraw(); return; }
            if (!MAP[this._src].adj.includes(i) || t.owner === 'p') { if (t.owner === 'p' && t.armies >= 2) { this._src = i; this.playSe('select'); this.redraw(); this.showMessage("Attacking from " + MAP[i].name + "."); } else this.playSe('buzzer'); return; }
            // roll one battle
            if (this.g.terr[this._src].armies < 2) { this.playSe('buzzer'); this.showMessage("Not enough armies to attack."); this._src = -1; this.redraw(); return; }
            const r = resolveBattle(this.g.terr[this._src].armies, t.armies);
            this.g.terr[this._src].armies -= r.attLoss; t.armies -= r.defLoss; this._dice = r; this.playSe('move');
            let msg = "You " + r.ad.join(',') + " vs " + r.dd.join(',') + " — you lose " + r.attLoss + ", they lose " + r.defLoss + ".";
            if (t.armies <= 0) {
                const move = Math.min(this.g.terr[this._src].armies - 1, Math.max(r.na, 1));
                t.owner = 'p'; t.armies = move; this.g.terr[this._src].armies -= move;
                msg += " Captured " + MAP[i].name + "!"; this.playSe('win');
                this._src = t.armies >= 2 ? i : -1;
            }
            this.redraw(); this.refreshStatus(); this.showMessage(msg);
            const res = terminalResult(this.g); if (res) return this.finish(res);
        }
        clickFortify(i) {
            const t = this.g.terr[i];
            if (this._src < 0) { if (t.owner === 'p' && t.armies > 1) { this._src = i; this.playSe('select'); this.showMessage("Fortify from " + MAP[i].name + " — pick a connected friendly territory."); } else this.playSe('buzzer'); this.redraw(); return; }
            if (i === this._src) { this._src = -1; this.redraw(); return; }
            if (t.owner === 'p' && MAP[this._src].adj.includes(i)) {
                const mv = this.g.terr[this._src].armies - 1; t.armies += mv; this.g.terr[this._src].armies = 1;
                this.playSe('move'); this.showMessage("Moved " + mv + " to " + MAP[i].name + ". Turn ends.");
                this._src = -1; this.redraw(); this.refreshStatus(); this.endTurnToAI();
            } else this.playSe('buzzer');
        }
        endPhase() {
            if (this.g.phase === 'reinforce') { this.g.phase = 'attack'; this._src = -1; this.showMessage("Attack phase. END PHASE to move on."); }
            else if (this.g.phase === 'attack') { this.g.phase = 'fortify'; this._src = -1; this.showMessage("Fortify: one move, or END PHASE to end your turn."); }
            else { this.endTurnToAI(); return; }
            this.redraw(); this.refreshStatus();
        }
        endTurnToAI() {
            this.g.plies++;
            const res = terminalResult(this.g); if (res) return this.finish(res);
            this.g.turn = 'a'; this._phase = 'ai'; this._aiStep = 0; this._timer = 30; this._src = -1;
            this.showMessage(this.opponent.name + " is taking its turn...");
            this.redraw();
        }
        aiStep() {
            if (this._aiStep === 0) { aiReinforce(this.g, 'a'); this.redraw(); this.refreshStatus(); this.showMessage(this.opponent.name + " reinforces its front lines."); this._aiStep = 1; this._timer = 34; }
            else if (this._aiStep === 1) { const before = ownedBy(this.g, 'p').length; const caps = aiAttack(this.g, 'a', this.difficulty); const lost = before - ownedBy(this.g, 'p').length; this.redraw(); this.refreshStatus(); this.showMessage(caps ? this.opponent.name + " attacks and takes " + lost + " of your territories!" : this.opponent.name + " holds position."); if (caps) this.taunt('thinking'); const res = terminalResult(this.g); if (res) return this.finish(res); this._aiStep = 2; this._timer = 34; }
            else { aiFortify(this.g, 'a'); this.g.plies++; const res = terminalResult(this.g); if (res) return this.finish(res); this.g.turn = 'p'; this.g.phase = 'reinforce'; this.g.pool = reinforcements(this.g, 'p'); this._phase = 'player'; this.redraw(); this.refreshStatus(); this.showMessage("Your turn. Reinforce with " + this.g.pool + " armies."); }
        }
        finish(res) { this.endMatch(res === 'p' ? 'win' : res === 'a' ? 'lose' : 'draw'); }
        refreshStatus() {
            const pt = ownedBy(this.g, 'p').length, at = ownedBy(this.g, 'a').length;
            const pa = ownedBy(this.g, 'p').reduce((s, i) => s + this.g.terr[i].armies, 0), aa = ownedBy(this.g, 'a').reduce((s, i) => s + this.g.terr[i].armies, 0);
            const lines = ["Phase: " + this.g.phase, this.g.phase === 'reinforce' ? "To place: " + this.g.pool : "", "", "You: " + pt + " lands, " + pa + " armies", this.opponent.name + ": " + at + " lands, " + aa + " armies"];
            this.setStatus(lines.filter(x => x !== ""));
        }
        redraw() {
            const bmp = this._sprite.bitmap; bmp.clear(); this._buttons = [];
            // edges
            for (const [i, j] of EDGES) { const [x1, y1] = this.nodePos(i), [x2, y2] = this.nodePos(j); this.line(bmp, x1, y1, x2, y2, rgba(C.lineColor, 0.28)); }
            // valid-target hints
            if (this._src >= 0) for (const j of MAP[this._src].adj) { const okTarget = this.g.phase === 'attack' ? this.g.terr[j].owner !== 'p' : this.g.terr[j].owner === 'p'; if (okTarget) { const [x, y] = this.nodePos(j); bmp.drawCircle(x, y, this._nodeR + 4, rgba(C.highlight, 0.35)); } }
            // nodes
            for (let i = 0; i < MAP.length; i++) this.drawNode(bmp, i);
            // end-phase button
            if (this._phase === 'player') { const bw = Math.floor(this._w * 0.22), bh = 26, bx = this._w - bw - 8, by = this._h - bh - 4; bmp.fillRect(bx, by, bw, bh, rgba(C.highlight, 0.25)); bmp.strokeRect(bx, by, bw, bh, C.highlight); bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = 15; bmp.textColor = C.textMain; bmp.drawText("END PHASE", bx, by + 4, bw, 20, 'center'); this._buttons.push({ id: 'end', x: bx, y: by, w: bw, h: bh }); }
        }
        drawNode(bmp, i) {
            const [x, y] = this.nodePos(i), t = this.g.terr[i], r = this._nodeR;
            bmp.drawCircle(x, y, r + 3, CONT_COLOR[MAP[i].cont]);
            bmp.drawCircle(x, y, r, t.owner === 'p' ? P_COLOR : A_COLOR);
            if (i === this._src) bmp.strokeRect(x - r - 5, y - r - 5, 2 * r + 10, 2 * r + 10, C.win);
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(r * 1.0); bmp.textColor = '#ffffff';
            bmp.drawText(String(t.armies), x - r, y - Math.floor(r * 0.6), 2 * r, Math.floor(r * 1.2), 'center');
            bmp.fontSize = Math.max(8, Math.floor(r * 0.62)); bmp.textColor = rgba(C.textMain, 0.85);
            bmp.drawText(MAP[i].id, x - r * 1.6, y + r, r * 3.2, Math.floor(r * 0.9), 'center');
        }
        line(bmp, x1, y1, x2, y2, color) {
            const dx = x2 - x1, dy = y2 - y1, len = Math.max(1, Math.floor(Math.hypot(dx, dy) / 3));
            for (let k = 0; k <= len; k++) { const x = x1 + dx * k / len, y = y1 + dy * k / len; bmp.fillRect(Math.floor(x), Math.floor(y), 2, 2, color); }
        }
    }

    BoardGameManager.registerGame({ id: 'risk', name: 'Risk', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Risk });
})();
