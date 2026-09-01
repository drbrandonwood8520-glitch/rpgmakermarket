//=============================================================================
// Fiefdom.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Fiefdom Growth + Defense + Economy: upgrade structures, generate income via Prosperity, pay army upkeep, and auto-resolve raids.
 * @author Claude
 *
 * @param structures
 * @text Structures
 * @desc The buildings that make up the fief. Leave empty to use a built-in default set.
 * @type struct<Structure>[]
 * @default []
 *
 * @param resourceVariableId
 * @text Resource Variable
 * @desc Game variable used as the fief currency. Set to 0 to let the plugin manage its own internal pool instead.
 * @type variable
 * @default 21
 *
 * @param defenseVariableId
 * @text Defense Output Variable
 * @desc If > 0, the current Defense Rating is written here whenever it changes.
 * @type variable
 * @default 20
 *
 * @param incomeVariableId
 * @text Net Income Output Variable
 * @desc If > 0, net income per cycle (production - upkeep) is written here whenever it changes.
 * @type variable
 * @default 0
 *
 * @param prosperityVariableId
 * @text Prosperity Output Variable
 * @desc If > 0, current Prosperity is written here whenever it changes.
 * @type variable
 * @default 0
 *
 * @param dayVariableId
 * @text Day Counter Output Variable
 * @desc If > 0, the number of cycles elapsed is written here whenever it changes.
 * @type variable
 * @default 0
 *
 * @param prosperityMax
 * @text Prosperity Max
 * @desc Highest Prosperity can reach. Each point adds 1% to income production.
 * @type number
 * @min 0
 * @default 100
 *
 * @param prosperityGrowth
 * @text Prosperity Growth / Cycle
 * @desc Prosperity gained each cycle the fief runs a surplus (net income > 0).
 * @type number
 * @min 0
 * @default 2
 *
 * @param prosperityDecline
 * @text Prosperity Decline / Cycle
 * @desc Prosperity lost each cycle the fief runs a deficit (net income < 0).
 * @type number
 * @min 0
 * @default 3
 *
 * @param prosperityBreachPenalty
 * @text Prosperity Breach Penalty
 * @desc Prosperity lost when a raid breaches the fief.
 * @type number
 * @min 0
 * @default 10
 *
 * @param investCost
 * @text Invest-in-Prosperity Cost
 * @desc Resource cost for the "Invest In Prosperity" command.
 * @type number
 * @min 0
 * @default 20
 *
 * @param investGain
 * @text Invest-in-Prosperity Gain
 * @desc Prosperity gained by the "Invest In Prosperity" command.
 * @type number
 * @min 0
 * @default 5
 *
 * @param resourcePenaltyPercent
 * @text Breach Resource Penalty (%)
 * @desc On a failed defense, resources are reduced by this percentage.
 * @type number
 * @min 0
 * @max 100
 * @default 25
 *
 * @param damageStructureOnBreach
 * @text Damage Structure On Breach
 * @desc On a failed defense, knock the highest-level structure down by one level.
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @command buildUpgrade
 * @text Build / Upgrade Structure
 * @desc Attempt to build or upgrade a structure by one level, spending resources.
 * @arg structureId
 * @text Structure ID
 * @type string
 * @arg resultSwitchId
 * @text Result Switch (optional)
 * @desc ON if the upgrade succeeded, OFF if it failed.
 * @type switch
 * @default 0
 *
 * @command addResources
 * @text Add Resources
 * @desc Add (or subtract, with a negative number) resources. Use this to feed in gold/loot earned elsewhere in the game.
 * @arg amount
 * @text Amount
 * @type number
 * @min -999999
 * @default 0
 *
 * @command advanceCycle
 * @text Advance Cycle (Collect Income)
 * @desc Runs one economic cycle: adds net income to resources, adjusts Prosperity, and ticks the day counter. Fire this from a day-pass, rest, or quest-complete event.
 * @arg netIncomeVariableId
 * @text Net Income Gained (optional)
 * @desc If > 0, the net income gained this cycle is written here.
 * @type variable
 * @default 0
 *
 * @command investProsperity
 * @text Invest In Prosperity
 * @desc Spend resources to directly raise Prosperity (wire this to a steward NPC, festival, etc.).
 * @arg resultSwitchId
 * @text Result Switch (optional)
 * @desc ON if the investment succeeded, OFF if it failed (not enough resources or already maxed).
 * @type switch
 * @default 0
 *
 * @command getLevel
 * @text Get Structure Level
 * @desc Write a structure's current level into a game variable.
 * @arg structureId
 * @text Structure ID
 * @type string
 * @arg variableId
 * @text Target Variable
 * @type variable
 * @default 0
 *
 * @command getCost
 * @text Get Next Upgrade Cost
 * @desc Write the cost of the next upgrade for a structure into a game variable (0 if maxed).
 * @arg structureId
 * @text Structure ID
 * @type string
 * @arg variableId
 * @text Target Variable
 * @type variable
 * @default 0
 *
 * @command recalc
 * @text Recalculate Outputs
 * @desc Force-refresh the Defense / Income / Prosperity / Day output variables.
 *
 * @command resolveRaid
 * @text Resolve Raid
 * @desc Compare Defense Rating against a raid strength. Sets a switch for the result and applies breach consequences.
 * @arg strength
 * @text Raid Strength (fixed)
 * @type number
 * @default 0
 * @arg strengthVariableId
 * @text Raid Strength (from variable)
 * @desc If > 0, this variable's value is used as the strength instead of the fixed number.
 * @type variable
 * @default 0
 * @arg resultSwitchId
 * @text Result Switch
 * @desc ON if the fief defended, OFF if breached.
 * @type switch
 * @default 0
 * @arg remainingDefenseVariableId
 * @text Remaining Defense (optional)
 * @type variable
 * @default 0
 *
 * @command openManagement
 * @text Open Management Menu
 * @desc Opens the fiefdom management scene.
 *
 * @help
 * ============================================================================
 * Fiefdom Growth + Defense + Economy
 * ============================================================================
 *
 * The fief now has TWO linked loops:
 *
 *   DEFENSE  - structures with a defenseWeight raise your Defense Rating,
 *              which repels raids (see Resolve Raid).
 *   ECONOMY  - structures with incomePerLevel produce resources each cycle.
 *              A Prosperity stat multiplies that production. Structures with
 *              an upkeepPerLevel (e.g. a standing army) drain resources each
 *              cycle. Net income = (production x prosperity) - upkeep.
 *
 * Because upkeep scales with your military and income scales with your
 * economy, growing one forces you to grow the other. That tension is the game.
 *
 * ----------------------------------------------------------------------------
 * THE ECONOMIC CYCLE
 * ----------------------------------------------------------------------------
 * Resources do NOT tick up on their own. You advance the economy by calling
 * the "Advance Cycle" command from an event you control:
 *   - when an in-game day passes
 *   - when the player rests at the keep
 *   - when a quest is completed
 * Each cycle: net income is added to resources, Prosperity rises on a surplus
 * or falls on a deficit, and the day counter increments. Keeping collection
 * event-driven means the player can't grind it and your pacing stays intact.
 *
 * Prosperity:
 *   - production multiplier = 1 + (prosperity / 100). At 50 prosperity your
 *     economic buildings produce +50%.
 *   - rises by "Prosperity Growth" each surplus cycle, up to Prosperity Max.
 *   - falls by "Prosperity Decline" each deficit cycle, and by the breach
 *     penalty whenever a raid gets through.
 *   - can also be bought directly with "Invest In Prosperity" (wire it to a
 *     steward NPC so the player has an active growth lever).
 *
 * Feeding in outside resources: gold and loot the player earns elsewhere can
 * be poured into the fief with the "Add Resources" command - so the wider
 * game economy and the fief economy connect.
 *
 * ----------------------------------------------------------------------------
 * SETUP
 * ----------------------------------------------------------------------------
 * 1. Put this file in  js/plugins/  named exactly  Fiefdom.js
 * 2. Add it in Plugin Manager and turn it ON.
 * 3. Define your Structures, or leave empty for a default set that already
 *    includes economic buildings (Market, Farm, Housing) and upkeep on the
 *    military ones so you can see the whole loop immediately.
 * 4. Point the Resource / Defense variables at real variables in your project.
 *
 * Each structure has:
 *   id, name, maxLevel, baseCost, costMultiplier, defenseWeight,
 *   incomePerLevel  - resources produced per level each cycle (economy)
 *   upkeepPerLevel  - resources consumed per level each cycle (military)
 *   iconIndex
 *
 * ----------------------------------------------------------------------------
 * SCRIPT CALLS
 * ----------------------------------------------------------------------------
 *   Fiefdom.level("market")        Fiefdom.upgrade("market")
 *   Fiefdom.resources()            Fiefdom.addResources(50)
 *   Fiefdom.defense()              Fiefdom.resolveRaid(40)
 *   Fiefdom.prosperity()           Fiefdom.investProsperity()
 *   Fiefdom.production()           Fiefdom.upkeep()
 *   Fiefdom.netIncome()            Fiefdom.advanceCycle()  -> net gained
 *   Fiefdom.open()
 *
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * ----------------------------------------------------------------------------
 * Free for commercial and non-commercial RPG Maker MZ projects. No credit
 * required.
 * ============================================================================
 */
