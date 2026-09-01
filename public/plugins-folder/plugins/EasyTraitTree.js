/*:
 * @target MZ
 * @plugindesc Easy Trait Tree v1.0.0 - Grim Dawn / Ancestors style branching trait trees, one per actor, with prerequisite links.
 * @author Claude
 * @url
 *
 * @help
 * ============================================================================
 * Easy Trait Tree
 * ============================================================================
 * A simple, node-based "trait tree" system. Each actor gets ONE tree made of
 * multiple branches. Players spend Trait Points to add ranks to nodes; a node
 * only unlocks once every node listed as its prerequisite has at least 1 rank
 * (classic Grim Dawn / Ancestors constellation feel).
 *
 * ----------------------------------------------------------------------------
 * QUICK START (all in the Plugin Manager - no coding, no note tags needed)
 * ----------------------------------------------------------------------------
 * 1. Open this plugin's parameters and edit "Trees".
 * 2. Add a Tree. Give it an ID (e.g. "warrior") and a name.
 * 3. Add Nodes to the tree. For each node set:
 *      - ID (unique inside this tree, e.g. "n1")
 *      - Tier (row): 0 = top row, 1 = next row down, etc.
 *      - Column (x slot): 0,1,2... spreads nodes/branches left to right.
 *      - Prerequisite Node IDs: the node(s) that must be started first.
 *      - Effects: flat params, % params, ex/sp-params, element resist,
 *        skills to learn, passive states, or advanced raw traits.
 * 4. Edit "Actor Tree Assignments" to give each actor a tree by ID.
 *      (You can also put <TraitTree: warrior> in an actor's note box.)
 * 5. Play! Open the tree from the menu command "Traits", or via the
 *      "Open Trait Tree" plugin command.
 *
 * ----------------------------------------------------------------------------
 * EARNING POINTS
 * ----------------------------------------------------------------------------
 *  - Automatically: set "Points Per Level" (given on each level up).
 *  - By event: use the "Gain / Set Trait Points" plugin commands.
 *  - From items: put <TraitTreePoints: 3> in an item's note box. When the item
 *    is used on an actor, that actor gains 3 points.
 *
 * ----------------------------------------------------------------------------
 * EFFECT SEMANTICS (values are PER RANK and stack with rank)
 * ----------------------------------------------------------------------------
 *  - Flat Param: +N added to the base parameter (e.g. +5 ATK at rank 3 = +15).
 *  - Percent Param: +N% multiplier (e.g. +10% ATK per rank).
 *  - Ex-Param (HIT, EVA, CRI...): +N% added.
 *  - Sp-Param (recovery, mp cost...): +N% multiplier.
 *  - Element Resist: reduces incoming damage of that element by N% per rank.
 *    Use a negative number to create a weakness.
 *  - Learn Skills: taught while the node has >= 1 rank (removed on reset).
 *  - Passive States: applied while the node has >= 1 rank.
 *  - Advanced Raw Traits: any engine trait via code / dataId / value * rank.
 *
 * ----------------------------------------------------------------------------
 * RESET / RESPEC
 * ----------------------------------------------------------------------------
 *  - Toggle "Allow Reset In Menu". If on, press Shift (pageup key) inside the
 *    tree screen to reset. "Refund On Reset" returns spent points; set a gold
 *    cost with "Reset Gold Cost".
 *  - Or use the "Reset Trait Tree" plugin command from an event.
 *
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * ----------------------------------------------------------------------------
 * Free for commercial and non-commercial RPG Maker MZ projects. Edit freely.
 *
 * @command openTree
 * @text Open Trait Tree
 * @desc Opens the trait tree screen for one actor.
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 0
 *
 * @command gainPoints
 * @text Gain Trait Points
 * @desc Adds trait points to an actor.
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 0
 * @arg amount
 * @text Amount
 * @type number
 * @min -9999
 * @default 1
 *
 * @command setPoints
 * @text Set Trait Points
 * @desc Sets an actor's available trait points to a value.
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 0
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @default 0
 *
 * @command resetTree
 * @text Reset Trait Tree
 * @desc Clears all ranks in the actor's tree (respec).
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 0
 *
 * @command setActorTree
 * @text Assign Tree To Actor
 * @desc Changes which tree an actor uses (by tree ID).
 * @arg actorId
 * @text Actor
 * @type actor
 * @default 0
 * @arg treeId
 * @text Tree ID
 * @type string
 * @default
 *
 * @param trees
 * @text Trees
 * @type struct<Tree>[]
 * @desc Every trait tree in your game.
 * @default []
 *
 * @param actorAssignments
 * @text Actor Tree Assignments
 * @type struct<ActorTree>[]
 * @desc Maps each actor to a tree by ID. (An actor note <TraitTree: id> overrides this.)
 * @default []
 *
 * @param pointsPerLevel
 * @text Points Per Level
 * @type number
 * @min 0
 * @desc Trait points gained automatically on each level up.
 * @default 1
 *
 * @param startingPoints
 * @text Starting Points
 * @type number
 * @min 0
 * @desc Trait points an actor begins the game with.
 * @default 0
 *
 * @param menuCommandName
 * @text Menu Command Name
 * @desc Name of the command added to the main menu. Leave blank to hide it.
 * @default Traits
 *
 * @param menuSwitch
 * @text Menu Show Switch
 * @type switch
 * @desc If set, the menu command only appears when this switch is ON. 0 = always show.
 * @default 0
 *
 * @param allowReset
 * @text Allow Reset In Menu
 * @type boolean
 * @on Allow
 * @off Disable
 * @desc Let players reset their tree from the tree screen (press Shift).
 * @default true
 *
 * @param refundOnReset
 * @text Refund On Reset
 * @type boolean
 * @on Refund
 * @off Lose Points
 * @desc Return spent points to the pool when resetting.
 * @default true
 *
 * @param resetGoldCost
 * @text Reset Gold Cost
 * @type number
 * @min 0
 * @desc Gold charged to reset a tree. 0 = free.
 * @default 0
 *
 * @param nodeSize
 * @text Node Size (px)
 * @type number
 * @min 24
 * @default 56
 *
 * @param colSpacing
 * @text Column Spacing (px)
 * @type number
 * @min 32
 * @default 110
 *
 * @param rowSpacing
 * @text Row Spacing (px)
 * @type number
 * @min 32
 * @default 110
 */
