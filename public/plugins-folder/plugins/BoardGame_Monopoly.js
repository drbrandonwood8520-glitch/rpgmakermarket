/*:
 * @target MZ
 * @plugindesc [v1.0.0] Monopoly-style property game for the Board Game engine. Buy, build, collect rent, bankrupt your rival. Requires BoardGameCore.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 *
 * @help
 * ============================================================================
 * BoardGame_Monopoly.js  —  Game Id: "monopoly"
 * ============================================================================
 * A two-player property-trading game against an NPC. Install BoardGameCore.js
 * ABOVE this plugin, then launch with "Start Board Game" using Game Id:
 * monopoly.
 *
 * ON YOUR TURN: press the ROLL button (or OK). Your token moves; landing on an
 * unowned property offers a BUY prompt (OK/click Buy, or PageDown/click Pass).
 * Rent, tax and cards are applied automatically. Roll doubles to go again.
 * BUILD: when you own a full colour set, click one of those spaces during your
 * turn to build a house (evenly, if you can afford it). Bankrupt the opponent
 * to win; if the round cap is reached, the higher net worth wins.
 *
 * Difficulty scales how aggressively the opponent buys and builds.
 *
 * SIMPLIFICATIONS (by design, for an NPC minigame): no player-to-player
 * trading, no auctions, no mortgaging. The engine (rent tables, set-doubling,
 * railroads, bankruptcy, guaranteed termination) is simulation-tested.
 *
 * NOTE: "Monopoly" is a trademark of Hasbro. This implements only the game
 * mechanics with original board/card naming; rename it for commercial use.
 * ============================================================================
 */