/*~struct~Structure:
 * @param id
 * @text ID
 * @desc Short unique key used in plugin commands (no spaces). e.g. market
 * @type string
 *
 * @param name
 * @text Display Name
 * @type string
 *
 * @param maxLevel
 * @text Max Level
 * @type number
 * @min 1
 * @default 3
 *
 * @param baseCost
 * @text Base Cost
 * @desc Cost of the first build (level 0 -> 1).
 * @type number
 * @min 0
 * @default 10
 *
 * @param costMultiplier
 * @text Cost Multiplier
 * @desc Each further level costs baseCost * multiplier^currentLevel.
 * @type number
 * @decimals 2
 * @min 1.00
 * @default 1.50
 *
 * @param defenseWeight
 * @text Defense Weight
 * @desc Defense Rating added per level.
 * @type number
 * @min 0
 * @default 0
 *
 * @param incomePerLevel
 * @text Income Per Level
 * @desc Resources produced per level each cycle (before the Prosperity multiplier).
 * @type number
 * @min 0
 * @default 0
 *
 * @param upkeepPerLevel
 * @text Upkeep Per Level
 * @desc Resources consumed per level each cycle. Use for standing armies / garrisons.
 * @type number
 * @min 0
 * @default 0
 *
 * @param iconIndex
 * @text Icon Index
 * @type number
 * @min 0
 * @default 0
 */

