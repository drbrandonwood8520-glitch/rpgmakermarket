/*:
 * @target MZ
 * @plugindesc [v1.0.0] Core foundation for a modular board-game engine. Individual games (Checkers, Bingo, etc.) register on top of this.
 * @author You (scaffolded by Claude)
 * @url
 *
 * @help
 * ============================================================================
 * BoardGameCore.js  —  Modular Board Game Engine (FOUNDATION)
 * ============================================================================
 *
 * This plugin does NOT contain any playable game by itself. It is the shared
 * foundation that individual game plugins (BoardGame_Checkers.js,
 * BoardGame_Bingo.js, ...) build on top of. Place this plugin ABOVE all
 * BoardGame_* plugins in the Plugin Manager.
 *
 * ----------------------------------------------------------------------------
 * WHAT THE CORE PROVIDES
 * ----------------------------------------------------------------------------
 *   • A registry so game files self-register (no core edits needed to add one).
 *   • A launcher Plugin Command (Start Board Game) that opens a match from an
 *     event and pauses the event until the match resolves.
 *   • Opponents defined once (portrait, name, per-game skill, taunts, default
 *     stakes) and reused everywhere.
 *   • A shared, themed Scene shell (Scene_BoardGameBase) that gives every game
 *     the same chrome: header, opponent portrait + record, status panel, a
 *     message ticker for taunts/prompts, quit-confirm, and a result overlay.
 *   • AI + difficulty helpers (BoardGameAI) so every game's difficulty behaves
 *     consistently: mistake-rate blending plus an alpha-beta minimax scaffold.
 *   • Win/Loss/Draw resolution that applies stakes (gold wager + item reward),
 *     records stats, and writes a result Switch/Variable so your events can
 *     branch on the outcome.
 *
 * ----------------------------------------------------------------------------
 * RESULT WIRING (how your events read the outcome)
 * ----------------------------------------------------------------------------
 * When a match ends the core sets, before returning to the map:
 *   • Result Variable  ->  0 = loss, 1 = win, 2 = draw
 *   • Result Switch    ->  ON only on a win
 * The Start Board Game command lets you pick which Switch/Variable to use (or
 * falls back to the plugin's default Switch/Variable params). Because pushing a
 * scene suspends the map interpreter, the event that launched the match simply
 * continues on the next line once the player returns — so you can immediately
 * branch with a Conditional Branch on the variable.
 *
 * ----------------------------------------------------------------------------
 * STAKES (configurable per opponent, overridable per launch)
 * ----------------------------------------------------------------------------
 * Each opponent can define a default gold wager and win item reward. The Start
 * Board Game command can override them for a specific event. Gold wager is
 * symmetric (win => +wager from the NPC, loss => -wager, clamped at 0). The win
 * item is a pure reward granted only on a win. Anything fancier (quest flags,
 * unique rewards) you handle yourself in the event using the Result Variable.
 * Forfeiting (quitting mid-match) counts as a loss.
 *
 * ----------------------------------------------------------------------------
 * DIFFICULTY
 * ----------------------------------------------------------------------------
 * Skill is an integer scale (default 1..5). Each opponent has a default skill
 * plus optional per-game overrides, so the same NPC can be a checkers master
 * but hopeless at bingo. The launch command may override skill for one event.
 *
 * ============================================================================
 * FOR GAME-FILE AUTHORS  —  the extension contract
 * ============================================================================
 * A game plugin registers itself and supplies a Scene that extends
 * Scene_BoardGameBase:
 *
 *   (function() {
 *     class Scene_Checkers extends Scene_BoardGameBase {
 *       onMatchStart() {
 *         // Build your board inside this.boardAreaRect(). this.opponent,
 *         // this.difficulty and this.match are available here.
 *       }
 *       updateGame() {
 *         // Called every frame while the match is active. Read input, run the
 *         // AI turn, and call this.endMatch('win' | 'lose' | 'draw') when done.
 *       }
 *     }
 *
 *     BoardGameManager.registerGame({
 *       id: 'checkers',            // unique key used by the launch command
 *       name: 'Checkers',          // shown in the header
 *       minSkill: 1, maxSkill: 5,  // difficulty range this game understands
 *       scene: Scene_Checkers      // constructor extending Scene_BoardGameBase
 *     });
 *   })();
 *
 * Useful base-scene members for your game:
 *   this.match          -> the active match data (game id, stakes, ids…)
 *   this.opponent       -> resolved opponent object (name, portrait, taunts…)
 *   this.difficulty     -> resolved integer skill for THIS game
 *   this.gameDef        -> your registration object
 *   this.boardAreaRect()-> Rectangle of free space for your board
 *   this.showMessage(t) -> print a line in the ticker
 *   this.taunt(kind)    -> show a random opponent line ('greeting','win',
 *                          'lose','draw','thinking')
 *   this.setStatus(arr) -> replace the right-side status panel lines
 *   this.endMatch(res)  -> finish: applies stakes, records stats, sets the
 *                          result Switch/Variable, shows the overlay, returns
 *   this.playSe(kind)   -> 'move' | 'win' | 'lose' | 'select' | 'buzzer'
 *
 * Shared AI helpers (BoardGameAI): pick, shuffle, weightedPick,
 * skillToMistakeRate, chooseMove, minimax. See their comments below.
 *
 * Shared look (BoardGameTheme.colors / .fonts) so all games match.
 *
 * ============================================================================
 * TERMS OF USE: free for commercial and non-commercial projects. Credit
 * appreciated but not required. Modify freely.
 * ============================================================================
 *
 * @param defaultResultVariable
 * @text Default Result Variable
 * @type variable
 * @desc Fallback variable set to 0=loss,1=win,2=draw when a launch command doesn't specify one.
 * @default 0
 *
 * @param defaultResultSwitch
 * @text Default Result Switch
 * @type switch
 * @desc Fallback switch set ON only on a win when a launch command doesn't specify one.
 * @default 0
 *
 * @param maxSkill
 * @text Max Skill Level
 * @type number
 * @min 1
 * @desc Top of the difficulty scale (skills run 1..this). Games may map it however they like.
 * @default 5
 *
 * @param opponents
 * @text Opponents
 * @type struct<Opponent>[]
 * @desc Reusable NPC opponents referenced by id in the Start Board Game command.
 * @default []
 *
 * @param theme
 * @text Visual Theme
 * @type struct<Theme>
 * @desc Shared colors used by every board game so they look like one product.
 * @default {"panel":"#1c2230","panelAccent":"#2b3550","boardLight":"#e9e2c9","boardDark":"#6d4c33","lineColor":"#0d1017","textMain":"#f4f4f6","textDim":"#9aa3b2","win":"#66d17a","lose":"#e5645b","draw":"#e7c15a","highlight":"#4aa3ff"}
 *
 * @command StartBoardGame
 * @text Start Board Game
 * @desc Launch a match against an NPC. The event pauses until the player returns.
 *
 * @arg gameId
 * @text Game Id
 * @type string
 * @desc The registered game key, e.g. "checkers", "bingo". Must match a game plugin's id.
 * @default
 *
 * @arg opponentId
 * @text Opponent Id
 * @type string
 * @desc Id of an opponent from the Opponents list. Leave blank for a generic opponent.
 * @default
 *
 * @arg difficulty
 * @text Skill Override
 * @type number
 * @min 0
 * @desc 0 = use the opponent's skill for this game. Otherwise force this skill level.
 * @default 0
 *
 * @arg wagerGold
 * @text Gold Wager Override
 * @type number
 * @min -1
 * @desc -1 = use the opponent's default. Otherwise stake this much gold (win +, loss -).
 * @default -1
 *
 * @arg winItemId
 * @text Win Item Id
 * @type item
 * @desc Optional item granted only on a win (0 = none). Overrides the opponent default if set.
 * @default 0
 *
 * @arg winItemAmount
 * @text Win Item Amount
 * @type number
 * @min 1
 * @desc How many of the win item to grant.
 * @default 1
 *
 * @arg resultVariableId
 * @text Result Variable
 * @type variable
 * @desc 0 = use the plugin default. Set to 0=loss,1=win,2=draw.
 * @default 0
 *
 * @arg resultSwitchId
 * @text Result Switch
 * @type switch
 * @desc 0 = use the plugin default. Set ON only on a win.
 * @default 0
 *
 * @command ResetBoardGameStats
 * @text Reset Board Game Stats
 * @desc Wipe recorded win/loss/draw records (all games, or one game).
 *
 * @arg gameId
 * @text Game Id
 * @type string
 * @desc Leave blank to reset every game's records. Otherwise only this game.
 * @default
 */

