/*:
 * @target MZ
 * @plugindesc [v1.0] Relationship management system — numeric affinity, Rival↔Ally tiers, and tiered boons (stat buffs, items, switches, skills) with a dedicated menu scene.
 * @author You
 * @url
 *
 * @help RelationshipSystem.js
 * ============================================================================
 * RELATIONSHIP SYSTEM
 * ============================================================================
 * Track relationships with party members, NPCs, and factions using a numeric
 * "affinity" value on a Rival <-> Ally scale. Crossing tier thresholds grants
 * boons. View everything in a dedicated menu scene.
 *
 * IMPORTANT: This file MUST be named  RelationshipSystem.js  (plugin commands
 * are registered under that exact name).
 *
 * ----------------------------------------------------------------------------
 * HOW REWARDS WORK
 * ----------------------------------------------------------------------------
 * Each tier can grant two kinds of boons:
 *
 *   1. PASSIVE STAT BUFFS  (dynamic)
 *      Applied only while the entity is CURRENTLY at that tier. If affinity
 *      later drops below the tier, the buff is removed automatically. Only
 *      affects party-member entities (those tied to an actor).
 *
 *   2. ITEMS / SWITCHES / SKILLS  (one-time)
 *      Granted the first time the entity ENTERS a tier, and kept permanently
 *      even if affinity later falls. Items go to the party, switches turn ON,
 *      skills are learned by the linked actor.
 *
 * The tier the entity starts in is treated as a baseline and grants nothing.
 *
 * ----------------------------------------------------------------------------
 * REGISTERING ENTITIES
 * ----------------------------------------------------------------------------
 * Two ways, and you can mix them:
 *
 * A) ACTOR NOTETAGS (for party members)
 *    Put these in an Actor's note box in the database:
 *
 *      <Relationship>                 Registers this actor as an entity.
 *      <RelationshipKey: aria>        Optional unique key (defaults to actorN).
 *      <RelationshipStart: 0>         Optional starting affinity.
 *
 * B) PLUGIN PARAMETER "Predefined Entities" (for NPCs / factions)
 *    Add rows there for anyone who isn't an actor. Give each a unique Key.
 *
 * You can also create entities at runtime with the "Register Entity" command.
 *
 * ----------------------------------------------------------------------------
 * PLUGIN COMMANDS
 * ----------------------------------------------------------------------------
 *   Gain Affinity     — add/subtract affinity for an entity (use negatives to
 *                        drop it). Dialogue choices & story beats call this.
 *   Set Affinity      — set an exact value.
 *   Give Gift         — optionally consume an item from the party, then add
 *                        affinity. Great for gift-giving events.
 *   Register Entity   — create an NPC/faction entity on the fly.
 *   Open Scene        — open the relationships menu directly.
 *
 * ----------------------------------------------------------------------------
 * TERMS
 * ----------------------------------------------------------------------------
 * Free to use in commercial and non-commercial projects. Credit appreciated.
 *
 * @param menuCommandName
 * @text Menu Command Name
 * @desc Label shown in the main menu for the relationships scene.
 * @default Relationships
 *
 * @param showInMenu
 * @text Show in Main Menu
 * @type boolean
 * @on Show
 * @off Hide
 * @desc Add the relationships command to the main menu automatically.
 * @default true
 *
 * @param menuSwitchId
 * @text Menu Enable Switch
 * @type switch
 * @desc The menu command is enabled only when this switch is ON. 0 = always enabled.
 * @default 0
 *
 * @param affinityMin
 * @text Affinity Minimum
 * @type number
 * @min -99999
 * @desc Lowest possible affinity value (rivalry floor).
 * @default -100
 *
 * @param affinityMax
 * @text Affinity Maximum
 * @type number
 * @min -99999
 * @desc Highest possible affinity value (ally ceiling).
 * @default 100
 *
 * @param tiers
 * @text Tiers
 * @type struct<Tier>[]
 * @desc Relationship tiers, low to high. Thresholds may be negative. Leave empty to use built-in defaults.
 * @default []
 *
 * @param entities
 * @text Predefined Entities
 * @type struct<Entity>[]
 * @desc NPCs / factions (and optionally actors) registered at new game.
 * @default []
 *
 * @param uiHeader
 * @text --- UI / Aesthetics ---
 * @default
 *
 * @param gaugeBackColor
 * @text Gauge Back Color
 * @desc CSS color for the empty part of the affinity gauge.
 * @default #1c1c28
 *
 * @param gaugeColor1
 * @text Gauge Color 1
 * @desc CSS color, left side of the affinity gauge gradient.
 * @default #6c5ce7
 *
 * @param gaugeColor2
 * @text Gauge Color 2
 * @desc CSS color, right side of the affinity gauge gradient.
 * @default #a29bfe
 *
 * @param accentColor
 * @text Accent Color
 * @desc CSS color used for headings and highlights in the scene.
 * @default #a29bfe
 *
 * @command gainAffinity
 * @text Gain Affinity
 * @desc Add (or subtract, with a negative value) affinity for an entity.
 *
 * @arg key
 * @text Entity Key
 * @desc The entity's unique key (e.g. actor1, aria, thieves_guild).
 * @default
 *
 * @arg amount
 * @text Amount
 * @type number
 * @min -99999
 * @desc Amount to add. Use a negative number to reduce affinity.
 * @default 10
 *
 * @command setAffinity
 * @text Set Affinity
 * @desc Set an entity's affinity to an exact value.
 *
 * @arg key
 * @text Entity Key
 * @default
 *
 * @arg value
 * @text Value
 * @type number
 * @min -99999
 * @default 0
 *
 * @command giveGift
 * @text Give Gift
 * @desc Optionally consume an item from the party, then grant affinity.
 *
 * @arg key
 * @text Entity Key
 * @default
 *
 * @arg itemId
 * @text Item ID
 * @type item
 * @desc Item to consume. Set to 0 to skip the item check entirely.
 * @default 0
 *
 * @arg consume
 * @text Consume Item
 * @type boolean
 * @on Consume
 * @off Keep
 * @desc Remove one of the item from the party when gifting.
 * @default true
 *
 * @arg amount
 * @text Affinity Gain
 * @type number
 * @min -99999
 * @default 10
 *
 * @command registerEntity
 * @text Register Entity
 * @desc Create a new NPC / faction entity at runtime.
 *
 * @arg key
 * @text Entity Key
 * @default
 *
 * @arg name
 * @text Display Name
 * @default
 *
 * @arg type
 * @text Type
 * @type select
 * @option party
 * @option npc
 * @option faction
 * @default npc
 *
 * @arg faceName
 * @text Face Image
 * @type file
 * @dir img/faces/
 * @default
 *
 * @arg faceIndex
 * @text Face Index
 * @type number
 * @min 0
 * @default 0
 *
 * @arg startAffinity
 * @text Starting Affinity
 * @type number
 * @min -99999
 * @default 0
 *
 * @command openScene
 * @text Open Scene
 * @desc Open the relationships menu scene.
 */
