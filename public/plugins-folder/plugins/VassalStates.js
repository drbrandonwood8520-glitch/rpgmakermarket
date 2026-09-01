//=============================================================================
// RPG Maker MZ - Vassal States
// VassalStates.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Conquer regions & settlements into a personal domain. Vassals pay tribute and manpower, need loyalty & upkeep, upgrade through tiers, and revolt if neglected. Integrates FactionBorderWars.
 * @author Claude
 * @url
 * @orderAfter FactionBorderWars
 *
 * @help
 * ============================================================================
 * Vassal States
 * ============================================================================
 *
 * Build a personal kingdom by subjugating land. Every vassal is a "holding" —
 * either a whole REGION (a FactionBorderWars territory) or a SETTLEMENT you
 * define (a town/city). Holdings automatically provide benefits each cycle:
 *
 *   - TRIBUTE gold, straight to your purse.
 *   - MANPOWER into your domain pool (garrison it to keep holdings loyal, or
 *     let it fuel your Might).
 *   - Optional WAR SUPPORT: channel Might/resources to your allied faction.
 *   - Optional RECRUITS: a settlement can unlock an actor at a loyalty milestone.
 *
 * But holdings must be MANAGED. Each has LOYALTY (0-100) and costs UPKEEP.
 * Freshly conquered land starts restless. Neglect it — miss upkeep, leave it
 * ungarrisoned — and loyalty erodes until it REVOLTS and breaks away. Invest
 * gold to raise loyalty and UPGRADE its tier (Occupied -> Vassal -> Province)
 * for more output, a higher loyalty ceiling, and slower decay.
 *
 * ----------------------------------------------------------------------------
 * REQUIREMENTS / LOAD ORDER
 * ----------------------------------------------------------------------------
 * Place BELOW FactionBorderWars.js if you use it (recommended). It is optional:
 *   - With FactionBorderWars: region holdings, revolts flip control back, the
 *     economy beats on the war tick, and Might can support your faction.
 *   - Without it: settlement holdings work fully; the economy beats every N
 *     steps instead; region holdings become simple abstract holdings.
 *
 * ----------------------------------------------------------------------------
 * SUBJUGATING (three ways, mix freely)
 * ----------------------------------------------------------------------------
 *   1. Automatically — turn on "Auto-Subjugate On Capture". When you capture a
 *      region in the war, it becomes a vassal of your domain.
 *   2. A Subjugate action — call the "Subjugate Region" / "Subjugate Settlement"
 *      command from an event (a menu option, an NPC, a fort you stand on).
 *   3. A conquest event — after a victory cutscene/battle, call the same command.
 *
 * ----------------------------------------------------------------------------
 * THE CYCLE (tribute / upkeep / loyalty)
 * ----------------------------------------------------------------------------
 * Each cycle, for every holding:
 *   - Tribute gold and manpower are collected (scaled by tier; only if loyal).
 *   - Upkeep is charged from your gold. If you cannot pay, loyalty drops.
 *   - Loyalty drifts by tier decay, offset by any garrison. At 0 it enters
 *     unrest; after the grace period it revolts and is lost.
 *   - Settlements at/above their recruit-loyalty grant their recruit once.
 *
 * ----------------------------------------------------------------------------
 * PUBLIC API (script calls)
 * ----------------------------------------------------------------------------
 *   VassalStates.subjugateRegion(regionId)
 *   VassalStates.subjugateSettlement(settlementId)
 *   VassalStates.isVassal(type, id)          // type: "region" | "settlement"
 *   VassalStates.getVassal(type, id)
 *   VassalStates.domainSummary()             // { income, upkeep, net, manpower, might, count }
 *   VassalStates.runCycle()                  // force one economic cycle
 *
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * ----------------------------------------------------------------------------
 * Free for commercial and non-commercial projects. Credit appreciated.
 *
 * ============================================================================
 *
 * @param ---Economy Cadence---
 * @default
 *
 * @param cadenceMode
 * @parent ---Economy Cadence---
 * @text Cadence
 * @type select
 * @option Sync with war tick
 * @value war
 * @option Every N steps
 * @value steps
 * @desc When the economic cycle runs. "war" falls back to steps if FactionBorderWars is absent.
 * @default war
 *
 * @param stepsPerCycle
 * @parent ---Economy Cadence---
 * @text Steps Per Cycle
 * @type number
 * @min 1
 * @desc Steps between cycles when using step cadence (or as the war fallback).
 * @default 40
 *
 * @param ---Holdings---
 * @default
 *
 * @param settlements
 * @parent ---Holdings---
 * @text Settlements
 * @type struct<Settlement>[]
 * @desc Towns/cities you can subjugate by id. Regions are handled automatically.
 * @default []
 *
 * @param regionDefault
 * @parent ---Holdings---
 * @text Region Holding Defaults
 * @type struct<RegionDefault>
 * @desc Default tribute/upkeep for a subjugated region (settlements set their own).
 * @default {"gold":"50","manpower":"5","upkeep":"20"}
 *
 * @param tiers
 * @parent ---Holdings---
 * @text Tiers
 * @type struct<Tier>[]
 * @desc Holding tiers, lowest first. Newly conquered holdings start at the first tier.
 * @default ["{\"name\":\"Occupied\",\"outputMult\":\"1.0\",\"upkeepMult\":\"1.0\",\"loyaltyCap\":\"60\",\"decay\":\"4\",\"upgradeCost\":\"1000\",\"minLoyaltyToUpgrade\":\"45\"}","{\"name\":\"Vassal\",\"outputMult\":\"1.6\",\"upkeepMult\":\"1.3\",\"loyaltyCap\":\"85\",\"decay\":\"2\",\"upgradeCost\":\"3000\",\"minLoyaltyToUpgrade\":\"70\"}","{\"name\":\"Province\",\"outputMult\":\"2.4\",\"upkeepMult\":\"1.6\",\"loyaltyCap\":\"100\",\"decay\":\"0\",\"upgradeCost\":\"0\",\"minLoyaltyToUpgrade\":\"0\"}"]
 *
 * @param ---Loyalty---
 * @default
 *
 * @param startLoyalty
 * @parent ---Loyalty---
 * @text Starting Loyalty
 * @type number
 * @min 0
 * @max 100
 * @desc Loyalty a holding has right after conquest.
 * @default 30
 *
 * @param garrisonLoyaltyPer
 * @parent ---Loyalty---
 * @text Loyalty Per Garrison Unit
 * @type number
 * @decimals 2
 * @desc Loyalty stabilization each cycle per manpower unit garrisoned there.
 * @default 0.5
 *
 * @param investLoyaltyPerGold
 * @parent ---Loyalty---
 * @text Loyalty Per 100 Gold Invested
 * @type number
 * @decimals 2
 * @desc Loyalty gained per 100 gold when you Invest in a holding.
 * @default 5.0
 *
 * @param unpaidUpkeepPenalty
 * @parent ---Loyalty---
 * @text Unpaid Upkeep Penalty
 * @type number
 * @min 0
 * @desc Loyalty lost by a holding whose upkeep you couldn't pay this cycle.
 * @default 8
 *
 * @param graceCycles
 * @parent ---Loyalty---
 * @text Revolt Grace Cycles
 * @type number
 * @min 0
 * @desc Cycles a holding sits at 0 loyalty (in unrest) before it revolts.
 * @default 2
 *
 * @param revoltMode
 * @parent ---Loyalty---
 * @text On Revolt (region)
 * @type select
 * @option Return to its old owner (else neutral)
 * @value old
 * @option Always become neutral
 * @value neutral
 * @desc What happens to a revolting REGION holding's war control.
 * @default old
 *
 * @param ---War Support---
 * @default
 *
 * @param sendMightToFaction
 * @parent ---War Support---
 * @text Support Allied Faction
 * @type boolean
 * @on Support
 * @off Off
 * @desc Each cycle, channel Might/resources to the faction you've joined in the war.
 * @default true
 *
 * @param mightPerManpower
 * @parent ---War Support---
 * @text Might Per Manpower
 * @type number
 * @decimals 2
 * @desc Domain Might = total manpower (pool + garrisons) x this.
 * @default 0.5
 *
 * @param factionStrengthPerCycle
 * @parent ---War Support---
 * @text Faction Strength / Cycle
 * @type number
 * @desc Strength added to your allied faction each cycle (scaled by Might fraction).
 * @default 2
 *
 * @param factionResourcePerCycle
 * @parent ---War Support---
 * @text Faction Resources / Cycle
 * @type number
 * @desc Resources added to your allied faction each cycle per loyal holding.
 * @default 3
 *
 * @param ---Acquisition---
 * @default
 *
 * @param autoSubjugate
 * @parent ---Acquisition---
 * @text Auto-Subjugate On Capture
 * @type boolean
 * @on Yes
 * @off No
 * @desc When you capture a region in the war, add it as a vassal automatically.
 * @default true
 *
 * @param ---Notifications---
 * @default
 *
 * @param showToasts
 * @parent ---Notifications---
 * @text Show Toasts
 * @type boolean
 * @default true
 *
 * @param cycleSummaryToast
 * @parent ---Notifications---
 * @text Cycle Income Toast
 * @type boolean
 * @off Off
 * @on On
 * @desc Show a brief income/upkeep toast each cycle. Off avoids spam.
 * @default false
 *
 * @param ---Menu---
 * @default
 *
 * @param addToMenu
 * @parent ---Menu---
 * @text Add to Main Menu
 * @type boolean
 * @default true
 *
 * @param menuCommandName
 * @parent ---Menu---
 * @text Menu Command Name
 * @default Domain
 *
 * @param menuSwitchId
 * @parent ---Menu---
 * @text Menu Enable Switch
 * @type switch
 * @desc Menu command enabled only when this switch is ON. 0 = always.
 * @default 0
 *
 * @param accentColor
 * @parent ---Menu---
 * @text Accent Color
 * @default #d4a017
 *
 * @command openVassals
 * @text Open Domain
 * @desc Open the domain management screen.
 *
 * @command subjugateRegion
 * @text Subjugate Region
 * @desc Add a region as a vassal holding.
 * @arg regionId
 * @text Region ID
 * @type number
 * @min 1
 * @default 1
 *
 * @command subjugateSettlement
 * @text Subjugate Settlement
 * @desc Add a defined settlement as a vassal holding.
 * @arg settlementId
 * @text Settlement ID
 * @type string
 *
 * @command releaseVassal
 * @text Release Vassal
 * @desc Remove a holding from your domain.
 * @arg type
 * @text Type
 * @type select
 * @option region
 * @option settlement
 * @default region
 * @arg id
 * @text ID
 * @type string
 *
 * @command addLoyalty
 * @text Add Loyalty
 * @desc Adjust a holding's loyalty (use negatives to reduce).
 * @arg type
 * @text Type
 * @type select
 * @option region
 * @option settlement
 * @default region
 * @arg id
 * @text ID
 * @type string
 * @arg amount
 * @text Amount
 * @type number
 * @min -100
 * @default 10
 *
 * @command addManpower
 * @text Add Manpower
 * @desc Add (or remove) manpower from the domain pool.
 * @arg amount
 * @text Amount
 * @type number
 * @min -9999
 * @default 10
 *
 * @command runCycle
 * @text Run Cycle Now
 * @desc Force one economic cycle immediately.
 */