/*~struct~Opponent:
 * @param id
 * @text Id
 * @type string
 * @desc Unique key used by the Start Board Game command, e.g. "old_miller".
 * @default
 *
 * @param name
 * @text Display Name
 * @type string
 * @desc Shown in the match header and result overlay.
 * @default Opponent
 *
 * @param faceName
 * @text Face Image
 * @type file
 * @dir img/faces/
 * @desc Face graphic used for the portrait. Optional.
 * @default
 *
 * @param faceIndex
 * @text Face Index
 * @type number
 * @min 0
 * @max 7
 * @desc Which face in the file (0..7).
 * @default 0
 *
 * @param defaultSkill
 * @text Default Skill
 * @type number
 * @min 1
 * @desc Skill used when no per-game override applies (1..Max Skill).
 * @default 3
 *
 * @param skillOverrides
 * @text Per-Game Skill
 * @type string
 * @desc Comma list "gameId:skill", e.g. "checkers:5, bingo:1". Overrides the default per game.
 * @default
 *
 * @param wagerGold
 * @text Default Gold Wager
 * @type number
 * @min 0
 * @desc Default gold staked per match (win +, loss -). The launch command can override.
 * @default 0
 *
 * @param winItemId
 * @text Default Win Item
 * @type item
 * @desc Default item granted on a win (0 = none). The launch command can override.
 * @default 0
 *
 * @param greetingLines
 * @text Greeting Lines
 * @type string[]
 * @desc Said at the start of a match (one picked at random).
 * @default []
 *
 * @param winLines
 * @text Player-Win Lines
 * @type string[]
 * @desc Said when the PLAYER wins.
 * @default []
 *
 * @param loseLines
 * @text Player-Lose Lines
 * @type string[]
 * @desc Said when the PLAYER loses.
 * @default []
 *
 * @param drawLines
 * @text Draw Lines
 * @type string[]
 * @desc Said on a draw.
 * @default []
 *
 * @param thinkingLines
 * @text Thinking Lines
 * @type string[]
 * @desc Flavor said while the opponent takes a turn.
 * @default []
 */

