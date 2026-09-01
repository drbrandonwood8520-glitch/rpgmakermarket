//=============================================================================
// CashShop_Core.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Simple, customizable Cash Shop. Players spend a premium
 * currency ("Gems") on database items/weapons/armors, and buy Gems through a
 * pluggable real-money payment provider.
 * @author You
 * @url
 *
 * @help
 * ============================================================================
 * CashShop_Core.js
 * ============================================================================
 *
 * IMPORTANT: The filename must stay "CashShop_Core.js" (this name is used to
 * read plugin parameters and register plugin commands).
 *
 * ----------------------------------------------------------------------------
 * WHAT IT DOES
 * ----------------------------------------------------------------------------
 * This plugin adds a "Cash Shop" scene with two kinds of purchases:
 *
 *   1) SHOP ITEMS  - Bought with a PREMIUM CURRENCY (default name: "Gems").
 *                    Each entry points at a database Item / Weapon / Armor by
 *                    ID and grants it to the party. This is 100% in-game and
 *                    involves NO real money.
 *
 *   2) CURRENCY PACKS - Bought with REAL MONEY to grant the player Gems.
 *                       These are the ONLY purchases that touch real money,
 *                       and they go through a "Payment Provider" (see below).
 *
 * This separation is deliberate: it keeps your real-money surface area tiny.
 * You only ever have to secure ONE flow (buying Gems), and everything the
 * player does with those Gems is just normal, safe, offline game logic.
 *
 * ----------------------------------------------------------------------------
 * QUICK SETUP
 * ----------------------------------------------------------------------------
 *   1. Set "Premium Currency Name" / icon and a "Starting Balance" (for
 *      testing, e.g. 500).
 *   2. Add entries to "Shop Items". For each: pick Kind (item/weapon/armor),
 *      the database ID, a Gem price, and a Category label.
 *   3. Add "Currency Packs" (how many Gems each real-money purchase grants).
 *   4. Open the shop from an event with the plugin command "Open Cash Shop".
 *   5. Leave "Payment Provider" on "Mock" while developing — it simulates a
 *      successful purchase instantly so you can test the UI offline.
 *
 * ----------------------------------------------------------------------------
 * PLUGIN COMMANDS
 * ----------------------------------------------------------------------------
 *   Open Cash Shop        - Opens the shop scene. Optionally jump to a category.
 *   Add Premium Currency  - Grants Gems (rewards, testing, promo codes).
 *   Set Premium Currency  - Sets the Gem balance directly.
 *   Get Premium Currency  - Writes the current Gem balance into a variable.
 *   Has Purchased         - Writes to a switch whether an item was bought.
 *
 * ----------------------------------------------------------------------------
 * SCRIPT / DEVELOPER API
 * ----------------------------------------------------------------------------
 * A global "CashShop" object is available:
 *
 *   CashShop.getBalance()             -> Number of Gems the player owns
 *   CashShop.addBalance(n)            -> Grant Gems
 *   CashShop.spend(n)                 -> Try to spend Gems (returns true/false)
 *   CashShop.getPurchaseCount(key)    -> Times an item entry was purchased
 *   CashShop.registerProvider(obj)    -> Plug in your real-money provider
 *
 * You can react to purchases anywhere:
 *
 *   CashShop.onItemPurchased = function(entry) { ... };      // Gem purchases
 *   CashShop.onCurrencyPurchased = function(pack, result) { ... }; // real money
 *
 * ----------------------------------------------------------------------------
 * CONNECTING A REAL PAYMENT PROCESSOR  (READ THIS)
 * ----------------------------------------------------------------------------
 * You CANNOT securely take real money purely inside an RPG Maker game. The game
 * is JavaScript the player can read and modify, so any secret key you embed can
 * be extracted, and any "you paid" flag the client sets itself can be faked.
 *
 * The correct shape is:
 *
 *   GAME (client)  ->  YOUR BACKEND SERVER  ->  Payment processor (Stripe, etc.)
 *
 *   1. Game asks your server to start a purchase for a pack SKU.
 *   2. Server creates the checkout with the processor (using its SECRET key,
 *      which lives ONLY on the server) and returns a checkout URL / session id.
 *   3. Player pays in that checkout (browser / external window).
 *   4. The processor calls YOUR SERVER via a webhook to confirm payment.
 *   5. Your server credits Gems to that player's account.
 *   6. The game refreshes its balance FROM your server. The client never
 *      decides how many Gems were granted.
 *
 * Because Gems must be tied to a player who might come back later, refund, or
 * play on another device, a real-money shop almost always needs player accounts
 * / login. That is a server concern, not a plugin concern.
 *
 * Platform rules also apply and are NOT optional:
 *   - iOS / Android: selling digital goods generally REQUIRES the platform's
 *     own in-app purchase system (StoreKit / Google Play Billing). You can't
 *     just use Stripe/PayPal for digital items in a store app.
 *   - Steam: use Steam's Microtransaction (MicroTxn) API, not a raw processor.
 *   - Desktop builds you sell yourself (itch.io, your own site): a processor
 *     like Stripe + a backend is fine.
 *
 * This plugin gives you a clean "provider" seam so you can drop your backend
 * integration in without touching the shop UI. A commented HTTP provider
 * template is included at the bottom of this file.
 *
 * ============================================================================
 *
 * @param ---General---
 * @default
 *
 * @param premiumCurrencyName
 * @parent ---General---
 * @text Premium Currency Name
 * @desc The display name of the premium currency (e.g. Gems, Crystals, Coins).
 * @default Gems
 *
 * @param premiumCurrencyIcon
 * @parent ---General---
 * @text Premium Currency Icon
 * @type number
 * @min 0
 * @desc Icon index (from your IconSet) shown next to the balance and prices.
 * @default 87
 *
 * @param startingBalance
 * @parent ---General---
 * @text Starting Balance
 * @type number
 * @min 0
 * @desc How many premium currency units a NEW GAME starts with. Use for testing.
 * @default 0
 *
 * @param shopTitle
 * @parent ---General---
 * @text Shop Title
 * @desc Title shown at the top of the cash shop scene.
 * @default Cash Shop
 *
 * @param ---Catalog---
 * @default
 *
 * @param shopItems
 * @parent ---Catalog---
 * @text Shop Items
 * @type struct<ShopItem>[]
 * @desc Items sold for premium currency. Each points at a database entry.
 * @default []
 *
 * @param currencyPacks
 * @parent ---Catalog---
 * @text Currency Packs
 * @type struct<CurrencyPack>[]
 * @desc Real-money packs that grant premium currency. Shown in the "Buy" tab.
 * @default []
 *
 * @param buyCurrencyTabName
 * @parent ---Catalog---
 * @text "Buy Currency" Tab Name
 * @desc Category name for the tab that lists real-money currency packs.
 * @default Buy Gems
 *
 * @param ---Payments---
 * @default
 *
 * @param providerName
 * @parent ---Payments---
 * @text Payment Provider
 * @type select
 * @option Mock (offline test - instantly succeeds)
 * @value Mock
 * @option HTTP (talk to your own backend)
 * @value HTTP
 * @option Custom (registered via script)
 * @value Custom
 * @desc How real-money currency-pack purchases are processed. Keep on Mock while building.
 * @default Mock
 *
 * @param backendBaseUrl
 * @parent ---Payments---
 * @text Backend Base URL
 * @desc Used by the HTTP provider only. Your server, e.g. https://api.yourgame.com
 * @default
 *
 * @param ---Text---
 * @default
 *
 * @param textBuy
 * @parent ---Text---
 * @text "Buy" Label
 * @default Buy
 *
 * @param textCancel
 * @parent ---Text---
 * @text "Cancel" Label
 * @default Cancel
 *
 * @param textOwned
 * @parent ---Text---
 * @text "Owned" Label
 * @default Owned
 *
 * @param textSoldOut
 * @parent ---Text---
 * @text "Sold Out" Label
 * @desc Shown when a per-item purchase limit has been reached.
 * @default Sold Out
 *
 * @param textProcessing
 * @parent ---Text---
 * @text "Processing" Message
 * @default Processing purchase...
 *
 * @param textPurchaseSuccess
 * @parent ---Text---
 * @text Success Message
 * @default Purchase complete!
 *
 * @param textPurchaseFailed
 * @parent ---Text---
 * @text Failure Message
 * @default Purchase could not be completed.
 *
 * @command openShop
 * @text Open Cash Shop
 * @desc Opens the cash shop scene.
 *
 * @arg startCategory
 * @text Start Category
 * @desc Optional category name to open on. Leave blank for the first tab.
 * @default
 *
 * @command addCurrency
 * @text Add Premium Currency
 * @desc Grants premium currency to the player.
 *
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @default 0
 *
 * @command setCurrency
 * @text Set Premium Currency
 * @desc Sets the player's premium currency balance to an exact value.
 *
 * @arg amount
 * @text Amount
 * @type number
 * @min 0
 * @default 0
 *
 * @command getCurrency
 * @text Get Premium Currency
 * @desc Writes the current premium currency balance into a game variable.
 *
 * @arg variableId
 * @text Variable
 * @type variable
 * @default 0
 *
 * @command hasPurchased
 * @text Has Purchased
 * @desc Writes to a switch whether a given item entry has been purchased.
 *
 * @arg kind
 * @text Kind
 * @type select
 * @option item
 * @option weapon
 * @option armor
 * @default item
 *
 * @arg databaseId
 * @text Database ID
 * @type number
 * @min 1
 * @default 1
 *
 * @arg switchId
 * @text Switch
 * @type switch
 * @default 0
 */
