//=============================================================================
// AshenABS.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Action Battle System - swing in real time on the map, with attack animations, enemy AI, floating damage and on-screen health.
 * @author Ashen Keep
 *
 * @param attackKey
 * @text Attack Button
 * @type select
 * @option OK (Z / Enter / Space)
 * @value ok
 * @option Shift
 * @value shift
 * @option Page Down (W)
 * @value pagedown
 * @desc Button that swings your weapon. With OK, talking to an event always takes priority over attacking.
 * @default ok
 *
 * @param heavyKey
 * @text Heavy Attack Button
 * @type select
 * @option Page Down (W)
 * @value pagedown
 * @option Page Up (Q)
 * @value pageup
 * @option Control
 * @value control
 * @desc Slow, heavy swing. Big damage, breaks poise, knocks back.
 * @default pagedown
 *
 * @param dodgeKey
 * @text Dodge Button
 * @type select
 * @option Page Up (Q)
 * @value pageup
 * @option Page Down (W)
 * @value pagedown
 * @option Control
 * @value control
 * @desc Quick hop with invulnerability frames.
 * @default pageup
 *
 * @param wasdMovement
 * @text WASD Movement
 * @type boolean
 * @desc Remaps W/A/S/D to move. Arrow keys keep working too.
 * @default true
 *
 * @param mouseCombat
 * @text Mouse Combat
 * @type boolean
 * @desc Left click = light attack, right click = heavy. Disables click-to-move and the right-click menu.
 * @default true
 *
 * @param lightCooldown
 * @text Light Cooldown (frames)
 * @type number
 * @min 0
 * @desc Recovery after each light swing. Must be shorter than the combo window or the chain can never connect.
 * @default 46
 *
 * @param chainCooldown
 * @text Post-Combo Cooldown (frames)
 * @type number
 * @min 0
 * @desc Longer lockout after the 3rd hit of the chain lands.
 * @default 165
 *
 * @param heavyCooldown
 * @text Heavy Cooldown (frames)
 * @type number
 * @min 0
 * @desc Lockout after a heavy swing, so it cannot be spammed.
 * @default 360
 *
 * @param dodgeCooldown
 * @text Dodge Cooldown (frames)
 * @type number
 * @min 0
 * @default 155
 *
 * @param noDash
 * @text Disable Shift-Run
 * @type boolean
 * @desc Removes the sprint speed bonus entirely (Shift and the "Always Dash" option both stop affecting speed).
 * @default true
 *
 * @param showControls
 * @text Show Control Panel
 * @type boolean
 * @desc On-screen control list with live cooldown meters, right-hand side.
 * @default true
 *
 * @param comboWindow
 * @text Combo Window (frames)
 * @type number
 * @min 10
 * @desc How long after a light hit you may chain the next one. Keep above Light Cooldown.
 * @default 75
 *
 * @param dodgeIFrames
 * @text Dodge I-Frames
 * @type number
 * @min 0
 * @default 34
 *
 * @param hitstop
 * @text Hit Stop (frames)
 * @type number
 * @min 0
 * @desc Everything freezes briefly on a solid hit. Sells the impact.
 * @default 4
 *
 * @param attackAnimation
 * @text Player Attack Animation
 * @type animation
 * @default 6
 *
 * @param enemyAttackAnimation
 * @text Enemy Attack Animation
 * @type animation
 * @default 1
 *
 * @param attackCooldown
 * @text Player Swing Cooldown (frames)
 * @type number
 * @min 6
 * @default 26
 *
 * @param attackRange
 * @text Player Reach (tiles)
 * @type number
 * @min 1
 * @default 1
 *
 * @param enemyAttackCooldown
 * @text Enemy Attack Cooldown (frames)
 * @type number
 * @min 10
 * @default 90
 *
 * @param aggroRange
 * @text Default Aggro Range (tiles)
 * @type number
 * @min 1
 * @default 6
 *
 * @param allyAtkShare
 * @text Ally Attack Contribution
 * @desc Fraction of each non-leader party member's ATK added to your swing. 0.3 = 30%.
 * @default 0.3
 *
 * @param allyDefShare
 * @text Ally Defence Contribution
 * @default 0.2
 *
 * @param allyCombat
 * @text Allies Fight
 * @type boolean
 * @default true
 * @desc ON: party members break formation, attack enemies on their own, take hits and can be killed.
 *
 * @param allyAggro
 * @text Ally Engage Range
 * @type number
 * @min 1
 * @default 5
 * @desc How far (tiles) an ally will look for an enemy to attack.
 *
 * @param allyLeash
 * @text Ally Leash
 * @type number
 * @min 2
 * @default 7
 * @desc If an ally gets further than this from Reid it breaks off and returns to formation.
 *
 * @param allyPower
 * @text Ally Attack Power
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.75
 * @desc Multiplier on an ally's own ATK when it swings. 1.0 = as strong as its raw ATK.
 *
 * @param allyAtkCd
 * @text Ally Attack Cooldown
 * @type number
 * @min 1
 * @default 234
 * @desc Frames between an ally's light attacks. 234 = about 3.9s, deliberately slow so three allies don't strobe the screen.
 *
 * @param allyStep
 * @text Ally Step Delay
 * @type number
 * @min 0
 * @default 6
 * @desc Frames between an ally's steps while closing on an enemy.
 *
 * @param allyInvuln
 * @text Ally I-Frames
 * @type number
 * @min 0
 * @default 40
 * @desc Frames an ally is immune after being hit.
 *
 * @param allyHpRate
 * @text Ally Toughness
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 1.00
 * @desc Scales damage dealt TO allies. Below 1 makes them last longer as a shield.
 *
 * @param allyBars
 * @text Ally Health Bars
 * @type boolean
 * @default true
 * @desc Show a small health bar above each living ally.
 *
 * @param allyLevelSync
 * @text Allies Track Reid's Level
 * @type boolean
 * @default true
 * @desc ON: companions sit a fixed number of levels below Reid and rise with him. They stop earning their own EXP.
 *
 * @param allyLevelGap
 * @text Levels Below Reid
 * @type number
 * @min 1
 * @default 1
 * @desc How far below Reid a companion sits. Never drops below level 1.
 *
 * @param allyHpCap
 * @text Ally Max HP Cap
 * @type number
 * @decimals 2
 * @min 0.10
 * @max 1.00
 * @default 0.75
 * @desc Ceiling on a companion's max HP as a fraction of Reid's. Michelle's class out-scales Reid's HP curve without this.
 *
 * @param invulnFrames
 * @text Player I-Frames
 * @type number
 * @min 0
 * @default 45
 *
 * @param clearSwitch
 * @text "Area Cleared" Switch
 * @type switch
 * @desc Turned ON while no living ABS enemy remains on the current map. Use it to lock exits.
 * @default 13
 *
 * @param remainVar
 * @text "Enemies Remaining" Variable
 * @type variable
 * @desc Holds how many ABS enemies are still alive on this map.
 * @default 6
 *
 * @param clearHpBonus
 * @text Vigour per Area Cleared
 * @type number
 * @min 0
 * @desc Permanent Max HP granted to the whole party the first time an area is cleared. 0 disables.
 * @default 100
 *
 * @param clearCommonEvent
 * @text Area-Cleared Common Event
 * @type common_event
 * @desc Runs once the first time each area is cleared (use it for the "Grace returns" message). 0 = none.
 * @default 3
 *
 * @param clearGainVar
 * @text Vigour Gained Variable
 * @type variable
 * @desc Set to the Max HP just gained, so the common event can print it with \V[n].
 * @default 7
 *
 * @param showHud
 * @text Show Health HUD
 * @type boolean
 * @default true
 *
 * @param hitSe
 * @text Hit Sound
 * @type file
 * @dir audio/se/
 * @default Sword2
 *
 * @param swingSe
 * @text Swing Sound
 * @type file
 * @dir audio/se/
 * @default Wind7
 *
 * @param hurtSe
 * @text Player Hurt Sound
 * @type file
 * @dir audio/se/
 * @default Damage1
 *
 * @command healParty
 * @text Heal Party
 * @desc Restores HP to the party. Amount 0 = full restore.
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @default 0
 *
 * @help
 * ============================================================================
 * Ashen ABS - action combat on the map
 * ============================================================================
 * Combat happens where you are standing. No battle scene, no command menu.
 *
 * MAKING AN ENEMY
 * Put this in a map event's Note box:
 *
 *     <ABS: 1>              enemy id from the database
 *     <ABSBoss>             optional - wider health bar, immune to knockback
 *     <ABSAggro: 8>         optional - chase range in tiles
 *     <ABSDeathSwitch: 9>   optional - switch turned ON when it dies
 *     <ABSDeathCommon: 1>   optional - common event run when it dies
 *
 * The event should have a graphic, Priority "Same as characters", and
 * Trigger "Action Button" with an empty command list.
 *
 * CONTROLS
 *   Attack ...... the button set above (default Z / Enter / Space)
 *   Talking to an NPC or opening a chest always wins over swinging, so you
 *   never accidentally hit a shopkeeper.
 *
 * DAMAGE
 *   your hit   = (ATK - enemy DEF * 0.8), min 1, +/-15%, 10% crit for x2
 *   their hit  = (enemy ATK * 1.5 - your DEF * 1.2), min 1, +/-15%
 *   Party members who are not the leader lend a share of their ATK and DEF.
 *
 * Enemies scale with the same notetags EvolvingEnemyPowerscaling uses
 * (<RefLevel: n>, <MaxStatMult: x>) so the two stay consistent.
 *
 * If the party leader hits 0 HP, it is game over.
 *
 * LEVEL LOCKS
 * While any ABS enemy is still alive on the map, the "Area Cleared" switch is
 * OFF and the "Enemies Remaining" variable holds the count. Put a Conditional
 * Branch on that switch in front of an exit and the player cannot leave until
 * the area is cleared. Both update on map load and the instant an enemy dies.
 * Kills are remembered per event (self switch D), so a cleared area stays
 * cleared if the player walks back through it.
 *
 * VIGOUR
 * The first time each area is cleared the whole party gains permanent Max HP
 * and is fully healed - the keep giving back what it took. Once per area, and
 * it is remembered in the save.
 * ============================================================================
 */

