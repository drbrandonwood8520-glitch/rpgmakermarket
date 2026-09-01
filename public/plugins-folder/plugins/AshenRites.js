//=============================================================================
// AshenRites.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Ashen Flask charges, Runes spent for Ashen Rite points at a grace, map-side buff timers, and a Skill list that only shows what can actually fire.
 * @author Claude
 * @url
 *
 * @param flaskItemId
 * @text Ashen Flask Item
 * @type item
 * @default 31
 * @desc The flask item. Its stack size IS its charges.
 *
 * @param flaskCharges
 * @text Flask Charges
 * @type number
 * @min 1
 * @default 4
 * @desc How many charges a full flask holds. Refilled to this at every rest.
 *
 * @param runeBase
 * @text First Rite Cost
 * @type number
 * @min 1
 * @default 110
 * @desc Runes for the first Ashen Rite point bought at a grace.
 *
 * @param runeStep
 * @text Cost Increase
 * @type number
 * @min 0
 * @default 70
 * @desc Added to the cost after each point bought, so later points cost more.
 *
 * @param mapTurnFrames
 * @text Rite Duration Tick
 * @type number
 * @min 30
 * @default 300
 * @desc Frames per "turn" on the map. Buff states last 8 turns, so 300 = about 40 seconds.
 *
 * @param hideDeadSkills
 * @text Hide Battle-Only Skills
 * @type boolean
 * @default true
 * @desc There are no battles in this game, so skills flagged "Battle Screen" can never fire. Hide them from the Skill menu.
 *
 * @param showLabels
 * @text Label Interactables
 * @type boolean
 * @default true
 * @desc Float a caption over the merchant, forge, grace points and other stations when you get near them.
 *
 * @param labelRange
 * @text Label Range
 * @type number
 * @min 1
 * @default 4
 * @desc How close (tiles) you must be for a station's caption to appear.
 *
 * @command commune
 * @text Commune with the Grace
 * @desc Spend Runes for one Ashen Rite point. Cost rises with each point bought.
 *
 * @help
 * ============================================================================
 * Ashen Rites
 * ============================================================================
 * Gives the four menu screens something to do, and gives Runes a purpose.
 *
 * ----------------------------------------------------------------------------
 * ITEM - the Ashen Flask
 * ----------------------------------------------------------------------------
 * The flask is an ordinary item whose STACK SIZE is its charge count. Drink one
 * and you have one fewer. Any "Recover All" - resting at a grace, or reclaiming
 * an area - fills it back to full for free.
 *
 * That makes it the healing you plan around, and makes bought potions the
 * emergency reserve rather than the whole economy.
 *
 * Grave Moss revives a companion who has fallen. Before this existed, nothing
 * short of a grace point could put an ally back on their feet, which was a real
 * hole once allies could die.
 *
 * ----------------------------------------------------------------------------
 * SKILL - rites, not battle commands
 * ----------------------------------------------------------------------------
 * Most of the stock skill list is flagged "Battle Screen" and this game has no
 * battles, so those entries could never fire. They are hidden.
 *
 * In their place each fighter has a rite usable from the menu:
 *   Reid     Steel Nerve      raises his own attack
 *   Michelle Bracing Stance   raises her own defence
 *   Kasey    Cinderveil       raises the whole party's attack
 * Eliot keeps his heals, which are the only way to patch the party up between
 * graces without spending a flask.
 *
 * Buff states normally tick down per battle turn, and there are no turns out
 * here - so a rite cast on the map would last forever. This plugin runs a
 * turn tick on the map instead, so rites expire the way they should.
 *
 * ----------------------------------------------------------------------------
 * RUNES - what they are for
 * ----------------------------------------------------------------------------
 * Runes buy Ashen Rite points, and only at a grace. Choose "Commune" to spend
 * them. Each point costs more than the last, so the choice of when to stop
 * exploring and go bank your Runes is a real one.
 *
 * The plugin command is "Commune with the Grace"; it is already wired into
 * every grace point on every map.
 * ============================================================================
 */