/*~struct~Tier:
 * @param name
 * @text Name
 * @desc Display name for this tier (e.g. Neutral, Friend, Ally).
 * @default Neutral
 *
 * @param threshold
 * @text Threshold
 * @type number
 * @min -99999
 * @desc Affinity at or above this value (and below the next tier) puts the entity in this tier.
 * @default 0
 *
 * @param color
 * @text Color
 * @desc CSS color used for this tier's label in the scene.
 * @default #bdc3c7
 *
 * @param icon
 * @text Icon Index
 * @type number
 * @min 0
 * @desc Optional icon shown next to the tier name. 0 = none.
 * @default 0
 *
 * @param paramBonuses
 * @text Passive Stat Buffs
 * @type struct<ParamBonus>
 * @desc Flat stat bonuses applied while at this tier (party members only).
 * @default {}
 *
 * @param items
 * @text Item Rewards
 * @type struct<ItemReward>[]
 * @desc Items granted once, the first time this tier is reached.
 * @default []
 *
 * @param skills
 * @text Skill Rewards
 * @type skill[]
 * @desc Skills the linked actor learns once, the first time this tier is reached.
 * @default []
 *
 * @param switches
 * @text Switch Rewards
 * @type switch[]
 * @desc Switches turned ON once, the first time this tier is reached.
 * @default []
 */