(() => {
"use strict";
const PN = "AshenABS";
const P  = PluginManager.parameters(PN);
const numOf = (v, d) => (isNaN(Number(v)) ? d : Number(v));

const CFG = {
    key:        String(P.attackKey || "ok"),
    anim:       numOf(P.attackAnimation, 6),
    eAnim:      numOf(P.enemyAttackAnimation, 1),
    cd:         numOf(P.attackCooldown, 26),
    range:      numOf(P.attackRange, 1),
    eCd:        numOf(P.enemyAttackCooldown, 90),
    aggro:      numOf(P.aggroRange, 6),
    allyAtk:    numOf(P.allyAtkShare, 0.3),
    allyDef:    numOf(P.allyDefShare, 0.2),
    allyOn:     String(P.allyCombat) !== "false",
    allyAggro:  numOf(P.allyAggro, 5),
    allyLeash:  numOf(P.allyLeash, 7),
    allyPower:  numOf(P.allyPower, 0.75),
    allyAtkCd:  numOf(P.allyAtkCd, 234),
    allyStep:   numOf(P.allyStep, 6),
    allyInv:    numOf(P.allyInvuln, 40),
    allyHpRate: numOf(P.allyHpRate, 1.0),
    allyBars:   String(P.allyBars) !== "false",
    allyLvSync: String(P.allyLevelSync) !== "false",
    allyLvGap:  Math.max(1, numOf(P.allyLevelGap, 1)),
    allyHpCap:  Math.min(1, Math.max(0.1, numOf(P.allyHpCap, 0.75))),
    invuln:     numOf(P.invulnFrames, 45),
    hud:        String(P.showHud) !== "false",
    clearSw:    numOf(P.clearSwitch, 13),
    remainVar:  numOf(P.remainVar, 6),
    clearHp:    numOf(P.clearHpBonus, 100),
    clearCE:    numOf(P.clearCommonEvent, 3),
    clearVar:   numOf(P.clearGainVar, 7),
    heavyKey:   String(P.heavyKey || "pagedown"),
    dodgeKey:   String(P.dodgeKey || "pageup"),
    comboWin:   numOf(P.comboWindow, 75),
    dodgeIF:    numOf(P.dodgeIFrames, 34),
    hitstop:    numOf(P.hitstop, 4),
    wasd:       String(P.wasdMovement) !== "false",
    mouse:      String(P.mouseCombat)  !== "false",
    lightCd:    numOf(P.lightCooldown, 46),
    chainCd:    numOf(P.chainCooldown, 165),
    heavyCd:    numOf(P.heavyCooldown, 360),
    dodgeCd:    numOf(P.dodgeCooldown, 155),
    controls:   String(P.showControls) !== "false",
    noDash:     String(P.noDash)       !== "false",
    hitSe:      String(P.hitSe || "Sword2"),
    swingSe:    String(P.swingSe || "Wind7"),
    hurtSe:     String(P.hurtSe || "Damage1")
};

const ABS = {};
window.AshenABS = ABS;
ABS.freeze = 0;                    // global hit-stop

// ---------------------------------------------------------------------------
// Controls: WASD to move, mouse to fight. Arrows/Z/X keep working.
// ---------------------------------------------------------------------------
if (CFG_WASD()) {
    Input.keyMapper[87] = "up";     // W
    Input.keyMapper[83] = "down";   // S
    Input.keyMapper[65] = "left";   // A
    Input.keyMapper[68] = "right";  // D
    Input.keyMapper[81] = "pageup"; // Q - dodge
}
function CFG_WASD() { return String(PluginManager.parameters(PN).wasdMovement) !== "false"; }

// ---------------------------------------------------------------------------
// Enemy archetypes. <ABSAI: name> on the event picks one.
//   reach      how far it can strike
//   keepAt     distance it wants to sit at (skirmishers back off)
//   step       frames between steps while closing
//   windup     telegraph length before the blow lands  (your window to react)
//   recover    frames it is helpless after swinging    (your window to punish)
//   poise      how much poise damage it absorbs before staggering
//   guard      chance to raise a guard instead of idling
//   evade      chance to hop away from an incoming light hit
// ---------------------------------------------------------------------------
const ARCH = {
    brawler: { reach:1, keepAt:0, step:7,  windup:26, recover:26, poise:34,
               guard:0.00, evade:0.00, dmg:1.00, anim:1,  se:"Blow1",  tell:"#ff8a5c" },
    guard:   { reach:1, keepAt:0, step:13, windup:42, recover:44, poise:80,
               guard:0.55, evade:0.00, dmg:1.25, anim:39, se:"Blow3",  tell:"#ffd166" },
    skirmisher:{ reach:1, keepAt:3, step:5, windup:18, recover:34, poise:22,
               guard:0.00, evade:0.35, dmg:0.85, anim:16, se:"Slash4", tell:"#7ef0d0" },
    lurker:  { reach:1, keepAt:0, step:6,  windup:14, recover:38, poise:28,
               guard:0.00, evade:0.15, dmg:1.35, anim:11, se:"Slash2", tell:"#c58cff" }
};

// Player attack chain. Light chains 1-2-3; the finisher and the heavy break poise.
const MOVES = {
    light1: { dmg:0.80, poise:12, anim:6,  se:"Sword1", cd:20, knock:0, stop:3, label:null },
    light2: { dmg:0.90, poise:14, anim:7,  se:"Sword2", cd:22, knock:0, stop:3, label:null },
    light3: { dmg:1.45, poise:30, anim:23, se:"Sword4", cd:34, knock:1, stop:7, label:null },
    heavy:  { dmg:2.10, poise:55, anim:25, se:"Blow4",  cd:52, knock:2, stop:11, label:"HEAVY", windup:16 }
};

//---------------------------------------------------------------------------
// helpers
//---------------------------------------------------------------------------
function tagNum(note, tag, def) {
    const m = note && note.match(new RegExp("<" + tag + ":\\s*(-?\\d+(?:\\.\\d+)?)\\s*>", "i"));
    return m ? Number(m[1]) : def;
}
function tagOn(note, tag) {
    return !!(note && note.match(new RegExp("<" + tag + ">", "i")));
}
function partyLevel() {
    const m = $gameParty.members();
    return m.length ? Math.max(...m.map(a => a.level)) : 1;
}
// Only living allies lend their strength. Once an ally goes down, Reid feels it.
function playerAtk() {
    const ms = $gameParty.members();
    if (!ms.length) return 1;
    let v = ms[0].atk;
    for (let i = 1; i < ms.length; i++) if (ms[i].hp > 0) v += ms[i].atk * CFG.allyAtk;
    return v;
}
function playerDef() {
    const ms = $gameParty.members();
    if (!ms.length) return 1;
    let v = ms[0].def;
    for (let i = 1; i < ms.length; i++) if (ms[i].hp > 0) v += ms[i].def * CFG.allyDef;
    return v;
}

// ---------------------------------------------------------------------------
// Targets: Reid and every ally still standing are all valid things to hit
// ---------------------------------------------------------------------------
function allyFollowers() {
    if (!CFG.allyOn || !$gamePlayer) return [];
    const fs = $gamePlayer.followers();
    const out = [];
    for (let i = 0; i < 4; i++) {
        const f = fs.follower(i);
        if (f && f.absAlive && f.absAlive()) out.push(f);
    }
    return out;
}

function absCombatants() {
    return [$gamePlayer].concat(allyFollowers());
}

/** Defence of whoever is being hit - an ally defends with its own stats.
 *  Scaled down on purpose: at full DEF a heavy ally (Michelle, DEF 40) sits
 *  above every early enemy's attack and takes the minimum 1 damage forever,
 *  which would make her an immortal wall instead of a shield that wears out. */
const ALLY_DEF_SCALE = 0.6;
function absDefOf(target) {
    if (!target || target === $gamePlayer) return playerDef();
    const a = target.actor && target.actor();
    return a ? a.def * ALLY_DEF_SCALE : playerDef();
}

function chebyshev(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** 0..1 readiness of a party member's next swing. 1 = ready.
 *  index 0 is the leader, whose meter is the light-chain one on the control
 *  panel; 1+ are the allies. */
function memberCdRate(index) {
    if (index === 0) {
        return $gamePlayer
            ? Math.max(0, 1 - $gamePlayer.absLightCd / Math.max(1, CFG.chainCd)) : 1;
    }
    const f = $gamePlayer && $gamePlayer.followers().follower(index - 1);
    if (!f || !f.absAlive || !f.absAlive()) return 0;
    return Math.max(0, 1 - (f._absCd || 0) / Math.max(1, CFG.allyAtkCd));
}
function vary(n) { return Math.max(1, Math.round(n * (0.85 + Math.random() * 0.3))); }

//---------------------------------------------------------------------------
// ABS data attached to map events
//---------------------------------------------------------------------------
//--- durable wound ledger ---------------------------------------------------
// Enemy HP lives on the Game_Event, and Game_Map rebuilds every event from
// scratch whenever a map is set up again - re-entering a map, or loading a
// save that was made by an earlier build of the project. Without a ledger the
// wounded enemy the player walked away from quietly heals to full. Deaths
// already survive via self-switch "D"; this does the same job for wounds.
ABS.woundKey = function(ev) { return ev._mapId + ":" + ev._eventId; };

ABS.recordWound = function(ev) {
    if (!$gameSystem || !ev || !ev._abs) return;
    const led = ($gameSystem._absWounds = $gameSystem._absWounds || {});
    const a = ev._abs, k = ABS.woundKey(ev);
    if (a.dead || a.hp >= a.mhp) delete led[k];
    else led[k] = { hp: a.hp, mhp: a.mhp, poise: a.poise, phase: a.phase };
};

ABS.forgetWound = function(ev) {
    const led = $gameSystem && $gameSystem._absWounds;
    if (led) delete led[ABS.woundKey(ev)];
};

ABS.readWound = function(ev) {
    const led = $gameSystem && $gameSystem._absWounds;
    return led ? led[ABS.woundKey(ev)] : null;
};

const _GE_init = Game_Event.prototype.initialize;
Game_Event.prototype.initialize = function(mapId, eventId) {
    _GE_init.call(this, mapId, eventId);
    this.absSetup();
};

Game_Event.prototype.absSetup = function() {
    this._abs = null;
    const ev = this.event();
    if (!ev) return;
    const note = ev.note || "";
    const id = tagNum(note, "ABS", 0);
    if (!id || !$dataEnemies[id]) return;

    this._absTagged = true;

    // already killed on a previous visit? stay dead.
    if ($gameSelfSwitches && $gameSelfSwitches.value([this._mapId, this._eventId, "D"])) {
        this.erase();
        return;
    }

    const db = $dataEnemies[id];
    // same sub-linear curve EvolvingEnemyPowerscaling uses
    const ref  = tagNum(db.note, "RefLevel", 1);
    const cap  = tagNum(db.note, "MaxStatMult", 3.0);
    const over = Math.max(0, partyLevel() - ref);
    const mult = Math.min(cap, 1 + Math.pow(over * 0.06, 0.75));

    const aiName = (note.match(/<ABSAI:\s*(\w+)\s*>/i) || [])[1];
    const boss   = tagOn(note, "ABSBoss");
    const arch   = ARCH[(aiName || "").toLowerCase()] || (boss ? ARCH.guard : ARCH.brawler);

    this._abs = {
        enemyId: id,
        name: db.name,
        mhp: Math.max(1, Math.round(db.params[0] * mult)),
        hp:  Math.max(1, Math.round(db.params[0] * mult)),
        atk: Math.max(1, Math.round(db.params[2] * mult)),
        def: Math.max(0, Math.round(db.params[3] * mult)),
        exp: Math.round(db.exp * mult),
        gold: Math.round(db.gold * mult),
        drops: db.dropItems || [],
        boss: boss,
        ai: aiName ? aiName.toLowerCase() : (boss ? "boss" : "brawler"),
        arch: arch,
        aggro: tagNum(note, "ABSAggro", CFG.aggro),
        deathSwitch: tagNum(note, "ABSDeathSwitch", 0),
        deathCommon: tagNum(note, "ABSDeathCommon", 0),
        // combat state machine
        state: "idle", t: 0, stepT: 0,
        poise: arch.poise, poiseMax: arch.poise,
        flash: 0, tell: 0,
        phase: 1, move: null, moveIdx: 0,
        cd: Math.floor(Math.random() * 30),
        dead: false
    };

    // this one was already bleeding when the player last saw it - keep it that
    // way, and keep the max HP it was shown so the bar does not jump.
    const w = ABS.readWound(this);
    if (w) {
        this._abs.mhp = Math.max(1, w.mhp);
        this._abs.hp = Math.max(1, Math.min(w.hp, this._abs.mhp));
        if (w.poise !== undefined) this._abs.poise = w.poise;
        if (w.phase !== undefined) this._abs.phase = w.phase;
    }
};

Game_Event.prototype.absAlive = function() {
    return !!this._abs && !this._abs.dead && !this._erased;
};

//---------------------------------------------------------------------------
// enemy behaviour
//---------------------------------------------------------------------------
const _GE_update = Game_Event.prototype.update;
Game_Event.prototype.update = function() {
    _GE_update.call(this);
    if (this.absAlive()) this.absUpdate();
};

// --- targeting -------------------------------------------------------------
// An enemy fights whoever is closest. Allies therefore genuinely soak aggro
// instead of the player being the only thing worth attacking.
Game_Event.prototype.absTarget = function() {
    const a = this._abs;
    if (!a) return $gamePlayer;
    if (!CFG.allyOn) return $gamePlayer;
    const cands = absCombatants();
    let best = a.tgt && cands.includes(a.tgt) ? a.tgt : null;
    // stickiness: only switch if something else is meaningfully closer, so
    // enemies don't jitter between two targets standing side by side
    let bestD = best ? chebyshev(this, best) - 0.75 : Infinity;
    for (const c of cands) {
        const d = chebyshev(this, c);
        if (d < bestD) { best = c; bestD = d; }
    }
    a.tgt = best || $gamePlayer;
    return a.tgt;
};

Game_Event.prototype.absDist = function() {
    const t = this.absTarget();
    return Math.max(Math.abs(t.x - this.x), Math.abs(t.y - this.y));
};

// The enemy AI is written in terms of "the player"; point those at the target.
// Guarded by _abs so ordinary event move routes are untouched.
const _GE_turnTowardPlayer = Game_Event.prototype.turnTowardPlayer;
Game_Event.prototype.turnTowardPlayer = function() {
    if (this._abs && CFG.allyOn) return this.turnTowardCharacter(this.absTarget());
    _GE_turnTowardPlayer.call(this);
};
const _GE_moveTowardPlayer = Game_Event.prototype.moveTowardPlayer;
Game_Event.prototype.moveTowardPlayer = function() {
    if (this._abs && CFG.allyOn) return this.moveTowardCharacter(this.absTarget());
    _GE_moveTowardPlayer.call(this);
};
const _GE_moveAwayFromPlayer = Game_Event.prototype.moveAwayFromPlayer;
Game_Event.prototype.moveAwayFromPlayer = function() {
    if (this._abs && CFG.allyOn) {
        const t = this._abs.lastHitBy || this.absTarget();
        return this.moveAwayFromCharacter(t);
    }
    _GE_moveAwayFromPlayer.call(this);
};

Game_Event.prototype.absSetState = function(st, frames) {
    this._abs.state = st; this._abs.t = frames || 0;
};

Game_Event.prototype.absUpdate = function() {
    const a = this._abs;
    if (a.flash > 0) a.flash--;
    if (ABS.freeze > 0) return;                       // hit-stop freezes everyone
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return;
    if (a.t > 0) a.t--;
    if (a.stepT > 0) a.stepT--;

    if (a.boss) return this.absBossUpdate();

    const A = a.arch, dist = this.absDist();

    switch (a.state) {
    case "stagger":                                   // helpless - punish window
        if (a.t <= 0) { a.poise = a.poiseMax; this.absSetState("idle", 10); }
        return;

    case "block":                                     // guard held up
        this.turnTowardPlayer();
        if (a.t <= 0) this.absSetState("idle", 8);
        return;

    case "windup":                                    // telegraphed - react now
        this.turnTowardPlayer();
        a.tell = 2;
        if (a.t <= 0) {
            this.absStrike();
            this.absSetState("recover", A.recover);
        }
        return;

    case "recover":                                   // vulnerable after swinging
        if (a.t <= 0) {
            if (A.keepAt > 0) this.absSetState("reposition", 26);
            else if (Math.random() < A.guard) this.absSetState("block", 50);
            else this.absSetState("idle", 6);
        }
        return;

    case "reposition":                                // skirmishers back off
        if (a.t <= 0 || dist >= A.keepAt) { this.absSetState("idle", 6); return; }
        if (!this.isMoving() && a.stepT <= 0) {
            this.moveAwayFromPlayer(); a.stepT = A.step;
        }
        return;

    default:                                          // idle / closing in
        if (dist > a.aggro) return;
        this.turnTowardPlayer();
        if (dist <= A.reach) {
            if (a.cd > 0) { a.cd--; return; }
            this.absSetState("windup", A.windup);
            a.cd = CFG.eCd;
        } else if (A.keepAt > 0 && dist < A.keepAt - 1) {
            this.absSetState("reposition", 20);
        } else if (!this.isMoving() && a.stepT <= 0) {
            this.moveTowardPlayer(); a.stepT = A.step;
        }
    }
};

// ---------------------------------------------------------------------------
// Boss: pattern-driven, two phases, telegraphed openings
// ---------------------------------------------------------------------------
const BOSS_MOVES = {
    slam:   { windup:46, recover:44, reach:1, arc:"front", dmg:1.70, anim:39, se:"Blow5",   tell:"#ff5d5d", shake:7 },
    sweep:  { windup:58, recover:52, reach:1, arc:"all",   dmg:1.25, anim:38, se:"Blow7",   tell:"#ffd166", shake:5 },
    lunge:  { windup:40, recover:56, reach:4, arc:"dash",  dmg:1.95, anim:11, se:"Slash6",  tell:"#c58cff", shake:9 },
    roar:   { windup:34, recover:40, reach:0, arc:"none",  dmg:0.00, anim:37, se:"Monster4",tell:"#ffffff", shake:12 }
};

Game_Event.prototype.absBossUpdate = function() {
    const a = this._abs, dist = this.absDist();

    // phase change at half health
    if (a.phase === 1 && a.hp <= a.mhp * 0.5 && a.state !== "windup") {
        a.phase = 2; a.move = "roar";
        this.absSetState("windup", BOSS_MOVES.roar.windup);
        ABS.popup(this, "PHASE II", "info");
        return;
    }

    switch (a.state) {
    case "stagger":
        if (a.t <= 0) { a.poise = a.poiseMax; this.absSetState("idle", 20); }
        return;

    case "windup": {
        const M = BOSS_MOVES[a.move];
        a.tell = 2;
        if (a.move !== "lunge") this.turnTowardPlayer();
        if (a.t <= 0) {
            this.absBossStrike(a.move);
            this.absSetState("recover", Math.round(M.recover * (a.phase === 2 ? 0.75 : 1)));
        }
        return;
    }
    case "recover":
        if (a.t <= 0) this.absSetState("idle", 14);
        return;

    default: {
        if (dist > a.aggro) return;
        this.turnTowardPlayer();
        if (a.cd > 0) { a.cd--; return; }
        // choose a move that suits the range
        const rota = a.phase === 1 ? ["slam","sweep","slam","lunge"]
                                   : ["slam","lunge","sweep","lunge","slam"];
        let pick = null;
        for (let i = 0; i < rota.length; i++) {
            const cand = rota[(a.moveIdx + i) % rota.length];
            const M = BOSS_MOVES[cand];
            if (dist <= M.reach) { pick = cand; a.moveIdx = (a.moveIdx + i + 1) % rota.length; break; }
        }
        if (!pick) {                                  // out of range - close in
            if (!this.isMoving() && a.stepT <= 0) { this.moveTowardPlayer(); a.stepT = 9; }
            return;
        }
        a.move = pick;
        const M = BOSS_MOVES[pick];
        this.absSetState("windup", Math.round(M.windup * (a.phase === 2 ? 0.7 : 1)));
        a.cd = Math.round(CFG.eCd * (a.phase === 2 ? 0.6 : 0.9));
    }
    }
};

Game_Event.prototype.absBossStrike = function(name) {
    const a = this._abs, M = BOSS_MOVES[name];
    AudioManager.playSe({ name: M.se, volume: 90, pitch: 100, pan: 0 });
    $gameScreen.startShake(M.shake, 9, 20);

    if (name === "roar") {
        $gameTemp.requestAnimation([this], M.anim);
        a.atk = Math.round(a.atk * 1.25);
        $gameScreen.startFlash([255, 90, 60, 140], 40);
        return;
    }
    const tgt = this.absTarget();
    if (name === "lunge") {                            // close the gap, then hit
        for (let i = 0; i < 3; i++) {
            if (this.absDist() <= 1) break;
            const d = this.findDirectionTo(tgt.x, tgt.y);
            if (d > 0 && this.canPass(this.x, this.y, d)) this.moveStraight(d); else break;
        }
    }
    $gameTemp.requestAnimation([this], M.anim);
    // a sweep catches everything adjacent - allies included
    const victims = (name === "sweep")
        ? absCombatants().filter(c => chebyshev(this, c) <= 1)
        : (this.absDist() <= 1 && this.absFacingChar(tgt) ? [tgt] : []);
    for (const v of victims) {
        v.absTakeDamage(vary(Math.max(1, a.atk * M.dmg * 1.5 - absDefOf(v) * 1.2)), this);
    }
};

Game_Event.prototype.absFacingChar = function(c) {
    const dx = c.x - this.x, dy = c.y - this.y, d = this.direction();
    if (d === 2) return dy >= 0; if (d === 8) return dy <= 0;
    if (d === 4) return dx <= 0; return dx >= 0;
};
Game_Event.prototype.absFacingPlayer = function() {
    return this.absFacingChar(this.absTarget());
};

Game_Event.prototype.absStrike = function() {
    const a = this._abs, A = a.arch;
    const t = this.absTarget();
    AudioManager.playSe({ name: A.se, volume: 80, pitch: 95 + Math.randomInt(15), pan: 0 });
    $gameTemp.requestAnimation([this], A.anim);
    if (this.absDist() <= A.reach && this.absFacingChar(t)) {
        t.absTakeDamage(vary(Math.max(1, a.atk * A.dmg * 1.5 - absDefOf(t) * 1.2)), this);
    }
};

Game_Event.prototype.absAttackPlayer = function() {   // kept for compatibility
    this.absStrike();
};

// ---------------------------------------------------------------------------
// Hit reactions - what happens depends on the blow and on what it hits
// ---------------------------------------------------------------------------
Game_Event.prototype.absTakeDamage = function(dmg, crit, move, attacker) {
    const a = this._abs, M = move || MOVES.light1;
    a.lastHitBy = attacker || $gamePlayer;   // reactions point at whoever swung

    // guarding: soak it, no poise loss, no reaction
    if (a.state === "block" && this.absFacingChar(a.lastHitBy)) {
        const soaked = Math.max(1, Math.round(dmg * 0.25));
        a.hp -= soaked;
        a.flash = 8;
        ABS.popup(this, "GUARD", "info");
        ABS.popup(this, soaked, "enemy");
        AudioManager.playSe({ name: "Evasion1", volume: 80, pitch: 110, pan: 0 });
        if (a.hp <= 0) this.absDie(); else ABS.recordWound(this);
        return;
    }

    // light-footed enemies can slip a light swing
    if (!a.boss && a.state !== "stagger" && M.poise < 25 && Math.random() < a.arch.evade) {
        ABS.popup(this, "MISS", "info");
        AudioManager.playSe({ name: "Evasion2", volume: 70, pitch: 120, pan: 0 });
        if (!this.isMoving()) this.moveAwayFromPlayer();
        return;
    }

    // staggered enemies take extra punishment
    if (a.state === "stagger") dmg = Math.round(dmg * 1.5);

    a.hp -= dmg;
    a.flash = 12;
    ABS.popup(this, dmg, crit ? "crit" : "enemy");
    AudioManager.playSe({ name: CFG.hitSe, volume: 80, pitch: 100 + Math.randomInt(20), pan: 0 });
    ABS.freeze = Math.max(ABS.freeze, M.stop || CFG.hitstop);
    $gameScreen.startShake(Math.min(6, 1 + Math.floor((M.poise || 10) / 12)), 8, 10);

    if (a.hp <= 0) { this.absDie(); return; }
    ABS.recordWound(this);

    // poise: enough punishment breaks their stance
    a.poise -= (M.poise || 10);
    if (a.poise <= 0) {
        a.poise = 0;
        this.absSetState("stagger", a.boss ? 90 : 110);
        ABS.popup(this, "STAGGER!", "info");
        AudioManager.playSe({ name: "Paralyze1", volume: 85, pitch: 90, pan: 0 });
        $gameTemp.requestAnimation([this], 21);
        if (!a.boss && !this.isMoving()) this.absKnock(1);
        return;
    }

    // otherwise react in proportion to the blow
    if (M.knock > 0 && !a.boss) {
        this.absKnock(M.knock);
        this.absSetState("recover", 22);        // knocked out of whatever it was doing
    } else if (a.state === "windup") {
        this.absSetState("windup", Math.max(a.t, 6));   // flinch: telegraph continues
    }
};

Game_Event.prototype.absKnock = function(tiles) {
    const src = (this._abs && this._abs.lastHitBy) || $gamePlayer;
    const d = src.direction();
    for (let i = 0; i < tiles; i++) {
        if (this.isMoving() || !this.canPass(this.x, this.y, d)) break;
        this.moveStraight(d);
    }
};

Game_Event.prototype.absDie = function() {
    const a = this._abs;
    a.dead = true;
    AudioManager.playSe({ name: "Collapse1", volume: 80, pitch: 100, pan: 0 });
    $gameParty.allMembers().forEach(m => m.gainExp(a.exp));
    $gameParty.gainGold(a.gold);
    for (const d of a.drops) {
        if (!d || d.kind === 0 || d.dataId <= 0) continue;
        if (Math.random() * d.denominator < 1) {
            const db = d.kind === 1 ? $dataItems : d.kind === 2 ? $dataWeapons : $dataArmors;
            if (db[d.dataId]) $gameParty.gainItem(db[d.dataId], 1);
        }
    }
    ABS.forgetWound(this);
    $gameSelfSwitches.setValue([this._mapId, this._eventId, "D"], true);
    if (a.deathSwitch > 0) $gameSwitches.setValue(a.deathSwitch, true);
    if (a.deathCommon > 0) $gameTemp.reserveCommonEvent(a.deathCommon);
    this.erase();
    ABS.refreshClear();
};

//---------------------------------------------------------------------------
// area-clear tracking - drives the level locks
//---------------------------------------------------------------------------
ABS.aliveCount = function() {
    if (!$gameMap || !$gameMap.events) return 0;
    return $gameMap.events().filter(e => e.absAlive && e.absAlive()).length;
};

ABS.taggedCount = function() {
    if (!$gameMap || !$gameMap.events) return 0;
    return $gameMap.events().filter(e => e._absTagged).length;
};

// Reclaiming an area gives back a measure of the keep's Grace: permanent
// Max HP for the whole party, and a full heal. Once per area, ever.
ABS.grantClearReward = function() {
    const id = $gameMap.mapId();
    if (!$gameSystem._absCleared) $gameSystem._absCleared = [];
    if ($gameSystem._absCleared.includes(id)) return;
    $gameSystem._absCleared.push(id);
    if (CFG.clearHp > 0) {
        for (const a of $gameParty.allMembers()) {
            a.addParam(0, CFG.clearHp);      // permanent Max HP
            a.setHp(a.mhp); a.setMp(a.mmp);  // and a full heal
        }
    }
    if (CFG.clearVar > 0) $gameVariables.setValue(CFG.clearVar, CFG.clearHp);
    if (CFG.clearCE  > 0) $gameTemp.reserveCommonEvent(CFG.clearCE);
};

ABS.refreshClear = function() {
    if (!$gameVariables || !$gameSwitches || !$gameSystem) return;
    const alive  = ABS.aliveCount();
    const tagged = ABS.taggedCount();
    if (CFG.remainVar > 0) $gameVariables.setValue(CFG.remainVar, alive);
    if (CFG.clearSw   > 0) $gameSwitches.setValue(CFG.clearSw, alive === 0);
    // only an area that actually HAD enemies can be "reclaimed"
    if (tagged > 0 && alive === 0) ABS.grantClearReward();
};

const _GM_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
    _GM_setup.call(this, mapId);
    ABS.refreshClear();
};

//---------------------------------------------------------------------------
// player attack
//---------------------------------------------------------------------------
const _GP_init = Game_Player.prototype.initMembers;
Game_Player.prototype.initMembers = function() {
    _GP_init.call(this);
    this.absCd = 0;
    this.absInvuln = 0;
    this.absCombo = 0;
    this.absComboT = 0;
    this.absHeavyCd = 0;
    this.absDodgeCd = 0;
    this.absLightCd = 0;
    this.absWindup = 0;
    this.absPending = null;
};

const _GP_update = Game_Player.prototype.update;
Game_Player.prototype.update = function(sceneActive) {
    _GP_update.call(this, sceneActive);
    if (ABS.freeze > 0) return;
    if (this.absCd > 0) this.absCd--;
    if (this.absLightCd > 0) this.absLightCd--;
    if (this.absHeavyCd > 0) this.absHeavyCd--;
    if (this.absDodgeCd > 0) this.absDodgeCd--;
    if (this.absInvuln > 0) this.absInvuln--;
    if (this.absComboT > 0) { this.absComboT--; if (this.absComboT === 0) this.absCombo = 0; }

    // heavy attack resolves after a short wind-up, so it reads as a commitment
    if (this.absWindup > 0) {
        this.absWindup--;
        if (this.absWindup === 0 && this.absPending) {
            ABS.swing(this.absPending); this.absPending = null;
        }
        return;
    }
    if (!sceneActive || $gameMap.isEventRunning() || $gameMessage.isBusy()) return;

    if (CFG.mouse && TouchInput.isCancelled()) ABS.playerHeavy();
    else if (CFG.mouse && TouchInput.isTriggered()) ABS.playerAttack();
    else if (Input.isTriggered(CFG.dodgeKey)) ABS.playerDodge();
    else if (!CFG.wasd && Input.isTriggered(CFG.heavyKey)) ABS.playerHeavy();
    else if (CFG.key !== "ok" && Input.isTriggered(CFG.key)) ABS.playerAttack();
};

// with OK, interacting with an event always wins; otherwise we swing
// no sprinting: Shift and the "Always Dash" option no longer change speed
const _GP_isDashing = Game_Player.prototype.isDashing;
Game_Player.prototype.isDashing = function() {
    if (CFG.noDash) return false;
    return _GP_isDashing.call(this);
};

const _GP_tba = Game_Player.prototype.triggerButtonAction;
Game_Player.prototype.triggerButtonAction = function() {
    const started = _GP_tba.call(this);
    if (!started && CFG.key === "ok" && Input.isTriggered("ok")) ABS.playerAttack();
    return started;
};

Game_Player.prototype.absTakeDamage = function(dmg) {
    if (this.absInvuln > 0) return;
    const actor = $gameParty.leader();
    if (!actor) return;
    this.absInvuln = CFG.invuln;
    actor.setHp(Math.max(0, actor.hp - dmg));
    ABS.popup(this, dmg, "player");
    $gameTemp.requestAnimation([this], CFG.eAnim);
    AudioManager.playSe({ name: CFG.hurtSe, volume: 80, pitch: 100, pan: 0 });
    $gameScreen.startShake(4, 8, 12);
    if (actor.hp <= 0) {
        $gameTemp._absGameOver = true;
    }
};

// ===========================================================================
// ALLIES
// Each party member behind Reid is a real combatant: its own HP (the actor's
// own HP, so items and grace points heal it normally), its own light attack,
// its own death. Enemies pick the nearest target, so allies genuinely screen
// for Reid rather than being a stat bonus.
// ===========================================================================
const _GF_init = Game_Follower.prototype.initialize;
Game_Follower.prototype.initialize = function(memberIndex) {
    _GF_init.call(this, memberIndex);
    this._absCd = 0;
    this._absInv = 0;
    this._absStep = 0;
    this._absFighting = false;
    this._absDown = false;
    this._absFoe = null;
};

Game_Follower.prototype.absActor = function() {
    return this.actor();
};

Game_Follower.prototype.absAlive = function() {
    const a = this.actor();
    return !!a && a.hp > 0 && $gamePlayer.followers().isVisible();
};

/** Nearest living ABS enemy within engage range, or null. */
Game_Follower.prototype.absFindFoe = function() {
    let best = null, bestD = Infinity;
    for (const ev of $gameMap.events()) {
        if (!ev.absAlive()) continue;
        const d = chebyshev(this, ev);
        if (d <= CFG.allyAggro && d < bestD) { best = ev; bestD = d; }
    }
    return best;
};

const _GF_update = Game_Follower.prototype.update;
Game_Follower.prototype.update = function() {
    _GF_update.call(this);
    if (!CFG.allyOn) return;
    // saves made before this feature existed have no ally fields
    if (this._absCd === undefined) {
        this._absCd = 0; this._absInv = 0; this._absStep = 0;
        this._absFighting = false; this._absDown = false; this._absFoe = null;
    }

    const alive = this.absAlive();
    if (!alive) {
        // a downed ally stays where it fell, invisible, and stops fighting
        this._absFighting = false;
        this._absFoe = null;
        this.setThrough(true);
        this.setTransparent(true);
        return;
    }
    if (this._absDown) {                       // healed back up - rejoin Reid
        this._absDown = false;
        this.locate($gamePlayer.x, $gamePlayer.y);
        this.setTransparent($gamePlayer.isTransparent());
    }

    if (this._absCd > 0) this._absCd--;
    if (this._absInv > 0) this._absInv--;
    if (this._absStep > 0) this._absStep--;
    if (ABS.freeze > 0) return;
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) {
        this._absFighting = false;
        this.setThrough(true);
        return;
    }

    const leash = chebyshev(this, $gamePlayer);
    const foe = leash > CFG.allyLeash ? null : this.absFindFoe();
    this._absFoe = foe;

    if (!foe) {                                // no work to do: fall back in line
        if (this._absFighting) {
            this._absFighting = false;
            this.setThrough(true);
        }
        return;
    }

    // engaged: walk itself, and stop being dragged along behind Reid
    if (!this._absFighting) {
        // Stagger the opening swing. Three companions reaching an enemy on the
        // same frame would otherwise fire three attack animations at once,
        // which is what makes a group fight read as a mess of light.
        this._absCd = Math.max(this._absCd, Math.randomInt(Math.floor(CFG.allyAtkCd / 2)));
    }
    this._absFighting = true;
    this.setThrough(false);
    const d = chebyshev(this, foe);
    if (d <= 1) {
        this.turnTowardCharacter(foe);
        if (this._absCd <= 0) this.absAttack(foe);
    } else if (!this.isMoving() && this._absStep <= 0) {
        this.moveTowardCharacter(foe);
        if (!this.isMoving()) this.moveRandom();     // nudge out of a corner
        this._absStep = CFG.allyStep;
    }
};

// while fighting, an ally is not part of the conga line
const _GF_chase = Game_Follower.prototype.chaseCharacter;
Game_Follower.prototype.chaseCharacter = function(character) {
    if (CFG.allyOn && (this._absFighting || !this.absAlive())) return;
    _GF_chase.call(this, character);
};

const _GF_isVisible = Game_Follower.prototype.isVisible;
Game_Follower.prototype.isVisible = function() {
    if (CFG.allyOn && this.actor() && this.actor().hp <= 0) return false;
    return _GF_isVisible.call(this);
};

Game_Follower.prototype.absAttack = function(foe) {
    const a = this.actor();
    if (!a) return;
    this._absCd = CFG.allyAtkCd;
    const move = MOVES.light1;
    $gameTemp.requestAnimation([this], move.anim);
    AudioManager.playSe({ name: move.se, volume: 55, pitch: 115, pan: 0 });
    const crit = Math.random() < 0.08;
    // Allies cut through less armour than a full weapon blow (0.35 vs the
    // player's 0.8), and never fall below a floor tied to their own strength -
    // otherwise the low-ATK companions land on the minimum 1 forever and
    // contribute nothing at all.
    const power = a.atk * CFG.allyPower;
    const floor = power * 0.25;
    let dmg = Math.max(floor, power * move.dmg - foe._abs.def * 0.35);
    if (crit) dmg *= 2;
    foe.absTakeDamage(vary(dmg), crit, move, this);
};

Game_Follower.prototype.absTakeDamage = function(dmg, attacker) {
    const a = this.actor();
    if (!a || a.hp <= 0) return;
    if (this._absInv > 0) return;
    this._absInv = CFG.allyInv;
    const taken = Math.max(1, Math.round(dmg * CFG.allyHpRate));
    a.setHp(Math.max(0, a.hp - taken));
    ABS.popup(this, taken, "ally");
    $gameTemp.requestAnimation([this], CFG.eAnim);
    AudioManager.playSe({ name: CFG.hurtSe, volume: 55, pitch: 120, pan: 0 });
    if (a.hp <= 0) this.absDown();
};

Game_Follower.prototype.absDown = function() {
    this._absDown = true;
    this._absFighting = false;
    this._absFoe = null;
    ABS.popup(this, (this.actor() ? this.actor().name() : "Ally") + " FALLS", "info");
    AudioManager.playSe({ name: "Collapse1", volume: 70, pitch: 115, pan: 0 });
    $gameScreen.startFlash([180, 40, 40, 90], 24);
    this.setTransparent(true);
    // any enemy that was chewing on this ally has to find someone else
    for (const ev of $gameMap.events()) {
        if (ev._abs && ev._abs.tgt === this) ev._abs.tgt = null;
    }
};

// ---------------------------------------------------------------------------
// Ally levels are derived from Reid's, never earned separately.
// A companion sits `allyLevelGap` levels under him and rises whenever he does,
// so recruits are always the junior partner and never overtake the player.
// ---------------------------------------------------------------------------
function allyTargetLevel(actor) {
    const leader = $gameParty.leader();
    if (!leader) return actor.level;
    const want = leader.level - CFG.allyLvGap;
    return Math.min(Math.max(1, want), actor.maxLevel());
}

let _syncing = false;
ABS.syncAllyLevels = function() {
    if (!CFG.allyOn || !CFG.allyLvSync || _syncing || !$gameParty) return;
    const ms = $gameParty.members();
    if (ms.length < 2) return;
    _syncing = true;
    try {
        for (let i = 1; i < ms.length; i++) {
            const a = ms[i];
            const lv = allyTargetLevel(a);
            // changeLevel pins EXP to exactly that level, so it works in both
            // directions - a recruit who joins over-levelled is brought down too
            if (a.level !== lv) a.changeLevel(lv, false);
            // re-clamp HP against the cap below, which moves with Reid
            a.refresh();
        }
    } finally {
        _syncing = false;
    }
};

// ---------------------------------------------------------------------------
// Companions must never out-stat Reid on health. Levelling them down is not
// enough on its own: Michelle is a Martial Artist and that class's HP curve
// beats the Swordsman's at every level, so a level BELOW Reid she still had
// more max HP than him. Cap it as a fraction of his.
// ---------------------------------------------------------------------------
const _GA_param = Game_Actor.prototype.param;
Game_Actor.prototype.param = function(paramId) {
    const value = _GA_param.call(this, paramId);
    if (paramId !== 0 || !CFG.allyOn || !$gameParty) return value;
    // Read the raw id list, NOT $gameParty.members(): that instantiates actors,
    // and actor construction calls refresh() -> param(), which recurses until
    // the stack blows.
    const ids = $gameParty._actors;
    if (!ids || ids.length < 2) return value;
    if (this._actorId === ids[0] || !ids.includes(this._actorId)) return value;
    // and take the leader straight out of storage rather than building one
    const leader = $gameActors && $gameActors._data ? $gameActors._data[ids[0]] : null;
    if (!leader || leader === this) return value;
    const cap = Math.floor(_GA_param.call(leader, 0) * CFG.allyHpCap);
    return Math.max(1, Math.min(value, cap));
};

// companions earn no EXP of their own: their level is Reid's, minus the gap.
// Without this they would level from kills and then be yanked back down,
// firing a level-up message that immediately becomes a lie.
const _GA_gainExp = Game_Actor.prototype.gainExp;
Game_Actor.prototype.gainExp = function(exp) {
    if (CFG.allyOn && CFG.allyLvSync && $gameParty) {
        const ms = $gameParty.members();
        if (ms.length && ms[0] !== this && ms.includes(this)) return;
    }
    _GA_gainExp.call(this, exp);
};

// whenever Reid's level moves, drag the companions along with it
const _GA_changeExp = Game_Actor.prototype.changeExp;
Game_Actor.prototype.changeExp = function(exp, show) {
    const before = this._level;
    _GA_changeExp.call(this, exp, show);
    if (this._level !== before && $gameParty && $gameParty.leader() === this) {
        ABS.syncAllyLevels();
    }
};

// a recruit joining mid-run is levelled to match on the spot
const _GP_addActor = Game_Party.prototype.addActor;
Game_Party.prototype.addActor = function(actorId) {
    _GP_addActor.call(this, actorId);
    ABS.syncAllyLevels();
};

// and a safety pass on every map load, which also corrects old save files
const _GM_setup_lv = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
    _GM_setup_lv.call(this, mapId);
    ABS.syncAllyLevels();
};