/*~struct~ShopItem:
 * @param name
 * @text Display Name
 * @desc Optional. Overrides the database name shown in the shop. Leave blank to use the database name.
 * @default
 *
 * @param category
 * @text Category
 * @desc Tab this item appears under (e.g. Weapons, Consumables, Cosmetics).
 * @default General
 *
 * @param kind
 * @text Kind
 * @type select
 * @option item
 * @option weapon
 * @option armor
 * @desc Which database this entry comes from.
 * @default item
 *
 * @param databaseId
 * @text Database ID
 * @type number
 * @min 1
 * @desc The ID of the item/weapon/armor in the database.
 * @default 1
 *
 * @param quantity
 * @text Quantity Granted
 * @type number
 * @min 1
 * @desc How many of the item the player receives per purchase.
 * @default 1
 *
 * @param price
 * @text Price (Premium Currency)
 * @type number
 * @min 0
 * @desc Cost in premium currency (Gems).
 * @default 10
 *
 * @param iconIndex
 * @text Icon Override
 * @type number
 * @min 0
 * @desc 0 = use the database icon. Otherwise this icon index is shown instead.
 * @default 0
 *
 * @param description
 * @text Description
 * @desc Shown in the detail panel. Leave blank to use the database description.
 * @default
 *
 * @param purchaseLimit
 * @text Purchase Limit
 * @type number
 * @min 0
 * @desc Max times this can be bought (0 = unlimited). Great for one-time unlocks.
 * @default 0
 *
 * @param commonEventId
 * @text Common Event On Purchase
 * @type common_event
 * @desc Optional common event reserved after a successful purchase (unlocks, cutscenes, flags).
 * @default 0
 */