/*~struct~ParamBonus:
 * @param mhp
 * @text Max HP
 * @type number
 * @min -99999
 * @default 0
 * @param mmp
 * @text Max MP
 * @type number
 * @min -99999
 * @default 0
 * @param atk
 * @text Attack
 * @type number
 * @min -99999
 * @default 0
 * @param def
 * @text Defense
 * @type number
 * @min -99999
 * @default 0
 * @param mat
 * @text M.Attack
 * @type number
 * @min -99999
 * @default 0
 * @param mdf
 * @text M.Defense
 * @type number
 * @min -99999
 * @default 0
 * @param agi
 * @text Agility
 * @type number
 * @min -99999
 * @default 0
 * @param luk
 * @text Luck
 * @type number
 * @min -99999
 * @default 0
 */
/*~struct~ItemReward:
 * @param type
 * @text Type
 * @type select
 * @option item
 * @option weapon
 * @option armor
 * @default item
 * @param id
 * @text Database ID
 * @type number
 * @min 1
 * @default 1
 * @param amount
 * @text Amount
 * @type number
 * @min 1
 * @default 1
 */
/*~struct~Entity:
 * @param key
 * @text Key
 * @desc Unique identifier used by plugin commands.
 * @default
 * @param name
 * @text Display Name
 * @default
 * @param type
 * @text Type
 * @type select
 * @option party
 * @option npc
 * @option faction
 * @default npc
 * @param actorId
 * @text Linked Actor
 * @type actor
 * @desc Optional. Link to an actor so passive stat buffs and learned skills apply.
 * @default 0
 * @param faceName
 * @text Face Image
 * @type file
 * @dir img/faces/
 * @default
 * @param faceIndex
 * @text Face Index
 * @type number
 * @min 0
 * @default 0
 * @param startAffinity
 * @text Starting Affinity
 * @type number
 * @min -99999
 * @default 0
 */

