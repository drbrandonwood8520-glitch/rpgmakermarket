//=============================================================================
// EvolvingEnemyPowerscaling.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Evolving Enemy Powerscaling — early enemies stay relevant as the party levels up, scaling sub-linearly and evolving into stronger forms. Works in MV & MZ.
 * @author You
 *
 * @param partyLevelMode
 * @text Party Level Metric
 * @type select
 * @option Highest member level
 * @value highest
 * @option Average member level
 * @value average
 * @default highest
 * @desc Which party level the world scales against.
 *
 * @param defaultRefLevel
 * @text Default Reference Level
 * @type number
 * @min 1
 * @default 1
 * @desc An enemy is "designed for" this level unless it has a <RefLevel: n> notetag. No scaling at or below it.
 *
 * @param scaleRate
 * @text Scale Rate
 * @type number
 * @decimals 3
 * @min 0
 * @default 0.06
 * @desc Base stat bonus per level above the reference level, before the exponent curve is applied.
 *
 * @param scaleExponent
 * @text Scale Exponent
 * @type number
 * @decimals 2
 * @min 0.10
 * @max 1.00
 * @default 0.75
 * @desc Below 1.0 makes scaling sub-linear, so the party always stays ahead. 1.0 = linear. Lower = flatter.
 *
 * @param maxStatMultiplier
 * @text Max Stat Multiplier
 * @type number
 * @decimals 2
 * @min 1.00
 * @default 3.00
 * @desc Global ceiling on how strong scaling can make an enemy. Override per enemy with <MaxStatMult: x>.
 *
 * @param rewardScaleFactor
 * @text Reward Scale Factor
 * @type number
 * @decimals 2
 * @min 0.00
 * @default 1.00
 * @desc How much of the stat scaling also applies to EXP/gold. 1.0 = rewards scale as fast as stats, 0 = fixed rewards.
 *
 * @param scaleParamIds
 * @text Scaled Parameters
 * @type string
 * @default 0,1,2,3,4,5,6,7
 * @desc Comma-separated param IDs to scale. 0 MHP 1 MMP 2 ATK 3 DEF 4 MAT 5 MDF 6 AGI 7 LUK.
 *
 * @help
 * ============================================================================
 * Evolving Enemy Powerscaling
 * ============================================================================
 * Keeps early-game enemies relevant instead of trivial as the party grows.
 * Three layers work together so a scaled enemy is never a wall AND never
 * worthless:
 *
 *   1) Sub-linear stat scaling  — enemy power grows slower than the party's,
 *      so you always feel stronger, but old foes still bite.
 *   2) Evolution tiers          — at level thresholds an enemy is replaced by
 *      a stronger database enemy (new name / sprite / skills), not just bigger
 *      numbers. This scaled form ALSO gets stat scaling on top.
 *   3) Reward scaling           — EXP and gold scale so kills stay worthwhile.
 *
 * The party-level metric, curve, and ceiling are set in the plugin params.
 * Per-enemy behaviour is set with notetags in the enemy's Note box.
 *
 * ----------------------------------------------------------------------------
 * NOTETAGS (put these in an enemy's Note box in the database)
 * ----------------------------------------------------------------------------
 *   <RefLevel: 5>
 *       The level this enemy is balanced for. No scaling until the party
 *       passes it. Acts as the "floor".
 *
 *   <NoScale>
 *       Exclude this enemy entirely. Good for hand-tuned bosses.
 *
 *   <MaxStatMult: 2.0>
 *       Per-enemy ceiling, overriding the global one. Use it to keep trash
 *       trash (e.g. a rat capped low) and let dragons climb higher.
 *
 *   <RewardScale: 0.5>
 *       Per-enemy reward factor, overriding the global Reward Scale Factor.
 *
 *   <EvolveTiers: 12, 24, 36>
 *   <EvolveForms: 41, 42, 43>
 *       Parallel lists. When the party level reaches a tier, this enemy is
 *       swapped for the matching database enemy ID. The highest tier that is
 *       met wins. In the example: level 12+ -> enemy 41, 24+ -> 42, 36+ -> 43.
 *
 * ----------------------------------------------------------------------------
 * WORKED EXAMPLE — a Slime that stays a threat
 * ----------------------------------------------------------------------------
 * In the base "Slime" (say enemy #3) Note box:
 *
 *     <RefLevel: 2>
 *     <MaxStatMult: 2.5>
 *     <EvolveTiers: 15, 30>
 *     <EvolveForms: 40, 41>
 *
 * Make enemy #40 "Hardened Slime" and #41 "Chrome Slime" in the database with
 * their own sprites and maybe an extra skill. Put the base Slime (#3) in your
 * troops. Below level 15 the party fights a scaling Slime; at 15+ it becomes a
 * scaling Hardened Slime; at 30+ a scaling Chrome Slime. Only the base enemy
 * needs the notetags — leave the evolved forms' Note boxes blank.
 *
 * ----------------------------------------------------------------------------
 * INSTALL
 * ----------------------------------------------------------------------------
 * Drop this file in your project's js/plugins/ folder, enable it in the Plugin
 * Manager, and tune the parameters. No plugin commands are needed.
 *
 * The @target MZ line above is ignored by MV, so the same file works in both.
 * ============================================================================
 */

(function () {
    "use strict";

    var pluginName = "EvolvingEnemyPowerscaling";
    var params = PluginManager.parameters(pluginName);

    var CFG = {
        mode: String(params.partyLevelMode || "highest"),
        defaultRef: Number(params.defaultRefLevel || 1),
        rate: Number(params.scaleRate || 0.06),
        exponent: Number(params.scaleExponent || 0.75),
        maxMult: Number(params.maxStatMultiplier || 3.0),
        rewardFactor: Number(params.rewardScaleFactor || 1.0),
        scaledParams: String(params.scaleParamIds || "0,1,2,3,4,5,6,7")
            .split(",")
            .map(function (s) { return Number(s.trim()); })
            .filter(function (n) { return !isNaN(n); })
    };

    var PES = {};

    // Current party level according to the chosen metric. Safe outside battle.
    PES.partyLevel = function () {
        if (typeof $gameParty === "undefined" || !$gameParty) return 1;
        var members = $gameParty.inBattle && $gameParty.inBattle()
            ? $gameParty.battleMembers()
            : $gameParty.members();
        if (!members || members.length === 0) return 1;
        var levels = members.map(function (a) { return a ? a.level : 1; });
        if (CFG.mode === "average") {
            var sum = levels.reduce(function (s, l) { return s + l; }, 0);
            return Math.max(1, Math.round(sum / levels.length));
        }
        return Math.max.apply(null, levels);
    };

    // Given the base enemy placed in the troop, pick the evolved form (if any).
    PES.resolveEvolvedId = function (enemyId) {
        var data = $dataEnemies[enemyId];
        if (!data || !data.meta) return enemyId;
        if (!data.meta.EvolveTiers || !data.meta.EvolveForms) return enemyId;

        var tiers = String(data.meta.EvolveTiers).split(",").map(function (s) {
            return Number(s.trim());
        });
        var forms = String(data.meta.EvolveForms).split(",").map(function (s) {
            return Number(s.trim());
        });

        var level = PES.partyLevel();
        var chosen = enemyId;
        for (var i = 0; i < tiers.length; i++) {
            if (!isNaN(tiers[i]) && level >= tiers[i] && forms[i]) {
                chosen = forms[i];
            }
        }
        // Fall back to the base enemy if a form ID is missing from the database.
        return $dataEnemies[chosen] ? chosen : enemyId;
    };

    // Sub-linear stat multiplier for a resolved enemy's data object.
    PES.statMultFor = function (data) {
        if (!data || !data.meta) return 1;
        if (data.meta.NoScale) return 1;

        var ref = data.meta.RefLevel != null
            ? Number(data.meta.RefLevel)
            : CFG.defaultRef;
        var delta = Math.max(0, PES.partyLevel() - ref);
        if (delta <= 0) return 1;

        var raw = 1 + CFG.rate * Math.pow(delta, CFG.exponent);
        var cap = data.meta.MaxStatMult != null
            ? Number(data.meta.MaxStatMult)
            : CFG.maxMult;
        return Math.min(raw, Math.max(1, cap));
    };

    // Reward multiplier derived from the stat multiplier.
    PES.rewardMultFor = function (data, statMult) {
        if (!data || !data.meta) return 1;
        var factor = data.meta.RewardScale != null
            ? Number(data.meta.RewardScale)
            : CFG.rewardFactor;
        return 1 + (statMult - 1) * factor;
    };

    //-------------------------------------------------------------------------
    // Game_Enemy — resolve evolution and lock in multipliers at setup time.
    //-------------------------------------------------------------------------
    var _Game_Enemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function (enemyId, x, y) {
        var finalId = PES.resolveEvolvedId(enemyId);
        var data = $dataEnemies[finalId];

        // Set multipliers BEFORE the original setup so recoverAll() fills the
        // enemy to its scaled max HP rather than the base HP.
        this._pesStatMult = PES.statMultFor(data);
        this._pesRewardMult = PES.rewardMultFor(data, this._pesStatMult);

        _Game_Enemy_setup.call(this, finalId, x, y);
    };

    var _Game_Enemy_paramBase = Game_Enemy.prototype.paramBase;
    Game_Enemy.prototype.paramBase = function (paramId) {
        var base = _Game_Enemy_paramBase.call(this, paramId);
        var mult = this._pesStatMult || 1;
        if (mult !== 1 && CFG.scaledParams.indexOf(paramId) >= 0) {
            return Math.round(base * mult);
        }
        return base;
    };

    var _Game_Enemy_exp = Game_Enemy.prototype.exp;
    Game_Enemy.prototype.exp = function () {
        return Math.round(_Game_Enemy_exp.call(this) * (this._pesRewardMult || 1));
    };

    var _Game_Enemy_gold = Game_Enemy.prototype.gold;
    Game_Enemy.prototype.gold = function () {
        return Math.round(_Game_Enemy_gold.call(this) * (this._pesRewardMult || 1));
    };

    // Expose for other plugins / debugging.
    window.EvolvingEnemyPowerscaling = PES;
})();