/*~struct~Tree:
 * @param id
 * @text Tree ID
 * @desc Unique identifier, referenced by actor assignments and plugin commands.
 * @default tree1
 *
 * @param name
 * @text Display Name
 * @default New Tree
 *
 * @param description
 * @text Description
 * @type note
 * @default ""
 *
 * @param nodes
 * @text Nodes
 * @type struct<Node>[]
 * @default []
 */
/*~struct~Node:
 * @param id
 * @text Node ID
 * @desc Unique within this tree. Referenced by other nodes' prerequisites.
 * @default n1
 *
 * @param name
 * @text Name
 * @default New Node
 *
 * @param description
 * @text Description
 * @type note
 * @default ""
 *
 * @param icon
 * @text Icon Index
 * @type number
 * @min 0
 * @default 0
 *
 * @param tier
 * @text Tier (Row)
 * @type number
 * @min 0
 * @desc Vertical slot. 0 = top row.
 * @default 0
 *
 * @param column
 * @text Column (X Slot)
 * @type number
 * @min 0
 * @desc Horizontal slot. Spread branches by using different columns.
 * @default 0
 *
 * @param maxRank
 * @text Max Rank
 * @type number
 * @min 1
 * @desc How many points can be invested here.
 * @default 1
 *
 * @param cost
 * @text Cost Per Rank
 * @type number
 * @min 0
 * @default 1
 *
 * @param requires
 * @text Prerequisite Node IDs
 * @type string[]
 * @desc Node IDs in this tree that need >= 1 rank before this one unlocks. Empty = a root node.
 * @default []
 *
 * @param requiredTreePoints
 * @text Required Points In Tree
 * @type number
 * @min 0
 * @desc Minimum total points already spent in this tree to unlock this node. 0 = none.
 * @default 0
 *
 * @param flatParams
 * @text Flat Param Bonuses
 * @type struct<ParamBonus>[]
 * @default []
 *
 * @param rateParams
 * @text Percent Param Bonuses
 * @type struct<ParamRate>[]
 * @default []
 *
 * @param xparams
 * @text Ex-Parameter Bonuses
 * @type struct<XParam>[]
 * @default []
 *
 * @param sparams
 * @text Sp-Parameter Bonuses
 * @type struct<SParam>[]
 * @default []
 *
 * @param elementRates
 * @text Element Resistances
 * @type struct<ElementRate>[]
 * @default []
 *
 * @param learnSkills
 * @text Learn Skills
 * @type skill[]
 * @default []
 *
 * @param passiveStates
 * @text Passive States
 * @type state[]
 * @default []
 *
 * @param rawTraits
 * @text Advanced Raw Traits
 * @type struct<RawTrait>[]
 * @default []
 */
/*~struct~ParamBonus:
 * @param param
 * @text Parameter
 * @type select
 * @option MaxHP @value 0
 * @option MaxMP @value 1
 * @option ATK @value 2
 * @option DEF @value 3
 * @option MAT @value 4
 * @option MDF @value 5
 * @option AGI @value 6
 * @option LUK @value 7
 * @default 2
 * @param amount
 * @text Amount Per Rank
 * @type number
 * @min -999999
 * @default 5
 */
/*~struct~ParamRate:
 * @param param
 * @text Parameter
 * @type select
 * @option MaxHP @value 0
 * @option MaxMP @value 1
 * @option ATK @value 2
 * @option DEF @value 3
 * @option MAT @value 4
 * @option MDF @value 5
 * @option AGI @value 6
 * @option LUK @value 7
 * @default 2
 * @param percent
 * @text Percent Per Rank
 * @desc e.g. 10 = +10% per rank.
 * @default 10
 */
/*~struct~XParam:
 * @param xparam
 * @text Ex-Parameter
 * @type select
 * @option Hit Rate @value 0
 * @option Evasion @value 1
 * @option Critical Rate @value 2
 * @option Critical Evasion @value 3
 * @option Magic Evasion @value 4
 * @option Magic Reflection @value 5
 * @option Counter Attack @value 6
 * @option HP Regen @value 7
 * @option MP Regen @value 8
 * @option TP Regen @value 9
 * @default 2
 * @param percent
 * @text Percent Per Rank
 * @default 5
 */
/*~struct~SParam:
 * @param sparam
 * @text Sp-Parameter
 * @type select
 * @option Target Rate @value 0
 * @option Guard Effect @value 1
 * @option Recovery Effect @value 2
 * @option Pharmacology @value 3
 * @option MP Cost Rate @value 4
 * @option TP Charge Rate @value 5
 * @option Physical Damage @value 6
 * @option Magical Damage @value 7
 * @option Floor Damage @value 8
 * @option Experience @value 9
 * @default 2
 * @param percent
 * @text Percent Per Rank
 * @desc e.g. 10 = +10% per rank. For "cost" stats a negative number lowers them.
 * @default 10
 */
/*~struct~ElementRate:
 * @param elementId
 * @text Element ID
 * @type number
 * @min 1
 * @desc Element ID from the Types tab in the database.
 * @default 1
 * @param reducePercent
 * @text Damage Reduced % Per Rank
 * @desc e.g. 20 = take 20% less. Negative = weakness (take more).
 * @default 20
 */
/*~struct~RawTrait:
 * @param code
 * @text Trait Code
 * @type number
 * @desc Engine trait code (e.g. 22 = ex-param, 43 = add skill, 64 = party ability).
 * @default 0
 * @param dataId
 * @text Data ID
 * @type number
 * @default 0
 * @param value
 * @text Value (x rank)
 * @desc Multiplied by the node's rank.
 * @default 0
 */
/*~struct~ActorTree:
 * @param actorId
 * @text Actor
 * @type actor
 * @default 0
 * @param treeId
 * @text Tree ID
 * @type string
 * @default tree1
 */

var Imported = Imported || {};
Imported.EasyTraitTree = true;

var ETT = ETT || {};