(() => {
    "use strict";

    const PN = "AshenRites";
    const P = PluginManager.parameters(PN);
    const num = (k, d) => (isNaN(Number(P[k])) ? d : Number(P[k]));

    const CFG = {
        flaskId: num("flaskItemId", 31),
        charges: num("flaskCharges", 4),
        base: num("runeBase", 110),
        step: num("runeStep", 70),
        turn: num("mapTurnFrames", 300),
        hideDead: String(P.hideDeadSkills) !== "false",
        labels: String(P.showLabels) !== "false",
        labelRange: num("labelRange", 4)
    };

    // What each station is called when you walk up to it. Matched against the
    // event name, so it works on every map without touching any event.
    const LABELS = [
        [/^Merchant/i,        "Merchant  —  Buy / Sell", "#ffd08a"],
        [/^Forge/i,           "Forge  —  Combine",       "#ff9a46"],
        [/^GracePoint/i,      "Grace  —  Rest / Commune", "#ffd08a"],
        [/^Watchpost/i,       "Watchpost  —  Rebuild",   "#9fd8ff"],
        [/^(Vault|Strongbox)/i, "Locked",                     "#bdbdbd"],
        [/^Lever/i,           "Lever",                        "#bdbdbd"],
        [/^(AnomPedestal|AnomalyDrone)/i, "Anomaly",           "#7fd4e8"]
    ];

    function labelFor(ev) {
        const name = ev.event() ? ev.event().name : "";
        for (const [rx, text, colour] of LABELS) {
            if (rx.test(name)) return { text, colour };
        }
        return null;
    }

    const RITES = {};
    window.AshenRites = RITES;

    function flask() {
        return $dataItems[CFG.flaskId] || null;
    }

    //-----------------------------------------------------------------------
    // The flask: stack size is charges, and any Recover All fills it
    //-----------------------------------------------------------------------
    RITES.refillFlask = function () {
        const it = flask();
        if (!it) return 0;
        const have = $gameParty.numItems(it);
        const need = CFG.charges - have;
        if (need > 0) $gameParty.gainItem(it, need);
        return Math.max(0, need);
    };

    // A new run starts with a full flask.
    const _GP_setupStartingMembers = Game_Party.prototype.setupStartingMembers;
    Game_Party.prototype.setupStartingMembers = function () {
        _GP_setupStartingMembers.call(this);
        RITES.refillFlask();
    };

    // "Recover All" is the rest at a grace and the reward for clearing an area.
    // Hooking the event command rather than Game_Actor.recoverAll keeps this to
    // the moments the designer meant, not every internal heal.
    const _cmd314 = Game_Interpreter.prototype.command314;
    Game_Interpreter.prototype.command314 = function (params) {
        const r = _cmd314.call(this, params);
        const added = RITES.refillFlask();
        if (added > 0) {
            $gameMessage.add("The Ashen Flask fills with grace-light.");
        }
        return r;
    };

    //-----------------------------------------------------------------------
    // Rites expire on the map, where there are no battle turns to expire them
    //-----------------------------------------------------------------------
    let _turnTick = 0;
    const _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _SceneMap_update.call(this);
        if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return;
        if (++_turnTick < CFG.turn) return;
        _turnTick = 0;
        for (const actor of $gameParty.members()) {
            if (actor.hp <= 0) continue;
            actor.updateStateTurns();
            actor.removeStatesAuto(1);
        }
    };

    //-----------------------------------------------------------------------
    // Skill list: drop anything that can never fire outside battle
    //-----------------------------------------------------------------------
    const _WSL_includes = Window_SkillList.prototype.includes;
    Window_SkillList.prototype.includes = function (item) {
        if (!_WSL_includes.call(this, item)) return false;
        if (!CFG.hideDead || $gameParty.inBattle() || !item) return true;
        // occasion 1 = "Battle Screen", 3 = "Never". Neither can ever be used
        // from the menu, and this game has no battle screen at all.
        if (item.occasion === 1 || item.occasion === 3) return false;
        // TP is only ever gained by acting in a battle, and there are no
        // battles, so a TP-costing skill is just as dead as a battle-only one
        // even though the engine is happy to list it.
        if (item.tpCost > 0) return false;
        return true;
    };

    //-----------------------------------------------------------------------
    // Runes -> Ashen Rite points, at a grace only
    //-----------------------------------------------------------------------
    RITES.communeCount = function () {
        return $gameSystem._ashenCommunes || 0;
    };

    RITES.communeCost = function () {
        return CFG.base + CFG.step * RITES.communeCount();
    };

    RITES.commune = function () {
        const cost = RITES.communeCost();
        const actor = $gameParty.leader();
        if (!actor) return false;
        if ($gameParty.gold() < cost) {
            $gameMessage.add(`The grace asks \\C[6]${cost} Runes\\C[0].`);
            $gameMessage.add(`You carry only \\C[2]${$gameParty.gold()}\\C[0]. Not yet.`);
            SoundManager.playBuzzer();
            return false;
        }
        $gameParty.loseGold(cost);
        $gameSystem._ashenCommunes = RITES.communeCount() + 1;
        if (actor.gainTraitPoints) actor.gainTraitPoints(1);
        AudioManager.playSe({ name: "Up4", volume: 90, pitch: 100, pan: 0 });
        $gameScreen.startFlash([255, 220, 150, 120], 40);
        $gameMessage.add(`The flame takes \\C[6]${cost} Runes\\C[0].`);
        $gameMessage.add("\\C[14]The Ashen Rite deepens.\\C[0] (+1 point)");
        $gameMessage.add(`Next communion: \\C[6]${RITES.communeCost()} Runes\\C[0].`);
        return true;
    };

    PluginManager.registerCommand(PN, "commune", () => {
        RITES.commune();
    });

    //-----------------------------------------------------------------------
    // Station captions - so you can see where you can buy, forge or rest
    //-----------------------------------------------------------------------
    function Sprite_StationLabel() { this.initialize(...arguments); }
    Sprite_StationLabel.prototype = Object.create(Sprite.prototype);
    Sprite_StationLabel.prototype.constructor = Sprite_StationLabel;

    Sprite_StationLabel.prototype.initialize = function (character, info) {
        Sprite.prototype.initialize.call(this);
        this._char = character;
        this._info = info;
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this.opacity = 0;
        this.z = 9;
        this.redraw();
    };

    Sprite_StationLabel.prototype.redraw = function () {
        const text = this._info.text;
        const bmp = new Bitmap(240, 30);
        bmp.fontFace = $gameSystem.mainFontFace();
        bmp.fontSize = 15;
        bmp.outlineWidth = 5;
        bmp.outlineColor = "rgba(0,0,0,0.9)";
        bmp.textColor = this._info.colour;
        bmp.drawText(text, 0, 4, 240, 22, "center");
        this.bitmap = bmp;
    };

    Sprite_StationLabel.prototype.update = function () {
        Sprite.prototype.update.call(this);
        const ch = this._char;
        if (!ch || ch._erased) { this.opacity = 0; return; }
        const d = Math.max(Math.abs($gamePlayer.x - ch.x), Math.abs($gamePlayer.y - ch.y));
        const want = (d <= CFG.labelRange && !$gameMap.isEventRunning() && !$gameMessage.isBusy())
            ? 255 : 0;
        // ease in and out so captions do not pop
        this.opacity += this.opacity < want ? 26 : -34;
        this.opacity = this.opacity.clamp(0, 255);
        if (this.opacity <= 0) return;
        this.x = ch.screenX();
        this.y = ch.screenY() - 52;
    };

    const _SM_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function () {
        _SM_createLowerLayer.call(this);
        if (!CFG.labels) return;
        this._stationLabels = new Sprite();
        for (const ev of $gameMap.events()) {
            const info = labelFor(ev);
            if (info) this._stationLabels.addChild(new Sprite_StationLabel(ev, info));
        }
        this._baseSprite.addChild(this._stationLabels);
    };
})();