(() => {
"use strict";

const PLUGIN_NAME = "RelationshipSystem";
const PARAM_KEYS = ["mhp", "mmp", "atk", "def", "mat", "mdf", "agi", "luk"];

// ---------------------------------------------------------------------------
// Parameter parsing
// ---------------------------------------------------------------------------
const raw = PluginManager.parameters(PLUGIN_NAME);

function toJson(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
}

function parseParamBonus(str) {
    const o = toJson(str) || {};
    const out = {};
    for (const k of PARAM_KEYS) out[k] = Number(o[k] || 0);
    return out;
}

function parseItemReward(str) {
    const o = toJson(str) || {};
    return {
        type: o.type || "item",
        id: Number(o.id || 0),
        amount: Number(o.amount || 1),
    };
}

function parseTier(str) {
    const o = toJson(str) || {};
    return {
        name: o.name || "",
        threshold: Number(o.threshold || 0),
        color: o.color || "#ffffff",
        icon: Number(o.icon || 0),
        paramBonuses: parseParamBonus(o.paramBonuses),
        items: (toJson(o.items) || []).map(parseItemReward),
        skills: (toJson(o.skills) || []).map(Number),
        switches: (toJson(o.switches) || []).map(Number),
    };
}

function parseEntity(str) {
    const o = toJson(str) || {};
    return {
        key: (o.key || "").trim(),
        name: o.name || "",
        type: o.type || "npc",
        actorId: Number(o.actorId || 0),
        faceName: o.faceName || "",
        faceIndex: Number(o.faceIndex || 0),
        startAffinity: Number(o.startAffinity || 0),
    };
}

const DEFAULT_TIERS = [
    { name: "Nemesis", threshold: -100, color: "#c0392b", icon: 0, paramBonuses: parseParamBonus("{}"), items: [], skills: [], switches: [] },
    { name: "Rival",   threshold: -40,  color: "#e67e22", icon: 0, paramBonuses: parseParamBonus("{}"), items: [], skills: [], switches: [] },
    { name: "Neutral", threshold: 0,    color: "#bdc3c7", icon: 0, paramBonuses: parseParamBonus("{}"), items: [], skills: [], switches: [] },
    { name: "Friend",  threshold: 40,   color: "#3498db", icon: 0, paramBonuses: parseParamBonus('{"atk":"5","def":"5"}'), items: [], skills: [], switches: [] },
    { name: "Ally",    threshold: 80,   color: "#9b59b6", icon: 0, paramBonuses: parseParamBonus('{"atk":"10","def":"10","agi":"10"}'), items: [], skills: [], switches: [] },
];

let TIERS = (toJson(raw.tiers) || []).map(parseTier);
if (TIERS.length === 0) TIERS = DEFAULT_TIERS;
TIERS.sort((a, b) => a.threshold - b.threshold);

const PREDEFINED = (toJson(raw.entities) || []).map(parseEntity);

const CFG = {
    menuCommandName: raw.menuCommandName || "Relationships",
    showInMenu: raw.showInMenu === "true",
    menuSwitchId: Number(raw.menuSwitchId || 0),
    affinityMin: Number(raw.affinityMin || -100),
    affinityMax: Number(raw.affinityMax || 100),
    gaugeBackColor: raw.gaugeBackColor || "#1c1c28",
    gaugeColor1: raw.gaugeColor1 || "#6c5ce7",
    gaugeColor2: raw.gaugeColor2 || "#a29bfe",
    accentColor: raw.accentColor || "#a29bfe",
};

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------
function tierIndexForAffinity(affinity) {
    let idx = 0;
    for (let i = 0; i < TIERS.length; i++) {
        if (affinity >= TIERS[i].threshold) idx = i;
    }
    return idx;
}

// ===========================================================================
// Game_System — data store (auto-saved with the save file)
// ===========================================================================
const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this._relationships = {};
    this.setupRelationshipDefaults();
};

Game_System.prototype.setupRelationshipDefaults = function() {
    // Predefined entities from plugin parameters.
    for (const e of PREDEFINED) {
        if (!e.key) continue;
        this.registerRelationship(e.key, {
            name: e.name,
            type: e.type,
            actorId: e.actorId,
            faceName: e.faceName,
            faceIndex: e.faceIndex,
            affinity: e.startAffinity,
        });
    }
    // Actors flagged with the <Relationship> notetag.
    if (typeof $dataActors !== "undefined" && $dataActors) {
        for (const actor of $dataActors) {
            if (!actor || !actor.note) continue;
            if (!/<Relationship>/i.test(actor.note)) continue;
            const keyMatch = actor.note.match(/<RelationshipKey:\s*(.+?)>/i);
            const startMatch = actor.note.match(/<RelationshipStart:\s*(-?\d+)>/i);
            const typeMatch = actor.note.match(/<RelationshipType:\s*(.+?)>/i);
            const key = (keyMatch ? keyMatch[1] : "actor" + actor.id).trim();
            this.registerRelationship(key, {
                name: actor.name,
                type: typeMatch ? typeMatch[1].trim() : "party",
                actorId: actor.id,
                faceName: actor.faceName,
                faceIndex: actor.faceIndex,
                affinity: startMatch ? Number(startMatch[1]) : 0,
            });
        }
    }
};

Game_System.prototype.registerRelationship = function(key, data) {
    if (!key) return;
    if (!this._relationships) this._relationships = {};
    if (this._relationships[key]) return; // don't clobber existing
    const affinity = (data.affinity || 0).clamp(CFG.affinityMin, CFG.affinityMax);
    this._relationships[key] = {
        key: key,
        name: data.name || key,
        type: data.type || "npc",
        actorId: data.actorId || 0,
        faceName: data.faceName || "",
        faceIndex: data.faceIndex || 0,
        affinity: affinity,
        currentTier: tierIndexForAffinity(affinity),
        granted: [tierIndexForAffinity(affinity)], // baseline tier grants nothing
    };
};

Game_System.prototype.relationships = function() {
    if (!this._relationships) this._relationships = {};
    return this._relationships;
};

Game_System.prototype.relationship = function(key) {
    return this.relationships()[key] || null;
};

Game_System.prototype.relationshipList = function(type) {
    const all = Object.values(this.relationships());
    if (!type || type === "all") return all;
    return all.filter(e => e.type === type);
};

Game_System.prototype.gainAffinity = function(key, amount) {
    const e = this.relationship(key);
    if (!e) return;
    e.affinity = (e.affinity + Number(amount)).clamp(CFG.affinityMin, CFG.affinityMax);
    this.updateRelationshipTier(e);
};

Game_System.prototype.setAffinity = function(key, value) {
    const e = this.relationship(key);
    if (!e) return;
    e.affinity = Number(value).clamp(CFG.affinityMin, CFG.affinityMax);
    this.updateRelationshipTier(e);
};

Game_System.prototype.updateRelationshipTier = function(e) {
    const oldIdx = e.currentTier;
    const newIdx = tierIndexForAffinity(e.affinity);
    if (newIdx > oldIdx) {
        for (let i = oldIdx + 1; i <= newIdx; i++) this.grantTierRewards(e, i);
    } else if (newIdx < oldIdx) {
        this.grantTierRewards(e, newIdx);
    }
    e.currentTier = newIdx;
    // Refresh actor params so passive buffs re-evaluate immediately.
    if (e.actorId && $gameActors) {
        const actor = $gameActors.actor(e.actorId);
        if (actor) actor.refresh();
    }
};

Game_System.prototype.grantTierRewards = function(e, tierIdx) {
    if (e.granted.includes(tierIdx)) return;
    e.granted.push(tierIdx);
    const tier = TIERS[tierIdx];
    if (!tier) return;
    // Items -> party
    for (const it of tier.items) {
        if (!it.id) continue;
        let data = null;
        if (it.type === "weapon") data = $dataWeapons[it.id];
        else if (it.type === "armor") data = $dataArmors[it.id];
        else data = $dataItems[it.id];
        if (data) $gameParty.gainItem(data, it.amount);
    }
    // Switches -> ON
    for (const sw of tier.switches) {
        if (sw) $gameSwitches.setValue(sw, true);
    }
    // Skills -> learned by linked actor
    if (e.actorId && $gameActors) {
        const actor = $gameActors.actor(e.actorId);
        if (actor) {
            for (const sk of tier.skills) {
                if (sk) actor.learnSkill(sk);
            }
        }
    }
};

// Passive param bonus for the actor's current tier.
Game_System.prototype.relationshipParamBonus = function(actorId, paramId) {
    if (!actorId) return 0;
    const list = this.relationshipList("all");
    let total = 0;
    for (const e of list) {
        if (e.actorId !== actorId) continue;
        const tier = TIERS[e.currentTier];
        if (tier) total += tier.paramBonuses[PARAM_KEYS[paramId]] || 0;
    }
    return total;
};

// ===========================================================================
// Game_Actor — apply passive stat buffs
// ===========================================================================
const _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
Game_Actor.prototype.paramPlus = function(paramId) {
    let value = _Game_Actor_paramPlus.call(this, paramId);
    if (typeof $gameSystem !== "undefined" && $gameSystem) {
        value += $gameSystem.relationshipParamBonus(this.actorId(), paramId);
    }
    return value;
};

// ===========================================================================
// Plugin commands
// ===========================================================================
PluginManager.registerCommand(PLUGIN_NAME, "gainAffinity", args => {
    $gameSystem.gainAffinity(String(args.key).trim(), Number(args.amount));
});

PluginManager.registerCommand(PLUGIN_NAME, "setAffinity", args => {
    $gameSystem.setAffinity(String(args.key).trim(), Number(args.value));
});

PluginManager.registerCommand(PLUGIN_NAME, "giveGift", args => {
    const key = String(args.key).trim();
    const itemId = Number(args.itemId || 0);
    const consume = args.consume === "true";
    const amount = Number(args.amount);
    if (itemId > 0) {
        const item = $dataItems[itemId];
        if (!item || !$gameParty.hasItem(item)) return; // no gift given if item absent
        if (consume) $gameParty.loseItem(item, 1);
    }
    $gameSystem.gainAffinity(key, amount);
});

PluginManager.registerCommand(PLUGIN_NAME, "registerEntity", args => {
    $gameSystem.registerRelationship(String(args.key).trim(), {
        name: args.name,
        type: args.type,
        faceName: args.faceName,
        faceIndex: Number(args.faceIndex || 0),
        affinity: Number(args.startAffinity || 0),
    });
});

PluginManager.registerCommand(PLUGIN_NAME, "openScene", () => {
    SceneManager.push(Scene_Relationships);
});

// ===========================================================================
// Main menu integration
// ===========================================================================
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    if (CFG.showInMenu) {
        const enabled = CFG.menuSwitchId === 0 || $gameSwitches.value(CFG.menuSwitchId);
        this.addCommand(CFG.menuCommandName, "relationships", enabled);
    }
};

