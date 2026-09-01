//=============================================================================
// RPG Maker MZ - Faction Tariffs
// FactionTariffs.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Reputation-driven tariffs: shop buy/sell markups and border tolls set by your standing with whoever controls the region. Integrates FactionBorderWars + RelationshipSystem.
 * @author Claude
 * @url
 * @orderAfter FactionBorderWars
 * @orderAfter RelationshipSystem
 *
 * @help
 * ============================================================================
 * Faction Tariffs
 * ============================================================================
 *
 * A light trade-economy layer. Whoever CONTROLS the region you are trading or
 * traveling in is the faction whose tariff you face, and your REPUTATION with
 * that faction (their affinity in RelationshipSystem) sets how harsh it is:
 *
 *   - Shop BUY prices are marked up in unfriendly territory.
 *   - Shop SELL payouts are cut when dealing with rivals.
 *   - Border TOLLS are charged when you cross into a faction's land.
 *
 * Because control shifts as the FactionBorderWars war moves borders, prices and
 * tolls shift with them. Standing improves as you pay tolls, spend in their
 * shops, and take land in their name (and drops when you take land from them).
 *
 * ----------------------------------------------------------------------------
 * REQUIREMENTS / LOAD ORDER
 * ----------------------------------------------------------------------------
 * Place BELOW both of these in the Plugin Manager:
 *   - FactionBorderWars.js   (provides who controls each region)
 *   - RelationshipSystem.js  (provides your affinity with each faction)
 *
 * Both are optional and the plugin degrades gracefully:
 *   - No FactionBorderWars  -> no region controller, so no tariffs/tolls apply.
 *   - No RelationshipSystem  -> every faction is treated as Neutral standing.
 *
 * ----------------------------------------------------------------------------
 * HOW FACTIONS MAP TO REPUTATION ENTITIES
 * ----------------------------------------------------------------------------
 * By default the RelationshipSystem entity key equals the FactionBorderWars
 * faction id (e.g. faction "iron" -> relationship key "iron"). If your keys
 * differ, add rows to "Faction Key Map". Any faction that has no matching
 * relationship entity is auto-registered at new game / load (as a "faction"
 * type entity) so tariffs work with zero setup.
 *
 * ----------------------------------------------------------------------------
 * TARIFF BRACKETS
 * ----------------------------------------------------------------------------
 * "Tariff Brackets" turn an affinity value into multipliers. A bracket applies
 * when affinity is at or above its Min Affinity (and below the next bracket).
 * Defaults mirror the RelationshipSystem tiers (Nemesis..Ally). Tune freely.
 *
 * ----------------------------------------------------------------------------
 * TOLLS
 * ----------------------------------------------------------------------------
 * A toll is levied once when you step across a border INTO a region controlled
 * by a chargeable faction (i.e. the controlling faction changed since your last
 * step). Neutral land, your own faction, and friendly brackets (toll 0) are
 * free. If you cannot pay in full you pay what you can (never blocking travel);
 * optionally this dents your standing. Paying a toll can nudge standing up.
 *
 * You can also levy a toll manually from an event (e.g. a scripted gate) with
 * the "Charge Toll" command.
 *
 * ----------------------------------------------------------------------------
 * PUBLIC API (script calls)
 * ----------------------------------------------------------------------------
 *   FactionTariffs.ratesFor(factionId)   -> { buy, sell, toll, label, affinity }
 *   FactionTariffs.buyMultiplier(factionId)
 *   FactionTariffs.sellMultiplier(factionId)
 *   FactionTariffs.tollFor(factionId)
 *   FactionTariffs.controllingFaction()  -> faction id of the player's region
 *   FactionTariffs.chargeToll(factionId, amount) // amount optional
 *   FactionTariffs.setEnabled(true/false)
 *
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * ----------------------------------------------------------------------------
 * Free for commercial and non-commercial projects. Credit appreciated.
 *
 * ============================================================================
 *
 * @param ---General---
 * @default
 *
 * @param enabled
 * @parent ---General---
 * @text Tariffs Enabled
 * @type boolean
 * @on Enabled
 * @off Disabled
 * @desc Master switch. Can be toggled at runtime with the Set Enabled command.
 * @default true
 *
 * @param brackets
 * @parent ---General---
 * @text Tariff Brackets
 * @type struct<Bracket>[]
 * @desc Affinity -> multipliers. Applied when affinity >= Min Affinity (and below the next bracket).
 * @default ["{\"label\":\"Nemesis\",\"minAffinity\":\"-100\",\"buyMult\":\"1.60\",\"sellMult\":\"0.45\",\"toll\":\"200\",\"blockTrade\":\"false\"}","{\"label\":\"Rival\",\"minAffinity\":\"-40\",\"buyMult\":\"1.30\",\"sellMult\":\"0.70\",\"toll\":\"120\",\"blockTrade\":\"false\"}","{\"label\":\"Neutral\",\"minAffinity\":\"0\",\"buyMult\":\"1.10\",\"sellMult\":\"0.90\",\"toll\":\"60\",\"blockTrade\":\"false\"}","{\"label\":\"Friend\",\"minAffinity\":\"40\",\"buyMult\":\"1.00\",\"sellMult\":\"1.00\",\"toll\":\"0\",\"blockTrade\":\"false\"}","{\"label\":\"Ally\",\"minAffinity\":\"80\",\"buyMult\":\"0.90\",\"sellMult\":\"1.10\",\"toll\":\"0\",\"blockTrade\":\"false\"}"]
 *
 * @param factionKeyMap
 * @parent ---General---
 * @text Faction Key Map
 * @type struct<KeyMap>[]
 * @desc Optional. Map a FactionBorderWars faction id to a RelationshipSystem entity key when they differ.
 * @default []
 *
 * @param autoRegisterFactions
 * @parent ---General---
 * @text Auto-Register Factions
 * @type boolean
 * @on Yes
 * @off No
 * @desc Create a RelationshipSystem entity for any faction that lacks one.
 * @default true
 *
 * @param factionEntityType
 * @parent ---General---
 * @text Auto-Register Type
 * @desc RelationshipSystem "type" used for auto-registered factions.
 * @default faction
 *
 * @param startAffinity
 * @parent ---General---
 * @text Auto-Register Start Affinity
 * @type number
 * @min -99999
 * @desc Starting affinity for auto-registered faction entities.
 * @default 0
 *
 * @param ---Shops---
 * @default
 *
 * @param shopTariffsEnabled
 * @parent ---Shops---
 * @text Apply To Shops
 * @type boolean
 * @default true
 *
 * @param applyToBuy
 * @parent ---Shops---
 * @text Tariff Buy Prices
 * @type boolean
 * @default true
 *
 * @param applyToSell
 * @parent ---Shops---
 * @text Tariff Sell Prices
 * @type boolean
 * @default true
 *
 * @param spendRepPer
 * @parent ---Shops---
 * @text Gold Per +1 Standing
 * @type number
 * @min 0
 * @desc Buying raises standing by 1 per this much gold spent. 0 = disable spend->rep.
 * @default 100
 *
 * @param nemesisRefusesTrade
 * @parent ---Shops---
 * @text Hostile Refuses Trade
 * @type boolean
 * @on Refuse
 * @off Just steep
 * @desc If a bracket has Block Trade on, the shop closes with a refusal message instead of opening.
 * @default false
 *
 * @param refusalMessage
 * @parent ---Shops---
 * @text Refusal Message
 * @desc Shown when a faction refuses to trade. %1 = faction name.
 * @default The merchants of %1 refuse to deal with you.
 *
 * @param ---Tolls---
 * @default
 *
 * @param tollsEnabled
 * @parent ---Tolls---
 * @text Border Tolls Enabled
 * @type boolean
 * @default true
 *
 * @param exemptOwnFaction
 * @parent ---Tolls---
 * @text Exempt Your Faction
 * @type boolean
 * @on Exempt
 * @off Charge
 * @desc Your joined faction (from FactionBorderWars) charges no toll and gives its best shop rates.
 * @default true
 *
 * @param ownBuyMult
 * @parent ---Tolls---
 * @text Own-Faction Buy Mult
 * @type number
 * @decimals 2
 * @desc Shop buy multiplier inside your own faction's land.
 * @default 0.90
 *
 * @param ownSellMult
 * @parent ---Tolls---
 * @text Own-Faction Sell Mult
 * @type number
 * @decimals 2
 * @desc Shop sell multiplier inside your own faction's land.
 * @default 1.10
 *
 * @param tollRepGain
 * @parent ---Tolls---
 * @text Standing Gain On Pay
 * @type number
 * @min 0
 * @desc Affinity gained when you pay a toll in full. 0 = none.
 * @default 1
 *
 * @param unpaidRepPenalty
 * @parent ---Tolls---
 * @text Standing Loss If Unpaid
 * @type number
 * @min 0
 * @desc Affinity lost if you cannot pay a toll in full. 0 = none.
 * @default 1
 *
 * @param tollNotify
 * @parent ---Tolls---
 * @text Toll Notice Style
 * @type select
 * @option Toast (on-map fade)
 * @value toast
 * @option Message box
 * @value message
 * @option Silent
 * @value silent
 * @default toast
 *
 * @param tollMessage
 * @parent ---Tolls---
 * @text Toll Notice Text
 * @desc %1 = faction name, %2 = amount, %3 = currency unit.
 * @default %1 levies a %2%3 border toll.
 *
 * @param ---War Standing---
 * @default
 *
 * @param warRepEnabled
 * @parent ---War Standing---
 * @text War Affects Standing
 * @type boolean
 * @default true
 *
 * @param repGainOnGainLand
 * @parent ---War Standing---
 * @text Gain For Taking Land
 * @type number
 * @min 0
 * @desc Standing gained with your faction when YOU capture a region in its name.
 * @default 5
 *
 * @param repLossOnTakeLand
 * @parent ---War Standing---
 * @text Loss For Taking Their Land
 * @type number
 * @min 0
 * @desc Standing lost with a faction when YOU capture a region away from them.
 * @default 8
 *
 * @command openTariffLedger
 * @text Open Tariff Ledger
 * @desc Show a screen of every faction's standing, buy/sell rates, toll, and territory.
 *
 * @command chargeToll
 * @text Charge Toll
 * @desc Levy a toll from an event (e.g. a scripted gate).
 * @arg factionId
 * @text Faction ID
 * @type string
 * @desc Faction to pay. Blank = whoever controls the player's current region.
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @desc Toll amount. 0 = use the faction's bracket toll.
 * @default 0
 *
 * @command setEnabled
 * @text Set Tariffs Enabled
 * @desc Turn the whole tariff system on or off at runtime.
 * @arg value
 * @text Enabled
 * @type boolean
 * @default true
 *
 * @command previewRates
 * @text Preview Rates
 * @desc Show a message with a faction's current buy/sell/toll rates.
 * @arg factionId
 * @text Faction ID
 * @type string
 * @desc Blank = whoever controls the player's current region.
 */

