//=============================================================================
// SimpleMerge.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] A simple two-slot merging system. Combine any two skills, items, weapons or armors into something new.
 * @author Claude
 *
 * @param --- Merging Rules ---
 * @default
 *
 * @param recipes
 * @text Recipes
 * @parent --- Merging Rules ---
 * @desc Hand-made combinations. These are always checked first.
 * @type struct<Recipe>[]
 * @default []
 *
 * @param tagRules
 * @text Tag Rules
 * @parent --- Merging Rules ---
 * @desc Fallback rules matched by <MergeTags:> notetags. Checked if no recipe matches.
 * @type struct<TagRule>[]
 * @default []
 *
 * @param useFamilyMerge
 * @text Family Tier Upgrades
 * @parent --- Merging Rules ---
 * @desc Last fallback. Two entries with the same <MergeFamily> and <MergeTier> produce the next tier up.
 * @type boolean
 * @default true
 *
 * @param orderMatters
 * @text Slot Order Matters
 * @parent --- Merging Rules ---
 * @desc ON: A+B and B+A are different combinations. OFF: order is ignored.
 * @type boolean
 * @default false
 *
 * @param --- Costs & Failure ---
 * @default
 *
 * @param defaultGoldCost
 * @text Default Gold Cost
 * @parent --- Costs & Failure ---
 * @desc Gold charged per merge when a recipe or rule does not set its own cost.
 * @type number
 * @min 0
 * @default 0
 *
 * @param consumeOnFail
 * @text Consume On Failure
 * @parent --- Costs & Failure ---
 * @desc ON: failed combinations still destroy the ingredients. Keep OFF for friendly experimenting.
 * @type boolean
 * @default false
 *
 * @param --- Access ---
 * @default
 *
 * @param showMenuCommand
 * @text Add To Main Menu
 * @parent --- Access ---
 * @type boolean
 * @default true
 *
 * @param menuCommandName
 * @text Menu Command Name
 * @parent --- Access ---
 * @type string
 * @default Merge
 *
 * @param menuSwitchId
 * @text Menu Switch
 * @parent --- Access ---
 * @desc Switch that must be ON for the menu command to appear. 0 = always show.
 * @type switch
 * @default 0
 *
 * @param --- Text & Sound ---
 * @default
 *
 * @param unknownText
 * @text Unknown Result Text
 * @parent --- Text & Sound ---
 * @type string
 * @default ? ? ?
 *
 * @param labelSlot1
 * @text Slot 1 Label
 * @parent --- Text & Sound ---
 * @type string
 * @default First
 *
 * @param labelSlot2
 * @text Slot 2 Label
 * @parent --- Text & Sound ---
 * @type string
 * @default Second
 *
 * @param labelResult
 * @text Result Label
 * @parent --- Text & Sound ---
 * @type string
 * @default Result
 *
 * @param textMergeCmd
 * @text "Merge" Command
 * @parent --- Text & Sound ---
 * @type string
 * @default Merge
 *
 * @param textClearCmd
 * @text "Clear" Command
 * @parent --- Text & Sound ---
 * @type string
 * @default Clear slots
 *
 * @param textPickTwo
 * @text Empty Slots Hint
 * @parent --- Text & Sound ---
 * @type string
 * @default Pick two things to combine. Nothing is lost if they don't react.
 * @desc Shown in the help window while the slots are not full.
 *
 * @param textSuccess
 * @text Success Message
 * @parent --- Text & Sound ---
 * @desc %1 = result name.
 * @type string
 * @default Made %1!
 *
 * @param textNewFind
 * @text First Discovery Message
 * @parent --- Text & Sound ---
 * @desc %1 = result name. Shown the first time a combination is found.
 * @type string
 * @default New combination found: %1!
 *
 * @param textFail
 * @text Failure Message
 * @parent --- Text & Sound ---
 * @type string
 * @default Those two don't react. Try something else.
 *
 * @param textNoGold
 * @text Not Enough Gold Message
 * @parent --- Text & Sound ---
 * @desc %1 = cost, %2 = currency unit.
 * @type string
 * @default You need %1 %2 for this merge.
 *
 * @param successSE
 * @text Success Sound
 * @parent --- Text & Sound ---
 * @type file
 * @dir audio/se/
 * @default Skill3
 *
 * @param failSE
 * @text Failure Sound
 * @parent --- Text & Sound ---
 * @type file
 * @dir audio/se/
 * @default Buzzer1
 *
 * @command openMerge
 * @text Open Merge Screen
 * @desc Opens the merging screen. Use this on an NPC or event.
 *
 * @command discover
 * @text Reveal Combination
 * @desc Marks a combination as already discovered, so its result is shown in the preview.
 *
 * @arg typeA
 * @text First Type
 * @type select
 * @option skill
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @arg idA
 * @text First ID
 * @type number
 * @min 1
 * @default 1
 *
 * @arg typeB
 * @text Second Type
 * @type select
 * @option skill
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @arg idB
 * @text Second ID
 * @type number
 * @min 1
 * @default 1
 *
 * @command resetDiscoveries
 * @text Forget All Discoveries
 * @desc Clears every discovered combination. Mostly useful for testing.
 *
 * @help
 * ============================================================================
 * SimpleMerge - two things in, one thing out.
 * ============================================================================
 *
 * The player picks two ingredients from one list. Skills, items, weapons and
 * armors can all be mixed together freely. Both ingredients are consumed and
 * the result appears. Results start hidden - the preview shows "? ? ?" until
 * the player actually tries the combination.
 *
 * ----------------------------------------------------------------------------
 * HOW A RESULT IS DECIDED
 * ----------------------------------------------------------------------------
 * Three passes, in this order. The first match wins.
 *
 *   1. Recipes    - exact pairs you wrote by hand in the Recipes parameter.
 *   2. Tag Rules  - broad rules matched against <MergeTags:> notetags.
 *   3. Family     - two entries sharing a <MergeFamily:> and <MergeTier:>
 *                   produce the same family one tier higher.
 *
 * If nothing matches, the merge fails. By default the ingredients are handed
 * back, so players can experiment without losing anything.
 *
 * ----------------------------------------------------------------------------
 * NOTETAGS (skills, items, weapons, armors)
 * ----------------------------------------------------------------------------
 *   <NoMerge>
 *     This entry can never be used as an ingredient. Good for quest items,
 *     key items and story skills.
 *
 *   <MergeTags: fire, blade>
 *     Free-form labels used by Tag Rules. As many as you like, comma separated.
 *
 *   <MergeFamily: emberblade>
 *   <MergeTier: 1>
 *     Used together for automatic tier upgrades. Two Tier 1 emberblades make
 *     the Tier 2 emberblade, two Tier 2 make Tier 3, and so on. You only need
 *     to tag the entries - no recipes required.
 *
 * ----------------------------------------------------------------------------
 * TAG RULE EXAMPLE
 * ----------------------------------------------------------------------------
 * Give every fire skill <MergeTags: fire> and every sword <MergeTags: blade>,
 * then write one Tag Rule with First Tag = fire, Second Tag = blade and a
 * weapon as the result. Now any fire skill combined with any sword makes that
 * weapon. Use * as a tag to mean "anything".
 *
 * ----------------------------------------------------------------------------
 * SKILLS
 * ----------------------------------------------------------------------------
 * Skills belong to an actor, so the merge screen always has a current actor.
 * Press Q and W (PageUp / PageDown) to switch between party members. Only
 * skills the actor personally learned can be used - skills granted by their
 * class, equipment or states are safe, as are Attack and Guard.
 *
 * A skill produced by a merge is learned by the actor shown on screen.
 *
 * ----------------------------------------------------------------------------
 * OPENING THE SCREEN
 * ----------------------------------------------------------------------------
 * Turn on "Add To Main Menu", or use the Open Merge Screen plugin command from
 * an event. Both can be used at once.
 *
 * ----------------------------------------------------------------------------
 * SCRIPT CALLS
 * ----------------------------------------------------------------------------
 *   SceneManager.push(Scene_Merge)          Open the screen.
 *   $gameSystem.mergeDiscoveries()          Array of discovered keys.
 *   $gameSystem.mergeDiscoveryCount()       How many combinations are known.
 *
 * A key looks like "i3+w5": s = skill, i = item, w = weapon, a = armor.
 * Use mergeDiscoveryCount() in a conditional branch to reward experimenters.
 *
 * ----------------------------------------------------------------------------
 * TERMS
 * ----------------------------------------------------------------------------
 * Free for commercial and non-commercial projects. Edit it as much as you like.
 */