const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("relationships", this.commandRelationships.bind(this));
};

Scene_Menu.prototype.commandRelationships = function() {
    SceneManager.push(Scene_Relationships);
};

// ===========================================================================
// Window_RelationshipCategory — filter tabs (top)
// ===========================================================================
function Window_RelationshipCategory() {
    this.initialize(...arguments);
}
Window_RelationshipCategory.prototype = Object.create(Window_HorzCommand.prototype);
Window_RelationshipCategory.prototype.constructor = Window_RelationshipCategory;

Window_RelationshipCategory.prototype.initialize = function(rect) {
    Window_HorzCommand.prototype.initialize.call(this, rect);
};

Window_RelationshipCategory.prototype.maxCols = function() {
    return 4;
};

Window_RelationshipCategory.prototype.makeCommandList = function() {
    this.addCommand("All", "all");
    this.addCommand("Party", "party");
    this.addCommand("NPCs", "npc");
    this.addCommand("Factions", "faction");
};

Window_RelationshipCategory.prototype.update = function() {
    Window_HorzCommand.prototype.update.call(this);
    if (this._listWindow) {
        this._listWindow.setCategory(this.currentSymbol());
    }
};

Window_RelationshipCategory.prototype.setListWindow = function(win) {
    this._listWindow = win;
    this.update();
};