// A cheap self-heal. However a companion's level got out of step - an old save,
// a Change Level command in an event, another plugin - it corrects itself
// within a third of a second instead of waiting for the next map load.
// The check is a few integer comparisons; it only does work when something
// is actually wrong.
ABS.allyLevelsDrifted = function() {
    if (!CFG.allyOn || !CFG.allyLvSync || !$gameParty) return false;
    const ms = $gameParty.members();
    for (let i = 1; i < ms.length; i++) {
        if (ms[i].level !== allyTargetLevel(ms[i])) return true;
    }
    return false;
};

// light attack - chains 1 -> 2 -> 3, each with its own animation and weight
ABS.playerAttack = function() {
    if ($gamePlayer.absLightCd > 0) return;
    if ($gamePlayer.absCd > 0 || $gamePlayer.absWindup > 0 || ABS.freeze > 0) return;
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return;
    const step = ($gamePlayer.absComboT > 0) ? (($gamePlayer.absCombo % 3) + 1) : 1;
    $gamePlayer.absCombo = step;
    // the finisher costs you a long recovery; 1 and 2 chain quickly
    if (step === 3) {
        $gamePlayer.absLightCd = CFG.chainCd;
        $gamePlayer.absComboT = 0;
        $gamePlayer.absCombo = 0;
    } else {
        $gamePlayer.absLightCd = CFG.lightCd;
        $gamePlayer.absComboT = CFG.comboWin;
    }
    ABS.swing(MOVES["light" + step]);
};

