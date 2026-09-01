//=============================================================================
// CasinoCore.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Foundational framework for casino minigames. Provides a chip
 * economy, a hub menu, a base scene for minigames to extend, shared card/dice/RNG
 * helpers, a cashier, and persistent high-score records.
 * @author You
 * @url
 *
 * @param chipVariableId
 * @text Chip Variable
 * @desc The Game Variable that holds the player's chip balance.
 * @type variable
 * @default 1
 *
 * @param chipUnit
 * @text Chip Unit Label
 * @desc Word/symbol shown next to the chip count (e.g. "Chips").
 * @type string
 * @default Chips
 *
 * @param hubTitle
 * @text Hub Title
 * @desc Text shown at the top of the casino hub menu.
 * @type string
 * @default Casino
 *
 * @param exitName
 * @text Hub Exit Command
 * @desc The command that closes the casino hub.
 * @type string
 * @default Leave Casino
 *
 * @param enableCashier
 * @text Enable Cashier
 * @desc Add a Cashier option to the hub for exchanging gold <-> chips.
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @param cashierName
 * @text Cashier Command
 * @desc The command that opens the cashier.
 * @type string
 * @default Cashier
 *
 * @param chipPriceInGold
 * @text Gold per Chip (Buy)
 * @desc How much gold one chip costs when buying.
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1
 *
 * @param sellReturnRate
 * @text Sell-back Rate
 * @desc Fraction of the buy price returned when selling chips (1 = full, 0.8 = house edge).
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 1
 *
 * @param exchangeDenominations
 * @text Exchange Amounts
 * @desc Comma-separated chip amounts offered at the cashier.
 * @type string
 * @default 10,50,100,500,1000
 *
 * @param betSe
 * @text Bet SE
 * @desc Sound played when a bet is placed. Leave blank for none.
 * @type file
 * @dir audio/se
 * @default
 *
 * @param winSe
 * @text Win SE
 * @desc Sound played on a win. Leave blank for none.
 * @type file
 * @dir audio/se
 * @default
 *
 * @param loseSe
 * @text Lose SE
 * @desc Sound played on a loss. Leave blank for none.
 * @type file
 * @dir audio/se
 * @default
 *
 * @param dealSe
 * @text Deal SE
 * @desc Sound played when dealing cards / rolling. Leave blank for none.
 * @type file
 * @dir audio/se
 * @default
 *
 * @command openCasino
 * @text Open Casino
 * @desc Opens the casino hub menu scene.
 *
 * @command addChips
 * @text Add / Remove Chips
 * @desc Adds (or removes, with a negative number) chips. Clamped at zero.
 * @arg amount
 * @text Amount
 * @type number
 * @min -99999999
 * @default 100
 *
 * @command setChips
 * @text Set Chips
 * @desc Sets the chip balance to an exact value.
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @default 0
 *
 * @help
 * ============================================================================
 * CasinoCore.js  —  Foundation for casino minigames
 * ============================================================================
 *
 * This plugin does NOT add any playable game by itself. It is the shared layer
 * that every minigame plugin (CasinoBlackjack.js, CasinoPoker.js, etc.) sits on
 * top of. It gives you:
 *
 *   • A chip economy backed by a Game Variable, with a safe API.
 *   • A casino hub menu that auto-lists every registered game.
 *   • Scene_CasinoGameBase — the parent class your minigames extend.
 *   • Shared helpers: 52-card Deck, dice rolls, RNG, and casino SE.
 *   • A cashier for exchanging gold <-> chips.
 *   • Persistent, cross-save records (high scores / stats) per game.
 *
 * ----------------------------------------------------------------------------
 * PLUGIN ORDER
 * ----------------------------------------------------------------------------
 * CasinoCore MUST load ABOVE every CasinoXxx minigame plugin in the Plugin
 * Manager list, because the minigames register themselves against it on load.
 *
 * ----------------------------------------------------------------------------
 * OPENING THE CASINO
 * ----------------------------------------------------------------------------
 * From an event, use the Plugin Command "Open Casino", or a Script call:
 *
 *     SceneManager.push(Scene_CasinoHub);
 *
 * ----------------------------------------------------------------------------
 * HOW TO ADD A NEW MINIGAME  (put this in its own file, e.g. CasinoCoinFlip.js)
 * ----------------------------------------------------------------------------
 * A minigame is just a Scene that extends Scene_CasinoGameBase and registers
 * itself. The base class hands you the balance display, betting, payouts, and
 * record-keeping. Minimal template:
 *
 *   (() => {
 *     "use strict";
 *
 *     function Scene_CoinFlip() { this.initialize(...arguments); }
 *     Scene_CoinFlip.prototype = Object.create(Scene_CasinoGameBase.prototype);
 *     Scene_CoinFlip.prototype.constructor = Scene_CoinFlip;
 *
 *     // Build your windows/sprites here. this._balanceWindow already exists.
 *     Scene_CoinFlip.prototype.createGameObjects = function() {
 *       // ...create your own windows / sprites...
 *     };
 *
 *     // Example round logic you'd call from a button/window handler:
 *     Scene_CoinFlip.prototype.playRound = function(wager, guessHeads) {
 *       if (!this.bet(wager)) return;            // deducts chips, false if broke
 *       CasinoCore.se.bet();
 *       const heads = CasinoCore.rng.chance(0.5);
 *       const won = (heads === guessHeads) ? wager * 2 : 0;
 *       if (won > 0) { this.payout(won); CasinoCore.se.win(); }
 *       else { CasinoCore.se.lose(); }
 *       this.recordResult({ wagered: wager, won: won });  // updates stats
 *     };
 *
 *     CasinoCore.registerGame({
 *       key: "coinflip",                 // unique id, used for records
 *       name: "Coin Flip",               // shown in the hub
 *       description: "Double or nothing on a 50/50 toss.",
 *       scene: Scene_CoinFlip,           // the class above
 *       minBet: 5,
 *       maxBet: 1000,                    // 0 = no cap (limited by balance)
 *       unlockSwitchId: 0                // 0 = always available; else Switch id
 *     });
 *
 *     window.Scene_CoinFlip = Scene_CoinFlip; // optional, if others extend it
 *   })();
 *
 * ----------------------------------------------------------------------------
 * API QUICK REFERENCE  (available globally as CasinoCore.*)
 * ----------------------------------------------------------------------------
 *  Chips:
 *    CasinoCore.chips()              -> current balance (Number)
 *    CasinoCore.canAfford(n)         -> Boolean
 *    CasinoCore.gainChips(n)         -> add n chips
 *    CasinoCore.loseChips(n)         -> remove n chips (won't go below 0)
 *    CasinoCore.setChips(n)          -> set exact balance
 *    CasinoCore.bet(n)              -> deducts n, returns false if unaffordable
 *    CasinoCore.payout(n)           -> adds n
 *
 *  Registry / launching:
 *    CasinoCore.registerGame(config)
 *    CasinoCore.availableGames()     -> games whose unlock switch is on
 *    CasinoCore.startGame(key)       -> push that game's scene
 *
 *  RNG:
 *    CasinoCore.rng.int(min,max), .chance(p), .pick(arr), .shuffle(arr)
 *    CasinoCore.rng.rollDie(sides), .rollDice(count, sides)
 *
 *  Cards:
 *    const deck = new CasinoCore.Deck(numDecks, includeJokers);
 *    deck.shuffle(); const card = deck.draw();  // {rank, suit, rankValue, ...}
 *
 *  Records (persist across ALL save files):
 *    CasinoCore.recordResult(key, { wagered, won })
 *    CasinoCore.getRecord(key)       -> { plays, wagered, won, net, biggestWin }
 *
 *  SE:
 *    CasinoCore.se.bet() / .win() / .lose() / .deal()
 *
 * ----------------------------------------------------------------------------
 * The classes Scene_CasinoHub, Scene_CasinoGameBase and Window_ChipBalance are
 * exposed on window.* so your minigame files can extend them.
 * ============================================================================
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "CasinoCore";
    const raw = PluginManager.parameters(PLUGIN_NAME);

    const params = {
        chipVariableId: Number(raw.chipVariableId || 1),
        chipUnit: String(raw.chipUnit || "Chips"),
        hubTitle: String(raw.hubTitle || "Casino"),
        exitName: String(raw.exitName || "Leave Casino"),
        enableCashier: String(raw.enableCashier || "true") === "true",
        cashierName: String(raw.cashierName || "Cashier"),
        chipPriceInGold: Number(raw.chipPriceInGold || 1),
        sellReturnRate: Number(raw.sellReturnRate || 1),
        denominations: String(raw.exchangeDenominations || "10,50,100,500,1000")
            .split(",").map(s => Number(s.trim())).filter(n => n > 0),
        betSe: String(raw.betSe || ""),
        winSe: String(raw.winSe || ""),
        loseSe: String(raw.loseSe || ""),
        dealSe: String(raw.dealSe || "")
    };

    const RECORDS_KEY = "casinoRecords";

    //=========================================================================
    // CasinoCore  —  the global API object
    //=========================================================================
    const CasinoCore = {};
    CasinoCore.params = params;
    CasinoCore.chipUnit = params.chipUnit;
    CasinoCore.exitName = params.exitName;
    CasinoCore.cashierName = params.cashierName;
    CasinoCore.exchangeEnabled = params.enableCashier;
    CasinoCore._registry = [];
    CasinoCore._records = {};
    CasinoCore._pendingGame = null;

    // ---- Chips -------------------------------------------------------------
    CasinoCore.chips = function() {
        if (!$gameVariables) return 0;
        return Math.max(0, Number($gameVariables.value(params.chipVariableId)) || 0);
    };
    CasinoCore.setChips = function(n) {
        if (!$gameVariables) return;
        $gameVariables.setValue(params.chipVariableId, Math.max(0, Math.floor(n)));
    };
    CasinoCore.gainChips = function(n) { this.setChips(this.chips() + Math.floor(n)); };
    CasinoCore.loseChips = function(n) { this.setChips(this.chips() - Math.floor(n)); };
    CasinoCore.canAfford = function(n) { return this.chips() >= Math.floor(n); };
    CasinoCore.bet = function(n) {
        n = Math.floor(n);
        if (n <= 0 || !this.canAfford(n)) return false;
        this.loseChips(n);
        return true;
    };
    CasinoCore.payout = function(n) { this.gainChips(Math.floor(n)); };

    // ---- RNG ---------------------------------------------------------------
    CasinoCore.rng = {
        int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
        chance(p) { return Math.random() < p; },
        pick(arr) { return arr[this.int(0, arr.length - 1)]; },
        shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = this.int(0, i);
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        },
        rollDie(sides = 6) { return this.int(1, sides); },
        rollDice(count = 1, sides = 6) {
            return Array.from({ length: count }, () => this.rollDie(sides));
        }
    };

    // ---- Deck (shared by card games) ---------------------------------------
    const SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"]; // spade heart diamond club
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    CasinoCore.Deck = class Deck {
        constructor(numDecks = 1, includeJokers = false) {
            this.numDecks = numDecks;
            this.includeJokers = includeJokers;
            this.reset();
        }
        reset() {
            this.cards = [];
            for (let d = 0; d < this.numDecks; d++) {
                for (const suit of SUITS) {
                    for (let i = 0; i < RANKS.length; i++) {
                        this.cards.push({
                            rank: RANKS[i],   // "A".."K"
                            suit: suit,       // unicode suit symbol
                            rankIndex: i,     // 0 (A) .. 12 (K)
                            rankValue: i + 1, // A=1 .. K=13 (games remap as needed)
                            isJoker: false
                        });
                    }
                }
                if (this.includeJokers) {
                    this.cards.push({ rank: "Joker", suit: "", rankIndex: -1, rankValue: 0, isJoker: true });
                    this.cards.push({ rank: "Joker", suit: "", rankIndex: -1, rankValue: 0, isJoker: true });
                }
            }
            return this;
        }
        shuffle() { CasinoCore.rng.shuffle(this.cards); return this; }
        draw() { return this.cards.pop(); }
        drawMany(n) { return Array.from({ length: n }, () => this.draw()); }
        get count() { return this.cards.length; }
        static rankLabel(card) { return card.isJoker ? "Joker" : card.rank + card.suit; }
    };

    // ---- Sound effects -----------------------------------------------------
    CasinoCore.playSe = function(name) {
        if (name) AudioManager.playSe({ name, volume: 90, pitch: 100, pan: 0 });
    };
    CasinoCore.se = {
        bet() { CasinoCore.playSe(params.betSe); },
        win() { CasinoCore.playSe(params.winSe); },
        lose() { CasinoCore.playSe(params.loseSe); },
        deal() { CasinoCore.playSe(params.dealSe); }
    };

    // ---- Game registry -----------------------------------------------------
    CasinoCore.registerGame = function(config) {
        if (!config || !config.key || !config.scene) {
            console.warn("CasinoCore.registerGame: a game needs at least { key, scene }.");
            return;
        }
        const entry = Object.assign({
            name: config.key,
            description: "",
            minBet: 1,
            maxBet: 0,        // 0 = no explicit cap
            unlockSwitchId: 0 // 0 = always unlocked
        }, config);
        const idx = this._registry.findIndex(g => g.key === entry.key);
        if (idx >= 0) this._registry[idx] = entry; else this._registry.push(entry);
    };
    CasinoCore.games = function() { return this._registry.slice(); };
    CasinoCore.gameByKey = function(key) { return this._registry.find(g => g.key === key); };
    CasinoCore.availableGames = function() {
        return this._registry.filter(g =>
            !g.unlockSwitchId || ($gameSwitches && $gameSwitches.value(g.unlockSwitchId)));
    };
    CasinoCore.startGame = function(key) {
        const g = this.gameByKey(key);
        if (!g) return;
        this._pendingGame = g;
        SceneManager.push(g.scene);
    };

    // ---- Persistent records (global, across all saves) ---------------------
    CasinoCore.loadRecords = function() {
        try {
            if (StorageManager.exists(RECORDS_KEY)) {
                return StorageManager.loadObject(RECORDS_KEY)
                    .then(data => { CasinoCore._records = data || {}; })
                    .catch(() => { CasinoCore._records = {}; });
            }
        } catch (e) { /* fall through */ }
        CasinoCore._records = {};
        return Promise.resolve();
    };
    CasinoCore.saveRecords = function() {
        try { StorageManager.saveObject(RECORDS_KEY, CasinoCore._records); }
        catch (e) { console.warn("CasinoCore: could not save records.", e); }
    };
    CasinoCore.getRecord = function(key) {
        return CasinoCore._records[key] ||
            { plays: 0, wagered: 0, won: 0, net: 0, biggestWin: 0 };
    };
    CasinoCore.recordResult = function(key, result) {
        const wagered = Math.floor((result && result.wagered) || 0);
        const won = Math.floor((result && result.won) || 0);
        const r = CasinoCore._records[key] ||
            (CasinoCore._records[key] = { plays: 0, wagered: 0, won: 0, net: 0, biggestWin: 0 });
        r.plays += 1;
        r.wagered += wagered;
        r.won += won;
        r.net += (won - wagered);
        if (won > r.biggestWin) r.biggestWin = won;
        CasinoCore.saveRecords();
        return r;
    };

    // Expose the API globally.
    window.CasinoCore = CasinoCore;

    //=========================================================================
    // Plugin commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "openCasino", () => {
        SceneManager.push(Scene_CasinoHub);
    });
    PluginManager.registerCommand(PLUGIN_NAME, "addChips", args => {
        CasinoCore.gainChips(Number(args.amount || 0));
    });
    PluginManager.registerCommand(PLUGIN_NAME, "setChips", args => {
        CasinoCore.setChips(Number(args.amount || 0));
    });

    //=========================================================================
    // Boot hook — load records once the game starts
    //=========================================================================
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        CasinoCore.loadRecords();
    };

    //=========================================================================
    // Window_ChipBalance — shows the current chip balance
    //=========================================================================
    function Window_ChipBalance() { this.initialize(...arguments); }
    Window_ChipBalance.prototype = Object.create(Window_Base.prototype);
    Window_ChipBalance.prototype.constructor = Window_ChipBalance;

    Window_ChipBalance.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_ChipBalance.prototype.refresh = function() {
        this.contents.clear();
        const w = this.innerWidth;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(CasinoCore.chipUnit, 0, 0, w, "left");
        this.resetTextColor();
        this.drawText(String(CasinoCore.chips()), 0, 0, w, "right");
    };
    window.Window_ChipBalance = Window_ChipBalance;

    //=========================================================================
    // Window_GameDescription — help line for the hub
    //=========================================================================
    function Window_GameDescription() { this.initialize(...arguments); }
    Window_GameDescription.prototype = Object.create(Window_Help.prototype);
    Window_GameDescription.prototype.constructor = Window_GameDescription;

    //=========================================================================
    // Window_CasinoGameList — the hub's command list, built from the registry
    //=========================================================================
    function Window_CasinoGameList() { this.initialize(...arguments); }
    Window_CasinoGameList.prototype = Object.create(Window_Command.prototype);
    Window_CasinoGameList.prototype.constructor = Window_CasinoGameList;

    Window_CasinoGameList.prototype.makeCommandList = function() {
        for (const g of CasinoCore.availableGames()) {
            this.addCommand(g.name, "game", true, g.key);
        }
        if (CasinoCore.exchangeEnabled) {
            this.addCommand(CasinoCore.cashierName, "cashier");
        }
        this.addCommand(CasinoCore.exitName, "cancel");
    };
    Window_CasinoGameList.prototype.updateHelp = function() {
        if (!this._helpWindow) return;
        const key = this.currentExt();
        const g = key && CasinoCore.gameByKey(key);
        this._helpWindow.setText(g ? g.description : "");
    };

    //=========================================================================
    // Scene_CasinoHub — the menu players land on
    //=========================================================================
    function Scene_CasinoHub() { this.initialize(...arguments); }
    Scene_CasinoHub.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_CasinoHub.prototype.constructor = Scene_CasinoHub;

    Scene_CasinoHub.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createBalanceWindow();
        this.createDescriptionWindow();
        this.createGameListWindow();
    };
    Scene_CasinoHub.prototype.createBalanceWindow = function() {
        const rect = this.balanceWindowRect();
        this._balanceWindow = new Window_ChipBalance(rect);
        this.addWindow(this._balanceWindow);
    };
    Scene_CasinoHub.prototype.createDescriptionWindow = function() {
        const rect = this.descriptionWindowRect();
        this._descWindow = new Window_GameDescription(rect);
        this.addWindow(this._descWindow);
    };
    Scene_CasinoHub.prototype.createGameListWindow = function() {
        const rect = this.gameListWindowRect();
        this._listWindow = new Window_CasinoGameList(rect);
        this._listWindow.setHelpWindow(this._descWindow);
        this._listWindow.setHandler("game", this.onGameOk.bind(this));
        this._listWindow.setHandler("cashier", this.onCashier.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
        this._listWindow.activate();
        this._listWindow.select(0);
    };
    Scene_CasinoHub.prototype.balanceWindowRect = function() {
        const ww = 360;
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = 0;
        return new Rectangle(wx, wy, ww, wh);
    };
    Scene_CasinoHub.prototype.descriptionWindowRect = function() {
        const wh = this.calcWindowHeight(2, false);
        return new Rectangle(0, Graphics.boxHeight - wh, Graphics.boxWidth, wh);
    };
    Scene_CasinoHub.prototype.gameListWindowRect = function() {
        const ww = 400;
        const top = this.balanceWindowRect().height;
        const bottom = this.descriptionWindowRect().y;
        const wh = Math.min(this.calcWindowHeight(8, true), bottom - top - 24);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = top + Math.max(0, (bottom - top - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
    };
    Scene_CasinoHub.prototype.onGameOk = function() {
        const key = this._listWindow.currentExt();
        CasinoCore.startGame(key);
        // Hub is re-created on return, so balance/list refresh automatically.
    };
    Scene_CasinoHub.prototype.onCashier = function() {
        SceneManager.push(Scene_CasinoCashier);
    };
    window.Scene_CasinoHub = Scene_CasinoHub;

    //=========================================================================
    // Scene_CasinoGameBase — extend THIS for every minigame
    //=========================================================================
    function Scene_CasinoGameBase() { this.initialize(...arguments); }
    Scene_CasinoGameBase.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_CasinoGameBase.prototype.constructor = Scene_CasinoGameBase;

    Scene_CasinoGameBase.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this._gameConfig = CasinoCore._pendingGame || {
            key: "unknown", name: "", minBet: 1, maxBet: 0
        };
        this.createBalanceWindow();
        this.createGameObjects();
    };
    // Suppress the automatic touch cancel button; games control their own exit.
    Scene_CasinoGameBase.prototype.needsCancelButton = function() { return false; };

    Scene_CasinoGameBase.prototype.createBalanceWindow = function() {
        const ww = 360;
        const wh = this.calcWindowHeight(1, true);
        const rect = new Rectangle(Graphics.boxWidth - ww, 0, ww, wh);
        this._balanceWindow = new Window_ChipBalance(rect);
        this.addWindow(this._balanceWindow);
    };

    // Override in subclasses to build your own windows/sprites.
    Scene_CasinoGameBase.prototype.createGameObjects = function() {};

    // ---- Convenience methods for subclasses --------------------------------
    Scene_CasinoGameBase.prototype.gameKey = function() { return this._gameConfig.key; };
    Scene_CasinoGameBase.prototype.chips = function() { return CasinoCore.chips(); };
    Scene_CasinoGameBase.prototype.minBet = function() { return this._gameConfig.minBet || 1; };
    Scene_CasinoGameBase.prototype.maxBet = function() {
        const cap = this._gameConfig.maxBet;
        return cap && cap > 0 ? Math.min(cap, CasinoCore.chips()) : CasinoCore.chips();
    };
    Scene_CasinoGameBase.prototype.bet = function(n) {
        const ok = CasinoCore.bet(n);
        if (ok) this.refreshBalance();
        return ok;
    };
    Scene_CasinoGameBase.prototype.payout = function(n) {
        CasinoCore.payout(n);
        this.refreshBalance();
    };
    Scene_CasinoGameBase.prototype.refreshBalance = function() {
        if (this._balanceWindow) this._balanceWindow.refresh();
    };
    Scene_CasinoGameBase.prototype.recordResult = function(result) {
        return CasinoCore.recordResult(this.gameKey(), result);
    };
    Scene_CasinoGameBase.prototype.returnToHub = function() { this.popScene(); };

    window.Scene_CasinoGameBase = Scene_CasinoGameBase;

    //=========================================================================
    // Cashier — exchange gold <-> chips (only used if enabled)
    //=========================================================================
    function Window_ExchangeAmounts() { this.initialize(...arguments); }
    Window_ExchangeAmounts.prototype = Object.create(Window_Command.prototype);
    Window_ExchangeAmounts.prototype.constructor = Window_ExchangeAmounts;

    Window_ExchangeAmounts.prototype.initialize = function(rect) {
        this._mode = "buy"; // or "sell"
        Window_Command.prototype.initialize.call(this, rect);
    };
    Window_ExchangeAmounts.prototype.setMode = function(mode) {
        this._mode = mode;
        this.refresh();
        this.select(0);
    };
    Window_ExchangeAmounts.prototype.makeCommandList = function() {
        for (const amount of params.denominations) {
            const label = this._mode === "buy"
                ? `Buy ${amount} ${params.chipUnit}  (${Math.ceil(amount * params.chipPriceInGold)}${TextManager.currencyUnit})`
                : `Sell ${amount} ${params.chipUnit}  (+${Math.floor(amount * params.chipPriceInGold * params.sellReturnRate)}${TextManager.currencyUnit})`;
            const enabled = this._mode === "buy"
                ? $gameParty.gold() >= Math.ceil(amount * params.chipPriceInGold)
                : CasinoCore.chips() >= amount;
            this.addCommand(label, "amount", enabled, amount);
        }
        this.addCommand("Back", "cancel");
    };

    function Scene_CasinoCashier() { this.initialize(...arguments); }
    Scene_CasinoCashier.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_CasinoCashier.prototype.constructor = Scene_CasinoCashier;

    Scene_CasinoCashier.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createBalanceWindows();
        this.createModeWindow();
        this.createAmountWindow();
    };
    Scene_CasinoCashier.prototype.createBalanceWindows = function() {
        const wh = this.calcWindowHeight(1, true);
        const half = Graphics.boxWidth / 2;
        this._chipWindow = new Window_ChipBalance(new Rectangle(half, 0, half, wh));
        this.addWindow(this._chipWindow);
        this._goldWindow = new Window_Gold(new Rectangle(0, 0, half, wh));
        this.addWindow(this._goldWindow);
    };
    Scene_CasinoCashier.prototype.createModeWindow = function() {
        const wh = this.calcWindowHeight(3, true);
        const ww = 320;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this.calcWindowHeight(1, true) + 24;
        this._modeWindow = new Window_Command(new Rectangle(wx, wy, ww, wh));
        this._modeWindow.addCommand("Buy Chips", "buy");
        this._modeWindow.addCommand("Sell Chips", "sell");
        this._modeWindow.addCommand("Exit", "cancel");
        this._modeWindow.refresh();
        this._modeWindow.setHandler("buy", this.onMode.bind(this, "buy"));
        this._modeWindow.setHandler("sell", this.onMode.bind(this, "sell"));
        this._modeWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._modeWindow);
        this._modeWindow.select(0);
    };
    Scene_CasinoCashier.prototype.createAmountWindow = function() {
        const ww = 420;
        const wh = this.calcWindowHeight(params.denominations.length + 1, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this._modeWindow.y + this._modeWindow.height + 12;
        this._amountWindow = new Window_ExchangeAmounts(new Rectangle(wx, wy, ww, wh));
        this._amountWindow.setHandler("amount", this.onAmount.bind(this));
        this._amountWindow.setHandler("cancel", this.onAmountCancel.bind(this));
        this._amountWindow.deactivate();
        this._amountWindow.hide();
        this.addWindow(this._amountWindow);
    };
    Scene_CasinoCashier.prototype.onMode = function(mode) {
        this._amountWindow.setMode(mode);
        this._amountWindow.show();
        this._amountWindow.activate();
        this._modeWindow.deactivate();
    };
    Scene_CasinoCashier.prototype.onAmount = function() {
        const amount = this._amountWindow.currentExt();
        if (this._amountWindow._mode === "buy") {
            const cost = Math.ceil(amount * params.chipPriceInGold);
            $gameParty.loseGold(cost);
            CasinoCore.gainChips(amount);
        } else {
            const gain = Math.floor(amount * params.chipPriceInGold * params.sellReturnRate);
            CasinoCore.loseChips(amount);
            $gameParty.gainGold(gain);
        }
        SoundManager.playShop();
        this._goldWindow.refresh();
        this._chipWindow.refresh();
        this._amountWindow.refresh();
        this._amountWindow.activate();
    };
    Scene_CasinoCashier.prototype.onAmountCancel = function() {
        this._amountWindow.deactivate();
        this._amountWindow.hide();
        this._modeWindow.activate();
    };

})();