(() => {
    "use strict";

    const pluginName = document.currentScript.src.match(/([^/]+)\.js$/)[1];
    const params = PluginManager.parameters(pluginName);

    //-------------------------------------------------------------------------
    // Parameter parsing
    //-------------------------------------------------------------------------
    const DEFAULT_STRUCTURES = [
        { id: "wall",       name: "Walls",      maxLevel: 3, baseCost: 15, costMultiplier: 1.6, defenseWeight: 5, incomePerLevel: 0, upkeepPerLevel: 0, iconIndex: 0 },
        { id: "watchtower", name: "Watchtower", maxLevel: 3, baseCost: 10, costMultiplier: 1.5, defenseWeight: 3, incomePerLevel: 0, upkeepPerLevel: 1, iconIndex: 0 },
        { id: "barracks",   name: "Barracks",   maxLevel: 3, baseCost: 12, costMultiplier: 1.5, defenseWeight: 4, incomePerLevel: 0, upkeepPerLevel: 2, iconIndex: 0 },
        { id: "market",     name: "Market",     maxLevel: 3, baseCost: 14, costMultiplier: 1.5, defenseWeight: 0, incomePerLevel: 8, upkeepPerLevel: 0, iconIndex: 0 },
        { id: "farm",       name: "Farmstead",  maxLevel: 3, baseCost: 8,  costMultiplier: 1.5, defenseWeight: 0, incomePerLevel: 5, upkeepPerLevel: 0, iconIndex: 0 },
        { id: "housing",    name: "Housing",    maxLevel: 3, baseCost: 10, costMultiplier: 1.5, defenseWeight: 1, incomePerLevel: 3, upkeepPerLevel: 0, iconIndex: 0 }
    ];

    function parseStructures(raw) {
        let list = [];
        try { list = JSON.parse(raw || "[]"); } catch (e) { list = []; }
        const out = list.map(entry => {
            let o = {};
            try { o = JSON.parse(entry); } catch (e) { o = {}; }
            return {
                id: String(o.id || "").trim(),
                name: String(o.name || o.id || "Structure"),
                maxLevel: Math.max(1, Number(o.maxLevel || 1)),
                baseCost: Math.max(0, Number(o.baseCost || 0)),
                costMultiplier: Math.max(1, Number(o.costMultiplier || 1)),
                defenseWeight: Number(o.defenseWeight || 0),
                incomePerLevel: Number(o.incomePerLevel || 0),
                upkeepPerLevel: Number(o.upkeepPerLevel || 0),
                iconIndex: Number(o.iconIndex || 0)
            };
        }).filter(o => o.id.length > 0);
        return out.length > 0 ? out : DEFAULT_STRUCTURES.slice();
    }

    const STRUCTURES = parseStructures(params.structures);
    const RESOURCE_VAR = Number(params.resourceVariableId || 0);
    const DEFENSE_VAR = Number(params.defenseVariableId || 0);
    const INCOME_VAR = Number(params.incomeVariableId || 0);
    const PROSPERITY_VAR = Number(params.prosperityVariableId || 0);
    const DAY_VAR = Number(params.dayVariableId || 0);
    const PROSPERITY_MAX = Number(params.prosperityMax || 100);
    const PROSPERITY_GROWTH = Number(params.prosperityGrowth || 0);
    const PROSPERITY_DECLINE = Number(params.prosperityDecline || 0);
    const PROSPERITY_BREACH = Number(params.prosperityBreachPenalty || 0);
    const INVEST_COST = Number(params.investCost || 0);
    const INVEST_GAIN = Number(params.investGain || 0);
    const PENALTY_PCT = Number(params.resourcePenaltyPercent || 0);
    const DAMAGE_ON_BREACH = String(params.damageStructureOnBreach) === "true";

    function structureById(id) {
        return STRUCTURES.find(s => s.id === id) || null;
    }

    function upgradeCost(st, currentLevel) {
        if (currentLevel >= st.maxLevel) return 0;
        return Math.round(st.baseCost * Math.pow(st.costMultiplier, currentLevel));
    }

    //-------------------------------------------------------------------------
    // Resource accessors (game variable, or internal pool if RESOURCE_VAR is 0)
    //-------------------------------------------------------------------------
    function getResources() {
        if (RESOURCE_VAR > 0) return $gameVariables.value(RESOURCE_VAR);
        return $gameSystem._fiefResources || 0;
    }
    function setResources(v) {
        v = Math.max(0, Math.floor(v));
        if (RESOURCE_VAR > 0) $gameVariables.setValue(RESOURCE_VAR, v);
        else $gameSystem._fiefResources = v;
    }

    //-------------------------------------------------------------------------
    // Game_System: persistent fief state
    //-------------------------------------------------------------------------
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () {
        _Game_System_initialize.call(this);
        this._fiefLevels = {};
        this._fiefResources = 0;
        this._fiefProsperity = 0;
        this._fiefDay = 0;
    };

    Game_System.prototype.fiefLevel = function (id) {
        if (!this._fiefLevels) this._fiefLevels = {};
        return this._fiefLevels[id] || 0;
    };

    Game_System.prototype.fiefSetLevel = function (id, value) {
        if (!this._fiefLevels) this._fiefLevels = {};
        const st = structureById(id);
        const max = st ? st.maxLevel : 99;
        this._fiefLevels[id] = Math.max(0, Math.min(max, Math.floor(value)));
        this.fiefRefreshOutputs();
    };

    Game_System.prototype.fiefProsperity = function () {
        return this._fiefProsperity || 0;
    };

    Game_System.prototype.fiefSetProsperity = function (value) {
        this._fiefProsperity = Math.max(0, Math.min(PROSPERITY_MAX, Math.round(value)));
    };

    Game_System.prototype.fiefDay = function () {
        return this._fiefDay || 0;
    };

    Game_System.prototype.fiefDefenseRating = function () {
        return STRUCTURES.reduce((sum, st) => sum + this.fiefLevel(st.id) * st.defenseWeight, 0);
    };

    // Raw production before the Prosperity multiplier.
    Game_System.prototype.fiefProductionRaw = function () {
        return STRUCTURES.reduce((sum, st) => sum + this.fiefLevel(st.id) * st.incomePerLevel, 0);
    };

    Game_System.prototype.fiefIncomeMultiplier = function () {
        return 1 + this.fiefProsperity() / 100;
    };

    // Production after the Prosperity multiplier.
    Game_System.prototype.fiefProduction = function () {
        return Math.round(this.fiefProductionRaw() * this.fiefIncomeMultiplier());
    };

    Game_System.prototype.fiefUpkeep = function () {
        return STRUCTURES.reduce((sum, st) => sum + this.fiefLevel(st.id) * st.upkeepPerLevel, 0);
    };

    Game_System.prototype.fiefNetIncome = function () {
        return this.fiefProduction() - this.fiefUpkeep();
    };

    Game_System.prototype.fiefRefreshOutputs = function () {
        if (DEFENSE_VAR > 0) $gameVariables.setValue(DEFENSE_VAR, this.fiefDefenseRating());
        if (INCOME_VAR > 0) $gameVariables.setValue(INCOME_VAR, this.fiefNetIncome());
        if (PROSPERITY_VAR > 0) $gameVariables.setValue(PROSPERITY_VAR, this.fiefProsperity());
        if (DAY_VAR > 0) $gameVariables.setValue(DAY_VAR, this.fiefDay());
    };

    Game_System.prototype.fiefUpgrade = function (id) {
        const st = structureById(id);
        if (!st) return false;
        const lv = this.fiefLevel(id);
        if (lv >= st.maxLevel) return false;
        const cost = upgradeCost(st, lv);
        if (getResources() < cost) return false;
        setResources(getResources() - cost);
        this.fiefSetLevel(id, lv + 1);
        return true;
    };

    // Runs one economic cycle. Returns net income gained.
    Game_System.prototype.fiefAdvanceCycle = function () {
        const net = this.fiefNetIncome();
        setResources(getResources() + net);
        this._fiefDay = this.fiefDay() + 1;
        if (net > 0 && this.fiefProductionRaw() > 0) {
            this.fiefSetProsperity(this.fiefProsperity() + PROSPERITY_GROWTH);
        } else if (net < 0) {
            this.fiefSetProsperity(this.fiefProsperity() - PROSPERITY_DECLINE);
        }
        this.fiefRefreshOutputs();
        return net;
    };

    // Spend resources to raise Prosperity directly.
    Game_System.prototype.fiefInvestProsperity = function () {
        if (getResources() < INVEST_COST) return false;
        if (this.fiefProsperity() >= PROSPERITY_MAX) return false;
        setResources(getResources() - INVEST_COST);
        this.fiefSetProsperity(this.fiefProsperity() + INVEST_GAIN);
        this.fiefRefreshOutputs();
        return true;
    };

    Game_System.prototype.fiefResolveRaid = function (strength) {
        const defense = this.fiefDefenseRating();
        const defended = defense >= strength;
        if (!defended) {
            if (PENALTY_PCT > 0) {
                setResources(getResources() * (1 - PENALTY_PCT / 100));
            }
            if (PROSPERITY_BREACH > 0) {
                this.fiefSetProsperity(this.fiefProsperity() - PROSPERITY_BREACH);
            }
            if (DAMAGE_ON_BREACH) {
                let target = null;
                let best = 0;
                for (const st of STRUCTURES) {
                    const lv = this.fiefLevel(st.id);
                    if (lv > best) { best = lv; target = st; }
                }
                if (target) this.fiefSetLevel(target.id, this.fiefLevel(target.id) - 1);
            }
            this.fiefRefreshOutputs();
        }
        return { defended: defended, remaining: this.fiefDefenseRating() };
    };

    //-------------------------------------------------------------------------
    // Public script-call API
    //-------------------------------------------------------------------------
    window.Fiefdom = {
        level: id => $gameSystem.fiefLevel(id),
        upgrade: id => $gameSystem.fiefUpgrade(id),
        cost: id => {
            const st = structureById(id);
            return st ? upgradeCost(st, $gameSystem.fiefLevel(id)) : 0;
        },
        resources: () => getResources(),
        addResources: n => setResources(getResources() + Number(n)),
        defense: () => $gameSystem.fiefDefenseRating(),
        prosperity: () => $gameSystem.fiefProsperity(),
        production: () => $gameSystem.fiefProduction(),
        upkeep: () => $gameSystem.fiefUpkeep(),
        netIncome: () => $gameSystem.fiefNetIncome(),
        day: () => $gameSystem.fiefDay(),
        advanceCycle: () => $gameSystem.fiefAdvanceCycle(),
        investProsperity: () => $gameSystem.fiefInvestProsperity(),
        resolveRaid: strength => $gameSystem.fiefResolveRaid(Number(strength)),
        open: () => SceneManager.push(Scene_Fiefdom),
        structures: () => STRUCTURES.slice()
    };

    //-------------------------------------------------------------------------
    // Plugin commands
    //-------------------------------------------------------------------------
    PluginManager.registerCommand(pluginName, "buildUpgrade", args => {
        const ok = $gameSystem.fiefUpgrade(String(args.structureId));
        const sw = Number(args.resultSwitchId || 0);
        if (sw > 0) $gameSwitches.setValue(sw, ok);
    });

    PluginManager.registerCommand(pluginName, "addResources", args => {
        setResources(getResources() + Number(args.amount || 0));
    });

    PluginManager.registerCommand(pluginName, "advanceCycle", args => {
        const net = $gameSystem.fiefAdvanceCycle();
        const varId = Number(args.netIncomeVariableId || 0);
        if (varId > 0) $gameVariables.setValue(varId, net);
    });

    PluginManager.registerCommand(pluginName, "investProsperity", args => {
        const ok = $gameSystem.fiefInvestProsperity();
        const sw = Number(args.resultSwitchId || 0);
        if (sw > 0) $gameSwitches.setValue(sw, ok);
    });

    PluginManager.registerCommand(pluginName, "getLevel", args => {
        const varId = Number(args.variableId || 0);
        if (varId > 0) $gameVariables.setValue(varId, $gameSystem.fiefLevel(String(args.structureId)));
    });

    PluginManager.registerCommand(pluginName, "getCost", args => {
        const varId = Number(args.variableId || 0);
        const st = structureById(String(args.structureId));
        const cost = st ? upgradeCost(st, $gameSystem.fiefLevel(st.id)) : 0;
        if (varId > 0) $gameVariables.setValue(varId, cost);
    });

    PluginManager.registerCommand(pluginName, "recalc", () => {
        $gameSystem.fiefRefreshOutputs();
    });

    PluginManager.registerCommand(pluginName, "resolveRaid", args => {
        const strVar = Number(args.strengthVariableId || 0);
        const strength = strVar > 0 ? $gameVariables.value(strVar) : Number(args.strength || 0);
        const result = $gameSystem.fiefResolveRaid(strength);
        const sw = Number(args.resultSwitchId || 0);
        if (sw > 0) $gameSwitches.setValue(sw, result.defended);
        const remVar = Number(args.remainingDefenseVariableId || 0);
        if (remVar > 0) $gameVariables.setValue(remVar, result.remaining);
    });

    PluginManager.registerCommand(pluginName, "openManagement", () => {
        SceneManager.push(Scene_Fiefdom);
    });

    //-------------------------------------------------------------------------
    // Window_FiefStatus : top panel (resources, defense, prosperity, income)
    //-------------------------------------------------------------------------
    function Window_FiefStatus() { this.initialize(...arguments); }
    Window_FiefStatus.prototype = Object.create(Window_Base.prototype);
    Window_FiefStatus.prototype.constructor = Window_FiefStatus;

    Window_FiefStatus.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_FiefStatus.prototype.drawStat = function (label, value, col, row, valueColor) {
        const half = Math.floor(this.innerWidth / 2);
        const x = col * half;
        const y = this.lineHeight() * row;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(label, x, y, Math.floor(half * 0.55), "left");
        this.changeTextColor(valueColor || ColorManager.normalColor());
        this.drawText(String(value), x, y, half - 8, "right");
        this.resetTextColor();
    };

    Window_FiefStatus.prototype.refresh = function () {
        this.contents.clear();
        const sys = $gameSystem;
        const w = this.innerWidth;

        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Fiefdom", 0, 0, Math.floor(w * 0.5), "left");
        this.resetTextColor();
        this.drawText("Day " + sys.fiefDay(), 0, 0, w, "right");

        this.drawStat("Resources", getResources(), 0, 1);
        this.drawStat("Defense", sys.fiefDefenseRating(), 1, 1);
        this.drawStat("Prosperity", sys.fiefProsperity() + "%", 0, 2);

        const net = sys.fiefNetIncome();
        const netText = (net >= 0 ? "+" : "") + net + "/cycle";
        const netColor = net >= 0 ? ColorManager.powerUpColor() : ColorManager.powerDownColor();
        this.drawStat("Income", netText, 1, 2, netColor);
    };

    //-------------------------------------------------------------------------
    // Window_FiefList : selectable structures with level + cost + role tag
    //-------------------------------------------------------------------------
    function Window_FiefList() { this.initialize(...arguments); }
    Window_FiefList.prototype = Object.create(Window_Selectable.prototype);
    Window_FiefList.prototype.constructor = Window_FiefList;

    Window_FiefList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };

    Window_FiefList.prototype.maxItems = function () {
        return STRUCTURES.length;
    };

    Window_FiefList.prototype.currentStructure = function () {
        return STRUCTURES[this.index()];
    };

    Window_FiefList.prototype.isEnabled = function (index) {
        const st = STRUCTURES[index];
        if (!st) return false;
        const lv = $gameSystem.fiefLevel(st.id);
        if (lv >= st.maxLevel) return false;
        return getResources() >= upgradeCost(st, lv);
    };

    Window_FiefList.prototype.isCurrentItemEnabled = function () {
        return this.isEnabled(this.index());
    };

    Window_FiefList.prototype.roleTag = function (st) {
        if (st.incomePerLevel > 0 && st.defenseWeight > 0) return "Econ/Def";
        if (st.incomePerLevel > 0) return "Economy";
        if (st.upkeepPerLevel > 0) return "Military";
        if (st.defenseWeight > 0) return "Defense";
        return "";
    };

    Window_FiefList.prototype.drawItem = function (index) {
        const st = STRUCTURES[index];
        const lv = $gameSystem.fiefLevel(st.id);
        const maxed = lv >= st.maxLevel;
        const cost = upgradeCost(st, lv);
        const rect = this.itemLineRect(index);
        const nameW = Math.floor(rect.width * 0.34);
        const tagW = Math.floor(rect.width * 0.22);
        const lvW = Math.floor(rect.width * 0.20);
        const costW = rect.width - nameW - tagW - lvW;
        const tagX = rect.x + nameW;
        const lvX = rect.x + nameW + tagW;
        const costX = rect.x + nameW + tagW + lvW;

        this.changePaintOpacity(this.isEnabled(index) || maxed);
        let nameX = rect.x;
        if (st.iconIndex > 0) {
            this.drawIcon(st.iconIndex, rect.x, rect.y);
            nameX = rect.x + ImageManager.iconWidth + 4;
        }
        this.drawText(st.name, nameX, rect.y, nameW - (nameX - rect.x), "left");

        this.changeTextColor(ColorManager.textColor(6));
        this.drawText(this.roleTag(st), tagX, rect.y, tagW, "center");
        this.resetTextColor();

        this.drawText("Lv " + lv + "/" + st.maxLevel, lvX, rect.y, lvW, "center");

        this.changePaintOpacity(true);
        if (maxed) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("MAX", costX, rect.y, costW, "right");
            this.resetTextColor();
        } else {
            const affordable = getResources() >= cost;
            this.changeTextColor(affordable ? ColorManager.normalColor() : ColorManager.deathColor());
            this.drawText(String(cost), costX, rect.y, costW, "right");
            this.resetTextColor();
        }
    };

    //-------------------------------------------------------------------------
    // Scene_Fiefdom : the management menu
    //-------------------------------------------------------------------------
    function Scene_Fiefdom() { this.initialize(...arguments); }
    Scene_Fiefdom.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Fiefdom.prototype.constructor = Scene_Fiefdom;

    Scene_Fiefdom.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_Fiefdom.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createStatusWindow();
        this.createListWindow();
    };

    Scene_Fiefdom.prototype.statusWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(3, false);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Fiefdom.prototype.listWindowRect = function () {
        const wx = 0;
        const wy = this._statusWindow.y + this._statusWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Fiefdom.prototype.createStatusWindow = function () {
        this._statusWindow = new Window_FiefStatus(this.statusWindowRect());
        this.addWindow(this._statusWindow);
    };

    Scene_Fiefdom.prototype.createListWindow = function () {
        this._listWindow = new Window_FiefList(this.listWindowRect());
        this._listWindow.setHandler("ok", this.onListOk.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
    };

    Scene_Fiefdom.prototype.onListOk = function () {
        const st = this._listWindow.currentStructure();
        if (st && $gameSystem.fiefUpgrade(st.id)) {
            SoundManager.playShop();
        } else {
            SoundManager.playBuzzer();
        }
        this._statusWindow.refresh();
        this._listWindow.refresh();
        this._listWindow.activate();
    };

    window.Scene_Fiefdom = Scene_Fiefdom;

})();