// heavy attack - slow, telegraphed, breaks poise and knocks back
ABS.playerHeavy = function() {
    if ($gamePlayer.absHeavyCd > 0) { AudioManager.playSe({name:"Buzzer1",volume:35,pitch:150,pan:0}); return; }
    if ($gamePlayer.absCd > 0 || $gamePlayer.absWindup > 0 || ABS.freeze > 0) return;
    $gamePlayer.absHeavyCd = CFG.heavyCd;
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return;
    $gamePlayer.absCombo = 0; $gamePlayer.absComboT = 0;
    $gamePlayer.absWindup = MOVES.heavy.windup;
    $gamePlayer.absPending = MOVES.heavy;
    AudioManager.playSe({ name: "Wind7", volume: 60, pitch: 70, pan: 0 });
    ABS.popup($gamePlayer, "HEAVY", "info");
};

// dodge - short hop with invulnerability
ABS.playerDodge = function() {
    if ($gamePlayer.absDodgeCd > 0) { AudioManager.playSe({name:"Buzzer1",volume:35,pitch:150,pan:0}); return; }
    if ($gamePlayer.absCd > 0 || $gamePlayer.absWindup > 0 || ABS.freeze > 0) return;
    $gamePlayer.absDodgeCd = CFG.dodgeCd;
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return;
    const d = $gamePlayer.direction();
    const vx = d === 4 ? -1 : d === 6 ? 1 : 0;
    const vy = d === 8 ? -1 : d === 2 ? 1 : 0;
    let steps = 0, cx = $gamePlayer.x, cy = $gamePlayer.y;
    for (let i = 0; i < 2; i++) {
        if (!$gamePlayer.canPass(cx, cy, d)) break;
        cx += vx; cy += vy; steps++;
    }
    $gamePlayer.absInvuln = CFG.dodgeIF;
    $gamePlayer.absCd = 26;
    if (steps > 0) $gamePlayer.jump(vx * steps, vy * steps);
    AudioManager.playSe({ name: "Evasion1", volume: 70, pitch: 130, pan: 0 });
};