// ===========================================================================
// Window_RelationshipList — left list of entities
// ===========================================================================
function Window_RelationshipList() {
    this.initialize(...arguments);
}
Window_RelationshipList.prototype = Object.create(Window_Selectable.prototype);
Window_RelationshipList.prototype.constructor = Window_RelationshipList;

Window_RelationshipList.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._category = "all";
    this._data = [];
    this.refresh();
};

Window_RelationshipList.prototype.setCategory = function(category) {
    if (this._category === category) return;
    this._category = category;
    this.refresh();
    this.scrollTo(0, 0);
    this.select(this._data.length > 0 ? 0 : -1);
};

Window_RelationshipList.prototype.maxItems = function() {
    return this._data ? this._data.length : 0;
};

Window_RelationshipList.prototype.item = function() {
    return this._data[this.index()] || null;
};

Window_RelationshipList.prototype.itemHeight = function() {
    return 64;
};

Window_RelationshipList.prototype.makeItemList = function() {
    this._data = $gameSystem.relationshipList(this._category);
};

Window_RelationshipList.prototype.drawItem = function(index) {
    const e = this._data[index];
    if (!e) return;
    const rect = this.itemRect(index);
    const faceSize = 48;
    drawScaledFace(this, e.faceName, e.faceIndex, rect.x + 2, rect.y + 8, faceSize, faceSize);
    const tx = rect.x + faceSize + 12;
    const tw = rect.width - faceSize - 16;
    this.resetTextColor();
    this.drawText(e.name, tx, rect.y + 4, tw);
    const tier = TIERS[e.currentTier];
    if (tier) {
        this.changeTextColor(tier.color);
        this.contents.fontSize = $gameSystem.mainFontSize() - 6;
        this.drawText(tier.name, tx, rect.y + 30, tw);
        this.contents.fontSize = $gameSystem.mainFontSize();
    }
    this.resetTextColor();
};

Window_RelationshipList.prototype.setStatusWindow = function(win) {
    this._statusWindow = win;
    this.callUpdateHelp();
};

Window_RelationshipList.prototype.callUpdateHelp = function() {
    if (this.active && this._statusWindow) {
        this._statusWindow.setEntity(this.item());
    }
};

Window_RelationshipList.prototype.refresh = function() {
    this.makeItemList();
    Window_Selectable.prototype.refresh.call(this);
};

// ===========================================================================
// Window_RelationshipStatus — right detail panel
// ===========================================================================
function Window_RelationshipStatus() {
    this.initialize(...arguments);
}
Window_RelationshipStatus.prototype = Object.create(Window_Selectable.prototype);
Window_RelationshipStatus.prototype.constructor = Window_RelationshipStatus;

Window_RelationshipStatus.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._entity = null;
};

Window_RelationshipStatus.prototype.setEntity = function(entity) {
    if (this._entity === entity) return;
    this._entity = entity;
    this.refresh();
};

