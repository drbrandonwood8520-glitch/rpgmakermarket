//=============================================================================
// RPG Maker MZ - Questwright Core (runtime for the Questwright generator)
// QuestwrightCore.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Runs questlines authored in the Questwright generator from a single pasted JSON. One plugin command per NPC. Tracks per-faction reputation and integrates with FactionBorderWars.
 * @author Claude
 * @url
 *
 * @help
 * ============================================================================
 * Questwright Core
 * ============================================================================
 * Paste the JSON exported from the Questwright generator into the "Quest Data"
 * parameter below. Every questline then lives in your game with NO switch or
 * variable bookkeeping — the plugin tracks all state in the save file.
 *
 * ----------------------------------------------------------------------------
 * ONE COMMAND PER NPC
 * ----------------------------------------------------------------------------
 * On each NPC event, add ONE plugin command:
 *     Questwright  ->  Interact
 *        NPC tag: <the NPC's name, exactly as typed in the generator>
 * Set the event trigger to "Action Button". That's the entire hookup.
 *
 * On interaction the plugin will, for that NPC:
 *   - Advance any active questline whose current step happens here, OR
 *   - Offer a not-yet-started questline this NPC gives (Accept / Decline), OR
 *   - Show the "nothing to do" line (see parameter), or stay silent.
 *
 * Objectives resolve automatically:
 *   - Talk / Investigate : interacting completes the step.
 *   - Fetch              : checks the party has the items, removes them.
 *   - Deliver            : interacting at the destination completes the step.
 *   - Hunt               : kills are counted automatically (see below).
 *   - Choice             : shows the options; each grants its own rewards.
 *
 * ----------------------------------------------------------------------------
 * HUNT / KILL COUNTING (no troop edits needed)
 * ----------------------------------------------------------------------------
 * While a Hunt step is active, defeating an enemy whose database name matches
 * the step's target increments that step's counter automatically. No troop
 * page setup required.
 *
 * ----------------------------------------------------------------------------
 * REPUTATION + FACTIONBORDERWARS
 * ----------------------------------------------------------------------------
 * Rewards may grant reputation with a faction. Reputation is the player's
 * personal standing and is stored in the save file (independent of the war).
 *
 * Read / change it from script or other plugins:
 *     Questwright.rep("iron")            // current standing (number)
 *     Questwright.addRep("iron", 10)     // grant standing
 *     Questwright.factionName("iron")    // display name (uses FBW if present)
 *
 * If "Mirror Reputation Into War" is ON and FactionBorderWars is installed,
 * each reputation change also nudges that faction's chosen stat (strength or
 * resources) by amount x factor — so favour with a faction materially helps
 * them hold territory. This is OFF by default so reputation stays cosmetic
 * until you opt in.
 *
 * ----------------------------------------------------------------------------
 * OTHER SCRIPT CALLS
 * ----------------------------------------------------------------------------
 *     Questwright.state("quest_id")      // 0 = not started, 1..N stage, done = N+1
 *     Questwright.isActive("quest_id")   // boolean
 *     Questwright.isDone("quest_id")     // boolean
 *     Questwright.start("quest_id")      // start a quest from script/cutscene
 * Quest ids are shown in the generator's export.
 *
 * ============================================================================
 *
 * @param questData
 * @text Quest Data (JSON)
 * @type note
 * @desc Paste the JSON exported from the Questwright generator here.
 * @default ""
 *
 * @param noQuestText
 * @text "Nothing to do" line
 * @type string
 * @desc Shown when an NPC has no quest business. Leave blank for silence.
 * @default
 *
 * @param showRepPopups
 * @text Announce reputation changes
 * @type boolean
 * @on Show
 * @off Silent
 * @desc Show a short message line when reputation changes.
 * @default true
 *
 * @param ---FactionBorderWars---
 * @default
 *
 * @param mirrorRep
 * @parent ---FactionBorderWars---
 * @text Mirror Reputation Into War
 * @type boolean
 * @on Mirror
 * @off Don't
 * @desc If on (and FactionBorderWars is present), reputation changes also adjust the faction's war stat.
 * @default false
 *
 * @param mirrorStat
 * @parent ---FactionBorderWars---
 * @text Stat To Mirror Into
 * @type select
 * @option Strength
 * @value strength
 * @option Resources
 * @value resources
 * @default resources
 *
 * @param mirrorFactor
 * @parent ---FactionBorderWars---
 * @text Mirror Factor
 * @type number
 * @decimals 2
 * @min 0
 * @desc War-stat change = reputation change x this factor.
 * @default 0.50
 *
 * @command interact
 * @text Interact
 * @desc Run this NPC's quest business (offer / advance / complete).
 * @arg npc
 * @text NPC tag
 * @type string
 * @desc The NPC name exactly as typed in the generator.
 *
 * @command openLog
 * @text Open Quest Log
 * @desc Open a simple list of active and completed questlines.
 *
 * @command setRep
 * @text Add Reputation
 * @desc Grant (or remove) reputation with a faction from an event.
 * @arg faction
 * @text Faction ID
 * @type string
 * @arg amount
 * @text Amount
 * @type number
 * @min -9999
 * @default 10
 */