// resolve a swing against everything in the arc
ABS.swing = function(move) {
    $gamePlayer.absCd = move.cd;
    $gameTemp.requestAnimation([$gamePlayer], move.anim);
    AudioManager.playSe({ name: move.se, volume: 75, pitch: 100, pan: 0 });

    const dir = $gamePlayer.direction();
    const px = $gamePlayer.x, py = $gamePlayer.y;
    const atk = playerAtk();
    let hitAny = false;

    for (const ev of $gameMap.events()) {
        if (!ev.absAlive()) continue;
        const dx = ev.x - px, dy = ev.y - py;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > CFG.range) continue;
        if (dir === 2 && dy < 0) continue;
        if (dir === 8 && dy > 0) continue;
        if (dir === 4 && dx > 0) continue;
        if (dir === 6 && dx < 0) continue;
        const crit = Math.random() < 0.10;
        let dmg = Math.max(1, atk * move.dmg - ev._abs.def * 0.8);
        if (crit) dmg *= 2;
        ev.absTakeDamage(vary(dmg), crit, move, $gamePlayer);
        hitAny = true;
    }
    if (!hitAny) AudioManager.playSe({ name: "Miss", volume: 40, pitch: 130, pan: 0 });
};

//---------------------------------------------------------------------------
// floating damage numbers
//---------------------------------------------------------------------------
ABS.popup = function(character, value, kind) {
    if (!$gameTemp._absPopups) $gameTemp._absPopups = [];
    $gameTemp._absPopups.push({ character, value, kind });
};

