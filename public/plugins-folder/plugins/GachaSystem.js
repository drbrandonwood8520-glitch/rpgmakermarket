/*:
 * @target MZ
 * @plugindesc [v1.0.0] Simple, customizable Gacha lottery. Rarities, pity, multi-pull guarantees, duplicate conversion, and an in-game pull scene.
 * @author (you)
 * @url
 *
 * @help
 * ============================================================================
 * Gacha System — RPG Maker MZ
 * ============================================================================
 * A drop-in gacha (lottery) system that draws prizes from your database:
 * Items, Weapons, Armors, and Actors (characters). Configure everything in
 * the Plugin Manager — no scripting required.
 *
 * IMPORTANT: keep this file named  GachaSystem.js  (the plugin name is used
 * internally to read parameters and register commands).
 *
 * ----------------------------------------------------------------------------
 * CORE CONCEPTS
 * ----------------------------------------------------------------------------
 * Premium Currency
 *   Stored in a Game Variable you pick (e.g. "Gems"). Grant it however you
 *   like — a shop, an event reward, or the "Add Currency" plugin command.
 *
 * Rarities
 *   An ordered list from MOST COMMON (top) to RAREST (bottom). Each rarity has
 *   a pull RATE (a weight — the plugin normalizes them, so they don't have to
 *   sum to 100). Order matters: it defines what counts as "rare or better"
 *   for pity and multi-pull guarantees.
 *
 * Pools (Banners)
 *   Each pool has its own cost, prize list, pity rule, and multi-pull rule.
 *   A prize (Entry) points at one database record and belongs to one rarity.
 *   Within a rarity, an Entry's Weight controls how likely it is versus other
 *   entries of the SAME rarity.
 *
 * How a pull works
 *   1) Roll a rarity using the rarity RATES (restricted to rarities that
 *      actually have prizes in this pool).
 *   2) Pick one prize of that rarity, weighted by each entry's Weight.
 *
 * Pity (anti-frustration, a best practice)
 *   "Pity Count" = the max pulls a player can go without hitting the
 *   "Pity Rarity" (or better). On that pull the rarity is forced. The counter
 *   resets whenever the player lands the pity rarity or higher. Set Pity Count
 *   to 0 to disable.
 *
 * Multi-pull guarantee
 *   A multi-pull (e.g. x10) can guarantee at least one prize of the
 *   "Guaranteed Rarity" or better. If the rolls didn't produce one, the last
 *   result is upgraded.
 *
 * Duplicate conversion
 *   Mark an Entry "Unique" (recommended for Actors). If the player already
 *   owns it, the prize is auto-converted into premium currency instead of a
 *   useless duplicate — the amount is set per rarity below.
 *
 * ----------------------------------------------------------------------------
 * QUICK START
 * ----------------------------------------------------------------------------
 * 1) Set "Premium Currency Variable" to an empty Game Variable.
 * 2) (Optional) tweak the default Rarities and the "Standard Banner" pool.
 * 3) Give the player some currency for testing with the plugin command
 *    "Add Currency".
 * 4) Open the gacha from an event with the plugin command "Open Gacha Scene".
 *
 * The plugin ships with working defaults, so it runs out of the box.
 *
 * ----------------------------------------------------------------------------
 * PLUGIN COMMANDS
 * ----------------------------------------------------------------------------
 * Open Gacha Scene   — opens the built-in pull UI for a pool.
 * Pull               — performs a pull from an event (no scene). Deducts
 *                      currency, awards prizes, and (optionally) turns a
 *                      Switch ON for success / OFF for "not enough currency",
 *                      so you can branch and show your own presentation.
 * Add Currency       — adds (or, with a negative number, removes) currency.
 * Reset Pity         — resets a pool's pity counter (handy for testing).
 *
 * ----------------------------------------------------------------------------
 * TERMS
 * ----------------------------------------------------------------------------
 * Free to use and edit in commercial and non-commercial projects. No warranty.
 *
 * ============================================================================
 *
 * @param currencyVariableId
 * @text Premium Currency Variable
 * @desc Game Variable that stores the player's premium currency (e.g. Gems).
 * @type variable
 * @default 1
 *
 * @param currencyName
 * @text Currency Name
 * @desc Display name for the premium currency.
 * @type string
 * @default Gems
 *
 * @param rarities
 * @text Rarities
 * @desc Order MOST COMMON (top) to RAREST (bottom). Rate = pull weight.
 * @type struct<Rarity>[]
 * @default ["{\"key\":\"common\",\"name\":\"Common\",\"color\":\"#c8c8c8\",\"rate\":\"60\",\"stars\":\"1\",\"dupeReward\":\"5\"}","{\"key\":\"rare\",\"name\":\"Rare\",\"color\":\"#5aa9ff\",\"rate\":\"30\",\"stars\":\"2\",\"dupeReward\":\"15\"}","{\"key\":\"epic\",\"name\":\"Epic\",\"color\":\"#c86bff\",\"rate\":\"8\",\"stars\":\"3\",\"dupeReward\":\"50\"}","{\"key\":\"legendary\",\"name\":\"Legendary\",\"color\":\"#ffd24a\",\"rate\":\"2\",\"stars\":\"4\",\"dupeReward\":\"150\"}"]
 *
 * @param pools
 * @text Gacha Pools (Banners)
 * @desc Each pool has its own cost, prize list, and rules.
 * @type struct<Pool>[]
 * @default ["{\"key\":\"standard\",\"name\":\"Standard Banner\",\"costSingle\":\"100\",\"costMulti\":\"900\",\"multiCount\":\"10\",\"pityCount\":\"50\",\"pityRarity\":\"legendary\",\"guaranteedRarity\":\"rare\",\"entries\":\"[\\\"{\\\\\\\"type\\\\\\\":\\\\\\\"item\\\\\\\",\\\\\\\"id\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"rarity\\\\\\\":\\\\\\\"common\\\\\\\",\\\\\\\"weight\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"unique\\\\\\\":\\\\\\\"false\\\\\\\"}\\\",\\\"{\\\\\\\"type\\\\\\\":\\\\\\\"armor\\\\\\\",\\\\\\\"id\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"rarity\\\\\\\":\\\\\\\"rare\\\\\\\",\\\\\\\"weight\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"unique\\\\\\\":\\\\\\\"false\\\\\\\"}\\\",\\\"{\\\\\\\"type\\\\\\\":\\\\\\\"weapon\\\\\\\",\\\\\\\"id\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"rarity\\\\\\\":\\\\\\\"epic\\\\\\\",\\\\\\\"weight\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"unique\\\\\\\":\\\\\\\"false\\\\\\\"}\\\",\\\"{\\\\\\\"type\\\\\\\":\\\\\\\"actor\\\\\\\",\\\\\\\"id\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"rarity\\\\\\\":\\\\\\\"legendary\\\\\\\",\\\\\\\"weight\\\\\\\":\\\\\\\"1\\\\\\\",\\\\\\\"unique\\\\\\\":\\\\\\\"true\\\\\\\"}\\\"]\"}"]
 *
 * @param uiHeader
 * @text UI: Header Text
 * @desc Text shown at the top of the gacha scene. Use %1 for the pool name.
 * @type string
 * @default %1
 *
 * @param pullSe
 * @text Pull Sound Effect
 * @desc SE played when a pull resolves.
 * @type file
 * @dir audio/se
 * @default Saint5
 *
 * @command openScene
 * @text Open Gacha Scene
 * @desc Opens the built-in gacha pull UI.
 *
 * @arg poolKey
 * @text Pool Key
 * @desc The "key" of the pool to open. Leave blank for the first pool.
 * @type string
 * @default
 *
 * @command pull
 * @text Pull (no scene)
 * @desc Performs a pull from an event. Deducts currency and awards prizes.
 *
 * @arg poolKey
 * @text Pool Key
 * @type string
 * @default standard
 *
 * @arg count
 * @text Count
 * @desc 1 for a single pull, or the pool's multi count for a multi-pull.
 * @type number
 * @min 1
 * @default 1
 *
 * @arg resultSwitchId
 * @text Result Switch
 * @desc Optional. Turned ON on success, OFF if the player can't afford it.
 * @type switch
 * @default 0
 *
 * @command addCurrency
 * @text Add Currency
 * @desc Adds (or removes, if negative) premium currency.
 *
 * @arg amount
 * @text Amount
 * @type number
 * @min -999999999
 * @default 1000
 *
 * @command resetPity
 * @text Reset Pity
 * @desc Resets a pool's pity counter to 0.
 *
 * @arg poolKey
 * @text Pool Key
 * @type string
 * @default standard
 */