/*~struct~Settlement:
 * @param id
 * @text ID
 * @desc Unique key used by the Subjugate Settlement command.
 *
 * @param name
 * @text Name
 * @desc Display name.
 *
 * @param regionId
 * @text Region ID
 * @type number
 * @min 0
 * @desc Optional region this settlement sits in (0 = none).
 * @default 0
 *
 * @param gold
 * @text Tribute Gold / Cycle
 * @type number
 * @default 80
 *
 * @param manpower
 * @text Manpower / Cycle
 * @type number
 * @default 8
 *
 * @param upkeep
 * @text Upkeep / Cycle
 * @type number
 * @default 30
 *
 * @param recruitActorId
 * @text Recruit Actor ID
 * @type actor
 * @desc Actor added to the party when loyalty reaches the milestone. 0 = none.
 * @default 0
 *
 * @param recruitLoyalty
 * @text Recruit At Loyalty
 * @type number
 * @min 0
 * @max 100
 * @desc Loyalty needed to unlock the recruit.
 * @default 60
 */

/*~struct~RegionDefault:
 * @param gold
 * @text Tribute Gold / Cycle
 * @type number
 * @default 50
 * @param manpower
 * @text Manpower / Cycle
 * @type number
 * @default 5
 * @param upkeep
 * @text Upkeep / Cycle
 * @type number
 * @default 20
 */