function Sprite_AbsPopup() { this.initialize(...arguments); }
Sprite_AbsPopup.prototype = Object.create(Sprite.prototype);
Sprite_AbsPopup.prototype.constructor = Sprite_AbsPopup;

Sprite_AbsPopup.prototype.initialize = function(data) {
    Sprite.prototype.initialize.call(this);
    this._char = data.character;
    this._life = 46;
    this._dy = 0;
    const crit = data.kind === "crit";
    const info = data.kind === "info";
    const bmp = new Bitmap(150, 40);
    bmp.fontFace = info ? $gameSystem.mainFontFace() : $gameSystem.numberFontFace();
    bmp.fontSize = crit ? 32 : info ? 19 : 26;
    bmp.fontBold = true;
    bmp.outlineWidth = 5;
    bmp.outlineColor = "rgba(0,0,0,0.85)";
    bmp.textColor = data.kind === "player" ? "#ff6b6b"
                  : data.kind === "ally" ? "#ff9f7a"
                  : crit ? "#ffd166"
                  : info ? (String(data.value) === "GUARD" ? "#8fd4ff"
                          : String(data.value) === "MISS" ? "#bdbdbd" : "#ffd166")
                  : "#ffffff";
    bmp.drawText(String(data.value), 0, 0, 150, 40, "center");
    this.bitmap = bmp;
    this._info = info;
    this.anchor.x = 0.5; this.anchor.y = 1;
    this.z = 9;
};