/*~struct~Rarity:
 * @param key
 * @text Key
 * @desc Unique id used by pools/entries (e.g. "legendary"). No spaces.
 * @type string
 *
 * @param name
 * @text Display Name
 * @type string
 *
 * @param color
 * @text Text Color
 * @desc CSS color for the name (hex like #ffd24a).
 * @type string
 * @default #ffffff
 *
 * @param rate
 * @text Rate (weight)
 * @desc Relative chance to roll this rarity. Higher = more common.
 * @type number
 * @decimals 2
 * @min 0
 * @default 10
 *
 * @param stars
 * @text Stars
 * @desc Number of ★ shown next to prizes of this rarity.
 * @type number
 * @min 0
 * @default 1
 *
 * @param dupeReward
 * @text Duplicate Reward
 * @desc Currency granted when a "Unique" prize of this rarity is a duplicate.
 * @type number
 * @min 0
 * @default 10
 */

/*~struct~Pool:
 * @param key
 * @text Key
 * @desc Unique id for this pool (e.g. "standard"). No spaces.
 * @type string
 *
 * @param name
 * @text Display Name
 * @type string
 *
 * @param costSingle
 * @text Cost: Single Pull
 * @type number
 * @min 0
 * @default 100
 *
 * @param costMulti
 * @text Cost: Multi Pull
 * @type number
 * @min 0
 * @default 900
 *
 * @param multiCount
 * @text Multi Pull Count
 * @desc How many prizes a multi-pull gives (e.g. 10).
 * @type number
 * @min 2
 * @default 10
 *
 * @param pityCount
 * @text Pity Count
 * @desc Max pulls before the Pity Rarity is forced. 0 = no pity.
 * @type number
 * @min 0
 * @default 50
 *
 * @param pityRarity
 * @text Pity Rarity (key)
 * @desc Rarity key guaranteed by pity, and that resets the counter.
 * @type string
 * @default legendary
 *
 * @param guaranteedRarity
 * @text Multi Guaranteed Rarity (key)
 * @desc A multi-pull guarantees at least one of this rarity or better. Blank = none.
 * @type string
 * @default rare
 *
 * @param entries
 * @text Prizes
 * @type struct<Entry>[]
 * @default []
 */

