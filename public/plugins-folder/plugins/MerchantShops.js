//=============================================================================
// MerchantShops.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Rule-based merchant NPCs. Define shop profiles once (by tag, grade,
 * or specific IDs), open them with a plugin command, with finite step-restocked
 * stock and selectable storefront themes (vending machine, bar, kiosk, grocery).
 * @author Built for your project
 *
 * @param merchants
 * @text Merchants
 * @type struct<Merchant>[]
 * @desc Define each merchant profile here (bartender, weaponsmith, etc.).
 * @default []
 *
 * @param vendingCoin
 * @text Vending: Coin Value
 * @type number
 * @min 1
 * @desc Gold added to the machine's credit each time a coin is inserted.
 * @default 100
 *
 * @param vendingCols
 * @text Vending: Columns
 * @type number
 * @min 1
 * @max 8
 * @desc How many product columns the vending machine displays.
 * @default 4
 *
 * @command openShop
 * @text Open Merchant Shop
 * @desc Opens the shop for a merchant profile defined in the parameters.
 *
 * @arg merchantId
 * @text Merchant ID
 * @desc The id of the merchant profile to open (case-insensitive). e.g. bartender
 * @default
 *
 * @arg purchaseOnly
 * @text Purchase Only
 * @type boolean
 * @desc If ON, this shop is buy-only for this opening (overrides Buy & Sell).
 * @default false
 *
 * @arg theme
 * @text Theme Override
 * @type select
 * @option (use profile)
 * @value
 * @option none
 * @option vending
 * @option bar
 * @option kiosk
 * @option grocery
 * @desc Optional. Overrides the profile's theme just for this opening.
 * @default
 *
 * @arg accent
 * @text Accent Color Override
 * @desc Optional hex color (e.g. #1565c0 for a blue vending machine). Blank = theme default.
 * @default
 *
 * @help
 * ===========================================================================
 * MerchantShops.js
 * ===========================================================================
 * IMPORTANT: this file must be named exactly  MerchantShops.js  (the plugin
 * command registration depends on the filename matching).
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES
 * ---------------------------------------------------------------------------
 * Instead of hand-listing goods on every shopkeeper, you tag your database
 * once and define reusable "merchant profiles". Each profile decides its
 * stock from a mix of rules:
 *
 *   - by shopTag        (e.g. everything tagged "drink")
 *   - by grade          (e.g. all uncommon weapons)
 *   - by specific ID    (always-stock a few hand-picked entries)
 *   - minus an exclude list
 *
 * Rules are combined with OR (union) logic, exactly as you asked: an entry is
 * stocked if it matches ANY rule or is in the always-stock list, unless it is
 * excluded. Within a single rule, the conditions are AND (so a rule can mean
 * "weapons AND grade uncommon").
 *
 * ---------------------------------------------------------------------------
 * NOTE TAGS (put these in the Note box of Items / Weapons / Armors)
 * ---------------------------------------------------------------------------
 *   <shopTags: drink, alcohol>   One or more comma-separated tags.
 *   <grade: uncommon>            A single grade word (common/uncommon/rare...).
 *   <stock: 3>                   Max stock for this entry at merchants that
 *                                sell it. Overrides the merchant's Default
 *                                Stock. Use -1 for infinite.
 *   <noShop>                     This entry is never sold by any merchant.
 *
 * Tags and grades are matched case-insensitively. See the included
 * "RecommendedShopTags.txt" for a full suggested tag list.
 *
 * ---------------------------------------------------------------------------
 * HOW STOCK / RESTOCK WORKS
 * ---------------------------------------------------------------------------
 * Stock is finite and per-merchant. When a merchant is first opened, every
 * entry it sells starts at its max (its <stock:> value, or the merchant's
 * Default Stock). Buying reduces the remaining count; sold-out entries are
 * greyed out (or hidden, if you enable Hide Sold-Out).
 *
 * Restock is driven by the party's step count. Each merchant has a Restock
 * Interval (in steps) and a Restock Amount. Restocking is calculated lazily
 * whenever you open that merchant: the plugin looks at how many steps have
 * passed since it last updated, works out how many full intervals elapsed,
 * and adds (intervals x Restock Amount) to every entry, capped at its max.
 * This is exactly step-based, but costs nothing while the shop is closed.
 * Set Restock Interval to 0 to disable restocking for that merchant.
 *
 * ---------------------------------------------------------------------------
 * BUYING & SELLING
 * ---------------------------------------------------------------------------
 * Shops are Buy & Sell by default. Turn on a merchant's "Restrict Selling" to
 * only let the player sell back items that merchant actually deals in (e.g. a
 * bartender only buys drinks). Leave it off to let players offload anything.
 *
 * ---------------------------------------------------------------------------
 * STOREFRONT THEMES
 * ---------------------------------------------------------------------------
 * Each merchant can wear a visual skin, set by its "Storefront Theme":
 *
 *   vending  - a Japanese-style drink vending machine with its OWN interactive
 *              scene (not the normal shop windows). The flow is: insert coins to
 *              build up credit, move the cursor onto the drink you want (each slot
 *              shows the item's name and price), then Push to dispense it. Leftover
 *              credit is returned when you use Coin Return or leave. Set the Accent
 *              Color to recolor the body (e.g. #c62828 red, #1565c0 blue).
 *   bar      - warm tavern: back-bar shelves of bottles and a polished counter.
 *   kiosk    - a bright street kiosk with a striped awning and a front counter.
 *   grocery  - convenience-store shelving with stocked goods and price tags.
 *   none     - the normal RPG Maker MZ shop scene (default).
 *
 * VENDING CONTROLS (interactive machine):
 *   Arrow keys / click .... move the cursor between drinks
 *   Confirm (Z / Enter) ... on a drink = Push/dispense; on the coin slot = insert
 *                           a coin; on the return cup = refund credit
 *   Cancel  (X / Esc) ..... leave the machine (refunds any credit first)
 * The coin value and the number of product columns are set in the plugin params.
 * bar / kiosk / grocery still use the normal shop scene with the themed backdrop.
 *
 * The whole storefront is drawn in code, so there are NO image files to add.
 * You can override the theme/accent for a single opening from the plugin command
 * (handy for one blue machine and one red machine that share a stock profile).
 *
 * ---------------------------------------------------------------------------
 * PRICES
 * ---------------------------------------------------------------------------
 * This plugin uses each entry's database price (priceType 0), so any separate
 * pricing / markup plugin you already use will continue to apply normally.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 * 1. Tag your items/weapons/armors (see note tags above).
 * 2. Add merchant profiles in this plugin's parameters.
 * 3. On the NPC event, add: Plugin Command > MerchantShops > Open Merchant Shop
 *    and type the Merchant ID.
 *
 * EXAMPLES
 *   Bartender    -> Rule: tags = [drink]  (types: items only)
 *   Weaponsmith  -> Rule: grades = [uncommon]  (types: weapons only)
 *                   + Always-Stock Items: a couple of specific IDs
 *   Shopkeeper   -> Rule: tags = [general_goods]  (types: items only)
 *                   + Rule: tags = [light_armor]  (types: armors only)
 *                   + Always-Stock Items: a few specific IDs
 *                   + Never-Stock Items: any you want to keep out
 * ===========================================================================
 */

/*~struct~StockRule:
 * @param label
 * @text Rule Label
 * @desc Just a name to keep rules organized. Not used in-game.
 * @default New Rule
 *
 * @param applyToItems
 * @text Apply to Items
 * @type boolean
 * @desc Should this rule consider Items?
 * @default true
 *
 * @param applyToWeapons
 * @text Apply to Weapons
 * @type boolean
 * @desc Should this rule consider Weapons?
 * @default true
 *
 * @param applyToArmors
 * @text Apply to Armors
 * @type boolean
 * @desc Should this rule consider Armors?
 * @default true
 *
 * @param tags
 * @text Match Tags
 * @type string[]
 * @desc Entry matches if it has ANY of these shopTags. Leave empty to ignore tags.
 * @default []
 *
 * @param grades
 * @text Match Grades
 * @type string[]
 * @desc Entry matches if its <grade:> is ANY of these. Leave empty to ignore grade.
 * @default []
 */

/*~struct~Merchant:
 * @param id
 * @text Merchant ID
 * @desc Unique name used in the plugin command (case-insensitive). e.g. bartender
 * @default
 *
 * @param rules
 * @text Stock Rules
 * @type struct<StockRule>[]
 * @desc Category-based stock. An entry is stocked if it matches ANY rule (OR).
 * @default []
 *
 * @param includeItems
 * @text Always-Stock Items
 * @type item[]
 * @desc Specific items this merchant always sells, regardless of rules.
 * @default []
 *
 * @param includeWeapons
 * @text Always-Stock Weapons
 * @type weapon[]
 * @desc Specific weapons this merchant always sells, regardless of rules.
 * @default []
 *
 * @param includeArmors
 * @text Always-Stock Armors
 * @type armor[]
 * @desc Specific armors this merchant always sells, regardless of rules.
 * @default []
 *
 * @param excludeItems
 * @text Never-Stock Items
 * @type item[]
 * @desc Specific items this merchant will never sell (overrides everything).
 * @default []
 *
 * @param excludeWeapons
 * @text Never-Stock Weapons
 * @type weapon[]
 * @desc Specific weapons this merchant will never sell (overrides everything).
 * @default []
 *
 * @param excludeArmors
 * @text Never-Stock Armors
 * @type armor[]
 * @desc Specific armors this merchant will never sell (overrides everything).
 * @default []
 *
 * @param defaultStock
 * @text Default Stock
 * @type number
 * @min -1
 * @desc Max quantity per entry when it has no <stock:> tag. Use -1 for infinite.
 * @default 5
 *
 * @param restockSteps
 * @text Restock Interval (steps)
 * @type number
 * @min 0
 * @desc Player steps between restock cycles. 0 = never restock.
 * @default 100
 *
 * @param restockAmount
 * @text Restock Amount
 * @type number
 * @min 0
 * @desc Units added to each entry per restock cycle (capped at its max).
 * @default 1
 *
 * @param restrictSell
 * @text Restrict Selling
 * @type boolean
 * @desc If ON, players can only sell items this merchant deals in.
 * @default false
 *
 * @param hideSoldOut
 * @text Hide Sold-Out
 * @type boolean
 * @desc If ON, entries with 0 stock are hidden until they restock (else greyed out).
 * @default false
 *
 * @param theme
 * @text Storefront Theme
 * @type select
 * @option none
 * @option vending
 * @option bar
 * @option kiosk
 * @option grocery
 * @desc Visual skin for this shop's scene. "vending" = Japanese vending machine.
 * @default none
 *
 * @param accent
 * @text Accent Color
 * @desc Optional hex color for the theme's body (e.g. #c62828 red or #1565c0 blue). Blank = default.
 * @default
 */

var Imported = Imported || {};
Imported.MerchantShops = true;

var MerchantShops = MerchantShops || {};

(() => {
    "use strict";

    const PLUGIN_NAME = "MerchantShops";

    //-------------------------------------------------------------------------
    // Parameter parsing
    //-------------------------------------------------------------------------
    function toIdList(jsonStr) {
        try {
            return JSON.parse(jsonStr || "[]").map(Number).filter(n => n > 0);
        } catch (e) {
            return [];
        }
    }

    function toStrList(jsonStr) {
        try {
            return JSON.parse(jsonStr || "[]")
                .map(s => String(s).trim().toLowerCase())
                .filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    function parseRule(jsonStr) {
        const o = JSON.parse(jsonStr);
        return {
            applyToItems: o.applyToItems !== "false",
            applyToWeapons: o.applyToWeapons !== "false",
            applyToArmors: o.applyToArmors !== "false",
            tags: toStrList(o.tags),
            grades: toStrList(o.grades)
        };
    }

    function parseMerchant(jsonStr) {
        const o = JSON.parse(jsonStr);
        let rules = [];
        try {
            rules = JSON.parse(o.rules || "[]").map(parseRule);
        } catch (e) {
            rules = [];
        }
        return {
            id: String(o.id || "").trim(),
            rules: rules,
            includeItems: toIdList(o.includeItems),
            includeWeapons: toIdList(o.includeWeapons),
            includeArmors: toIdList(o.includeArmors),
            excludeItems: toIdList(o.excludeItems),
            excludeWeapons: toIdList(o.excludeWeapons),
            excludeArmors: toIdList(o.excludeArmors),
            defaultStock: Number(o.defaultStock != null ? o.defaultStock : 5),
            restockSteps: Number(o.restockSteps != null ? o.restockSteps : 100),
            restockAmount: Number(o.restockAmount != null ? o.restockAmount : 1),
            restrictSell: o.restrictSell === "true",
            hideSoldOut: o.hideSoldOut === "true",
            theme: String(o.theme || "none").trim().toLowerCase(),
            accent: String(o.accent || "").trim()
        };
    }

    const rawParams = PluginManager.parameters(PLUGIN_NAME);
    let merchantList = [];
    try {
        merchantList = JSON.parse(rawParams.merchants || "[]").map(parseMerchant);
    } catch (e) {
        console.error("MerchantShops: failed to parse merchants parameter.", e);
        merchantList = [];
    }

    const merchantMap = {};
    for (const m of merchantList) {
        if (m.id) merchantMap[m.id.toLowerCase()] = m;
    }

    const VEND_COIN = Math.max(1, Number(rawParams.vendingCoin || 100));
    const VEND_COLS = Math.max(1, Math.min(8, Number(rawParams.vendingCols || 4)));

    //-------------------------------------------------------------------------
    // Note-tag parsing (cached on the data object)
    //-------------------------------------------------------------------------
    function parseNote(dataObj) {
        if (!dataObj) return { tags: [], grade: null, stock: null, noShop: false };
        if (dataObj.__msParsed) return dataObj.__msData;
        const note = dataObj.note || "";
        const data = { tags: [], grade: null, stock: null, noShop: false };

        const tagMatch = note.match(/<shopTags:\s*([^>]*)>/i);
        if (tagMatch) {
            data.tags = tagMatch[1]
                .split(",")
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);
        }
        const gradeMatch = note.match(/<grade:\s*([^>]*)>/i);
        if (gradeMatch) data.grade = gradeMatch[1].trim().toLowerCase();

        const stockMatch = note.match(/<stock:\s*(-?\d+)>/i);
        if (stockMatch) data.stock = parseInt(stockMatch[1], 10);

        if (/<noShop>/i.test(note)) data.noShop = true;

        dataObj.__msParsed = true;
        dataObj.__msData = data;
        return data;
    }

    //-------------------------------------------------------------------------
    // Type helpers
    //-------------------------------------------------------------------------
    function entryType(item) {
        if (!item) return "item";
        if (item.wtypeId !== undefined) return "weapon";
        if (item.atypeId !== undefined) return "armor";
        return "item";
    }

    function typeCode(item) {
        const t = entryType(item);
        return t === "weapon" ? 1 : t === "armor" ? 2 : 0;
    }

    function goodKey(item) {
        return typeCode(item) + "_" + item.id;
    }

    //-------------------------------------------------------------------------
    // Matching logic
    //-------------------------------------------------------------------------
    function ruleMatches(rule, item, meta) {
        const t = entryType(item);
        if (t === "item" && !rule.applyToItems) return false;
        if (t === "weapon" && !rule.applyToWeapons) return false;
        if (t === "armor" && !rule.applyToArmors) return false;

        if (rule.tags.length > 0) {
            if (!meta.tags.some(tag => rule.tags.includes(tag))) return false;
        }
        if (rule.grades.length > 0) {
            if (!meta.grade || !rule.grades.includes(meta.grade)) return false;
        }
        return true;
    }

    function merchantMatches(merchant, item) {
        if (!merchant || !item) return false;
        const meta = parseNote(item);
        if (meta.noShop) return false;

        const t = entryType(item);
        const id = item.id;

        // Exclusions win over everything.
        if (t === "item" && merchant.excludeItems.includes(id)) return false;
        if (t === "weapon" && merchant.excludeWeapons.includes(id)) return false;
        if (t === "armor" && merchant.excludeArmors.includes(id)) return false;

        // Forced inclusions.
        if (t === "item" && merchant.includeItems.includes(id)) return true;
        if (t === "weapon" && merchant.includeWeapons.includes(id)) return true;
        if (t === "armor" && merchant.includeArmors.includes(id)) return true;

        // Rule union.
        for (const rule of merchant.rules) {
            if (ruleMatches(rule, item, meta)) return true;
        }
        return false;
    }

    function buildMatched(merchant) {
        const result = [];
        const collect = arr => {
            for (let i = 1; i < arr.length; i++) {
                const item = arr[i];
                if (item && item.name && merchantMatches(merchant, item)) {
                    result.push({
                        type: typeCode(item),
                        id: item.id,
                        item: item,
                        key: goodKey(item)
                    });
                }
            }
        };
        collect($dataItems);
        collect($dataWeapons);
        collect($dataArmors);
        return result;
    }

    function maxStockFor(item, merchant) {
        const meta = parseNote(item);
        const value = meta.stock != null ? meta.stock : merchant.defaultStock;
        return value < 0 ? -1 : value; // -1 => infinite
    }

    //-------------------------------------------------------------------------
    // Public API on the MerchantShops namespace
    //-------------------------------------------------------------------------
    MerchantShops.merchant = function(merchantId) {
        return merchantMap[String(merchantId || "").toLowerCase()] || null;
    };

    MerchantShops.matches = function(merchantId, item) {
        const merchant = this.merchant(merchantId);
        return merchant ? merchantMatches(merchant, item) : false;
    };

    MerchantShops.restrictSell = function(merchantId) {
        const merchant = this.merchant(merchantId);
        return merchant ? merchant.restrictSell : false;
    };

    // Remaining stock for an item at a merchant. Returns -1 for infinite,
    // 0 if unknown/sold out.
    MerchantShops.remaining = function(merchantId, item) {
        const rec = $gameSystem.merchantStore()[String(merchantId).toLowerCase()];
        if (!rec) return 0;
        const g = rec.goods[goodKey(item)];
        if (!g) return 0;
        return g.max < 0 ? -1 : g.qty;
    };

    MerchantShops.reduceStock = function(merchantId, item, number) {
        const rec = $gameSystem.merchantStore()[String(merchantId).toLowerCase()];
        if (!rec) return;
        const g = rec.goods[goodKey(item)];
        if (g && g.max >= 0) {
            g.qty = Math.max(0, g.qty - number);
        }
    };

    // Initialize new goods and apply step-based restocking (lazy, on open).
    MerchantShops.refreshStock = function(merchantId, merchant, matched) {
        const store = $gameSystem.merchantStore();
        const key = merchantId.toLowerCase();
        const steps = $gameParty.steps();
        let rec = store[key];
        if (!rec) {
            rec = { lastRestockStep: steps, goods: {} };
            store[key] = rec;
        }

        // Apply restock cycles that elapsed since we last touched this merchant.
        if (merchant.restockSteps > 0 && merchant.restockAmount > 0) {
            const elapsed = steps - rec.lastRestockStep;
            const cycles = Math.floor(elapsed / merchant.restockSteps);
            if (cycles > 0) {
                const add = cycles * merchant.restockAmount;
                for (const k in rec.goods) {
                    const g = rec.goods[k];
                    if (g.max >= 0) g.qty = Math.min(g.max, g.qty + add);
                }
                rec.lastRestockStep += cycles * merchant.restockSteps;
            }
        } else {
            rec.lastRestockStep = steps;
        }

        // Initialize any goods we haven't seen before (start full).
        for (const m of matched) {
            if (!(m.key in rec.goods)) {
                const max = maxStockFor(m.item, merchant);
                rec.goods[m.key] = { qty: max < 0 ? -1 : max, max: max };
            }
        }
    };

    MerchantShops.openShop = function(merchantId, purchaseOnly, themeName, accent) {
        const merchant = this.merchant(merchantId);
        if (!merchant) {
            console.warn('MerchantShops: no merchant profile with id "' + merchantId + '".');
            return;
        }
        const matched = buildMatched(merchant);
        this.refreshStock(merchant.id, merchant, matched);

        let goods = matched;
        if (merchant.hideSoldOut) {
            goods = goods.filter(g => this.remaining(merchant.id, g.item) !== 0);
        }

        // Resolve the storefront theme (command override wins over the profile).
        const theme = resolveTheme(merchant, themeName, accent);

        // The vending machine has its own interactive scene.
        if (theme && theme.name === "vending") {
            const slots = matched.map(m => ({
                item: m.item,
                price: MerchantShops.vendingPrice(m.item),
                key: m.key
            }));
            SceneManager.push(Scene_MerchantVending);
            SceneManager.prepareNextScene(merchant.id, slots, theme);
            return;
        }

        // All other themes (and none) use the standard shop scene with a skin.
        $gameTemp._merchantShopTheme = theme;

        const shopGoods = goods.map(g => [g.type, g.id, 0, 0]); // priceType 0 = DB price
        SceneManager.push(Scene_Shop);
        SceneManager.prepareNextScene(shopGoods, !!purchaseOnly, merchant.id);
    };

    //-------------------------------------------------------------------------
    // Persistence (saved with the game)
    //-------------------------------------------------------------------------
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._merchantStock = {};
    };

    Game_System.prototype.merchantStore = function() {
        if (!this._merchantStock) this._merchantStock = {};
        return this._merchantStock;
    };

    //-------------------------------------------------------------------------
    // Plugin command
    //-------------------------------------------------------------------------
    PluginManager.registerCommand(PLUGIN_NAME, "openShop", args => {
        const merchantId = String(args.merchantId || "").trim();
        const purchaseOnly = String(args.purchaseOnly) === "true";
        const themeName = String(args.theme || "").trim().toLowerCase();
        const accent = String(args.accent || "").trim();
        if (!$gameParty.inBattle()) {
            MerchantShops.openShop(merchantId, purchaseOnly, themeName, accent);
        }
    });

    //=========================================================================
    // STOREFRONT THEMES
    //=========================================================================
    // tone = [r,g,b] window tint; back = window back-opacity (lower = more of the
    // scenery shows through); accent = default body color.
    const THEME_DEFS = {
        vending: { tone: [-16, -6, 40], back: 120, accent: "#c62828" },
        bar:     { tone: [40, 4, -30],  back: 168, accent: "#7a4a24" },
        kiosk:   { tone: [22, 8, -14],  back: 178, accent: "#d64545" },
        grocery: { tone: [-2, 8, -4],   back: 184, accent: "#3fa66a" }
    };

    function resolveTheme(merchant, overrideName, overrideAccent) {
        let name = (overrideName && overrideName !== "" && overrideName !== "(use profile)")
            ? overrideName : merchant.theme;
        name = String(name || "none").toLowerCase();
        const def = THEME_DEFS[name];
        if (!def) return null; // "none" or unknown -> vanilla shop
        const accent = (overrideAccent && overrideAccent.trim())
            || merchant.accent || def.accent;
        return { name: name, accent: accent, tone: def.tone, back: def.back };
    }

    // --- small drawing helpers ------------------------------------------------
    function shade(hex, amt) {
        let h = String(hex).replace("#", "");
        if (h.length === 3) h = h.split("").map(c => c + c).join("");
        let r = parseInt(h.substr(0, 2), 16);
        let g = parseInt(h.substr(2, 2), 16);
        let b = parseInt(h.substr(4, 2), 16);
        if (isNaN(r)) { r = 128; g = 128; b = 128; }
        r = Math.max(0, Math.min(255, r + amt));
        g = Math.max(0, Math.min(255, g + amt));
        b = Math.max(0, Math.min(255, b + amt));
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    // deterministic pseudo-random so the scenery is stable frame to frame
    function seeded(seed) {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    }

    function drawCan(bmp, x, y, w, h, color) {
        bmp.fillRect(x, y, w, h, color);
        bmp.fillRect(x, y, w, Math.max(2, h * 0.14), shade(color, 45));            // top
        bmp.fillRect(x, y + h * 0.40, w, Math.max(2, h * 0.20), "rgba(245,245,245,0.85)"); // label
        bmp.fillRect(x, y + h - Math.max(2, h * 0.10), w, Math.max(2, h * 0.10), shade(color, -45)); // base
    }

    function drawBottle(bmp, x, y, w, h, color) {
        const neckW = Math.max(3, w * 0.34);
        bmp.fillRect(x + (w - neckW) / 2, y, neckW, h * 0.28, shade(color, -20));   // neck
        bmp.fillRect(x, y + h * 0.26, w, h * 0.74, color);                          // body
        bmp.fillRect(x + w * 0.16, y + h * 0.26, Math.max(2, w * 0.18), h * 0.6, "rgba(255,255,255,0.28)"); // shine
        bmp.fillRect(x, y + h * 0.5, w, Math.max(3, h * 0.16), "rgba(245,245,240,0.8)"); // label
    }

    // --- the four storefronts -------------------------------------------------
    function drawVending(bmp, accent) {
        const W = bmp.width, H = bmp.height;
        const dark = shade(accent, -55), light = shade(accent, 30);
        // concrete wall + ground
        bmp.gradientFillRect(0, 0, W, H, "#5c6470", "#39404b", true);
        bmp.fillRect(0, H - Math.floor(H * 0.11), W, Math.floor(H * 0.11), "rgba(0,0,0,0.20)");
        // cabinet: metal frame then body
        const m = 8, f = 11;
        bmp.fillRect(m, m, W - 2 * m, H - 2 * m, dark);
        bmp.fillRect(m + f, m + f, W - 2 * (m + f), H - 2 * (m + f), accent);
        const bx = m + f, bw = W - 2 * (m + f), byTop = m + f;
        // top brand banner
        bmp.fillRect(bx, byTop, bw, 52, "#f4f4f4");
        bmp.fillRect(bx, byTop + 52, bw, 6, dark);
        bmp.drawCircle(bx + 34, byTop + 26, 15, accent);
        bmp.fontFace = $gameSystem.mainFontFace();
        bmp.fontSize = 26;
        bmp.textColor = shade(accent, -30);
        bmp.drawText("DRINKS", bx + 60, byTop + 4, bw - 80, 44, "left");
        // illuminated glass display (left/main ~62%)
        const gx = bx + 14;
        const gy = byTop + 70;
        const gw = Math.floor(bw * 0.60);
        const gh = H - 2 * (m + f) - 70 - 96;
        bmp.fillRect(gx, gy, gw, gh, shade(accent, -30));                 // interior wall
        bmp.gradientFillRect(gx, gy, gw, gh, "rgba(235,244,255,0.22)", "rgba(180,210,255,0.10)", true);
        // shelves of drinks
        const rnd = seeded(20260827);
        const palette = ["#e74c3c", "#27ae60", "#2980b9", "#f39c12", "#8e44ad", "#16a085", "#e67e22", "#c0392b"];
        const cols = 6, rows = 4;
        const pad = 14;
        const cellW = (gw - pad * 2) / cols;
        const cellH = (gh - pad * 2) / rows;
        for (let r = 0; r < rows; r++) {
            const shelfY = gy + pad + r * cellH;
            // glass shelf line
            bmp.fillRect(gx + 6, shelfY + cellH - 8, gw - 12, 3, "rgba(255,255,255,0.35)");
            for (let c = 0; c < cols; c++) {
                const color = palette[Math.floor(rnd() * palette.length)];
                const cw = cellW * 0.52;
                const chh = cellH * 0.66;
                const cxp = gx + pad + c * cellW + (cellW - cw) / 2;
                const cyp = shelfY + (cellH - chh) - 8;
                drawCan(bmp, cxp, cyp, cw, chh, color);
                // little price tag under each
                bmp.fillRect(gx + pad + c * cellW + 3, shelfY + cellH - 6, cellW - 6, 4, "rgba(255,120,0,0.65)");
            }
        }
        // right control panel
        const cxp = gx + gw + 16;
        const cw = bx + bw - 14 - cxp;
        bmp.fillRect(cxp, gy, cw, gh, shade(accent, -20));
        bmp.fillRect(cxp, gy, cw, gh, "rgba(0,0,0,0.10)");
        // selection number buttons
        const brnd = seeded(77);
        const bcols = 2, brows = 5;
        const bpad = 12;
        const bW = (cw - bpad * (bcols + 1)) / bcols;
        const bH = (gh * 0.62 - bpad * (brows + 1)) / brows;
        for (let r = 0; r < brows; r++) {
            for (let c = 0; c < bcols; c++) {
                const bxp = cxp + bpad + c * (bW + bpad);
                const byp = gy + bpad + r * (bH + bpad);
                bmp.fillRect(bxp, byp, bW, bH, "#20242c");
                bmp.fillRect(bxp + 3, byp + 3, bW - 6, bH - 6, "#2b3038");
                bmp.drawCircle(bxp + bW - 14, byp + bH / 2, 5, brnd() > 0.5 ? "#ff5252" : "#ffb300");
                bmp.fillRect(bxp + 8, byp + bH * 0.34, bW * 0.5, 4, "rgba(255,255,255,0.5)");
            }
        }
        // coin slot plate
        const csY = gy + gh * 0.66;
        bmp.fillRect(cxp + cw * 0.30, csY, cw * 0.40, gh * 0.30, "#c7ced6");
        bmp.fillRect(cxp + cw * 0.30, csY, cw * 0.40, 4, "#eef2f6");
        bmp.fillRect(cxp + cw * 0.46, csY + 14, 8, gh * 0.12, "#111");        // coin slot
        bmp.fillRect(cxp + cw * 0.34, csY + gh * 0.20, cw * 0.32, gh * 0.06, "#2b2f36"); // return
        // dispense tray along the bottom of the display
        const tray = H - (m + f) - 84;
        bmp.fillRect(gx, tray, gw, 62, dark);
        bmp.fillRect(gx + 12, tray + 12, gw - 24, 40, "rgba(0,0,0,0.5)");
        bmp.fontSize = 18;
        bmp.textColor = "#ffffff";
        bmp.drawText("PUSH", gx, tray + 12, gw, 40, "center");
    }

    // shared props for the venue backdrops
    function drawHotDog(bmp, x, y, w, h) {
        bmp.fillRect(x, y, w, h, "#8a5a2c");                 // sausage
        bmp.fillRect(x, y + h * 0.35, w, h * 0.18, "#c8863d"); // sheen
        bmp.fillRect(x, y, w, h * 0.16, "#a06a34");
    }
    function drawChipBag(bmp, x, y, w, h, color) {
        bmp.fillRect(x, y, w, h, color);
        bmp.fillRect(x, y, w, Math.max(2, h * 0.14), "rgba(255,255,255,0.35)"); // clip
        bmp.fillRect(x + w * 0.12, y + h * 0.34, w * 0.76, h * 0.22, "rgba(255,255,255,0.55)"); // label
    }
    function drawPoster(bmp, x, y, w, h, header) {
        bmp.fillRect(x, y, w, h, "#f4efe0");
        bmp.fillRect(x, y, w, h * 0.22, header);
        for (let i = 0; i < 6; i++) {
            const ly = y + h * 0.30 + i * (h * 0.10);
            bmp.fillRect(x + w * 0.12, ly, w * (0.5 + (i % 3) * 0.12), 4, "rgba(40,40,60,0.5)");
        }
        bmp.fillRect(x + w * 0.2, y + h * 0.78, w * 0.6, h * 0.14, "#2e7d32"); // callout
    }

    function drawBar(bmp, accent) {
        const W = bmp.width, H = bmp.height;
        // dark room + brick back wall
        bmp.gradientFillRect(0, 0, W, H, "#241a14", "#0e0906", true);
        const brickR = seeded(303);
        for (let ry = 0; ry < Math.floor(H * 0.62); ry += 22) {
            const off = (Math.floor(ry / 22) % 2) * 30;
            for (let rx = -off; rx < W; rx += 60) {
                const v = 26 + Math.floor(brickR() * 16);
                bmp.fillRect(rx + 2, ry + 2, 56, 18, `rgb(${v + 14},${v},${v - 6})`);
            }
        }
        bmp.fillRect(0, 0, W, H, "rgba(20,10,6,0.28)"); // darken wall
        // back-bar: warm-lit mirrored shelf unit with liquor bottles
        const unitX = Math.floor(W * 0.30), unitY = Math.floor(H * 0.14);
        const unitW = Math.floor(W * 0.44), unitH = Math.floor(H * 0.40);
        bmp.fillRect(unitX - 8, unitY - 8, unitW + 16, unitH + 16, "#20140c"); // cabinet
        bmp.gradientFillRect(unitX, unitY, unitW, unitH, "#4a3524", "#241812", true); // mirror
        bmp.fillRect(unitX, unitY, unitW, unitH, "rgba(255,190,120,0.10)"); // warm glow
        const rnd = seeded(1861);
        const bottleCols = ["#caa14a", "#7a8c3a", "#b23b2e", "#3e6d55", "#c98b3a", "#d8d2c0", "#8a3b6e"];
        const shelves = 3;
        for (let s = 0; s < shelves; s++) {
            const sy = unitY + 12 + s * Math.floor(unitH / shelves);
            const bh = Math.floor(unitH / shelves) - 14;
            bmp.fillRect(unitX + 4, sy + bh + 2, unitW - 8, 4, "#5a3a22"); // glass shelf
            bmp.fillRect(unitX + 4, sy + bh + 2, unitW - 8, 2, "rgba(255,220,150,0.5)");
            const n = 12, gapW = (unitW - 12) / n;
            for (let i = 0; i < n; i++) {
                const bx = unitX + 6 + i * gapW + gapW * 0.2;
                drawBottle(bmp, bx, sy + 2, gapW * 0.56, bh, bottleCols[Math.floor(rnd() * bottleCols.length)]);
            }
        }
        // blue neon sign (right) with halo
        const nx = Math.floor(W * 0.80), ny = Math.floor(H * 0.16);
        bmp.fillRect(nx - 10, ny - 10, 150, 96, "rgba(60,120,255,0.12)"); // halo
        bmp.fillRect(nx, ny, 130, 8, "#5cc6ff");
        bmp.fillRect(nx, ny + 68, 130, 8, "#5cc6ff");
        bmp.fillRect(nx, ny, 8, 76, "#5cc6ff");
        bmp.fillRect(nx + 122, ny, 8, 76, "#5cc6ff");
        bmp.fillRect(nx + 40, ny + 30, 50, 8, "#ff5ca8"); // inner pink accent
        // wall TV (left)
        const tx = Math.floor(W * 0.06), ty = Math.floor(H * 0.15);
        bmp.fillRect(tx - 4, ty - 4, Math.floor(W * 0.18) + 8, Math.floor(H * 0.20) + 8, "#0a0a0c");
        bmp.gradientFillRect(tx, ty, Math.floor(W * 0.18), Math.floor(H * 0.20), "#3a5a7a", "#12202e", true);
        bmp.fillRect(tx + 6, ty + Math.floor(H * 0.13), Math.floor(W * 0.18) - 12, 8, "rgba(255,255,255,0.15)");
        // rope lights along the top
        for (let i = 0; i < 20; i++) bmp.drawCircle(20 + i * (W / 20), 10, 3, i % 2 ? "#ffb347" : "#ff7043");
        // polished wooden bar counter across the bottom
        const cy = Math.floor(H * 0.70);
        bmp.gradientFillRect(0, cy, W, H - cy, "#6b3f22", "#3a2213", true);
        for (let px = 0; px < W; px += 46) bmp.fillRect(px, cy, 2, H - cy, "rgba(0,0,0,0.18)"); // planks
        bmp.fillRect(0, cy, W, 8, "#8a5a30");
        bmp.fillRect(0, cy + 8, W, 3, "rgba(255,235,200,0.28)"); // bar-top sheen
        // stools
        for (let i = 0; i < 4; i++) {
            const gx = Math.floor(W * 0.14) + i * Math.floor(W * 0.22);
            bmp.drawCircle(gx, H - 26, 22, "#171310");
            bmp.drawCircle(gx, H - 30, 20, "#2a211b");
        }
    }

    function drawKiosk(bmp, accent) {
        // New York bodega: densely packed colorful shelves, hanging snacks,
        // a plexiglass counter, and a bright lottery-style poster.
        const W = bmp.width, H = bmp.height;
        bmp.gradientFillRect(0, 0, W, H, "#cfc7b0", "#8f886f", true);
        // hanging snack bags near the very top
        const hb = seeded(51);
        const bagCols = ["#e64a3b", "#2f7fd0", "#f2c130", "#38a169", "#e07a1f", "#8e44ad"];
        for (let i = 0; i < 16; i++) {
            const x = 12 + i * ((W - 24) / 16);
            bmp.fillRect(x + 8, 0, 2, 14, "#555");
            drawChipBag(bmp, x, 14, (W - 24) / 16 * 0.7, 34, bagCols[Math.floor(hb() * bagCols.length)]);
        }
        // packed shelf wall (the bodega signature): tight grid of products
        const rnd = seeded(4242);
        const cols = 22, rows = 7;
        const gx0 = Math.floor(W * 0.03), gy0 = Math.floor(H * 0.14);
        const gW = Math.floor(W * 0.94), gH = Math.floor(H * 0.52);
        const cw = gW / cols, ch = gH / rows;
        const prodCols = ["#e74c3c", "#2980b9", "#27ae60", "#f1c40f", "#e67e22", "#9b59b6",
                          "#16a085", "#c0392b", "#2c3e50", "#e91e63", "#f5f0e1", "#00a5a5"];
        for (let r = 0; r < rows; r++) {
            bmp.fillRect(gx0, gy0 + r * ch + ch - 4, gW, 4, "#5a4a34"); // shelf board
            for (let c = 0; c < cols; c++) {
                const x = gx0 + c * cw + 1, y = gy0 + r * ch + 2;
                const w = cw - 2, h = ch - 6;
                const color = prodCols[Math.floor(rnd() * prodCols.length)];
                bmp.fillRect(x, y, w, h, color);
                bmp.fillRect(x, y + h * 0.36, w, h * 0.24, "rgba(250,250,250,0.8)"); // label band
                if (rnd() > 0.6) bmp.fillRect(x, y, w, h * 0.14, shade(color, 40)); // cap
            }
        }
        // bright lottery-style poster on the right, over the shelves
        drawPoster(bmp, Math.floor(W * 0.80), Math.floor(H * 0.18), Math.floor(W * 0.17), Math.floor(H * 0.30), "#d81b60");
        // counter + plexiglass divider
        const cy = Math.floor(H * 0.70);
        bmp.gradientFillRect(0, cy, W, H - cy, "#7d5a3a", "#4a3320", true);
        bmp.fillRect(0, cy, W, 6, "#a67c4e");
        bmp.fillRect(Math.floor(W * 0.04), Math.floor(H * 0.50), Math.floor(W * 0.92), cy - Math.floor(H * 0.50), "rgba(190,225,235,0.14)"); // plexiglass
        bmp.fillRect(Math.floor(W * 0.04), Math.floor(H * 0.50), Math.floor(W * 0.92), 3, "rgba(210,235,245,0.5)");
        bmp.fillRect(Math.floor(W * 0.04), cy - 3, Math.floor(W * 0.92), 3, "rgba(210,235,245,0.4)");
        bmp.fillRect(Math.floor(W * 0.46), Math.floor(H * 0.60), Math.floor(W * 0.14), cy - Math.floor(H * 0.60), "rgba(0,0,0,0.28)"); // pass-through gap
        // small register on the counter
        bmp.fillRect(Math.floor(W * 0.10), cy - 34, 60, 34, "#2b2f36");
        bmp.fillRect(Math.floor(W * 0.10) + 8, cy - 28, 44, 16, "#7fd0ff");
    }

    function drawGrocery(bmp, accent) {
        // 7-Eleven storefront interior: bright, roller-grill glass case,
        // FRESH BUNS signage, promo tags, snack endcap, register counter.
        const W = bmp.width, H = bmp.height;
        bmp.gradientFillRect(0, 0, W, H, "#f3f5f7", "#d3dae0", true);
        // ceiling + fluorescent light strips
        bmp.fillRect(0, 0, W, Math.floor(H * 0.08), "#e7ebef");
        bmp.fillRect(Math.floor(W * 0.10), Math.floor(H * 0.03), Math.floor(W * 0.30), 8, "#ffffff");
        bmp.fillRect(Math.floor(W * 0.60), Math.floor(H * 0.03), Math.floor(W * 0.30), 8, "#ffffff");
        // brand stripe (7-Eleven orange/green/red)
        bmp.fillRect(0, Math.floor(H * 0.08), W, 10, "#e77817");
        bmp.fillRect(0, Math.floor(H * 0.08) + 10, W, 6, "#1a8a4a");
        bmp.fillRect(0, Math.floor(H * 0.08) + 16, W, 6, "#d0202a");
        // snack endcap shelves (left)
        const rnd = seeded(9090);
        const snackCols = ["#e74c3c", "#2980b9", "#27ae60", "#f1c40f", "#e67e22", "#00a5a5", "#8e44ad"];
        const sx = Math.floor(W * 0.03), sw = Math.floor(W * 0.30);
        for (let r = 0; r < 4; r++) {
            const sy = Math.floor(H * 0.16) + r * Math.floor(H * 0.11);
            bmp.fillRect(sx, sy + Math.floor(H * 0.09), sw, 6, "#c7ced6");
            const n = 6, gapW = sw / n;
            for (let i = 0; i < n; i++)
                drawChipBag(bmp, sx + i * gapW + 4, sy + 6, gapW - 8, Math.floor(H * 0.08), snackCols[Math.floor(rnd() * snackCols.length)]);
        }
        // roller-grill glass case (center-right) with hot dogs
        const gx = Math.floor(W * 0.40), gy = Math.floor(H * 0.20);
        const gw = Math.floor(W * 0.42), gh = Math.floor(H * 0.26);
        bmp.fillRect(gx - 6, gy - 6, gw + 12, gh + 12, "#b8c0c8");           // metal frame
        bmp.gradientFillRect(gx, gy, gw, gh, "rgba(225,240,255,0.5)", "rgba(180,205,225,0.35)", true); // glass
        for (let r = 0; r < 3; r++) {
            const ry = gy + 16 + r * Math.floor(gh / 3);
            bmp.fillRect(gx + 10, ry + 14, gw - 20, 4, "#8a8f96"); // roller
            for (let i = 0; i < 7; i++) drawHotDog(bmp, gx + 16 + i * ((gw - 32) / 7), ry, (gw - 32) / 7 * 0.8, 12);
        }
        // FRESH BUNS red sign
        bmp.fillRect(gx, gy + gh + 8, gw, 26, "#d0202a");
        bmp.fontFace = $gameSystem.mainFontFace(); bmp.fontSize = 18; bmp.textColor = "#ffffff";
        bmp.drawText("FRESH BUNS", gx, gy + gh + 8, gw, 26, "center");
        // promo tags ("2 for $3.50" vibe)
        for (const [tx, col] of [[Math.floor(W * 0.60), "#d0202a"], [Math.floor(W * 0.74), "#f2b90c"]]) {
            bmp.fillRect(tx, Math.floor(H * 0.10), 96, 46, col);
            bmp.fillRect(tx + 8, Math.floor(H * 0.10) + 8, 80, 10, "rgba(255,255,255,0.85)");
            bmp.fillRect(tx + 8, Math.floor(H * 0.10) + 24, 80, 14, "rgba(255,255,255,0.9)");
        }
        // register counter across the bottom
        const cy = Math.floor(H * 0.72);
        bmp.gradientFillRect(0, cy, W, H - cy, "#cfd6dc", "#9aa4ad", true);
        bmp.fillRect(0, cy, W, 6, "#e77817");
        bmp.fillRect(Math.floor(W * 0.10), cy - 40, 70, 40, "#2b2f36"); // register
        bmp.fillRect(Math.floor(W * 0.10) + 8, cy - 32, 54, 18, "#7fd0ff");
    }

    // Shared geometry so the drawn cabinet and the live windows line up.
    function vendingLayout() {
        const W = Graphics.width, H = Graphics.height;
        const m = 8, f = 11, bannerH = 52;
        const bx = m + f, bw = W - 2 * (m + f), byt = m + f;
        const gx = bx + 14, gy = byt + bannerH + 18;
        const gw = Math.floor(bw * 0.60);
        const gh = H - 2 * (m + f) - bannerH - 18 - 96;
        const px = gx + gw + 16, pw = bx + bw - 14 - px, py = gy, ph = gh;
        const trayY = H - (m + f) - 84;
        return { W, H, m, f, bannerH, bx, bw, byt, gx, gy, gw, gh, px, pw, py, ph, trayY };
    }

    // The interactive machine's cabinet: banner, EMPTY glowing display (the live
    // product window sits here), a control panel with a credit readout, coin slot
    // and return cup, and the dispense tray.
    function drawVendingFrame(bmp, accent) {
        const L = vendingLayout();
        const dark = shade(accent, -55);
        bmp.gradientFillRect(0, 0, L.W, L.H, "#5c6470", "#39404b", true);
        bmp.fillRect(0, L.H - Math.floor(L.H * 0.11), L.W, Math.floor(L.H * 0.11), "rgba(0,0,0,0.20)");
        bmp.fillRect(L.m, L.m, L.W - 2 * L.m, L.H - 2 * L.m, dark);
        bmp.fillRect(L.bx, L.byt, L.bw, L.H - 2 * L.byt, accent);
        // banner
        bmp.fillRect(L.bx, L.byt, L.bw, L.bannerH, "#f4f4f4");
        bmp.fillRect(L.bx, L.byt + L.bannerH, L.bw, 6, dark);
        bmp.drawCircle(L.bx + 34, L.byt + 26, 15, accent);
        bmp.fontFace = $gameSystem.mainFontFace();
        bmp.fontSize = 26;
        bmp.textColor = shade(accent, -30);
        bmp.drawText("DRINKS", L.bx + 60, L.byt + 4, L.bw - 80, 44, "left");
        // empty illuminated display
        bmp.fillRect(L.gx, L.gy, L.gw, L.gh, shade(accent, -34));
        bmp.gradientFillRect(L.gx, L.gy, L.gw, L.gh, "rgba(235,244,255,0.22)", "rgba(180,210,255,0.10)", true);
        bmp.fillRect(L.gx, L.gy, L.gw, 3, "rgba(255,255,255,0.35)");
        // control panel
        bmp.fillRect(L.px, L.py, L.pw, L.ph, shade(accent, -22));
        bmp.fillRect(L.px, L.py, L.pw, L.ph, "rgba(0,0,0,0.10)");
        // credit readout (dark digital box) - value drawn later by the info window
        bmp.fillRect(L.px + 14, L.py + 16, L.pw - 28, 56, "#0b1410");
        bmp.fillRect(L.px + 14, L.py + 16, L.pw - 28, 3, "#1e2a20");
        // coin slot plate
        const csY = L.py + 96;
        bmp.fillRect(L.px + L.pw * 0.28, csY, L.pw * 0.44, 66, "#c7ced6");
        bmp.fillRect(L.px + L.pw * 0.28, csY, L.pw * 0.44, 4, "#eef2f6");
        bmp.fillRect(L.px + L.pw * 0.47, csY + 14, 9, 34, "#111");   // slot
        // coin return cup
        const crY = csY + 92;
        bmp.fillRect(L.px + L.pw * 0.30, crY, L.pw * 0.40, 30, "#2b2f36");
        bmp.fillRect(L.px + L.pw * 0.34, crY + 8, L.pw * 0.32, 16, "#12151a");
        // dispense tray
        bmp.fillRect(L.gx, L.trayY, L.gw, 62, dark);
        bmp.fillRect(L.gx + 12, L.trayY + 12, L.gw - 24, 40, "rgba(0,0,0,0.5)");
        bmp.fontSize = 18;
        bmp.textColor = "#ffffff";
        bmp.drawText("PUSH", L.gx, L.trayY + 12, L.gw, 40, "center");
    }

    // Price used by the interactive machine. Defaults to the database price;
    // override MerchantShops.vendingPrice if a pricing plugin needs to hook in.
    MerchantShops.vendingPrice = function(item) {
        return item ? item.price : 0;
    };

    const MerchantShopThemes = {
        build: function(theme) {
            if (!theme || !theme.name || theme.name === "none") return null;
            try {
                const bmp = new Bitmap(Graphics.width, Graphics.height);
                switch (theme.name) {
                    case "vending": drawVending(bmp, theme.accent); break;
                    case "bar":     drawBar(bmp, theme.accent); break;
                    case "kiosk":   drawKiosk(bmp, theme.accent); break;
                    case "grocery": drawGrocery(bmp, theme.accent); break;
                    default: return null;
                }
                return bmp;
            } catch (e) {
                console.error("MerchantShops: theme render failed.", e);
                return null;
            }
        }
    };
    MerchantShops.Themes = MerchantShopThemes;

    //=========================================================================
    // INTERACTIVE VENDING MACHINE  (Window_VendingProducts + Scene_MerchantVending)
    //=========================================================================
    // The product grid also holds two control cells at the end: Insert Coin and
    // Coin Return. Everything is one navigable surface, so it works with keyboard,
    // gamepad and mouse without focus juggling.
    const CELL_INSERT = "__insert__";
    const CELL_RETURN = "__return__";

    function Window_VendingProducts() {
        this.initialize.apply(this, arguments);
    }
    Window_VendingProducts.prototype = Object.create(Window_Selectable.prototype);
    Window_VendingProducts.prototype.constructor = Window_VendingProducts;

    Window_VendingProducts.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._scene = null;
        this._merchantId = null;
        this._cells = [];
        this.opacity = 0;          // frame is the drawn cabinet, not a windowskin
    };
    Window_VendingProducts.prototype.setup = function(scene, merchantId, slots) {
        this._scene = scene;
        this._merchantId = merchantId;
        this._cells = slots.slice();
        this._cells.push({ control: CELL_INSERT });
        this._cells.push({ control: CELL_RETURN });
        this.refresh();
        this.select(0);
        this.activate();
    };
    Window_VendingProducts.prototype.maxCols = function() { return VEND_COLS; };
    Window_VendingProducts.prototype.maxItems = function() { return this._cells.length; };
    Window_VendingProducts.prototype.itemHeight = function() { return 100; };
    Window_VendingProducts.prototype.currentCell = function() { return this._cells[this.index()]; };
    Window_VendingProducts.prototype.credit = function() { return this._scene ? this._scene.credit() : 0; };

    Window_VendingProducts.prototype.isCurrentItemEnabled = function() {
        const cell = this.currentCell();
        if (!cell) return false;
        if (cell.control === CELL_INSERT) return $gameParty.gold() > 0;
        if (cell.control === CELL_RETURN) return this.credit() > 0;
        return MerchantShops.remaining(this._merchantId, cell.item) !== 0; // in stock
    };

    Window_VendingProducts.prototype.drawItem = function(index) {
        const cell = this._cells[index];
        if (!cell) return;
        const rect = this.itemRect(index);
        const x = rect.x + 2, y = rect.y + 2, w = rect.width - 4, h = rect.height - 4;
        if (cell.control) {
            this.drawControlCell(cell.control, x, y, w, h);
        } else {
            this.drawProductCell(cell, x, y, w, h);
        }
    };

    Window_VendingProducts.prototype.drawBorder = function(x, y, w, h, color) {
        this.contents.fillRect(x, y, w, 2, color);
        this.contents.fillRect(x, y + h - 2, w, 2, color);
        this.contents.fillRect(x, y, 2, h, color);
        this.contents.fillRect(x + w - 2, y, 2, h, color);
    };

    Window_VendingProducts.prototype.drawProductCell = function(cell, x, y, w, h) {
        const item = cell.item;
        const price = cell.price;
        const rem = MerchantShops.remaining(this._merchantId, item);
        const soldOut = rem === 0;
        const affordable = !soldOut && this.credit() >= price;
        // slot background + lit border
        this.contents.fillRect(x, y, w, h, "rgba(10,14,26,0.55)");
        const border = soldOut ? "rgba(120,120,130,0.55)"
            : (affordable ? "#7CFC00" : "rgba(120,140,200,0.6)");
        this.drawBorder(x, y, w, h, border);
        // big item icon
        const iconSet = ImageManager.loadSystem("IconSet");
        const iw = ImageManager.iconWidth, ih = ImageManager.iconHeight;
        const sx = (item.iconIndex % 16) * iw;
        const sy = Math.floor(item.iconIndex / 16) * ih;
        this.changePaintOpacity(!soldOut);
        this.contents.blt(iconSet, sx, sy, iw, ih, x + w / 2 - 24, y + 8, 48, 48);
        // name
        this.contents.fontSize = 18;
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(item.name, x + 4, y + 54, w - 8, "center");
        // price
        this.contents.fontSize = 18;
        this.changeTextColor(affordable ? "#7CFC00" : ColorManager.systemColor());
        const priceText = soldOut ? "SOLD OUT" : (price + TextManager.currencyUnit);
        this.drawText(priceText, x + 4, y + 74, w - 8, "center");
        // stock chip
        this.contents.fontSize = 14;
        this.changeTextColor(ColorManager.textColor(soldOut ? 7 : 0));
        const stockText = rem < 0 ? "\u221E" : (rem === 0 ? "" : "x" + rem);
        this.drawText(stockText, x + 6, y + 2, w - 12, "right");
        this.changePaintOpacity(true);
        this.resetFontSettings();
        if (soldOut) this.contents.fillRect(x, y, w, h, "rgba(0,0,0,0.45)");
    };

    Window_VendingProducts.prototype.drawControlCell = function(type, x, y, w, h) {
        const insert = type === CELL_INSERT;
        const enabled = insert ? $gameParty.gold() > 0 : this.credit() > 0;
        this.contents.fillRect(x, y, w, h, insert ? "rgba(40,30,10,0.7)" : "rgba(10,30,26,0.7)");
        this.drawBorder(x, y, w, h, enabled ? (insert ? "#ffcf4d" : "#3ad0c0") : "rgba(120,120,130,0.5)");
        // coin glyph
        this.changePaintOpacity(enabled);
        this.contents.drawCircle(x + w / 2, y + 30, 16, insert ? "#ffcf4d" : "#3ad0c0");
        this.contents.fontSize = 16;
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(insert ? "Insert" : "Return", x + 4, y + 50, w - 8, "center");
        this.contents.fontSize = 14;
        this.changeTextColor(ColorManager.systemColor());
        const sub = insert ? ("+" + VEND_COIN + TextManager.currencyUnit) : "coins";
        this.drawText(sub, x + 4, y + 72, w - 8, "center");
        this.changePaintOpacity(true);
        this.resetFontSettings();
    };

    function Scene_MerchantVending() {
        this.initialize.apply(this, arguments);
    }
    Scene_MerchantVending.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_MerchantVending.prototype.constructor = Scene_MerchantVending;

    Scene_MerchantVending.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };
    Scene_MerchantVending.prototype.prepare = function(merchantId, slots, theme) {
        this._merchantId = merchantId;
        this._slots = slots || [];
        this._theme = theme;
        this._credit = 0;
        this._hint = "";
        this._hintTimer = 0;
        this._pushFlash = 0;
    };
    Scene_MerchantVending.prototype.credit = function() { return this._credit; };

    Scene_MerchantVending.prototype.createBackground = function() {
        Scene_MenuBase.prototype.createBackground.call(this);
        const accent = (this._theme && this._theme.accent) || "#c62828";
        try {
            const bmp = new Bitmap(Graphics.width, Graphics.height);
            drawVendingFrame(bmp, accent);
            this._cabinet = new Sprite(bmp);
            this.addChild(this._cabinet);
        } catch (e) {
            console.error("MerchantShops: vending frame failed.", e);
        }
    };

    Scene_MerchantVending.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        const L = vendingLayout();
        // product window over the display area
        const rect = new Rectangle(L.gx + 4, L.gy + 4, L.gw - 8, L.gh - 8);
        this._productWindow = new Window_VendingProducts(rect);
        this._productWindow.setHandler("ok", this.onProductOk.bind(this));
        this._productWindow.setHandler("cancel", this.onExit.bind(this));
        this.addWindow(this._productWindow);
        // transparent info window over the right panel (credit + hints)
        const info = new Rectangle(L.px, L.py, L.pw, L.ph);
        this._infoWindow = new Window_Base(info);
        this._infoWindow.opacity = 0;
        this.addWindow(this._infoWindow);
        // touch hotspots for the coin slot / return cup
        this._insertRect = new Rectangle(L.px + L.pw * 0.28, L.py + 96, L.pw * 0.44, 66);
        this._returnRect = new Rectangle(L.px + L.pw * 0.30, L.py + 188, L.pw * 0.40, 30);
        this._trayCenter = { x: L.gx + L.gw / 2, y: L.trayY + 30 };

        this._productWindow.setup(this, this._merchantId, this._slots);
        this.refreshInfo();
    };

    Scene_MerchantVending.prototype.refreshAll = function() {
        this._productWindow.refresh();
        this.refreshInfo();
    };

    Scene_MerchantVending.prototype.refreshInfo = function() {
        const w = this._infoWindow;
        w.contents.clear();
        const iw = w.innerWidth;
        // credit value in the readout box
        w.contents.fontSize = 30;
        w.changeTextColor("#8dffb0");
        w.drawText(this._credit + TextManager.currencyUnit, 14, 20, iw - 28, "center");
        w.contents.fontSize = 16;
        w.changeTextColor(ColorManager.systemColor());
        w.drawText("CREDIT", 14, 2, iw - 28, "left");
        // wallet + hints lower down
        w.resetFontSettings();
        w.contents.fontSize = 16;
        const baseY = 232;
        w.changeTextColor(ColorManager.systemColor());
        w.drawText("Gold", 8, baseY, iw - 16, "left");
        w.changeTextColor(ColorManager.normalColor());
        w.drawText($gameParty.gold() + TextManager.currencyUnit, 8, baseY, iw - 16, "right");
        w.contents.fontSize = 14;
        w.changeTextColor(ColorManager.textColor(soldColorSafe()));
        const lines = ["Z: insert / push", "X: leave (refunds)"];
        for (let i = 0; i < lines.length; i++) {
            w.drawText(lines[i], 8, baseY + 28 + i * 22, iw - 16, "left");
        }
        // transient hint
        if (this._hintTimer > 0 && this._hint) {
            w.contents.fontSize = 16;
            w.changeTextColor("#ff8a8a");
            w.drawText(this._hint, 8, baseY + 76, iw - 16, "center");
        }
        w.resetFontSettings();
    };

    function soldColorSafe() { return 7; } // dim system grey index

    Scene_MerchantVending.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        // keyboard shortcuts for coin actions
        if (Input.isTriggered("pageup")) this.insertCoin();
        if (Input.isTriggered("pagedown")) this.returnCoins();
        // touch on the coin slot / return cup
        if (TouchInput.isTriggered()) {
            const p = { x: TouchInput.x, y: TouchInput.y };
            if (this.hit(this._insertRect, p)) this.insertCoin();
            else if (this.hit(this._returnRect, p)) this.returnCoins();
        }
        if (this._hintTimer > 0) { this._hintTimer--; if (this._hintTimer === 0) this.refreshInfo(); }
        if (this._pushFlash > 0) {
            this._pushFlash--;
            if (this._flashSprite) this._flashSprite.opacity = this._pushFlash * 8;
        }
    };

    Scene_MerchantVending.prototype.hit = function(rect, p) {
        return p.x >= rect.x && p.x < rect.x + rect.width &&
               p.y >= rect.y && p.y < rect.y + rect.height;
    };

    Scene_MerchantVending.prototype.showHint = function(text) {
        this._hint = text;
        this._hintTimer = 90;
        this.refreshInfo();
    };

    Scene_MerchantVending.prototype.insertCoin = function() {
        const amount = Math.min(VEND_COIN, $gameParty.gold());
        if (amount <= 0) { SoundManager.playBuzzer(); this.showHint("No gold to insert"); return; }
        $gameParty.loseGold(amount);
        this._credit += amount;
        SoundManager.playShop();
        this.refreshAll();
    };

    Scene_MerchantVending.prototype.returnCoins = function() {
        if (this._credit <= 0) { SoundManager.playBuzzer(); return; }
        $gameParty.gainGold(this._credit);
        this._credit = 0;
        SoundManager.playCancel();
        this.refreshAll();
    };

    Scene_MerchantVending.prototype.onProductOk = function() {
        const cell = this._productWindow.currentCell();
        if (!cell) { this._productWindow.activate(); return; }
        if (cell.control === CELL_INSERT) { this.insertCoin(); this._productWindow.activate(); return; }
        if (cell.control === CELL_RETURN) { this.returnCoins(); this._productWindow.activate(); return; }
        // a product: dispense if credit covers it
        const price = cell.price;
        if (this._credit < price) {
            SoundManager.playBuzzer();
            this.showHint("Insert " + (price - this._credit) + TextManager.currencyUnit + " more");
            this._productWindow.activate();
            return;
        }
        this._credit -= price;
        $gameParty.gainItem(cell.item, 1);
        MerchantShops.reduceStock(this._merchantId, cell.item, 1);
        SoundManager.playUseItem();
        this.flashPush();
        this.refreshAll();
        this._productWindow.activate();
    };

    Scene_MerchantVending.prototype.flashPush = function() {
        if (!this._flashSprite) {
            const b = new Bitmap(120, 60);
            b.fillRect(0, 0, 120, 60, "#ffffff");
            this._flashSprite = new Sprite(b);
            this._flashSprite.anchor.x = 0.5;
            this._flashSprite.anchor.y = 0.5;
            this._flashSprite.blendMode = 1; // additive glow
            this._flashSprite.x = this._trayCenter.x;
            this._flashSprite.y = this._trayCenter.y;
            this.addChild(this._flashSprite);
        }
        this._pushFlash = 24;
        this._flashSprite.opacity = 192;
    };

    Scene_MerchantVending.prototype.onExit = function() {
        this.returnCoins();
        this.popScene();
    };

    //-------------------------------------------------------------------------
    // Scene_Shop overrides
    //-------------------------------------------------------------------------
    const _Scene_Shop_prepare = Scene_Shop.prototype.prepare;
    Scene_Shop.prototype.prepare = function(goods, purchaseOnly, merchantId) {
        _Scene_Shop_prepare.call(this, goods, purchaseOnly);
        this._merchantId = merchantId || null;
    };

    // Draw the themed storefront behind the windows (below the window layer).
    const _Scene_Shop_createBackground = Scene_Shop.prototype.createBackground;
    Scene_Shop.prototype.createBackground = function() {
        _Scene_Shop_createBackground.call(this);
        const theme = $gameTemp._merchantShopTheme || null;
        $gameTemp._merchantShopTheme = null; // consume, so a plain event-shop won't inherit it
        this._merchantTheme = theme;
        if (theme) {
            const bmp = MerchantShopThemes.build(theme);
            if (bmp) {
                this._themeSprite = new Sprite(bmp);
                this.addChild(this._themeSprite);
            }
        }
    };

    // After windows exist, tint them to the theme and let the scenery show through.
    const _Scene_Shop_create = Scene_Shop.prototype.create;
    Scene_Shop.prototype.create = function() {
        _Scene_Shop_create.call(this);
        if (this._merchantTheme) this.applyMerchantTheme(this._merchantTheme);
    };

    Scene_Shop.prototype.applyMerchantTheme = function(theme) {
        const t = theme.tone;
        const wins = [
            this._helpWindow, this._goldWindow, this._commandWindow, this._dummyWindow,
            this._numberWindow, this._statusWindow, this._buyWindow,
            this._categoryWindow, this._sellWindow
        ];
        for (const w of wins) {
            if (!w) continue;
            w._msTone = t;
            w.setTone(t[0], t[1], t[2]);
            // keep our tint from being overwritten by the global window tone each frame
            w.updateTone = function() {
                this.setTone(this._msTone[0], this._msTone[1], this._msTone[2]);
            };
            w.backOpacity = theme.back; // lower = more storefront visible behind the panel
        }
    };

    const _Scene_Shop_createBuyWindow = Scene_Shop.prototype.createBuyWindow;
    Scene_Shop.prototype.createBuyWindow = function() {
        _Scene_Shop_createBuyWindow.call(this);
        this._buyWindow._merchantId = this._merchantId;
    };

    const _Scene_Shop_createSellWindow = Scene_Shop.prototype.createSellWindow;
    Scene_Shop.prototype.createSellWindow = function() {
        _Scene_Shop_createSellWindow.call(this);
        this._sellWindow._merchantId = this._merchantId;
    };

    const _Scene_Shop_maxBuy = Scene_Shop.prototype.maxBuy;
    Scene_Shop.prototype.maxBuy = function() {
        const base = _Scene_Shop_maxBuy.call(this);
        if (this._merchantId && this._item) {
            const rem = MerchantShops.remaining(this._merchantId, this._item);
            if (rem >= 0) return Math.min(base, rem);
        }
        return base;
    };

    const _Scene_Shop_doBuy = Scene_Shop.prototype.doBuy;
    Scene_Shop.prototype.doBuy = function(number) {
        _Scene_Shop_doBuy.call(this, number);
        if (this._merchantId && this._item) {
            MerchantShops.reduceStock(this._merchantId, this._item, number);
        }
    };

    //-------------------------------------------------------------------------
    // Window_ShopBuy overrides (stock cap + stock display)
    //-------------------------------------------------------------------------
    const _Window_ShopBuy_isEnabled = Window_ShopBuy.prototype.isEnabled;
    Window_ShopBuy.prototype.isEnabled = function(item) {
        let ok = _Window_ShopBuy_isEnabled.call(this, item);
        if (ok && this._merchantId) {
            if (MerchantShops.remaining(this._merchantId, item) === 0) ok = false;
        }
        return ok;
    };

    Window_ShopBuy.prototype.drawItem = function(index) {
        const item = this.itemAt(index);
        const price = this.price(item);
        const rect = this.itemLineRect(index);
        const priceWidth = this.priceWidth();
        const stockWidth = this._merchantId ? 72 : 0;
        const priceX = rect.x + rect.width - priceWidth;
        const stockX = priceX - stockWidth;
        const nameWidth = rect.width - priceWidth - stockWidth;

        this.changePaintOpacity(this.isEnabled(item));
        this.drawItemName(item, rect.x, rect.y, nameWidth);

        if (this._merchantId && item) {
            const rem = MerchantShops.remaining(this._merchantId, item);
            const label = rem < 0 ? "\u221E" : "x" + rem; // ∞ or xN
            this.drawText(label, stockX, rect.y, stockWidth - this.itemPadding(), "right");
        }

        this.drawText(price, priceX, rect.y, priceWidth, "right");
        this.changePaintOpacity(true);
    };

    //-------------------------------------------------------------------------
    // Window_ShopSell override (optional sell restriction)
    //-------------------------------------------------------------------------
    Window_ShopSell.prototype.includes = function(item) {
        if (this._merchantId && MerchantShops.restrictSell(this._merchantId)) {
            if (!MerchantShops.matches(this._merchantId, item)) return false;
        }
        return Window_ItemList.prototype.includes.call(this, item);
    };
})();