(() => {
    "use strict";

    // ---- Resolve plugin name from the actual file name (rename-safe) ----
    const script = document.currentScript;
    const PLUGIN_NAME = script
        ? decodeURIComponent(script.src.replace(/^.*\/(.+)\.js$/, "$1"))
        : "EasyTraitTree";

    const raw = PluginManager.parameters(PLUGIN_NAME);

    const toInt = (s, d) => { const n = parseInt(s, 10); return isNaN(n) ? d : n; };
    const toFloat = (s, d) => { const n = parseFloat(s); return isNaN(n) ? (d || 0) : n; };
    const toBool = (s) => s === "true";
    const toArr = (s) => { try { return JSON.parse(s || "[]"); } catch (e) { return []; } };
    const toNote = (s) => { try { return JSON.parse(s || '""'); } catch (e) { return s || ""; } };

    // ---- Parse nested struct params ----
    function parseNode(str) {
        const n = JSON.parse(str);
        return {
            id: String(n.id),
            name: String(n.name || ""),
            description: toNote(n.description),
            icon: toInt(n.icon, 0),
            tier: toInt(n.tier, 0),
            column: toInt(n.column, 0),
            maxRank: Math.max(1, toInt(n.maxRank, 1)),
            cost: toInt(n.cost, 1),
            requires: toArr(n.requires).map(String),
            requiredTreePoints: toInt(n.requiredTreePoints, 0),
            flatParams: toArr(n.flatParams).map((s) => { const o = JSON.parse(s); return { param: toInt(o.param, 0), amount: toInt(o.amount, 0) }; }),
            rateParams: toArr(n.rateParams).map((s) => { const o = JSON.parse(s); return { param: toInt(o.param, 0), percent: toFloat(o.percent, 0) }; }),
            xparams: toArr(n.xparams).map((s) => { const o = JSON.parse(s); return { id: toInt(o.xparam, 0), percent: toFloat(o.percent, 0) }; }),
            sparams: toArr(n.sparams).map((s) => { const o = JSON.parse(s); return { id: toInt(o.sparam, 0), percent: toFloat(o.percent, 0) }; }),
            elementRates: toArr(n.elementRates).map((s) => { const o = JSON.parse(s); return { id: toInt(o.elementId, 1), percent: toFloat(o.reducePercent, 0) }; }),
            learnSkills: toArr(n.learnSkills).map((x) => toInt(x, 0)).filter((x) => x > 0),
            passiveStates: toArr(n.passiveStates).map((x) => toInt(x, 0)).filter((x) => x > 0),
            rawTraits: toArr(n.rawTraits).map((s) => { const o = JSON.parse(s); return { code: toInt(o.code, 0), dataId: toInt(o.dataId, 0), value: toFloat(o.value, 0) }; }),
        };
    }

    function parseTree(str) {
        const t = JSON.parse(str);
        const tree = { id: String(t.id), name: String(t.name || ""), description: toNote(t.description), nodes: [], nodeMap: {} };
        for (const ns of toArr(t.nodes)) {
            const node = parseNode(ns);
            tree.nodes.push(node);
            tree.nodeMap[node.id] = node;
        }
        return tree;
    }

    ETT.trees = {};
    for (const ts of toArr(raw.trees)) {
        try {
            const tree = parseTree(ts);
            ETT.trees[tree.id] = tree;
        } catch (e) {
            console.error("EasyTraitTree: failed to parse a tree.", e);
        }
    }

    ETT.assignments = {};
    for (const as of toArr(raw.actorAssignments)) {
        try {
            const o = JSON.parse(as);
            ETT.assignments[toInt(o.actorId, 0)] = String(o.treeId);
        } catch (e) { /* ignore */ }
    }

    ETT.params = {
        pointsPerLevel: toInt(raw.pointsPerLevel, 1),
        startingPoints: toInt(raw.startingPoints, 0),
        menuCommandName: String(raw.menuCommandName || ""),
        menuSwitch: toInt(raw.menuSwitch, 0),
        allowReset: toBool(raw.allowReset),
        refundOnReset: toBool(raw.refundOnReset),
        resetGoldCost: toInt(raw.resetGoldCost, 0),
        nodeSize: toInt(raw.nodeSize, 56),
        colSpacing: toInt(raw.colSpacing, 110),
        rowSpacing: toInt(raw.rowSpacing, 110),
    };

    ETT.getTree = (id) => ETT.trees[id] || null;

    const PARAM_NAMES = ["MaxHP", "MaxMP", "ATK", "DEF", "MAT", "MDF", "AGI", "LUK"];
    const XPARAM_NAMES = ["Hit", "Evasion", "Critical", "Crit Evade", "Magic Evade", "Magic Reflect", "Counter", "HP Regen", "MP Regen", "TP Regen"];
    const SPARAM_NAMES = ["Target Rate", "Guard", "Recovery", "Pharmacology", "MP Cost", "TP Charge", "Phys Dmg", "Magic Dmg", "Floor Dmg", "Experience"];

    // ============================================================
    // Game_Actor - data, points, ranks, effects
    // ============================================================
    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function (actorId) {
        _Game_Actor_setup.call(this, actorId);
        this._ttRanks = {};
        this._ttPoints = ETT.params.startingPoints;
        this._ttGranted = [];
    };

    Game_Actor.prototype._ttInit = function () {
        if (this._ttRanks === undefined) this._ttRanks = {};
        if (this._ttPoints === undefined) this._ttPoints = 0;
        if (this._ttGranted === undefined) this._ttGranted = [];
    };

    Game_Actor.prototype.traitTreeId = function () {
        const meta = this.actor() && this.actor().meta ? this.actor().meta.TraitTree : null;
        if (meta) return String(meta).trim();
        if (this._ttTreeOverride) return this._ttTreeOverride;
        return ETT.assignments[this.actorId()] || null;
    };

    Game_Actor.prototype.setTraitTreeId = function (treeId) {
        this._ttTreeOverride = treeId;
        this.refresh();
    };

    Game_Actor.prototype.traitTree = function () {
        const id = this.traitTreeId();
        return id ? ETT.getTree(id) : null;
    };

    Game_Actor.prototype.hasTraitTree = function () {
        return !!this.traitTree();
    };

    Game_Actor.prototype.traitPoints = function () {
        this._ttInit();
        return this._ttPoints;
    };

    Game_Actor.prototype.gainTraitPoints = function (n) {
        this._ttInit();
        this._ttPoints = Math.max(0, this._ttPoints + n);
    };

    Game_Actor.prototype.setTraitPoints = function (n) {
        this._ttInit();
        this._ttPoints = Math.max(0, n);
    };

    Game_Actor.prototype.nodeRank = function (nodeId) {
        this._ttInit();
        return this._ttRanks[nodeId] || 0;
    };

    Game_Actor.prototype.traitTreeSpent = function () {
        this._ttInit();
        const tree = this.traitTree();
        if (!tree) return 0;
        let sum = 0;
        for (const node of tree.nodes) sum += (this._ttRanks[node.id] || 0) * node.cost;
        return sum;
    };

    Game_Actor.prototype.nodePrereqsMet = function (node) {
        for (const reqId of node.requires) {
            if ((this._ttRanks[reqId] || 0) < 1) return false;
        }
        return this.traitTreeSpent() >= node.requiredTreePoints;
    };

    Game_Actor.prototype.canRankUpNode = function (node) {
        this._ttInit();
        const rank = this._ttRanks[node.id] || 0;
        if (rank >= node.maxRank) return false;
        if (this._ttPoints < node.cost) return false;
        return this.nodePrereqsMet(node);
    };

    // Reason a node cannot currently be increased (for UI feedback).
    Game_Actor.prototype.nodeStatusText = function (node) {
        const rank = this.nodeRank(node.id);
        if (rank >= node.maxRank) return "Maxed out";
        if (!this.nodePrereqsMet(node)) {
            if (this.traitTreeSpent() < node.requiredTreePoints) {
                return "Locked: need " + node.requiredTreePoints + " points in this tree";
            }
            return "Locked: complete a prerequisite first";
        }
        if (this._ttPoints < node.cost) return "Not enough points";
        return "Available";
    };

    Game_Actor.prototype.rankUpNode = function (node) {
        if (!this.canRankUpNode(node)) return false;
        this._ttPoints -= node.cost;
        this._ttRanks[node.id] = (this._ttRanks[node.id] || 0) + 1;
        this.refresh();
        return true;
    };

    Game_Actor.prototype.resetTraitTree = function () {
        this._ttInit();
        const tree = this.traitTree();
        if (!tree) return;
        let refund = 0;
        for (const node of tree.nodes) {
            refund += (this._ttRanks[node.id] || 0) * node.cost;
        }
        this._ttRanks = {};
        if (ETT.params.refundOnReset) this._ttPoints += refund;
        this.refresh();
    };

    Game_Actor.prototype.forEachUnlockedNode = function (callback) {
        this._ttInit();
        const tree = this.traitTree();
        if (!tree) return;
        for (const node of tree.nodes) {
            const rank = this._ttRanks[node.id] || 0;
            if (rank > 0) callback(node, rank);
        }
    };

    // ---- Points on level up ----
    const _Game_Actor_levelUp = Game_Actor.prototype.levelUp;
    Game_Actor.prototype.levelUp = function () {
        _Game_Actor_levelUp.call(this);
        if (ETT.params.pointsPerLevel > 0) this.gainTraitPoints(ETT.params.pointsPerLevel);
    };

    // ---- Flat param bonuses (paramPlus) ----
    const _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function (paramId) {
        let value = _Game_Actor_paramPlus.call(this, paramId);
        this.forEachUnlockedNode((node, rank) => {
            for (const fp of node.flatParams) {
                if (fp.param === paramId) value += fp.amount * rank;
            }
        });
        return value;
    };

    // ---- Synthetic trait object for rate/xparam/sparam/element/raw traits ----
    Game_Actor.prototype.traitTreeTraitObject = function () {
        const traits = [];
        this.forEachUnlockedNode((node, rank) => {
            for (const rp of node.rateParams) {
                traits.push({ code: Game_BattlerBase.TRAIT_PARAM, dataId: rp.param, value: 1 + (rp.percent / 100) * rank });
            }
            for (const xp of node.xparams) {
                traits.push({ code: Game_BattlerBase.TRAIT_XPARAM, dataId: xp.id, value: (xp.percent / 100) * rank });
            }
            for (const sp of node.sparams) {
                traits.push({ code: Game_BattlerBase.TRAIT_SPARAM, dataId: sp.id, value: 1 + (sp.percent / 100) * rank });
            }
            for (const er of node.elementRates) {
                traits.push({ code: Game_BattlerBase.TRAIT_ELEMENT_RATE, dataId: er.id, value: 1 - (er.percent / 100) * rank });
            }
            for (const rt of node.rawTraits) {
                traits.push({ code: rt.code, dataId: rt.dataId, value: rt.value * rank });
            }
        });
        return traits.length ? { traits } : null;
    };

    const _Game_Actor_traitObjects = Game_Actor.prototype.traitObjects;
    Game_Actor.prototype.traitObjects = function () {
        const objects = _Game_Actor_traitObjects.call(this);
        const o = this.traitTreeTraitObject();
        if (o) objects.push(o);
        return objects;
    };

    // ---- Passive states (added into states so their traits & icons apply) ----
    Game_Actor.prototype.traitTreePassiveStateIds = function () {
        const ids = [];
        this.forEachUnlockedNode((node) => {
            for (const sid of node.passiveStates) {
                if (!ids.includes(sid)) ids.push(sid);
            }
        });
        return ids;
    };

    const _Game_Actor_states = Game_Actor.prototype.states;
    Game_Actor.prototype.states = function () {
        const list = _Game_Actor_states.call(this);
        for (const sid of this.traitTreePassiveStateIds()) {
            const data = $dataStates[sid];
            if (data && !list.includes(data)) list.push(data);
        }
        return list;
    };

    const _Game_Actor_isStateAffected = Game_Actor.prototype.isStateAffected;
    Game_Actor.prototype.isStateAffected = function (stateId) {
        if (this.traitTreePassiveStateIds().includes(stateId)) return true;
        return _Game_Actor_isStateAffected.call(this, stateId);
    };

    // ---- Learned skills (must be applied explicitly) ----
    Game_Actor.prototype.applyTraitTreeSkills = function () {
        this._ttInit();
        const desired = [];
        this.forEachUnlockedNode((node) => {
            for (const sid of node.learnSkills) {
                if (!desired.includes(sid)) desired.push(sid);
            }
        });
        // Forget previously granted skills that are no longer desired.
        for (const sid of this._ttGranted.slice()) {
            if (!desired.includes(sid)) {
                this.forgetSkill(sid);
                this._ttGranted.splice(this._ttGranted.indexOf(sid), 1);
            }
        }
        // Grant new ones (only track those we actually add, so we never forget
        // skills the actor learned by other means).
        for (const sid of desired) {
            if (!this.isLearnedSkill(sid)) {
                this.learnSkill(sid);
                if (!this._ttGranted.includes(sid)) this._ttGranted.push(sid);
            }
        }
    };

    const _Game_Actor_refresh = Game_Actor.prototype.refresh;
    Game_Actor.prototype.refresh = function () {
        if (this._ttSyncing !== true) {
            this._ttSyncing = true;
            this.applyTraitTreeSkills();
            this._ttSyncing = false;
        }
        _Game_Actor_refresh.call(this);
    };

    // ============================================================
    // Item note tag <TraitTreePoints: n>
    // ============================================================
    const _Game_Action_applyItemUserEffect = Game_Action.prototype.applyItemUserEffect;
    Game_Action.prototype.applyItemUserEffect = function (target) {
        _Game_Action_applyItemUserEffect.call(this, target);
        const item = this.item();
        if (item && item.meta && item.meta.TraitTreePoints && target && target.isActor()) {
            const n = Number(item.meta.TraitTreePoints);
            if (!isNaN(n)) target.gainTraitPoints(n);
        }
    };

    // ============================================================
    // Plugin commands
    // ============================================================
    PluginManager.registerCommand(PLUGIN_NAME, "openTree", (args) => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) {
            SceneManager._nextTraitTreeActorId = actor.actorId();
            SceneManager.push(Scene_TraitTree);
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "gainPoints", (args) => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) actor.gainTraitPoints(Number(args.amount));
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setPoints", (args) => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) actor.setTraitPoints(Number(args.amount));
    });

    PluginManager.registerCommand(PLUGIN_NAME, "resetTree", (args) => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) actor.resetTraitTree();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setActorTree", (args) => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) actor.setTraitTreeId(String(args.treeId));
    });

    // ============================================================
    // Menu integration
    // ============================================================
    if (ETT.params.menuCommandName) {
        const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function () {
            _Window_MenuCommand_addOriginalCommands.call(this);
            if (this.isTraitTreeCommandVisible()) {
                this.addCommand(ETT.params.menuCommandName, "traitTree", true);
            }
        };

        Window_MenuCommand.prototype.isTraitTreeCommandVisible = function () {
            const sw = ETT.params.menuSwitch;
            return sw <= 0 || $gameSwitches.value(sw);
        };

        const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function () {
            _Scene_Menu_createCommandWindow.call(this);
            this._commandWindow.setHandler("traitTree", this.commandPersonal.bind(this));
        };

        const _Scene_Menu_onPersonalOk = Scene_Menu.prototype.onPersonalOk;
        Scene_Menu.prototype.onPersonalOk = function () {
            if (this._commandWindow.currentSymbol() === "traitTree") {
                SceneManager._nextTraitTreeActorId = $gameParty.menuActor().actorId();
                SceneManager.push(Scene_TraitTree);
            } else {
                _Scene_Menu_onPersonalOk.call(this);
            }
        };
    }

    // ============================================================
    // Window: header info (actor + points)
    // ============================================================
    function Window_TraitTreeInfo() { this.initialize(...arguments); }
    Window_TraitTreeInfo.prototype = Object.create(Window_Base.prototype);
    Window_TraitTreeInfo.prototype.constructor = Window_TraitTreeInfo;

    Window_TraitTreeInfo.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._actor = null;
    };

    Window_TraitTreeInfo.prototype.setActor = function (actor) {
        this._actor = actor;
        this.refresh();
    };

    Window_TraitTreeInfo.prototype.refresh = function () {
        this.contents.clear();
        if (!this._actor) return;
        const w = this.innerWidth;
        this.changeTextColor(ColorManager.hpColor(this._actor));
        this.drawText(this._actor.name(), 0, 0, Math.floor(w * 0.5));
        this.resetTextColor();
        const tree = this._actor.traitTree();
        if (tree) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(tree.name, Math.floor(w * 0.35), 0, Math.floor(w * 0.35), "center");
        }
        this.resetTextColor();
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Points:", Math.floor(w * 0.7), 0, Math.floor(w * 0.2), "right");
        this.resetTextColor();
        this.drawText(String(this._actor.traitPoints()), Math.floor(w * 0.9), 0, Math.floor(w * 0.1), "right");
    };

    // ============================================================
    // Window: node detail
    // ============================================================
    function Window_TraitTreeDetail() { this.initialize(...arguments); }
    Window_TraitTreeDetail.prototype = Object.create(Window_Base.prototype);
    Window_TraitTreeDetail.prototype.constructor = Window_TraitTreeDetail;

    Window_TraitTreeDetail.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._actor = null;
        this._node = null;
    };

    Window_TraitTreeDetail.prototype.setActor = function (actor) {
        this._actor = actor;
    };

    Window_TraitTreeDetail.prototype.setNode = function (node) {
        this._node = node;
        this.refresh();
    };

    Window_TraitTreeDetail.prototype.effectLines = function (node) {
        const lines = [];
        for (const fp of node.flatParams) lines.push(PARAM_NAMES[fp.param] + " " + (fp.amount >= 0 ? "+" : "") + fp.amount + " / rank");
        for (const rp of node.rateParams) lines.push(PARAM_NAMES[rp.param] + " " + (rp.percent >= 0 ? "+" : "") + rp.percent + "% / rank");
        for (const xp of node.xparams) lines.push(XPARAM_NAMES[xp.id] + " " + (xp.percent >= 0 ? "+" : "") + xp.percent + "% / rank");
        for (const sp of node.sparams) lines.push(SPARAM_NAMES[sp.id] + " " + (sp.percent >= 0 ? "+" : "") + sp.percent + "% / rank");
        for (const er of node.elementRates) {
            const data = $dataSystem.elements[er.id] || ("Element " + er.id);
            lines.push(data + " resist " + (er.percent >= 0 ? "+" : "") + er.percent + "% / rank");
        }
        for (const sid of node.learnSkills) {
            const skill = $dataSkills[sid];
            if (skill) lines.push("Learn: " + skill.name);
        }
        for (const sid of node.passiveStates) {
            const st = $dataStates[sid];
            if (st) lines.push("Passive: " + st.name);
        }
        if (node.rawTraits.length) lines.push("Special bonuses");
        return lines;
    };

    Window_TraitTreeDetail.prototype.refresh = function () {
        this.contents.clear();
        if (!this._node || !this._actor) return;
        const node = this._node;
        const lh = this.lineHeight();
        let y = 0;
        const w = this.innerWidth;

        // Title + rank
        this.drawIcon(node.icon, 0, y);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(node.name, ImageManager.iconWidth + 6, y, w - ImageManager.iconWidth - 6 - 120);
        this.resetTextColor();
        const rank = this._actor.nodeRank(node.id);
        this.drawText("Rank " + rank + "/" + node.maxRank, w - 120, y, 120, "right");
        y += lh;

        // Description
        if (node.description) {
            const desc = node.description.replace(/\r?\n/g, " ");
            this.drawTextExWrap(desc, 0, y, w);
            y += lh;
        }

        // Effects
        for (const line of this.effectLines(node)) {
            if (y > this.innerHeight - lh) break;
            this.drawText("• " + line, 8, y, w - 8);
            y += lh;
        }

        // Status footer
        const status = this._actor.nodeStatusText(node);
        const color = status === "Available" ? ColorManager.powerUpColor()
            : status === "Maxed out" ? ColorManager.textColor(14)
                : ColorManager.deathColor();
        this.changeTextColor(color);
        this.drawText(status + "   (Cost " + node.cost + ")", 0, this.innerHeight - lh, w, "left");
        this.resetTextColor();
    };

    Window_TraitTreeDetail.prototype.drawTextExWrap = function (text, x, y, maxWidth) {
        // Simple clip; long descriptions are truncated to one line here.
        this.drawText(text, x, y, maxWidth);
    };

    // ============================================================
    // Window: the tree canvas (custom node navigation + scrolling)
    // ============================================================
    function Window_TraitTree() { this.initialize(...arguments); }
    Window_TraitTree.prototype = Object.create(Window_Selectable.prototype);
    Window_TraitTree.prototype.constructor = Window_TraitTree;

    Window_TraitTree.prototype.initialize = function (rect) {
        this._nodes = [];
        this._treeW = 0;
        this._treeH = 0;
        this._scrollPos = { x: 0, y: 0 };
        Window_Selectable.prototype.initialize.call(this, rect);
        this._actor = null;
        this._detailWindow = null;
    };

    Window_TraitTree.prototype.setActor = function (actor) {
        this._actor = actor;
        this.buildLayout();
        this.refresh();
        this.select(this._nodes.length ? 0 : -1);
        this.scrollToSelection();
    };

    Window_TraitTree.prototype.setDetailWindow = function (win) {
        this._detailWindow = win;
        this.callUpdateHelp();
    };

    Window_TraitTree.prototype.currentNode = function () {
        return this._nodes[this.index()] || null;
    };

    // ---- layout ----
    Window_TraitTree.prototype.buildLayout = function () {
        this._nodes = [];
        const tree = this._actor ? this._actor.traitTree() : null;
        if (!tree) return;
        const size = ETT.params.nodeSize;
        const colSp = ETT.params.colSpacing;
        const rowSp = ETT.params.rowSpacing;
        const pad = Math.floor(size / 2) + 20;
        let maxX = 0;
        let maxY = 0;
        for (const node of tree.nodes) {
            const px = pad + node.column * colSp;
            const py = pad + node.tier * rowSp;
            const laid = { data: node, px: px, py: py, cx: px + size / 2, cy: py + size / 2 };
            this._nodes.push(laid);
            maxX = Math.max(maxX, px + size);
            maxY = Math.max(maxY, py + size);
        }
        this._treeW = maxX + pad;
        this._treeH = maxY + pad;
        // Center horizontally if the tree is narrower than the view.
        if (this._treeW < this.innerWidth) {
            const off = Math.floor((this.innerWidth - this._treeW) / 2);
            for (const l of this._nodes) { l.px += off; l.cx += off; }
            this._treeW = this.innerWidth;
        }
    };

    Window_TraitTree.prototype.maxItems = function () { return this._nodes.length; };
    Window_TraitTree.prototype.maxCols = function () { return 1; };
    Window_TraitTree.prototype.contentsWidth = function () { return Math.max(this.innerWidth, this._treeW); };
    Window_TraitTree.prototype.contentsHeight = function () { return Math.max(this.innerHeight, this._treeH); };
    Window_TraitTree.prototype.overallWidth = function () { return this.contentsWidth(); };
    Window_TraitTree.prototype.overallHeight = function () { return this.contentsHeight(); };

    Window_TraitTree.prototype.itemRect = function (index) {
        const l = this._nodes[index];
        const size = ETT.params.nodeSize;
        if (!l) return new Rectangle(0, 0, 0, 0);
        return new Rectangle(l.px, l.py, size, size);
    };

    // ---- custom scrolling via origin ----
    Window_TraitTree.prototype.updateOrigin = function () {
        this._scrollX = this._scrollPos.x;
        this._scrollY = this._scrollPos.y;
        this.origin.x = this._scrollPos.x;
        this.origin.y = this._scrollPos.y;
    };

    Window_TraitTree.prototype.maxScrollX = function () { return Math.max(0, this.contentsWidth() - this.innerWidth); };
    Window_TraitTree.prototype.maxScrollY = function () { return Math.max(0, this.contentsHeight() - this.innerHeight); };

    Window_TraitTree.prototype.scrollToSelection = function () {
        const rect = this.itemRect(this.index());
        if (rect.width === 0) return;
        let sx = this._scrollPos.x;
        let sy = this._scrollPos.y;
        if (rect.x < sx) sx = rect.x - 16;
        if (rect.x + rect.width > sx + this.innerWidth) sx = rect.x + rect.width - this.innerWidth + 16;
        if (rect.y < sy) sy = rect.y - 16;
        if (rect.y + rect.height > sy + this.innerHeight) sy = rect.y + rect.height - this.innerHeight + 16;
        this._scrollPos.x = Math.max(0, Math.min(sx, this.maxScrollX()));
        this._scrollPos.y = Math.max(0, Math.min(sy, this.maxScrollY()));
    };

    Window_TraitTree.prototype.processWheelScroll = function () {
        if (this.isWheelScrollEnabled && this.isWheelScrollEnabled() && this.visible) {
            const threshold = 20;
            if (TouchInput.wheelY >= threshold) {
                this._scrollPos.y = Math.min(this._scrollPos.y + 48, this.maxScrollY());
            }
            if (TouchInput.wheelY <= -threshold) {
                this._scrollPos.y = Math.max(this._scrollPos.y - 48, 0);
            }
        }
    };

    // ---- spatial navigation ----
    Window_TraitTree.prototype.cursorDown = function () { this.selectNearest(0, 1); };
    Window_TraitTree.prototype.cursorUp = function () { this.selectNearest(0, -1); };
    Window_TraitTree.prototype.cursorRight = function () { this.selectNearest(1, 0); };
    Window_TraitTree.prototype.cursorLeft = function () { this.selectNearest(-1, 0); };

    Window_TraitTree.prototype.selectNearest = function (dx, dy) {
        const cur = this._nodes[this.index()];
        if (!cur) return;
        let best = -1;
        let bestScore = Infinity;
        for (let i = 0; i < this._nodes.length; i++) {
            if (i === this.index()) continue;
            const n = this._nodes[i];
            const vx = n.cx - cur.cx;
            const vy = n.cy - cur.cy;
            const along = vx * dx + vy * dy;      // distance in requested direction
            if (along <= 0) continue;             // must be in the pressed direction
            const perp = Math.abs(vx * dy - vy * dx); // sideways deviation
            const score = along + perp * 2;       // prefer aligned, then nearest
            if (score < bestScore) { bestScore = score; best = i; }
        }
        if (best >= 0) {
            this.select(best);
            this.scrollToSelection();
            this.callUpdateHelp();
        }
    };

    Window_TraitTree.prototype.callUpdateHelp = function () {
        if (this._detailWindow && this.active) {
            this._detailWindow.setNode(this.currentNode());
        }
    };

    // ---- drawing ----
    Window_TraitTree.prototype.refresh = function () {
        this.createContents();
        this.drawAllItems();
    };

    Window_TraitTree.prototype.drawAllItems = function () {
        if (!this._actor) return;
        const iconset = ImageManager.loadSystem("IconSet");
        if (!iconset.isReady()) {
            iconset.addLoadListener(this.refresh.bind(this));
            return;
        }
        this.drawConnectors();
        for (let i = 0; i < this._nodes.length; i++) {
            this.drawNode(i);
        }
    };

    Window_TraitTree.prototype.drawConnectors = function () {
        const tree = this._actor.traitTree();
        if (!tree) return;
        const byId = {};
        for (const l of this._nodes) byId[l.data.id] = l;
        for (const l of this._nodes) {
            for (const reqId of l.data.requires) {
                const from = byId[reqId];
                if (!from) continue;
                const active = this._actor.nodeRank(reqId) >= 1;
                const color = active ? "rgba(120,200,255,0.95)" : "rgba(140,140,150,0.5)";
                this.drawLine(from.cx, from.cy, l.cx, l.cy, color, active ? 4 : 3);
            }
        }
    };

    Window_TraitTree.prototype.drawLine = function (x1, y1, x2, y2, color, width) {
        const ctx = this.contents.context;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        if (this.contents._baseTexture) this.contents._baseTexture.update();
    };

    Window_TraitTree.prototype.drawNode = function (index) {
        const l = this._nodes[index];
        const node = l.data;
        const size = ETT.params.nodeSize;
        const radius = Math.floor(size / 2);
        const rank = this._actor.nodeRank(node.id);
        const maxed = rank >= node.maxRank;
        const started = rank > 0;
        const available = this._actor.canRankUpNode(node);
        const reachable = this._actor.nodePrereqsMet(node);

        // Background ring color by state.
        let ring;
        if (maxed) ring = "#f5c542";           // gold
        else if (available) ring = "#4ade80";  // green: can invest now
        else if (started) ring = "#7dd3fc";    // light blue: partially invested
        else if (reachable) ring = "#c0c0c8";  // reachable but can't afford
        else ring = "#555560";                 // locked / grey

        const bg = started ? "rgba(30,45,70,0.95)" : "rgba(24,26,34,0.9)";

        this.contents.drawCircle(l.cx, l.cy, radius, ring);
        this.contents.drawCircle(l.cx, l.cy, radius - 4, bg);

        // Icon (scaled to fit inside the ring).
        const iconSize = size - 16;
        this.drawScaledIcon(node.icon, l.px + 8, l.py + 8, iconSize, reachable || started);

        // Rank badge under the node.
        this.contents.fontSize = Math.max(16, Math.floor(size / 3));
        this.changeTextColor(maxed ? ColorManager.textColor(14) : ColorManager.normalColor());
        this.drawText(rank + "/" + node.maxRank, l.px - 12, l.py + size - 6, size + 24, "center");
        this.resetFontSettings();
    };

    Window_TraitTree.prototype.drawScaledIcon = function (iconIndex, x, y, size, bright) {
        const bitmap = ImageManager.loadSystem("IconSet");
        const pw = ImageManager.iconWidth;
        const ph = ImageManager.iconHeight;
        const sx = (iconIndex % 16) * pw;
        const sy = Math.floor(iconIndex / 16) * ph;
        this.contents.paintOpacity = bright ? 255 : 130;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y, size, size);
        this.contents.paintOpacity = 255;
    };

    // Cursor rect follows the selected node.
    Window_TraitTree.prototype.refreshCursor = function () {
        if (this.index() >= 0) {
            const rect = this.itemRect(this.index());
            this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            this.setCursorRect(0, 0, 0, 0);
        }
    };

    // ============================================================
    // Window: reset confirmation
    // ============================================================
    function Window_TraitTreeConfirm() { this.initialize(...arguments); }
    Window_TraitTreeConfirm.prototype = Object.create(Window_Command.prototype);
    Window_TraitTreeConfirm.prototype.constructor = Window_TraitTreeConfirm;

    Window_TraitTreeConfirm.prototype.initialize = function (rect) {
        Window_Command.prototype.initialize.call(this, rect);
        this.openness = 0;
        this.deactivate();
    };

    Window_TraitTreeConfirm.prototype.makeCommandList = function () {
        const cost = ETT.params.resetGoldCost;
        const label = cost > 0 ? "Reset (" + cost + " " + TextManager.currencyUnit + ")" : "Reset Tree";
        this.addCommand(label, "ok");
        this.addCommand("Cancel", "cancel");
    };

    // ============================================================
    // Scene_TraitTree
    // ============================================================
    function Scene_TraitTree() { this.initialize(...arguments); }
    Scene_TraitTree.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_TraitTree.prototype.constructor = Scene_TraitTree;

    Scene_TraitTree.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_TraitTree.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        const actorId = SceneManager._nextTraitTreeActorId || ($gameParty.leader() && $gameParty.leader().actorId());
        this._actor = $gameActors.actor(actorId);
        ImageManager.loadSystem("IconSet");
        this.createInfoWindow();
        this.createDetailWindow();
        this.createTreeWindow();
        this.createConfirmWindow();
        this.refreshAll();
    };

    Scene_TraitTree.prototype.infoRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, false);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_TraitTree.prototype.detailRect = function () {
        const wh = this.calcWindowHeight(4, false);
        const wx = 0;
        const wy = this.mainAreaBottom() - wh;
        return new Rectangle(wx, wy, Graphics.boxWidth, wh);
    };

    Scene_TraitTree.prototype.treeRect = function () {
        const info = this.infoRect();
        const detail = this.detailRect();
        const wy = info.y + info.height;
        const wh = detail.y - wy;
        return new Rectangle(0, wy, Graphics.boxWidth, wh);
    };

    Scene_TraitTree.prototype.createInfoWindow = function () {
        this._infoWindow = new Window_TraitTreeInfo(this.infoRect());
        this._infoWindow.setActor(this._actor);
        this.addWindow(this._infoWindow);
    };

    Scene_TraitTree.prototype.createDetailWindow = function () {
        this._detailWindow = new Window_TraitTreeDetail(this.detailRect());
        this._detailWindow.setActor(this._actor);
        this.addWindow(this._detailWindow);
    };

    Scene_TraitTree.prototype.createTreeWindow = function () {
        this._treeWindow = new Window_TraitTree(this.treeRect());
        this._treeWindow.setActor(this._actor);
        this._treeWindow.setDetailWindow(this._detailWindow);
        this._treeWindow.setHandler("ok", this.onNodeOk.bind(this));
        this._treeWindow.setHandler("cancel", this.popScene.bind(this));
        if (ETT.params.allowReset) {
            this._treeWindow.setHandler("pageup", this.onResetRequest.bind(this));
            this._treeWindow.setHandler("pagedown", this.onResetRequest.bind(this));
        }
        this.addWindow(this._treeWindow);
        this._treeWindow.activate();
    };

    Scene_TraitTree.prototype.createConfirmWindow = function () {
        const ww = 360;
        const wh = this.calcWindowHeight(2, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        this._confirmWindow = new Window_TraitTreeConfirm(new Rectangle(wx, wy, ww, wh));
        this._confirmWindow.setHandler("ok", this.onResetConfirm.bind(this));
        this._confirmWindow.setHandler("cancel", this.onResetCancel.bind(this));
        this.addWindow(this._confirmWindow);
    };

    Scene_TraitTree.prototype.refreshAll = function () {
        this._infoWindow.refresh();
        this._treeWindow.refresh();
        this._detailWindow.setNode(this._treeWindow.currentNode());
    };

    Scene_TraitTree.prototype.onNodeOk = function () {
        const node = this._treeWindow.currentNode();
        if (node && this._actor.rankUpNode(node.data)) {
            SoundManager.playUseSkill();
            this.refreshAll();
        } else {
            SoundManager.playBuzzer();
        }
        this._treeWindow.activate();
    };

    Scene_TraitTree.prototype.onResetRequest = function () {
        if (!ETT.params.allowReset) { this._treeWindow.activate(); return; }
        if (this._actor.traitTreeSpent() <= 0) {
            SoundManager.playBuzzer();
            this._treeWindow.activate();
            return;
        }
        this._treeWindow.deactivate();
        this._confirmWindow.select(0);
        this._confirmWindow.open();
        this._confirmWindow.activate();
    };

    Scene_TraitTree.prototype.onResetConfirm = function () {
        const cost = ETT.params.resetGoldCost;
        if (cost > 0 && $gameParty.gold() < cost) {
            SoundManager.playBuzzer();
            this._confirmWindow.activate();
            return;
        }
        if (cost > 0) $gameParty.loseGold(cost);
        this._actor.resetTraitTree();
        SoundManager.playSave();
        this._confirmWindow.close();
        this._confirmWindow.deactivate();
        this.refreshAll();
        this._treeWindow.activate();
    };

    Scene_TraitTree.prototype.onResetCancel = function () {
        this._confirmWindow.close();
        this._confirmWindow.deactivate();
        this._treeWindow.activate();
    };

    Scene_TraitTree.prototype.needsPageButtons = function () { return false; };

    // Expose globally.
    window.Scene_TraitTree = Scene_TraitTree;
    window.Window_TraitTree = Window_TraitTree;
    ETT.Scene_TraitTree = Scene_TraitTree;

})();
