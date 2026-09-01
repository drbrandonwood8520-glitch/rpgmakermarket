//=============================================================================
// ClawMachine.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.1.0 Arcade claw machine minigame with a full neon cabinet: marquee, glass chamber, joystick & buttons. Hybrid skill/luck grab and a token economy.
 * @author You
 * @url
 *
 * @param tokenVariableId
 * @text Token Variable
 * @type variable
 * @desc Game variable that stores the player's token balance.
 * @default 1
 *
 * @param collectibleVariableId
 * @text Collectible Counter Variable
 * @type variable
 * @desc Variable incremented when a "Collectible" prize is won (e.g. plushies collected).
 * @default 2
 *
 * @param playCost
 * @text Tokens Per Play
 * @type number
 * @min 1
 * @desc Tokens spent each time the claw drops.
 * @default 1
 *
 * @param tokensPerPurchase
 * @text Tokens Per Purchase
 * @type number
 * @min 1
 * @desc How many tokens a single buy grants.
 * @default 5
 *
 * @param goldPerPurchase
 * @text Gold Per Purchase
 * @type number
 * @min 0
 * @desc Gold cost for one token purchase.
 * @default 100
 *
 * @param grabBaseChance
 * @text Base Hold Chance
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @desc Starting probability the claw keeps a prize before skill/weight modifiers.
 * @default 0.45
 *
 * @param grabRadius
 * @text Grab Radius (px)
 * @type number
 * @min 8
 * @desc How close the claw center must be to a prize to grab it at all.
 * @default 44
 *
 * @param aimWeight
 * @text Aim Skill Weight
 * @type number
 * @decimals 2
 * @desc How much perfect aim adds to the hold chance (0..1).
 * @default 0.25
 *
 * @param gripWeight
 * @text Grip Skill Weight
 * @type number
 * @decimals 2
 * @desc How much a perfect grip meter adds to the hold chance (0..1).
 * @default 0.30
 *
 * @param weightPenalty
 * @text Per-Weight Penalty
 * @type number
 * @decimals 2
 * @desc Hold chance lost per point of prize weight above 1.
 * @default 0.15
 *
 * @param cabinetTitle
 * @text Marquee Title
 * @type string
 * @desc Text shown on the lit marquee at the top of the cabinet.
 * @default CLAW MACHINE
 *
 * @param winCommonEvent
 * @text On-Win Common Event
 * @type common_event
 * @desc Optional common event run whenever any prize is won. 0 = none.
 * @default 0
 *
 * @param prizes
 * @text Prize Pool
 * @type struct<Prize>[]
 * @desc Prizes scattered on the bed. If empty, a built-in demo set is used.
 * @default []
 *
 * @command open
 * @text Open Claw Machine
 * @desc Launches the claw machine scene.
 *
 * @help
 * ============================================================================
 * ClawMachine.js
 * ============================================================================
 *
 * A self-contained arcade minigame drawn entirely in code - no image files
 * required. The whole scene is a neon claw-machine cabinet: a lit marquee up
 * top, a glass prize chamber in the middle, and a control deck with a joystick
 * and buttons at the bottom.
 *
 * The player moves a claw freely in 8 directions and drops it. A grab has two
 * skill layers and one luck layer:
 *
 *   1. AIM  (skill) - the claw must be within Grab Radius of a prize, and the
 *                     closer it is, the better the hold chance.
 *   2. GRIP (skill) - a marker sweeps the GRIP POWER meter; stopping it in the
 *                     green sweet spot maximizes grip strength.
 *   3. HOLD (luck)  - a final roll folds together base chance, aim, grip, and
 *                     the prize's weight. Heavy prizes slip more often.
 *
 * Controls (in scene):
 *   Arrow keys / WASD ... move the claw
 *   OK (Enter/Z) ........ drop the claw, then lock the grip meter
 *   Shift ............... buy tokens with gold
 *   Cancel (Esc/X) ...... leave the machine
 *
 * ----------------------------------------------------------------------------
 * Setup
 * ----------------------------------------------------------------------------
 * 1. Pick a game variable to hold tokens (Token Variable param) and, if you
 *    use collectibles, a second variable to count them.
 * 2. Optionally define your Prize Pool. Each prize has:
 *      - Label:       shown in results.
 *      - Reward Type: Item / Weapon / Armor / Collectible / None.
 *      - Reward Id:   database id (ignored for Collectible / None).
 *      - Icon Index:  which icon to draw on the bed.
 *      - Weight:      1 (easy) to 3 (hard). Higher = slips more.
 *      - Count:       how many copies scatter on the bed.
 *    "Collectible" rewards add 1 to the Collectible Counter Variable.
 * 3. In an event, use Plugin Command > ClawMachine > Open Claw Machine.
 *
 * ----------------------------------------------------------------------------
 * Tuning the difficulty
 * ----------------------------------------------------------------------------
 *   Easier: raise Base Hold Chance / Grab Radius, lower Per-Weight Penalty.
 *   Harder: do the opposite, and give good prizes Weight 3.
 * Final hold chance is clamped to 5%..95%.
 *
 * ----------------------------------------------------------------------------
 * Terms of Use: free for commercial and non-commercial projects.
 * ============================================================================
 */
