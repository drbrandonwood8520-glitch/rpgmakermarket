//=============================================================================
// RPG Maker MZ - Faction Skirmishes
// FactionSkirmishes.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc When the war resolves an attack between two factions, a skirmish may erupt on the overworld. Join as a third party — the outcome rewrites region control, faction strength, standing, and vassals.
 * @author Claude
 * @url
 * @orderAfter FactionBorderWars
 * @orderAfter VassalStates
 * @orderAfter RelationshipSystem
 *
 * @help
 * ============================================================================
 * Faction Skirmishes  (load at the BOTTOM)
 * ============================================================================
 *
 * When the autonomous war resolves an attack — one faction seizing a region
 * from another (the "Midvale -> The Oasis" toast) — there is a chance a physical
 * SKIRMISH erupts on the overworld for you to join as a third party.
 *
 * You choose a side, fight, and the result rewrites the strategic picture:
 *   - Side with the DEFENDER and win  -> you liberate the region (it returns to
 *     the defender) and the attacker's strength is broken.
 *   - Side with the ATTACKER and win  -> you cement the conquest (region stays
 *     the attacker's) and the defender's strength is broken.
 *   - FIGHT THEM ALL and win          -> both armies are shattered (both lose
 *     strength, the region's defenses are gutted) and you may seize the region
 *     into your own domain as a vassal.
 *   - WITHDRAW or LOSE                 -> the war's original result stands.
 * Standing (RelationshipSystem) rises with a side you help and falls with a side
 * you fight, if that plugin is present.
 *
 * This plugin supplies the DATA and the LOGIC. You build a short common event
 * for the PRESENTATION (the offer text, the choice menu, the battle), so the
 * look is entirely yours. Setup below.
 *
 * ----------------------------------------------------------------------------
 * ONE-TIME SETUP  (built-in mode — recommended, no common event)
 * ----------------------------------------------------------------------------
 * 1. Give each faction an "army" Troop in the Database (Troops tab) and map it
 *    in the "Faction Troops" parameter (faction id -> troop id). Set a Fallback
 *    Troop too, so a faction with no mapping still fights.
 * 2. Mark your overworld map(s): put <fwOverworld> in the Map's note box.
 * 3. Leave "Use Built-in Prompt" ON. That's it — the plugin shows the offer and
 *    the side choice, starts the battle the instant you choose, spreads the two
 *    armies out, and applies the whole outcome when the fight ends.
 *
 * You do NOT need a common event, a troop variable, or Battle Processing in
 * built-in mode. (If you turn "Use Built-in Prompt" OFF, you can drive it from
 * your own common event instead: Show Intro, Show Choices, then a single
 * "Join Battle" plugin command per branch — still no Battle Processing.)
 *
 * Test it right away with the "Force Skirmish (test)" command.
 *
 * Requires FactionBorderWars. VassalStates (for "seize the region") and
 * RelationshipSystem (for standing) are optional.
 *
 * ============================================================================
 *
 * @param ---Trigger---
 * @default
 *
 * @param skirmishChance
 * @parent ---Trigger---
 * @text Skirmish Chance (%)
 * @type number
 * @min 0
 * @max 100
 * @desc Chance a skirmish erupts when the war resolves one faction taking a region from another.
 * @default 25
 *
 * @param cooldownTicks
 * @parent ---Trigger---
 * @text Cooldown (war ticks)
 * @type number
 * @min 0
 * @desc War ticks that must pass between skirmishes.
 * @default 3
 *
 * @param requireOverworld
 * @parent ---Trigger---
 * @text Require Overworld Map
 * @type boolean
 * @on Require
 * @off Anywhere
 * @desc Only spawn on maps whose note contains <fwOverworld>.
 * @default true
 *
 * @param excludePlayerFaction
 * @parent ---Trigger---
 * @text Skip If Player's Faction
 * @type boolean
 * @desc If ON, no skirmish when the attacker OR defender is the faction you belong to.
 * @default false
 *
 * @param ---Wiring---
 * @default
 *
 * @param skirmishCommonEvent
 * @parent ---Wiring---
 * @text Skirmish Common Event
 * @type common_event
 * @desc The common event that presents the offer/battle (see Help). Required.
 * @default 0
 *
 * @param troopVariable
 * @parent ---Wiring---
 * @text Troop Variable
 * @type variable
 * @desc Game variable the plugin fills with the troop id to fight; your Battle Processing reads it.
 * @default 0
 *
 * @param factionTroops
 * @parent ---Wiring---
 * @text Faction Troops
 * @type struct<FactionTroop>[]
 * @desc Map each faction id to the Troop that represents its army in a skirmish.
 * @default []
 *
 * @param fallbackTroopId
 * @parent ---Wiring---
 * @text Fallback Troop
 * @type troop
 * @desc Troop used if a faction has no mapping above. 0 = skip the skirmish.
 * @default 0
 *
 * @param autoArrange
 * @parent ---Wiring---
 * @text Auto-Arrange Enemies
 * @type boolean
 * @on Spread out
 * @off Use troop layout
 * @desc Spread skirmish enemies across the field so they never overlap (fixes stacked sprites, esp. in fight-all).
 * @default true
 *
 * @param useBuiltinPrompt
 * @parent ---Wiring---
 * @text Use Built-in Prompt
 * @type boolean
 * @on Built-in (recommended)
 * @off Use my common event
 * @desc If ON, the plugin shows the offer, choices, and starts the battle itself. No common event or Battle Processing needed.
 * @default true
 *
 * @param introText
 * @parent ---Wiring---
 * @text Intro Text
 * @desc Shown by "Show Intro". %1=attacker, %2=defender, %3=region.
 * @default %1 storms %3! %2 defends. A battle rages in the open field.
 *
 * @param ---Consequences---
 * @default
 *
 * @param strengthCut
 * @parent ---Consequences---
 * @text Strength Cut
 * @type number
 * @min 0
 * @desc Strength removed from a faction whose army you break in a skirmish.
 * @default 12
 *
 * @param defenseCutFightAll
 * @parent ---Consequences---
 * @text Region Defense Cut (Fight All)
 * @type number
 * @min 0
 * @desc Region defense removed when you win a "fight them all".
 * @default 15
 *
 * @param permanentDamage
 * @parent ---Consequences---
 * @text Permanent Damage
 * @type boolean
 * @on Permanent
 * @off Regenerates
 * @desc If ON, skirmish strength/defense losses also lower the baseline.
 * @default false
 *
 * @param standingGain
 * @parent ---Consequences---
 * @text Standing Gain (helped side)
 * @type number
 * @min 0
 * @desc Affinity gained with a faction you fight FOR (needs RelationshipSystem).
 * @default 10
 *
 * @param standingLoss
 * @parent ---Consequences---
 * @text Standing Loss (fought side)
 * @type number
 * @min 0
 * @desc Affinity lost with a faction you fight AGAINST.
 * @default 12
 *
 * @param claimOnFightAll
 * @parent ---Consequences---
 * @text Seize Region On Fight-All
 * @type boolean
 * @on Seize
 * @off Leave it
 * @desc If ON and you win a fight-all, the region is claimed (VassalStates) into your domain.
 * @default true
 *
 * @command showIntro
 * @text Show Intro
 * @desc Displays the skirmish intro line naming the attacker, defender, and region.
 *
 * @command setStance
 * @text Set Stance
 * @desc Choose your side; sets the Troop Variable for Battle Processing.
 * @arg stance
 * @text Stance
 * @type select
 * @option Side with defender
 * @value defender
 * @option Side with attacker
 * @value attacker
 * @option Fight them all
 * @value all
 * @option Withdraw
 * @value withdraw
 * @default defender
 *
 * @command resolve
 * @text Resolve
 * @desc Apply the skirmish outcome based on the chosen stance and result.
 * @arg result
 * @text Result
 * @type select
 * @option Win
 * @value win
 * @option Lose / Escape
 * @value lose
 * @default win
 *
 * @command joinBattle
 * @text Join Battle
 * @desc Pick a side AND start the skirmish battle immediately. The outcome is applied automatically when the battle ends. (Recommended — no Battle Processing needed.)
 * @arg stance
 * @text Stance
 * @type select
 * @option Side with defender
 * @value defender
 * @option Side with attacker
 * @value attacker
 * @option Fight them all
 * @value all
 * @option Withdraw
 * @value withdraw
 * @default defender
 *
 * @command forceSkirmish
 * @text Force Skirmish (test)
 * @desc Manually queue a skirmish for testing.
 * @arg attacker
 * @text Attacker Faction
 * @type string
 * @arg defender
 * @text Defender Faction
 * @type string
 * @arg regionId
 * @text Region ID
 * @type number
 * @min 1
 * @default 1
 */

/*~struct~FactionTroop:
 * @param factionId
 * @text Faction ID
 * @desc Faction id as used in FactionBorderWars.
 * @param troopId
 * @text Troop ID
 * @type troop
 * @desc The Troop that represents this faction's army in a skirmish.
 * @default 0
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "FactionSkirmishes";
    const params = PluginManager.parameters(PLUGIN_NAME);
    const jparse = (s, fb) => { try { return JSON.parse(s); } catch (e) { return fb; } };
    const structArray = (s) => jparse(s, []).map((x) => jparse(x, {}));
    const num = (v, d) => (v === undefined || v === "" || isNaN(Number(v)) ? d : Number(v));
    const boolp = (v) => v === true || v === "true";

    const CFG = {
        chance: num(params.skirmishChance, 25),
        cooldownTicks: num(params.cooldownTicks, 3),
        requireOverworld: boolp(params.requireOverworld),
        excludePlayerFaction: boolp(params.excludePlayerFaction),
        commonEventId: num(params.skirmishCommonEvent, 0),
        troopVar: num(params.troopVariable, 0),
        troops: (() => {
            const map = {};
            for (const t of structArray(params.factionTroops)) {
                const fid = String(t.factionId || "").trim();
                const tid = num(t.troopId, 0);
                if (fid && tid > 0) map[fid] = tid;
            }
            return map;
        })(),
        fallbackTroop: num(params.fallbackTroopId, 0),
        autoArrange: boolp(params.autoArrange),
        useBuiltin: boolp(params.useBuiltinPrompt),
        introText: String(params.introText || "%1 storms %3! %2 defends."),
        strengthCut: num(params.strengthCut, 12),
        defenseCutAll: num(params.defenseCutFightAll, 15),
        permanent: boolp(params.permanentDamage),
        standingGain: num(params.standingGain, 10),
        standingLoss: num(params.standingLoss, 12),
        claimOnAll: boolp(params.claimOnFightAll),
    };

    const hasWar = () => typeof $gameFactionWar !== "undefined" && $gameFactionWar;
    const hasVassals = () => typeof $gameVassalDomain !== "undefined" && $gameVassalDomain;
    const hasRelationships = () => typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.gainAffinity === "function";

    const troopFor = (factionId) => CFG.troops[factionId] || CFG.fallbackTroop || 0;
    const factionName = (id) => (hasWar() && $gameFactionWar.faction(id) ? $gameFactionWar.faction(id).name : id);
    const regionName = (rid) => (hasWar() && $gameFactionWar.region(rid) ? $gameFactionWar.region(rid).name : "Region " + rid);

    //=========================================================================
    // Runtime state (the pending / active skirmish). Transient by design.
    //=========================================================================
    const FS = {
        pending: null,   // { attacker, defender, regionId } waiting to spawn
        active: null,    // the skirmish currently being played out
        stance: "",      // player's chosen side this skirmish
        appendTroopId: 0,// second army to add for a "fight them all"
    };
    window.FactionSkirmishes = FS;

    FS.queue = function (attacker, defender, regionId) {
        // Basic validity: two distinct, real factions.
        if (!hasWar()) return;
        if (!attacker || !defender || attacker === defender) return;
        if (!$gameFactionWar.faction(attacker) || !$gameFactionWar.faction(defender)) return;
        if (CFG.excludePlayerFaction) {
            const pf = $gameFactionWar.playerFactionId ? $gameFactionWar.playerFactionId() : "";
            if (pf && (pf === attacker || pf === defender)) return;
        }
        if (troopFor(attacker) === 0 || troopFor(defender) === 0) return; // no army defined
        if (this.active || this.pending) return;
        this.pending = { attacker, defender, regionId };
    };

    FS.cooldownLeft = function () {
        return $gameSystem ? ($gameSystem._fsCooldown || 0) : 0;
    };
    FS.setCooldown = function (n) { if ($gameSystem) $gameSystem._fsCooldown = n; };

    FS.onWarTick = function () {
        if ($gameSystem && $gameSystem._fsCooldown > 0) $gameSystem._fsCooldown--;
    };

    // Called from Scene_Map when it's safe to actually present the skirmish.
    FS.trySpawn = function () {
        if (this.active || !this.pending) return;
        if (this.cooldownLeft() > 0) { this.pending = null; return; }
        if (CFG.requireOverworld && !this._onOverworld()) return; // wait until on overworld
        // Built-in path needs no common event; the CE path does.
        if (!CFG.useBuiltin && CFG.commonEventId <= 0) return;
        this.active = this.pending;
        this.pending = null;
        this.stance = "";
        this.setCooldown(CFG.cooldownTicks);
        if (CFG.useBuiltin) this.presentOffer();
        else $gameTemp.reserveCommonEvent(CFG.commonEventId);
    };

    // Built-in offer: intro line + side choice, handled entirely by the plugin
    // (no common event, no Battle Processing). Choosing a side runs the battle
    // immediately via joinBattle.
    FS.presentOffer = function () {
        const s = this.active;
        if (!s) return;
        const atk = factionName(s.attacker), def = factionName(s.defender), reg = regionName(s.regionId);
        $gameMessage.add(CFG.introText.replace("%1", atk).replace("%2", def).replace("%3", reg));
        const choices = ["Side with " + def, "Side with " + atk, "Fight them all", "Withdraw"];
        $gameMessage.setChoices(choices, 0, 3);   // default first, cancel = Withdraw
        $gameMessage.setChoicePositionType(1);
        $gameMessage.setChoiceCallback((n) => {
            const stance = ["defender", "attacker", "all", "withdraw"][n] || "withdraw";
            FS.joinBattle(stance);
        });
    };

    FS._onOverworld = function () {
        return !!($dataMap && $dataMap.note && /<fwOverworld>/i.test($dataMap.note));
    };

    // ---- Presentation helpers (called by the common event) ----------------
    FS.showIntro = function () {
        const s = this.active;
        if (!s) return;
        const text = CFG.introText
            .replace("%1", factionName(s.attacker))
            .replace("%2", factionName(s.defender))
            .replace("%3", regionName(s.regionId));
        $gameMessage.add(text);
    };

    FS.setStance = function (stance) {
        const s = this.active;
        this.stance = stance;
        this.appendTroopId = 0;
        let troopId = 0;
        if (s) {
            if (stance === "defender") troopId = troopFor(s.attacker);        // fight the attacker
            else if (stance === "attacker") troopId = troopFor(s.defender);   // fight the defender
            else if (stance === "all") {                                      // fight both
                troopId = troopFor(s.attacker);
                this.appendTroopId = troopFor(s.defender);
            }
        }
        if (CFG.troopVar > 0) $gameVariables.setValue(CFG.troopVar, troopId);
        // Take over the battle outcome so FactionBorderWars' auto-influence
        // does not also fire for this fight.
        if (window.FactionWar) window.FactionWar._suppressBattleInfluence = stance !== "withdraw";
        if (stance === "withdraw") this.finish();
    };

    FS.resolve = function (result) {
        const s = this.active;
        if (!s) return;
        if (result === "win") this._applyWin();
        // On a loss/escape the war's original result simply stands.
        if (window.FactionWar) window.FactionWar._suppressBattleInfluence = false;
        this.finish();
    };

    FS._applyWin = function () {
        const s = this.active;
        const A = s.attacker, B = s.defender, R = s.regionId;
        const perm = CFG.permanent;
        if (this.stance === "defender") {
            // Liberate: region back to the defender; attacker's army broken.
            if ($gameFactionWar.setRegionOwner) $gameFactionWar.setRegionOwner(R, B);
            $gameFactionWar.reduceFactionStrength(A, CFG.strengthCut, perm);
            this._standing(B, +CFG.standingGain);
            this._standing(A, -CFG.standingLoss);
        } else if (this.stance === "attacker") {
            // Cement: region stays the attacker's; defender's army broken.
            $gameFactionWar.reduceFactionStrength(B, CFG.strengthCut, perm);
            this._standing(A, +CFG.standingGain);
            this._standing(B, -CFG.standingLoss);
        } else if (this.stance === "all") {
            // Shatter both, gut the region's defenses, optionally seize it.
            $gameFactionWar.reduceFactionStrength(A, CFG.strengthCut, perm);
            $gameFactionWar.reduceFactionStrength(B, CFG.strengthCut, perm);
            $gameFactionWar.reduceRegionDefense(R, CFG.defenseCutAll, perm);
            this._standing(A, -CFG.standingLoss);
            this._standing(B, -CFG.standingLoss);
            if (CFG.claimOnAll) this._seize(R);
        }
    };

    FS._seize = function (regionId) {
        const pf = hasWar() && $gameFactionWar.playerFactionId ? $gameFactionWar.playerFactionId() : "";
        if (pf && $gameFactionWar.setRegionOwner) $gameFactionWar.setRegionOwner(regionId, pf);
        if (hasVassals() && $gameVassalDomain.subjugateRegion) $gameVassalDomain.subjugateRegion(regionId);
    };

    FS._standing = function (factionId, delta) {
        if (delta === 0) return;
        if (hasRelationships()) $gameSystem.gainAffinity(factionId, delta);
    };

    FS.finish = function () {
        this.active = null;
        this.stance = "";
        this.appendTroopId = 0;
    };

    // Pick a side AND launch the battle right now, then apply the outcome when
    // it ends. This avoids any dependency on event-side Battle Processing /
    // troop-variable timing (which is what caused the "walk before it starts"
    // delay). Recommended path.
    FS.joinBattle = function (stance) {
        const s = this.active;
        this.stance = stance;
        this.appendTroopId = 0;
        if (!s || stance === "withdraw") {
            if (window.FactionWar) window.FactionWar._suppressBattleInfluence = false;
            this.finish();
            return;
        }
        let troopId = 0;
        if (stance === "defender") troopId = troopFor(s.attacker);
        else if (stance === "attacker") troopId = troopFor(s.defender);
        else if (stance === "all") { troopId = troopFor(s.attacker); this.appendTroopId = troopFor(s.defender); }

        if (!troopId || !$dataTroops[troopId]) {
            console.warn("FactionSkirmishes: no troop for this side; skipping battle.");
            if (window.FactionWar) window.FactionWar._suppressBattleInfluence = false;
            this.finish();
            return;
        }

        if (window.FactionWar) window.FactionWar._suppressBattleInfluence = true;
        this._skirmishBattle = true; // tells Game_Troop.setup to arrange/append

        BattleManager.setup(troopId, true, true); // canEscape, canLose
        BattleManager.setEventCallback((result) => {
            // 0 = victory, 1 = escape, 2 = defeat.
            FS.resolve(result === 0 ? "win" : "lose");
        });
        $gamePlayer.makeEncounterCount();
        SceneManager.push(Scene_Battle);
    };

    //=========================================================================
    // Hook FactionBorderWars: detect AI attack-captures, count war ticks
    //=========================================================================
    function setupWarHooks() {
        if (!hasWar()) return;
        const proto = Object.getPrototypeOf($gameFactionWar);
        if (!proto || proto._fsPatched) return;
        proto._fsPatched = true;

        // Flag the window during which the sim is resolving faction attacks,
        // so we only react to real "A took R from B" captures (not revolts,
        // not player influence, not neutral flips).
        if (typeof proto._resolveAttacks === "function") {
            const _resolve = proto._resolveAttacks;
            proto._resolveAttacks = function () {
                FS._duringAttack = true;
                _resolve.call(this);
                FS._duringAttack = false;
            };
        }
        if (typeof proto._captureRegion === "function") {
            const _capture = proto._captureRegion;
            proto._captureRegion = function (regionId, newOwnerId, oldOwnerId) {
                _capture.call(this, regionId, newOwnerId, oldOwnerId);
                if (FS._duringAttack && newOwnerId && oldOwnerId) {
                    if (Math.random() * 100 < CFG.chance) {
                        FS.queue(newOwnerId, oldOwnerId, regionId);
                    }
                }
            };
        }
        if (typeof proto._runOneTick === "function") {
            const _tick = proto._runOneTick;
            proto._runOneTick = function () {
                _tick.call(this);
                FS.onWarTick();
            };
        }
    }

    const _DM_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DM_createGameObjects.call(this);
        setupWarHooks();
    };
    const _DM_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DM_extractSaveContents.call(this, contents);
        setupWarHooks();
        FS.pending = null; FS.active = null; // don't resume a half-finished skirmish
    };

    //=========================================================================
    // Combine two armies for a "fight them all" + spread enemies out
    //=========================================================================
    const _GameTroop_setup = Game_Troop.prototype.setup;
    Game_Troop.prototype.setup = function (troopId) {
        _GameTroop_setup.call(this, troopId);
        // Only ever merge/rearrange during an actual skirmish battle, so a
        // stray random encounter can never inherit the appended army.
        if (FS._skirmishBattle) {
            if (FS.appendTroopId && $dataTroops[FS.appendTroopId]) {
                for (const member of $dataTroops[FS.appendTroopId].members) {
                    const enemy = new Game_Enemy(member.enemyId, member.x, member.y);
                    if (member.hidden) enemy.hide();
                    this._enemies.push(enemy);
                }
                this.makeUniqueNames();
            }
            if (CFG.autoArrange) arrangeEnemies(this._enemies);
        }
        FS.appendTroopId = 0;
        FS._skirmishBattle = false;
    };

    // Spread enemies across the battlefield on a tidy grid so their sprites
    // never stack — including the merged armies of a "fight them all".
    function arrangeEnemies(enemies) {
        const n = enemies.length;
        if (n <= 1) return;
        const W = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 816;
        const H = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 624;
        const cols = n <= 5 ? n : Math.max(2, Math.ceil(Math.sqrt(n * 1.7)));
        const rows = Math.ceil(n / cols);
        const xMin = Math.round(W * 0.16), xMax = Math.round(W * 0.84);
        const yMin = Math.round(H * 0.34), yMax = Math.round(H * 0.72);
        let i = 0;
        for (let r = 0; r < rows; r++) {
            const inRow = Math.min(cols, n - r * cols);
            for (let c = 0; c < inRow; c++) {
                const ex = inRow === 1 ? (xMin + xMax) / 2 : xMin + (xMax - xMin) * (c / (inRow - 1));
                const ey = rows === 1 ? (yMin + yMax) / 2 : yMin + (yMax - yMin) * (r / (rows - 1));
                // Stagger alternate rows so nothing lines up directly behind.
                const stagger = (r % 2 === 0) ? 0 : Math.round((xMax - xMin) / (inRow * 2 || 1));
                enemies[i]._screenX = Math.round(ex + stagger);
                enemies[i]._screenY = Math.round(ey);
                i++;
            }
        }
    }

    //=========================================================================
    // Present the skirmish when the overworld is idle
    //=========================================================================
    const _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _SceneMap_update.call(this);
        if (!FS.pending || FS.active) return;
        if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return;
        if (!$gamePlayer.canMove() || $gamePlayer.isMoving()) return;
        FS.trySpawn();
    };

    //=========================================================================
    // Plugin commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "showIntro", () => FS.showIntro());
    PluginManager.registerCommand(PLUGIN_NAME, "joinBattle", (args) => FS.joinBattle(String(args.stance || "defender")));
    PluginManager.registerCommand(PLUGIN_NAME, "setStance", (args) => FS.setStance(String(args.stance || "defender")));
    PluginManager.registerCommand(PLUGIN_NAME, "resolve", (args) => FS.resolve(String(args.result || "win")));
    PluginManager.registerCommand(PLUGIN_NAME, "forceSkirmish", (args) => {
        FS.queue(String(args.attacker || "").trim(), String(args.defender || "").trim(), num(args.regionId, 0));
    });
})();