/*~struct~Bracket:
 * @param label
 * @text Label
 * @desc Name shown in the ledger (e.g. Nemesis, Rival, Neutral, Friend, Ally).
 * @default Neutral
 *
 * @param minAffinity
 * @text Min Affinity
 * @type number
 * @min -99999
 * @desc Applies when affinity is at or above this (and below the next bracket).
 * @default 0
 *
 * @param buyMult
 * @text Buy Multiplier
 * @type number
 * @decimals 2
 * @desc Multiplier on shop buy prices. >1 = markup.
 * @default 1.10
 *
 * @param sellMult
 * @text Sell Multiplier
 * @type number
 * @decimals 2
 * @desc Multiplier on shop sell payouts. <1 = worse payout.
 * @default 0.90
 *
 * @param toll
 * @text Toll
 * @type number
 * @min 0
 * @desc Gold charged to cross into this faction's land at this standing.
 * @default 60
 *
 * @param blockTrade
 * @text Block Trade
 * @type boolean
 * @desc If on (and "Hostile Refuses Trade" is enabled), shops refuse to open at this standing.
 * @default false
 */

/*~struct~KeyMap:
 * @param factionId
 * @text Faction ID
 * @desc FactionBorderWars faction id.
 *
 * @param relationshipKey
 * @text Relationship Key
 * @desc RelationshipSystem entity key to use for that faction.
 */