Sprite_AbsPopup.prototype.update = function() {
    Sprite.prototype.update.call(this);
    this._life--;
    this._dy += this._info ? 0.75 : 1.15;
    if (this._char) {
        this.x = this._char.screenX();
        this.y = this._char.screenY() - 42 - this._dy;
    }
    if (this._life < 16) this.opacity = Math.max(0, this._life * 16);
    if (this._life <= 0 && this.parent) this.parent.removeChild(this);
};

//---------------------------------------------------------------------------
// enemy health bars
//---------------------------------------------------------------------------
const _SC_init = Sprite_Character.prototype.initMembers;
Sprite_Character.prototype.initMembers = function() {
    _SC_init.call(this);
    this._absBar = null;
};

const _SC_update = Sprite_Character.prototype.update;
Sprite_Character.prototype.update = function() {
    _SC_update.call(this);
    this.absUpdateBar();
};

Sprite_Character.prototype.absUpdateBar = function() {
    const ch = this._character;
    if (ch instanceof Game_Follower) return this.absUpdateAllyBar(ch);
    const live = ch && ch._abs && ch.absAlive && ch.absAlive();
    if (!live) {
        if (this._absBar) { this.removeChild(this._absBar); this._absBar = null; }
        return;
    }
    const a = ch._abs;
    const w = a.boss ? 64 : 40;
    if (!this._absBar) {
        this._absBar = new Sprite(new Bitmap(w, 11));
        this._absBar.anchor.x = 0.5; this._absBar.anchor.y = 1;
        this.addChild(this._absBar);
    }
    const b = this._absBar.bitmap;
    b.clear();
    // health
    const hpR = Math.max(0, a.hp / a.mhp);
    b.fillRect(0, 0, w, 6, "rgba(0,0,0,0.75)");
    b.fillRect(1, 1, Math.floor((w - 2) * hpR), 4,
        a.boss ? "#c0392b" : (hpR > 0.5 ? "#4fd1c5" : hpR > 0.25 ? "#e2b04a" : "#ff5d5d"));
    // poise - empties as you batter them, refills when they recover
    const pR = Math.max(0, a.poise / a.poiseMax);
    b.fillRect(0, 7, w, 4, "rgba(0,0,0,0.6)");
    b.fillRect(1, 8, Math.floor((w - 2) * pR), 2,
        a.state === "stagger" ? "#ffffff" : "#9aa6b2");
    this._absBar.y = -this.patternHeight() - 6;

    // colour tells you what it is doing
    let tone = [0, 0, 0, 0];
    if (a.flash > 0)                 tone = [255, 90, 90, 160];
    else if (a.state === "stagger")  tone = [255, 255, 255, 130];
    else if (a.state === "block")    tone = [90, 150, 255, 110];
    else if (a.tell > 0) {
        const c = (a.boss && a.move) ? BOSS_MOVES[a.move].tell : a.arch.tell;
        const r = parseInt(c.substr(1, 2), 16), g = parseInt(c.substr(3, 2), 16), bl = parseInt(c.substr(5, 2), 16);
        const pulse = 90 + Math.floor(60 * Math.sin(Graphics.frameCount / 4));
        tone = [r, g, bl, pulse];
    }
    if (a.tell > 0) a.tell--;
    this.setBlendColor(tone);
};

// a slim bar over each living ally, plus a red flash when they are struck
Sprite_Character.prototype.absUpdateAllyBar = function(ch) {
    const actor = CFG.allyOn && CFG.allyBars && ch.absAlive && ch.absAlive()
        ? ch.actor() : null;
    if (!actor) {
        if (this._absBar) { this.removeChild(this._absBar); this._absBar = null; }
        this.setBlendColor([0, 0, 0, 0]);
        return;
    }
    const w = 34;
    if (!this._absBar) {
        this._absBar = new Sprite(new Bitmap(w, 11));
        this._absBar.anchor.x = 0.5; this._absBar.anchor.y = 1;
        this.addChild(this._absBar);
        this._absBarSig = "";
    }
    const r = Math.max(0, actor.hp / Math.max(1, actor.mhp));
    const cd = Math.max(0, 1 - (ch._absCd || 0) / Math.max(1, CFG.allyAtkCd));
    // quantised so the bitmap is not rebuilt every single frame
    const sig = actor.hp + "/" + actor.mhp + ":" + Math.round(cd * 16);
    if (sig !== this._absBarSig) {
        this._absBarSig = sig;
        const b = this._absBar.bitmap;
        b.clear();
        b.fillRect(0, 0, w, 6, "rgba(0,0,0,0.7)");
        b.fillRect(1, 1, Math.floor((w - 2) * r), 4,
            r > 0.5 ? "#7fc99a" : r > 0.25 ? "#e2b04a" : "#ff5d5d");
        // swing cooldown, sitting just under the health bar
        b.fillRect(0, 7, w, 4, "rgba(0,0,0,0.65)");
        b.fillRect(1, 8, Math.floor((w - 2) * cd), 2,
            cd >= 1 ? "#4fd1c5" : "#e2b04a");
    }
    this._absBar.y = -this.patternHeight() - 4;
    // brief flash while their i-frames run, so a hit on an ally is readable
    const inv = ch._absInv || 0;
    this.setBlendColor(inv > CFG.allyInv - 12 ? [255, 90, 90, 150] : [0, 0, 0, 0]);
};

//---------------------------------------------------------------------------
// spriteset: host the popups
//---------------------------------------------------------------------------
const _SM_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function() {
    _SM_createLowerLayer.call(this);
    this._absPopupLayer = new Sprite();
    this.addChild(this._absPopupLayer);
};

const _SM_update = Spriteset_Map.prototype.update;
Spriteset_Map.prototype.update = function() {
    _SM_update.call(this);
    const q = $gameTemp._absPopups;
    if (q && q.length && this._absPopupLayer) {
        while (q.length) this._absPopupLayer.addChild(new Sprite_AbsPopup(q.shift()));
    }
};

//---------------------------------------------------------------------------
// health HUD
//---------------------------------------------------------------------------
function Sprite_AbsHud() { this.initialize(...arguments); }
Sprite_AbsHud.prototype = Object.create(Sprite.prototype);
Sprite_AbsHud.prototype.constructor = Sprite_AbsHud;

Sprite_AbsHud.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this, new Bitmap(260, 190));
    this.x = 12; this.y = 12;
    this._sig = "";
};

