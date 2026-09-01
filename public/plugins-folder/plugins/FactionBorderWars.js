//=============================================================================
// RPG Maker MZ - Faction & Border Warfare
// FactionBorderWars.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Autonomous factions wage war over region-ID territories, producing shifting borders. Strategic map screen, in-world cues, diplomacy, and developer hooks.
 * @author Claude
 * @url
 *
 * @help
 * ============================================================================
 * Faction & Border Warfare
 * ============================================================================
 *
 * Factions autonomously fight over territories that you paint onto ONE world
 * map using Region IDs (the tileset "R" tool). Ownership shifts over time,
 * producing living, moving borders. The player can watch, tip battles, capture
 * regions, and join a faction.
 *
 * ----------------------------------------------------------------------------
 * QUICK START
 * ----------------------------------------------------------------------------
 * 1. Paint Region IDs (1-255) onto your world map where you want territories.
 *    Each distinct Region ID = one territory.
 * 2. In this plugin's parameters, define your Factions (3-4 recommended) and
 *    your Regions. For each Region, set its Region ID, starting owner, income,
 *    defense, and which Region IDs it borders (Adjacent).
 *    - Tip: leave "Adjacent" blank and use the "Scan Adjacency" command while
 *      standing on the world map to auto-detect borders from the painted tiles.
 * 3. Set "World Map ID" to your world map (used by Scan Adjacency + banners).
 * 4. Use the "Open Strategic Map" plugin command (e.g. from a menu item, item,
 *    or event) to let the player view the war.
 *
 * The war advances automatically every N player steps (see "Steps Per Tick").
 *
 * ----------------------------------------------------------------------------
 * SIMULATION MODEL
 * ----------------------------------------------------------------------------
 * Each tick:
 *   - Every faction collects income (resources) from the regions it owns.
 *   - Diplomacy evolves: alliances/rivalries/truces may form, expire, or break
 *     based on faction personality.
 *   - Each faction may launch ONE attack on an adjacent enemy region. Whether
 *     it attacks is driven by its Aggression and Expansionism.
 *   - Battles resolve as attacker power vs. defender power (+ randomness).
 *     Winning flips the region's owner and redraws the borders.
 *
 * Allies and factions under an active truce will not attack each other.
 *
 * ----------------------------------------------------------------------------
 * PLAYER AGENCY
 * ----------------------------------------------------------------------------
 *   - Join Faction / Leave Faction commands set the player's allegiance.
 *   - Influence Region command lets the player Bolster (defend), Weaken, or
 *     Capture a region (great for "you personally took this fort" moments).
 *
 * ----------------------------------------------------------------------------
 * DEVELOPER HOOKS (decide per-region reactions later)
 * ----------------------------------------------------------------------------
 * When a region changes hands, the plugin fires ALL of the following, so you
 * can wire up shops/NPCs/encounters/locked areas however you like:
 *
 *   1) A Common Event (see "On-Capture Common Event"). Before it runs, these
 *      game variables are filled (see the variable-id params):
 *         - Captured Region ID
 *         - New Owner Index (0-based order in your Factions list; -1 neutral)
 *         - Old Owner Index
 *
 *   2) A JavaScript callback you can assign anywhere:
 *         window.FactionWar.onRegionCaptured =
 *             function(regionId, newOwnerId, oldOwnerId) { ... };
 *
 *   3) A public API for querying/controlling state from script calls:
 *         FactionWar.getRegionOwner(regionId)     // faction id string or ""
 *         FactionWar.getFaction(id)               // faction data object
 *         FactionWar.isControlledBy(regionId, id) // boolean
 *         FactionWar.playerRegionId()             // region the player stands on
 *         FactionWar.playerFaction()              // joined faction id or ""
 *         FactionWar.regionsOwnedBy(id)           // array of region ids
 *         FactionWar.advanceTick()                // force one simulation tick
 *
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * ----------------------------------------------------------------------------
 * Free for commercial and non-commercial projects. Credit appreciated.
 *
 * ============================================================================
 *
 * @param ---Factions & Regions---
 * @default
 *
 * @param factions
 * @parent ---Factions & Regions---
 * @text Factions
 * @type struct<Faction>[]
 * @desc The factions that fight over territory. 3-4 recommended for readable borders.
 * @default ["{\"id\":\"iron\",\"name\":\"Iron Legion\",\"color\":\"#c0392b\",\"strength\":\"55\",\"resources\":\"20\",\"aggression\":\"60\",\"expansionism\":\"60\",\"joinable\":\"true\"}","{\"id\":\"verdant\",\"name\":\"Verdant Pact\",\"color\":\"#27ae60\",\"strength\":\"55\",\"resources\":\"20\",\"aggression\":\"50\",\"expansionism\":\"55\",\"joinable\":\"true\"}","{\"id\":\"azure\",\"name\":\"Azure Concord\",\"color\":\"#2980b9\",\"strength\":\"55\",\"resources\":\"20\",\"aggression\":\"50\",\"expansionism\":\"55\",\"joinable\":\"true\"}"]
 *
 * @param regions
 * @parent ---Factions & Regions---
 * @text Regions (Territories)
 * @type struct<Region>[]
 * @desc One entry per Region ID you painted on the world map.
 * @default ["{\"regionId\":\"1\",\"name\":\"Ironhold\",\"owner\":\"iron\",\"income\":\"5\",\"defense\":\"16\",\"adjacent\":\"2,4\"}","{\"regionId\":\"2\",\"name\":\"Ashford\",\"owner\":\"\",\"income\":\"7\",\"defense\":\"10\",\"adjacent\":\"1,3,4,5\"}","{\"regionId\":\"3\",\"name\":\"Greenmarch\",\"owner\":\"verdant\",\"income\":\"5\",\"defense\":\"16\",\"adjacent\":\"2,5,6\"}","{\"regionId\":\"4\",\"name\":\"Redfen\",\"owner\":\"\",\"income\":\"7\",\"defense\":\"10\",\"adjacent\":\"1,2,5\"}","{\"regionId\":\"5\",\"name\":\"Midvale\",\"owner\":\"\",\"income\":\"8\",\"defense\":\"8\",\"adjacent\":\"2,3,4,6\"}","{\"regionId\":\"6\",\"name\":\"Bluewater\",\"owner\":\"azure\",\"income\":\"5\",\"defense\":\"16\",\"adjacent\":\"3,5\"}"]
 *
 * @param startingPlayerFaction
 * @parent ---Factions & Regions---
 * @text Starting Player Faction
 * @desc Faction id the player belongs to when a new game begins (e.g. iron). Leave blank for no allegiance.
 * @default
 *
 * @param ---Simulation---
 * @default
 *
 * @param stepsPerTick
 * @parent ---Simulation---
 * @text Steps Per Tick
 * @type number
 * @min 1
 * @desc The war advances one tick every this many player steps.
 * @default 40
 *
 * @param battleRandomness
 * @parent ---Simulation---
 * @text Battle Randomness
 * @type number
 * @min 0
 * @desc Random swing (0..this) added to both sides of each battle. Higher = more upsets.
 * @default 25
 *
 * @param attackWeight
 * @parent ---Simulation---
 * @text Attack Strength Weight
 * @type number
 * @decimals 2
 * @min 0
 * @desc Multiplier on attacker faction strength when computing attack power.
 * @default 1.00
 *
 * @param defenseWeight
 * @parent ---Simulation---
 * @text Defender Strength Weight
 * @type number
 * @decimals 2
 * @min 0
 * @desc Multiplier on defender faction strength (added to region defense).
 * @default 0.60
 *
 * @param simulateWhileInMenus
 * @parent ---Simulation---
 * @text Pause During Events
 * @type boolean
 * @on Pause
 * @off Keep Running
 * @desc Pause step-counting while an event/message is running so cutscenes stay stable.
 * @default true
 *
 * @param ---Diplomacy---
 * @default
 *
 * @param diplomacyEnabled
 * @parent ---Diplomacy---
 * @text Enable Diplomacy
 * @type boolean
 * @on Enabled
 * @off Free-for-all
 * @desc If off, everyone fights everyone with no alliances or truces.
 * @default true
 *
 * @param truceDuration
 * @parent ---Diplomacy---
 * @text Truce Duration (ticks)
 * @type number
 * @min 1
 * @desc How many ticks a truce lasts before returning to neutral.
 * @default 6
 *
 * @param diplomacyChance
 * @parent ---Diplomacy---
 * @text Diplomacy Shift Chance (%)
 * @type number
 * @min 0
 * @max 100
 * @desc Per-tick chance the plugin attempts to shift a relationship (alliance/rivalry/truce).
 * @default 20
 *
 * @param ---Presentation---
 * @default
 *
 * @param worldMapId
 * @parent ---Presentation---
 * @text World Map ID
 * @type number
 * @min 0
 * @desc The map that holds your painted territories. Used by Scan Adjacency and the in-world banner. 0 = current map.
 * @default 0
 *
 * @param neutralColor
 * @parent ---Presentation---
 * @text Neutral Color
 * @desc Hex color for unowned/neutral regions.
 * @default #7f8c8d
 *
 * @param panelColor
 * @parent ---Presentation---
 * @text Strategic Panel Color
 * @desc Hex background tint for the strategic map screen.
 * @default #12161d
 *
 * @param showBanner
 * @parent ---Presentation---
 * @text Show In-World Banner
 * @type boolean
 * @on Show
 * @off Hide
 * @desc Briefly show a banner when the player enters a new territory.
 * @default true
 *
 * @param showToasts
 * @parent ---Presentation---
 * @text Show Capture Toasts
 * @type boolean
 * @on Show
 * @off Hide
 * @desc Pop a small on-map notice when a region changes hands nearby.
 * @default true
 *
 * @param tintTiles
 * @parent ---Presentation---
 * @text Tint Owned Tiles
 * @type boolean
 * @on Tint
 * @off Off
 * @desc Overlay a translucent owner-color on region tiles of the world map. Off by default (can be heavy on huge maps).
 * @default false
 *
 * @param tintOpacity
 * @parent ---Presentation---
 * @text Tile Tint Opacity
 * @type number
 * @min 0
 * @max 255
 * @desc Opacity of the tile tint overlay when enabled.
 * @default 70
 *
 * @param ---Developer Hooks---
 * @default
 *
 * @param onCaptureCommonEvent
 * @parent ---Developer Hooks---
 * @text On-Capture Common Event
 * @type common_event
 * @desc Common Event run whenever a region changes hands. 0 = none.
 * @default 0
 *
 * @param varCapturedRegion
 * @parent ---Developer Hooks---
 * @text Var: Captured Region ID
 * @type variable
 * @desc Game variable that receives the captured Region ID before the common event runs.
 * @default 0
 *
 * @param varNewOwner
 * @parent ---Developer Hooks---
 * @text Var: New Owner Index
 * @type variable
 * @desc Game variable that receives the new owner's index (0-based; -1 = neutral).
 * @default 0
 *
 * @param varOldOwner
 * @parent ---Developer Hooks---
 * @text Var: Old Owner Index
 * @type variable
 * @desc Game variable that receives the old owner's index (0-based; -1 = neutral).
 * @default 0
 *
 * @param ---Battle Influence---
 * @default
 *
 * @param battleInfluenceEnabled
 * @parent ---Battle Influence---
 * @text Battle Influence Enabled
 * @type boolean
 * @on Enabled
 * @off Disabled
 * @desc Winning battles against faction troops reduces region defense (on their land) or faction strength (in the field).
 * @default true
 *
 * @param factionNotetagKey
 * @parent ---Battle Influence---
 * @text Enemy Faction Notetag
 * @desc Notetag key on an Enemy's note box that marks its faction, e.g. "faction" for <faction:oasis>.
 * @default faction
 *
 * @param mapRegionNotetagKey
 * @parent ---Battle Influence---
 * @text Map Region Notetag
 * @desc Map notetag that says which region a whole map counts as, e.g. "fwRegion" for <fwRegion:130>. Used when the battle tile has no region.
 * @default fwRegion
 *
 * @param defenseReductionBase
 * @parent ---Battle Influence---
 * @text Defense Cut (base)
 * @type number
 * @min 0
 * @desc Base region-defense reduction when you beat a faction on its own land.
 * @default 8
 *
 * @param perEnemyDefense
 * @parent ---Battle Influence---
 * @text Defense Cut (per enemy)
 * @type number
 * @min 0
 * @desc Extra region-defense reduction per defeated enemy of that faction.
 * @default 2
 *
 * @param strengthReductionBase
 * @parent ---Battle Influence---
 * @text Strength Cut (base)
 * @type number
 * @min 0
 * @desc Base faction-strength reduction when you beat a faction away from its land.
 * @default 5
 *
 * @param perEnemyStrength
 * @parent ---Battle Influence---
 * @text Strength Cut (per enemy)
 * @type number
 * @min 0
 * @desc Extra faction-strength reduction per defeated enemy of that faction.
 * @default 1
 *
 * @param minRegionDefense
 * @parent ---Battle Influence---
 * @text Minimum Region Defense
 * @type number
 * @min 0
 * @desc Battle influence will not push a region's defense below this.
 * @default 2
 *
 * @param minFactionStrength
 * @parent ---Battle Influence---
 * @text Minimum Faction Strength
 * @type number
 * @min 0
 * @desc Battle influence will not push a faction's strength below this.
 * @default 5
 *
 * @param permanentBattleDamage
 * @parent ---Battle Influence---
 * @text Permanent Damage
 * @type boolean
 * @on Permanent
 * @off Regenerates
 * @desc If ON, also lowers the baseline so the sim doesn't fully heal the loss over time.
 * @default false
 *
 * @param showBattleInfluenceToast
 * @parent ---Battle Influence---
 * @text Show Battle Toast
 * @type boolean
 * @default true
 *
 * @command setBattleContext
 * @text Set Battle Context
 * @desc Optional: before a battle, force which region it counts in and/or which faction the enemies are. Cleared after the battle.
 * @arg regionId
 * @text Region ID
 * @type number
 * @min 0
 * @desc Region this battle counts toward. 0 = auto (map notetag, else your current tile).
 * @default 0
 * @arg factionId
 * @text Faction ID
 * @type string
 * @desc Force all enemies to this faction id. Blank = read each enemy's notetag.
 *
 * @command openStrategicMap
 * @text Open Strategic Map
 * @desc Opens the strategic overview screen (colored territories, legend, diplomacy).
 *
 * @command advanceTick
 * @text Advance War (Tick)
 * @desc Force the simulation forward by one or more ticks immediately.
 * @arg count
 * @text Ticks
 * @type number
 * @min 1
 * @default 1
 *
 * @command joinFaction
 * @text Join Faction
 * @desc Set the player's allegiance to a faction.
 * @arg factionId
 * @text Faction ID
 * @type string
 * @desc The id of the faction (as defined in Factions).
 *
 * @command leaveFaction
 * @text Leave Faction
 * @desc Clear the player's allegiance.
 *
 * @command influenceRegion
 * @text Influence Region
 * @desc Player action: bolster, weaken, or capture a region.
 * @arg regionId
 * @text Region ID
 * @type number
 * @min 1
 * @desc Which region to affect. Use 0 to affect the region the player stands on.
 * @default 0
 * @arg mode
 * @text Mode
 * @type select
 * @option Bolster (strengthen owner's defense)
 * @value bolster
 * @option Weaken (reduce defense)
 * @value weaken
 * @option Capture (assign to your faction)
 * @value capture
 * @default bolster
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @desc Strength of the effect (bolster/weaken). Ignored for capture.
 * @default 15
 *
 * @command setRegionOwner
 * @text Set Region Owner
 * @desc Directly assign a region to a faction (story/scripted control). Fires capture hooks.
 * @arg regionId
 * @text Region ID
 * @type number
 * @min 1
 * @default 1
 * @arg factionId
 * @text Faction ID
 * @type string
 * @desc Faction id, or leave blank for neutral.
 *
 * @command setRelation
 * @text Set Relation
 * @desc Force a diplomatic relation between two factions.
 * @arg a
 * @text Faction A
 * @type string
 * @arg b
 * @text Faction B
 * @type string
 * @arg state
 * @text Relation
 * @type select
 * @option Neutral
 * @value neutral
 * @option Ally
 * @value ally
 * @option Rival
 * @value rival
 * @option Truce
 * @value truce
 * @default neutral
 *
 * @command scanAdjacency
 * @text Scan Adjacency (current map)
 * @desc Auto-detect which regions border each other from the painted tiles on the current map.
 *
 * @command setFactionStat
 * @text Set Faction Stat
 * @desc Adjust a faction's strength or resources (buffs, story events, rewards).
 * @arg factionId
 * @text Faction ID
 * @type string
 * @arg stat
 * @text Stat
 * @type select
 * @option Strength
 * @value strength
 * @option Resources
 * @value resources
 * @default strength
 * @arg operation
 * @text Operation
 * @type select
 * @option Add
 * @value add
 * @option Set
 * @value set
 * @default add
 * @arg value
 * @text Value
 * @type number
 * @min -9999
 * @default 10
 */

/*~struct~Faction:
 * @param id
 * @text ID
 * @desc Unique key used by commands and adjacency. Lowercase, no spaces (e.g. "iron").
 *
 * @param name
 * @text Display Name
 * @desc Shown to the player.
 *
 * @param color
 * @text Color
 * @desc Hex color for this faction's territory (e.g. #c0392b).
 * @default #cccccc
 *
 * @param strength
 * @text Strength
 * @type number
 * @desc Core military power. Drives attack and defense.
 * @default 50
 *
 * @param resources
 * @text Starting Resources
 * @type number
 * @desc Spent to fuel attacks; replenished by region income.
 * @default 20
 *
 * @param aggression
 * @text Aggression (0-100)
 * @type number
 * @min 0
 * @max 100
 * @desc How often it attacks when it has a valid target.
 * @default 50
 *
 * @param expansionism
 * @text Expansionism (0-100)
 * @type number
 * @min 0
 * @max 100
 * @desc How eagerly it grabs weakly-held/neutral regions.
 * @default 50
 *
 * @param joinable
 * @text Player Joinable
 * @type boolean
 * @default true
 */

/*~struct~Region:
 * @param regionId
 * @text Region ID
 * @type number
 * @min 1
 * @max 255
 * @desc The Region ID you painted on the world map (1-255).
 * @default 1
 *
 * @param name
 * @text Name
 * @desc Territory name shown to the player.
 *
 * @param owner
 * @text Starting Owner
 * @desc Faction id that starts owning this region. Leave blank for neutral.
 *
 * @param income
 * @text Income
 * @type number
 * @desc Resources the owner gains from this region each tick.
 * @default 5
 *
 * @param defense
 * @text Base Defense
 * @type number
 * @desc Defensive bonus that must be overcome to capture this region.
 * @default 15
 *
 * @param adjacent
 * @text Adjacent Region IDs
 * @desc Comma-separated Region IDs this territory borders (e.g. "2,3,5"). Blank + Scan Adjacency to auto-fill.
 */

var $gameFactionWar = null;

(() => {
    "use strict";

    const PLUGIN_NAME = "FactionBorderWars";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const jparse = (str, fallback) => {
        try { return JSON.parse(str); } catch (e) { return fallback; }
    };
    const parseStructArray = (str) => jparse(str, []).map((s) => jparse(s, {}));
    const num = (v, d) => (v === undefined || v === "" || isNaN(Number(v)) ? d : Number(v));
    const bool = (v) => v === true || v === "true";

    // ---- Config -----------------------------------------------------------
    const CFG = {
        factions: parseStructArray(params.factions).map((f) => ({
            id: String(f.id || "").trim(),
            name: String(f.name || f.id || "Faction"),
            color: String(f.color || "#cccccc"),
            strength: num(f.strength, 50),
            resources: num(f.resources, 20),
            aggression: num(f.aggression, 50),
            expansionism: num(f.expansionism, 50),
            joinable: bool(f.joinable),
        })),
        regions: parseStructArray(params.regions).map((r) => ({
            regionId: num(r.regionId, 0),
            name: String(r.name || ("Region " + r.regionId)),
            owner: String(r.owner || "").trim(),
            income: num(r.income, 5),
            defense: num(r.defense, 15),
            adjacent: String(r.adjacent || "")
                .split(",")
                .map((s) => num(s.trim(), 0))
                .filter((n) => n > 0),
        })),
        startingPlayerFaction: String(params.startingPlayerFaction || "").trim(),
        stepsPerTick: num(params.stepsPerTick, 40),
        battleRandomness: num(params.battleRandomness, 25),
        attackWeight: num(params.attackWeight, 1.0),
        defenseWeight: num(params.defenseWeight, 0.6),
        pauseDuringEvents: bool(params.simulateWhileInMenus),
        diplomacyEnabled: bool(params.diplomacyEnabled),
        truceDuration: num(params.truceDuration, 6),
        diplomacyChance: num(params.diplomacyChance, 20),
        worldMapId: num(params.worldMapId, 0),
        neutralColor: String(params.neutralColor || "#7f8c8d"),
        panelColor: String(params.panelColor || "#12161d"),
        showBanner: bool(params.showBanner),
        showToasts: bool(params.showToasts),
        tintTiles: bool(params.tintTiles),
        tintOpacity: num(params.tintOpacity, 70),
        onCaptureCE: num(params.onCaptureCommonEvent, 0),
        varRegion: num(params.varCapturedRegion, 0),
        varNew: num(params.varNewOwner, 0),
        varOld: num(params.varOldOwner, 0),
        battleInfluenceEnabled: bool(params.battleInfluenceEnabled),
        factionTag: String(params.factionNotetagKey || "faction").trim(),
        mapRegionTag: String(params.mapRegionNotetagKey || "fwRegion").trim(),
        defenseCutBase: num(params.defenseReductionBase, 8),
        defenseCutPer: num(params.perEnemyDefense, 2),
        strengthCutBase: num(params.strengthReductionBase, 5),
        strengthCutPer: num(params.perEnemyStrength, 1),
        minRegionDefense: num(params.minRegionDefense, 2),
        minFactionStrength: num(params.minFactionStrength, 5),
        permanentBattleDamage: bool(params.permanentBattleDamage),
        showBattleToast: bool(params.showBattleInfluenceToast),
    };

    const relKey = (a, b) => [a, b].sort().join("|");

    //=========================================================================
    // Game_FactionWar : the simulation manager (saved with the game)
    //=========================================================================
    function Game_FactionWar() {
        this.initialize.apply(this, arguments);
    }

    Game_FactionWar.prototype.initialize = function () {
        // Deep-copy config so runtime state is independent of params.
        // baseStrength/baseDefense are the equilibrium values strength and
        // defense drift back toward each tick (prevents permanent snowballs
        // and death-spirals, keeping borders contestable).
        this._factions = CFG.factions.map((f) => Object.assign({}, f, {
            baseStrength: f.strength,
        }));
        this._regions = CFG.regions.map((r) => Object.assign({}, r, {
            adjacent: r.adjacent.slice(),
            baseDefense: r.defense,
        }));
        this._relations = {}; // "a|b" -> { state, timer }
        this._playerFactionId = CFG.startingPlayerFaction || "";
        this._stepCounter = 0;
        this._tickCount = 0;
        this._log = []; // { tick, text }
        this._pendingToasts = []; // texts not yet shown on map
    };

    // ---- Lookups ----------------------------------------------------------
    Game_FactionWar.prototype.faction = function (id) {
        return this._factions.find((f) => f.id === id) || null;
    };
    Game_FactionWar.prototype.factionIndex = function (id) {
        return this._factions.findIndex((f) => f.id === id);
    };
    Game_FactionWar.prototype.factions = function () { return this._factions; };
    Game_FactionWar.prototype.regions = function () { return this._regions; };
    Game_FactionWar.prototype.region = function (regionId) {
        return this._regions.find((r) => r.regionId === regionId) || null;
    };
    Game_FactionWar.prototype.regionOwner = function (regionId) {
        const r = this.region(regionId);
        return r ? r.owner : "";
    };
    Game_FactionWar.prototype.regionsOwnedBy = function (id) {
        return this._regions.filter((r) => r.owner === id).map((r) => r.regionId);
    };
    Game_FactionWar.prototype.factionColor = function (id) {
        const f = this.faction(id);
        return f ? f.color : CFG.neutralColor;
    };
    Game_FactionWar.prototype.factionName = function (id) {
        const f = this.faction(id);
        return f ? f.name : "Neutral";
    };
    Game_FactionWar.prototype.playerFactionId = function () { return this._playerFactionId; };
    Game_FactionWar.prototype.tickCount = function () { return this._tickCount; };
    Game_FactionWar.prototype.log = function () { return this._log; };

    Game_FactionWar.prototype.isEliminated = function (id) {
        return this.regionsOwnedBy(id).length === 0;
    };

    // ---- Diplomacy --------------------------------------------------------
    Game_FactionWar.prototype.getRelation = function (a, b) {
        if (a === b) return "self";
        const rec = this._relations[relKey(a, b)];
        return rec ? rec.state : "neutral";
    };
    Game_FactionWar.prototype.setRelation = function (a, b, state, timer) {
        if (a === b) return;
        this._relations[relKey(a, b)] = { state: state, timer: timer || 0 };
    };
    Game_FactionWar.prototype.canAttack = function (attackerId, defenderId) {
        if (!defenderId) return true; // neutral is always fair game
        if (attackerId === defenderId) return false;
        if (!CFG.diplomacyEnabled) return true;
        const rel = this.getRelation(attackerId, defenderId);
        return rel !== "ally" && rel !== "truce";
    };

    // ---- Player control ---------------------------------------------------
    Game_FactionWar.prototype.setPlayerFaction = function (id) {
        this._playerFactionId = this.faction(id) ? id : "";
    };

    // ---- Stepping / ticking ----------------------------------------------
    Game_FactionWar.prototype.onStep = function () {
        if (CFG.pauseDuringEvents && $gameMap && $gameMap.isEventRunning()) return;
        this._stepCounter++;
        if (this._stepCounter >= CFG.stepsPerTick) {
            this._stepCounter = 0;
            this.tick();
        }
    };

    Game_FactionWar.prototype.tick = function (times) {
        const n = Math.max(1, times || 1);
        for (let i = 0; i < n; i++) this._runOneTick();
    };

    Game_FactionWar.prototype._runOneTick = function () {
        this._tickCount++;
        this._collectIncome();
        this._upkeep();
        if (CFG.diplomacyEnabled) this._evolveDiplomacy();
        this._resolveAttacks();
    };

    // Baseline "size" a faction can hold comfortably; beyond this, empires
    // overextend and their conquered land grows restless.
    Game_FactionWar.prototype._coreSize = function () {
        return Math.ceil(this._regions.length / Math.max(1, this._factions.length));
    };

    // Upkeep pulls strength/defense back toward baseline and lets hegemonies
    // fracture, so the map keeps moving instead of locking after one winner.
    Game_FactionWar.prototype._upkeep = function () {
        for (const f of this._factions) {
            f.strength += (f.baseStrength - f.strength) * 0.15;
            f.resources *= 0.9; // upkeep drain; stops infinite war-chest hoarding
        }
        for (const r of this._regions) {
            r.defense += (r.baseDefense - r.defense) * 0.2; // bolster/repel bonuses fade
        }

        // Hegemony revolts: if one faction holds most of the map, its outlying
        // holdings break away. A revolt hands the region to a bordering rival
        // (reviving fallen factions so the map keeps moving) or, failing that,
        // to neutral. This is the main force that reopens a decided war.
        const total = this._regions.length;
        const threshold = Math.ceil(total * 0.55);
        for (const f of this._factions) {
            const owned = this._regions.filter((r) => r.owner === f.id);
            if (owned.length >= threshold) {
                const excess = owned.length - this._coreSize();
                const revoltChance = Math.min(0.4, 0.08 * excess);
                for (const r of owned) {
                    if (Math.random() < revoltChance) {
                        const heir = this._revoltHeir(r, f.id);
                        this._captureRegion(r.regionId, heir, f.id);
                        const to = heir ? this.factionName(heir) : "independence";
                        this._push(`${r.name} breaks from ${f.name} for ${to}!`);
                    }
                }
            }
        }
    };

    // Choose who a revolting region defects to: prefer the weakest rival that
    // borders it (so beaten factions can claw back), else any weakest rival,
    // else neutral.
    Game_FactionWar.prototype._revoltHeir = function (region, hegemonId) {
        const rivals = this._factions.filter((f) => f.id !== hegemonId);
        if (rivals.length === 0) return "";
        const bordering = rivals.filter((f) =>
            region.adjacent.some((adjId) => this.regionOwner(adjId) === f.id)
        );
        const pool = bordering.length ? bordering : rivals;
        // Weakest (fewest regions) rival is likeliest to rise from unrest.
        pool.sort((x, y) => this.regionsOwnedBy(x.id).length - this.regionsOwnedBy(y.id).length);
        // 70% to the weakest contender, else neutral, to keep some flux.
        return Math.random() < 0.7 ? pool[0].id : "";
    };

    Game_FactionWar.prototype._collectIncome = function () {
        for (const r of this._regions) {
            const f = this.faction(r.owner);
            if (f) f.resources += r.income;
        }
    };

    Game_FactionWar.prototype._shuffled = function (arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    Game_FactionWar.prototype._evolveDiplomacy = function () {
        // Decrement truce timers -> expire to neutral.
        for (const key of Object.keys(this._relations)) {
            const rec = this._relations[key];
            if (rec.state === "truce") {
                rec.timer--;
                if (rec.timer <= 0) rec.state = "neutral";
            }
        }
        if (Math.random() * 100 >= CFG.diplomacyChance) return;

        const alive = this._factions.filter((f) => !this.isEliminated(f.id));
        if (alive.length < 2) return;

        // Identify the current front-runner; others tend to coalesce against it.
        const leader = alive
            .slice()
            .sort((x, y) => this.regionsOwnedBy(y.id).length - this.regionsOwnedBy(x.id).length)[0];

        const a = alive[Math.floor(Math.random() * alive.length)];
        const others = alive.filter((f) => f.id !== a.id);
        const b = others[Math.floor(Math.random() * others.length)];
        const rel = this.getRelation(a.id, b.id);
        const involvesLeader = a.id === leader.id || b.id === leader.id;

        if (rel === "neutral") {
            if (involvesLeader) {
                // Someone rivals the runaway leader.
                this.setRelation(a.id, b.id, "rival");
                this._push(`${a.id === leader.id ? b.name : a.name} moves against the ascendant ${leader.name}.`);
            } else {
                // Two lesser powers make common cause.
                const calmness = 100 - a.aggression;
                if (Math.random() * 100 < 40 + calmness * 0.4) {
                    this.setRelation(a.id, b.id, "ally");
                    this._push(`${a.name} and ${b.name} form an alliance.`);
                }
            }
        } else if (rel === "ally" && !involvesLeader && Math.random() * 100 < a.aggression * 0.3) {
            this.setRelation(a.id, b.id, "neutral");
            this._push(`${a.name} breaks its alliance with ${b.name}.`);
        } else if (rel === "rival" && involvesLeader && this.regionsOwnedBy(leader.id).length <= this._coreSize()) {
            // Leader has been cut down to size; tensions can ease.
            this.setRelation(a.id, b.id, "truce", CFG.truceDuration);
        }

        // A faction ground down to its last region seeks a truce to survive.
        const weak = alive.find((f) => this.regionsOwnedBy(f.id).length === 1);
        if (weak) {
            const strong = this._shuffled(alive).find(
                (f) => f.id !== weak.id && this.getRelation(weak.id, f.id) === "neutral"
            );
            if (strong && Math.random() < 0.6) {
                this.setRelation(weak.id, strong.id, "truce", CFG.truceDuration);
                this._push(`${weak.name} secures a truce with ${strong.name}.`);
            }
        }
    };

    Game_FactionWar.prototype._resolveAttacks = function () {
        const order = this._shuffled(this._factions.filter((f) => !this.isEliminated(f.id)));
        for (const f of order) this._factionActs(f);
    };

    Game_FactionWar.prototype._borderTargets = function (factionId) {
        const owned = this._regions.filter((r) => r.owner === factionId);
        const targetIds = new Set();
        for (const r of owned) {
            for (const adjId of r.adjacent) {
                const t = this.region(adjId);
                if (t && t.owner !== factionId && this.canAttack(factionId, t.owner)) {
                    targetIds.add(adjId);
                }
            }
        }
        return [...targetIds].map((id) => this.region(id)).filter(Boolean);
    };

    Game_FactionWar.prototype._factionActs = function (f) {
        const targets = this._borderTargets(f.id);
        if (targets.length === 0) return;

        // Decide whether to attack this tick.
        let willAttack = Math.random() * 100 < f.aggression;
        // Expansionists rarely pass up a neutral grab.
        const hasNeutral = targets.some((t) => !t.owner);
        if (hasNeutral && Math.random() * 100 < f.expansionism) willAttack = true;
        if (!willAttack) return;

        // Prefer the softest target (expansionists especially).
        targets.sort((x, y) => this._defensePower(x) - this._defensePower(y));
        const pickSoft = Math.random() * 100 < f.expansionism;
        const target = pickSoft ? targets[0] : targets[Math.floor(Math.random() * targets.length)];

        this._battle(f, target);
    };

    Game_FactionWar.prototype._defensePower = function (region) {
        const owner = this.faction(region.owner);
        let base = owner ? owner.strength * CFG.defenseWeight : 0;
        // Last stand: a faction defending its final territory fights fiercely,
        // making total elimination rare (keeps the map populated and lively).
        if (owner && this.regionsOwnedBy(owner.id).length === 1) {
            base += owner.baseStrength * 0.8;
        }
        return base + region.defense;
    };

    Game_FactionWar.prototype._battle = function (attacker, region) {
        const committed = Math.floor(attacker.resources * 0.5);
        attacker.resources -= committed;

        const ownedA = this.regionsOwnedBy(attacker.id).length;
        const ownedD = region.owner ? this.regionsOwnedBy(region.owner).length : 0;
        const over = Math.max(0, ownedA - this._coreSize()); // overextension

        const rnd = () => Math.random() * CFG.battleRandomness;

        // Larger empires project force less efficiently.
        const atkPower =
            (attacker.strength * CFG.attackWeight + committed) / (1 + 0.3 * over) + rnd();

        // Defenders rally harder against a much larger aggressor (underdog bonus).
        const underdog = Math.max(0, ownedA - ownedD) * 4;
        const defPower = this._defensePower(region) + underdog + rnd();

        if (atkPower > defPower) {
            const oldOwner = region.owner;
            this._captureRegion(region.regionId, attacker.id, oldOwner);
            // Momentum is temporary — _upkeep pulls strength back to baseline.
            attacker.strength += 3;
        } else {
            // Repelled: defenders dig in a little (also fades via _upkeep).
            region.defense += 3;
        }
    };

    // Central capture routine -> fires all developer hooks.
    Game_FactionWar.prototype._captureRegion = function (regionId, newOwnerId, oldOwnerId) {
        const region = this.region(regionId);
        if (!region) return;
        region.owner = newOwnerId || "";

        const newName = this.factionName(newOwnerId);
        this._push(`${newName} seizes ${region.name}!`);
        if (CFG.showToasts) this._pendingToasts.push(`${region.name} → ${newName}`);

        // Hook 1: game variables + common event
        if (CFG.varRegion > 0) $gameVariables.setValue(CFG.varRegion, regionId);
        if (CFG.varNew > 0) $gameVariables.setValue(CFG.varNew, this.factionIndex(newOwnerId));
        if (CFG.varOld > 0) $gameVariables.setValue(CFG.varOld, this.factionIndex(oldOwnerId));
        if (CFG.onCaptureCE > 0 && $gameTemp) $gameTemp.reserveCommonEvent(CFG.onCaptureCE);

        // Hook 2: JS callback
        if (window.FactionWar && typeof window.FactionWar.onRegionCaptured === "function") {
            try {
                window.FactionWar.onRegionCaptured(regionId, newOwnerId || "", oldOwnerId || "");
            } catch (e) {
                console.error("FactionWar.onRegionCaptured error:", e);
            }
        }
    };

    Game_FactionWar.prototype.setRegionOwner = function (regionId, factionId) {
        const region = this.region(regionId);
        if (!region) return;
        if (region.owner === factionId) return;
        this._captureRegion(regionId, factionId, region.owner);
    };

    // ---- Player influence -------------------------------------------------
    Game_FactionWar.prototype.influence = function (regionId, mode, amount) {
        const region = this.region(regionId);
        if (!region) return;
        if (mode === "bolster") {
            region.defense += amount;
        } else if (mode === "weaken") {
            region.defense = Math.max(0, region.defense - amount);
        } else if (mode === "capture") {
            const owner = this._playerFactionId;
            if (owner && owner !== region.owner) {
                this._captureRegion(regionId, owner, region.owner);
            }
        }
    };

    Game_FactionWar.prototype.setFactionStat = function (id, stat, op, value) {
        const f = this.faction(id);
        if (!f) return;
        if (stat !== "strength" && stat !== "resources") return;
        f[stat] = op === "set" ? value : f[stat] + value;
        if (f[stat] < 0) f[stat] = 0;
    };

    // ---- Adjacency scanning (from a real painted map) ---------------------
    Game_FactionWar.prototype.scanAdjacencyFromCurrentMap = function () {
        if (!$gameMap) return;
        const w = $gameMap.width();
        const h = $gameMap.height();
        const adj = {}; // regionId -> Set
        const add = (a, b) => {
            if (a === b || a === 0 || b === 0) return;
            (adj[a] = adj[a] || new Set()).add(b);
            (adj[b] = adj[b] || new Set()).add(a);
        };
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                const id = $gameMap.regionId(x, y);
                if (id === 0) continue;
                if (x + 1 < w) add(id, $gameMap.regionId(x + 1, y));
                if (y + 1 < h) add(id, $gameMap.regionId(x, y + 1));
            }
        }
        for (const region of this._regions) {
            const set = adj[region.regionId];
            if (set) region.adjacent = [...set];
        }
        this._push("Adjacency scanned from the current map.");
    };

    // ---- Logging ----------------------------------------------------------
    Game_FactionWar.prototype._push = function (text) {
        this._log.push({ tick: this._tickCount, text });
        if (this._log.length > 60) this._log.shift();
    };
    Game_FactionWar.prototype.consumeToast = function () {
        return this._pendingToasts.length ? this._pendingToasts.shift() : null;
    };

    // ---- Battle influence -------------------------------------------------
    // Lower a region's defense (a won battle on that faction's own soil).
    Game_FactionWar.prototype.reduceRegionDefense = function (regionId, amount, permanent) {
        const r = this.region(regionId);
        if (!r || amount <= 0) return false;
        r.defense = Math.max(CFG.minRegionDefense, r.defense - amount);
        if (permanent) r.baseDefense = Math.max(CFG.minRegionDefense, r.baseDefense - amount);
        return true;
    };

    // Lower a faction's strength (a won battle against them in the field).
    Game_FactionWar.prototype.reduceFactionStrength = function (factionId, amount, permanent) {
        const f = this.faction(factionId);
        if (!f || amount <= 0) return false;
        f.strength = Math.max(CFG.minFactionStrength, f.strength - amount);
        if (permanent) f.baseStrength = Math.max(CFG.minFactionStrength, f.baseStrength - amount);
        return true;
    };

    // Core resolver, reusable by player battles AND future autonomous
    // skirmishes. factionCounts = { factionId: enemiesDefeated }. For each
    // faction: if it OWNS the battle region -> soften that region's defense
    // (home); otherwise -> sap that faction's strength (away).
    Game_FactionWar.prototype.resolveFieldBattle = function (regionId, factionCounts) {
        if (!CFG.battleInfluenceEnabled || !factionCounts) return;
        const owner = this.regionOwner(regionId);
        const perm = CFG.permanentBattleDamage;
        for (const factionId of Object.keys(factionCounts)) {
            if (!factionId || !this.faction(factionId)) continue;
            const n = factionCounts[factionId] || 0;
            if (owner === factionId && this.region(regionId)) {
                const cut = CFG.defenseCutBase + CFG.defenseCutPer * n;
                if (this.reduceRegionDefense(regionId, cut, perm)) {
                    this._battleToast(`${this.factionName(factionId)}'s defenses at ${this.region(regionId).name} are weakened!`);
                }
            } else {
                const cut = CFG.strengthCutBase + CFG.strengthCutPer * n;
                if (this.reduceFactionStrength(factionId, cut, perm)) {
                    this._battleToast(`${this.factionName(factionId)}'s forces are battered in the field!`);
                }
            }
        }
    };

    Game_FactionWar.prototype._battleToast = function (text) {
        this._push(text);
        if (CFG.showBattleToast) this._pendingToasts.push(text);
    };

    //=========================================================================
    // Public API (script calls + developer overrides)
    //=========================================================================
    window.FactionWar = window.FactionWar || {};
    Object.assign(window.FactionWar, {
        // Overridable hook (default no-op, kept if user already set one).
        onRegionCaptured: window.FactionWar.onRegionCaptured || null,
        getRegionOwner: (regionId) => ($gameFactionWar ? $gameFactionWar.regionOwner(regionId) : ""),
        getFaction: (id) => ($gameFactionWar ? $gameFactionWar.faction(id) : null),
        isControlledBy: (regionId, id) =>
            $gameFactionWar ? $gameFactionWar.regionOwner(regionId) === id : false,
        regionsOwnedBy: (id) => ($gameFactionWar ? $gameFactionWar.regionsOwnedBy(id) : []),
        playerFaction: () => ($gameFactionWar ? $gameFactionWar.playerFactionId() : ""),
        playerRegionId: () => ($gamePlayer ? $gameMap.regionId($gamePlayer.x, $gamePlayer.y) : 0),
        getRelation: (a, b) => ($gameFactionWar ? $gameFactionWar.getRelation(a, b) : "neutral"),
        advanceTick: (n) => { if ($gameFactionWar) $gameFactionWar.tick(n || 1); },
        // Battle influence (also usable by future autonomous skirmishes):
        reduceRegionDefense: (regionId, amt, perm) => ($gameFactionWar ? $gameFactionWar.reduceRegionDefense(regionId, amt, perm) : false),
        reduceFactionStrength: (id, amt, perm) => ($gameFactionWar ? $gameFactionWar.reduceFactionStrength(id, amt, perm) : false),
        resolveFieldBattle: (regionId, factionCounts) => { if ($gameFactionWar) $gameFactionWar.resolveFieldBattle(regionId, factionCounts); },
    });

    //=========================================================================
    // Save / load integration
    //=========================================================================
    const _DM_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DM_createGameObjects.call(this);
        $gameFactionWar = new Game_FactionWar();
    };

    const _DM_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const contents = _DM_makeSaveContents.call(this);
        contents.factionWar = $gameFactionWar;
        return contents;
    };

    const _DM_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DM_extractSaveContents.call(this, contents);
        $gameFactionWar = new Game_FactionWar();
        if (contents.factionWar) {
            Object.assign($gameFactionWar, contents.factionWar);
        }
    };

    //=========================================================================
    // Step hook
    //=========================================================================
    const _GP_increaseSteps = Game_Player.prototype.increaseSteps;
    Game_Player.prototype.increaseSteps = function () {
        _GP_increaseSteps.call(this);
        if ($gameFactionWar) $gameFactionWar.onStep();
    };

    //=========================================================================
    // Plugin commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "openStrategicMap", () => {
        SceneManager.push(Scene_FactionWar);
    });
    PluginManager.registerCommand(PLUGIN_NAME, "advanceTick", (args) => {
        if ($gameFactionWar) $gameFactionWar.tick(num(args.count, 1));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "joinFaction", (args) => {
        if ($gameFactionWar) $gameFactionWar.setPlayerFaction(String(args.factionId || "").trim());
    });
    PluginManager.registerCommand(PLUGIN_NAME, "leaveFaction", () => {
        if ($gameFactionWar) $gameFactionWar.setPlayerFaction("");
    });
    PluginManager.registerCommand(PLUGIN_NAME, "influenceRegion", (args) => {
        if (!$gameFactionWar) return;
        let rid = num(args.regionId, 0);
        if (rid === 0 && $gamePlayer) rid = $gameMap.regionId($gamePlayer.x, $gamePlayer.y);
        $gameFactionWar.influence(rid, String(args.mode || "bolster"), num(args.amount, 15));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "setRegionOwner", (args) => {
        if ($gameFactionWar) {
            $gameFactionWar.setRegionOwner(num(args.regionId, 1), String(args.factionId || "").trim());
        }
    });
    PluginManager.registerCommand(PLUGIN_NAME, "setRelation", (args) => {
        if (!$gameFactionWar) return;
        const timer = args.state === "truce" ? CFG.truceDuration : 0;
        $gameFactionWar.setRelation(
            String(args.a || "").trim(),
            String(args.b || "").trim(),
            String(args.state || "neutral"),
            timer
        );
    });
    PluginManager.registerCommand(PLUGIN_NAME, "scanAdjacency", () => {
        if ($gameFactionWar) $gameFactionWar.scanAdjacencyFromCurrentMap();
    });
    PluginManager.registerCommand(PLUGIN_NAME, "setFactionStat", (args) => {
        if ($gameFactionWar) {
            $gameFactionWar.setFactionStat(
                String(args.factionId || "").trim(),
                String(args.stat || "strength"),
                String(args.operation || "add"),
                num(args.value, 0)
            );
        }
    });
    // Transient per-battle override set by the Set Battle Context command.
    let FW_BattleContext = null;
    PluginManager.registerCommand(PLUGIN_NAME, "setBattleContext", (args) => {
        FW_BattleContext = {
            regionId: num(args.regionId, 0),
            factionId: String(args.factionId || "").trim(),
        };
    });

    //=========================================================================
    // Battle influence: turn won battles into strategic pressure
    //=========================================================================
    // Read an enemy's faction from its notetag, e.g. <faction:oasis>.
    function enemyFaction(enemyId) {
        const data = $dataEnemies && $dataEnemies[enemyId];
        if (!data) return "";
        const re = new RegExp("<" + CFG.factionTag + ":\\s*([^>]+)>", "i");
        const m = String(data.note || "").match(re);
        return m ? m[1].trim() : "";
    }

    // Which region does this battle count toward?
    //   1) explicit Set Battle Context region, else
    //   2) the current map's <fwRegion:n> notetag, else
    //   3) the region tile the player is standing on.
    function battleRegionId() {
        if (FW_BattleContext && FW_BattleContext.regionId > 0) return FW_BattleContext.regionId;
        if ($dataMap && $dataMap.note) {
            const re = new RegExp("<" + CFG.mapRegionTag + ":\\s*(\\d+)>", "i");
            const m = $dataMap.note.match(re);
            if (m) return Number(m[1]);
        }
        if ($gamePlayer) return $gameMap.regionId($gamePlayer.x, $gamePlayer.y);
        return 0;
    }

    // Tally defeated enemies by faction (all troop members on a victory).
    function tallyFactions() {
        const counts = {};
        const forced = FW_BattleContext && FW_BattleContext.factionId;
        const members = $gameTroop ? $gameTroop.members() : [];
        for (const m of members) {
            const fid = forced ? FW_BattleContext.factionId : enemyFaction(m.enemyId());
            if (fid) counts[fid] = (counts[fid] || 0) + 1;
        }
        return counts;
    }

    const _BattleManager_processVictory = BattleManager.processVictory;
    BattleManager.processVictory = function () {
        // A companion system (e.g. FactionSkirmishes) may take over the outcome
        // of a specific battle; when it does, skip the automatic influence.
        const suppressed = window.FactionWar && window.FactionWar._suppressBattleInfluence;
        if (!suppressed && CFG.battleInfluenceEnabled && $gameFactionWar) {
            const counts = tallyFactions();
            if (Object.keys(counts).length > 0) {
                $gameFactionWar.resolveFieldBattle(battleRegionId(), counts);
            }
        }
        if (window.FactionWar) window.FactionWar._suppressBattleInfluence = false;
        FW_BattleContext = null;
        _BattleManager_processVictory.call(this);
    };

    // Clear any stale context if the battle ends without a victory.
    const _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function (result) {
        if (result !== 0) FW_BattleContext = null;
        _BattleManager_endBattle.call(this, result);
    };

    //=========================================================================
    // Strategic map screen
    //=========================================================================
    function Scene_FactionWar() {
        this.initialize.apply(this, arguments);
    }
    Scene_FactionWar.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_FactionWar.prototype.constructor = Scene_FactionWar;

    Scene_FactionWar.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createMapWindow();
        this.createInfoWindow();
        this.createLegendWindow();
    };

    Scene_FactionWar.prototype.createBackground = function () {
        Scene_MenuBase.prototype.createBackground.call(this);
        // Darken behind the panel for readability.
        this._panelSprite = new Sprite();
        this._panelSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
        this._panelSprite.bitmap.fillRect(0, 0, Graphics.width, Graphics.height, CFG.panelColor);
        this._panelSprite.opacity = 210;
        this.addChild(this._panelSprite);
    };

    Scene_FactionWar.prototype.mapWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Math.floor(Graphics.boxWidth * 0.62);
        const wh = this.mainAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    };
    Scene_FactionWar.prototype.sideRect = function (topFraction, bottomFraction) {
        const wx = Math.floor(Graphics.boxWidth * 0.62);
        const wy = this.mainAreaTop() + Math.floor(this.mainAreaHeight() * topFraction);
        const ww = Graphics.boxWidth - wx;
        const wh = Math.floor(this.mainAreaHeight() * (bottomFraction - topFraction));
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_FactionWar.prototype.createMapWindow = function () {
        this._mapWindow = new Window_StrategicMap(this.mapWindowRect());
        this._mapWindow.setHandler("cancel", this.popScene.bind(this));
        this._mapWindow.setHandler("ok", this.popScene.bind(this));
        this._mapWindow.setHelpUpdate(this.onRegionSelect.bind(this));
        this.addWindow(this._mapWindow);
        this._mapWindow.activate();
        this._mapWindow.select(0);
    };
    Scene_FactionWar.prototype.createInfoWindow = function () {
        this._infoWindow = new Window_RegionInfo(this.sideRect(0.55, 1.0));
        this.addWindow(this._infoWindow);
    };
    Scene_FactionWar.prototype.createLegendWindow = function () {
        this._legendWindow = new Window_FactionLegend(this.sideRect(0.0, 0.55));
        this.addWindow(this._legendWindow);
    };
    Scene_FactionWar.prototype.onRegionSelect = function (region) {
        if (this._infoWindow) this._infoWindow.setRegion(region);
    };

    //=========================================================================
    // Window_StrategicMap : selectable grid of colored territories
    //=========================================================================
    function Window_StrategicMap() {
        this.initialize.apply(this, arguments);
    }
    Window_StrategicMap.prototype = Object.create(Window_Selectable.prototype);
    Window_StrategicMap.prototype.constructor = Window_StrategicMap;

    Window_StrategicMap.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._helpUpdate = null;
        this.refresh();
    };
    Window_StrategicMap.prototype.setHelpUpdate = function (cb) { this._helpUpdate = cb; };
    Window_StrategicMap.prototype.regionList = function () {
        return $gameFactionWar ? $gameFactionWar.regions() : [];
    };
    Window_StrategicMap.prototype.maxItems = function () { return this.regionList().length; };
    Window_StrategicMap.prototype.maxCols = function () {
        const n = this.maxItems();
        return Math.min(4, Math.max(2, Math.ceil(Math.sqrt(n))));
    };
    Window_StrategicMap.prototype.itemHeight = function () {
        const rows = Math.ceil(this.maxItems() / this.maxCols());
        return Math.max(64, Math.floor(this.innerHeight / Math.max(1, rows)));
    };
    Window_StrategicMap.prototype.drawItem = function (index) {
        const region = this.regionList()[index];
        if (!region) return;
        const rect = this.itemRect(index);
        const pad = 4;
        const x = rect.x + pad, y = rect.y + pad;
        const w = rect.width - pad * 2, h = rect.height - pad * 2;
        const color = $gameFactionWar.factionColor(region.owner) || CFG.neutralColor;

        this.contents.fillRect(x, y, w, h, color);
        this.contents.strokeRect(x, y, w, h, "rgba(0,0,0,0.6)");

        // Player-held marker
        const pf = $gameFactionWar.playerFactionId();
        if (pf && region.owner === pf) {
            this.contents.strokeRect(x + 1, y + 1, w - 2, h - 2, "#ffffff");
        }

        this.contents.fontSize = 18;
        this.contents.textColor = "#ffffff";
        this.contents.outlineColor = "rgba(0,0,0,0.9)";
        this.contents.outlineWidth = 4;
        this.contents.drawText(region.name, x + 6, y + 4, w - 12, 24, "left");
        this.contents.fontSize = 15;
        const ownerName = $gameFactionWar.factionName(region.owner);
        this.contents.drawText(ownerName, x + 6, y + h - 42, w - 12, 20, "left");
        this.contents.drawText("DEF " + region.defense, x + 6, y + h - 24, w - 12, 20, "left");
        this.resetFontSettings();
    };
    Window_StrategicMap.prototype.select = function (index) {
        Window_Selectable.prototype.select.call(this, index);
        if (this._helpUpdate) this._helpUpdate(this.regionList()[index] || null);
    };

    //=========================================================================
    // Window_RegionInfo : detail on the selected territory
    //=========================================================================
    function Window_RegionInfo() {
        this.initialize.apply(this, arguments);
    }
    Window_RegionInfo.prototype = Object.create(Window_Base.prototype);
    Window_RegionInfo.prototype.constructor = Window_RegionInfo;

    Window_RegionInfo.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._region = null;
        this.refresh();
    };
    Window_RegionInfo.prototype.setRegion = function (region) {
        this._region = region;
        this.refresh();
    };
    Window_RegionInfo.prototype.refresh = function () {
        this.contents.clear();
        const r = this._region;
        if (!r || !$gameFactionWar) return;
        const lh = this.lineHeight();
        let y = 0;
        this.contents.fontSize = 20;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(r.name, 0, y, this.innerWidth, "left");
        this.resetFontSettings();
        y += lh;

        const swW = 18;
        this.contents.fillRect(0, y + 6, swW, swW, $gameFactionWar.factionColor(r.owner));
        this.drawText($gameFactionWar.factionName(r.owner), swW + 8, y, this.innerWidth - swW - 8, "left");
        y += lh;

        this.drawText("Income: " + r.income + "   Defense: " + r.defense, 0, y, this.innerWidth, "left");
        y += lh;

        const neighborNames = r.adjacent
            .map((id) => {
                const n = $gameFactionWar.region(id);
                return n ? n.name : null;
            })
            .filter(Boolean);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Borders:", 0, y, this.innerWidth, "left");
        this.resetFontSettings();
        y += lh;
        this.contents.fontSize = 16;
        this.drawTextWrapped(neighborNames.join(", ") || "—", 0, y, this.innerWidth);
        this.resetFontSettings();
    };
    Window_RegionInfo.prototype.drawTextWrapped = function (text, x, y, maxW) {
        const words = String(text).split(/(,\s*)/);
        let line = "", cy = y;
        for (const chunk of words) {
            if (this.textWidth(line + chunk) > maxW && line) {
                this.drawText(line, x, cy, maxW, "left");
                cy += 22;
                line = chunk.replace(/^,\s*/, "");
            } else {
                line += chunk;
            }
        }
        if (line) this.drawText(line, x, cy, maxW, "left");
    };

    //=========================================================================
    // Window_FactionLegend : factions, holdings, resources, relations
    //=========================================================================
    function Window_FactionLegend() {
        this.initialize.apply(this, arguments);
    }
    Window_FactionLegend.prototype = Object.create(Window_Base.prototype);
    Window_FactionLegend.prototype.constructor = Window_FactionLegend;

    Window_FactionLegend.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_FactionLegend.prototype.refresh = function () {
        this.contents.clear();
        if (!$gameFactionWar) return;
        const lh = this.lineHeight();
        let y = 0;
        this.contents.fontSize = 18;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Factions  (Tick " + $gameFactionWar.tickCount() + ")", 0, y, this.innerWidth, "left");
        this.resetFontSettings();
        y += lh;

        const pf = $gameFactionWar.playerFactionId();
        for (const f of $gameFactionWar.factions()) {
            const owned = $gameFactionWar.regionsOwnedBy(f.id).length;
            const swW = 16;
            this.contents.fillRect(0, y + 6, swW, swW, f.color);
            this.contents.fontSize = 16;
            let label = f.name;
            if (f.id === pf) label += "  (You)";
            if (owned === 0) label += "  [fallen]";
            this.drawText(label, swW + 8, y, this.innerWidth - swW - 8, "left");
            y += 22;
            this.contents.fontSize = 14;
            this.changeTextColor(ColorManager.textColor(8));
            this.drawText(
                "  Regions " + owned + "   Str " + f.strength + "   Res " + Math.floor(f.resources),
                swW + 8, y, this.innerWidth - swW - 8, "left"
            );
            this.resetFontSettings();
            y += 24;
            if (y > this.innerHeight - lh) break;
        }
    };

    //=========================================================================
    // In-world banner + capture toasts on the map
    //=========================================================================
    function Window_FWNotice() {
        this.initialize.apply(this, arguments);
    }
    Window_FWNotice.prototype = Object.create(Window_Base.prototype);
    Window_FWNotice.prototype.constructor = Window_FWNotice;

    Window_FWNotice.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0;
        this.contentsOpacity = 0;
        this._life = 0;
    };
    Window_FWNotice.prototype.show2 = function (text, accent) {
        this.contents.clear();
        this.contents.fontSize = 20;
        if (accent) {
            this.contents.fillRect(0, this.innerHeight / 2 - 12, 8, 24, accent);
        }
        this.changeTextColor("#ffffff");
        this.drawText(text, 16, 0, this.innerWidth - 16, "left");
        this.resetFontSettings();
        this._life = 150;
        this.opacity = 220;
    };
    Window_FWNotice.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (this._life > 0) {
            this._life--;
            this.contentsOpacity = Math.min(255, this.contentsOpacity + 24);
            if (this._life < 40) {
                this.contentsOpacity = Math.max(0, this.contentsOpacity - 12);
                this.opacity = Math.max(0, this.opacity - 10);
            }
        } else {
            this.contentsOpacity = Math.max(0, this.contentsOpacity - 12);
            this.opacity = Math.max(0, this.opacity - 10);
        }
    };

    const _SceneMap_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _SceneMap_createAllWindows.call(this);
        this.createFactionWarNotices();
    };
    Scene_Map.prototype.createFactionWarNotices = function () {
        const w = Math.floor(Graphics.boxWidth * 0.5);
        const h = 60;
        const bannerRect = new Rectangle((Graphics.boxWidth - w) / 2, 12, w, h);
        this._fwBanner = new Window_FWNotice(bannerRect);
        this.addChild(this._fwBanner);

        const toastRect = new Rectangle(Graphics.boxWidth - w - 12, Graphics.boxHeight - h - 12, w, h);
        this._fwToast = new Window_FWNotice(toastRect);
        this.addChild(this._fwToast);

        this._fwLastRegion = -1;
    };

    const _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _SceneMap_update.call(this);
        this.updateFactionWar();
    };
    Scene_Map.prototype.updateFactionWar = function () {
        if (!$gameFactionWar) return;

        // Banner when entering a new owned territory.
        if (CFG.showBanner && this._fwBanner && $gamePlayer.isNormal()) {
            const rid = $gameMap.regionId($gamePlayer.x, $gamePlayer.y);
            if (rid !== this._fwLastRegion) {
                this._fwLastRegion = rid;
                const region = $gameFactionWar.region(rid);
                if (region) {
                    const owner = region.owner;
                    this._fwBanner.show2(
                        region.name + " — " + $gameFactionWar.factionName(owner),
                        $gameFactionWar.factionColor(owner)
                    );
                }
            }
        }

        // Capture toasts.
        if (CFG.showToasts && this._fwToast && this._fwToast._life <= 0) {
            const t = $gameFactionWar.consumeToast();
            if (t) this._fwToast.show2(t, "#f1c40f");
        }
    };

    //=========================================================================
    // Optional: translucent owner-color tint over region tiles
    //=========================================================================
    const _Spriteset_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function () {
        _Spriteset_createLowerLayer.call(this);
        if (CFG.tintTiles) this.createFactionTint();
    };
    Spriteset_Map.prototype.createFactionTint = function () {
        this._fwTintContainer = new Sprite();
        this._baseSprite.addChild(this._fwTintContainer);
        this._fwTintTiles = [];
        if (!$gameFactionWar) return;
        const w = $gameMap.width();
        const h = $gameMap.height();
        const size = $gameMap.tileWidth();
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                const rid = $gameMap.regionId(x, y);
                if (rid === 0) continue;
                if (!$gameFactionWar.region(rid)) continue;
                const sprite = new Sprite();
                sprite.bitmap = new Bitmap(size, $gameMap.tileHeight());
                sprite._fwTileX = x;
                sprite._fwTileY = y;
                sprite._fwRegionId = rid;
                sprite.opacity = CFG.tintOpacity;
                this._fwTintContainer.addChild(sprite);
                this._fwTintTiles.push(sprite);
            }
        }
        this._fwTintOwnerCache = {};
    };
    const _Spriteset_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function () {
        _Spriteset_update.call(this);
        if (CFG.tintTiles && this._fwTintTiles) this.updateFactionTint();
    };
    Spriteset_Map.prototype.updateFactionTint = function () {
        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();
        for (const sprite of this._fwTintTiles) {
            const owner = $gameFactionWar.regionOwner(sprite._fwRegionId);
            if (this._fwTintOwnerCache[sprite._fwRegionId] !== owner) {
                this._fwTintOwnerCache[sprite._fwRegionId] = owner;
                const color = $gameFactionWar.factionColor(owner);
                sprite.bitmap.clear();
                sprite.bitmap.fillRect(0, 0, tw, th, color);
            }
            sprite.x = Math.round($gameMap.adjustX(sprite._fwTileX) * tw);
            sprite.y = Math.round($gameMap.adjustY(sprite._fwTileY) * th);
        }
    };
})();