/*~struct~CurrencyPack:
 * @param name
 * @text Display Name
 * @desc Name shown on the pack (e.g. "Handful of Gems").
 * @default Gem Pack
 *
 * @param sku
 * @text SKU / Product ID
 * @desc Stable identifier your backend/store uses for this product. Used to track purchases.
 * @default gems_small
 *
 * @param currencyAmount
 * @text Gems Granted
 * @type number
 * @min 1
 * @desc Base premium currency granted by this pack.
 * @default 100
 *
 * @param bonusAmount
 * @text Bonus Gems
 * @type number
 * @min 0
 * @desc Extra gems (for "best value" packs). Shown as +bonus.
 * @default 0
 *
 * @param priceLabel
 * @text Price Label
 * @desc DISPLAY ONLY, e.g. "$4.99". The real charged price is enforced by your backend/store, never here.
 * @default $4.99
 *
 * @param iconIndex
 * @text Icon
 * @type number
 * @min 0
 * @default 87
 */

var Imported = Imported || {};
Imported.CashShop_Core = true;

var CashShop = CashShop || {};

(() => {
    "use strict";

    // Derive the plugin name from the actual filename so params/commands match.
    const pluginName = (() => {
        try {
            const src = document.currentScript.src;
            return decodeURIComponent(src.match(/([^/]+)\.js$/)[1]);
        } catch (e) {
            return "CashShop_Core";
        }
    })();

    const raw = PluginManager.parameters(pluginName);

    const parseStructArray = (json) => {
        try {
            return JSON.parse(json || "[]").map((s) => JSON.parse(s));
        } catch (e) {
            console.error("CashShop: failed to parse struct array", e);
            return [];
        }
    };

    //---------------------------------------------------------------------
    // Parsed parameters
    //---------------------------------------------------------------------
    CashShop.params = {
        currencyName: String(raw.premiumCurrencyName || "Gems"),
        currencyIcon: Number(raw.premiumCurrencyIcon || 87),
        startingBalance: Number(raw.startingBalance || 0),
        shopTitle: String(raw.shopTitle || "Cash Shop"),
        buyCurrencyTabName: String(raw.buyCurrencyTabName || "Buy Gems"),
        providerName: String(raw.providerName || "Mock"),
        backendBaseUrl: String(raw.backendBaseUrl || ""),
        text: {
            buy: String(raw.textBuy || "Buy"),
            cancel: String(raw.textCancel || "Cancel"),
            owned: String(raw.textOwned || "Owned"),
            soldOut: String(raw.textSoldOut || "Sold Out"),
            processing: String(raw.textProcessing || "Processing purchase..."),
            success: String(raw.textPurchaseSuccess || "Purchase complete!"),
            failed: String(raw.textPurchaseFailed || "Purchase could not be completed."),
        },
    };

    CashShop.shopItems = parseStructArray(raw.shopItems).map((it) => ({
        name: String(it.name || ""),
        category: String(it.category || "General"),
        kind: String(it.kind || "item"),
        databaseId: Number(it.databaseId || 1),
        quantity: Number(it.quantity || 1),
        price: Number(it.price || 0),
        iconIndex: Number(it.iconIndex || 0),
        description: String(it.description || ""),
        purchaseLimit: Number(it.purchaseLimit || 0),
        commonEventId: Number(it.commonEventId || 0),
    }));

    CashShop.currencyPacks = parseStructArray(raw.currencyPacks).map((p) => ({
        name: String(p.name || "Gem Pack"),
        sku: String(p.sku || "gems"),
        currencyAmount: Number(p.currencyAmount || 100),
        bonusAmount: Number(p.bonusAmount || 0),
        priceLabel: String(p.priceLabel || "$0.00"),
        iconIndex: Number(p.iconIndex || CashShop.params.currencyIcon),
    }));

    //---------------------------------------------------------------------
    // State + persistence
    //---------------------------------------------------------------------
    CashShop._balance = 0;
    CashShop._purchases = {}; // key -> count

    // Stable key for an item entry (used for purchase-limit tracking).
    // Note: keyed by kind+databaseId, so two entries for the same database
    // object share a purchase count. Fine for typical use.
    CashShop.itemKey = function (entry) {
        return entry.kind + ":" + entry.databaseId;
    };

    CashShop.setup = function () {
        this._balance = this.params.startingBalance;
        this._purchases = {};
    };

    CashShop.saveData = function () {
        return { balance: this._balance, purchases: this._purchases };
    };

    CashShop.loadData = function (data) {
        if (!data) {
            this.setup();
            return;
        }
        this._balance = Number(data.balance || 0);
        this._purchases = data.purchases || {};
    };

    //---------------------------------------------------------------------
    // Balance API
    //---------------------------------------------------------------------
    CashShop.getBalance = function () {
        return this._balance;
    };

    CashShop.addBalance = function (n) {
        this._balance = Math.max(0, this._balance + Math.floor(n));
        return this._balance;
    };

    CashShop.setBalance = function (n) {
        this._balance = Math.max(0, Math.floor(n));
        return this._balance;
    };

    CashShop.canAfford = function (price) {
        return this._balance >= price;
    };

    CashShop.spend = function (n) {
        if (!this.canAfford(n)) return false;
        this._balance -= n;
        return true;
    };

    //---------------------------------------------------------------------
    // Purchase tracking / limits
    //---------------------------------------------------------------------
    CashShop.getPurchaseCount = function (key) {
        return this._purchases[key] || 0;
    };

    CashShop.incrementPurchaseCount = function (key) {
        this._purchases[key] = this.getPurchaseCount(key) + 1;
    };

    CashShop.isSoldOut = function (entry) {
        if (!entry.purchaseLimit) return false;
        return this.getPurchaseCount(this.itemKey(entry)) >= entry.purchaseLimit;
    };

    //---------------------------------------------------------------------
    // Database lookup helpers
    //---------------------------------------------------------------------
    CashShop.databaseObject = function (entry) {
        switch (entry.kind) {
            case "weapon": return $dataWeapons[entry.databaseId];
            case "armor":  return $dataArmors[entry.databaseId];
            default:       return $dataItems[entry.databaseId];
        }
    };

    CashShop.displayName = function (entry) {
        if (entry.name) return entry.name;
        const obj = this.databaseObject(entry);
        return obj ? obj.name : "(missing #" + entry.databaseId + ")";
    };

    CashShop.displayIcon = function (entry) {
        if (entry.iconIndex) return entry.iconIndex;
        const obj = this.databaseObject(entry);
        return obj ? obj.iconIndex : 0;
    };

    CashShop.displayDescription = function (entry) {
        if (entry.description) return entry.description;
        const obj = this.databaseObject(entry);
        return obj ? obj.description : "";
    };

    //---------------------------------------------------------------------
    // Categories
    //---------------------------------------------------------------------
    CashShop.categories = function () {
        const cats = [];
        for (const item of this.shopItems) {
            if (!cats.includes(item.category)) cats.push(item.category);
        }
        // The real-money tab always comes last.
        if (this.currencyPacks.length > 0) cats.push(this.params.buyCurrencyTabName);
        return cats;
    };

    CashShop.isCurrencyTab = function (category) {
        return category === this.params.buyCurrencyTabName;
    };

    CashShop.entriesForCategory = function (category) {
        if (this.isCurrencyTab(category)) return this.currencyPacks.slice();
        return this.shopItems.filter((it) => it.category === category);
    };

    //---------------------------------------------------------------------
    // Executing purchases
    //---------------------------------------------------------------------

    // Optional hooks a developer can override.
    CashShop.onItemPurchased = null;      // function(entry)
    CashShop.onCurrencyPurchased = null;  // function(pack, result)

    // Buy a Gem-priced item. Synchronous. Returns true on success.
    CashShop.purchaseItem = function (entry) {
        if (this.isSoldOut(entry)) return false;
        if (!this.canAfford(entry.price)) return false;
        if (!this.spend(entry.price)) return false;

        const obj = this.databaseObject(entry);
        if (obj) $gameParty.gainItem(obj, entry.quantity);

        this.incrementPurchaseCount(this.itemKey(entry));

        if (entry.commonEventId > 0) {
            $gameTemp.reserveCommonEvent(entry.commonEventId);
        }
        if (typeof this.onItemPurchased === "function") {
            this.onItemPurchased(entry);
        }
        return true;
    };

    // Buy a real-money currency pack. ASYNC via the active provider.
    // Resolves to { success, grantedCurrency, message }.
    CashShop.purchaseCurrencyPack = async function (pack) {
        const provider = this.provider();
        let result;
        try {
            result = await provider.purchaseCurrencyPack(pack);
        } catch (e) {
            console.error("CashShop: provider error", e);
            result = { success: false, grantedCurrency: 0, message: String(e && e.message || e) };
        }

        if (result && result.success) {
            // The AMOUNT credited should ultimately be authoritative from your
            // backend. The provider returns grantedCurrency for local crediting
            // (and the Mock provider computes it from the pack). A real HTTP
            // provider should return the amount the SERVER confirmed.
            const granted = Number(result.grantedCurrency || 0);
            this.addBalance(granted);
            this.incrementPurchaseCount("pack:" + pack.sku);
            if (typeof this.onCurrencyPurchased === "function") {
                this.onCurrencyPurchased(pack, result);
            }
        }
        return result || { success: false, grantedCurrency: 0, message: "No result" };
    };

    //---------------------------------------------------------------------
    // Payment provider seam
    //---------------------------------------------------------------------
    CashShop._customProvider = null;

    CashShop.registerProvider = function (providerObject) {
        this._customProvider = providerObject;
    };

    CashShop.provider = function () {
        switch (this.params.providerName) {
            case "Custom":
                return this._customProvider || CashShop.MockProvider;
            case "HTTP":
                return CashShop.HttpProvider;
            case "Mock":
            default:
                return CashShop.MockProvider;
        }
    };

    // --- Mock provider: offline testing. Instantly "succeeds". ---
    CashShop.MockProvider = {
        async purchaseCurrencyPack(pack) {
            await new Promise((r) => setTimeout(r, 600)); // fake network delay
            return {
                success: true,
                grantedCurrency: pack.currencyAmount + pack.bonusAmount,
                message: "mock",
            };
        },
    };

    //=====================================================================
    // Plugin commands
    //=====================================================================
    PluginManager.registerCommand(pluginName, "openShop", (args) => {
        SceneManager.push(Scene_CashShop);
        Scene_CashShop._pendingStartCategory = String(args.startCategory || "");
    });

    PluginManager.registerCommand(pluginName, "addCurrency", (args) => {
        CashShop.addBalance(Number(args.amount || 0));
    });

    PluginManager.registerCommand(pluginName, "setCurrency", (args) => {
        CashShop.setBalance(Number(args.amount || 0));
    });

    PluginManager.registerCommand(pluginName, "getCurrency", (args) => {
        const id = Number(args.variableId || 0);
        if (id > 0) $gameVariables.setValue(id, CashShop.getBalance());
    });

    PluginManager.registerCommand(pluginName, "hasPurchased", (args) => {
        const id = Number(args.switchId || 0);
        if (id <= 0) return;
        const key = String(args.kind || "item") + ":" + Number(args.databaseId || 1);
        $gameSwitches.setValue(id, CashShop.getPurchaseCount(key) > 0);
    });

    //=====================================================================
    // Save/Load integration
    //=====================================================================
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DataManager_createGameObjects.call(this);
        CashShop.setup();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.cashShop = CashShop.saveData();
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DataManager_extractSaveContents.call(this, contents);
        CashShop.loadData(contents.cashShop);
    };

    //=====================================================================
    // Window: Balance
    //=====================================================================
    function Window_CashShopBalance() {
        this.initialize(...arguments);
    }
    Window_CashShopBalance.prototype = Object.create(Window_Base.prototype);
    Window_CashShopBalance.prototype.constructor = Window_CashShopBalance;

    Window_CashShopBalance.prototype.refresh = function () {
        const rect = this.baseTextRect();
        this.contents.clear();

        // Left: shop title.
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(CashShop.params.shopTitle, rect.x, rect.y, rect.width, "left");
        this.resetTextColor();

        // Right: balance with icon.
        const value = CashShop.getBalance().toLocaleString();
        const iconW = ImageManager.iconWidth + 4;
        const valueW = this.textWidth(value);
        const totalW = iconW + valueW;
        const x = rect.x + rect.width - totalW;
        this.drawIcon(CashShop.params.currencyIcon, x, rect.y + 2);
        this.drawText(value, x + iconW, rect.y, valueW, "left");
    };

    //=====================================================================
    // Window: Category tabs
    //=====================================================================
    function Window_CashShopCategory() {
        this.initialize(...arguments);
    }
    Window_CashShopCategory.prototype = Object.create(Window_HorzCommand.prototype);
    Window_CashShopCategory.prototype.constructor = Window_CashShopCategory;

    Window_CashShopCategory.prototype.maxCols = function () {
        return Math.max(1, Math.min(4, CashShop.categories().length));
    };

    Window_CashShopCategory.prototype.makeCommandList = function () {
        for (const cat of CashShop.categories()) {
            this.addCommand(cat, "category", true, cat);
        }
    };

    Window_CashShopCategory.prototype.currentCategory = function () {
        return this.currentExt();
    };

    //=====================================================================
    // Window: Item / pack list
    //=====================================================================
    function Window_CashShopList() {
        this.initialize(...arguments);
    }
    Window_CashShopList.prototype = Object.create(Window_Selectable.prototype);
    Window_CashShopList.prototype.constructor = Window_CashShopList;

    Window_CashShopList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._category = "";
        this._data = [];
        this._detailWindow = null;
    };

    Window_CashShopList.prototype.setCategory = function (category) {
        if (this._category === category) return;
        this._category = category;
        this.refresh();
        this.scrollTo(0, 0);
    };

    Window_CashShopList.prototype.setDetailWindow = function (win) {
        this._detailWindow = win;
        this.callUpdateHelp();
    };

    Window_CashShopList.prototype.isCurrencyTab = function () {
        return CashShop.isCurrencyTab(this._category);
    };

    Window_CashShopList.prototype.maxItems = function () {
        return this._data ? this._data.length : 0;
    };

    Window_CashShopList.prototype.item = function () {
        return this._data[this.index()];
    };

    Window_CashShopList.prototype.isEnabled = function (entry) {
        if (!entry) return false;
        if (this.isCurrencyTab()) return true; // packs are always buyable
        if (CashShop.isSoldOut(entry)) return false;
        return CashShop.canAfford(entry.price);
    };

    Window_CashShopList.prototype.isCurrentItemEnabled = function () {
        return this.isEnabled(this.item());
    };

    Window_CashShopList.prototype.makeItemList = function () {
        this._data = CashShop.entriesForCategory(this._category);
    };

    Window_CashShopList.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    Window_CashShopList.prototype.drawItem = function (index) {
        const entry = this._data[index];
        if (!entry) return;
        const rect = this.itemLineRect(index);
        const enabled = this.isEnabled(entry);
        this.changePaintOpacity(enabled);

        if (this.isCurrencyTab()) {
            this.drawPackRow(entry, rect);
        } else {
            this.drawItemRow(entry, rect);
        }
        this.changePaintOpacity(true);
    };

    Window_CashShopList.prototype.drawItemRow = function (entry, rect) {
        const iconW = ImageManager.iconWidth + 4;
        this.drawIcon(CashShop.displayIcon(entry), rect.x, rect.y + 2);
        const nameX = rect.x + iconW;

        // Reserve space on the right for the price.
        const priceText = entry.price.toLocaleString();
        const priceW = this.textWidth(priceText) + ImageManager.iconWidth + 6;
        const nameW = rect.width - iconW - priceW - 4;

        this.resetTextColor();
        this.drawText(CashShop.displayName(entry), nameX, rect.y, nameW, "left");

        if (CashShop.isSoldOut(entry)) {
            this.changeTextColor(ColorManager.deathColor());
            this.drawText(CashShop.params.text.soldOut, rect.x + rect.width - priceW, rect.y, priceW, "right");
            this.resetTextColor();
        } else {
            const px = rect.x + rect.width - priceW;
            this.drawIcon(CashShop.params.currencyIcon, px, rect.y + 2);
            this.drawText(priceText, px + ImageManager.iconWidth + 2, rect.y, priceW - ImageManager.iconWidth - 2, "left");
        }
    };

    Window_CashShopList.prototype.drawPackRow = function (pack, rect) {
        const iconW = ImageManager.iconWidth + 4;
        this.drawIcon(pack.iconIndex, rect.x, rect.y + 2);

        const priceW = this.textWidth(pack.priceLabel) + 8;
        const nameW = rect.width - iconW - priceW - 4;

        // Name + gem amount.
        let label = pack.name + "  (" + pack.currencyAmount.toLocaleString();
        if (pack.bonusAmount > 0) label += " +" + pack.bonusAmount.toLocaleString();
        label += ")";
        this.resetTextColor();
        this.drawText(label, rect.x + iconW, rect.y, nameW, "left");

        // Real price label.
        this.changeTextColor(ColorManager.powerUpColor());
        this.drawText(pack.priceLabel, rect.x + rect.width - priceW, rect.y, priceW, "right");
        this.resetTextColor();
    };

    Window_CashShopList.prototype.callUpdateHelp = function () {
        if (this.active && this._detailWindow) {
            this._detailWindow.setEntry(this.item(), this.isCurrencyTab());
        }
    };

    //=====================================================================
    // Window: Detail panel
    //=====================================================================
    function Window_CashShopDetail() {
        this.initialize(...arguments);
    }
    Window_CashShopDetail.prototype = Object.create(Window_Base.prototype);
    Window_CashShopDetail.prototype.constructor = Window_CashShopDetail;

    Window_CashShopDetail.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._entry = null;
        this._isPack = false;
        this._message = "";
    };

    Window_CashShopDetail.prototype.setEntry = function (entry, isPack) {
        this._entry = entry;
        this._isPack = isPack;
        this._message = "";
        this.refresh();
    };

    Window_CashShopDetail.prototype.showMessage = function (text) {
        this._message = text;
        this.refresh();
    };

    Window_CashShopDetail.prototype.refresh = function () {
        this.contents.clear();
        const rect = this.baseTextRect();
        let y = rect.y;
        const lh = this.lineHeight();

        if (this._message) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawTextEx(this._message, rect.x, y, rect.width);
            this.resetTextColor();
            return;
        }

        const entry = this._entry;
        if (!entry) return;

        if (this._isPack) {
            this.drawIcon(entry.iconIndex, rect.x, y + 2);
            this.drawText(entry.name, rect.x + ImageManager.iconWidth + 6, y, rect.width, "left");
            y += lh * 1.6;

            this.changeTextColor(ColorManager.systemColor());
            this.drawText("Grants:", rect.x, y, rect.width, "left");
            this.resetTextColor();
            let grant = entry.currencyAmount.toLocaleString() + " " + CashShop.params.currencyName;
            if (entry.bonusAmount > 0) grant += " (+" + entry.bonusAmount.toLocaleString() + " bonus)";
            this.drawText(grant, rect.x, y + lh, rect.width, "left");
            y += lh * 2.4;

            this.changeTextColor(ColorManager.systemColor());
            this.drawText("Price:", rect.x, y, rect.width, "left");
            this.resetTextColor();
            this.drawText(entry.priceLabel, rect.x + 90, y, rect.width - 90, "left");
            return;
        }

        // Regular shop item.
        this.drawIcon(CashShop.displayIcon(entry), rect.x, y + 2);
        this.drawText(CashShop.displayName(entry), rect.x + ImageManager.iconWidth + 6, y, rect.width, "left");
        y += lh * 1.6;

        const desc = CashShop.displayDescription(entry);
        if (desc) {
            this.drawTextEx(desc, rect.x, y, rect.width);
            y += lh * 2.4;
        }

        // Price line.
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Price:", rect.x, y, 90, "left");
        this.resetTextColor();
        this.drawIcon(CashShop.params.currencyIcon, rect.x + 90, y + 2);
        this.drawText(entry.price.toLocaleString(), rect.x + 90 + ImageManager.iconWidth + 4, y, rect.width, "left");
        y += lh * 1.2;

        if (entry.quantity > 1) {
            this.drawText("Quantity: x" + entry.quantity, rect.x, y, rect.width, "left");
            y += lh * 1.2;
        }

        const owned = CashShop.getPurchaseCount(CashShop.itemKey(entry));
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(CashShop.params.text.owned + ":", rect.x, y, 120, "left");
        this.resetTextColor();
        let ownText = String(owned);
        if (entry.purchaseLimit > 0) ownText += " / " + entry.purchaseLimit;
        this.drawText(ownText, rect.x + 120, y, rect.width - 120, "left");
    };

    //=====================================================================
    // Window: Buy / Cancel confirmation
    //=====================================================================
    function Window_CashShopConfirm() {
        this.initialize(...arguments);
    }
    Window_CashShopConfirm.prototype = Object.create(Window_Command.prototype);
    Window_CashShopConfirm.prototype.constructor = Window_CashShopConfirm;

    Window_CashShopConfirm.prototype.makeCommandList = function () {
        this.addCommand(CashShop.params.text.buy, "buy");
        this.addCommand(CashShop.params.text.cancel, "cancel");
    };

    //=====================================================================
    // Scene: Cash Shop
    //=====================================================================
    function Scene_CashShop() {
        this.initialize(...arguments);
    }
    Scene_CashShop.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_CashShop.prototype.constructor = Scene_CashShop;

    Scene_CashShop._pendingStartCategory = "";

    Scene_CashShop.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createBalanceWindow();
        this.createCategoryWindow();
        this.createDetailWindow();
        this.createListWindow();
        this.createConfirmWindow();
        this.applyStartCategory();
    };

    Scene_CashShop.prototype.applyStartCategory = function () {
        const target = Scene_CashShop._pendingStartCategory;
        Scene_CashShop._pendingStartCategory = "";
        if (target) {
            const idx = CashShop.categories().indexOf(target);
            if (idx >= 0) this._categoryWindow.select(idx);
        }
        this._categoryWindow.activate();
        this.onCategoryChange();
    };

    Scene_CashShop.prototype.balanceWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, false);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_CashShop.prototype.categoryWindowRect = function () {
        const wx = 0;
        const wy = this._balanceWindow.y + this._balanceWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_CashShop.prototype.listWindowRect = function () {
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const ww = Math.floor(Graphics.boxWidth * 0.55);
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_CashShop.prototype.detailWindowRect = function () {
        const wx = Math.floor(Graphics.boxWidth * 0.55);
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const ww = Graphics.boxWidth - wx;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_CashShop.prototype.confirmWindowRect = function () {
        const ww = 240;
        const wh = this.calcWindowHeight(2, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_CashShop.prototype.createBalanceWindow = function () {
        this._balanceWindow = new Window_CashShopBalance(this.balanceWindowRect());
        this.addWindow(this._balanceWindow);
    };

    Scene_CashShop.prototype.createCategoryWindow = function () {
        this._categoryWindow = new Window_CashShopCategory(this.categoryWindowRect());
        this._categoryWindow.setHandler("category", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this._categoryWindow.setHandler("pageup", this.onCategoryChange.bind(this));
        this._categoryWindow.setHandler("pagedown", this.onCategoryChange.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_CashShop.prototype.createDetailWindow = function () {
        this._detailWindow = new Window_CashShopDetail(this.detailWindowRect());
        this.addWindow(this._detailWindow);
    };

    Scene_CashShop.prototype.createListWindow = function () {
        this._listWindow = new Window_CashShopList(this.listWindowRect());
        this._listWindow.setHandler("ok", this.onListOk.bind(this));
        this._listWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._listWindow.setDetailWindow(this._detailWindow);
        this.addWindow(this._listWindow);
    };

    Scene_CashShop.prototype.createConfirmWindow = function () {
        this._confirmWindow = new Window_CashShopConfirm(this.confirmWindowRect());
        this._confirmWindow.setHandler("buy", this.onConfirmBuy.bind(this));
        this._confirmWindow.setHandler("cancel", this.onConfirmCancel.bind(this));
        this._confirmWindow.openness = 0;
        this._confirmWindow.deactivate();
        this.addWindow(this._confirmWindow);
    };

    // Called when the highlighted category changes (arrow keys move selection).
    Scene_CashShop.prototype.onCategoryChange = function () {
        const cat = this._categoryWindow.currentCategory();
        this._listWindow.setCategory(cat);
    };

    Scene_CashShop.prototype.update = function () {
        Scene_MenuBase.prototype.update.call(this);
        // Keep the list synced to the highlighted category while browsing tabs.
        if (this._categoryWindow.active) {
            const cat = this._categoryWindow.currentCategory();
            if (cat && this._listWindow._category !== cat) {
                this._listWindow.setCategory(cat);
            }
        }
    };

    Scene_CashShop.prototype.onCategoryOk = function () {
        this._listWindow.setCategory(this._categoryWindow.currentCategory());
        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_CashShop.prototype.onListCancel = function () {
        this._listWindow.deselect();
        this._categoryWindow.activate();
    };

    Scene_CashShop.prototype.onListOk = function () {
        this.openConfirm();
    };

    Scene_CashShop.prototype.openConfirm = function () {
        this._confirmWindow.select(0);
        this._confirmWindow.open();
        this._confirmWindow.activate();
    };

    Scene_CashShop.prototype.closeConfirm = function () {
        this._confirmWindow.close();
        this._confirmWindow.deactivate();
        this._listWindow.activate();
    };

    Scene_CashShop.prototype.onConfirmCancel = function () {
        this.closeConfirm();
    };

    Scene_CashShop.prototype.onConfirmBuy = function () {
        const entry = this._listWindow.item();
        if (!entry) {
            this.closeConfirm();
            return;
        }
        if (this._listWindow.isCurrencyTab()) {
            this.executeCurrencyPurchase(entry);
        } else {
            this.executeItemPurchase(entry);
        }
    };

    Scene_CashShop.prototype.executeItemPurchase = function (entry) {
        const ok = CashShop.purchaseItem(entry);
        if (ok) {
            SoundManager.playShop();
            this._detailWindow.showMessage(CashShop.params.text.success);
        } else {
            SoundManager.playBuzzer();
            this._detailWindow.showMessage(CashShop.params.text.failed);
        }
        this.refreshAll();
        this.closeConfirm();
    };

    // Async real-money flow with a "processing" state.
    Scene_CashShop.prototype.executeCurrencyPurchase = function (pack) {
        this._confirmWindow.close();
        this._confirmWindow.deactivate();
        this._listWindow.deactivate();
        this._categoryWindow.deactivate();
        this._detailWindow.showMessage(CashShop.params.text.processing);
        this._processing = true;

        CashShop.purchaseCurrencyPack(pack).then((result) => {
            this._processing = false;
            if (result && result.success) {
                SoundManager.playShop();
                this._detailWindow.showMessage(CashShop.params.text.success);
            } else {
                SoundManager.playBuzzer();
                const msg = (result && result.message)
                    ? CashShop.params.text.failed + "\n" + result.message
                    : CashShop.params.text.failed;
                this._detailWindow.showMessage(msg);
            }
            this.refreshAll();
            this._listWindow.activate();
        });
    };

    Scene_CashShop.prototype.refreshAll = function () {
        this._balanceWindow.refresh();
        this._listWindow.refresh();
    };

})();

//=============================================================================
// OPTIONAL: HTTP provider template
//=============================================================================
// This is a STARTING POINT for a real backend integration. It is intentionally
// simple and NOT production-ready. It assumes your server exposes endpoints and
// that the SERVER — never this file — holds any payment secret keys and decides
// how many Gems to grant. Fill in auth (player token), error handling, and the
// exact request/response shapes your backend uses.
//
// Enable it by setting the "Payment Provider" parameter to "HTTP" and filling
// in "Backend Base URL".
(() => {
    "use strict";

    CashShop.HttpProvider = {
        baseUrl() {
            return (CashShop.params.backendBaseUrl || "").replace(/\/+$/, "");
        },

        // Opens a URL in the player's real browser (works in NW.js desktop
        // builds and normal web builds).
        openExternal(url) {
            try {
                if (typeof require === "function") {
                    // NW.js desktop
                    const nw = require("nw.gui");
                    nw.Shell.openExternal(url);
                    return;
                }
            } catch (e) { /* fall through to window.open */ }
            window.open(url, "_blank");
        },

        async purchaseCurrencyPack(pack) {
            const base = this.baseUrl();
            if (!base) {
                return { success: false, grantedCurrency: 0, message: "No backend URL configured." };
            }

            // 1) Ask YOUR server to create a checkout for this SKU.
            //    Include the player's auth token so the server knows WHO to credit.
            const startRes = await fetch(base + "/purchase/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sku: pack.sku /*, token: <player auth token> */ }),
            });
            const start = await startRes.json();
            if (!start || !start.checkoutUrl || !start.purchaseId) {
                return { success: false, grantedCurrency: 0, message: "Could not start checkout." };
            }

            // 2) Send the player to the processor's hosted checkout.
            this.openExternal(start.checkoutUrl);

            // 3) Poll your server until the webhook confirms payment.
            //    Your server verifies the payment out-of-band and, on success,
            //    tells you the authoritative granted amount.
            const purchaseId = start.purchaseId;
            const deadline = Date.now() + 5 * 60 * 1000; // give up after 5 min
            while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 3000));
                const statusRes = await fetch(base + "/purchase/status?id=" + encodeURIComponent(purchaseId));
                const status = await statusRes.json();
                if (status.state === "paid") {
                    return {
                        success: true,
                        grantedCurrency: Number(status.grantedCurrency || 0),
                        message: "ok",
                    };
                }
                if (status.state === "failed" || status.state === "canceled") {
                    return { success: false, grantedCurrency: 0, message: status.reason || "Payment failed." };
                }
            }
            return { success: false, grantedCurrency: 0, message: "Timed out waiting for payment." };
        },
    };
})();