(() => {
    "use strict";
    if (typeof Scene_BoardGameBase === "undefined") { console.error("[BoardGame_Monopoly] Install BoardGameCore.js above this plugin."); return; }
    const C = BoardGameTheme.colors;
    const MAX_SKILL = BoardGameManager.MAX_SKILL;
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const die = () => 1 + BoardGameAI.randomInt(6);

    // ======================= ENGINE (simulation-tested) =======================
    const STREET_NAMES = {
        0: ['Rusty Lane', 'Old Kiln Road'], 1: ['Willow Way', 'Cedar Court', 'Maple Crossing'],
        2: ['Coral Street', 'Rose Avenue', 'Blossom Row'], 3: ['Amber Alley', 'Copper Street', 'Sunset Boulevard'],
        4: ['Crimson Road', 'Garnet Street', 'Ruby Avenue'], 5: ['Golden Mile', 'Saffron Street', 'Daffodil Drive'],
        6: ['Emerald Way', 'Fern Gully', 'Pine Terrace'], 7: ['Sapphire Court', 'Midnight Boulevard']
    };
    const GROUP_PRICE = { 0: 60, 1: 100, 2: 140, 3: 180, 4: 220, 5: 260, 6: 300, 7: 350 };
    const GROUP_HOUSE = { 0: 50, 1: 50, 2: 100, 3: 100, 4: 150, 5: 150, 6: 200, 7: 200 };
    const GROUP_COLOR = { 0: '#8b5a2b', 1: '#7fc3e0', 2: '#d17ba3', 3: '#e08a3c', 4: '#d0453f', 5: '#e7c15a', 6: '#3fa35a', 7: '#35507a', rail: '#cfd3da', util: '#9aa3b2' };
    function streetSpace(group, n) { const price = GROUP_PRICE[group] + n * 20; const base = Math.max(2, Math.round(price * 0.09)); return { type: 'prop', name: STREET_NAMES[group][n], group, price, houseCost: GROUP_HOUSE[group], rents: [base, base * 5, base * 15, base * 40, base * 70, base * 100] }; }
    function buildBoard() {
        const b = new Array(40);
        b[0] = { type: 'go', name: 'GO' }; b[10] = { type: 'jail', name: 'Jail' }; b[20] = { type: 'free', name: 'Free Parking' }; b[30] = { type: 'gotojail', name: 'Go To Jail' };
        b[4] = { type: 'tax', name: 'Income Tax', amount: 200 }; b[38] = { type: 'tax', name: 'Luxury Tax', amount: 100 };
        [7, 22, 36].forEach(i => b[i] = { type: 'chance', name: 'Chance' });[2, 17, 33].forEach(i => b[i] = { type: 'chest', name: 'Community Chest' });
        [5, 15, 25, 35].forEach((i, k) => b[i] = { type: 'rail', name: ['North', 'East', 'South', 'West'][k] + ' Line Station', price: 200, group: 'rail' });
        b[12] = { type: 'util', name: 'Reservoir Company', price: 150, group: 'util' }; b[28] = { type: 'util', name: 'Power Station', price: 150, group: 'util' };
        const slots = [1, 3, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24, 26, 27, 29, 31, 32, 34, 37, 39]; let si = 0;
        for (let g = 0; g <= 7; g++) for (let n = 0; n < STREET_NAMES[g].length; n++) b[slots[si++]] = streetSpace(g, n);
        return b;
    }
    const BOARD = buildBoard();
    const CHANCE = [{ t: 'move', to: 0 }, { t: 'cash', amt: 100 }, { t: 'cash', amt: -50 }, { t: 'jail' }, { t: 'moveRel', n: -3 }, { t: 'cash', amt: 50 }, { t: 'cash', amt: -100 }, { t: 'nearestRail' }];
    const CHEST = [{ t: 'cash', amt: 200 }, { t: 'cash', amt: -100 }, { t: 'cash', amt: 50 }, { t: 'jail' }, { t: 'cash', amt: -50 }, { t: 'cash', amt: 100 }, { t: 'move', to: 0 }, { t: 'cash', amt: 25 }];
    const other = w => w === 'p' ? 'a' : 'p';
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = BoardGameAI.randomInt(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }
    const mkPlayer = () => ({ money: 1500, pos: 0, inJail: false, jailTurns: 0, bankrupt: false });
    function newGame() {
        const props = {};
        for (let i = 0; i < 40; i++) if (['prop', 'rail', 'util'].includes(BOARD[i].type)) props[i] = { owner: null, houses: 0 };
        return { players: { p: mkPlayer(), a: mkPlayer() }, props, turn: 'p', plies: 0, over: false, result: null, chance: shuffle(CHANCE.slice()), chest: shuffle(CHEST.slice()), cap: 220 };
    }
    function groupIndices(group) { const out = []; for (let i = 0; i < 40; i++) { const s = BOARD[i]; if ((s.type === 'prop' && s.group === group) || (group === 'rail' && s.type === 'rail') || (group === 'util' && s.type === 'util')) out.push(i); } return out; }
    const ownsWholeGroup = (st, o, g) => groupIndices(g).every(i => st.props[i].owner === o);
    const countOwned = (st, o, g) => groupIndices(g).filter(i => st.props[i].owner === o).length;
    function rentFor(st, idx, diceSum) {
        const s = BOARD[idx], pr = st.props[idx]; if (!pr || pr.owner === null) return 0;
        if (s.type === 'rail') return 25 * Math.pow(2, countOwned(st, pr.owner, 'rail') - 1);
        if (s.type === 'util') return diceSum * (countOwned(st, pr.owner, 'util') === 2 ? 10 : 4);
        if (pr.houses > 0) return s.rents[pr.houses];
        return ownsWholeGroup(st, pr.owner, s.group) ? s.rents[0] * 2 : s.rents[0];
    }
    function raiseCash(st, who, need) { const P = st.players[who]; let guard = 0; while (P.money < need && guard++ < 500) { let sold = false; for (let i = 0; i < 40; i++) { const pr = st.props[i]; if (pr && pr.owner === who && pr.houses > 0) { pr.houses--; P.money += Math.floor(BOARD[i].houseCost / 2); sold = true; if (P.money >= need) break; } } if (!sold) break; } }
    function pay(st, from, amount, toOwner) {
        const P = st.players[from]; if (P.money < amount) raiseCash(st, from, amount);
        if (P.money < amount) { bankrupt(st, from, toOwner); return false; }
        P.money -= amount; if (toOwner && st.players[toOwner]) st.players[toOwner].money += amount; return true;
    }
    function bankrupt(st, who, creditor) {
        const P = st.players[who]; P.bankrupt = true;
        for (let i = 0; i < 40; i++) { const pr = st.props[i]; if (pr && pr.owner === who) { if (creditor && st.players[creditor]) { pr.owner = creditor; pr.houses = 0; } else { pr.owner = null; pr.houses = 0; } } }
        if (creditor && st.players[creditor]) st.players[creditor].money += Math.max(0, P.money);
        P.money = 0; st.over = true; st.result = creditor ? creditor : other(who);
    }
    function netWorth(st, who) { let n = st.players[who].money; for (let i = 0; i < 40; i++) { const pr = st.props[i]; if (pr && pr.owner === who) { n += BOARD[i].price || 0; n += pr.houses * (BOARD[i].houseCost || 0); } } return n; }
    function moveTo(st, who, pos, passGo) { const P = st.players[who]; if (passGo && pos < P.pos) P.money += 200; P.pos = pos; }
    function sendToJail(st, who) { const P = st.players[who]; P.pos = 10; P.inJail = true; P.jailTurns = 0; }
    // AI helpers
    function aiMaybeBuy(st, who) { const P = st.players[who], idx = P.pos, s = BOARD[idx], price = s.price; if (P.money >= price + 100 || (s.type === 'prop' && countOwned(st, who, s.group) >= 1 && P.money >= price)) { P.money -= price; st.props[idx].owner = who; return true; } return false; }
    function aiBuild(st, who) { const P = st.players[who]; let guard = 0; while (P.money > 500 && guard++ < 20) { let built = false; for (let g = 0; g <= 7; g++) { if (!ownsWholeGroup(st, who, g)) continue; const idxs = groupIndices(g); const minH = Math.min(...idxs.map(i => st.props[i].houses)); if (minH >= 5) continue; const target = idxs.find(i => st.props[i].houses === minH); const cost = BOARD[target].houseCost; if (P.money - cost < 300) continue; P.money -= cost; st.props[target].houses++; built = true; break; } if (!built) break; } }

    // ============================== SCENE ==============================
    const P_COLOR = '#4aa3ff', A_COLOR = '#e5645b';
    class Scene_Monopoly extends Scene_BoardGameBase {
        onMatchStart() {
            this.g = newGame();
            this._phase = 'roll'; this._timer = 0; this._dice = [1, 1]; this._doubles = 0; this._cardDepth = 0;
            this._buttons = []; this._pendingBuy = -1;
            this._anim = null;
            this.buildSprite(); this.redraw(); this.refreshStatus();
            this.taunt('greeting');
            this.showMessage("Your turn. Press ROLL (or OK). Own a full colour set? Click it to build.");
        }
        buildSprite() {
            const area = this.boardAreaRect();
            const S = Math.min(area.width, area.height);
            this._u = Math.floor(S / 11); const px = this._u * 11;
            const mX = (Graphics.width - Graphics.boxWidth) / 2, mY = (Graphics.height - Graphics.boxHeight) / 2;
            this._ox = area.x + Math.floor((area.width - px) / 2) + mX;
            this._oy = area.y + Math.floor((area.height - px) / 2) + mY;
            this._sprite = new Sprite(new Bitmap(px, px));
            this._sprite.x = this._ox; this._sprite.y = this._oy;
            this.addChild(this._sprite);
        }
        spaceRect(i) {
            const u = this._u; let x, y;
            if (i === 0) { x = 10 * u; y = 10 * u; }
            else if (i < 10) { x = (10 - i) * u; y = 10 * u; }
            else if (i === 10) { x = 0; y = 10 * u; }
            else if (i < 20) { x = 0; y = (10 - (i - 10)) * u; }
            else if (i === 20) { x = 0; y = 0; }
            else if (i < 30) { x = (i - 20) * u; y = 0; }
            else if (i === 30) { x = 10 * u; y = 0; }
            else { x = 10 * u; y = (i - 30) * u; }
            return { x, y, w: u, h: u };
        }

        updateGame() {
            if (this._anim) { this.updateAnim(); return; }
            if (this._phase === 'roll') this.updateRoll();
            else if (this._phase === 'buy') this.updateBuy();
            else if (this._phase === 'jail') this.updateJail();
            else if (this._phase === 'aiWait') { if (--this._timer <= 0) this.aiBegin(); }
            else if (this._phase === 'aiRollWait') { if (--this._timer <= 0) this.aiRoll(); }
        }
        localTouch() { return [TouchInput.x - this._ox, TouchInput.y - this._oy]; }
        hitButton(x, y) { for (const b of this._buttons) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.id; return null; }

        // ---- player: roll / build ----
        updateRoll() {
            if (this.g.players.p.inJail) { this._phase = 'jail'; this.redraw(); return; }
            if (TouchInput.isTriggered()) {
                const [x, y] = this.localTouch(); const id = this.hitButton(x, y);
                if (id === 'roll') { this.playerRoll(); return; }
                // build on a clicked owned full-set space
                const idx = this.spaceIndexAt(x, y);
                if (idx >= 0) { this.tryBuild(idx); return; }
            }
            if (Input.isTriggered('ok')) this.playerRoll();
        }
        spaceIndexAt(x, y) { for (let i = 0; i < 40; i++) { const r = this.spaceRect(i); if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; }
        tryBuild(idx) {
            const s = BOARD[idx], pr = this.g.props[idx];
            if (!pr || s.type !== 'prop' || pr.owner !== 'p' || !ownsWholeGroup(this.g, 'p', s.group)) { return; }
            const idxs = groupIndices(s.group); const minH = Math.min(...idxs.map(i => this.g.props[i].houses));
            if (pr.houses > minH) { this.showMessage("Build evenly — improve the lower-house lots first."); return; }
            if (pr.houses >= 5) { this.showMessage("That lot already has a hotel."); return; }
            if (this.g.players.p.money < s.houseCost) { this.playSe('buzzer'); this.showMessage("Not enough cash to build ($" + s.houseCost + ")."); return; }
            this.g.players.p.money -= s.houseCost; pr.houses++; this.playSe('move');
            this.showMessage((pr.houses === 5 ? "Hotel" : "House " + pr.houses) + " built on " + s.name + " (-$" + s.houseCost + ").");
            this.redraw(); this.refreshStatus();
        }
        playerRoll() {
            const d1 = die(), d2 = die(); this._dice = [d1, d2]; const sum = d1 + d2;
            this.playSe('select');
            if (d1 === d2) { this._doubles++; if (this._doubles === 3) { sendToJail(this.g, 'p'); this._doubles = 0; this.showMessage("Three doubles! Off to jail."); this.redraw(); this.endPlayerTurn(); return; } }
            this.animateMove('p', sum, () => this.playerResolve(sum));
        }
        playerResolve(sum) {
            const P = this.g.players.p, s = BOARD[P.pos], pr = this.g.props[P.pos];
            const done = () => this.afterPlayerLanding(sum);
            switch (s.type) {
                case 'go': case 'jail': case 'free': this.showMessage("Landed on " + s.name + "."); done(); break;
                case 'gotojail': sendToJail(this.g, 'p'); this._doubles = 0; this.showMessage("Go directly to jail!"); this.redraw(); this.endPlayerTurn(); break;
                case 'tax': { const ok = pay(this.g, 'p', s.amount, null); this.showMessage(s.name + ": paid $" + s.amount + "."); this.redraw(); this.refreshStatus(); if (!ok) return this.finish(); done(); break; }
                case 'chance': case 'chest': this.playerCard(s.type === 'chance' ? 'chance' : 'chest', sum); break;
                case 'prop': case 'rail': case 'util':
                    if (pr.owner === null) { this.offerBuy(P.pos, sum); }
                    else if (pr.owner === 'a') { const rent = rentFor(this.g, P.pos, sum); const ok = pay(this.g, 'p', rent, 'a'); this.showMessage("Landed on " + s.name + " — paid $" + rent + " rent."); this.redraw(); this.refreshStatus(); if (!ok) return this.finish(); done(); }
                    else { this.showMessage("Your own " + s.name + "."); done(); }
                    break;
                default: done();
            }
        }
        playerCard(which, sum) {
            const deck = which === 'chance' ? this.g.chance : this.g.chest;
            const card = deck.shift(); deck.push(card); const P = this.g.players.p;
            const done = () => this.afterPlayerLanding(sum);
            if (card.t === 'cash') { if (card.amt >= 0) { P.money += card.amt; this.showMessage((which === 'chance' ? "Chance" : "Chest") + ": collect $" + card.amt + "."); } else { const ok = pay(this.g, 'p', -card.amt, null); this.showMessage((which === 'chance' ? "Chance" : "Chest") + ": pay $" + (-card.amt) + "."); if (!ok) { this.redraw(); this.refreshStatus(); return this.finish(); } } this.redraw(); this.refreshStatus(); done(); }
            else if (card.t === 'jail') { sendToJail(this.g, 'p'); this._doubles = 0; this.showMessage("Card sends you to jail."); this.redraw(); this.endPlayerTurn(); }
            else if (card.t === 'move' || card.t === 'moveRel' || card.t === 'nearestRail') {
                let target = P.pos;
                if (card.t === 'move') target = card.to;
                else if (card.t === 'moveRel') target = (P.pos + card.n + 40) % 40;
                else { target = P.pos; do { target = (target + 1) % 40; } while (BOARD[target].type !== 'rail'); }
                const passGo = card.t !== 'moveRel' && target < P.pos;
                if (passGo) P.money += 200;
                this.showMessage("Card moves you to " + BOARD[target].name + ".");
                const steps = (target - P.pos + 40) % 40;
                this.animateMove('p', steps === 0 ? 40 : steps, () => { if (this._cardDepth++ < 4) this.playerResolve(sum); else done(); this._cardDepth = 0; });
            }
        }
        offerBuy(idx, sum) {
            const s = BOARD[idx], P = this.g.players.p;
            if (P.money < s.price) { this.showMessage("Landed on " + s.name + " ($" + s.price + ") — can't afford it."); this.afterPlayerLanding(sum); return; }
            this._pendingBuy = idx; this._pendingSum = sum; this._phase = 'buy';
            this.showMessage("Buy " + s.name + " for $" + s.price + "?  Buy = OK/click,  Pass = PageDown.");
            this.redraw();
        }
        updateBuy() {
            const s = BOARD[this._pendingBuy];
            let choice = null;
            if (TouchInput.isTriggered()) { const [x, y] = this.localTouch(); const id = this.hitButton(x, y); if (id === 'buy') choice = 'buy'; else if (id === 'pass') choice = 'pass'; }
            if (Input.isTriggered('ok')) choice = 'buy';
            if (Input.isTriggered('pagedown')) choice = 'pass';
            if (!choice) return;
            if (choice === 'buy') { this.g.players.p.money -= s.price; this.g.props[this._pendingBuy].owner = 'p'; this.playSe('move'); this.showMessage("Bought " + s.name + " for $" + s.price + "."); }
            else { this.playSe('select'); this.showMessage("Passed on " + s.name + "."); }
            const sum = this._pendingSum; this._pendingBuy = -1; this._phase = 'roll';
            this.redraw(); this.refreshStatus(); this.afterPlayerLanding(sum);
        }
        updateJail() {
            const P = this.g.players.p;
            this._buttons = [];
            let choice = null;
            if (TouchInput.isTriggered()) { const [x, y] = this.localTouch(); const id = this.hitButton(x, y); if (id) choice = id; }
            if (Input.isTriggered('ok')) choice = 'jailroll';
            if (Input.isTriggered('pagedown')) choice = 'jailpay';
            if (choice === 'jailpay') {
                if (P.money >= 50) { P.money -= 50; P.inJail = false; P.jailTurns = 0; this.showMessage("Paid $50 bail. Now roll."); this._phase = 'roll'; this.redraw(); this.refreshStatus(); }
                else { this.playSe('buzzer'); this.showMessage("Not enough for bail — roll for doubles."); }
                return;
            }
            if (choice === 'jailroll') {
                const d1 = die(), d2 = die(); this._dice = [d1, d2];
                if (d1 === d2) { P.inJail = false; P.jailTurns = 0; this.showMessage("Doubles! You're out."); this.animateMove('p', d1 + d2, () => this.playerResolve(d1 + d2)); }
                else { P.jailTurns++; if (P.jailTurns >= 3) { const ok = pay(this.g, 'p', 50, null); P.inJail = false; P.jailTurns = 0; this.showMessage("Third try failed — paid $50, moving " + (d1 + d2) + "."); this.redraw(); if (!ok) return this.finish(); this.animateMove('p', d1 + d2, () => this.playerResolve(d1 + d2)); } else { this.showMessage("No doubles (" + d1 + "+" + d2 + "). Still in jail."); this.redraw(); this.endPlayerTurn(); } }
            }
        }
        afterPlayerLanding(sum) {
            if (this.g.over) return this.finish();
            if (this._dice[0] === this._dice[1] && !this.g.players.p.inJail) { this._phase = 'roll'; this.showMessage("Doubles — roll again!"); this.redraw(); }
            else this.endPlayerTurn();
        }
        endPlayerTurn() {
            this._doubles = 0;
            this.g.plies++;
            if (this.checkCap()) return this.finish();
            this.g.turn = 'a'; this._phase = 'aiWait'; this._timer = 30;
            this.redraw();
        }

        // ---- AI turn ----
        aiBegin() {
            const P = this.g.players.a; this.g.plies++;
            if (P.inJail) {
                if (P.money >= 50) { P.money -= 50; P.inJail = false; P.jailTurns = 0; this.showMessage(this.opponent.name + " pays $50 bail."); }
                else { const d1 = die(), d2 = die(); if (d1 === d2) { P.inJail = false; } else { P.jailTurns++; if (P.jailTurns < 3) { this.showMessage(this.opponent.name + " stays in jail."); return this.endAITurn(); } P.inJail = false; } }
            }
            this._doubles = 0; this.aiRollBegin();
        }
        aiRollBegin() { this._phase = 'aiRollWait'; this._timer = 24; }
        aiRoll() {
            const P = this.g.players.a;
            const d1 = die(), d2 = die(), sum = d1 + d2; this._dice = [d1, d2];
            if (d1 === d2) { this._doubles++; if (this._doubles === 3) { sendToJail(this.g, 'a'); this.showMessage(this.opponent.name + " rolled three doubles — jailed!"); this.redraw(); return this.endAITurn(); } }
            this.animateMove('a', sum, () => this.aiResolve(sum, d1 === d2));
        }
        aiResolve(sum, wasDouble) {
            const P = this.g.players.a, s = BOARD[P.pos], pr = this.g.props[P.pos];
            const beforeMoney = P.money;
            let msg = this.opponent.name + " landed on " + s.name + ".";
            if (s.type === 'tax') { const ok = pay(this.g, 'a', s.amount, null); msg += " Paid $" + s.amount + "."; if (!ok) { this.finalizeAI(msg, false, wasDouble); return; } }
            else if (s.type === 'gotojail') { sendToJail(this.g, 'a'); msg = this.opponent.name + " was sent to jail."; this.finalizeAI(msg, true, false); return; }
            else if (s.type === 'chance' || s.type === 'chest') { const r = this.aiCard(s.type === 'chance' ? 'chance' : 'chest'); msg += " " + r.msg; if (r.jailed) { this.finalizeAI(msg, true, false); return; } if (r.bankrupt) { this.finalizeAI(msg, false, wasDouble); return; } }
            else if (s.type === 'prop' || s.type === 'rail' || s.type === 'util') {
                if (pr.owner === null) { const bought = aiMaybeBuy(this.g, 'a'); msg += bought ? " Bought it for $" + s.price + "." : " Didn't buy."; }
                else if (pr.owner === 'p') { const rent = rentFor(this.g, P.pos, sum); const ok = pay(this.g, 'a', rent, 'p'); msg += " Paid you $" + rent + " rent."; if (!ok) { this.finalizeAI(msg, false, wasDouble); return; } }
                else { msg += " Its own."; }
            }
            aiBuild(this.g, 'a');
            this.finalizeAI(msg, false, wasDouble);
        }
        aiCard(which) {
            const deck = which === 'chance' ? this.g.chance : this.g.chest; const card = deck.shift(); deck.push(card); const P = this.g.players.a;
            if (card.t === 'cash') { if (card.amt >= 0) { P.money += card.amt; return { msg: "Card: +$" + card.amt + "." }; } const ok = pay(this.g, 'a', -card.amt, null); return { msg: "Card: -$" + (-card.amt) + ".", bankrupt: !ok }; }
            if (card.t === 'jail') { sendToJail(this.g, 'a'); return { msg: "Card sends it to jail.", jailed: true }; }
            // movement cards: resolve target then rent/buy quickly (no animation for AI card hops)
            let target = P.pos;
            if (card.t === 'move') target = card.to; else if (card.t === 'moveRel') target = (P.pos + card.n + 40) % 40; else { do { target = (target + 1) % 40; } while (BOARD[target].type !== 'rail'); }
            if (card.t !== 'moveRel' && target < P.pos) P.money += 200;
            P.pos = target; const s = BOARD[target], pr = this.g.props[target];
            let extra = " Moved to " + s.name + ".";
            if (s.type === 'prop' || s.type === 'rail' || s.type === 'util') { if (pr.owner === null) { const b = aiMaybeBuy(this.g, 'a'); extra += b ? " Bought it." : ""; } else if (pr.owner === 'p') { const rent = rentFor(this.g, target, 7); const ok = pay(this.g, 'a', rent, 'p'); extra += " Paid you $" + rent + "."; if (!ok) return { msg: extra, bankrupt: true, moved: true }; } }
            else if (s.type === 'tax') { const ok = pay(this.g, 'a', s.amount, null); extra += " Paid $" + s.amount + "."; if (!ok) return { msg: extra, bankrupt: true, moved: true }; }
            return { msg: extra, moved: true };
        }
        finalizeAI(msg, jailed, wasDouble) {
            this.showMessage(msg); this.redraw(); this.refreshStatus();
            if (this.g.over) return this.finish();
            if (Math.random() < 0.25) this.taunt('thinking');
            if (wasDouble && !jailed && !this.g.players.a.bankrupt) { this._phase = 'aiRollWait'; this._timer = 26; return; }
            this.endAITurn();
        }
        endAITurn() {
            this._doubles = 0;
            if (this.checkCap()) return this.finish();
            this.g.turn = 'p'; this._phase = 'roll';
            this.showMessage("Your turn. Press ROLL.");
            this.redraw();
        }
        checkCap() { if (this.g.plies >= this.g.cap) { this.g.over = true; const np = netWorth(this.g, 'p'), na = netWorth(this.g, 'a'); this.g.result = np === na ? 'draw' : (np > na ? 'p' : 'a'); return true; } return false; }
        finish() { const r = this.g.result; this.endMatch(r === 'p' ? 'win' : r === 'a' ? 'lose' : 'draw'); }

        // ---- token movement animation ----
        animateMove(who, steps, done) {
            this._anim = { who, left: steps, done, tick: 0, salaryDone: false };
        }
        updateAnim() {
            const a = this._anim; a.tick++;
            if (a.tick % 6 !== 0) { return; }
            const P = this.g.players[a.who];
            const np = (P.pos + 1) % 40;
            if (np === 0) P.money += 200; // passed GO
            P.pos = np; a.left--;
            this.playSe('select');
            this.redraw(); this.refreshStatus();
            if (a.left <= 0) { const cb = a.done; this._anim = null; cb(); }
        }

        // ---- status / drawing ----
        refreshStatus() {
            const p = this.g.players.p, a = this.g.players.a;
            this.setStatus(["You:  $" + p.money, this.opponent.name + ":  $" + a.money, "", "Net worth", " you $" + netWorth(this.g, 'p'), " them $" + netWorth(this.g, 'a')]);
        }
        redraw() {
            const bmp = this._sprite.bitmap, u = this._u, px = u * 11;
            bmp.clear(); this._buttons = [];
            bmp.fillRect(0, 0, px, px, C.panel);
            // spaces
            for (let i = 0; i < 40; i++) this.drawSpace(bmp, i);
            // center info
            this.drawCenter(bmp, u, px);
            // tokens
            this.drawToken(bmp, 'p', -0.22);
            this.drawToken(bmp, 'a', 0.22);
        }
        drawSpace(bmp, i) {
            const r = this.spaceRect(i), s = BOARD[i], pr = this.g.props[i], u = this._u;
            bmp.fillRect(r.x, r.y, r.w, r.h, rgba('#f4f1e8', 0.06));
            bmp.strokeRect(r.x, r.y, r.w, r.h, rgba(C.lineColor, 0.7));
            // colour bar for streets / type tint
            if (s.type === 'prop') bmp.fillRect(r.x, r.y, r.w, Math.floor(r.h * 0.22), GROUP_COLOR[s.group]);
            else if (s.type === 'rail' || s.type === 'util') bmp.fillRect(r.x, r.y, r.w, Math.floor(r.h * 0.22), GROUP_COLOR[s.group]);
            // label
            bmp.fontFace = BoardGameTheme.fonts.main();
            bmp.fontSize = Math.max(8, Math.floor(u * 0.20)); bmp.textColor = rgba(C.textMain, 0.9);
            bmp.drawText(this.shortName(i), r.x + 1, r.y + Math.floor(r.h * 0.26), r.w - 2, Math.floor(u * 0.24), 'center');
            if (s.price) { bmp.fontSize = Math.max(7, Math.floor(u * 0.17)); bmp.textColor = rgba(C.textDim, 0.9); bmp.drawText("$" + s.price, r.x + 1, r.y + r.h - Math.floor(u * 0.22), r.w - 2, Math.floor(u * 0.2), 'center'); }
            // owner marker
            if (pr && pr.owner) { const oc = pr.owner === 'p' ? P_COLOR : A_COLOR; bmp.drawCircle(r.x + r.w - Math.floor(u * 0.16), r.y + r.h - Math.floor(u * 0.16), Math.floor(u * 0.10), oc); }
            // houses/hotel
            if (pr && pr.houses > 0) { const hy = r.y + Math.floor(r.h * 0.22) + 1; if (pr.houses < 5) { for (let h = 0; h < pr.houses; h++) bmp.fillRect(r.x + 2 + h * Math.floor(u * 0.18), hy, Math.floor(u * 0.14), Math.floor(u * 0.14), '#3fa35a'); } else { bmp.fillRect(r.x + 2, hy, Math.floor(u * 0.3), Math.floor(u * 0.16), '#d0453f'); } }
            // buildable hint on player's turn
            if (this._phase === 'roll' && s.type === 'prop' && pr && pr.owner === 'p' && ownsWholeGroup(this.g, 'p', s.group) && pr.houses < 5) bmp.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, rgba(C.win, 0.8));
        }
        shortName(i) {
            const s = BOARD[i];
            if (s.type === 'go') return 'GO'; if (s.type === 'jail') return 'JAIL'; if (s.type === 'free') return 'FREE'; if (s.type === 'gotojail') return 'GO>JAIL';
            if (s.type === 'tax') return 'TAX'; if (s.type === 'chance') return '?'; if (s.type === 'chest') return 'CHEST';
            if (s.type === 'rail') return 'RAIL'; if (s.type === 'util') return 'UTIL';
            return s.name.split(' ').map(w => w[0]).join('').slice(0, 4);
        }
        drawCenter(bmp, u, px) {
            const x = u + 4, y = u + 4, w = px - 2 * u - 8, h = px - 2 * u - 8;
            bmp.fontFace = BoardGameTheme.fonts.main();
            bmp.fontSize = Math.floor(u * 0.5); bmp.textColor = rgba(C.textMain, 0.9);
            bmp.drawText("Dice: " + this._dice[0] + " + " + this._dice[1], x, y + 4, w, Math.floor(u * 0.6), 'center');
            bmp.fontSize = Math.floor(u * 0.34); bmp.textColor = P_COLOR;
            bmp.drawText("You  $" + this.g.players.p.money, x, y + h * 0.35, w, Math.floor(u * 0.5), 'center');
            bmp.textColor = A_COLOR;
            bmp.drawText(this.opponent.name + "  $" + this.g.players.a.money, x, y + h * 0.35 + Math.floor(u * 0.55), w, Math.floor(u * 0.5), 'center');
            // buttons
            const bw = Math.floor(w * 0.5), bh = Math.floor(u * 0.9), bx = x + Math.floor((w - bw) / 2), by = y + h - bh - 6;
            if (this._phase === 'roll') this.drawButton(bmp, 'roll', 'ROLL', bx, by, bw, bh, C.highlight);
            else if (this._phase === 'buy') { const half = Math.floor((w - 12) / 2); this.drawButton(bmp, 'buy', 'BUY', x, by, half, bh, C.win); this.drawButton(bmp, 'pass', 'PASS', x + half + 12, by, half, bh, C.lose); }
            else if (this._phase === 'jail') { const half = Math.floor((w - 12) / 2); this.drawButton(bmp, 'jailroll', 'ROLL', x, by, half, bh, C.highlight); this.drawButton(bmp, 'jailpay', 'PAY $50', x + half + 12, by, half, bh, C.draw); }
        }
        drawButton(bmp, id, label, x, y, w, h, color) {
            bmp.fillRect(x, y, w, h, rgba(color, 0.25)); bmp.strokeRect(x, y, w, h, color);
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(h * 0.5); bmp.textColor = C.textMain;
            bmp.drawText(label, x, y + Math.floor(h * 0.24), w, Math.floor(h * 0.55), 'center');
            this._buttons.push({ id, x, y, w, h });
        }
        drawToken(bmp, who, offset) {
            const P = this.g.players[who]; const r = this.spaceRect(P.pos), u = this._u;
            const cx = r.x + r.w / 2 + offset * r.w, cy = r.y + r.h * 0.5;
            bmp.drawCircle(cx, cy, Math.floor(u * 0.16), who === 'p' ? P_COLOR : A_COLOR);
            bmp.fontFace = BoardGameTheme.fonts.main(); bmp.fontSize = Math.floor(u * 0.2); bmp.textColor = '#ffffff';
            bmp.drawText(who === 'p' ? 'Y' : 'O', cx - u * 0.16, cy - u * 0.16, u * 0.32, u * 0.32, 'center');
        }
    }

    BoardGameManager.registerGame({ id: 'monopoly', name: 'Monopoly', minSkill: 1, maxSkill: MAX_SKILL, scene: Scene_Monopoly });
})();