/*~struct~Tier:
 * @param name
 * @text Name
 * @default Occupied
 * @param outputMult
 * @text Output Multiplier
 * @type number
 * @decimals 2
 * @default 1.0
 * @param upkeepMult
 * @text Upkeep Multiplier
 * @type number
 * @decimals 2
 * @default 1.0
 * @param loyaltyCap
 * @text Loyalty Cap
 * @type number
 * @min 0
 * @max 100
 * @default 60
 * @param decay
 * @text Loyalty Decay / Cycle
 * @type number
 * @min 0
 * @default 4
 * @param upgradeCost
 * @text Upgrade Cost
 * @type number
 * @min 0
 * @desc Gold to upgrade to the next tier. 0 on the top tier.
 * @default 1000
 * @param minLoyaltyToUpgrade
 * @text Min Loyalty To Upgrade
 * @type number
 * @min 0
 * @max 100
 * @default 45
 */

var $gameVassalDomain = null;

(() => {
    "use strict";

    const PLUGIN_NAME = "VassalStates";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const jparse = (str, fb) => { try { return JSON.parse(str); } catch (e) { return fb; } };
    const structArray = (str) => jparse(str, []).map((s) => jparse(s, {}));
    const num = (v, d) => (v === undefined || v === "" || isNaN(Number(v)) ? d : Number(v));
    const boolp = (v) => v === true || v === "true";

    const regDef = jparse(params.regionDefault, {});
    const CFG = {
        cadenceMode: String(params.cadenceMode || "war"),
        stepsPerCycle: num(params.stepsPerCycle, 40),
        settlements: structArray(params.settlements).map((s) => ({
            id: String(s.id || "").trim(),
            name: String(s.name || s.id || "Settlement"),
            regionId: num(s.regionId, 0),
            gold: num(s.gold, 80),
            manpower: num(s.manpower, 8),
            upkeep: num(s.upkeep, 30),
            recruitActorId: num(s.recruitActorId, 0),
            recruitLoyalty: num(s.recruitLoyalty, 60),
        })),
        regionGold: num(regDef.gold, 50),
        regionManpower: num(regDef.manpower, 5),
        regionUpkeep: num(regDef.upkeep, 20),
        tiers: structArray(params.tiers).map((t) => ({
            name: String(t.name || "Tier"),
            outputMult: num(t.outputMult, 1),
            upkeepMult: num(t.upkeepMult, 1),
            loyaltyCap: num(t.loyaltyCap, 60),
            decay: num(t.decay, 4),
            upgradeCost: num(t.upgradeCost, 1000),
            minLoyaltyToUpgrade: num(t.minLoyaltyToUpgrade, 45),
        })),
        startLoyalty: num(params.startLoyalty, 30),
        garrisonLoyaltyPer: num(params.garrisonLoyaltyPer, 0.5),
        investLoyaltyPer100: num(params.investLoyaltyPerGold, 5),
        unpaidUpkeepPenalty: num(params.unpaidUpkeepPenalty, 8),
        graceCycles: num(params.graceCycles, 2),
        revoltMode: String(params.revoltMode || "old"),
        sendMight: boolp(params.sendMightToFaction),
        mightPerManpower: num(params.mightPerManpower, 0.5),
        factionStrengthPerCycle: num(params.factionStrengthPerCycle, 2),
        factionResourcePerCycle: num(params.factionResourcePerCycle, 3),
        autoSubjugate: boolp(params.autoSubjugate),
        showToasts: boolp(params.showToasts),
        cycleSummaryToast: boolp(params.cycleSummaryToast),
        addToMenu: boolp(params.addToMenu),
        menuCommandName: String(params.menuCommandName || "Domain"),
        menuSwitchId: num(params.menuSwitchId, 0),
        accentColor: String(params.accentColor || "#d4a017"),
    };
    if (CFG.tiers.length === 0) {
        CFG.tiers = [{ name: "Occupied", outputMult: 1, upkeepMult: 1, loyaltyCap: 60, decay: 4, upgradeCost: 1000, minLoyaltyToUpgrade: 45 }];
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const toastQueue = [];
    const pushToast = (text, color) => { if (CFG.showToasts) toastQueue.push({ text, color: color || CFG.accentColor }); };

    const hasWar = () => typeof $gameFactionWar !== "undefined" && $gameFactionWar;

    //=========================================================================
    // Game_VassalDomain : the personal-kingdom manager (saved with the game)
    //=========================================================================
    function Game_VassalDomain() {
        this.initialize.apply(this, arguments);
    }

    Game_VassalDomain.prototype.initialize = function () {
        this._vassals = [];      // { type, id, name, tier, loyalty, garrison, gold, manpower, upkeep,
                                 //   recruitActorId, recruitLoyalty, recruited, originalOwner, unrest }
        this._manpowerPool = 0;  // ungarrisoned manpower
        this._stepCounter = 0;
        this._cycleCount = 0;
    };

    // ---- Lookups ----------------------------------------------------------
    Game_VassalDomain.prototype.vassals = function () { return this._vassals; };
    Game_VassalDomain.prototype.vassal = function (type, id) {
        return this._vassals.find((v) => v.type === type && String(v.id) === String(id)) || null;
    };
    Game_VassalDomain.prototype.isVassal = function (type, id) { return !!this.vassal(type, id); };
    Game_VassalDomain.prototype.count = function () { return this._vassals.length; };
    Game_VassalDomain.prototype.manpowerPool = function () { return this._manpowerPool; };
    Game_VassalDomain.prototype.cycleCount = function () { return this._cycleCount; };

    Game_VassalDomain.prototype.tierData = function (tierIndex) {
        return CFG.tiers[clamp(tierIndex, 0, CFG.tiers.length - 1)];
    };
    Game_VassalDomain.prototype.totalManpower = function () {
        let g = 0;
        for (const v of this._vassals) g += v.garrison || 0;
        return this._manpowerPool + g;
    };
    Game_VassalDomain.prototype.might = function () {
        return Math.floor(this.totalManpower() * CFG.mightPerManpower);
    };

    // ---- Subjugation ------------------------------------------------------
    Game_VassalDomain.prototype.subjugateRegion = function (regionId, originalOwner) {
        regionId = Number(regionId);
        if (this.isVassal("region", regionId)) return null;
        let owner = originalOwner;
        if (owner === undefined && hasWar()) owner = $gameFactionWar.regionOwner(regionId);
        const name = this._regionName(regionId);
        const v = this._makeVassal("region", regionId, name, {
            gold: CFG.regionGold, manpower: CFG.regionManpower, upkeep: CFG.regionUpkeep,
            recruitActorId: 0, recruitLoyalty: 0,
        });
        v.originalOwner = owner || "";
        this._vassals.push(v);
        pushToast(name + " subjugated.", CFG.accentColor);
        return v;
    };

    Game_VassalDomain.prototype.subjugateSettlement = function (settlementId) {
        settlementId = String(settlementId).trim();
        if (this.isVassal("settlement", settlementId)) return null;
        const def = CFG.settlements.find((s) => s.id === settlementId);
        if (!def) return null;
        const v = this._makeVassal("settlement", settlementId, def.name, def);
        v.regionId = def.regionId;
        this._vassals.push(v);
        pushToast(def.name + " subjugated.", CFG.accentColor);
        return v;
    };

    Game_VassalDomain.prototype._makeVassal = function (type, id, name, def) {
        return {
            type: type, id: id, name: name, tier: 0,
            loyalty: CFG.startLoyalty, garrison: 0,
            gold: def.gold, manpower: def.manpower, upkeep: def.upkeep,
            recruitActorId: def.recruitActorId || 0,
            recruitLoyalty: def.recruitLoyalty || 0,
            recruited: false, originalOwner: "", unrest: 0,
        };
    };

    Game_VassalDomain.prototype._regionName = function (regionId) {
        if (hasWar() && $gameFactionWar.region) {
            const r = $gameFactionWar.region(regionId);
            if (r && r.name) return r.name;
        }
        return "Region " + regionId;
    };

    Game_VassalDomain.prototype.release = function (type, id) {
        const idx = this._vassals.findIndex((v) => v.type === type && String(v.id) === String(id));
        if (idx < 0) return;
        const v = this._vassals[idx];
        this._manpowerPool += v.garrison || 0; // garrison comes home
        this._vassals.splice(idx, 1);
        pushToast(v.name + " released from your domain.", "#95a5a6");
    };

    // ---- Player management actions ---------------------------------------
    Game_VassalDomain.prototype.invest = function (v, gold) {
        gold = Math.min(gold, $gameParty.gold());
        if (gold <= 0) return 0;
        $gameParty.loseGold(gold);
        const cap = this.tierData(v.tier).loyaltyCap;
        v.loyalty = clamp(v.loyalty + (gold / 100) * CFG.investLoyaltyPer100, 0, cap);
        if (v.loyalty > 0) v.unrest = 0;
        return gold;
    };
    Game_VassalDomain.prototype.canUpgrade = function (v) {
        if (v.tier >= CFG.tiers.length - 1) return false;
        const t = this.tierData(v.tier);
        return v.loyalty >= t.minLoyaltyToUpgrade && $gameParty.gold() >= t.upgradeCost;
    };
    Game_VassalDomain.prototype.upgrade = function (v) {
        if (!this.canUpgrade(v)) return false;
        const t = this.tierData(v.tier);
        $gameParty.loseGold(t.upgradeCost);
        v.tier++;
        pushToast(v.name + " is now a " + this.tierData(v.tier).name + ".", CFG.accentColor);
        return true;
    };
    Game_VassalDomain.prototype.garrison = function (v, n) {
        n = Math.floor(n);
        if (n > 0) { // send troops
            n = Math.min(n, this._manpowerPool);
            this._manpowerPool -= n; v.garrison += n;
        } else if (n < 0) { // recall troops
            n = Math.min(-n, v.garrison);
            v.garrison -= n; this._manpowerPool += n;
        }
    };
    Game_VassalDomain.prototype.addManpower = function (n) {
        this._manpowerPool = Math.max(0, this._manpowerPool + Math.floor(n));
    };
    Game_VassalDomain.prototype.addLoyalty = function (type, id, amount) {
        const v = this.vassal(type, id);
        if (!v) return;
        const cap = this.tierData(v.tier).loyaltyCap;
        v.loyalty = clamp(v.loyalty + amount, 0, cap);
        if (v.loyalty > 0) v.unrest = 0;
    };

    // ---- Per-holding computed values -------------------------------------
    Game_VassalDomain.prototype.goldOut = function (v) {
        return Math.round(v.gold * this.tierData(v.tier).outputMult);
    };
    Game_VassalDomain.prototype.manpowerOut = function (v) {
        return Math.round(v.manpower * this.tierData(v.tier).outputMult);
    };
    Game_VassalDomain.prototype.upkeepOf = function (v) {
        return Math.round(v.upkeep * this.tierData(v.tier).upkeepMult);
    };

    Game_VassalDomain.prototype.summary = function () {
        let income = 0, upkeep = 0;
        for (const v of this._vassals) {
            if (v.loyalty > 0) income += this.goldOut(v);
            upkeep += this.upkeepOf(v);
        }
        return {
            income: income, upkeep: upkeep, net: income - upkeep,
            manpower: this._manpowerPool, might: this.might(), count: this._vassals.length,
        };
    };

    // ---- The economic cycle ----------------------------------------------
    Game_VassalDomain.prototype.onStep = function () {
        // Only step-driven when not synced to the war (or war is absent).
        const stepDriven = CFG.cadenceMode === "steps" || !hasWar();
        if (!stepDriven) return;
        if ($gameMap && $gameMap.isEventRunning && $gameMap.isEventRunning()) return;
        this._stepCounter++;
        if (this._stepCounter >= CFG.stepsPerCycle) {
            this._stepCounter = 0;
            this.runCycle();
        }
    };

    Game_VassalDomain.prototype.runCycle = function () {
        this._cycleCount++;
        let goldGained = 0, upkeepPaid = 0;
        const revolts = [];

        for (const v of this._vassals) {
            const loyal = v.loyalty > 0;

            // 1) Tribute (only if loyal).
            if (loyal) {
                const g = this.goldOut(v);
                const m = this.manpowerOut(v);
                if (g > 0) { $gameParty.gainGold(g); goldGained += g; }
                if (m > 0) this._manpowerPool += m;
            }

            // 2) Upkeep.
            const up = this.upkeepOf(v);
            let unpaid = false;
            if (up > 0) {
                if ($gameParty.gold() >= up) { $gameParty.loseGold(up); upkeepPaid += up; }
                else { unpaid = true; }
            }

            // 3) Loyalty drift.
            const t = this.tierData(v.tier);
            let delta = (v.garrison || 0) * CFG.garrisonLoyaltyPer - t.decay;
            if (unpaid) delta -= CFG.unpaidUpkeepPenalty;
            v.loyalty = clamp(v.loyalty + delta, 0, t.loyaltyCap);

            // 4) Unrest / revolt tracking.
            if (v.loyalty <= 0) {
                v.unrest = (v.unrest || 0) + 1;
                if (v.unrest === 1) pushToast(v.name + " is in unrest!", "#e67e22");
                if (v.unrest > CFG.graceCycles) revolts.push(v);
            } else {
                v.unrest = 0;
            }

            // 5) Recruit unlock.
            if (!v.recruited && v.recruitActorId > 0 && v.loyalty >= v.recruitLoyalty) {
                v.recruited = true;
                if ($gameParty && $gameParty.addActor) $gameParty.addActor(v.recruitActorId);
                pushToast(v.name + " provides a new recruit!", CFG.accentColor);
            }
        }

        // Resolve revolts after iterating.
        for (const v of revolts) this._revolt(v);

        // 6) Support allied faction with Might/resources.
        this._supportFaction();

        if (CFG.cycleSummaryToast && (goldGained > 0 || upkeepPaid > 0)) {
            pushToast("Tribute +" + goldGained + "  Upkeep -" + upkeepPaid, CFG.accentColor);
        }
    };

    Game_VassalDomain.prototype._revolt = function (v) {
        this._manpowerPool += 0; // garrison is lost in the uprising
        const idx = this._vassals.indexOf(v);
        if (idx >= 0) this._vassals.splice(idx, 1);
        if (v.type === "region" && hasWar() && $gameFactionWar.setRegionOwner) {
            const newOwner = CFG.revoltMode === "old" ? (v.originalOwner || "") : "";
            $gameFactionWar.setRegionOwner(Number(v.id), newOwner);
        }
        pushToast(v.name + " has revolted and broken away!", "#c0392b");
    };

    Game_VassalDomain.prototype._supportFaction = function () {
        if (!CFG.sendMight || !hasWar()) return;
        const fid = $gameFactionWar.playerFactionId ? $gameFactionWar.playerFactionId() : "";
        if (!fid) return;
        const f = $gameFactionWar.faction(fid);
        if (!f) return;
        const loyalCount = this._vassals.filter((v) => v.loyalty > 0).length;
        if (loyalCount === 0) return;
        // Strength contribution scales with Might; resources scale with holdings.
        const mightFactor = Math.min(2, this.might() / 50);
        if (typeof f.strength === "number") f.strength += CFG.factionStrengthPerCycle * mightFactor;
        if (typeof f.resources === "number") f.resources += CFG.factionResourcePerCycle * loyalCount;
    };

    //=========================================================================
    // Setup: save/load, cadence hooks, war integration
    //=========================================================================
    const _DM_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DM_createGameObjects.call(this);
        $gameVassalDomain = new Game_VassalDomain();
        setupVassalHooks();
    };
    const _DM_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const c = _DM_makeSaveContents.call(this);
        c.vassalDomain = $gameVassalDomain;
        return c;
    };
    const _DM_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DM_extractSaveContents.call(this, contents);
        $gameVassalDomain = new Game_VassalDomain();
        if (contents.vassalDomain) Object.assign($gameVassalDomain, contents.vassalDomain);
        setupVassalHooks();
    };

    // Patch FactionBorderWars once so the economy syncs to the war tick and
    // player captures can auto-subjugate.
    function setupVassalHooks() {
        if (!hasWar()) return;
        const proto = Object.getPrototypeOf($gameFactionWar);
        if (!proto || proto._vassalPatched) return;
        proto._vassalPatched = true;

        // Cadence: run a domain cycle each war tick (when synced).
        if (typeof proto._runOneTick === "function") {
            const _tick = proto._runOneTick;
            proto._runOneTick = function () {
                _tick.call(this);
                if ($gameVassalDomain && CFG.cadenceMode === "war") {
                    $gameVassalDomain.runCycle();
                }
            };
        }

        // Auto-subjugate on player capture.
        if (typeof proto.influence === "function") {
            const _influence = proto.influence;
            proto.influence = function (regionId, mode, amount) {
                const before = this.regionOwner(regionId);
                _influence.call(this, regionId, mode, amount);
                if (mode === "capture" && CFG.autoSubjugate && $gameVassalDomain) {
                    const after = this.regionOwner(regionId);
                    if (after !== before && after === this.playerFactionId()) {
                        $gameVassalDomain.subjugateRegion(regionId, before);
                    }
                }
            };
        }
    }

    // Step cadence (also the war-fallback when FactionBorderWars is absent).
    const _GP_increaseSteps = Game_Player.prototype.increaseSteps;
    Game_Player.prototype.increaseSteps = function () {
        _GP_increaseSteps.call(this);
        if ($gameVassalDomain) $gameVassalDomain.onStep();
    };

    //=========================================================================
    // On-map toasts
    //=========================================================================
    function Window_VassalToast() { this.initialize.apply(this, arguments); }
    Window_VassalToast.prototype = Object.create(Window_Base.prototype);
    Window_VassalToast.prototype.constructor = Window_VassalToast;
    Window_VassalToast.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0; this.contentsOpacity = 0; this._life = 0;
    };
    Window_VassalToast.prototype.show2 = function (text, accent) {
        this.contents.clear();
        this.contents.fontSize = 20;
        if (accent) this.contents.fillRect(0, this.innerHeight / 2 - 12, 8, 24, accent);
        this.changeTextColor("#ffffff");
        this.drawText(text, 16, 0, this.innerWidth - 16, "left");
        this.resetFontSettings();
        this._life = 170; this.opacity = 220;
    };
    Window_VassalToast.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (this._life > 0) {
            this._life--;
            this.contentsOpacity = Math.min(255, this.contentsOpacity + 24);
            if (this._life < 45) { this.contentsOpacity -= 12; this.opacity = Math.max(0, this.opacity - 10); }
        } else {
            this.contentsOpacity = Math.max(0, this.contentsOpacity - 12);
            this.opacity = Math.max(0, this.opacity - 10);
        }
    };

    const _SceneMap_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _SceneMap_createAllWindows.call(this);
        const w = Math.floor(Graphics.boxWidth * 0.5), h = 60;
        const rect = new Rectangle((Graphics.boxWidth - w) / 2, 84, w, h);
        this._vassalToast = new Window_VassalToast(rect);
        this.addChild(this._vassalToast);
    };
    const _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _SceneMap_update.call(this);
        if (this._vassalToast && this._vassalToast._life <= 0 && toastQueue.length) {
            const t = toastQueue.shift();
            this._vassalToast.show2(t.text, t.color);
        }
    };

    //=========================================================================
    // Domain scene
    //=========================================================================
    function Scene_Vassals() { this.initialize.apply(this, arguments); }
    Scene_Vassals.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Vassals.prototype.constructor = Scene_Vassals;

    Scene_Vassals.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        const top = this.mainAreaTop();
        const sumH = this.calcWindowHeight(2, false);
        this._summaryWindow = new Window_DomainSummary(new Rectangle(0, top, Graphics.boxWidth, sumH));
        this.addWindow(this._summaryWindow);

        const listRect = new Rectangle(0, top + sumH, Graphics.boxWidth, this.mainAreaHeight() - sumH);
        this._listWindow = new Window_VassalList(listRect);
        this._listWindow.setHandler("ok", this.onListOk.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);

        const cw = 260;
        const cmdRect = new Rectangle((Graphics.boxWidth - cw) / 2, top + sumH + 40, cw, this.calcWindowHeight(4, true));
        this._actionWindow = new Window_VassalActions(cmdRect);
        this._actionWindow.setHandler("invest", this.onInvest.bind(this));
        this._actionWindow.setHandler("upgrade", this.onUpgrade.bind(this));
        this._actionWindow.setHandler("garrison", this.onGarrison.bind(this));
        this._actionWindow.setHandler("release", this.onRelease.bind(this));
        this._actionWindow.setHandler("cancel", this.onActionCancel.bind(this));
        this._actionWindow.hide();
        this._actionWindow.deactivate();
        this.addWindow(this._actionWindow);

        this._amountWindow = new Window_VassalAmount(cmdRect);
        this._amountWindow.setHandler("ok", this.onAmountOk.bind(this));
        this._amountWindow.setHandler("cancel", this.onAmountCancel.bind(this));
        this._amountWindow.hide();
        this._amountWindow.deactivate();
        this.addWindow(this._amountWindow);

        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_Vassals.prototype.currentVassal = function () {
        return this._listWindow.item();
    };
    Scene_Vassals.prototype.onListOk = function () {
        if (!this.currentVassal()) { this._listWindow.activate(); return; }
        this._actionWindow.setVassal(this.currentVassal());
        this._actionWindow.show();
        this._actionWindow.activate();
        this._actionWindow.select(0);
    };
    Scene_Vassals.prototype.refreshAll = function () {
        this._summaryWindow.refresh();
        this._listWindow.refresh();
    };
    Scene_Vassals.prototype.onInvest = function () {
        this._pendingAction = "invest";
        this._amountWindow.setup("gold", $gameParty.gold());
        this._actionWindow.hide(); this._actionWindow.deactivate();
        this._amountWindow.show(); this._amountWindow.activate(); this._amountWindow.select(0);
    };
    Scene_Vassals.prototype.onGarrison = function () {
        this._pendingAction = "garrison";
        this._amountWindow.setup("manpower", $gameVassalDomain.manpowerPool());
        this._actionWindow.hide(); this._actionWindow.deactivate();
        this._amountWindow.show(); this._amountWindow.activate(); this._amountWindow.select(0);
    };
    Scene_Vassals.prototype.onAmountOk = function () {
        const amt = this._amountWindow.amount();
        const v = this.currentVassal();
        if (v && amt !== 0) {
            if (this._pendingAction === "invest") $gameVassalDomain.invest(v, amt);
            else if (this._pendingAction === "garrison") $gameVassalDomain.garrison(v, amt);
        }
        this._amountWindow.hide(); this._amountWindow.deactivate();
        this.refreshAll();
        this._actionWindow.setVassal(v);
        this._actionWindow.show(); this._actionWindow.activate();
    };
    Scene_Vassals.prototype.onAmountCancel = function () {
        this._amountWindow.hide(); this._amountWindow.deactivate();
        this._actionWindow.show(); this._actionWindow.activate();
    };
    Scene_Vassals.prototype.onUpgrade = function () {
        const v = this.currentVassal();
        if (v) $gameVassalDomain.upgrade(v);
        this.refreshAll();
        this._actionWindow.setVassal(v);
        this._actionWindow.activate();
    };
    Scene_Vassals.prototype.onRelease = function () {
        const v = this.currentVassal();
        if (v) $gameVassalDomain.release(v.type, v.id);
        this._actionWindow.hide(); this._actionWindow.deactivate();
        this.refreshAll();
        this._listWindow.activate();
        this._listWindow.select(Math.max(0, this._listWindow.index() - 1));
    };
    Scene_Vassals.prototype.onActionCancel = function () {
        this._actionWindow.hide(); this._actionWindow.deactivate();
        this._listWindow.activate();
    };

    //=========================================================================
    // Window_DomainSummary
    //=========================================================================
    function Window_DomainSummary() { this.initialize.apply(this, arguments); }
    Window_DomainSummary.prototype = Object.create(Window_Base.prototype);
    Window_DomainSummary.prototype.constructor = Window_DomainSummary;
    Window_DomainSummary.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_DomainSummary.prototype.refresh = function () {
        this.contents.clear();
        if (!$gameVassalDomain) return;
        const s = $gameVassalDomain.summary();
        const unit = TextManager.currencyUnit;
        const colW = this.innerWidth / 4;
        const draw = (label, value, col, row, valColor) => {
            const x = col * colW, y = row * this.lineHeight();
            this.changeTextColor(ColorManager.systemColor());
            this.contents.fontSize = 16;
            this.drawText(label, x, y, colW - 8, "left");
            this.resetFontSettings();
            if (valColor) this.changeTextColor(valColor);
            this.drawText(value, x, y + 18, colW - 8, "left");
            this.resetFontSettings();
        };
        const netColor = s.net >= 0 ? "#2ecc71" : "#e74c3c";
        draw("Tribute / cycle", "+" + s.income + unit, 0, 0, "#2ecc71");
        draw("Upkeep / cycle", "-" + s.upkeep + unit, 1, 0, "#e74c3c");
        draw("Net", (s.net >= 0 ? "+" : "") + s.net + unit, 2, 0, netColor);
        draw("Holdings", String(s.count), 3, 0, null);
        draw("Manpower pool", String(s.manpower), 0, 1, CFG.accentColor);
        draw("Might", String(s.might), 1, 1, CFG.accentColor);
        draw("Gold", $gameParty.gold() + unit, 2, 1, null);
        draw("Cycle", String($gameVassalDomain.cycleCount()), 3, 1, null);
    };

    //=========================================================================
    // Window_VassalList
    //=========================================================================
    function Window_VassalList() { this.initialize.apply(this, arguments); }
    Window_VassalList.prototype = Object.create(Window_Selectable.prototype);
    Window_VassalList.prototype.constructor = Window_VassalList;
    Window_VassalList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_VassalList.prototype.list = function () {
        return $gameVassalDomain ? $gameVassalDomain.vassals() : [];
    };
    Window_VassalList.prototype.maxItems = function () { return this.list().length; };
    Window_VassalList.prototype.itemHeight = function () { return this.lineHeight() * 2 + 6; };
    Window_VassalList.prototype.item = function () { return this.list()[this.index()] || null; };
    Window_VassalList.prototype.drawItem = function (index) {
        const v = this.list()[index];
        if (!v) return;
        const d = $gameVassalDomain;
        const rect = this.itemRectWithPadding(index);
        const lh = this.lineHeight();

        // Name + tier + type.
        this.contents.fontSize = 20;
        this.changeTextColor("#ffffff");
        this.drawText(v.name, rect.x, rect.y, rect.width - 220, "left");
        this.resetFontSettings();
        this.changeTextColor(ColorManager.systemColor());
        const tierName = d.tierData(v.tier).name + (v.type === "settlement" ? " · Settlement" : " · Region");
        this.drawText(tierName, rect.x, rect.y, rect.width, "right");
        this.resetFontSettings();

        // Loyalty gauge.
        const gy = rect.y + lh + 2;
        const gw = 160, gh = 14;
        const cap = d.tierData(v.tier).loyaltyCap;
        const ratio = clamp(v.loyalty / 100, 0, 1);
        const capRatio = clamp(cap / 100, 0, 1);
        this.contents.fillRect(rect.x, gy, gw, gh, "#20242c");
        this.contents.fillRect(rect.x, gy, Math.floor(gw * capRatio), gh, "#3a3f4a"); // cap marker
        const lColor = v.loyalty <= 0 ? "#c0392b" : (v.loyalty < 30 ? "#e67e22" : "#2ecc71");
        this.contents.fillRect(rect.x, gy, Math.floor(gw * ratio), gh, lColor);
        this.contents.fontSize = 14;
        this.changeTextColor("#ffffff");
        this.drawText("Loyalty " + Math.round(v.loyalty) + (v.unrest ? "  (unrest!)" : ""), rect.x + gw + 10, gy - 4, 200, "left");
        this.resetFontSettings();

        // Outputs.
        const unit = TextManager.currencyUnit;
        const info = "+" + d.goldOut(v) + unit + "  +" + d.manpowerOut(v) + " men  -" + d.upkeepOf(v) + unit +
            "  Gar " + (v.garrison || 0);
        this.contents.fontSize = 15;
        this.changeTextColor("#cfd3da");
        this.drawText(info, rect.x + gw + 10, gy + 12, rect.width - gw - 10, "left");
        this.resetFontSettings();
    };

    //=========================================================================
    // Window_VassalActions
    //=========================================================================
    function Window_VassalActions() { this.initialize.apply(this, arguments); }
    Window_VassalActions.prototype = Object.create(Window_Command.prototype);
    Window_VassalActions.prototype.constructor = Window_VassalActions;
    Window_VassalActions.prototype.initialize = function (rect) {
        this._vassal = null;
        Window_Command.prototype.initialize.call(this, rect);
    };
    Window_VassalActions.prototype.setVassal = function (v) { this._vassal = v; this.refresh(); this.select(0); };
    Window_VassalActions.prototype.makeCommandList = function () {
        const v = this._vassal;
        const d = $gameVassalDomain;
        this.addCommand("Invest gold", "invest", !!v);
        const canUp = v && d && d.canUpgrade(v);
        const upLabel = v && v.tier >= CFG.tiers.length - 1 ? "Upgrade (max)" :
            (v ? "Upgrade (" + d.tierData(v.tier).upgradeCost + TextManager.currencyUnit + ")" : "Upgrade");
        this.addCommand(upLabel, "upgrade", !!canUp);
        this.addCommand("Garrison troops", "garrison", !!v);
        this.addCommand("Release", "release", !!v);
    };

    //=========================================================================
    // Window_VassalAmount : pick an amount (gold or manpower) in steps
    //=========================================================================
    function Window_VassalAmount() { this.initialize.apply(this, arguments); }
    Window_VassalAmount.prototype = Object.create(Window_Selectable.prototype);
    Window_VassalAmount.prototype.constructor = Window_VassalAmount;
    Window_VassalAmount.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._amount = 0; this._max = 0; this._kind = "gold";
    };
    Window_VassalAmount.prototype.setup = function (kind, max) {
        this._kind = kind; this._max = Math.max(0, Math.floor(max)); this._amount = 0;
        this.refresh();
    };
    Window_VassalAmount.prototype.amount = function () { return this._amount; };
    Window_VassalAmount.prototype.maxItems = function () { return 1; };
    Window_VassalAmount.prototype.step = function () {
        return this._kind === "gold" ? 100 : 1;
    };
    Window_VassalAmount.prototype.cursorRight = function () { this._amount = Math.min(this._max, this._amount + this.step()); this.refresh(); };
    Window_VassalAmount.prototype.cursorLeft = function () { this._amount = Math.max(0, this._amount - this.step()); this.refresh(); };
    Window_VassalAmount.prototype.cursorPagedown = function () { this._amount = this._max; this.refresh(); };
    Window_VassalAmount.prototype.cursorPageup = function () { this._amount = 0; this.refresh(); };
    Window_VassalAmount.prototype.refresh = function () {
        this.contents.clear();
        const unit = this._kind === "gold" ? TextManager.currencyUnit : " men";
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(this._kind === "gold" ? "Invest how much?" : "Garrison how many?", 0, 0, this.innerWidth, "center");
        this.resetFontSettings();
        this.drawText("< " + this._amount + unit + " >", 0, this.lineHeight(), this.innerWidth, "center");
        this.contents.fontSize = 14;
        this.changeTextColor("#9aa0a8");
        this.drawText("←/→ adjust · Enter confirm · (max " + this._max + ")", 0, this.lineHeight() * 2, this.innerWidth, "center");
        this.resetFontSettings();
    };

    //=========================================================================
    // Main-menu integration
    //=========================================================================
    if (CFG.addToMenu) {
        const _WMC_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function () {
            _WMC_addOriginalCommands.call(this);
            const enabled = CFG.menuSwitchId === 0 || $gameSwitches.value(CFG.menuSwitchId);
            this.addCommand(CFG.menuCommandName, "vassalDomain", enabled);
        };
        const _SM_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function () {
            _SM_createCommandWindow.call(this);
            this._commandWindow.setHandler("vassalDomain", () => SceneManager.push(Scene_Vassals));
        };
    }

    //=========================================================================
    // Public API + plugin commands
    //=========================================================================
    window.VassalStates = {
        subjugateRegion: (regionId) => ($gameVassalDomain ? $gameVassalDomain.subjugateRegion(regionId) : null),
        subjugateSettlement: (id) => ($gameVassalDomain ? $gameVassalDomain.subjugateSettlement(id) : null),
        isVassal: (type, id) => ($gameVassalDomain ? $gameVassalDomain.isVassal(type, id) : false),
        getVassal: (type, id) => ($gameVassalDomain ? $gameVassalDomain.vassal(type, id) : null),
        domainSummary: () => ($gameVassalDomain ? $gameVassalDomain.summary() : null),
        runCycle: () => { if ($gameVassalDomain) $gameVassalDomain.runCycle(); },
    };

    PluginManager.registerCommand(PLUGIN_NAME, "openVassals", () => SceneManager.push(Scene_Vassals));
    PluginManager.registerCommand(PLUGIN_NAME, "subjugateRegion", (args) => {
        if ($gameVassalDomain) $gameVassalDomain.subjugateRegion(num(args.regionId, 0));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "subjugateSettlement", (args) => {
        if ($gameVassalDomain) $gameVassalDomain.subjugateSettlement(String(args.settlementId || "").trim());
    });
    PluginManager.registerCommand(PLUGIN_NAME, "releaseVassal", (args) => {
        if ($gameVassalDomain) $gameVassalDomain.release(String(args.type || "region"), String(args.id || "").trim());
    });
    PluginManager.registerCommand(PLUGIN_NAME, "addLoyalty", (args) => {
        if ($gameVassalDomain) $gameVassalDomain.addLoyalty(String(args.type || "region"), String(args.id || "").trim(), num(args.amount, 0));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "addManpower", (args) => {
        if ($gameVassalDomain) $gameVassalDomain.addManpower(num(args.amount, 0));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "runCycle", () => {
        if ($gameVassalDomain) $gameVassalDomain.runCycle();
    });
})();