Window_RelationshipStatus.prototype.refresh = function() {
    this.contents.clear();
    const e = this._entity;
    if (!e) return;
    const lh = this.lineHeight();
    const pad = 4;
    const faceW = ImageManager.faceWidth;
    const faceH = ImageManager.faceHeight;

    // Portrait
    drawScaledFace(this, e.faceName, e.faceIndex, pad, pad, faceW, faceH);

    // Name + type
    const infoX = faceW + 24;
    const infoW = this.contents.width - infoX;
    this.changeTextColor(CFG.accentColor);
    this.contents.fontSize = $gameSystem.mainFontSize() + 6;
    this.drawText(e.name, infoX, pad, infoW);
    this.contents.fontSize = $gameSystem.mainFontSize();
    this.changeTextColor(ColorManager.dimColor1 ? this.systemColor() : this.systemColor());
    this.drawText(typeLabel(e.type), infoX, pad + lh + 4, infoW);
    this.resetTextColor();

    // Current tier
    const tier = TIERS[e.currentTier];
    let ty = pad + lh * 2 + 12;
    if (tier) {
        let ix = infoX;
        if (tier.icon > 0) {
            this.drawIcon(tier.icon, ix, ty + 2);
            ix += ImageManager.iconWidth + 4;
        }
        this.changeTextColor(tier.color);
        this.contents.fontSize = $gameSystem.mainFontSize() + 2;
        this.drawText(tier.name, ix, ty, infoW);
        this.contents.fontSize = $gameSystem.mainFontSize();
        this.resetTextColor();
    }

    // Affinity gauge
    const gaugeY = ty + lh + 8;
    this.drawAffinityGauge(infoX, gaugeY, infoW - pad, e);

    // Reward breakdown below the face
    const rewardsY = Math.max(faceH + pad + 12, gaugeY + lh * 2 + 8);
    this.drawTierRewards(pad, rewardsY, this.contents.width - pad * 2, e);
};

Window_RelationshipStatus.prototype.drawAffinityGauge = function(x, y, width, e) {
    const range = CFG.affinityMax - CFG.affinityMin;
    const rate = range > 0 ? (e.affinity - CFG.affinityMin) / range : 0;
    const gh = 12;
    const gy = y + this.lineHeight() - gh - 4;
    this.contents.fillRect(x, gy, width, gh, CFG.gaugeBackColor);
    const fillW = Math.floor(width * rate.clamp(0, 1));
    this.contents.gradientFillRect(x, gy, fillW, gh, CFG.gaugeColor1, CFG.gaugeColor2);
    // Numeric label
    this.resetTextColor();
    this.contents.fontSize = $gameSystem.mainFontSize() - 4;
    const label = e.affinity + " / " + CFG.affinityMax;
    this.drawText(label, x, y - 6, width, "right");
    this.contents.fontSize = $gameSystem.mainFontSize();
    // Next tier hint
    const nextIdx = e.currentTier + 1;
    if (nextIdx < TIERS.length) {
        const next = TIERS[nextIdx];
        const need = next.threshold - e.affinity;
        this.changeTextColor(this.systemColor());
        this.contents.fontSize = $gameSystem.mainFontSize() - 6;
        this.drawText("Next: " + next.name + " (+" + need + ")", x, gy + gh, width, "left");
        this.contents.fontSize = $gameSystem.mainFontSize();
        this.resetTextColor();
    }
};

Window_RelationshipStatus.prototype.drawTierRewards = function(x, y, width, e) {
    const tier = TIERS[e.currentTier];
    if (!tier) return;
    this.changeTextColor(CFG.accentColor);
    this.drawText("Current Tier Boons", x, y, width);
    this.resetTextColor();
    let cy = y + this.lineHeight();
    const small = $gameSystem.mainFontSize() - 4;
    this.contents.fontSize = small;

    const lines = [];
    // Passive stat buffs
    const buffs = [];
    for (let i = 0; i < PARAM_KEYS.length; i++) {
        const v = tier.paramBonuses[PARAM_KEYS[i]];
        if (v) buffs.push(TextManager.param(i) + " " + (v > 0 ? "+" : "") + v);
    }
    if (buffs.length) lines.push("Passive: " + buffs.join(", "));

    // One-time rewards
    for (const it of tier.items) {
        if (!it.id) continue;
        let data = it.type === "weapon" ? $dataWeapons[it.id]
                 : it.type === "armor" ? $dataArmors[it.id]
                 : $dataItems[it.id];
        if (data) lines.push("Item: " + data.name + " x" + it.amount);
    }
    for (const sk of tier.skills) {
        if (sk && $dataSkills[sk]) lines.push("Skill: " + $dataSkills[sk].name);
    }
    if (tier.switches.some(s => s)) lines.push("Unlocks story events");

    if (lines.length === 0) lines.push("No boons at this tier.");

    for (const line of lines) {
        this.drawTextEx(line, x, cy, width);
        cy += this.lineHeight() - 6;
    }
    this.contents.fontSize = $gameSystem.mainFontSize();
    this.resetTextColor();
};

