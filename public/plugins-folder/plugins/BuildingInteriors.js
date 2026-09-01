//=============================================================================
// BuildingInteriors.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v3.0.0] Regenerating building interiors configured from dropdowns. Can
 * auto-generate the room from Archetype + Tileset. Spawns NPCs/decor; state persists.
 * @author (your name)
 * @url
 *
 * @param buildings
 * @text Buildings
 * @type struct<Building>[]
 * @desc Define each building here. No notetags required except one binding per map
 * (a <Building Interior: KEY> note OR the Map ID field on the entry).
 * @default []
 *
 * @param globalThemeVariable
 * @text Global Theme Variable
 * @type variable
 * @desc Fallback theme source for buildings that don't set their own. 0 = none.
 * @default 0
 *
 * @param defaultTheme
 * @text Fallback Theme
 * @type string
 * @desc Used when no theme source resolves to text.
 * @default default
 *
 * @param debug
 * @text Debug Log
 * @type boolean
 * @on Log to console
 * @off Silent
 * @default false
 *
 * @command SetBuildingTheme
 * @text Set Building Theme
 * @desc Force a theme for a building (overrides the variable). Re-dresses live if inside.
 * @arg buildingKey
 * @text Building Key
 * @type string
 * @default
 * @arg theme
 * @text Theme
 * @type string
 * @default
 *
 * @command ClearBuildingTheme
 * @text Clear Building Theme Override
 * @arg buildingKey
 * @text Building Key
 * @type string
 * @default
 *
 * @command Redress
 * @text Re-dress Current Interior
 *
 * @command ClearPersistence
 * @text Clear Persistence
 * @arg buildingKey
 * @text Building Key
 * @type string
 * @default
 *
 * @help
 * ============================================================================
 * Building Interiors v2 - configure everything from the Plugin Manager
 * ============================================================================
 *
 * You now define buildings in the "Buildings" parameter above. Each entry uses
 * dropdowns that read your project's own files and database:
 *   - NPC & decor graphics    -> img/characters dropdown
 *   - Theme parallax          -> img/parallaxes dropdown
 *   - Theme source            -> Variable dropdown
 *   - NPC interaction         -> Common Event dropdown
 * The plugin SPAWNS the NPCs and decor for you, so you no longer hand-place
 * decor events or type notetags for them.
 *
 * Two things the Plugin Manager cannot pick for you (engine limitation):
 *   1. WHICH MAP a building is. Bind it with EITHER a Map ID on the entry, OR a
 *      map note <Building Interior: KEY> whose KEY matches the entry's Key.
 *   2. WHICH TILES are the counter / decor zone. Paint regions on the map and
 *      type those region NUMBERS into the entry. The Plugin Manager can't read
 *      painted tiles, so region numbers stay as numeric fields.
 *
 * ---- Minimal setup per building --------------------------------------------
 *   1. Add a Buildings entry. Set Key (e.g. blacksmith) and Map ID (or add the
 *      <Building Interior: blacksmith> note to the map).
 *   2. Pick the Theme Variable, and add Themes (name + optional tint/parallax).
 *   3. Paint regions on the map: one for decor, one per anchor, one for keep-clear.
 *      Type those numbers into Decor Regions / Anchors / Keep-Clear Regions.
 *   4. Add Anchors: {Slot Name, Region}. e.g. {counter, 20}.
 *   5. Add NPCs: pick a character graphic, the anchor Slot to stand on, and the
 *      Common Event that runs when talked to. Give each a unique Persistent Id.
 *   6. Add Decor: pick character graphics + weights; set Decor Count min/max.
 *   7. Set the theme variable to a string ("spring") and transfer the player in.
 *
 * Hand-authored quest NPCs still work the old way too: place an event and note
 * <Persistent: id> <Anchor: slot>. Config NPCs and event NPCs coexist. Anchors
 * defined in config are available to both.
 *
 * ---- What persists ---------------------------------------------------------
 * NPC self switches (quest/dialogue/puzzle flags) persist by Persistent Id, even
 * across a whole-map swap. Objects flagged to persist their position stay where
 * the player left them. Same theme string always reproduces the same layout.
 *
 * ---- Legacy notetags (still supported) -------------------------------------
 *   Map:   <Building Interior: KEY> <Theme Variable: N> <Decor Region: N>
 *          <Anchor Region: N as SLOT> <Keep Clear Region: N> <Decor Count: A to B>
 *          <Theme Tint: THEME = r,g,b,gray> <Theme Parallax: THEME = file>
 *   Event: <Persistent: ID> <Anchor: SLOT> <Anchor Slot: SLOT> <Persist Position>
 *          <Decor: POOL> <Decor Weight: N>
 *
 * Free for commercial and non-commercial use; credit appreciated.
 */