/*~struct~Recipe:
 * @param label
 * @text Note To Self
 * @desc Only shown in this editor. Name it whatever helps you find it later.
 * @type string
 * @default New recipe
 *
 * @param typeA
 * @text First Type
 * @type select
 * @option skill
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @param idA
 * @text First ID
 * @desc Database ID of the first ingredient.
 * @type number
 * @min 1
 * @default 1
 *
 * @param typeB
 * @text Second Type
 * @type select
 * @option skill
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @param idB
 * @text Second ID
 * @desc Database ID of the second ingredient.
 * @type number
 * @min 1
 * @default 1
 *
 * @param resultType
 * @text Result Type
 * @type select
 * @option skill
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @param resultId
 * @text Result ID
 * @type number
 * @min 1
 * @default 1
 *
 * @param resultAmount
 * @text Result Amount
 * @desc How many are produced. Ignored for skills.
 * @type number
 * @min 1
 * @default 1
 *
 * @param goldCost
 * @text Gold Cost
 * @desc Gold charged for this merge. Leave at -1 to use the plugin default.
 * @type number
 * @min -1
 * @default -1
 *
 * @param startsKnown
 * @text Known From The Start
 * @desc ON: the result is visible in the preview before it is ever made.
 * @type boolean
 * @default false
 *
 * @param requiredSwitch
 * @text Required Switch
 * @desc This recipe only works while the switch is ON. 0 = always available.
 * @type switch
 * @default 0
 *
 * @param message
 * @text Custom Success Message
 * @desc Replaces the normal success line. %1 = result name. Leave blank for the default.
 * @type string
 * @default
 */