/*~struct~Theme:
 * @param panel
 * @text Panel Color
 * @default #1c2230
 * @param panelAccent
 * @text Panel Accent
 * @default #2b3550
 * @param boardLight
 * @text Board Light
 * @default #e9e2c9
 * @param boardDark
 * @text Board Dark
 * @default #6d4c33
 * @param lineColor
 * @text Line / Border
 * @default #0d1017
 * @param textMain
 * @text Text (Main)
 * @default #f4f4f6
 * @param textDim
 * @text Text (Dim)
 * @default #9aa3b2
 * @param win
 * @text Win Color
 * @default #66d17a
 * @param lose
 * @text Lose Color
 * @default #e5645b
 * @param draw
 * @text Draw Color
 * @default #e7c15a
 * @param highlight
 * @text Highlight
 * @default #4aa3ff
 */

var Imported = Imported || {};
Imported.BoardGameCore = "1.0.0";

var BoardGameManager;
var BoardGameAI;
var BoardGameTheme;

(() => {
    "use strict";

    const pluginName = (document.currentScript &&
        document.currentScript.src.match(/([^\/]+)\.js$/)[1]) || "BoardGameCore";
    const params = PluginManager.parameters(pluginName);

    // ---- helpers to parse the (string-only) plugin params ------------------
    const toInt = (v, d = 0) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : d;
    };
    const parseList = (raw) => {
        if (!raw) return [];
        try { return JSON.parse(raw); } catch (e) { return []; }
    };
    const parseStruct = (raw) => {
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (e) { return {}; }
    };

    const MAX_SKILL = Math.max(1, toInt(params.maxSkill, 5));
    const DEFAULT_RESULT_VAR = toInt(params.defaultResultVariable, 0);
    const DEFAULT_RESULT_SWITCH = toInt(params.defaultResultSwitch, 0);

    // ---- Theme -------------------------------------------------------------
    const themeRaw = parseStruct(params.theme);
    BoardGameTheme = {
        colors: {
            panel: themeRaw.panel || "#1c2230",
            panelAccent: themeRaw.panelAccent || "#2b3550",
            boardLight: themeRaw.boardLight || "#e9e2c9",
            boardDark: themeRaw.boardDark || "#6d4c33",
            lineColor: themeRaw.lineColor || "#0d1017",
            textMain: themeRaw.textMain || "#f4f4f6",
            textDim: themeRaw.textDim || "#9aa3b2",
            win: themeRaw.win || "#66d17a",
            lose: themeRaw.lose || "#e5645b",
            draw: themeRaw.draw || "#e7c15a",
            highlight: themeRaw.highlight || "#4aa3ff"
        },
        fonts: {
            main: () => $gameSystem ? $gameSystem.mainFontFace() : "sans-serif",
            titleSize: 28,
            bodySize: 22,
            resultSize: 48
        }
    };

    // ---- Opponents ---------------------------------------------------------
    // An opponent is normalized into a plain object with helper methods.
    function makeOpponent(src) {
        const skillOverrides = {};
        const rawOverrides = (src.skillOverrides || "").trim();
        if (rawOverrides) {
            for (const pair of rawOverrides.split(",")) {
                const [k, v] = pair.split(":").map(s => s && s.trim());
                if (k) skillOverrides[k] = toInt(v, NaN);
            }
        }
        return {
            id: src.id || "",
            name: src.name || "Opponent",
            faceName: src.faceName || "",
            faceIndex: toInt(src.faceIndex, 0),
            defaultSkill: Math.max(1, toInt(src.defaultSkill, 3)),
            skillOverrides,
            wagerGold: Math.max(0, toInt(src.wagerGold, 0)),
            winItemId: toInt(src.winItemId, 0),
            greetingLines: parseList(src.greetingLines),
            winLines: parseList(src.winLines),
            loseLines: parseList(src.loseLines),
            drawLines: parseList(src.drawLines),
            thinkingLines: parseList(src.thinkingLines),
            // Resolved skill for a given game id.
            skillFor(gameId) {
                const o = this.skillOverrides[gameId];
                const s = Number.isFinite(o) ? o : this.defaultSkill;
                return Math.max(1, Math.min(MAX_SKILL, s));
            },
            linesFor(kind) {
                switch (kind) {
                    case "greeting": return this.greetingLines;
                    case "win": return this.winLines;
                    case "lose": return this.loseLines;
                    case "draw": return this.drawLines;
                    case "thinking": return this.thinkingLines;
                    default: return [];
                }
            }
        };
    }

    const OPPONENTS = {};
    for (const raw of parseList(params.opponents)) {
        const o = makeOpponent(parseStruct(raw));
        if (o.id) OPPONENTS[o.id] = o;
    }
    // Fallback generic opponent so a launch never hard-fails on a missing id.
    const GENERIC_OPPONENT = makeOpponent({ id: "", name: "Opponent", defaultSkill: 3 });

    // ========================================================================
    //  BoardGameAI  —  shared difficulty + move-selection helpers
    // ========================================================================
    BoardGameAI = {
        // Uniform random integer in [0, n).
        randomInt(n) { return Math.floor(Math.random() * n); },

        // Random element of an array.
        pick(arr) { return arr[this.randomInt(arr.length)]; },

        // In-place Fisher-Yates shuffle (returns the same array).
        shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = this.randomInt(i + 1);
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        },

        // Weighted pick. items and weights are parallel arrays.
        weightedPick(items, weights) {
            const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
            if (total <= 0) return this.pick(items);
            let r = Math.random() * total;
            for (let i = 0; i < items.length; i++) {
                r -= Math.max(0, weights[i]);
                if (r <= 0) return items[i];
            }
            return items[items.length - 1];
        },

        // Probability that the AI plays a *random* legal move instead of the
        // best one, derived from skill. Skill == maxSkill => 0 (always best);
        // skill == 1 => high. Tune `floor`/`ceil` per game if desired.
        skillToMistakeRate(skill, maxSkill = MAX_SKILL, ceil = 0.7, floor = 0.0) {
            const t = (maxSkill - skill) / Math.max(1, maxSkill - 1); // 0..1
            return floor + (ceil - floor) * t;
        },

        // Generic move chooser for games that can score candidate moves.
        //   candidates : array of moves
        //   scoreFn    : (move) => number  (higher = better for the AI)
        //   skill      : integer skill level
        // With probability skillToMistakeRate it returns a random candidate;
        // otherwise it returns the highest-scoring one (ties broken randomly).
        chooseMove(candidates, scoreFn, skill, maxSkill = MAX_SKILL) {
            if (candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];
            if (Math.random() < this.skillToMistakeRate(skill, maxSkill)) {
                return this.pick(candidates);
            }
            let best = -Infinity;
            let bestMoves = [];
            for (const m of candidates) {
                const s = scoreFn(m);
                if (s > best) { best = s; bestMoves = [m]; }
                else if (s === best) { bestMoves.push(m); }
            }
            return this.pick(bestMoves);
        },

        // Alpha-beta minimax scaffold for perfect-information turn games.
        // Pass a config object:
        //   state         : current game state (opaque to the core)
        //   depth         : search depth (see depthForSkill below)
        //   maximizing    : true if it's the AI's turn to maximize
        //   getMoves(s)   : => array of moves legal in state s
        //   applyMove(s,m): => new state after playing move m (do NOT mutate s)
        //   evaluate(s)   : => number, positive favouring the maximizer
        //   isTerminal(s) : => boolean
        // Returns { score, move }.
        minimax(cfg) {
            const search = (state, depth, alpha, beta, maximizing) => {
                if (depth <= 0 || cfg.isTerminal(state)) {
                    return { score: cfg.evaluate(state), move: null };
                }
                const moves = cfg.getMoves(state);
                if (moves.length === 0) {
                    return { score: cfg.evaluate(state), move: null };
                }
                let bestMove = moves[0];
                if (maximizing) {
                    let best = -Infinity;
                    for (const m of moves) {
                        const r = search(cfg.applyMove(state, m), depth - 1, alpha, beta, false);
                        if (r.score > best) { best = r.score; bestMove = m; }
                        alpha = Math.max(alpha, best);
                        if (beta <= alpha) break;
                    }
                    return { score: best, move: bestMove };
                } else {
                    let best = Infinity;
                    for (const m of moves) {
                        const r = search(cfg.applyMove(state, m), depth - 1, alpha, beta, true);
                        if (r.score < best) { best = r.score; bestMove = m; }
                        beta = Math.min(beta, best);
                        if (beta <= alpha) break;
                    }
                    return { score: best, move: bestMove };
                }
            };
            return search(cfg.state, cfg.depth, -Infinity, Infinity,
                cfg.maximizing !== false);
        },

        // Convenience: map a skill level to a minimax search depth.
        depthForSkill(skill, minDepth = 1, maxDepth = 5, maxSkill = MAX_SKILL) {
            const t = (skill - 1) / Math.max(1, maxSkill - 1); // 0..1
            return Math.round(minDepth + (maxDepth - minDepth) * t);
        }
    };

    // ========================================================================
    //  BoardGameManager  —  registry, launcher, stats
    // ========================================================================
    const GAMES = {};

    BoardGameManager = {
        MAX_SKILL,

        // -- registry --------------------------------------------------------
        registerGame(def) {
            if (!def || !def.id) {
                console.error("[BoardGameCore] registerGame needs an id.", def);
                return;
            }
            if (typeof def.scene !== "function") {
                console.error(`[BoardGameCore] game "${def.id}" needs a scene constructor.`);
                return;
            }
            GAMES[def.id] = {
                id: def.id,
                name: def.name || def.id,
                minSkill: def.minSkill || 1,
                maxSkill: def.maxSkill || MAX_SKILL,
                scene: def.scene,
                meta: def.meta || {}
            };
        },
        getGame(id) { return GAMES[id] || null; },
        allGames() { return Object.values(GAMES); },
        isRegistered(id) { return !!GAMES[id]; },

        // -- opponents -------------------------------------------------------
        getOpponent(id) { return (id && OPPONENTS[id]) || GENERIC_OPPONENT; },

        // -- current match (runtime only, not saved) -------------------------
        currentMatch: null,

        // Build a match from a config and push the game's scene. Returns false
        // if the game id is not registered (and warns), so a launch can fail
        // gracefully instead of freezing the event.
        startMatch(config) {
            const def = this.getGame(config.gameId);
            if (!def) {
                console.error(`[BoardGameCore] No game registered with id "${config.gameId}". ` +
                    `Is its plugin installed and below BoardGameCore?`);
                return false;
            }
            const opponent = this.getOpponent(config.opponentId);
            const skill = config.difficulty > 0
                ? Math.max(1, Math.min(MAX_SKILL, config.difficulty))
                : opponent.skillFor(def.id);

            const wagerGold = (config.wagerGold >= 0) ? config.wagerGold : opponent.wagerGold;
            const winItemId = (config.winItemId > 0) ? config.winItemId : opponent.winItemId;

            this.currentMatch = {
                gameId: def.id,
                def,
                opponentId: opponent.id,
                opponent,
                difficulty: skill,
                wagerGold: Math.max(0, wagerGold || 0),
                winItemId: winItemId || 0,
                winItemAmount: Math.max(1, config.winItemAmount || 1),
                resultVariableId: config.resultVariableId || DEFAULT_RESULT_VAR,
                resultSwitchId: config.resultSwitchId || DEFAULT_RESULT_SWITCH,
                result: null // 'win' | 'lose' | 'draw', filled on finish
            };
            SceneManager.push(def.scene);
            return true;
        },

        // -- stats (persisted on $gameSystem) --------------------------------
        recordResult(gameId, opponentId, result) {
            if (!$gameSystem) return;
            const rec = $gameSystem.boardGameRecord(gameId, opponentId);
            if (result === "win") rec.wins++;
            else if (result === "lose") rec.losses++;
            else if (result === "draw") rec.draws++;
        },
        getRecord(gameId, opponentId) {
            return $gameSystem
                ? $gameSystem.boardGameRecord(gameId, opponentId)
                : { wins: 0, losses: 0, draws: 0 };
        },
        // Totals across all opponents for a game.
        getGameTotals(gameId) {
            const totals = { wins: 0, losses: 0, draws: 0 };
            if (!$gameSystem) return totals;
            const byOpp = $gameSystem._boardGameStats && $gameSystem._boardGameStats[gameId];
            if (byOpp) {
                for (const rec of Object.values(byOpp)) {
                    totals.wins += rec.wins;
                    totals.losses += rec.losses;
                    totals.draws += rec.draws;
                }
            }
            return totals;
        },
        resetStats(gameId) {
            if (!$gameSystem) return;
            if (gameId) {
                if ($gameSystem._boardGameStats) delete $gameSystem._boardGameStats[gameId];
            } else {
                $gameSystem._boardGameStats = {};
            }
        }
    };

    // ========================================================================
    //  Game_System extension  —  persistent stats
    // ========================================================================
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._boardGameStats = {};
    };

    Game_System.prototype.boardGameRecord = function(gameId, opponentId) {
        if (!this._boardGameStats) this._boardGameStats = {};
        const g = this._boardGameStats[gameId] || (this._boardGameStats[gameId] = {});
        const key = opponentId || "_generic";
        return g[key] || (g[key] = { wins: 0, losses: 0, draws: 0 });
    };

    // ========================================================================
    //  Plugin Commands
    // ========================================================================
    PluginManager.registerCommand(pluginName, "StartBoardGame", args => {
        BoardGameManager.startMatch({
            gameId: String(args.gameId || "").trim(),
            opponentId: String(args.opponentId || "").trim(),
            difficulty: toInt(args.difficulty, 0),
            wagerGold: toInt(args.wagerGold, -1),
            winItemId: toInt(args.winItemId, 0),
            winItemAmount: toInt(args.winItemAmount, 1),
            resultVariableId: toInt(args.resultVariableId, 0),
            resultSwitchId: toInt(args.resultSwitchId, 0)
        });
    });

    PluginManager.registerCommand(pluginName, "ResetBoardGameStats", args => {
        BoardGameManager.resetStats(String(args.gameId || "").trim());
    });

    console.log("[BoardGameCore] loaded — build 1.0.2 (status-window fix + overlay z-order fix)");

    // ========================================================================
    //  Shared UI windows
    // ========================================================================
    const C = BoardGameTheme.colors;

    // Top bar: game title (left) + opponent name (right).
    class Window_BoardGameHeader extends Window_Base {
        setup(title, opponentName) {
            this._title = title || "";
            this._opponentName = opponentName || "";
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            const w = this.contentsWidth();
            this.changeTextColor(C.textMain);
            this.contents.fontSize = BoardGameTheme.fonts.titleSize;
            this.drawText(this._title, 0, 0, w, "left");
            this.changeTextColor(C.textDim);
            this.contents.fontSize = BoardGameTheme.fonts.bodySize;
            this.drawText("vs " + this._opponentName, 0, 4, w, "right");
            this.resetFontSettings();
        }
    }

    // Right column: opponent portrait, name, and win/loss record.
    class Window_BoardGamePortrait extends Window_Base {
        setup(opponent, gameId) {
            this._opponent = opponent;
            this._gameId = gameId;
            if (opponent && opponent.faceName) {
                ImageManager.loadFace(opponent.faceName);
            }
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            const o = this._opponent;
            if (!o) return;
            const w = this.contentsWidth();
            let y = 0;
            if (o.faceName) {
                const fw = ImageManager.faceWidth;   // 144
                const x = Math.floor((w - fw) / 2);
                this.drawFace(o.faceName, o.faceIndex, Math.max(0, x), y, fw, ImageManager.faceHeight);
                y += ImageManager.faceHeight + 8;
            }
            this.changeTextColor(C.textMain);
            this.drawText(o.name, 0, y, w, "center");
            y += this.lineHeight();
            const rec = BoardGameManager.getRecord(this._gameId, o.id);
            this.changeTextColor(C.textDim);
            this.contents.fontSize = 18;
            this.drawText(`W ${rec.wins}  L ${rec.losses}  D ${rec.draws}`, 0, y, w, "center");
            this.resetFontSettings();
        }
    }

    // Right column below the portrait: game-controlled status lines.
    class Window_BoardGameStatus extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._lines = [];
        }
        setLines(lines) {
            this._lines = lines || [];
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            const w = this.contentsWidth();
            this.changeTextColor(C.textMain);
            this._lines.forEach((line, i) => {
                this.drawText(String(line), 0, i * this.lineHeight(), w, "left");
            });
        }
    }

    // Bottom ticker: taunts and prompts.
    class Window_BoardGameMessage extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._text = "";
        }
        setText(text) {
            this._text = text || "";
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            this.changeTextColor(C.textMain);
            this.drawTextEx(this._text, 4, 0, this.contentsWidth());
        }
    }

    // Centered overlay shown when the match ends.
    class Window_BoardGameResult extends Window_Base {
        setup(result, opponentName, rewardText) {
            this._result = result;
            this._opponentName = opponentName;
            this._rewardText = rewardText || "";
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            const w = this.contentsWidth();
            let color = C.draw;
            let label = "DRAW";
            if (this._result === "win") { color = C.win; label = "VICTORY"; }
            else if (this._result === "lose") { color = C.lose; label = "DEFEAT"; }

            this.contents.fontSize = BoardGameTheme.fonts.resultSize;
            this.changeTextColor(color);
            this.drawText(label, 0, 8, w, "center");
            this.contents.fontSize = BoardGameTheme.fonts.bodySize;

            let y = 8 + BoardGameTheme.fonts.resultSize + 8;
            if (this._rewardText) {
                this.changeTextColor(C.textMain);
                this.drawText(this._rewardText, 0, y, w, "center");
                y += this.lineHeight();
            }
            this.changeTextColor(C.textDim);
            this.contents.fontSize = 18;
            this.drawText("Press OK to continue", 0, y + 4, w, "center");
            this.resetFontSettings();
        }
    }

    // Quit-confirmation command window.
    class Window_BoardGameConfirm extends Window_Command {
        makeCommandList() {
            this.addCommand("Keep Playing", "cancel");
            this.addCommand("Forfeit (counts as a loss)", "forfeit");
        }
    }

    // ========================================================================
    //  Scene_BoardGameBase  —  the shell every game extends
    // ========================================================================
    class Scene_BoardGameBase extends Scene_MenuBase {
        create() {
            super.create();
            this.setupMatch();
            this.createHeaderWindow();
            this.createPortraitWindow();
            this.createStatusWindow();
            this.createMessageWindow();
            this.createConfirmWindow();
            this._finished = false;
            this._resultWindow = null;
            this.onMatchStart();
            this.bringWindowsToFront();
            this.greet();
        }

        // Game board sprites are added with addChild AFTER the window layer is
        // built, so without this they'd cover the panels and, worse, the result
        // and quit-confirm overlays. Re-appending the window layer lifts every
        // window back above any board sprites the game added.
        bringWindowsToFront() {
            if (this._windowLayer) this.addChild(this._windowLayer);
        }

        // --- match context ---------------------------------------------------
        setupMatch() {
            this.match = BoardGameManager.currentMatch || {};
            this.opponent = this.match.opponent || BoardGameManager.getOpponent("");
            this.difficulty = this.match.difficulty || 1;
            this.gameDef = this.match.def || {};
        }

        // Dim the background snapshot for readability.
        createBackground() {
            super.createBackground();
            const dim = new Sprite();
            dim.bitmap = new Bitmap(Graphics.width, Graphics.height);
            dim.bitmap.fillRect(0, 0, Graphics.width, Graphics.height, "rgba(0,0,0,0.55)");
            dim.opacity = 200;
            this.addChild(dim);
        }

        // --- layout ----------------------------------------------------------
        get rightPanelWidth() { return 232; }
        get headerHeight() { return this.calcHeaderHeight(); }
        get messageHeight() { return this.calcWindowHeight(2, false); }
        calcHeaderHeight() { return this.calcWindowHeight(1, false); }

        createHeaderWindow() {
            const rect = new Rectangle(0, 0, Graphics.boxWidth, this.headerHeight);
            this._headerWindow = new Window_BoardGameHeader(rect);
            this.applyPanelStyle(this._headerWindow);
            this._headerWindow.setup(this.gameDef.name || "Board Game", this.opponent.name);
            this.addWindow(this._headerWindow);
        }

        createPortraitWindow() {
            const x = Graphics.boxWidth - this.rightPanelWidth;
            const y = this.headerHeight;
            const h = this.calcWindowHeight(6, false);
            const rect = new Rectangle(x, y, this.rightPanelWidth, h);
            this._portraitWindow = new Window_BoardGamePortrait(rect);
            this.applyPanelStyle(this._portraitWindow);
            this._portraitWindow.setup(this.opponent, this.gameDef.id);
            this.addWindow(this._portraitWindow);
        }

        createStatusWindow() {
            const x = Graphics.boxWidth - this.rightPanelWidth;
            const y = this._portraitWindow.y + this._portraitWindow.height;
            const bottom = Graphics.boxHeight - this.messageHeight;
            const h = Math.max(this.calcWindowHeight(2, false), bottom - y);
            const rect = new Rectangle(x, y, this.rightPanelWidth, h);
            this._statusWindow = new Window_BoardGameStatus(rect);
            this.applyPanelStyle(this._statusWindow);
            this.addWindow(this._statusWindow);
        }

        createMessageWindow() {
            const y = Graphics.boxHeight - this.messageHeight;
            const rect = new Rectangle(0, y, Graphics.boxWidth, this.messageHeight);
            this._messageWindow = new Window_BoardGameMessage(rect);
            this.applyPanelStyle(this._messageWindow);
            this.addWindow(this._messageWindow);
        }

        createConfirmWindow() {
            const w = 360;
            const h = this.calcWindowHeight(2, true);
            const x = Math.floor((Graphics.boxWidth - w) / 2);
            const y = Math.floor((Graphics.boxHeight - h) / 2);
            this._confirmWindow = new Window_BoardGameConfirm(new Rectangle(x, y, w, h));
            this.applyPanelStyle(this._confirmWindow);
            this._confirmWindow.setHandler("cancel", this.closeQuitConfirm.bind(this));
            this._confirmWindow.setHandler("forfeit", this.onForfeit.bind(this));
            this._confirmWindow.hide();
            this._confirmWindow.deactivate();
            this.addWindow(this._confirmWindow);
        }

        // Apply the shared theme tint to a window's background.
        applyPanelStyle(win) {
            win.opacity = 255;
            // A flat themed backdrop instead of the default windowskin frame.
            win.setBackgroundType(0);
        }

        // The free rectangle a game should draw its board into.
        boardAreaRect() {
            const x = 0;
            const y = this.headerHeight + 8;
            const w = Graphics.boxWidth - this.rightPanelWidth - 8;
            const h = Graphics.boxHeight - this.messageHeight - y - 8;
            return new Rectangle(x, y, w, h);
        }

        // --- convenience API for game files ---------------------------------
        showMessage(text) {
            if (this._messageWindow) this._messageWindow.setText(text);
        }
        setStatus(lines) {
            if (this._statusWindow) this._statusWindow.setLines(lines);
        }
        refreshPortrait() {
            if (this._portraitWindow) this._portraitWindow.refresh();
        }
        taunt(kind) {
            const lines = this.opponent.linesFor ? this.opponent.linesFor(kind) : [];
            if (lines && lines.length) {
                this.showMessage(this.opponent.name + ": " + BoardGameAI.pick(lines));
            }
        }
        greet() { this.taunt("greeting"); }

        playSe(kind) {
            switch (kind) {
                case "select": SoundManager.playCursor(); break;
                case "move": SoundManager.playOk(); break;
                case "win": SoundManager.playUseSkill(); break;
                case "lose": SoundManager.playBuzzer(); break;
                case "buzzer": SoundManager.playBuzzer(); break;
                default: SoundManager.playCursor();
            }
        }

        // --- update loop -----------------------------------------------------
        update() {
            super.update();
            if (this._finished) {
                this.updateResult();
                return;
            }
            if (this._confirmWindow && this._confirmWindow.active) {
                return; // confirm window handles its own input
            }
            if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
                this.openQuitConfirm();
                return;
            }
            this.updateGame();
        }

        // Hooks for game files -----------------------------------------------
        onMatchStart() { /* build the board here */ }
        updateGame() { /* per-frame game logic here */ }

        // --- quit / forfeit --------------------------------------------------
        openQuitConfirm() {
            this.playSe("select");
            this.bringWindowsToFront();
            this._confirmWindow.show();
            this._confirmWindow.activate();
            this._confirmWindow.select(0);
        }
        closeQuitConfirm() {
            this._confirmWindow.hide();
            this._confirmWindow.deactivate();
        }
        onForfeit() {
            this._confirmWindow.hide();
            this._confirmWindow.deactivate();
            this.endMatch("lose", { forfeit: true });
        }

        // --- finishing a match ----------------------------------------------
        // result: 'win' | 'lose' | 'draw'
        endMatch(result, opts = {}) {
            if (this._finished) return;
            this._finished = true;
            this.match.result = result;

            const rewardText = this.applyStakes(result);
            BoardGameManager.recordResult(this.gameDef.id, this.opponent.id, result);
            this.writeResultVars(result);
            this.refreshPortrait();

            if (result === "win") this.playSe("win");
            else if (result === "lose") this.playSe("lose");
            else this.playSe("buzzer");

            if (!opts.forfeit) this.taunt(result);
            this.showResultOverlay(result, rewardText);
        }

        applyStakes(result) {
            const parts = [];
            const gold = this.match.wagerGold || 0;
            if (gold > 0) {
                if (result === "win") {
                    $gameParty.gainGold(gold);
                    parts.push("+" + gold + " " + TextManager.currencyUnit);
                } else if (result === "lose") {
                    const pay = Math.min(gold, $gameParty.gold());
                    $gameParty.loseGold(pay);
                    parts.push("-" + pay + " " + TextManager.currencyUnit);
                }
            }
            if (result === "win" && this.match.winItemId > 0) {
                const item = $dataItems[this.match.winItemId];
                if (item) {
                    $gameParty.gainItem(item, this.match.winItemAmount);
                    parts.push("+" + this.match.winItemAmount + " " + item.name);
                }
            }
            return parts.join("   ");
        }

        writeResultVars(result) {
            const code = result === "win" ? 1 : (result === "draw" ? 2 : 0);
            if (this.match.resultVariableId > 0) {
                $gameVariables.setValue(this.match.resultVariableId, code);
            }
            if (this.match.resultSwitchId > 0) {
                $gameSwitches.setValue(this.match.resultSwitchId, result === "win");
            }
        }

        showResultOverlay(result, rewardText) {
            const w = 480;
            const h = this.calcWindowHeight(4, false) + 16;
            const x = Math.floor((Graphics.boxWidth - w) / 2);
            const y = Math.floor((Graphics.boxHeight - h) / 2);
            this._resultWindow = new Window_BoardGameResult(new Rectangle(x, y, w, h));
            this.applyPanelStyle(this._resultWindow);
            this._resultWindow.setup(result, this.opponent.name, rewardText);
            this.addWindow(this._resultWindow);
            this.bringWindowsToFront();
            this._resultReadyFrame = Graphics.frameCount + 20; // brief input lockout
        }

        updateResult() {
            if (Graphics.frameCount < (this._resultReadyFrame || 0)) return;
            if (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered()) {
                this.popScene();
            }
        }
    }

    // Expose the base scene globally so game plugins can extend it.
    window.Scene_BoardGameBase = Scene_BoardGameBase;
    // Expose windows too, in case a game wants to reuse or subclass them.
    window.Window_BoardGameHeader = Window_BoardGameHeader;
    window.Window_BoardGamePortrait = Window_BoardGamePortrait;
    window.Window_BoardGameStatus = Window_BoardGameStatus;
    window.Window_BoardGameMessage = Window_BoardGameMessage;
    window.Window_BoardGameResult = Window_BoardGameResult;

})();