/*~struct~Prize:
 * @param label
 * @text Label
 * @type string
 * @default Prize
 *
 * @param rewardType
 * @text Reward Type
 * @type select
 * @option Item
 * @value item
 * @option Weapon
 * @value weapon
 * @option Armor
 * @value armor
 * @option Collectible (counter)
 * @value collectible
 * @option None
 * @value none
 * @default item
 *
 * @param rewardId
 * @text Reward Id
 * @type number
 * @min 0
 * @default 1
 *
 * @param iconIndex
 * @text Icon Index
 * @type number
 * @min 0
 * @default 176
 *
 * @param weight
 * @text Weight (1-3)
 * @type number
 * @min 1
 * @max 3
 * @default 1
 *
 * @param count
 * @text Count On Bed
 * @type number
 * @min 1
 * @default 3
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "ClawMachine";
    const P = PluginManager.parameters(PLUGIN_NAME);

    const CFG = {
        tokenVar: Number(P.tokenVariableId || 1),
        collectibleVar: Number(P.collectibleVariableId || 2),
        playCost: Math.max(1, Number(P.playCost || 1)),
        tokensPerBuy: Math.max(1, Number(P.tokensPerPurchase || 5)),
        goldPerBuy: Math.max(0, Number(P.goldPerPurchase || 100)),
        baseChance: Number(P.grabBaseChance || 0.45),
        grabRadius: Number(P.grabRadius || 44),
        aimWeight: Number(P.aimWeight || 0.25),
        gripWeight: Number(P.gripWeight || 0.3),
        weightPenalty: Number(P.weightPenalty || 0.15),
        title: String(P.cabinetTitle || "CLAW MACHINE"),
        winCommonEvent: Number(P.winCommonEvent || 0)
    };

    // ---- Palette (neon arcade cabinet) -----------------------------------
    const COL = {
        bodyHi: "#2a2150",
        bodyLo: "#0b0918",
        panelHi: "#3a2f63",
        panelLo: "#181229",
        neonCyan: "#37e6ff",
        neonMag: "#ff3ea5",
        steelHi: "#d3ddec",
        steelMid: "#8b96ab",
        steelLo: "#525c72",
        glassHi: "#2f4d74",
        glassLo: "#101d33",
        deckHi: "#333a4a",
        deckLo: "#12151f",
        led: "#7bff9b",
        ledDim: "#1c3323",
        amber: "#ffcf6b",
        amberDim: "#3a2c12",
        bulb: "#ffe58a"
    };

    // ---- small bitmap drawing helpers ------------------------------------
    function roundRect(b, x, y, w, h, r, color) {
        r = Math.min(r, Math.floor(w / 2), Math.floor(h / 2));
        b.fillRect(x + r, y, w - 2 * r, h, color);
        b.fillRect(x, y + r, w, h - 2 * r, color);
        b.drawCircle(x + r, y + r, r, color);
        b.drawCircle(x + w - r, y + r, r, color);
        b.drawCircle(x + r, y + h - r, r, color);
        b.drawCircle(x + w - r, y + h - r, r, color);
    }

    function glowRect(b, x, y, w, h, r, glow, steps) {
        steps = steps || 5;
        for (let i = steps; i >= 1; i--) {
            const p = i * 2;
            roundRect(b, x - p, y - p, w + p * 2, h + p * 2, r + p, glow);
        }
    }

    function bevelPanel(b, x, y, w, h, r, hi, lo) {
        // soft top-lit metal panel
        roundRect(b, x, y, w, h, r, lo);
        b.gradientFillRect(x + 2, y + 2, w - 4, Math.floor(h * 0.55), hi, lo, true);
    }

    function neonText(b, text, x, y, w, h, opts) {
        opts = opts || {};
        b.fontFace = opts.face || $gameSystem.mainFontFace();
        b.fontBold = opts.bold !== false;
        b.fontSize = opts.size || 24;
        if (opts.glow) {
            b.textColor = opts.glow;
            b.outlineColor = opts.glow;
            b.outlineWidth = opts.glowWidth || 10;
            b.drawText(text, x, y, w, h, opts.align || "center");
        }
        b.textColor = opts.fill || "#ffffff";
        b.outlineColor = opts.outline || "rgba(0,0,0,0.65)";
        b.outlineWidth = opts.outlineWidth != null ? opts.outlineWidth : 3;
        b.drawText(text, x, y, w, h, opts.align || "center");
        b.fontFace = $gameSystem.mainFontFace();
        b.fontBold = false;
    }

    // ---- Prize pool -------------------------------------------------------
    function parsePrizes() {
        let list = [];
        try {
            const raw = JSON.parse(P.prizes || "[]");
            list = raw.map(s => {
                const o = JSON.parse(s);
                return {
                    label: String(o.label || "Prize"),
                    rewardType: String(o.rewardType || "item"),
                    rewardId: Number(o.rewardId || 0),
                    iconIndex: Number(o.iconIndex || 176),
                    weight: Math.max(1, Math.min(3, Number(o.weight || 1))),
                    count: Math.max(1, Number(o.count || 1))
                };
            });
        } catch (e) {
            list = [];
        }
        if (list.length === 0) {
            list = [
                { label: "Potion",  rewardType: "item",        rewardId: 1, iconIndex: 176, weight: 1, count: 4 },
                { label: "Ether",   rewardType: "item",        rewardId: 2, iconIndex: 177, weight: 1, count: 3 },
                { label: "Plushie", rewardType: "collectible", rewardId: 0, iconIndex: 84,  weight: 2, count: 3 },
                { label: "Rare Blade", rewardType: "weapon",   rewardId: 1, iconIndex: 96,  weight: 3, count: 1 },
                { label: "Sturdy Shield", rewardType: "armor", rewardId: 1, iconIndex: 128, weight: 3, count: 1 }
            ];
        }
        return list;
    }

    PluginManager.registerCommand(PLUGIN_NAME, "open", () => {
        SceneManager.push(Scene_ClawMachine);
    });

    function tokens() { return $gameVariables.value(CFG.tokenVar); }
    function setTokens(n) { $gameVariables.setValue(CFG.tokenVar, Math.max(0, n)); }

    //=========================================================================
    // Scene_ClawMachine
    //=========================================================================
    class Scene_ClawMachine extends Scene_MenuBase {
        create() {
            super.create();
            this._state = "aiming";
            this._timer = 0;
            this._grip = 0;
            this._gripDir = 1;
            this._lastGrip = 0;
            this._targetPrize = null;
            this._resultText = "";
            this.setupLayout();
            this.createCabinet();
            this.createChamber();
            this.createClaw();
            this.createGripMeter();
            this.createReadouts();
            this.spawnPrizes();
            this.refreshStatus();
            this.setMessage("Move the claw with the arrows.  Press OK to drop.");
        }

        createBackground() {
            super.createBackground();
            // darken the blurred map so the cabinet pops as the focus
            if (this._backgroundSprite) this._backgroundSprite.opacity = 128;
        }

        // --- layout geometry (resolution independent) ----------------------
        setupLayout() {
            const bw = Graphics.boxWidth;
            const bh = Graphics.boxHeight;
            this._bw = bw;
            this._bh = bh;

            const sideW = Math.floor(bw * 0.085);
            const marqueeH = Math.floor(bh * 0.155);
            const deckTop = bh - Math.floor(bh * 0.26);
            const reserve = 108; // grip band + prompt band + gaps
            const frame = 16;

            this._marquee = { x: sideW, y: 8, w: bw - sideW * 2, h: marqueeH - 12 };

            const chamberY = marqueeH + 6;
            const chamberBottom = deckTop - reserve;
            this._chamber = { x: sideW, y: chamberY, w: bw - sideW * 2, h: chamberBottom - chamberY };
            this._frame = frame;
            this._bed = {
                x: this._chamber.x + frame,
                y: this._chamber.y + frame,
                w: this._chamber.w - frame * 2,
                h: this._chamber.h - frame * 2
            };

            this._gripRect = {
                x: Math.floor(bw * 0.22),
                y: chamberBottom + 8,
                w: Math.floor(bw * 0.56),
                h: 30
            };
            this._promptRect = {
                x: sideW + 10,
                y: this._gripRect.y + this._gripRect.h + 8,
                w: bw - (sideW + 10) * 2,
                h: 40
            };

            const deckH = bh - deckTop;
            this._deck = { x: 0, y: deckTop, w: bw, h: deckH };
            const midY = deckTop + Math.floor(deckH * 0.5);
            const jr = Math.floor(deckH * 0.22);
            this._joy = { cx: Math.floor(bw * 0.20), cy: midY, r: jr };
            this._btnR = Math.floor(deckH * 0.16);
            this._btnA = { cx: Math.floor(bw * 0.775), cy: midY, r: this._btnR };
            this._btnB = { cx: Math.floor(bw * 0.885), cy: midY, r: this._btnR };
            this._coin = {
                x: Math.floor(bw * 0.61),
                y: deckTop + Math.floor(deckH * 0.24),
                w: Math.floor(bw * 0.055),
                h: Math.floor(deckH * 0.5)
            };
            this._ledRect = {
                x: Math.floor(bw * 0.335),
                y: deckTop + Math.floor(deckH * 0.20),
                w: Math.floor(bw * 0.24),
                h: Math.floor(deckH * 0.60)
            };

            this._clawX = this._bed.x + this._bed.w / 2;
            this._clawY = this._bed.y + this._bed.h / 2;
            this._clawSpeed = Math.max(3, Math.floor(bw / 200));
        }

        // --- the static cabinet art ---------------------------------------
        createCabinet() {
            const bw = this._bw, bh = this._bh;
            const spr = new Sprite(new Bitmap(bw, bh));
            const b = spr.bitmap;

            // cabinet body
            b.gradientFillRect(0, 0, bw, bh, COL.bodyHi, COL.bodyLo, true);
            // ambient neon edge wash down the two pillars
            b.gradientFillRect(0, 0, Math.floor(bw * 0.09), bh, "rgba(255,62,165,0.20)", "rgba(255,62,165,0)", false);
            b.gradientFillRect(Math.floor(bw * 0.91), 0, Math.floor(bw * 0.09), bh, "rgba(55,230,255,0)", "rgba(55,230,255,0.20)", false);

            this.drawMarquee(b);
            this.drawChamberFrame(b);
            this.drawDeck(b);

            this._cabinet = spr;
            this.addChild(spr);
        }

        drawMarquee(b) {
            const m = this._marquee;
            // outer neon halo + housing
            glowRect(b, m.x, m.y, m.w, m.h, 16, "rgba(255,62,165,0.10)", 5);
            roundRect(b, m.x - 3, m.y - 3, m.w + 6, m.h + 6, 18, COL.neonMag);
            bevelPanel(b, m.x, m.y, m.w, m.h, 15, COL.panelHi, COL.panelLo);
            // marquee bulbs around the rim
            const bulbGap = 34;
            for (let bx = m.x + 18; bx < m.x + m.w - 10; bx += bulbGap) {
                b.drawCircle(bx, m.y + 10, 3, COL.bulb);
                b.drawCircle(bx, m.y + m.h - 10, 3, COL.bulb);
            }
            for (let by = m.y + 22; by < m.y + m.h - 14; by += bulbGap) {
                b.drawCircle(m.x + 10, by, 3, COL.bulb);
                b.drawCircle(m.x + m.w - 10, by, 3, COL.bulb);
            }
            // title
            neonText(b, CFG.title, m.x, m.y + Math.floor(m.h * 0.16), m.w, Math.floor(m.h * 0.7), {
                size: Math.floor(m.h * 0.48),
                fill: "#ffffff",
                glow: "rgba(55,230,255,0.55)",
                glowWidth: 12,
                align: "center"
            });
        }

        drawChamberFrame(b) {
            const c = this._chamber;
            // neon halo behind the glass box
            glowRect(b, c.x, c.y, c.w, c.h, 14, "rgba(55,230,255,0.10)", 5);
            // steel frame ring
            roundRect(b, c.x - 4, c.y - 4, c.w + 8, c.h + 8, 16, COL.neonCyan);
            bevelPanel(b, c.x, c.y, c.w, c.h, 14, COL.steelHi, COL.steelLo);
            // corner brackets
            const f = this._frame, br = COL.steelMid;
            b.fillRect(c.x + f, c.y + f, 14, 6, br);
            b.fillRect(c.x + f, c.y + f, 6, 14, br);
            b.fillRect(c.x + c.w - f - 14, c.y + f, 14, 6, br);
            b.fillRect(c.x + c.w - f - 6, c.y + f, 6, 14, br);
            b.fillRect(c.x + f, c.y + c.h - f - 6, 14, 6, br);
            b.fillRect(c.x + f, c.y + c.h - f - 14, 6, 14, br);
            b.fillRect(c.x + c.w - f - 14, c.y + c.h - f - 6, 14, 6, br);
            b.fillRect(c.x + c.w - f - 6, c.y + c.h - f - 14, 6, 14, br);
        }

        drawDeck(b) {
            const d = this._deck;
            // control deck panel with a lit front lip
            b.gradientFillRect(d.x, d.y, d.w, d.h, COL.deckHi, COL.deckLo, true);
            b.fillRect(d.x, d.y, d.w, 4, COL.neonMag);
            b.gradientFillRect(d.x, d.y + 4, d.w, 10, "rgba(255,62,165,0.25)", "rgba(255,62,165,0)", true);

            this.drawJoystick(b, this._joy.cx, this._joy.cy, this._joy.r);
            this.drawButton(b, this._btnA.cx, this._btnA.cy, this._btnA.r, "#ff4d5e", "#ff9aa4", "DROP");
            this.drawButton(b, this._btnB.cx, this._btnB.cy, this._btnB.r, "#ffd24d", "#fff0a8", "BUY");
            this.drawCoinSlot(b, this._coin);

            // controls legend along the bottom
            neonText(b, "MOVE  Arrows / Stick        DROP  OK        BUY  Shift        EXIT  Cancel",
                d.x, d.y + d.h - 26, d.w, 22, {
                    size: 16, bold: false, fill: "#cfd6e6", glow: "rgba(55,230,255,0.25)", glowWidth: 4, align: "center"
                });
        }

        drawJoystick(b, cx, cy, r) {
            // base plate
            b.drawCircle(cx, cy + r * 0.5, r, "#0c0e15");
            b.drawCircle(cx, cy + r * 0.5, r - 4, "#2a2f3d");
            b.gradientFillRect(cx - r + 4, cy + r * 0.5 - r + 4, (r - 4) * 2, r, "#3d4457", "#1a1e28", true);
            // chrome shaft
            b.gradientFillRect(cx - 5, cy - r * 0.4, 10, r, COL.steelHi, COL.steelLo, false);
            // ball
            const bally = cy - r * 0.55;
            b.drawCircle(cx, bally, Math.floor(r * 0.62), "#0a0a0f");
            b.drawCircle(cx, bally, Math.floor(r * 0.52), "#e0322f");
            b.drawCircle(cx - r * 0.16, bally - r * 0.16, Math.floor(r * 0.22), "#ff9b78");
            b.drawCircle(cx - r * 0.22, bally - r * 0.22, Math.floor(r * 0.09), "#ffffff");
        }

        drawButton(b, cx, cy, r, base, top, label) {
            // socket + colored dome
            b.drawCircle(cx, cy, r + 5, "#0a0c12");
            b.drawCircle(cx, cy, r + 2, "#2b3040");
            b.drawCircle(cx, cy, r, base);
            b.drawCircle(cx, cy - r * 0.12, Math.floor(r * 0.78), top);
            b.drawCircle(cx, cy - r * 0.28, Math.floor(r * 0.34), "rgba(255,255,255,0.75)");
            neonText(b, label, cx - r - 20, cy + r + 6, (r + 20) * 2, 20, {
                size: 15, fill: "#e9edf7", outlineWidth: 4, align: "center"
            });
        }

        drawCoinSlot(b, s) {
            roundRect(b, s.x, s.y, s.w, s.h, 8, "#0b0d14");
            b.gradientFillRect(s.x + 4, s.y + 4, s.w - 8, Math.floor(s.h * 0.5), "#3a4152", "#141822", true);
            // the slot
            const slotW = 8;
            b.fillRect(s.x + s.w / 2 - slotW / 2, s.y + 10, slotW, s.h - 30, "#04060a");
            b.fillRect(s.x + s.w / 2 - slotW / 2, s.y + 10, slotW, 3, COL.neonCyan);
            neonText(b, "INSERT", s.x - 10, s.y + s.h - 16, s.w + 20, 14, { size: 11, fill: COL.amber, outlineWidth: 3 });
            neonText(b, "TOKEN", s.x - 10, s.y + s.h - 4, s.w + 20, 14, { size: 11, fill: COL.amber, outlineWidth: 3 });
        }

        // --- glass prize chamber interior + prize layer -------------------
        createChamber() {
            const bed = this._bed;
            const spr = new Sprite(new Bitmap(bed.w, bed.h));
            const b = spr.bitmap;
            spr.x = bed.x;
            spr.y = bed.y;
            // glass interior
            b.gradientFillRect(0, 0, bed.w, bed.h, COL.glassHi, COL.glassLo, true);
            // inner vignette
            b.gradientFillRect(0, 0, bed.w, 24, "rgba(0,0,0,0.35)", "rgba(0,0,0,0)", true);
            b.gradientFillRect(0, bed.h - 24, bed.w, 24, "rgba(0,0,0,0)", "rgba(0,0,0,0.4)", true);
            // diagonal glass sheen (top-left)
            b.gradientFillRect(0, 0, Math.floor(bed.w * 0.5), Math.floor(bed.h * 0.4),
                "rgba(255,255,255,0.10)", "rgba(255,255,255,0)", false);
            // faint floor grid
            const grid = "rgba(120,170,220,0.10)";
            for (let gx = 40; gx < bed.w; gx += 48) b.fillRect(gx, 0, 1, bed.h, grid);
            for (let gy = 40; gy < bed.h; gy += 48) b.fillRect(0, gy, bed.w, 1, grid);
            this._bedSprite = spr;
            this.addChild(spr);

            this._prizeLayer = new Sprite();
            this._prizeLayer.x = 0;
            this._prizeLayer.y = 0;
            this.addChild(this._prizeLayer);
        }

        // --- the claw ------------------------------------------------------
        createClaw() {
            const size = 56;
            const spr = new Sprite(new Bitmap(size, size));
            const b = spr.bitmap;
            const c = size / 2;
            // soft glow
            b.drawCircle(c, c, 16, "rgba(55,230,255,0.20)");
            b.drawCircle(c, c, 11, "rgba(55,230,255,0.30)");
            // three prongs
            const prong = (ang) => {
                for (let i = 8; i <= 20; i += 4) {
                    const px = c + Math.cos(ang) * i;
                    const py = c + Math.sin(ang) * i;
                    const rr = 4 - (i - 8) * 0.12;
                    b.drawCircle(px, py, Math.max(2, rr), "#ffe9a8");
                }
            };
            prong(-Math.PI / 2);
            prong(Math.PI / 6);
            prong((Math.PI * 5) / 6);
            // hub
            b.drawCircle(c, c, 8, "#a8791f");
            b.drawCircle(c, c, 6, "#ffd873");
            b.drawCircle(c, c, 2, "#3a2a08");
            spr.anchor.x = 0.5;
            spr.anchor.y = 0.5;
            this._claw = spr;
            this.addChild(spr);
            this.updateClawSprite();
        }

        updateClawSprite() {
            this._claw.x = this._clawX;
            this._claw.y = this._clawY;
        }

        // --- grip power meter ---------------------------------------------
        createGripMeter() {
            const r = this._gripRect;
            const spr = new Sprite(new Bitmap(r.w, r.h));
            spr.x = r.x;
            spr.y = r.y;
            spr.visible = false;
            this._gripMeter = spr;
            this._sweetCenter = 0.78;
            this._sweetHalf = 0.11;
            this.addChild(spr);
        }

        drawGripMeter() {
            const b = this._gripMeter.bitmap;
            const w = b.width, h = b.height;
            b.clear();
            roundRect(b, 0, 0, w, h, 8, "#0a0f18");
            // segmented cells
            const cells = 24, pad = 3;
            const cw = (w - pad * (cells + 1)) / cells;
            for (let i = 0; i < cells; i++) {
                const cx = pad + i * (cw + pad);
                const t = i / (cells - 1);
                const inSweet = Math.abs(t - this._sweetCenter) <= this._sweetHalf;
                const lit = t <= this._grip;
                let color;
                if (inSweet) color = lit ? "#66ff88" : "#204a2c";
                else color = lit ? (t < 0.5 ? "#ffd24d" : "#ff8a4d") : "#20263a";
                b.fillRect(cx, 5, cw, h - 10, color);
            }
            // marker
            const mx = Math.floor(this._grip * (w - 6)) + 3;
            b.fillRect(mx - 2, 1, 4, h - 2, "#ffffff");
            b.fillRect(mx - 1, 1, 2, h - 2, COL.neonCyan);
            // frame
            roundRect(b, 0, 0, w, 2, 1, COL.neonMag);
            neonText(b, "GRIP", -2, 0, 44, h, { size: 14, fill: "#ffffff", align: "left", outlineWidth: 3 });
        }

        // --- LED readouts + prompt screen ---------------------------------
        createReadouts() {
            const led = this._ledRect;
            const ledSpr = new Sprite(new Bitmap(led.w, led.h));
            ledSpr.x = led.x;
            ledSpr.y = led.y;
            this._ledPanel = ledSpr;
            this.addChild(ledSpr);

            const pr = this._promptRect;
            const prSpr = new Sprite(new Bitmap(pr.w, pr.h));
            prSpr.x = pr.x;
            prSpr.y = pr.y;
            this._promptPanel = prSpr;
            this.addChild(prSpr);

            // ambient marquee glow overlay (gentle pulse, not input-driven)
            const m = this._marquee;
            const glowSpr = new Sprite(new Bitmap(m.w + 40, m.h + 40));
            glowSpr.x = m.x - 20;
            glowSpr.y = m.y - 20;
            glowSpr.blendMode = 1; // additive
            const gb = glowSpr.bitmap;
            glowRect(gb, 20, 20, m.w, m.h, 16, "rgba(55,230,255,0.06)", 6);
            this._marqueeGlow = glowSpr;
            this.addChild(glowSpr);
        }

        refreshStatus() {
            const b = this._ledPanel.bitmap;
            const w = b.width, h = b.height;
            b.clear();
            roundRect(b, 0, 0, w, h, 8, "#04070c");
            roundRect(b, 3, 3, w - 6, h - 6, 6, COL.ledDim);
            const half = Math.floor(h / 2);
            neonText(b, "CREDITS", 12, 4, w - 24, half - 4, { size: 15, fill: COL.led, align: "left", glow: "rgba(123,255,155,0.5)", glowWidth: 5 });
            neonText(b, String(tokens()), 12, 4, w - 16, half - 4, { size: 20, fill: COL.led, align: "right", glow: "rgba(123,255,155,0.5)", glowWidth: 6 });
            neonText(b, "GOLD", 12, half, w - 24, half - 4, { size: 15, fill: COL.amber, align: "left", glow: "rgba(255,207,107,0.5)", glowWidth: 5 });
            neonText(b, String($gameParty.gold()), 12, half, w - 16, half - 4, { size: 20, fill: COL.amber, align: "right", glow: "rgba(255,207,107,0.5)", glowWidth: 6 });
        }

        setMessage(text) {
            const b = this._promptPanel.bitmap;
            const w = b.width, h = b.height;
            b.clear();
            roundRect(b, 0, 0, w, h, 8, "#04070c");
            roundRect(b, 3, 3, w - 6, h - 6, 6, COL.amberDim);
            neonText(b, text, 12, 0, w - 24, h, {
                size: 20, fill: COL.amber, align: "center", glow: "rgba(255,207,107,0.45)", glowWidth: 6
            });
        }

        // --- prize spawning ------------------------------------------------
        spawnPrizes() {
            this._prizes = [];
            const defs = parsePrizes();
            const bed = this._bed;
            const pad = 36;
            const placed = [];
            const minDist = 44;
            const tryPlace = () => {
                for (let attempt = 0; attempt < 40; attempt++) {
                    const x = bed.x + pad + Math.random() * (bed.w - pad * 2);
                    const y = bed.y + pad + Math.random() * (bed.h - pad * 2);
                    if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= minDist)) {
                        placed.push({ x, y });
                        return { x, y };
                    }
                }
                const x = bed.x + pad + Math.random() * (bed.w - pad * 2);
                const y = bed.y + pad + Math.random() * (bed.h - pad * 2);
                placed.push({ x, y });
                return { x, y };
            };
            for (const def of defs) {
                for (let i = 0; i < def.count; i++) {
                    const pos = tryPlace();
                    const sprite = this.makePrizeSprite(def);
                    sprite.x = pos.x;
                    sprite.y = pos.y;
                    this._prizeLayer.addChild(sprite);
                    this._prizes.push({ def, x: pos.x, y: pos.y, sprite, alive: true });
                }
            }
        }

        makePrizeSprite(def) {
            const size = 48;
            const spr = new Sprite(new Bitmap(size, size));
            const b = spr.bitmap;
            const c = size / 2;
            // contact shadow
            b.drawCircle(c, c + 12, 15, "rgba(0,0,0,0.30)");
            // rim tint by weight (heavier = warmer/harder)
            const tint = def.weight >= 3 ? "#6a2f3a" : def.weight === 2 ? "#5a5330" : "#2f5a44";
            b.drawCircle(c, c, 18, "rgba(0,0,0,0.35)");
            b.drawCircle(c, c, 16, tint);
            b.drawCircle(c - 5, c - 5, 6, "rgba(255,255,255,0.18)");
            this.blitIcon(b, def.iconIndex, c - 16, c - 16);
            spr.anchor.x = 0.5;
            spr.anchor.y = 0.5;
            return spr;
        }

        blitIcon(bitmap, iconIndex, dx, dy) {
            const iset = ImageManager.loadSystem("IconSet");
            const pw = ImageManager.iconWidth;
            const ph = ImageManager.iconHeight;
            const sx = (iconIndex % 16) * pw;
            const sy = Math.floor(iconIndex / 16) * ph;
            const doBlit = () => bitmap.blt(iset, sx, sy, pw, ph, dx, dy);
            if (iset.isReady()) doBlit();
            else iset.addLoadListener(doBlit);
        }

        //=====================================================================
        // Update loop / state machine
        //=====================================================================
        update() {
            super.update();
            this.updateAmbient();
            switch (this._state) {
                case "aiming":    this.updateAiming();    break;
                case "gripping":  this.updateGripping();  break;
                case "resolving": this.updateResolving(); break;
                case "result":    this.updateResult();    break;
                case "buying":    this.updateBuying();    break;
            }
        }

        updateAmbient() {
            if (this._marqueeGlow) {
                const t = Graphics.frameCount * 0.05;
                this._marqueeGlow.opacity = 150 + Math.round(70 * Math.sin(t));
            }
        }

        updateAiming() {
            const dir = Input.dir8;
            if (dir !== 0) {
                const dx = [0, -1, 0, 1, -1, 0, 1, -1, 0, 1][dir];
                const dy = [0, 1, 1, 1, 0, 0, 0, -1, -1, -1][dir];
                this._clawX += dx * this._clawSpeed;
                this._clawY += dy * this._clawSpeed;
                const bed = this._bed;
                this._clawX = this._clawX.clamp(bed.x + 6, bed.x + bed.w - 6);
                this._clawY = this._clawY.clamp(bed.y + 6, bed.y + bed.h - 6);
                this.updateClawSprite();
            }
            if (Input.isTriggered("shift")) { this.beginBuy(); return; }
            if (Input.isTriggered("cancel")) { SoundManager.playCancel(); this.popScene(); return; }
            if (Input.isTriggered("ok")) {
                if (tokens() < CFG.playCost) {
                    SoundManager.playBuzzer();
                    this.setMessage("Not enough tokens.  Press Shift to buy some.");
                    return;
                }
                setTokens(tokens() - CFG.playCost);
                this.refreshStatus();
                this.beginGrip();
            }
        }

        beginGrip() {
            SoundManager.playOk();
            this._state = "gripping";
            this._grip = 0;
            this._gripDir = 1;
            this._gripMeter.visible = true;
            this.setMessage("Press OK to lock the grip - hit the green zone!");
        }

        updateGripping() {
            this._grip += this._gripDir * 0.022;
            if (this._grip >= 1) { this._grip = 1; this._gripDir = -1; }
            if (this._grip <= 0) { this._grip = 0; this._gripDir = 1; }
            this.drawGripMeter();
            if (Input.isTriggered("ok")) {
                this._lastGrip = this.gripScore(this._grip);
                this._gripMeter.visible = false;
                this.resolveGrab();
            }
        }

        gripScore(pos) {
            const d = Math.abs(pos - this._sweetCenter);
            return Math.max(0, 1 - d / 0.5);
        }

        resolveGrab() {
            let best = null;
            let bestDist = Infinity;
            for (const p of this._prizes) {
                if (!p.alive) continue;
                const d = Math.hypot(p.x - this._clawX, p.y - this._clawY);
                if (d < bestDist) { bestDist = d; best = p; }
            }
            if (!best || bestDist > CFG.grabRadius) {
                this._targetPrize = null;
                this._resultText = "The claw grabbed empty air!";
                this.beginResolveAnim(false);
                return;
            }
            const aimScore = Math.max(0, 1 - bestDist / CFG.grabRadius);
            let chance = CFG.baseChance
                + aimScore * CFG.aimWeight
                + this._lastGrip * CFG.gripWeight
                - (best.def.weight - 1) * CFG.weightPenalty;
            chance = chance.clamp(0.05, 0.95);
            this._targetPrize = best;
            this._pendingSuccess = Math.random() < chance;
            this.beginResolveAnim(true, best);
        }

        beginResolveAnim(hasTarget, prize) {
            this._state = "resolving";
            this._timer = 0;
            this._resolveHasTarget = hasTarget;
            this._resolvePrize = prize || null;
            this.setMessage("...");
        }

        updateResolving() {
            this._timer++;
            if (this._resolveHasTarget && this._resolvePrize) {
                const lift = Math.min(1, this._timer / 30);
                const p = this._resolvePrize;
                p.sprite.x = p.x + (this._clawX - p.x) * lift * 0.5;
                p.sprite.y = p.y + (this._clawY - p.y) * lift * 0.5;
            }
            if (this._timer < 32) return;
            if (!this._resolveHasTarget) {
                SoundManager.playBuzzer();
                this.finishToResult();
                return;
            }
            const prize = this._targetPrize;
            if (this._pendingSuccess) {
                SoundManager.playShop();
                this.awardPrize(prize.def);
                prize.alive = false;
                prize.sprite.visible = false;
                this._resultText = "You won: " + prize.def.label + "!";
            } else {
                SoundManager.playBuzzer();
                prize.sprite.x = prize.x;
                prize.sprite.y = prize.y;
                this._resultText = "So close! " + prize.def.label + " slipped free.";
            }
            this.finishToResult();
        }

        finishToResult() {
            this._state = "result";
            const tail = tokens() > 0 ? "  OK: play again   Cancel: leave"
                                      : "  Out of tokens - Shift: buy   Cancel: leave";
            this.setMessage(this._resultText + tail);
            this.refreshStatus();
        }

        updateResult() {
            if (Input.isTriggered("shift")) { this.beginBuy(); return; }
            if (Input.isTriggered("cancel")) { SoundManager.playCancel(); this.popScene(); return; }
            if (Input.isTriggered("ok")) {
                if (tokens() < CFG.playCost) {
                    SoundManager.playBuzzer();
                    this.setMessage("Not enough tokens.  Press Shift to buy some.");
                    return;
                }
                this._state = "aiming";
                this.setMessage("Move the claw with the arrows.  Press OK to drop.");
            }
        }

        awardPrize(def) {
            switch (def.rewardType) {
                case "item":   if ($dataItems[def.rewardId])   $gameParty.gainItem($dataItems[def.rewardId], 1); break;
                case "weapon": if ($dataWeapons[def.rewardId]) $gameParty.gainItem($dataWeapons[def.rewardId], 1); break;
                case "armor":  if ($dataArmors[def.rewardId])  $gameParty.gainItem($dataArmors[def.rewardId], 1); break;
                case "collectible":
                    $gameVariables.setValue(CFG.collectibleVar, $gameVariables.value(CFG.collectibleVar) + 1);
                    break;
                default: break;
            }
            if (CFG.winCommonEvent > 0) $gameTemp.reserveCommonEvent(CFG.winCommonEvent);
        }

        beginBuy() {
            this._returnState = (this._state === "result") ? "result" : "aiming";
            this._state = "buying";
            this.setMessage("Buy " + CFG.tokensPerBuy + " tokens for " + CFG.goldPerBuy + " gold?   OK: Yes   Cancel: No");
        }

        updateBuying() {
            if (Input.isTriggered("ok")) {
                if ($gameParty.gold() >= CFG.goldPerBuy) {
                    $gameParty.loseGold(CFG.goldPerBuy);
                    setTokens(tokens() + CFG.tokensPerBuy);
                    SoundManager.playShop();
                    this.refreshStatus();
                    this.setMessage("Bought " + CFG.tokensPerBuy + " tokens!");
                } else {
                    SoundManager.playBuzzer();
                    this.setMessage("Not enough gold.");
                }
                this._state = this._returnState;
                return;
            }
            if (Input.isTriggered("cancel")) {
                SoundManager.playCancel();
                this._state = this._returnState;
                if (this._returnState === "aiming") {
                    this.setMessage("Move the claw with the arrows.  Press OK to drop.");
                }
            }
        }
    }

    window.Scene_ClawMachine = Scene_ClawMachine;
})();