var Imported = Imported || {};
Imported.FactionTariffs = true;

(() => {
    "use strict";

    const PLUGIN_NAME = "FactionTariffs";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const jparse = (str, fb) => { try { return JSON.parse(str); } catch (e) { return fb; } };
    const structArray = (str) => jparse(str, []).map((s) => jparse(s, {}));
    const num = (v, d) => (v === undefined || v === "" || isNaN(Number(v)) ? d : Number(v));
    const boolp = (v) => v === true || v === "true";

    const CFG = {
        enabled: boolp(params.enabled),
        brackets: structArray(params.brackets)
            .map((b) => ({
                label: String(b.label || ""),
                minAffinity: num(b.minAffinity, 0),
                buyMult: num(b.buyMult, 1),
                sellMult: num(b.sellMult, 1),
                toll: num(b.toll, 0),
                blockTrade: boolp(b.blockTrade),
            }))
            .sort((a, b) => a.minAffinity - b.minAffinity),
        keyMap: (() => {
            const map = {};
            for (const m of structArray(params.factionKeyMap)) {
                const fid = String(m.factionId || "").trim();
                const key = String(m.relationshipKey || "").trim();
                if (fid && key) map[fid] = key;
            }
            return map;
        })(),
        autoRegister: boolp(params.autoRegisterFactions),
        entityType: String(params.factionEntityType || "faction"),
        startAffinity: num(params.startAffinity, 0),

        shopEnabled: boolp(params.shopTariffsEnabled),
        applyToBuy: boolp(params.applyToBuy),
        applyToSell: boolp(params.applyToSell),
        spendRepPer: num(params.spendRepPer, 100),
        nemesisRefuses: boolp(params.nemesisRefusesTrade),
        refusalMessage: String(params.refusalMessage || "The merchants of %1 refuse to deal with you."),

        tollsEnabled: boolp(params.tollsEnabled),
        exemptOwn: boolp(params.exemptOwnFaction),
        ownBuyMult: num(params.ownBuyMult, 0.9),
        ownSellMult: num(params.ownSellMult, 1.1),
        tollRepGain: num(params.tollRepGain, 1),
        unpaidRepPenalty: num(params.unpaidRepPenalty, 1),
        tollNotify: String(params.tollNotify || "toast"),
        tollMessage: String(params.tollMessage || "%1 levies a %2%3 border toll."),

        warRepEnabled: boolp(params.warRepEnabled),
        repGainOnGainLand: num(params.repGainOnGainLand, 5),
        repLossOnTakeLand: num(params.repLossOnTakeLand, 8),
    };

    // Transient on-map toast queue (UI only; not part of save data).
    const toastQueue = [];

    //=========================================================================
    // Core: FactionTariffs API object
    //=========================================================================
    const T = {};
    window.FactionTariffs = T;

    T.isEnabled = function () {
        if ($gameSystem && typeof $gameSystem.tariffsEnabled === "function") {
            return $gameSystem.tariffsEnabled();
        }
        return CFG.enabled;
    };
    T.setEnabled = function (v) {
        if ($gameSystem) $gameSystem._tariffsEnabled = !!v;
    };

    T.hasWar = function () {
        return typeof $gameFactionWar !== "undefined" && $gameFactionWar;
    };
    T.hasRelationships = function () {
        return typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.relationship === "function";
    };

    T.keyFor = function (factionId) {
        return CFG.keyMap[factionId] || factionId;
    };

    T.factionName = function (factionId) {
        if (this.hasWar() && $gameFactionWar.faction(factionId)) {
            return $gameFactionWar.faction(factionId).name;
        }
        if (this.hasRelationships()) {
            const e = $gameSystem.relationship(this.keyFor(factionId));
            if (e) return e.name;
        }
        return factionId || "Neutral";
    };
    T.factionColor = function (factionId) {
        if (this.hasWar() && $gameFactionWar.faction(factionId)) {
            return $gameFactionWar.faction(factionId).color;
        }
        return "#bdc3c7";
    };

    T.affinityOf = function (factionId) {
        if (this.hasRelationships()) {
            const e = $gameSystem.relationship(this.keyFor(factionId));
            if (e) return e.affinity;
        }
        return 0;
    };

    T.bracketFor = function (affinity) {
        let chosen = CFG.brackets[0] || { label: "", minAffinity: 0, buyMult: 1, sellMult: 1, toll: 0, blockTrade: false };
        for (const b of CFG.brackets) {
            if (affinity >= b.minAffinity) chosen = b;
        }
        return chosen;
    };

    T.playerFaction = function () {
        return this.hasWar() ? $gameFactionWar.playerFactionId() : "";
    };

    // Full rate calculation for a faction (respects own-faction exemption).
    T.ratesFor = function (factionId) {
        if (!factionId) {
            return { faction: "", buy: 1, sell: 1, toll: 0, blocked: false, own: false, label: "—", affinity: 0 };
        }
        const own = CFG.exemptOwn && this.playerFaction() === factionId;
        if (own) {
            return {
                faction: factionId, buy: CFG.ownBuyMult, sell: CFG.ownSellMult,
                toll: 0, blocked: false, own: true, label: "Your Realm", affinity: this.affinityOf(factionId),
            };
        }
        const aff = this.affinityOf(factionId);
        const b = this.bracketFor(aff);
        return {
            faction: factionId, buy: b.buyMult, sell: b.sellMult, toll: b.toll,
            blocked: b.blockTrade, own: false, label: b.label, affinity: aff,
        };
    };

    T.buyMultiplier = function (factionId) { return this.ratesFor(factionId).buy; };
    T.sellMultiplier = function (factionId) { return this.ratesFor(factionId).sell; };
    T.tollFor = function (factionId) { return this.ratesFor(factionId).toll; };

    T.controllingFaction = function () {
        if (!this.hasWar() || !$gamePlayer) return "";
        const rid = $gameMap.regionId($gamePlayer.x, $gamePlayer.y);
        return $gameFactionWar.regionOwner(rid) || "";
    };

    T.adjustRep = function (factionId, delta) {
        if (!delta) return;
        if (this.hasRelationships() && typeof $gameSystem.gainAffinity === "function") {
            $gameSystem.gainAffinity(this.keyFor(factionId), delta);
        }
    };

    // ---- Shop session state ----------------------------------------------
    T.beginShop = function () {
        this._active = this.ratesFor(this.controllingFaction());
    };
    T.activeRates = function () {
        return this._active || { faction: "", buy: 1, sell: 1, toll: 0, blocked: false, own: false };
    };
    T.shopBlocked = function () {
        return this.isEnabled() && CFG.shopEnabled && CFG.nemesisRefuses && this.activeRates().blocked;
    };
    T.currentBuyMult = function () {
        if (!this.isEnabled() || !CFG.shopEnabled || !CFG.applyToBuy) return 1;
        return this.activeRates().buy;
    };
    T.currentSellMult = function () {
        if (!this.isEnabled() || !CFG.shopEnabled || !CFG.applyToSell) return 1;
        return this.activeRates().sell;
    };
    T.onPlayerSpend = function (spent) {
        const a = this.activeRates();
        if (!a.faction || a.own) return;
        if (CFG.spendRepPer > 0 && spent > 0) {
            const gain = Math.floor(spent / CFG.spendRepPer);
            if (gain > 0) this.adjustRep(a.faction, gain);
        }
    };

    // ---- Tolls ------------------------------------------------------------
    T.chargeToll = function (factionId, amount) {
        if (!factionId) factionId = this.controllingFaction();
        if (!factionId) return 0;
        if (CFG.exemptOwn && this.playerFaction() === factionId) return 0;
        const rates = this.ratesFor(factionId);
        const due = amount && amount > 0 ? amount : rates.toll;
        if (due <= 0) return 0;

        const gold = $gameParty.gold();
        const paid = Math.min(gold, due);
        if (paid > 0) $gameParty.loseGold(paid);

        if (paid >= due) {
            if (CFG.tollRepGain > 0) this.adjustRep(factionId, CFG.tollRepGain);
        } else if (CFG.unpaidRepPenalty > 0) {
            this.adjustRep(factionId, -CFG.unpaidRepPenalty);
        }
        this.notifyToll(factionId, paid, paid < due);
        return paid;
    };

    T.notifyToll = function (factionId, paid, short) {
        if (CFG.tollNotify === "silent") return;
        const name = this.factionName(factionId);
        const unit = TextManager.currencyUnit;
        let text = CFG.tollMessage.replace("%1", name).replace("%2", paid).replace("%3", unit);
        if (short) text += " (all you could pay)";
        if (CFG.tollNotify === "message") {
            $gameMessage.add(text);
        } else {
            toastQueue.push({ text: text, color: this.factionColor(factionId) });
        }
    };

    // Called each step; charges once when the controlling faction changes.
    T.checkTollOnStep = function () {
        if (!this.isEnabled() || !CFG.tollsEnabled || !this.hasWar()) return;
        const controller = this.controllingFaction();
        const last = $gameSystem.tariffLastFaction();
        if (controller !== last) {
            if (controller && !(CFG.exemptOwn && this.playerFaction() === controller)) {
                this.chargeToll(controller);
            }
            $gameSystem.setTariffLastFaction(controller);
        }
    };

    // ---- Setup (auto-register + war hook) --------------------------------
    T.setup = function () {
        this.patchWarHook();
        this.autoRegisterFactions();
    };

    T.autoRegisterFactions = function () {
        if (!CFG.autoRegister) return;
        if (!this.hasWar() || !this.hasRelationships()) return;
        if (typeof $gameSystem.registerRelationship !== "function") return;
        for (const f of $gameFactionWar.factions()) {
            const key = this.keyFor(f.id);
            if (!$gameSystem.relationship(key)) {
                $gameSystem.registerRelationship(key, {
                    name: f.name,
                    type: CFG.entityType,
                    affinity: CFG.startAffinity,
                });
            }
        }
    };

    // Patch FactionBorderWars' player-influence capture so taking land shifts
    // standing. Patched once on the shared prototype; guarded against repeats.
    T.patchWarHook = function () {
        if (!CFG.warRepEnabled || !this.hasWar()) return;
        const proto = Object.getPrototypeOf($gameFactionWar);
        if (!proto || proto._tariffWarHook) return;
        if (typeof proto.influence !== "function") return;
        proto._tariffWarHook = true;
        const _influence = proto.influence;
        proto.influence = function (regionId, mode, amount) {
            const before = this.regionOwner(regionId);
            _influence.call(this, regionId, mode, amount);
            if (mode === "capture" && CFG.warRepEnabled) {
                const after = this.regionOwner(regionId);
                if (after !== before) {
                    if (before) T.adjustRep(before, -CFG.repLossOnTakeLand);
                    if (after) T.adjustRep(after, CFG.repGainOnGainLand);
                }
            }
        };
    };

    //=========================================================================
    // Game_System: persistent tariff state
    //=========================================================================
    const _GS_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () {
        _GS_initialize.call(this);
        this._tariffsEnabled = CFG.enabled;
        this._tariffLastFaction = null;
    };
    Game_System.prototype.tariffsEnabled = function () {
        return this._tariffsEnabled !== false;
    };
    Game_System.prototype.tariffLastFaction = function () {
        return this._tariffLastFaction === undefined ? null : this._tariffLastFaction;
    };
    Game_System.prototype.setTariffLastFaction = function (id) {
        this._tariffLastFaction = id || "";
    };

    //=========================================================================
    // Setup hooks (new game + load)
    //=========================================================================
    const _DM_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DM_createGameObjects.call(this);
        T.setup();
    };
    const _DM_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DM_extractSaveContents.call(this, contents);
        T.setup();
    };

    //=========================================================================
    // Step hook (tolls). Wraps whatever increaseSteps chain exists (incl. FBW).
    //=========================================================================
    const _GP_increaseSteps = Game_Player.prototype.increaseSteps;
    Game_Player.prototype.increaseSteps = function () {
        _GP_increaseSteps.call(this);
        T.checkTollOnStep();
    };

    // Sync the "last faction" silently on transfer so only true border
    // crossings while walking are charged (no toll the instant you load in).
    const _GP_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function () {
        _GP_performTransfer.call(this);
        if ($gameSystem && T.hasWar()) {
            $gameSystem.setTariffLastFaction(T.controllingFaction());
        }
    };

    //=========================================================================
    // Shop hooks (buy/sell multipliers, refusal, spend->rep)
    //=========================================================================
    const _Scene_Shop_start = Scene_Shop.prototype.start;
    Scene_Shop.prototype.start = function () {
        T.beginShop();
        _Scene_Shop_start.call(this);
        if (T.shopBlocked()) {
            const name = T.factionName(T.activeRates().faction);
            $gameMessage.add(CFG.refusalMessage.replace("%1", name));
            this.popScene();
        }
    };

    const _Window_ShopBuy_price = Window_ShopBuy.prototype.price;
    Window_ShopBuy.prototype.price = function (item) {
        const base = _Window_ShopBuy_price.call(this, item);
        const mult = T.currentBuyMult();
        return mult === 1 ? base : Math.max(0, Math.round(base * mult));
    };

    const _Scene_Shop_sellingPrice = Scene_Shop.prototype.sellingPrice;
    Scene_Shop.prototype.sellingPrice = function () {
        const base = _Scene_Shop_sellingPrice.call(this);
        const mult = T.currentSellMult();
        return mult === 1 ? base : Math.floor(base * mult);
    };

    const _Scene_Shop_doBuy = Scene_Shop.prototype.doBuy;
    Scene_Shop.prototype.doBuy = function (number) {
        const spent = number * this.buyingPrice();
        _Scene_Shop_doBuy.call(this, number);
        T.onPlayerSpend(spent);
    };

    //=========================================================================
    // On-map toast for tolls
    //=========================================================================
    function Window_TariffToast() {
        this.initialize.apply(this, arguments);
    }
    Window_TariffToast.prototype = Object.create(Window_Base.prototype);
    Window_TariffToast.prototype.constructor = Window_TariffToast;
    Window_TariffToast.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0;
        this.contentsOpacity = 0;
        this._life = 0;
    };
    Window_TariffToast.prototype.show2 = function (text, accent) {
        this.contents.clear();
        this.contents.fontSize = 20;
        if (accent) this.contents.fillRect(0, this.innerHeight / 2 - 12, 8, 24, accent);
        this.changeTextColor("#ffffff");
        this.drawText(text, 16, 0, this.innerWidth - 16, "left");
        this.resetFontSettings();
        this._life = 160;
        this.opacity = 220;
    };
    Window_TariffToast.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (this._life > 0) {
            this._life--;
            this.contentsOpacity = Math.min(255, this.contentsOpacity + 24);
            if (this._life < 45) {
                this.contentsOpacity = Math.max(0, this.contentsOpacity - 12);
                this.opacity = Math.max(0, this.opacity - 10);
            }
        } else {
            this.contentsOpacity = Math.max(0, this.contentsOpacity - 12);
            this.opacity = Math.max(0, this.opacity - 10);
        }
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _Scene_Map_createAllWindows.call(this);
        const w = Math.floor(Graphics.boxWidth * 0.5);
        const h = 60;
        const rect = new Rectangle((Graphics.boxWidth - w) / 2, Graphics.boxHeight - h - 80, w, h);
        this._tariffToast = new Window_TariffToast(rect);
        this.addChild(this._tariffToast);
    };
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (this._tariffToast && this._tariffToast._life <= 0 && toastQueue.length) {
            const t = toastQueue.shift();
            this._tariffToast.show2(t.text, t.color);
        }
    };

    //=========================================================================
    // Tariff Ledger scene
    //=========================================================================
    function Scene_TariffLedger() {
        this.initialize.apply(this, arguments);
    }
    Scene_TariffLedger.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_TariffLedger.prototype.constructor = Scene_TariffLedger;
    Scene_TariffLedger.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        const rect = new Rectangle(0, this.mainAreaTop(), Graphics.boxWidth, this.mainAreaHeight());
        this._window = new Window_TariffLedger(rect);
        this._window.setHandler("cancel", this.popScene.bind(this));
        this._window.setHandler("ok", this.popScene.bind(this));
        this.addWindow(this._window);
        this._window.activate();
        this._window.select(0);
    };

    function Window_TariffLedger() {
        this.initialize.apply(this, arguments);
    }
    Window_TariffLedger.prototype = Object.create(Window_Selectable.prototype);
    Window_TariffLedger.prototype.constructor = Window_TariffLedger;
    Window_TariffLedger.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_TariffLedger.prototype.factionIds = function () {
        if (T.hasWar()) return $gameFactionWar.factions().map((f) => f.id);
        if (T.hasRelationships()) {
            return $gameSystem.relationshipList(CFG.entityType).map((e) => e.key);
        }
        return [];
    };
    Window_TariffLedger.prototype.maxItems = function () { return this.factionIds().length; };
    Window_TariffLedger.prototype.itemHeight = function () { return this.lineHeight() * 3 + 8; };
    Window_TariffLedger.prototype.drawItem = function (index) {
        const fid = this.factionIds()[index];
        if (!fid) return;
        const rates = T.ratesFor(fid);
        const rect = this.itemRectWithPadding(index);
        const lh = this.lineHeight();
        const color = T.factionColor(fid);

        // Faction color swatch + name.
        this.contents.fillRect(rect.x, rect.y + 6, 20, 20, color);
        this.contents.fontSize = 22;
        this.changeTextColor("#ffffff");
        this.drawText(T.factionName(fid), rect.x + 30, rect.y, rect.width - 30, "left");
        this.resetFontSettings();

        // Territory (if the war is present).
        if (T.hasWar()) {
            const owned = $gameFactionWar.regionsOwnedBy(fid).length;
            this.changeTextColor(this.systemColor());
            this.drawText("Territory", rect.x + rect.width - 220, rect.y, 120, "left");
            this.resetFontSettings();
            this.drawText(owned + " regions", rect.x + rect.width - 100, rect.y, 100, "right");
        }

        // Standing line.
        const y2 = rect.y + lh;
        this.changeTextColor(this.systemColor());
        this.drawText("Standing", rect.x + 30, y2, 120, "left");
        this.resetFontSettings();
        const standTxt = rates.label + "  (" + rates.affinity + ")" + (rates.own ? "  — your realm" : "");
        this.drawText(standTxt, rect.x + 150, y2, rect.width - 150, "left");

        // Rates line.
        const y3 = rect.y + lh * 2;
        this.changeTextColor(this.systemColor());
        this.drawText("Tariff", rect.x + 30, y3, 120, "left");
        this.resetFontSettings();
        const buyTxt = "Buy x" + rates.buy.toFixed(2);
        const sellTxt = "Sell x" + rates.sell.toFixed(2);
        const tollTxt = "Toll " + (rates.toll > 0 ? rates.toll + TextManager.currencyUnit : "free");
        this.drawText(buyTxt + "    " + sellTxt + "    " + tollTxt, rect.x + 150, y3, rect.width - 150, "left");

        // Divider.
        this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 1, "rgba(255,255,255,0.15)");
    };
    Window_TariffLedger.prototype.systemColor = function () {
        return ColorManager.systemColor();
    };

    //=========================================================================
    // Plugin commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "openTariffLedger", () => {
        SceneManager.push(Scene_TariffLedger);
    });
    PluginManager.registerCommand(PLUGIN_NAME, "chargeToll", (args) => {
        T.chargeToll(String(args.factionId || "").trim(), num(args.amount, 0));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "setEnabled", (args) => {
        T.setEnabled(boolp(args.value));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "previewRates", (args) => {
        let fid = String(args.factionId || "").trim();
        if (!fid) fid = T.controllingFaction();
        if (!fid) { $gameMessage.add("No controlling faction here."); return; }
        const r = T.ratesFor(fid);
        const unit = TextManager.currencyUnit;
        $gameMessage.add(T.factionName(fid) + " — " + r.label);
        $gameMessage.add("Buy x" + r.buy.toFixed(2) + ", Sell x" + r.sell.toFixed(2) +
            ", Toll " + (r.toll > 0 ? r.toll + unit : "free"));
    });
})();