/*~struct~Entry:
 * @param type
 * @text Type
 * @type select
 * @option Item
 * @value item
 * @option Weapon
 * @value weapon
 * @option Armor
 * @value armor
 * @option Actor (Character)
 * @value actor
 * @default item
 *
 * @param id
 * @text Database ID
 * @desc The database ID of the Item/Weapon/Armor/Actor.
 * @type number
 * @min 1
 * @default 1
 *
 * @param rarity
 * @text Rarity (key)
 * @desc Must match one of your Rarity keys.
 * @type string
 * @default common
 *
 * @param weight
 * @text Weight
 * @desc Chance vs other entries of the SAME rarity. Higher = more likely.
 * @type number
 * @decimals 2
 * @min 0
 * @default 1
 *
 * @param unique
 * @text Unique?
 * @desc If ON, duplicates convert to currency instead of stacking. Use for Actors.
 * @type boolean
 * @default false
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "GachaSystem";
    const params = PluginManager.parameters(PLUGIN_NAME);

    // ------------------------------------------------------------------------
    // Parameter parsing
    // ------------------------------------------------------------------------
    const parseArray = (raw) => {
        if (!raw) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    };
    const parseStructArray = (raw) => parseArray(raw).map((s) => {
        try { return JSON.parse(s); } catch (e) { return {}; }
    });

    const DEFAULT_RARITIES = [
        { key: "common", name: "Common", color: "#c8c8c8", rate: 60, stars: 1, dupeReward: 5 },
        { key: "rare", name: "Rare", color: "#5aa9ff", rate: 30, stars: 2, dupeReward: 15 },
        { key: "epic", name: "Epic", color: "#c86bff", rate: 8, stars: 3, dupeReward: 50 },
        { key: "legendary", name: "Legendary", color: "#ffd24a", rate: 2, stars: 4, dupeReward: 150 }
    ];

    const DEFAULT_POOLS = [{
        key: "standard", name: "Standard Banner",
        costSingle: 100, costMulti: 900, multiCount: 10,
        pityCount: 50, pityRarity: "legendary", guaranteedRarity: "rare",
        entries: [
            { type: "item", id: 1, rarity: "common", weight: 1, unique: false },
            { type: "armor", id: 1, rarity: "rare", weight: 1, unique: false },
            { type: "weapon", id: 1, rarity: "epic", weight: 1, unique: false },
            { type: "actor", id: 1, rarity: "legendary", weight: 1, unique: true }
        ]
    }];

    let rarities = parseStructArray(params.rarities).map((r) => ({
        key: String(r.key || "").trim(),
        name: String(r.name || r.key || ""),
        color: String(r.color || "#ffffff"),
        rate: Number(r.rate || 0),
        stars: Number(r.stars || 0),
        dupeReward: Number(r.dupeReward || 0)
    })).filter((r) => r.key);
    if (rarities.length === 0) rarities = DEFAULT_RARITIES.slice();

    let pools = parseStructArray(params.pools).map((p) => ({
        key: String(p.key || "").trim(),
        name: String(p.name || p.key || ""),
        costSingle: Number(p.costSingle || 0),
        costMulti: Number(p.costMulti || 0),
        multiCount: Number(p.multiCount || 10),
        pityCount: Number(p.pityCount || 0),
        pityRarity: String(p.pityRarity || "").trim(),
        guaranteedRarity: String(p.guaranteedRarity || "").trim(),
        entries: parseStructArray(p.entries).map((e) => ({
            type: String(e.type || "item"),
            id: Number(e.id || 0),
            rarity: String(e.rarity || "").trim(),
            weight: Number(e.weight || 1),
            unique: String(e.unique) === "true"
        })).filter((e) => e.id > 0 && e.rarity)
    })).filter((p) => p.key);
    if (pools.length === 0) pools = DEFAULT_POOLS.slice();

    const currencyVarId = Number(params.currencyVariableId || 1);
    const currencyName = String(params.currencyName || "Gems");
    const headerFormat = String(params.uiHeader || "%1");
    const pullSe = String(params.pullSe || "");

    // ------------------------------------------------------------------------
    // Save-persistent state (pity counters live on $gameSystem)
    // ------------------------------------------------------------------------
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () {
        _Game_System_initialize.call(this);
        this._gachaPity = {};
    };
    Game_System.prototype.gachaPity = function () {
        if (this._gachaPity === undefined) this._gachaPity = {};
        return this._gachaPity;
    };

    // ------------------------------------------------------------------------
    // GachaManager — all the game logic
    // ------------------------------------------------------------------------
    const GachaManager = {
        rarities: rarities,
        pools: pools,
        _defaultPoolKey: null,

        findPool(key) {
            if (!key) return this.pools[0] || null;
            return this.pools.find((p) => p.key === key) || null;
        },
        findRarity(key) {
            return this.rarities.find((r) => r.key === key) || null;
        },
        rarityIndex(key) {
            // Higher index = rarer (rarities are ordered common -> rare).
            return this.rarities.findIndex((r) => r.key === key);
        },

        // --- Currency ---
        currency() { return $gameVariables.value(currencyVarId); },
        gainCurrency(n) { $gameVariables.setValue(currencyVarId, this.currency() + Math.round(n)); },
        loseCurrency(n) { this.gainCurrency(-n); },
        canAfford(cost) { return this.currency() >= cost; },

        // --- Pity ---
        getPity(poolKey) { return $gameSystem.gachaPity()[poolKey] || 0; },
        setPity(poolKey, n) { $gameSystem.gachaPity()[poolKey] = n; },
        resetPity(poolKey) { this.setPity(poolKey, 0); },

        // --- Rolling ---
        availableRarities(pool) {
            return this.rarities.filter((r) => pool.entries.some((e) => e.rarity === r.key));
        },

        rollRarity(pool, forcePity) {
            const available = this.availableRarities(pool);
            if (available.length === 0) return this.rarities[0] || null;
            if (forcePity && pool.pityRarity) {
                const forced = available.find((r) => r.key === pool.pityRarity);
                return forced || available[available.length - 1];
            }
            const total = available.reduce((s, r) => s + Math.max(0, r.rate), 0);
            if (total <= 0) return available[available.length - 1];
            let roll = Math.random() * total;
            for (const r of available) {
                roll -= Math.max(0, r.rate);
                if (roll < 0) return r;
            }
            return available[available.length - 1];
        },

        rollEntry(pool, rarity) {
            const pick = pool.entries.filter((e) => e.rarity === rarity.key);
            if (pick.length === 0) return null;
            const total = pick.reduce((s, e) => s + Math.max(0, e.weight), 0);
            if (total <= 0) return pick[0];
            let roll = Math.random() * total;
            for (const e of pick) {
                roll -= Math.max(0, e.weight);
                if (roll < 0) return e;
            }
            return pick[pick.length - 1];
        },

        singlePull(pool) {
            let pity = this.getPity(pool.key) + 1;
            const forcePity = pool.pityCount > 0 && pity >= pool.pityCount;
            const rarity = this.rollRarity(pool, forcePity);
            const pityIdx = pool.pityRarity ? this.rarityIndex(pool.pityRarity) : Infinity;
            if (rarity && this.rarityIndex(rarity.key) >= pityIdx) {
                pity = 0; // reset when pity rarity (or better) is hit
            }
            this.setPity(pool.key, pity);
            const entry = this.rollEntry(pool, rarity);
            return { entry: entry, rarity: rarity };
        },

        multiPull(pool) {
            const results = [];
            const count = Math.max(2, pool.multiCount);
            for (let i = 0; i < count; i++) results.push(this.singlePull(pool));
            if (pool.guaranteedRarity) {
                const gIdx = this.rarityIndex(pool.guaranteedRarity);
                const hasIt = results.some((r) => r.rarity && this.rarityIndex(r.rarity.key) >= gIdx);
                if (!hasIt && gIdx >= 0) {
                    const rarity = this.findRarity(pool.guaranteedRarity);
                    const entry = this.rollEntry(pool, rarity);
                    if (entry) results[results.length - 1] = { entry: entry, rarity: rarity };
                }
            }
            return results;
        },

        // --- Awarding prizes / database access ---
        databaseFor(type) {
            switch (type) {
                case "item": return $dataItems;
                case "weapon": return $dataWeapons;
                case "armor": return $dataArmors;
                default: return null;
            }
        },

        dbObject(entry) {
            if (!entry) return null;
            if (entry.type === "actor") return $dataActors[entry.id] || null;
            const db = this.databaseFor(entry.type);
            return db ? db[entry.id] || null : null;
        },

        entryName(entry) {
            const obj = this.dbObject(entry);
            return obj ? obj.name : "(missing #" + (entry ? entry.id : "?") + ")";
        },

        entryIcon(entry) {
            if (!entry || entry.type === "actor") return 0;
            const obj = this.dbObject(entry);
            return obj ? obj.iconIndex : 0;
        },

        isDuplicate(entry) {
            const obj = this.dbObject(entry);
            if (!obj) return false;
            if (entry.type === "actor") return $gameParty._actors.includes(entry.id);
            return $gameParty.numItems(obj) > 0;
        },

        giveEntry(entry) {
            const obj = this.dbObject(entry);
            if (!obj) return;
            if (entry.type === "actor") $gameParty.addActor(entry.id);
            else $gameParty.gainItem(obj, 1);
        },

        // Awards a single result. Flags result.converted / result.reward if it
        // was a unique duplicate turned into currency.
        awardResult(result) {
            const entry = result.entry;
            if (!entry || !this.dbObject(entry)) { result.missing = true; return result; }
            if (entry.unique && this.isDuplicate(entry)) {
                const reward = result.rarity ? result.rarity.dupeReward : 0;
                this.gainCurrency(reward);
                result.converted = true;
                result.reward = reward;
            } else {
                this.giveEntry(entry);
                result.converted = false;
            }
            return result;
        },

        // Cost helper: count 1 => single, otherwise multi.
        costFor(pool, count) {
            return count > 1 ? pool.costMulti : pool.costSingle;
        },

        // High-level: attempt a pull, deduct currency, award. Returns results
        // array on success, or null if the player can't afford it.
        performPull(pool, count) {
            const cost = this.costFor(pool, count);
            if (!this.canAfford(cost)) return null;
            this.loseCurrency(cost);
            const results = count > 1 ? this.multiPull(pool) : [this.singlePull(pool)];
            results.forEach((r) => this.awardResult(r));
            return results;
        }
    };

    window.GachaManager = GachaManager; // exposed for advanced/scripted use

    // ------------------------------------------------------------------------
    // Plugin commands
    // ------------------------------------------------------------------------
    PluginManager.registerCommand(PLUGIN_NAME, "openScene", (args) => {
        GachaManager._defaultPoolKey = String(args.poolKey || "").trim() || null;
        SceneManager.push(Scene_Gacha);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "pull", (args) => {
        const pool = GachaManager.findPool(String(args.poolKey || "").trim());
        const count = Math.max(1, Number(args.count || 1));
        const switchId = Number(args.resultSwitchId || 0);
        const results = pool ? GachaManager.performPull(pool, count) : null;
        if (switchId > 0) $gameSwitches.setValue(switchId, !!results);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "addCurrency", (args) => {
        GachaManager.gainCurrency(Number(args.amount || 0));
    });

    PluginManager.registerCommand(PLUGIN_NAME, "resetPity", (args) => {
        GachaManager.resetPity(String(args.poolKey || "").trim());
    });

    // ------------------------------------------------------------------------
    // UI helpers
    // ------------------------------------------------------------------------
    const starString = (n) => "\u2605".repeat(Math.max(0, n));

    // ------------------------------------------------------------------------
    // Window_GachaInfo — top bar: pool name + currency
    // ------------------------------------------------------------------------
    function Window_GachaInfo() { this.initialize(...arguments); }
    Window_GachaInfo.prototype = Object.create(Window_Base.prototype);
    Window_GachaInfo.prototype.constructor = Window_GachaInfo;

    Window_GachaInfo.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._pool = null;
        this._flashFrames = 0;
    };
    Window_GachaInfo.prototype.setPool = function (pool) {
        this._pool = pool;
        this.refresh();
    };
    Window_GachaInfo.prototype.flashInsufficient = function () {
        this._flashFrames = 40;
    };
    Window_GachaInfo.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (this._flashFrames > 0) {
            this._flashFrames--;
            if (this._flashFrames === 0) this.refresh();
        }
    };
    Window_GachaInfo.prototype.refresh = function () {
        this.contents.clear();
        const w = this.innerWidth;
        const lh = this.lineHeight();
        if (this._pool) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(headerFormat.format(this._pool.name), 0, 0, w * 0.6, "left");
        }
        // Currency (right aligned)
        const label = currencyName + ": ";
        this.resetTextColor();
        if (this._flashFrames > 0) this.changeTextColor(ColorManager.deathColor());
        const value = String(GachaManager.currency());
        this.drawText(label + value, w * 0.4, 0, w * 0.6, "right");
        this.resetTextColor();
    };

    // ------------------------------------------------------------------------
    // Window_GachaCommand — Pull x1 / Pull xN / Rates / Exit
    // ------------------------------------------------------------------------
    function Window_GachaCommand() { this.initialize(...arguments); }
    Window_GachaCommand.prototype = Object.create(Window_Command.prototype);
    Window_GachaCommand.prototype.constructor = Window_GachaCommand;

    Window_GachaCommand.prototype.initialize = function (rect) {
        this._pool = null;
        Window_Command.prototype.initialize.call(this, rect);
    };
    Window_GachaCommand.prototype.setPool = function (pool) {
        this._pool = pool;
        this.refresh();
        this.select(0);
    };
    Window_GachaCommand.prototype.makeCommandList = function () {
        const p = this._pool;
        if (!p) return;
        const single = "Pull \u00D71   —   " + p.costSingle + " " + currencyName;
        const multi = "Pull \u00D7" + p.multiCount + "   —   " + p.costMulti + " " + currencyName;
        this.addCommand(single, "single");
        this.addCommand(multi, "multi");
        this.addCommand("View Rates", "rates");
        this.addCommand("Exit", "cancel");
    };

    // ------------------------------------------------------------------------
    // Window_GachaResult — shows the prizes from the last pull
    // ------------------------------------------------------------------------
    function Window_GachaResult() { this.initialize(...arguments); }
    Window_GachaResult.prototype = Object.create(Window_Selectable.prototype);
    Window_GachaResult.prototype.constructor = Window_GachaResult;

    Window_GachaResult.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._results = [];
        this.openness = 0;
        this.deactivate();
    };
    Window_GachaResult.prototype.setResults = function (results) {
        this._results = results || [];
        this.refresh();
        this.scrollTo(0, 0);
    };
    Window_GachaResult.prototype.maxItems = function () {
        return this._results.length + 1; // + a footer "Continue" line
    };
    Window_GachaResult.prototype.itemHeight = function () {
        return this.lineHeight();
    };
    Window_GachaResult.prototype.drawItem = function (index) {
        const rect = this.itemLineRect(index);
        if (index >= this._results.length) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("\u25B6 Continue", rect.x, rect.y, rect.width, "center");
            this.resetTextColor();
            return;
        }
        const res = this._results[index];
        const entry = res.entry;
        const rarity = res.rarity;
        let x = rect.x;
        const y = rect.y;
        // icon (items/weapons/armors) or a filled marker for actors
        const iconIndex = GachaManager.entryIcon(entry);
        if (iconIndex > 0) {
            this.drawIcon(iconIndex, x, y);
        }
        x += ImageManager.iconWidth + 4;
        // stars
        if (rarity) {
            this.changeTextColor(rarity.color);
            const stars = starString(rarity.stars);
            this.drawText(stars, x, y, 120, "left");
        }
        x += 120;
        // name in rarity color
        const name = GachaManager.entryName(entry);
        if (rarity) this.changeTextColor(rarity.color); else this.resetTextColor();
        let label = name;
        if (entry && entry.type === "actor") label += "  (Character)";
        this.drawText(label, x, y, rect.width - x - 180 + rect.x, "left");
        // duplicate note
        this.resetTextColor();
        if (res.converted) {
            this.changeTextColor(ColorManager.textColor(6));
            this.drawText("Dupe +" + res.reward + " " + currencyName, rect.width + rect.x - 220, y, 220, "right");
        } else if (res.missing) {
            this.changeTextColor(ColorManager.deathColor());
            this.drawText("(missing data)", rect.width + rect.x - 220, y, 220, "right");
        }
        this.resetTextColor();
    };

    // ------------------------------------------------------------------------
    // Window_GachaRates — rarity rate breakdown
    // ------------------------------------------------------------------------
    function Window_GachaRates() { this.initialize(...arguments); }
    Window_GachaRates.prototype = Object.create(Window_Selectable.prototype);
    Window_GachaRates.prototype.constructor = Window_GachaRates;

    Window_GachaRates.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._pool = null;
        this.openness = 0;
        this.deactivate();
    };
    Window_GachaRates.prototype.setPool = function (pool) {
        this._pool = pool;
        this.refresh();
    };
    Window_GachaRates.prototype.maxItems = function () { return 1; };
    Window_GachaRates.prototype.refresh = function () {
        this.contents.clear();
        if (!this._pool) return;
        const avail = GachaManager.availableRarities(this._pool);
        const total = avail.reduce((s, r) => s + Math.max(0, r.rate), 0) || 1;
        const lh = this.lineHeight();
        let y = 0;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Pull Rates", 0, y, this.innerWidth, "center");
        this.resetTextColor();
        y += lh;
        for (const r of avail) {
            const pct = (Math.max(0, r.rate) / total * 100);
            this.changeTextColor(r.color);
            this.drawText(starString(r.stars) + " " + r.name, 0, y, this.innerWidth * 0.6, "left");
            this.resetTextColor();
            this.drawText(pct.toFixed(2) + "%", this.innerWidth * 0.6, y, this.innerWidth * 0.4, "right");
            y += lh;
        }
        if (this._pool.pityCount > 0) {
            y += Math.floor(lh / 2);
            const pr = GachaManager.findRarity(this._pool.pityRarity);
            const prName = pr ? pr.name : this._pool.pityRarity;
            this.drawText("Guaranteed " + prName + " within " + this._pool.pityCount + " pulls.", 0, y, this.innerWidth, "left");
        }
    };

    // ------------------------------------------------------------------------
    // Scene_Gacha
    // ------------------------------------------------------------------------
    function Scene_Gacha() { this.initialize(...arguments); }
    Scene_Gacha.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Gacha.prototype.constructor = Scene_Gacha;

    Scene_Gacha.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
        this._pool = GachaManager.findPool(GachaManager._defaultPoolKey);
    };
    Scene_Gacha.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createInfoWindow();
        this.createCommandWindow();
        this.createRatesWindow();
        this.createResultWindow();
        if (!this._pool) {
            // No pool configured; bail out safely.
            this._commandWindow.deactivate();
        }
    };

    Scene_Gacha.prototype.createInfoWindow = function () {
        const rect = new Rectangle(0, 0, Graphics.boxWidth, this.calcWindowHeight(1, false));
        this._infoWindow = new Window_GachaInfo(rect);
        this._infoWindow.setPool(this._pool);
        this.addWindow(this._infoWindow);
    };

    Scene_Gacha.prototype.createCommandWindow = function () {
        const y = this._infoWindow.y + this._infoWindow.height;
        const rect = new Rectangle(0, y, Graphics.boxWidth, this.calcWindowHeight(4, true));
        const win = new Window_GachaCommand(rect);
        win.setPool(this._pool);
        win.setHandler("single", this.commandSingle.bind(this));
        win.setHandler("multi", this.commandMulti.bind(this));
        win.setHandler("rates", this.commandRates.bind(this));
        win.setHandler("cancel", this.popScene.bind(this));
        this._commandWindow = win;
        this.addWindow(win);
    };

    Scene_Gacha.prototype.createRatesWindow = function () {
        const y = this._commandWindow.y + this._commandWindow.height;
        const h = Graphics.boxHeight - y;
        const rect = new Rectangle(0, y, Graphics.boxWidth, h);
        const win = new Window_GachaRates(rect);
        win.setPool(this._pool);
        win.setHandler("ok", this.closeRates.bind(this));
        win.setHandler("cancel", this.closeRates.bind(this));
        this._ratesWindow = win;
        this.addWindow(win);
    };

    Scene_Gacha.prototype.createResultWindow = function () {
        const y = this._commandWindow.y + this._commandWindow.height;
        const h = Graphics.boxHeight - y;
        const rect = new Rectangle(0, y, Graphics.boxWidth, h);
        const win = new Window_GachaResult(rect);
        win.setHandler("ok", this.closeResults.bind(this));
        win.setHandler("cancel", this.closeResults.bind(this));
        this._resultWindow = win;
        this.addWindow(win);
    };

    Scene_Gacha.prototype.commandSingle = function () { this.doPull(1); };
    Scene_Gacha.prototype.commandMulti = function () { this.doPull(this._pool.multiCount); };

    Scene_Gacha.prototype.doPull = function (count) {
        const pool = this._pool;
        const cost = GachaManager.costFor(pool, count);
        if (!GachaManager.canAfford(cost)) {
            SoundManager.playBuzzer();
            this._infoWindow.flashInsufficient();
            this._commandWindow.activate();
            return;
        }
        const results = GachaManager.performPull(pool, count);
        this.playPullSe();
        this._infoWindow.refresh();
        this._commandWindow.deactivate();
        this._resultWindow.setResults(results);
        this._resultWindow.open();
        this._resultWindow.activate();
        this._resultWindow.select(0);
    };

    Scene_Gacha.prototype.playPullSe = function () {
        if (pullSe) {
            AudioManager.playSe({ name: pullSe, volume: 90, pitch: 100, pan: 0 });
        } else {
            SoundManager.playOk();
        }
    };

    Scene_Gacha.prototype.closeResults = function () {
        this._resultWindow.close();
        this._resultWindow.deactivate();
        this._commandWindow.activate();
    };

    Scene_Gacha.prototype.commandRates = function () {
        this._commandWindow.deactivate();
        this._ratesWindow.refresh();
        this._ratesWindow.open();
        this._ratesWindow.activate();
        this._ratesWindow.select(0);
    };

    Scene_Gacha.prototype.closeRates = function () {
        this._ratesWindow.close();
        this._ratesWindow.deactivate();
        this._commandWindow.activate();
    };

    window.Scene_Gacha = Scene_Gacha; // exposed so you can SceneManager.push(Scene_Gacha)
})();