Sprite_AbsHud.prototype.update = function() {
    Sprite.prototype.update.call(this);
    const ms = $gameParty.members();
    if (!ms.length) { this.visible = false; return; }
    this.visible = true;
    // Redraw only when something visible changed. Cooldowns move every frame,
    // so they are quantised to 24 steps - that caps the redraws at 24 per
    // cooldown cycle instead of one per frame.
    const sig = ms.map((a, i) =>
        a.actorId() + ":" + a.hp + "/" + a.mhp +
        (i > 0 ? ":" + Math.round(memberCdRate(i) * 24) : "")).join("|");
    if (sig === this._sig) return;
    this._sig = sig;

    const b = this.bitmap;
    b.clear();
    b.fontFace = $gameSystem.mainFontFace();
    b.outlineWidth = 4;
    b.outlineColor = "rgba(0,0,0,0.9)";

    // --- leader: full-size bar
    const a = ms[0];
    b.fontSize = 16;
    b.textColor = "#e8e8e8";
    b.drawText(a.name(), 4, 0, 200, 20, "left");
    const rate = a.mhp ? a.hp / a.mhp : 0;
    b.fillRect(2, 22, 230, 14, "rgba(0,0,0,0.7)");
    b.fillRect(3, 23, Math.floor(228 * rate), 12,
        rate > 0.5 ? "#4fd1c5" : rate > 0.25 ? "#e2b04a" : "#ff5d5d");
    b.fontSize = 14;
    b.drawText(a.hp + " / " + a.mhp, 4, 20, 228, 18, "center");

    // --- allies: compact health bar plus a swing-cooldown meter, greyed when down
    if (!CFG.allyOn) return;
    let y = 44;
    for (let i = 1; i < ms.length; i++) {
        const m = ms[i];
        const down = m.hp <= 0;
        const r = m.mhp ? m.hp / m.mhp : 0;
        const cd = memberCdRate(i);
        b.fontSize = 13;
        b.textColor = down ? "#7a7a7a" : "#cfcfcf";
        b.drawText(m.name(), 6, y - 2, 120, 18, "left");
        // health
        b.fillRect(2, y + 14, 176, 9, "rgba(0,0,0,0.7)");
        if (!down) {
            b.fillRect(3, y + 15, Math.floor(174 * r), 7,
                r > 0.5 ? "#7fc99a" : r > 0.25 ? "#e2b04a" : "#ff5d5d");
        }
        b.fontSize = 12;
        b.textColor = down ? "#ff7b7b" : "#cfcfcf";
        b.drawText(down ? "DOWN" : (m.hp + " / " + m.mhp), 2, y + 12, 176, 14, "center");
        // swing cooldown - same track and colours as Reid's meters on the right
        b.fillRect(2, y + 25, 176, 5, "rgba(0,0,0,0.65)");
        if (!down) {
            b.fillRect(3, y + 26, Math.floor(174 * cd), 3,
                cd >= 1 ? "#4fd1c5" : "#e2b04a");
        }
        y += 40;
    }
};

// mouse belongs to combat now: no click-to-walk, no right-click menu
const _ScM_processMapTouch = Scene_Map.prototype.processMapTouch;
Scene_Map.prototype.processMapTouch = function() {
    if (CFG.mouse) return;
    _ScM_processMapTouch.call(this);
};
const _ScM_isMenuCalled = Scene_Map.prototype.isMenuCalled;
Scene_Map.prototype.isMenuCalled = function() {
    if (CFG.mouse) return Input.isTriggered("menu");   // X / Esc still work
    return _ScM_isMenuCalled.call(this);
};

//---------------------------------------------------------------------------
// control panel (right side) with live cooldown meters
//---------------------------------------------------------------------------
function Sprite_AbsControls() { this.initialize(...arguments); }
Sprite_AbsControls.prototype = Object.create(Sprite.prototype);
Sprite_AbsControls.prototype.constructor = Sprite_AbsControls;

Sprite_AbsControls.W = 196;
Sprite_AbsControls.H = 256;

Sprite_AbsControls.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this, new Bitmap(Sprite_AbsControls.W, Sprite_AbsControls.H));
    this.x = Graphics.boxWidth - Sprite_AbsControls.W - 10;
    this.y = 10;
    this.opacity = 232;
    this._hv = -1; this._dv = -1; this._lv = -1;
};

Sprite_AbsControls.prototype.update = function() {
    Sprite.prototype.update.call(this);
    const hv = $gamePlayer ? Math.max(0, 1 - $gamePlayer.absHeavyCd / Math.max(1, CFG.heavyCd)) : 1;
    const dv = $gamePlayer ? Math.max(0, 1 - $gamePlayer.absDodgeCd / Math.max(1, CFG.dodgeCd)) : 1;
    const lv = $gamePlayer ? Math.max(0, 1 - $gamePlayer.absLightCd / Math.max(1, CFG.chainCd)) : 1;
    if (Math.abs(hv - this._hv) < 0.02 && Math.abs(dv - this._dv) < 0.02
        && Math.abs(lv - this._lv) < 0.02) return;
    this._hv = hv; this._dv = dv; this._lv = lv;
    this.redraw(hv, dv, lv);
};

Sprite_AbsControls.prototype.cap = function(x, y, label, ready) {
    const b = this.bitmap, w = Math.max(26, label.length * 9 + 12);
    b.fillRect(x, y, w, 20, ready ? "rgba(79,209,197,0.22)" : "rgba(140,140,150,0.14)");
    b.fillRect(x, y, w, 1, ready ? "#4fd1c5" : "#6b7280");
    b.fillRect(x, y + 19, w, 1, ready ? "#2f8f88" : "#4b5563");
    b.fontFace = $gameSystem.mainFontFace();
    b.fontSize = 13; b.fontBold = true;
    b.outlineWidth = 3; b.outlineColor = "rgba(0,0,0,0.9)";
    b.textColor = ready ? "#d8fffb" : "#9aa0aa";
    b.drawText(label, x, y + 1, w, 18, "center");
    return w;
};

Sprite_AbsControls.prototype.row = function(y, keys, label, rate) {
    const b = this.bitmap;
    let x = 10;
    const ready = rate === undefined || rate >= 1;
    for (const k of keys) x += this.cap(x, y, k, ready) + 4;
    b.fontFace = $gameSystem.mainFontFace();
    b.fontSize = 14; b.fontBold = false;
    b.outlineWidth = 3; b.outlineColor = "rgba(0,0,0,0.9)";
    b.textColor = ready ? "#e8e8e8" : "#8d939c";
    b.drawText(label, 10, y + 20, Sprite_AbsControls.W - 20, 17, "left");
    if (rate !== undefined) {                       // cooldown meter
        const bw = Sprite_AbsControls.W - 20;
        b.fillRect(10, y + 37, bw, 5, "rgba(0,0,0,0.65)");
        b.fillRect(11, y + 38, Math.floor((bw - 2) * rate), 3, rate >= 1 ? "#4fd1c5" : "#e2b04a");
    }
};

Sprite_AbsControls.prototype.redraw = function(hv, dv, lv) {
    const b = this.bitmap, W = Sprite_AbsControls.W, H = Sprite_AbsControls.H;
    b.clear();
    b.fillRect(0, 0, W, H, "rgba(8,10,14,0.72)");
    b.fillRect(0, 0, W, 2, "rgba(79,209,197,0.55)");
    b.fillRect(0, H - 2, W, 2, "rgba(0,0,0,0.5)");
    b.fontFace = $gameSystem.mainFontFace();
    b.fontSize = 13; b.fontBold = true;
    b.outlineWidth = 3; b.outlineColor = "rgba(0,0,0,0.9)";
    b.textColor = "#4fd1c5";
    b.drawText("CONTROLS", 10, 6, W - 20, 18, "left");
    this.row(32,  ["W","A","S","D"], "Move");
    this.row(78,  ["L-CLICK"],       "Attack  (chains x3)", lv);
    this.row(128, ["R-CLICK"],       "Heavy",  hv);
    this.row(178, ["Q"],             "Dodge",  dv);
    b.fontSize = 12; b.fontBold = false; b.textColor = "#9aa0aa";
    b.drawText("Z  interact          X  menu", 10, H - 26, W - 20, 16, "left");
};

const _ScM_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _ScM_createAllWindows.call(this);
    if (CFG.hud) {
        this._absHud = new Sprite_AbsHud();
        this.addChild(this._absHud);
    }
    if (CFG.controls) {
        this._absControls = new Sprite_AbsControls();
        this.addChild(this._absControls);
    }
};

// death -> game over
const _ScM_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _ScM_update.call(this);
    if (ABS.freeze > 0) ABS.freeze--;
    if (Graphics.frameCount % 20 === 0 && ABS.allyLevelsDrifted()) {
        ABS.syncAllyLevels();
    }
    if ($gameTemp._absGameOver) {
        $gameTemp._absGameOver = false;
        SceneManager.goto(Scene_Gameover);
    }
};

//---------------------------------------------------------------------------
// plugin commands
//---------------------------------------------------------------------------
PluginManager.registerCommand(PN, "healParty", args => {
    const n = Number(args.amount || 0);
    $gameParty.allMembers().forEach(a => {
        if (n <= 0) { a.setHp(a.mhp); a.setMp(a.mmp); }
        else a.setHp(Math.min(a.mhp, a.hp + n));
    });
});
})();