Window_RelationshipStatus.prototype.systemColor = function() {
    return ColorManager.systemColor();
};

// ===========================================================================
// Scene_Relationships
// ===========================================================================
function Scene_Relationships() {
    this.initialize(...arguments);
}
Scene_Relationships.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Relationships.prototype.constructor = Scene_Relationships;

Scene_Relationships.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Relationships.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createCategoryWindow();
    this.createListWindow();
    this.createStatusWindow();
    this._categoryWindow.setListWindow(this._listWindow);
    this._listWindow.setStatusWindow(this._statusWindow);
    this._listWindow.activate();
    this._listWindow.select(this._listWindow.maxItems() > 0 ? 0 : -1);
};

Scene_Relationships.prototype.categoryWindowRect = function() {
    const ww = Graphics.boxWidth;
    const wh = this.calcWindowHeight(1, true);
    const wx = 0;
    const wy = this.mainAreaTop();
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Relationships.prototype.listWindowRect = function() {
    const wx = 0;
    const wy = this._categoryWindow.y + this._categoryWindow.height;
    const ww = Math.floor(Graphics.boxWidth / 3);
    const wh = this.mainAreaBottom() - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Relationships.prototype.statusWindowRect = function() {
    const wx = this._listWindow.x + this._listWindow.width;
    const wy = this._listWindow.y;
    const ww = Graphics.boxWidth - wx;
    const wh = this._listWindow.height;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Relationships.prototype.createCategoryWindow = function() {
    const rect = this.categoryWindowRect();
    this._categoryWindow = new Window_RelationshipCategory(rect);
    this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
    this._categoryWindow.deactivate();
    this.addWindow(this._categoryWindow);
};

Scene_Relationships.prototype.createListWindow = function() {
    const rect = this.listWindowRect();
    this._listWindow = new Window_RelationshipList(rect);
    this._listWindow.setHandler("cancel", this.onListCancel.bind(this));
    this.addWindow(this._listWindow);
};

Scene_Relationships.prototype.createStatusWindow = function() {
    const rect = this.statusWindowRect();
    this._statusWindow = new Window_RelationshipStatus(rect);
    this.addWindow(this._statusWindow);
};

Scene_Relationships.prototype.onCategoryOk = function() {
    this._categoryWindow.deactivate();
    this._listWindow.activate();
    this._listWindow.select(this._listWindow.maxItems() > 0 ? 0 : -1);
};

Scene_Relationships.prototype.onListCancel = function() {
    this._listWindow.deselect();
    this._categoryWindow.activate();
};

// Let the top tabs be driven from the list level for a simpler UX:
// pressing left/right on the list switches category via the category window.
const _Scene_Rel_update = Scene_Relationships.prototype.update;
Scene_Relationships.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    if (this._listWindow && this._listWindow.active) {
        if (Input.isTriggered("pagedown")) {
            this._categoryWindow.cursorRight();
            this._listWindow.select(this._listWindow.maxItems() > 0 ? 0 : -1);
        } else if (Input.isTriggered("pageup")) {
            this._categoryWindow.cursorLeft();
            this._listWindow.select(this._listWindow.maxItems() > 0 ? 0 : -1);
        }
    }
};

// ===========================================================================
// Shared drawing helper — scaled face with graceful fallback
// ===========================================================================
function drawScaledFace(win, faceName, faceIndex, x, y, w, h) {
    if (faceName) {
        const bitmap = ImageManager.loadFace(faceName);
        const draw = () => {
            const pw = ImageManager.faceWidth;
            const ph = ImageManager.faceHeight;
            const sx = (faceIndex % 4) * pw;
            const sy = Math.floor(faceIndex / 4) * ph;
            win.contents.blt(bitmap, sx, sy, pw, ph, x, y, w, h);
        };
        if (bitmap.isReady()) {
            draw();
        } else {
            bitmap.addLoadListener(() => {
                if (win.contents) draw();
            });
        }
    } else {
        // Placeholder tile.
        win.contents.fillRect(x, y, w, h, "#2b2b3a");
        win.contents.strokeRect(x, y, w, h, CFG.accentColor);
    }
}

function typeLabel(type) {
    switch (type) {
        case "party": return "Party Member";
        case "faction": return "Faction";
        default: return "NPC";
    }
}

})();