/*~struct~Building:
 * @param key
 * @text Building Key
 * @type string
 * @desc Unique id for this building. Must match the map's <Building Interior: KEY>
 * note, unless you set Map ID below instead.
 * @default
 *
 * @param mapId
 * @text Map ID
 * @type number
 * @min 0
 * @desc The map this building is (zero-notetag binding). 0 = bind by the KEY note instead.
 * @default 0
 *
 * @param generate
 * @text Auto-generate room
 * @type boolean
 * @on Generate
 * @off Author it myself
 * @desc If ON, the plugin builds the floor/walls/doorway and paints the zones for you
 * from the Archetype + Tileset below. The editor map can be left blank.
 * @default false
 *
 * @param archetype
 * @text Archetype
 * @type select
 * @option shop @option workshop @option lodging @option sanctuary @option hall
 * @option residence @option storage @option cavern @option pen @option arena
 * @option care @option tower @option civic
 * @desc Room shape. Supplies default anchors, decor zones, count, and NPC slots when
 * those are left empty below. Required when Auto-generate is ON.
 * @default shop
 *
 * @param tilesetId
 * @text Tileset
 * @type tileset
 * @desc The tileset used to build the room. Assumes a standard interior layout
 * (floor = A2 base, wall = A4 base). Override tile IDs below for non-standard sets.
 * @default 0
 *
 * @param genWidth
 * @text Generated Width
 * @type number @min 5 @max 50
 * @default 15
 *
 * @param genHeight
 * @text Generated Height
 * @type number @min 5 @max 50
 * @default 11
 *
 * @param floorTileId
 * @text Floor Tile ID (advanced)
 * @type number @min 0
 * @desc Override only for non-standard tilesets. 0 = use A2 base (2816).
 * @default 0
 *
 * @param wallTileId
 * @text Wall Tile ID (advanced)
 * @type number @min 0
 * @desc Override only for non-standard tilesets. 0 = use A4 base (5888).
 * @default 0
 *
 * @param rerollEachEntry
 * @text Reshuffle Every Entry
 * @type boolean
 * @on New layout each visit
 * @off Same per theme
 * @desc ON = the decor reshuffles to a fresh random arrangement each time the player
 * enters. OFF (default) = deterministic; the same theme always yields the same layout.
 * @default false
 *
 * @param themeVariable
 * @text Theme Variable
 * @type variable
 * @desc Variable holding this building's theme string. 0 = use the Global Theme Variable.
 * @default 0
 *
 * @param themes
 * @text Themes
 * @type struct<Theme>[]
 * @desc Optional per-theme ambience (tint / parallax). Layout works without any entries.
 * @default []
 *
 * @param decorRegions
 * @text Decor Regions
 * @type number[]
 * @min 1
 * @max 255
 * @desc Region numbers where decor may appear. Paint these on the map.
 * @default []
 *
 * @param keepClearRegions
 * @text Keep-Clear Regions
 * @type number[]
 * @min 1
 * @max 255
 * @desc Region numbers decor must never land on (doorway, walkway).
 * @default []
 *
 * @param decorMin
 * @text Decor Count (min)
 * @type number
 * @min 0
 * @default 3
 *
 * @param decorMax
 * @text Decor Count (max)
 * @type number
 * @min 0
 * @default 6
 *
 * @param anchors
 * @text Anchors
 * @type struct<Anchor>[]
 * @desc Named standing slots, each mapped to a painted region number.
 * @default []
 *
 * @param npcs
 * @text NPCs (spawned)
 * @type struct<Npc>[]
 * @desc NPCs the plugin spawns from your character graphics and seats on an anchor.
 * @default []
 *
 * @param decor
 * @text Decor Pool (spawned)
 * @type struct<Decor>[]
 * @desc Scenery the plugin spawns from your character graphics and scatters into decor regions.
 * @default []
 */
/*~struct~Theme:
 * @param name
 * @text Theme Name
 * @type string
 * @desc The theme string this applies to (e.g. spring).
 * @default
 * @param tintR
 * @text Tint Red
 * @type number @min -255 @max 255
 * @default 0
 * @param tintG
 * @text Tint Green
 * @type number @min -255 @max 255
 * @default 0
 * @param tintB
 * @text Tint Blue
 * @type number @min -255 @max 255
 * @default 0
 * @param tintGray
 * @text Tint Gray
 * @type number @min 0 @max 255
 * @default 0
 * @param parallax
 * @text Parallax
 * @type file
 * @dir img/parallaxes
 * @desc Optional background swap for this theme.
 * @default
 */
/*~struct~Anchor:
 * @param slot
 * @text Slot Name
 * @type string
 * @desc e.g. counter, hearth, throne. Referenced by NPCs.
 * @default
 * @param region
 * @text Region
 * @type number @min 1 @max 255
 * @desc The painted region number that defines this slot's tiles.
 * @default 20
 */
/*~struct~Npc:
 * @param persistentId
 * @text Persistent Id
 * @type string
 * @desc Unique id under which this NPC's state (quest/dialogue/puzzle flags) is saved.
 * @default
 * @param characterName
 * @text Character Graphic
 * @type file
 * @dir img/characters
 * @default
 * @param characterIndex
 * @text Character Index
 * @type number @min 0 @max 7
 * @desc Which face in the 8-block sheet (0-7). Single "$" sheets use 0.
 * @default 0
 * @param anchorSlot
 * @text Anchor Slot
 * @type string
 * @desc The Slot Name from Anchors where this NPC stands.
 * @default
 * @param commonEvent
 * @text Interaction Common Event
 * @type common_event
 * @desc Runs when the player talks to this NPC (put the shop/dialogue there). 0 = none.
 * @default 0
 * @param through
 * @text Walk Through
 * @type boolean
 * @default false
 */
/*~struct~Decor:
 * @param characterName
 * @text Character Graphic
 * @type file
 * @dir img/characters
 * @default
 * @param characterIndex
 * @text Character Index
 * @type number @min 0 @max 7
 * @default 0
 * @param weight
 * @text Weight
 * @type number @min 1
 * @desc Higher = more likely to be chosen for a given theme.
 * @default 1
 * @param solid
 * @text Solid (blocks movement)
 * @type boolean
 * @on Blocks
 * @off Walkable
 * @default true
 */

var Imported = Imported || {};
Imported.BuildingInteriors = true;

var BuildingInteriors = BuildingInteriors || {};