/*~struct~TagRule:
 * @param label
 * @text Note To Self
 * @type string
 * @default New rule
 *
 * @param tagA
 * @text First Tag
 * @desc Matches any ingredient carrying this <MergeTags> label. Use * for anything.
 * @type string
 * @default *
 *
 * @param tagB
 * @text Second Tag
 * @desc Matches any ingredient carrying this <MergeTags> label. Use * for anything.
 * @type string
 * @default *
 *
 * @param resultType
 * @text Result Type
 * @type select
 * @option skill
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @param resultId
 * @text Result ID
 * @type number
 * @min 1
 * @default 1
 *
 * @param resultAmount
 * @text Result Amount
 * @type number
 * @min 1
 * @default 1
 *
 * @param goldCost
 * @text Gold Cost
 * @desc Leave at -1 to use the plugin default.
 * @type number
 * @min -1
 * @default -1
 *
 * @param requiredSwitch
 * @text Required Switch
 * @type switch
 * @default 0
 *
 * @param message
 * @text Custom Success Message
 * @desc %1 = result name. Leave blank for the default.
 * @type string
 * @default
 */

var Imported = Imported || {};
Imported.SimpleMerge = true;

var SimpleMerge = SimpleMerge || {};

(() => {
    "use strict";

    //-------------------------------------------------------------------------
    // Parameters
    //-------------------------------------------------------------------------

    const script = document.currentScript;
    const pluginName = script
        ? decodeURIComponent(script.src.split("/").pop().replace(/\.js$/, ""))
        : "SimpleMerge";

    const raw = PluginManager.parameters(pluginName);

    const parseList = (text) => {
        try {
            return JSON.parse(text || "[]").map((entry) => JSON.parse(entry));
        } catch (e) {
            console.error(pluginName + ": could not read a parameter list.", e);
            return [];
        }
    };

    const P = SimpleMerge.params = {
        recipes: parseList(raw.recipes),
        tagRules: parseList(raw.tagRules),
        useFamilyMerge: raw.useFamilyMerge !== "false",
        orderMatters: raw.orderMatters === "true",
        defaultGoldCost: Number(raw.defaultGoldCost || 0),
        consumeOnFail: raw.consumeOnFail === "true",
        showMenuCommand: raw.showMenuCommand !== "false",
        menuCommandName: raw.menuCommandName || "Merge",
        menuSwitchId: Number(raw.menuSwitchId || 0),
        unknownText: raw.unknownText || "? ? ?",
        labelSlot1: raw.labelSlot1 || "First",
        labelSlot2: raw.labelSlot2 || "Second",
        labelResult: raw.labelResult || "Result",
        textMergeCmd: raw.textMergeCmd || "Merge",
        textClearCmd: raw.textClearCmd || "Clear slots",
        textPickTwo: raw.textPickTwo || "Pick two things to combine.",
        textSuccess: raw.textSuccess || "Made %1!",
        textNewFind: raw.textNewFind || "New combination found: %1!",
        textFail: raw.textFail || "Those two don't react.",
        textNoGold: raw.textNoGold || "You need %1 %2 for this merge.",
        successSE: raw.successSE || "Skill3",
        failSE: raw.failSE || "Buzzer1"
    };

    // Normalise recipe / rule numbers once, at boot.
    for (const r of P.recipes) {
        r.idA = Number(r.idA);
        r.idB = Number(r.idB);
        r.resultId = Number(r.resultId);
        r.resultAmount = Number(r.resultAmount || 1);
        r.goldCost = Number(r.goldCost);
        r.requiredSwitch = Number(r.requiredSwitch || 0);
        r.startsKnown = r.startsKnown === "true";
    }
    for (const r of P.tagRules) {
        r.tagA = String(r.tagA || "*").trim().toLowerCase();
        r.tagB = String(r.tagB || "*").trim().toLowerCase();
        r.resultId = Number(r.resultId);
        r.resultAmount = Number(r.resultAmount || 1);
        r.goldCost = Number(r.goldCost);
        r.requiredSwitch = Number(r.requiredSwitch || 0);
    }

    //-------------------------------------------------------------------------
    // Core helpers
    //-------------------------------------------------------------------------

    const TYPE_LETTER = { skill: "s", item: "i", weapon: "w", armor: "a" };

    const M = SimpleMerge.core = {};

    M.database = function (type) {
        switch (type) {
            case "skill": return $dataSkills;
            case "item": return $dataItems;
            case "weapon": return $dataWeapons;
            case "armor": return $dataArmors;
        }
        return null;
    };

    M.objectOf = function (type, id) {
        const db = M.database(type);
        return db ? db[Number(id)] : null;
    };

    M.tokenOf = function (ing) {
        return TYPE_LETTER[ing.type] + ing.id;
    };

    // A stable, order-independent (unless configured otherwise) identifier.
    M.keyOf = function (a, b) {
        const tokens = [M.tokenOf(a), M.tokenOf(b)];
        if (!P.orderMatters) tokens.sort();
        return tokens.join("+");
    };

    // Notetags are read from .meta, which RPG Maker fills in automatically.
    // Matching is case-insensitive so <mergetags:> works too.
    M.meta = function (obj, key) {
        if (!obj || !obj.meta) return undefined;
        const wanted = key.toLowerCase();
        for (const k of Object.keys(obj.meta)) {
            if (k.toLowerCase() === wanted) return obj.meta[k];
        }
        return undefined;
    };

    M.isBlocked = function (obj) {
        return M.meta(obj, "NoMerge") !== undefined;
    };

    M.tagsOf = function (obj) {
        if (!obj) return [];
        if (obj._smTags) return obj._smTags;
        const value = M.meta(obj, "MergeTags");
        const tags = typeof value === "string"
            ? value.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t)
            : [];
        obj._smTags = tags;
        return tags;
    };

    M.familyOf = function (obj) {
        const value = M.meta(obj, "MergeFamily");
        return typeof value === "string" ? value.trim().toLowerCase() : null;
    };

    M.tierOf = function (obj) {
        const value = M.meta(obj, "MergeTier");
        const n = Number(value);
        return isFinite(n) && value !== undefined && value !== true ? n : null;
    };

    M.switchOk = function (id) {
        return !id || $gameSwitches.value(id);
    };

    M.costOf = function (entry) {
        const own = Number(entry.goldCost);
        return own >= 0 ? own : P.defaultGoldCost;
    };

    //-------------------------------------------------------------------------
    // Result resolution: recipes, then tag rules, then family tiers.
    //-------------------------------------------------------------------------

    M.recipeMap = null;

    M.buildRecipeMap = function () {
        M.recipeMap = {};
        for (const r of P.recipes) {
            const key = M.keyOf({ type: r.typeA, id: r.idA }, { type: r.typeB, id: r.idB });
            if (!M.recipeMap[key]) M.recipeMap[key] = [];
            M.recipeMap[key].push(r);
        }
    };

    M.findRecipe = function (a, b) {
        if (!M.recipeMap) M.buildRecipeMap();
        const list = M.recipeMap[M.keyOf(a, b)];
        if (!list) return null;
        return list.find((r) => M.switchOk(r.requiredSwitch)) || null;
    };

    M.findTagRule = function (a, b) {
        const tagsA = M.tagsOf(M.objectOf(a.type, a.id));
        const tagsB = M.tagsOf(M.objectOf(b.type, b.id));
        const has = (tags, tag) => tag === "*" || tags.includes(tag);
        for (const rule of P.tagRules) {
            if (!M.switchOk(rule.requiredSwitch)) continue;
            const direct = has(tagsA, rule.tagA) && has(tagsB, rule.tagB);
            const swapped = !P.orderMatters && has(tagsB, rule.tagA) && has(tagsA, rule.tagB);
            if (direct || swapped) return rule;
        }
        return null;
    };

    M.findFamilyUpgrade = function (a, b) {
        if (!P.useFamilyMerge) return null;
        const objA = M.objectOf(a.type, a.id);
        const objB = M.objectOf(b.type, b.id);
        const family = M.familyOf(objA);
        const tier = M.tierOf(objA);
        if (!family || tier === null) return null;
        if (M.familyOf(objB) !== family || M.tierOf(objB) !== tier) return null;

        // Prefer a result of the same type as the first ingredient.
        const order = [a.type, "weapon", "armor", "item", "skill"];
        for (const type of order) {
            const db = M.database(type);
            if (!db) continue;
            for (let id = 1; id < db.length; id++) {
                const entry = db[id];
                if (!entry || !entry.name) continue;
                if (M.familyOf(entry) === family && M.tierOf(entry) === tier + 1) {
                    return { resultType: type, resultId: id, resultAmount: 1, goldCost: -1, message: "" };
                }
            }
        }
        return null;
    };

    // Returns null, or { type, id, amount, gold, message, object, startsKnown }
    M.resolve = function (a, b) {
        if (!a || !b) return null;
        const objA = M.objectOf(a.type, a.id);
        const objB = M.objectOf(b.type, b.id);
        if (!objA || !objB || M.isBlocked(objA) || M.isBlocked(objB)) return null;

        const entry = M.findRecipe(a, b) || M.findTagRule(a, b) || M.findFamilyUpgrade(a, b);
        if (!entry) return null;

        const object = M.objectOf(entry.resultType, entry.resultId);
        if (!object) return null;

        return {
            type: entry.resultType,
            id: Number(entry.resultId),
            amount: entry.resultType === "skill" ? 1 : Number(entry.resultAmount || 1),
            gold: M.costOf(entry),
            message: entry.message || "",
            startsKnown: !!entry.startsKnown,
            object: object
        };
    };

    M.isKnown = function (a, b) {
        const result = M.resolve(a, b);
        if (!result) return false;
        if (result.startsKnown) return true;
        return $gameSystem.isMergeKnown(M.keyOf(a, b));
    };

    //-------------------------------------------------------------------------
    // Ingredient availability
    //-------------------------------------------------------------------------

    M.canUseSkill = function (actor, skill) {
        if (!actor || !skill || M.isBlocked(skill)) return false;
        if (skill.id === actor.attackSkillId() || skill.id === actor.guardSkillId()) return false;
        // Only personally learned skills, so class and equipment skills stay safe.
        return actor._skills.includes(skill.id);
    };

    M.ownedCount = function (actor, type, id) {
        const obj = M.objectOf(type, id);
        if (!obj || M.isBlocked(obj)) return 0;
        if (type === "skill") return M.canUseSkill(actor, obj) ? 1 : 0;
        return $gameParty.numItems(obj);
    };

    M.consume = function (actor, ing) {
        const obj = M.objectOf(ing.type, ing.id);
        if (!obj) return;
        if (ing.type === "skill") {
            actor.forgetSkill(obj.id);
        } else {
            $gameParty.loseItem(obj, 1, false);
        }
    };

    M.grant = function (actor, result) {
        if (result.type === "skill") {
            actor.learnSkill(result.id);
        } else {
            $gameParty.gainItem(result.object, result.amount);
        }
    };

    //-------------------------------------------------------------------------
    // Save data
    //-------------------------------------------------------------------------

    Game_System.prototype.mergeDiscoveries = function () {
        if (!this._mergeDiscoveries) this._mergeDiscoveries = [];
        return this._mergeDiscoveries;
    };

    Game_System.prototype.isMergeKnown = function (key) {
        return this.mergeDiscoveries().includes(key);
    };

    Game_System.prototype.addMergeKnown = function (key) {
        const list = this.mergeDiscoveries();
        if (!list.includes(key)) {
            list.push(key);
            return true;
        }
        return false;
    };

    Game_System.prototype.mergeDiscoveryCount = function () {
        return this.mergeDiscoveries().length;
    };

    Game_System.prototype.clearMergeDiscoveries = function () {
        this._mergeDiscoveries = [];
    };

    //-------------------------------------------------------------------------
    // Plugin commands
    //-------------------------------------------------------------------------

    PluginManager.registerCommand(pluginName, "openMerge", () => {
        SceneManager.push(Scene_Merge);
    });

    PluginManager.registerCommand(pluginName, "discover", (args) => {
        const a = { type: args.typeA, id: Number(args.idA) };
        const b = { type: args.typeB, id: Number(args.idB) };
        $gameSystem.addMergeKnown(M.keyOf(a, b));
    });

    PluginManager.registerCommand(pluginName, "resetDiscoveries", () => {
        $gameSystem.clearMergeDiscoveries();
    });

    //-------------------------------------------------------------------------
    // Window_MergeSlots - the two ingredients and the result preview
    //-------------------------------------------------------------------------

    function Window_MergeSlots() {
        this.initialize(...arguments);
    }

    Window_MergeSlots.prototype = Object.create(Window_Base.prototype);
    Window_MergeSlots.prototype.constructor = Window_MergeSlots;

    Window_MergeSlots.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._slots = [null, null];
        this._actor = null;
        this.refresh();
    };

    Window_MergeSlots.prototype.setSlots = function (slots) {
        this._slots = slots;
        this.refresh();
    };

    Window_MergeSlots.prototype.setActor = function (actor) {
        this._actor = actor;
        this.refresh();
    };

    Window_MergeSlots.prototype.columnWidth = function () {
        return Math.floor((this.innerWidth - 96) / 3);
    };

    Window_MergeSlots.prototype.columnX = function (index) {
        return (this.columnWidth() + 48) * index;
    };

    Window_MergeSlots.prototype.refresh = function () {
        this.contents.clear();
        const cw = this.columnWidth();
        const lh = this.lineHeight();

        this.drawColumnLabel(P.labelSlot1, this.columnX(0), cw);
        this.drawColumnLabel(P.labelSlot2, this.columnX(1), cw);
        this.drawColumnLabel(P.labelResult, this.columnX(2), cw);

        this.drawIngredient(this._slots[0], this.columnX(0), lh, cw);
        this.drawIngredient(this._slots[1], this.columnX(1), lh, cw);
        this.drawResult(this.columnX(2), lh, cw);

        this.drawConnector("+", this.columnX(0) + cw, lh);
        this.drawConnector("=", this.columnX(1) + cw, lh);

        this.drawFooter(lh * 2);
    };

    Window_MergeSlots.prototype.drawColumnLabel = function (text, x, width) {
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = $gameSystem.mainFontSize() - 6;
        this.drawText(text, x, 0, width, "left");
        this.resetFontSettings();
    };

    Window_MergeSlots.prototype.drawConnector = function (symbol, x, y) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(symbol, x, y, 48, "center");
        this.resetTextColor();
    };

    Window_MergeSlots.prototype.drawIngredient = function (slot, x, y, width) {
        if (!slot) {
            this.changePaintOpacity(false);
            this.drawText("\u2014", x, y, width, "left");
            this.changePaintOpacity(true);
            return;
        }
        const obj = M.objectOf(slot.type, slot.id);
        if (obj) this.drawItemName(obj, x, y, width);
    };

    Window_MergeSlots.prototype.drawResult = function (x, y, width) {
        const [a, b] = this._slots;
        if (!a || !b) {
            this.changePaintOpacity(false);
            this.drawText("\u2014", x, y, width, "left");
            this.changePaintOpacity(true);
            return;
        }
        if (M.isKnown(a, b)) {
            const result = M.resolve(a, b);
            this.drawItemName(result.object, x, y, width);
            if (result.amount > 1) {
                this.drawText("\u00d7" + result.amount, x, y, width, "right");
            }
        } else {
            this.changeTextColor(ColorManager.textColor(6));
            this.drawText(P.unknownText, x, y, width, "left");
            this.resetTextColor();
        }
    };

    Window_MergeSlots.prototype.drawFooter = function (y) {
        const lineWidth = this.innerWidth;
        this.contents.fontSize = $gameSystem.mainFontSize() - 6;

        if (this._actor) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("Q/W", 0, y, 60, "left");
            this.resetTextColor();
            this.drawText(this._actor.name(), 64, y, 300, "left");
        }

        const cost = this.currentCost();
        if (cost > 0) {
            const text = cost + " " + TextManager.currencyUnit;
            this.changeTextColor(
                $gameParty.gold() >= cost ? ColorManager.normalColor() : ColorManager.crisisColor()
            );
            this.drawText(text, 0, y, lineWidth, "right");
            this.resetTextColor();
        }
        this.resetFontSettings();
    };

    Window_MergeSlots.prototype.currentCost = function () {
        const [a, b] = this._slots;
        if (!a || !b || !M.isKnown(a, b)) return 0;
        const result = M.resolve(a, b);
        return result ? result.gold : 0;
    };

    //-------------------------------------------------------------------------
    // Window_MergeCategory
    //-------------------------------------------------------------------------

    function Window_MergeCategory() {
        this.initialize(...arguments);
    }

    Window_MergeCategory.prototype = Object.create(Window_HorzCommand.prototype);
    Window_MergeCategory.prototype.constructor = Window_MergeCategory;

    Window_MergeCategory.prototype.maxCols = function () {
        return 5;
    };

    Window_MergeCategory.prototype.makeCommandList = function () {
        this.addCommand("All", "all");
        this.addCommand(TextManager.skill, "skill");
        this.addCommand(TextManager.item, "item");
        this.addCommand(TextManager.weapon, "weapon");
        this.addCommand(TextManager.armor, "armor");
    };

    Window_MergeCategory.prototype.update = function () {
        Window_HorzCommand.prototype.update.call(this);
        if (this._listWindow) {
            this._listWindow.setCategory(this.currentSymbol());
        }
    };

    Window_MergeCategory.prototype.setListWindow = function (window) {
        this._listWindow = window;
        this.callUpdateHelp();
    };

    //-------------------------------------------------------------------------
    // Window_MergeList
    //-------------------------------------------------------------------------

    function Window_MergeList() {
        this.initialize(...arguments);
    }

    Window_MergeList.prototype = Object.create(Window_Selectable.prototype);
    Window_MergeList.prototype.constructor = Window_MergeList;

    Window_MergeList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._category = "all";
        this._actor = null;
        this._slots = [null, null];
        this._data = [];
    };

    Window_MergeList.prototype.setCategory = function (category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
            this.scrollTo(0, 0);
        }
    };

    Window_MergeList.prototype.setActor = function (actor) {
        this._actor = actor;
        this.refresh();
    };

    Window_MergeList.prototype.setSlots = function (slots) {
        this._slots = slots;
        this.refresh();
    };

    Window_MergeList.prototype.maxCols = function () {
        return 2;
    };

    Window_MergeList.prototype.maxItems = function () {
        return this._data.length;
    };

    Window_MergeList.prototype.item = function () {
        return this.itemAt(this.index());
    };

    Window_MergeList.prototype.itemAt = function (index) {
        return index >= 0 && this._data[index] ? this._data[index] : null;
    };

    Window_MergeList.prototype.usedInSlots = function (type, id) {
        return this._slots.filter((s) => s && s.type === type && s.id === id).length;
    };

    Window_MergeList.prototype.includesType = function (type) {
        return this._category === "all" || this._category === type;
    };

    Window_MergeList.prototype.makeItemList = function () {
        this._data = [];
        const push = (type, obj) => {
            if (!obj || !obj.name || M.isBlocked(obj)) return;
            const free = M.ownedCount(this._actor, type, obj.id) - this.usedInSlots(type, obj.id);
            if (free > 0) this._data.push({ type: type, id: obj.id, object: obj, count: free });
        };

        if (this.includesType("skill") && this._actor) {
            for (const id of this._actor._skills) {
                const skill = $dataSkills[id];
                if (M.canUseSkill(this._actor, skill)) push("skill", skill);
            }
        }
        if (this.includesType("item")) {
            for (const item of $gameParty.items()) push("item", item);
        }
        if (this.includesType("weapon")) {
            for (const weapon of $gameParty.weapons()) push("weapon", weapon);
        }
        if (this.includesType("armor")) {
            for (const armor of $gameParty.armors()) push("armor", armor);
        }
    };

    Window_MergeList.prototype.drawItem = function (index) {
        const entry = this.itemAt(index);
        if (!entry) return;
        const rect = this.itemLineRect(index);
        const countWidth = this.textWidth("000");
        this.drawItemName(entry.object, rect.x, rect.y, rect.width - countWidth);
        if (entry.type !== "skill") {
            this.drawText(entry.count, rect.x + rect.width - countWidth, rect.y, countWidth, "right");
        }
    };

    Window_MergeList.prototype.updateHelp = function () {
        const entry = this.item();
        this.setHelpWindowItem(entry ? entry.object : null);
    };

    Window_MergeList.prototype.refresh = function () {
        this.makeItemList();
        // The list shrinks as ingredients are staged or used up.
        if (this.index() >= this.maxItems()) {
            this.select(Math.max(0, this.maxItems() - 1));
        }
        Window_Selectable.prototype.refresh.call(this);
    };

    //-------------------------------------------------------------------------
    // Window_MergeConfirm
    //-------------------------------------------------------------------------

    function Window_MergeConfirm() {
        this.initialize(...arguments);
    }

    Window_MergeConfirm.prototype = Object.create(Window_Command.prototype);
    Window_MergeConfirm.prototype.constructor = Window_MergeConfirm;

    Window_MergeConfirm.prototype.initialize = function (rect) {
        Window_Command.prototype.initialize.call(this, rect);
        this.openness = 0;
        this.deactivate();
    };

    Window_MergeConfirm.prototype.makeCommandList = function () {
        this.addCommand(P.textMergeCmd, "merge");
        this.addCommand(P.textClearCmd, "clear");
    };

    //-------------------------------------------------------------------------
    // Scene_Merge
    //-------------------------------------------------------------------------

    function Scene_Merge() {
        this.initialize(...arguments);
    }

    window.Scene_Merge = Scene_Merge;
    SimpleMerge.Scene_Merge = Scene_Merge;

    Scene_Merge.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Merge.prototype.constructor = Scene_Merge;

    Scene_Merge.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
        this._slots = [null, null];
    };

    Scene_Merge.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createSlotWindow();
        this.createCategoryWindow();
        this.createListWindow();
        this.createConfirmWindow();
        this._categoryWindow.setListWindow(this._listWindow);
        this.refreshAll();
        this.showHint();
    };

    Scene_Merge.prototype.start = function () {
        Scene_MenuBase.prototype.start.call(this);
        this._listWindow.refresh();
        this._categoryWindow.activate();
    };

    Scene_Merge.prototype.createSlotWindow = function () {
        const rect = this.slotWindowRect();
        this._slotWindow = new Window_MergeSlots(rect);
        this.addWindow(this._slotWindow);
    };

    Scene_Merge.prototype.slotWindowRect = function () {
        const wy = this.mainAreaTop();
        const wh = this.calcWindowHeight(3, false);
        return new Rectangle(0, wy, Graphics.boxWidth, wh);
    };

    Scene_Merge.prototype.createCategoryWindow = function () {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_MergeCategory(rect);
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_Merge.prototype.categoryWindowRect = function () {
        const wy = this._slotWindow.y + this._slotWindow.height;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(0, wy, Graphics.boxWidth, wh);
    };

    Scene_Merge.prototype.createListWindow = function () {
        const rect = this.listWindowRect();
        this._listWindow = new Window_MergeList(rect);
        this._listWindow.setHelpWindow(this._helpWindow);
        this._listWindow.setHandler("ok", this.onListOk.bind(this));
        this._listWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._listWindow.setHandler("pagedown", this.onNextActor.bind(this));
        this._listWindow.setHandler("pageup", this.onPreviousActor.bind(this));
        this.addWindow(this._listWindow);
    };

    Scene_Merge.prototype.listWindowRect = function () {
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(0, wy, Graphics.boxWidth, wh);
    };

    Scene_Merge.prototype.createConfirmWindow = function () {
        const rect = this.confirmWindowRect();
        this._confirmWindow = new Window_MergeConfirm(rect);
        this._confirmWindow.setHandler("merge", this.onConfirmMerge.bind(this));
        this._confirmWindow.setHandler("clear", this.onConfirmClear.bind(this));
        this._confirmWindow.setHandler("cancel", this.onConfirmCancel.bind(this));
        this.addWindow(this._confirmWindow);
    };

    Scene_Merge.prototype.confirmWindowRect = function () {
        const ww = 300;
        const wh = this.calcWindowHeight(2, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this._listWindow.y + Math.floor((this._listWindow.height - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Merge.prototype.refreshAll = function () {
        this._slotWindow.setActor(this._actor);
        this._slotWindow.setSlots(this._slots);
        this._listWindow.setActor(this._actor);
        this._listWindow.setSlots(this._slots);
    };

    Scene_Merge.prototype.showHint = function () {
        this._helpWindow.setText(P.textPickTwo);
    };

    Scene_Merge.prototype.onActorChange = function () {
        Scene_MenuBase.prototype.onActorChange.call(this);
        // Skills belong to the previous actor, so drop anything staged.
        this._slots = [null, null];
        this.refreshAll();
        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_Merge.prototype.onNextActor = function () {
        this.nextActor();
    };

    Scene_Merge.prototype.onPreviousActor = function () {
        this.previousActor();
    };

    Scene_Merge.prototype.onCategoryOk = function () {
        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_Merge.prototype.onListOk = function () {
        const entry = this._listWindow.item();
        if (!entry) {
            this._listWindow.activate();
            return;
        }
        const slotIndex = this._slots[0] ? 1 : 0;
        this._slots[slotIndex] = { type: entry.type, id: entry.id };
        this.refreshAll();

        if (this._slots[0] && this._slots[1]) {
            this.openConfirm();
        } else {
            this._listWindow.activate();
        }
    };

    Scene_Merge.prototype.onListCancel = function () {
        if (this._slots[0] || this._slots[1]) {
            this.clearSlots();
            this._listWindow.activate();
        } else {
            this._listWindow.deselect();
            this._categoryWindow.activate();
            this.showHint();
        }
    };

    Scene_Merge.prototype.openConfirm = function () {
        this._confirmWindow.select(0);
        this._confirmWindow.open();
        this._confirmWindow.activate();
    };

    Scene_Merge.prototype.closeConfirm = function () {
        this._confirmWindow.close();
        this._confirmWindow.deactivate();
    };

    Scene_Merge.prototype.clearSlots = function () {
        this._slots = [null, null];
        this.refreshAll();
        this.showHint();
    };

    Scene_Merge.prototype.onConfirmClear = function () {
        this.closeConfirm();
        this.clearSlots();
        this._listWindow.activate();
    };

    Scene_Merge.prototype.onConfirmCancel = function () {
        this.closeConfirm();
        this._slots[1] = null;
        this.refreshAll();
        this._listWindow.activate();
    };

    Scene_Merge.prototype.onConfirmMerge = function () {
        this.closeConfirm();
        this.doMerge();
        this._listWindow.activate();
    };

    Scene_Merge.prototype.doMerge = function () {
        const [a, b] = this._slots;
        const result = M.resolve(a, b);

        if (!result) {
            AudioManager.playSe({ name: P.failSE, volume: 90, pitch: 100, pan: 0 });
            if (P.consumeOnFail) {
                M.consume(this._actor, a);
                M.consume(this._actor, b);
            }
            this._helpWindow.setText(P.textFail);
            this._slots = [null, null];
            this.refreshAll();
            return;
        }

        if (result.gold > 0 && $gameParty.gold() < result.gold) {
            AudioManager.playSe({ name: P.failSE, volume: 90, pitch: 100, pan: 0 });
            this._helpWindow.setText(
                P.textNoGold.format(result.gold, TextManager.currencyUnit)
            );
            return;
        }

        const key = M.keyOf(a, b);
        const isNew = !$gameSystem.isMergeKnown(key);

        if (result.gold > 0) $gameParty.loseGold(result.gold);
        M.consume(this._actor, a);
        M.consume(this._actor, b);
        M.grant(this._actor, result);
        $gameSystem.addMergeKnown(key);

        AudioManager.playSe({ name: P.successSE, volume: 90, pitch: 100, pan: 0 });

        const name = "\\C[3]" + result.object.name + "\\C[0]";
        let text;
        if (result.message) {
            text = result.message.format(result.object.name);
        } else if (isNew) {
            text = P.textNewFind.format(name);
        } else {
            text = P.textSuccess.format(name);
        }
        this._helpWindow.setText(text);

        this._slots = [null, null];
        this.refreshAll();
    };

    //-------------------------------------------------------------------------
    // Main menu integration
    //-------------------------------------------------------------------------

    const _Window_MenuCommand_addOriginalCommands =
        Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function () {
        _Window_MenuCommand_addOriginalCommands.call(this);
        if (P.showMenuCommand && M.switchOk(P.menuSwitchId)) {
            this.addCommand(P.menuCommandName, "simpleMerge", true);
        }
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function () {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler("simpleMerge", () => {
            SceneManager.push(Scene_Merge);
        });
    };

    //-------------------------------------------------------------------------
    // Rebuild caches when a new game or save is loaded.
    //-------------------------------------------------------------------------

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DataManager_createGameObjects.call(this);
        M.recipeMap = null;
    };
})();