var Imported = Imported || {};
Imported.QuestwrightCore = true;

var Questwright = Questwright || {};

(() => {
  "use strict";
  const PLUGIN = "QuestwrightCore";
  const P = PluginManager.parameters(PLUGIN);

  const asBool = (v) => String(v) === "true";
  const asNum = (v, d) => { const n = Number(v); return isNaN(n) ? d : n; };

  const CFG = {
    noQuestText: String(P.noQuestText || ""),
    showRepPopups: asBool(P.showRepPopups),
    mirrorRep: asBool(P.mirrorRep),
    mirrorStat: String(P.mirrorStat || "resources"),
    mirrorFactor: asNum(P.mirrorFactor, 0.5),
  };

  // ---- Parse the quest database ------------------------------------------
  let DB = { factions: [], questlines: [] };
  try {
    let raw = P.questData || "";
    // @type note wraps the value in quotes and escapes; JSON.parse unwraps it.
    if (raw && raw.charAt(0) === '"') raw = JSON.parse(raw);
    raw = String(raw).trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      DB.factions = Array.isArray(parsed.factions) ? parsed.factions : [];
      DB.questlines = Array.isArray(parsed.questlines) ? parsed.questlines : [];
    }
  } catch (e) {
    console.error("[Questwright] Could not parse Quest Data JSON:", e);
  }

  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  // Quest lookups
  const questById = {};
  DB.questlines.forEach((q) => { questById[q.id] = q; });
  const lastStage = (q) => q.stages.length;              // done value = N+1
  const stageAt = (q, num) => q.stages[num - 1] || null; // 1-based

  // Faction display (prefers live FactionBorderWars data)
  Questwright.factionName = function (id) {
    if (window.$gameFactionWar && $gameFactionWar.faction(id)) return $gameFactionWar.factionName(id);
    const f = DB.factions.find((x) => x.id === id);
    return f ? f.name : id;
  };

  //=========================================================================
  // Save-persisted state on $gameSystem
  //=========================================================================
  function store() {
    if (!$gameSystem._qw) {
      $gameSystem._qw = { progress: {}, rep: {}, kills: {} };
    }
    return $gameSystem._qw;
  }
  function prog(qid) {
    const s = store();
    if (!s.progress[qid]) s.progress[qid] = 0; // 0 = not started
    return s.progress[qid];
  }
  function setProg(qid, v) { store().progress[qid] = v; }

  Questwright.state = (qid) => prog(qid);
  Questwright.isActive = (qid) => {
    const q = questById[qid]; if (!q) return false;
    const v = prog(qid); return v >= 1 && v <= lastStage(q);
  };
  Questwright.isDone = (qid) => {
    const q = questById[qid]; if (!q) return false;
    return prog(qid) > lastStage(q);
  };
  Questwright.start = (qid) => { if (questById[qid] && prog(qid) === 0) setProg(qid, 1); };

  // ---- Reputation ---------------------------------------------------------
  Questwright.rep = (id) => store().rep[id] || 0;
  Questwright.addRep = function (id, amount) {
    if (!id) return;
    const s = store();
    s.rep[id] = (s.rep[id] || 0) + amount;
    if (CFG.mirrorRep && window.$gameFactionWar &&
        typeof $gameFactionWar.setFactionStat === "function") {
      const delta = Math.round(amount * CFG.mirrorFactor);
      if (delta !== 0) $gameFactionWar.setFactionStat(id, CFG.mirrorStat, "add", delta);
    }
    if (CFG.showRepPopups && amount !== 0) {
      const sign = amount > 0 ? "+" : "";
      $gameMessage.add(`Reputation with ${Questwright.factionName(id)} ${sign}${amount}.`);
    }
  };

  //=========================================================================
  // Reward application
  //=========================================================================
  let ITEM_INDEX = null;
  function itemByName(name) {
    if (!name) return null;
    if (!ITEM_INDEX) {
      ITEM_INDEX = {};
      const add = (arr) => arr && arr.forEach((it) => { if (it && it.name) ITEM_INDEX[norm(it.name)] = it; });
      add($dataItems); add($dataWeapons); add($dataArmors);
    }
    return ITEM_INDEX[norm(name)] || null;
  }

  function applyReward(r) {
    if (!r) return;
    if (r.gold > 0) $gameParty.gainGold(r.gold);
    if (r.item && String(r.item).trim()) {
      const it = itemByName(r.item);
      if (it) $gameParty.gainItem(it, r.itemCount || 1);
      else console.warn(`[Questwright] Reward item not found in database: "${r.item}"`);
    }
    if (r.xp > 0) $gameParty.allMembers().forEach((a) => a.gainExp(r.xp));
    if (Array.isArray(r.rep)) {
      r.rep.forEach((e) => { if (e && e.faction && e.amount) Questwright.addRep(e.faction, Number(e.amount)); });
    }
  }

  //=========================================================================
  // Kill counting for active Hunt steps
  //=========================================================================
  function noteKill(enemyName) {
    const target = norm(enemyName);
    if (!target) return;
    const s = store();
    DB.questlines.forEach((q) => {
      const v = prog(q.id);
      if (v < 1 || v > lastStage(q)) return;
      const st = stageAt(q, v);
      if (!st || st.type !== "hunt") return;
      if (norm(st.target && st.target.enemy) !== target) return;
      const key = q.id + ":" + st.id;
      s.kills[key] = (s.kills[key] || 0) + 1;
    });
  }
  function killCount(q, st) { return store().kills[q.id + ":" + st.id] || 0; }

  const _Game_Enemy_performCollapse = Game_Enemy.prototype.performCollapse;
  Game_Enemy.prototype.performCollapse = function () {
    _Game_Enemy_performCollapse.call(this);
    try {
      const data = this.enemy();
      if (data && data.name) noteKill(data.name);
    } catch (e) { /* never break battle */ }
  };

  //=========================================================================
  // Interaction resolution
  //=========================================================================
  // Returns {kind:'advance'|'offer'|'none', quest, stage}
  function resolveForNpc(tag) {
    const t = norm(tag);
    // 1) Prefer advancing an active questline whose current step is hosted here.
    for (const q of DB.questlines) {
      const v = prog(q.id);
      if (v >= 1 && v <= lastStage(q)) {
        const st = stageAt(q, v);
        const host = norm(st.npc) || norm(q.giver);
        if (host === t) return { kind: "advance", quest: q, stage: st };
      }
    }
    // 2) Otherwise offer a not-started questline this NPC gives.
    for (const q of DB.questlines) {
      if (prog(q.id) === 0 && norm(q.giver) === t) return { kind: "offer", quest: q };
    }
    return { kind: "none" };
  }

  function say(text) { if (text) $gameMessage.add(String(text)); }

  function advanceToNext(q, stageNum) {
    if (stageNum >= lastStage(q)) {
      setProg(q.id, lastStage(q) + 1); // completed
      say("Quest complete: " + q.name + "!");
    } else {
      setProg(q.id, stageNum + 1);
    }
  }

  // The heavy lifting. `interp` is the calling Game_Interpreter (for wait mode).
  function runInteract(tag, interp) {
    const res = resolveForNpc(tag);
    let queued = false;

    if (res.kind === "none") {
      if (CFG.noQuestText) { say(CFG.noQuestText); queued = true; }
      if (queued && interp) interp.setWaitMode("message");
      return;
    }

    if (res.kind === "offer") {
      const q = res.quest;
      const intro = (q.stages[0] && q.stages[0].dialogue) || "Would you help me with something?";
      say(intro);
      $gameMessage.setChoices(["Accept", "Decline"], 0, 1);
      $gameMessage.setChoiceCallback((n) => {
        if (n === 0) { setProg(q.id, 1); }
      });
      if (interp) interp.setWaitMode("message");
      return;
    }

    // res.kind === 'advance'
    const q = res.quest, st = res.stage, num = prog(q.id);

    if (st.type === "talk" || st.type === "investigate") {
      say(st.dialogue || "");
      applyReward(st.reward);
      advanceToNext(q, num);
      queued = true;
    }
    else if (st.type === "fetch") {
      const need = (st.target && st.target.count) || 1;
      const it = itemByName(st.target && st.target.item);
      const have = it ? $gameParty.numItems(it) : 0;
      if (it && have >= need) {
        $gameParty.loseItem(it, need);
        say(st.dialogue || "");
        applyReward(st.reward);
        advanceToNext(q, num);
      } else {
        const nm = (st.target && st.target.item) || "the items";
        say(`Still need ${need} ${nm}. Come back when you have them.`);
      }
      queued = true;
    }
    else if (st.type === "deliver") {
      say(st.dialogue || `Ah — just what I needed.`);
      const it = itemByName(st.target && st.target.item);
      if (it && $gameParty.numItems(it) > 0) $gameParty.loseItem(it, 1);
      applyReward(st.reward);
      advanceToNext(q, num);
      queued = true;
    }
    else if (st.type === "hunt") {
      const need = (st.target && st.target.count) || 1;
      const got = killCount(q, st);
      if (got >= need) {
        say(st.dialogue || "You've dealt with them. Well done.");
        applyReward(st.reward);
        advanceToNext(q, num);
      } else {
        const nm = (st.target && st.target.enemy) || "targets";
        say(`Defeat ${need} ${nm} first. (${got}/${need})`);
      }
      queued = true;
    }
    else if (st.type === "choice") {
      say(st.objective || "What will you do?");
      const branches = st.branches || [];
      $gameMessage.setChoices(branches.map((b, i) => b.label || ("Option " + String.fromCharCode(65 + i))), 0, -1);
      $gameMessage.setChoiceCallback((n) => {
        const b = branches[n];
        if (!b) return;
        if (b.result) say(b.result);
        applyReward(b.reward);
        advanceToNext(q, num);
      });
      queued = true;
    }

    if (queued && interp) interp.setWaitMode("message");
  }

  //=========================================================================
  // Plugin commands
  //=========================================================================
  PluginManager.registerCommand(PLUGIN, "interact", function (args) {
    runInteract(args.npc || "", this); // `this` = Game_Interpreter
  });
  PluginManager.registerCommand(PLUGIN, "setRep", function (args) {
    Questwright.addRep(String(args.faction || "").trim(), asNum(args.amount, 0));
    if ($gameMessage.hasText() || $gameMessage.isChoice()) this.setWaitMode("message");
  });
  PluginManager.registerCommand(PLUGIN, "openLog", function () {
    SceneManager.push(Scene_QWLog);
  });

  //=========================================================================
  // Minimal quest log
  //=========================================================================
  function Window_QWLog() { this.initialize(...arguments); }
  Window_QWLog.prototype = Object.create(Window_Selectable.prototype);
  Window_QWLog.prototype.constructor = Window_QWLog;
  Window_QWLog.prototype.initialize = function (rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
  };
  Window_QWLog.prototype.refresh = function () {
    this.contents.clear();
    const lh = this.lineHeight();
    let y = 0;
    const active = [], done = [];
    DB.questlines.forEach((q) => {
      if (Questwright.isDone(q.id)) done.push(q);
      else if (Questwright.isActive(q.id)) active.push(q);
    });
    const header = (txt) => {
      this.changeTextColor(ColorManager.systemColor());
      this.drawText(txt, 4, y, this.innerWidth - 8, "left");
      this.resetTextColor(); y += lh;
    };
    if (!active.length && !done.length) {
      this.drawText("No quests yet.", 4, y, this.innerWidth - 8, "left");
      return;
    }
    if (active.length) {
      header("Active");
      active.forEach((q) => {
        const v = Questwright.state(q.id);
        const st = stageAt(q, v);
        this.drawText("! " + q.name, 8, y, this.innerWidth - 16, "left"); y += lh;
        if (st) {
          this.changeTextColor(ColorManager.textColor(8));
          this.drawTextEx("   " + (st.objective || st.type), 8, y);
          this.resetTextColor(); y += lh;
        }
      });
    }
    if (done.length) {
      y += 8; header("Completed");
      this.changeTextColor(ColorManager.textColor(7));
      done.forEach((q) => { this.drawText("\u2713 " + q.name, 8, y, this.innerWidth - 16, "left"); y += lh; });
      this.resetTextColor();
    }
  };

  function Scene_QWLog() { this.initialize(...arguments); }
  Scene_QWLog.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_QWLog.prototype.constructor = Scene_QWLog;
  Scene_QWLog.prototype.create = function () {
    Scene_MenuBase.prototype.create.call(this);
    const rect = new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight);
    this._win = new Window_QWLog(rect);
    this._win.setHandler("cancel", this.popScene.bind(this));
    this._win.activate();
    this.addWindow(this._win);
  };

  // expose scene for other plugins/menus
  window.Scene_QWLog = Scene_QWLog;
})();