(() => {
    "use strict";

    // Resolve parameters by this file's ACTUAL filename, so the plugin works no
    // matter what the .js is named (e.g. "BuildingInteriors (v3).js").
    const PLUGIN_NAME = (() => {
        try {
            return decodeURIComponent(document.currentScript.src)
                .match(/\/([^\/]+)\.js(?:\?.*)?$/)[1];
        } catch (e) {
            return "BuildingInteriors";
        }
    })();
    let raw = PluginManager.parameters(PLUGIN_NAME);
    if (!raw || Object.keys(raw).length === 0) {
        // Fallback if the filename couldn't be read for any reason.
        raw = PluginManager.parameters("BuildingInteriors") || raw || {};
    }

    const CONFIG = {
        globalThemeVariable: Number(raw.globalThemeVariable || 0),
        defaultTheme: String(raw.defaultTheme || "default"),
        debug: String(raw.debug || "false") === "true"
    };

    const log = (...a) => { if (CONFIG.debug) console.log("[BuildingInteriors]", ...a); };

    //=========================================================================
    // Struct parameter parsing
    //=========================================================================
    function jparse(str, fallback) {
        if (str === undefined || str === null || str === "") return fallback;
        try { return JSON.parse(str); } catch (e) { return fallback; }
    }
    function parseNumberList(str) {
        return jparse(str, []).map(n => Number(n)).filter(n => !isNaN(n));
    }
    function parseTheme(str) {
        const t = jparse(str, {});
        return {
            name: String(t.name || "").trim(),
            tint: [Number(t.tintR || 0), Number(t.tintG || 0), Number(t.tintB || 0), Number(t.tintGray || 0)],
            parallax: String(t.parallax || "")
        };
    }
    function parseAnchor(str) {
        const a = jparse(str, {});
        return { slot: String(a.slot || "").trim(), region: Number(a.region || 0) };
    }
    function parseNpc(str) {
        const n = jparse(str, {});
        return {
            persistentId: String(n.persistentId || "").trim(),
            characterName: String(n.characterName || ""),
            characterIndex: Number(n.characterIndex || 0),
            anchorSlot: String(n.anchorSlot || "").trim(),
            commonEvent: Number(n.commonEvent || 0),
            through: String(n.through || "false") === "true"
        };
    }
    function parseDecor(str) {
        const d = jparse(str, {});
        return {
            characterName: String(d.characterName || ""),
            characterIndex: Number(d.characterIndex || 0),
            weight: Math.max(1, Number(d.weight || 1)),
            solid: String(d.solid || "true") === "true"
        };
    }
    function parseBuilding(str) {
        const b = jparse(str, {});
        return {
            key: String(b.key || "").trim(),
            mapId: Number(b.mapId || 0),
            generate: String(b.generate || "false") === "true",
            rerollEachEntry: String(b.rerollEachEntry || "false") === "true",
            archetype: String(b.archetype || "").trim(),
            tilesetId: Number(b.tilesetId || 0),
            genWidth: Number(b.genWidth || 15),
            genHeight: Number(b.genHeight || 11),
            floorTileId: Number(b.floorTileId || 0),
            wallTileId: Number(b.wallTileId || 0),
            themeVariable: Number(b.themeVariable || 0),
            themes: jparse(b.themes, []).map(parseTheme),
            decorRegions: parseNumberList(b.decorRegions),
            keepClearRegions: parseNumberList(b.keepClearRegions),
            decorMin: Number(b.decorMin || 0),
            decorMax: Number(b.decorMax || 0),
            anchors: jparse(b.anchors, []).map(parseAnchor),
            npcs: jparse(b.npcs, []).map(parseNpc),
            decor: jparse(b.decor, []).map(parseDecor)
        };
    }

    // Built-in archetype recipes: anchors, decor zones, count, NPC slots.
    const ARCHETYPES = {
        shop:      { anch: [["counter",20],["assistant",21]], dec:[10],   mn:4, mx:8,  npc:[["keeper","counter"],["clerk","assistant"]] },
        workshop:  { anch: [["station",20],["assistant",21]], dec:[10,11],mn:5, mx:10, npc:[["crafter","station"],["apprentice","assistant"]] },
        lodging:   { anch: [["bar",20],["host",21]],          dec:[10],   mn:5, mx:9,  npc:[["host","bar"],["patron","host"]] },
        sanctuary: { anch: [["altar",20],["attendant",21]],   dec:[10],   mn:3, mx:6,  npc:[["priest","altar"]] },
        hall:      { anch: [["throne",20],["guard_left",21],["guard_right",22]], dec:[10], mn:4, mx:8, npc:[["ruler","throne"],["guard_a","guard_left"],["guard_b","guard_right"]] },
        residence: { anch: [["resident",20]],                 dec:[10],   mn:4, mx:7,  npc:[["resident","resident"]] },
        storage:   { anch: [["keeper",20]],                   dec:[10,11],mn:6, mx:12, npc:[["clerk","keeper"]] },
        cavern:    { anch: [["focal",20]],                    dec:[10,11],mn:4, mx:10, npc:[["guardian","focal"]] },
        pen:       { anch: [["handler",20],["pen",21]],       dec:[10],   mn:4, mx:8,  npc:[["handler","handler"]] },
        arena:     { anch: [["focal",20],["attendant",21]],   dec:[10],   mn:3, mx:7,  npc:[["host","attendant"],["champion","focal"]] },
        care:      { anch: [["desk",20],["attendant",21]],    dec:[10],   mn:4, mx:8,  npc:[["receptionist","desk"],["aide","attendant"]] },
        tower:     { anch: [["focal",20]],                    dec:[10,11],mn:4, mx:8,  npc:[["mage","focal"]] },
        civic:     { anch: [["official",20],["aide",21]],     dec:[10],   mn:3, mx:7,  npc:[["official","official"],["aide","aide"]] }
    };

    // When a building auto-generates, fill any empty structural fields from its archetype.
    function applyArchetypeDefaults(b) {
        const a = ARCHETYPES[b.archetype];
        if (!a) return b;
        if (!b.anchors.length) b.anchors = a.anch.map(([slot, region]) => ({ slot, region }));
        if (!b.decorRegions.length) b.decorRegions = a.dec.slice();
        if (!b.keepClearRegions.length) b.keepClearRegions = [63];
        if (!b.decorMin && !b.decorMax) { b.decorMin = a.mn; b.decorMax = a.mx; }
        if (!b.npcs.length) b.npcs = a.npc.map(([role, slot]) => ({
            persistentId: b.key + "_" + role, characterName: "", characterIndex: 0,
            anchorSlot: slot, commonEvent: 0, through: false
        }));
        return b;
    }

    BuildingInteriors.buildingsByKey = {};
    BuildingInteriors.buildingsByMapId = {};
    (function loadConfig() {
        const list = jparse(raw.buildings, []).map(parseBuilding);
        for (const b of list) {
            if (b.generate) applyArchetypeDefaults(b);
            if (b.key) BuildingInteriors.buildingsByKey[b.key] = b;
            if (b.mapId > 0) BuildingInteriors.buildingsByMapId[b.mapId] = b;
        }
        log("loaded buildings:", list.length);
    })();

    //=========================================================================
    // Seeded RNG
    //=========================================================================
    function stringSeed(str) {
        let h = 1779033703 ^ str.length;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
            h = (h << 13) | (h >>> 19);
        }
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
    function makeRng(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const Rng = {
        int(rng, n) { return Math.floor(rng() * n); },
        shuffle(rng, arr) {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
            return a;
        },
        range(rng, min, max) { return max <= min ? min : min + Math.floor(rng() * (max - min + 1)); }
    };

    //=========================================================================
    // Note parsing helpers
    //=========================================================================
    function noteMatch(note, regex) {
        const out = []; let m;
        const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
        while ((m = re.exec(note)) !== null) out.push(m);
        return out;
    }
    function noteFirst(note, regex) { return note.match(regex) || null; }
    function parseCount(str) {
        const r = String(str).match(/(\d+)\s*to\s*(\d+)/i);
        if (r) return { min: Number(r[1]), max: Number(r[2]) };
        const s = String(str).match(/(\d+)/); const n = s ? Number(s[1]) : 0;
        return { min: n, max: n };
    }

    //=========================================================================
    // Building resolution (config by mapId, or key by notetag/config)
    //=========================================================================
    BuildingInteriors.mapConfig = function (mapId) {
        return BuildingInteriors.buildingsByMapId[mapId] || null;
    };
    BuildingInteriors.currentBuildingKey = function () {
        // 1) config bound by current map id
        if ($gameMap) {
            const byId = BuildingInteriors.mapConfig($gameMap.mapId());
            if (byId && byId.key) return byId.key;
        }
        // 2) map notetag
        if ($dataMap && $dataMap.note) {
            const m = noteFirst($dataMap.note, /<Building Interior:\s*([^>]+)>/i);
            if (m) return m[1].trim();
        }
        // 3) config bound by id but keyless -> synthesize a key from mapId
        if ($gameMap) {
            const byId = BuildingInteriors.mapConfig($gameMap.mapId());
            if (byId) return "map" + $gameMap.mapId();
        }
        return null;
    };
    BuildingInteriors.currentConfig = function () {
        if ($gameMap) {
            const byId = BuildingInteriors.mapConfig($gameMap.mapId());
            if (byId) return byId;
        }
        const key = BuildingInteriors.currentBuildingKey();
        return key ? (BuildingInteriors.buildingsByKey[key] || null) : null;
    };

    BuildingInteriors.resolveTheme = function (key, cfg) {
        const override = $gameSystem.biThemeOverride(key);
        if (override) return override;
        if ($dataMap && $dataMap.note) {
            const sc = noteFirst($dataMap.note, /<Theme Script:\s*([^>]+)>/i);
            if (sc) { try { const v = eval(sc[1].trim()); if (v !== undefined && v !== null && String(v) !== "") return String(v); } catch (e) { console.error("[BuildingInteriors] Theme Script error:", e); } }
            const vt = noteFirst($dataMap.note, /<Theme Variable:\s*(\d+)>/i);
            if (vt) { const v = $gameVariables.value(Number(vt[1])); if (v !== undefined && v !== null && String(v) !== "" && v !== 0) return String(v); }
        }
        if (cfg && cfg.themeVariable > 0) {
            const v = $gameVariables.value(cfg.themeVariable);
            if (v !== undefined && v !== null && String(v) !== "" && v !== 0) return String(v);
        }
        if (CONFIG.globalThemeVariable > 0) {
            const v = $gameVariables.value(CONFIG.globalThemeVariable);
            if (v !== undefined && v !== null && String(v) !== "" && v !== 0) return String(v);
        }
        return CONFIG.defaultTheme;
    };

    //=========================================================================
    // Persistence store
    //=========================================================================
    const _GS_init = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () {
        _GS_init.call(this);
        this._biPositions = {};
        this._biSelfSw = {};
        this._biThemeOverride = {};
    };
    Game_System.prototype.biStorePosition = function (k, id, x, y, d) {
        this._biPositions = this._biPositions || {};
        (this._biPositions[k] = this._biPositions[k] || {})[id] = { x, y, d };
    };
    Game_System.prototype.biGetPosition = function (k, id) {
        return (this._biPositions && this._biPositions[k]) ? this._biPositions[k][id] : null;
    };
    Game_System.prototype.biSetSelfSwitch = function (id, letter, v) {
        this._biSelfSw = this._biSelfSw || {};
        (this._biSelfSw[id] = this._biSelfSw[id] || {})[letter] = !!v;
    };
    Game_System.prototype.biGetSelfSwitches = function (id) {
        return (this._biSelfSw && this._biSelfSw[id]) ? this._biSelfSw[id] : null;
    };
    Game_System.prototype.biThemeOverride = function (k) {
        return (this._biThemeOverride && k) ? (this._biThemeOverride[k] || null) : null;
    };
    Game_System.prototype.biSetThemeOverride = function (k, t) {
        this._biThemeOverride = this._biThemeOverride || {};
        if (t) this._biThemeOverride[k] = t; else delete this._biThemeOverride[k];
    };
    Game_System.prototype.biClearPersistence = function (k) {
        this._biPositions = this._biPositions || {}; this._biSelfSw = this._biSelfSw || {};
        if (k) { delete this._biPositions[k]; } else { this._biPositions = {}; this._biSelfSw = {}; }
    };

    //=========================================================================
    // Self-switch mirror
    //=========================================================================
    const _SelfSw_setValue = Game_SelfSwitches.prototype.setValue;
    Game_SelfSwitches.prototype.setValue = function (key, value) {
        _SelfSw_setValue.call(this, key, value);
        if ($gameMap && Array.isArray(key) && key[0] === $gameMap.mapId()) {
            const pid = $gameMap.biPersistentIdOfEvent(key[1]);
            if (pid) $gameSystem.biSetSelfSwitch(pid, key[2], value);
        }
    };

    //=========================================================================
    // Synthetic event builders (spawned NPCs & decor)
    //=========================================================================
    function blankConditions() {
        return { actorId: 1, actorValid: false, itemId: 1, itemValid: false, selfSwitchCh: "A",
            selfSwitchValid: false, switch1Id: 1, switch1Valid: false, switch2Id: 1, switch2Valid: false,
            variableId: 1, variableValid: false, variableValue: 0 };
    }
    function blankMoveRoute() { return { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false }; }
    function makeEventData(id, note, charName, charIndex, priorityType, through, list) {
        return {
            id, name: "", note: note || "", x: 0, y: 0, meta: {},
            pages: [{
                conditions: blankConditions(),
                directionFix: false,
                image: { tileId: 0, characterName: charName || "", characterIndex: charIndex || 0, direction: 2, pattern: 1 },
                list: list && list.length ? list : [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3, moveRoute: blankMoveRoute(), moveSpeed: 3, moveType: 0,
                priorityType: priorityType, stepAnime: false, through: !!through, trigger: 0, walkAnime: true
            }]
        };
    }

    // Inject configured NPCs/decor into $dataMap.events BEFORE Game_Event creation.
    BuildingInteriors.injectConfiguredEvents = function (mapId) {
        if (!$dataMap || !Array.isArray($dataMap.events)) return;
        // Strip any events we injected on a previous setup of this cached data.
        $dataMap.events = $dataMap.events.filter(e => !(e && e._biInjected));

        const cfg = BuildingInteriors.buildingsByMapId[mapId] || (function () {
            // bind by KEY note if no mapId entry
            const note = ($dataMap.note || "");
            const m = note.match(/<Building Interior:\s*([^>]+)>/i);
            return m ? BuildingInteriors.buildingsByKey[m[1].trim()] : null;
        })();
        if (!cfg) return;

        let nextId = $dataMap.events.length;

        for (const npc of cfg.npcs) {
            if (!npc.characterName) continue;
            const noteParts = [];
            if (npc.persistentId) noteParts.push("<Persistent: " + npc.persistentId + ">");
            if (npc.anchorSlot) noteParts.push("<Anchor: " + npc.anchorSlot + ">");
            const list = npc.commonEvent > 0
                ? [{ code: 117, indent: 0, parameters: [npc.commonEvent] }, { code: 0, indent: 0, parameters: [] }]
                : [{ code: 0, indent: 0, parameters: [] }];
            const ev = makeEventData(nextId, noteParts.join(" "), npc.characterName, npc.characterIndex, 1, npc.through, list);
            ev._biInjected = true;
            if (DataManager.extractMetadata) DataManager.extractMetadata(ev);
            $dataMap.events[nextId] = ev; nextId++;
        }

        for (const d of cfg.decor) {
            if (!d.characterName) continue;
            const note = "<Decor> <Decor Weight: " + d.weight + ">";
            const ev = makeEventData(nextId, note, d.characterName, d.characterIndex, d.solid ? 1 : 0, !d.solid, null);
            ev._biInjected = true;
            if (DataManager.extractMetadata) DataManager.extractMetadata(ev);
            $dataMap.events[nextId] = ev; nextId++;
        }
        log("injected events for map", mapId, "-> total", nextId - 1);
    };

    //=========================================================================
    // Game_Map hooks
    //=========================================================================
    Game_Map.prototype.biPersistentIdOfEvent = function (eventId) {
        return this._biPidByEventId ? this._biPidByEventId[eventId] : null;
    };
    // Resolve a building config for a map id (by id, then by KEY note).
    BuildingInteriors.configForMap = function (mapId) {
        const byId = BuildingInteriors.buildingsByMapId[mapId];
        if (byId) return byId;
        const note = ($dataMap && $dataMap.note) || "";
        const m = note.match(/<Building Interior:\s*([^>]+)>/i);
        return m ? (BuildingInteriors.buildingsByKey[m[1].trim()] || null) : null;
    };

    // MZ tile-layer constants.
    const TILE_A2 = 2816, TILE_A4 = 5888;

    // Build floor + wall border + doorway + region zones straight into $dataMap.
    // If the author has painted any zone regions (decor/keep-clear/anchor) on the map,
    // switch to ASSISTED mode: keep the map's size and painted regions, generate only
    // the floor + walls, and auto-fill the leftover floor as decor. That way hand-placed
    // anchors and keep-clear tiles are respected instead of being overwritten.
    BuildingInteriors.generateBuildingMap = function (cfg) {
        if (!$dataMap) return;
        const floor = cfg.floorTileId > 0 ? cfg.floorTileId : TILE_A2;
        const wall = cfg.wallTileId > 0 ? cfg.wallTileId : TILE_A4;

        const zoneRegions = new Set([].concat(
            cfg.decorRegions || [], cfg.keepClearRegions || [],
            (cfg.anchors || []).map(a => a.region)
        ).filter(r => r > 0));

        const orig = $dataMap.data || [];
        const oW = $dataMap.width || 0, oH = $dataMap.height || 0;
        const origReg = (x, y) => (orig.length >= oW * oH * 6) ? (orig[(5 * oH + y) * oW + x] || 0) : 0;

        let painted = false;
        if (oW > 0 && oH > 0 && orig.length >= oW * oH * 6) {
            for (let y = 0; y < oH && !painted; y++)
                for (let x = 0; x < oW; x++) { if (zoneRegions.has(origReg(x, y))) { painted = true; break; } }
        }

        if (painted) {
            // ---- ASSISTED: honor the author's painted regions ----
            const W = oW, H = oH;
            const data = new Array(W * H * 6).fill(0);
            const put = (x, y, z, v) => { data[(z * H + y) * W + x] = v; };
            // preserve the painted region layer exactly
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, 5, origReg(x, y));
            // floor everywhere, then wall the border - except border tiles painted keep-clear (doorways)
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, 0, floor);
            const kc = new Set(cfg.keepClearRegions || []);
            const isDoor = (x, y) => kc.has(origReg(x, y));
            let doorFound = false;
            const tryWall = (x, y) => { if (isDoor(x, y)) doorFound = true; else put(x, y, 0, wall); };
            for (let x = 0; x < W; x++) { tryWall(x, 0); tryWall(x, H - 1); }
            for (let y = 0; y < H; y++) { tryWall(0, y); tryWall(W - 1, y); }
            // if no doorway was painted on the border, carve one at bottom-center
            if (!doorFound) { const dx = Math.floor(W / 2); put(dx, H - 1, 0, floor); }
            // auto-fill leftover interior floor (unpainted tiles) as the decor zone
            const decRegion = (cfg.decorRegions && cfg.decorRegions[0]) || 10;
            for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
                if (data[(5 * H + y) * W + x] === 0) put(x, y, 5, decRegion);
            }
            $dataMap.width = W; $dataMap.height = H; $dataMap.data = data;
            if (cfg.tilesetId > 0) $dataMap.tilesetId = cfg.tilesetId;
            $dataMap.events = ($dataMap.events || []).filter(e => !(e && e._biInjected));
            log("generated map (assisted: honoring painted regions)", { key: cfg.key, W, H });
            return;
        }

        // ---- AUTO: no painted regions, generate the whole layout ----
        const W = Math.max(5, cfg.genWidth || 15), H = Math.max(5, cfg.genHeight || 11);
        const data = new Array(W * H * 6).fill(0);
        const put = (x, y, z, v) => { data[(z * H + y) * W + x] = v; };
        const reg = (x, y, r) => put(x, y, 5, r);

        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, 0, floor);
        const doorX = Math.floor(W / 2);
        for (let x = 0; x < W; x++) { put(x, 0, 0, wall); if (x !== doorX) put(x, H - 1, 0, wall); }
        for (let y = 0; y < H; y++) { put(0, y, 0, wall); put(W - 1, y, 0, wall); }

        for (let y = H - 1; y >= 2; y--) reg(doorX, y, 63);

        const anchorRegions = (cfg.anchors || []).map(a => a.region);
        const n = Math.max(1, anchorRegions.length);
        anchorRegions.forEach((rr, i) => {
            let x = Math.round((W - 1) * (i + 1) / (n + 1));
            x = Math.min(Math.max(x, 1), W - 2);
            reg(x, 2, rr);
        });

        const dregs = (cfg.decorRegions && cfg.decorRegions.length) ? cfg.decorRegions : [10];
        for (let y = 3; y <= H - 2; y++) {
            for (let x = 1; x <= W - 2; x++) {
                if (x === doorX) continue;
                reg(x, y, dregs[(x + y) % dregs.length]);
            }
        }

        $dataMap.width = W; $dataMap.height = H; $dataMap.data = data;
        if (cfg.tilesetId > 0) $dataMap.tilesetId = cfg.tilesetId;
        $dataMap.events = ($dataMap.events || []).filter(e => !(e && e._biInjected));
        log("generated map (auto)", { key: cfg.key, W, H, tileset: $dataMap.tilesetId });
    };

    const _GM_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function (mapId) {
        const gcfg = BuildingInteriors.configForMap(mapId);
        if (gcfg && gcfg.generate) BuildingInteriors.generateBuildingMap(gcfg);
        BuildingInteriors.injectConfiguredEvents(mapId);
        _GM_setup.call(this, mapId);
        this._biPidByEventId = {};
        BuildingInteriors.dressCurrentMap();
    };

    // The map's display is rebuilt whenever Scene_Map is (re)created - including when
    // returning from the menu. RPG Maker restores the authored tiles on that rebuild,
    // which would wipe the generated floor. Re-write the generated tiles just before
    // the spriteset reads them so the room can't revert. (Tiles only - events, NPC
    // seating and decor placement are untouched, so nothing reshuffles on menu close.)
    if (typeof Scene_Map !== "undefined") {
        const _SM_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
        Scene_Map.prototype.createDisplayObjects = function () {
            BuildingInteriors.reapplyGeneratedTiles();
            _SM_createDisplayObjects.call(this);
        };
    }
    BuildingInteriors.reapplyGeneratedTiles = function () {
        if (!$gameMap || !$dataMap) return;
        const cfg = BuildingInteriors.configForMap($gameMap.mapId());
        if (cfg && cfg.generate) BuildingInteriors.generateBuildingMap(cfg);
    };

    //=========================================================================
    // Snapshot moved-object positions on leaving
    //=========================================================================
    const _GP_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function () {
        if (this.isTransferring()) BuildingInteriors.snapshotPositions();
        _GP_performTransfer.call(this);
    };
    BuildingInteriors.snapshotPositions = function () {
        const key = BuildingInteriors.currentBuildingKey();
        if (!key || !$gameMap) return;
        for (const ev of $gameMap.events()) {
            if (!ev || !ev.event()) continue;
            if (!/<Persist Position>/i.test(ev.event().note || "")) continue;
            const pid = BuildingInteriors.eventPersistentId(ev.event());
            if (!pid) continue;
            $gameSystem.biStorePosition(key, pid, ev.x, ev.y, ev.direction());
        }
    };
    BuildingInteriors.eventPersistentId = function (dataEvent) {
        const m = (dataEvent.note || "").match(/<Persistent:\s*([^>]+)>/i);
        return m ? m[1].trim() : null;
    };

    //=========================================================================
    // The dressing pass (config-aware, notetag-compatible)
    //=========================================================================
    BuildingInteriors.dressCurrentMap = function () {
        const key = BuildingInteriors.currentBuildingKey();
        if (!key || !$gameMap) return;
        const cfg = BuildingInteriors.currentConfig();

        const theme = BuildingInteriors.resolveTheme(key, cfg);
        const reroll = cfg && cfg.rerollEachEntry;
        const seedNum = reroll ? ((Math.random() * 0xFFFFFFFF) >>> 0) : stringSeed(key + "::" + theme);
        const rng = makeRng(seedNum);
        log("dress", { key, theme, reroll: !!reroll, seed: seedNum });

        const map = $gameMap;
        map._biPidByEventId = {};
        const note = ($dataMap && $dataMap.note) || "";

        // ---- gather regions / count / anchor map from config + notetags -----
        let decorRegions = noteMatch(note, /<Decor Region:\s*(\d+)>/gi).map(m => Number(m[1]));
        let keepClearRegions = noteMatch(note, /<Keep Clear Region:\s*(\d+)>/gi).map(m => Number(m[1]));
        const anchorRegionMap = {};
        for (const m of noteMatch(note, /<Anchor Region:\s*(\d+)\s+as\s+([^>]+)>/gi)) {
            const slot = m[2].trim(); (anchorRegionMap[slot] = anchorRegionMap[slot] || []).push(Number(m[1]));
        }
        let count = null;
        const ct = noteFirst(note, /<Decor Count:\s*([^>]+)>/i);
        if (ct) count = parseCount(ct[1]);

        if (cfg) {
            decorRegions = decorRegions.concat(cfg.decorRegions);
            keepClearRegions = keepClearRegions.concat(cfg.keepClearRegions);
            for (const a of cfg.anchors) if (a.slot && a.region) (anchorRegionMap[a.slot] = anchorRegionMap[a.slot] || []).push(a.region);
            if (!count && (cfg.decorMin || cfg.decorMax)) count = { min: cfg.decorMin, max: cfg.decorMax };
        }
        if (!count) count = { min: 3, max: 6 };

        // ---- region tile collection & occupancy -----------------------------
        const regionTiles = {};
        const collect = (r) => {
            if (regionTiles[r]) return regionTiles[r];
            const t = [];
            for (let y = 0; y < map.height(); y++) for (let x = 0; x < map.width(); x++) if (map.regionId(x, y) === r) t.push({ x, y });
            return (regionTiles[r] = t);
        };
        const occupied = new Set();
        const kk = (x, y) => x + "," + y;
        const reserve = (x, y) => occupied.add(kk(x, y));

        const ax = ($gamePlayer && $gamePlayer._newX >= 0) ? $gamePlayer._newX : ($gamePlayer ? $gamePlayer.x : -1);
        const ay = ($gamePlayer && $gamePlayer._newY >= 0) ? $gamePlayer._newY : ($gamePlayer ? $gamePlayer.y : -1);
        if (ax >= 0) reserve(ax, ay);
        for (const r of keepClearRegions) for (const t of collect(r)) reserve(t.x, t.y);

        // ---- classify events (authored + injected all carry notes) ----------
        const anchorConsumers = [];
        const eventAnchorSlots = {};
        const decorEvents = [];

        for (const ev of map.events()) {
            const data = ev.event(); if (!data) continue;
            const n = data.note || "";
            const pid = BuildingInteriors.eventPersistentId(data);
            if (pid) map._biPidByEventId[ev.eventId()] = pid;

            const slotDef = n.match(/<Anchor Slot:\s*([^>]+)>/i);
            if (slotDef) { const s = slotDef[1].trim(); (eventAnchorSlots[s] = eventAnchorSlots[s] || []).push({ x: ev.x, y: ev.y }); reserve(ev.x, ev.y); }

            const use = n.match(/<Anchor:\s*([^>]+)>/i);
            if (use) anchorConsumers.push({ gameEvent: ev, slot: use[1].trim(), pid });

            if (n.match(/<Decor(?::\s*[^>]+)?>/i)) {
                const w = n.match(/<Decor Weight:\s*(\d+)>/i);
                decorEvents.push({ gameEvent: ev, weight: w ? Math.max(1, Number(w[1])) : 1 });
            }
        }

        // ---- restore persistent self-switch state ---------------------------
        for (const ev of map.events()) {
            const pid = map._biPidByEventId[ev.eventId()]; if (!pid) continue;
            const stored = $gameSystem.biGetSelfSwitches(pid); if (!stored) continue;
            for (const letter of ["A", "B", "C", "D"]) if (stored[letter] !== undefined)
                _SelfSw_setValue.call($gameSelfSwitches, [map.mapId(), ev.eventId(), letter], stored[letter]);
            ev.refresh();
        }

        // ---- seat anchored NPCs --------------------------------------------
        const slotTiles = (slot) => {
            if (eventAnchorSlots[slot] && eventAnchorSlots[slot].length) return eventAnchorSlots[slot];
            let t = []; for (const r of (anchorRegionMap[slot] || [])) t = t.concat(collect(r)); return t;
        };
        for (const ac of anchorConsumers) {
            const free = slotTiles(ac.slot).filter(t => !occupied.has(kk(t.x, t.y)));
            const pool = free.length ? free : slotTiles(ac.slot);
            if (!pool.length) { log("no anchor tiles for slot", ac.slot); continue; }
            const pick = pool[Rng.int(rng, pool.length)];
            ac.gameEvent.locate(pick.x, pick.y); reserve(pick.x, pick.y);
        }

        // ---- restore player-moved persistent positions ----------------------
        for (const ev of map.events()) {
            const data = ev.event(); if (!data || !/<Persist Position>/i.test(data.note || "")) continue;
            const pid = map._biPidByEventId[ev.eventId()]; if (!pid) continue;
            const stored = $gameSystem.biGetPosition(key, pid);
            if (stored) { ev.locate(stored.x, stored.y); if (stored.d) ev.setDirection(stored.d); reserve(stored.x, stored.y); }
        }

        // ---- place decor ----------------------------------------------------
        for (const d of decorEvents) if (!d.gameEvent._erased) { d.gameEvent._erased = true; d.gameEvent.refresh(); }

        let pool = [];
        for (const r of decorRegions) pool = pool.concat(collect(r));
        pool = Rng.shuffle(rng, pool.filter(t => !occupied.has(kk(t.x, t.y))));

        const order = [];
        {
            const bag = decorEvents.slice();
            while (bag.length) {
                const total = bag.reduce((s, d) => s + d.weight, 0);
                let roll = rng() * total, idx = 0;
                for (; idx < bag.length; idx++) { roll -= bag[idx].weight; if (roll <= 0) break; }
                if (idx >= bag.length) idx = bag.length - 1;
                order.push(bag[idx]); bag.splice(idx, 1);
            }
        }
        const target = Math.min(Rng.range(rng, count.min, count.max), order.length, pool.length);
        let placed = 0;
        for (const d of order) {
            if (placed >= target || !pool.length) break;
            const tile = pool.pop();
            d.gameEvent._erased = false; d.gameEvent.refresh();
            d.gameEvent.locate(tile.x, tile.y); reserve(tile.x, tile.y); placed++;
        }
        log("decor placed", placed, "of", target);

        BuildingInteriors.applyAmbience(note, theme, cfg);
    };

    BuildingInteriors.applyAmbience = function (note, theme, cfg) {
        let tint = null, parallax = null;
        if (cfg) {
            const t = cfg.themes.find(t => t.name.toLowerCase() === String(theme).toLowerCase());
            if (t) { if (t.tint.some(v => v !== 0)) tint = t.tint; if (t.parallax) parallax = t.parallax; }
        }
        const nt = noteMatch(note, /<Theme Tint:\s*([^=]+)=\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)>/gi)
            .find(m => m[1].trim().toLowerCase() === String(theme).toLowerCase());
        if (nt) tint = [Number(nt[2]), Number(nt[3]), Number(nt[4]), Number(nt[5])];
        const np = noteMatch(note, /<Theme Parallax:\s*([^=]+)=\s*([^>]+)>/gi)
            .find(m => m[1].trim().toLowerCase() === String(theme).toLowerCase());
        if (np) parallax = np[2].trim();

        if (tint && $gameScreen) $gameScreen.startTint(tint, 1);
        if (parallax && $gameMap) $gameMap.changeParallax(parallax, $gameMap._parallaxLoopX, $gameMap._parallaxLoopY, $gameMap._parallaxSx, $gameMap._parallaxSy);
    };

    //=========================================================================
    // Plugin commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "SetBuildingTheme", args => {
        const key = (args.buildingKey || "").trim() || BuildingInteriors.currentBuildingKey();
        if (!key) return;
        $gameSystem.biSetThemeOverride(key, (args.theme || "").trim());
        if (key === BuildingInteriors.currentBuildingKey()) BuildingInteriors.dressCurrentMap();
    });
    PluginManager.registerCommand(PLUGIN_NAME, "ClearBuildingTheme", args => {
        const key = (args.buildingKey || "").trim() || BuildingInteriors.currentBuildingKey();
        if (!key) return;
        $gameSystem.biSetThemeOverride(key, null);
        if (key === BuildingInteriors.currentBuildingKey()) BuildingInteriors.dressCurrentMap();
    });
    PluginManager.registerCommand(PLUGIN_NAME, "Redress", () => BuildingInteriors.dressCurrentMap());
    PluginManager.registerCommand(PLUGIN_NAME, "ClearPersistence", args => {
        $gameSystem.biClearPersistence((args.buildingKey || "").trim() || null);
    });

})();
