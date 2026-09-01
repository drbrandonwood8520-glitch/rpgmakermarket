//=============================================================================
// CasinoVisuals.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Shared "online-casino" look for the CasinoCore games: green
 * felt, drawn playing cards, pip dice, poker chips, themed panels, and a roulette
 * wheel. Load ABOVE the game plugins and BELOW CasinoCore.
 * @author You
 * @base CasinoCore
 * @orderAfter CasinoCore
 *
 * @help
 * This plugin adds a global CasinoGfx object with procedural drawing helpers and
 * re-skins every casino scene automatically:
 *   - Green felt background on the hub and all game scenes.
 *   - Chip-tray styling on the balance display.
 *   - Themed dark-green / gold panels (via CasinoGfx.decoratePanel or
 *     Window_CasinoBase).
 *
 * Load order (top to bottom in Plugin Manager):
 *   CasinoCore  ->  CasinoVisuals  ->  CasinoBlackjack / CasinoPoker /
 *   CasinoRoulette / CasinoLiarsDice
 *
 * Drawing API (all draw into a Bitmap, e.g. a window's this.contents):
 *   CasinoGfx.drawCard(bitmap, card, x, y[, w, h])
 *   CasinoGfx.drawCardBack(bitmap, x, y[, w, h])
 *   CasinoGfx.drawDie(bitmap, value, x, y, size)
 *   CasinoGfx.drawChip(bitmap, value, x, y, radius)
 *   CasinoGfx.drawPanel(bitmap, x, y, w, h[, opts])
 *   CasinoGfx.decoratePanel(window[, opts])   // frameless themed panel behind text
 *   CasinoGfx.feltBitmap(w, h)
 *   CasinoGfx.wheelBitmap(diameter)           // European wheel face
 *   CasinoGfx.wheelAngleForResult(number, spins)  // final rotation to land a result
 *   CasinoGfx.WHEEL_SEQUENCE                   // pocket order (single-zero)
 *   CasinoGfx.roundRect(ctx, x, y, w, h, r)
 */

(() => {
    "use strict";
    if (!window.CasinoCore) {
        console.error("CasinoVisuals.js requires CasinoCore.js above it.");
        return;
    }

    const RED = new Set(["\u2665", "\u2666"]); // heart, diamond
    const COLOR = {
        gold: "#c9a24a",
        goldHi: "#e7c877",
        red: "#c1121f",
        black: "#161616",
        feltA: "#1d7a4d",
        feltB: "#0a3a24",
        panelTop: "rgba(11,52,33,0.90)",
        panelBot: "rgba(5,26,17,0.94)"
    };

    const CasinoGfx = {};
    CasinoGfx.COLOR = COLOR;
    CasinoGfx.ctx = b => b._context;
    CasinoGfx.update = b => { if (b && b._baseTexture) b._baseTexture.update(); };
    CasinoGfx.suitColor = suit => (RED.has(suit) ? COLOR.red : COLOR.black);

    CasinoGfx.roundRect = function(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };

    //------------------------------------------------------------------ suits
    CasinoGfx.drawSuit = function(ctx, suit, cx, cy, s, color) {
        ctx.save();
        ctx.fillStyle = color || CasinoGfx.suitColor(suit);
        if (suit === "\u2666") { // diamond
            ctx.beginPath();
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx + s * 0.72, cy);
            ctx.lineTo(cx, cy + s);
            ctx.lineTo(cx - s * 0.72, cy);
            ctx.closePath(); ctx.fill();
        } else if (suit === "\u2665") { // heart
            ctx.beginPath();
            ctx.moveTo(cx, cy + s * 0.78);
            ctx.bezierCurveTo(cx + s * 1.15, cy - s * 0.25, cx + s * 0.42, cy - s * 1.05, cx, cy - s * 0.28);
            ctx.bezierCurveTo(cx - s * 0.42, cy - s * 1.05, cx - s * 1.15, cy - s * 0.25, cx, cy + s * 0.78);
            ctx.closePath(); ctx.fill();
        } else if (suit === "\u2660") { // spade
            ctx.beginPath();
            ctx.moveTo(cx, cy - s * 0.9);
            ctx.bezierCurveTo(cx + s * 0.35, cy - s * 0.2, cx + s * 1.18, cy + s * 0.18, cx, cy + s * 0.5);
            ctx.bezierCurveTo(cx - s * 1.18, cy + s * 0.18, cx - s * 0.35, cy - s * 0.2, cx, cy - s * 0.9);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx, cy + s * 0.15);
            ctx.quadraticCurveTo(cx + s * 0.12, cy + s * 0.75, cx + s * 0.5, cy + s * 0.9);
            ctx.lineTo(cx - s * 0.5, cy + s * 0.9);
            ctx.quadraticCurveTo(cx - s * 0.12, cy + s * 0.75, cx, cy + s * 0.15);
            ctx.closePath(); ctx.fill();
        } else if (suit === "\u2663") { // club
            const r = s * 0.52;
            ctx.beginPath(); ctx.arc(cx, cy - s * 0.42, r, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx - s * 0.58, cy + s * 0.16, r, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + s * 0.58, cy + s * 0.16, r, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(cx + s * 0.12, cy + s * 0.8, cx + s * 0.5, cy + s * 0.95);
            ctx.lineTo(cx - s * 0.5, cy + s * 0.95);
            ctx.quadraticCurveTo(cx - s * 0.12, cy + s * 0.8, cx, cy);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    };

    //------------------------------------------------------------------ cards
    const PIPS = {
        1: [[0.5, 0.5]],
        2: [[0.5, 0.24], [0.5, 0.76]],
        3: [[0.5, 0.22], [0.5, 0.5], [0.5, 0.78]],
        4: [[0.32, 0.24], [0.68, 0.24], [0.32, 0.76], [0.68, 0.76]],
        5: [[0.32, 0.24], [0.68, 0.24], [0.5, 0.5], [0.32, 0.76], [0.68, 0.76]],
        6: [[0.32, 0.22], [0.68, 0.22], [0.32, 0.5], [0.68, 0.5], [0.32, 0.78], [0.68, 0.78]],
        7: [[0.32, 0.2], [0.68, 0.2], [0.5, 0.35], [0.32, 0.5], [0.68, 0.5], [0.32, 0.8], [0.68, 0.8]],
        8: [[0.32, 0.2], [0.68, 0.2], [0.5, 0.34], [0.32, 0.48], [0.68, 0.48], [0.5, 0.66], [0.32, 0.8], [0.68, 0.8]],
        9: [[0.32, 0.2], [0.68, 0.2], [0.32, 0.4], [0.68, 0.4], [0.5, 0.5], [0.32, 0.6], [0.68, 0.6], [0.32, 0.8], [0.68, 0.8]],
        10: [[0.32, 0.18], [0.68, 0.18], [0.5, 0.3], [0.32, 0.42], [0.68, 0.42], [0.32, 0.58], [0.68, 0.58], [0.5, 0.7], [0.32, 0.82], [0.68, 0.82]]
    };

    CasinoGfx.cardSize = function() { return { w: 66, h: 92 }; };

    CasinoGfx.drawCard = function(bmp, card, x, y, w, h) {
        w = w || 66; h = h || 92;
        const ctx = CasinoGfx.ctx(bmp);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        CasinoGfx.roundRect(ctx, x, y, w, h, 8);
        ctx.fillStyle = "#fcfbf6"; ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.stroke();

        const col = CasinoGfx.suitColor(card.suit);
        const rank = card.rank;
        // corner indices
        ctx.fillStyle = col;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold " + Math.round(h * 0.17) + "px sans-serif";
        ctx.fillText(rank, x + w * 0.17, y + h * 0.14);
        CasinoGfx.drawSuit(ctx, card.suit, x + w * 0.17, y + h * 0.28, h * 0.05, col);
        ctx.save();
        ctx.translate(x + w * 0.83, y + h * 0.86); ctx.rotate(Math.PI);
        ctx.fillStyle = col; ctx.fillText(rank, 0, 0);
        CasinoGfx.drawSuit(ctx, card.suit, 0, h * 0.14, h * 0.05, col);
        ctx.restore();

        if (rank === "J" || rank === "Q" || rank === "K") {
            CasinoGfx.roundRect(ctx, x + w * 0.16, y + h * 0.2, w * 0.68, h * 0.6, 6);
            ctx.fillStyle = (col === COLOR.red) ? "rgba(193,18,31,0.08)" : "rgba(20,20,20,0.06)";
            ctx.fill();
            ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.stroke();
            ctx.fillStyle = col; ctx.font = "bold " + Math.round(h * 0.32) + "px serif";
            ctx.fillText(rank, x + w / 2, y + h * 0.46);
            CasinoGfx.drawSuit(ctx, card.suit, x + w / 2, y + h * 0.68, h * 0.08, col);
        } else {
            const n = rank === "A" ? 1 : Number(rank);
            const layout = PIPS[n] || [];
            const pipS = n === 1 ? h * 0.15 : h * 0.07;
            const ax = x + w * 0.14, aw = w * 0.72, ay = y + h * 0.12, ah = h * 0.76;
            for (const p of layout) CasinoGfx.drawSuit(ctx, card.suit, ax + aw * p[0], ay + ah * p[1], pipS, col);
        }
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    CasinoGfx.drawCardBack = function(bmp, x, y, w, h) {
        w = w || 66; h = h || 92;
        const ctx = CasinoGfx.ctx(bmp);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        CasinoGfx.roundRect(ctx, x, y, w, h, 8);
        ctx.fillStyle = "#7a1420"; ctx.fill();
        ctx.shadowColor = "transparent";
        CasinoGfx.roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 6);
        ctx.strokeStyle = COLOR.goldHi; ctx.lineWidth = 2; ctx.stroke();
        ctx.save();
        CasinoGfx.roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 6); ctx.clip();
        ctx.strokeStyle = "rgba(233,200,119,0.35)"; ctx.lineWidth = 1;
        for (let i = -h; i < w; i += 9) {
            ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + i + h, y); ctx.lineTo(x + i, y + h); ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    //------------------------------------------------------------------- dice
    CasinoGfx.drawDie = function(bmp, val, x, y, size, body, pip) {
        body = body || "#f7f6f0"; pip = pip || "#1a1a1a";
        const ctx = CasinoGfx.ctx(bmp);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
        CasinoGfx.roundRect(ctx, x, y, size, size, size * 0.2);
        ctx.fillStyle = body; ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.stroke();
        const P = {
            c: [0.5, 0.5], tl: [0.28, 0.28], tr: [0.72, 0.28],
            bl: [0.28, 0.72], br: [0.72, 0.72], ml: [0.28, 0.5], mr: [0.72, 0.5]
        };
        const map = {
            1: ["c"], 2: ["tl", "br"], 3: ["tl", "c", "br"],
            4: ["tl", "tr", "bl", "br"], 5: ["tl", "tr", "c", "bl", "br"],
            6: ["tl", "tr", "ml", "mr", "bl", "br"]
        };
        ctx.fillStyle = pip;
        const pr = size * 0.09;
        for (const k of (map[val] || [])) {
            const p = P[k];
            ctx.beginPath(); ctx.arc(x + size * p[0], y + size * p[1], pr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    //------------------------------------------------------------------ chips
    function chipColor(v) {
        if (v >= 1000) return { base: "#2b2b2b", face: "#3a3a3a", edge: "#e7c877", text: "#f5e9c8" };
        if (v >= 500) return { base: "#5b2a86", face: "#6d34a0", edge: "#efe6ff", text: "#ffffff" };
        if (v >= 100) return { base: "#1f1f1f", face: "#2c2c2c", edge: "#ffffff", text: "#ffffff" };
        if (v >= 25) return { base: "#1a7a3c", face: "#219a4c", edge: "#ffffff", text: "#ffffff" };
        if (v >= 10) return { base: "#1652a8", face: "#1f68cf", edge: "#ffffff", text: "#ffffff" };
        return { base: "#b6b6b6", face: "#d8d8d8", edge: "#8a1010", text: "#222222" };
    }
    CasinoGfx.chipColor = chipColor;

    CasinoGfx.drawChip = function(bmp, value, x, y, r) {
        const ctx = CasinoGfx.ctx(bmp);
        const c = chipColor(value);
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = c.base; ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = c.edge;
        for (let i = 0; i < 8; i++) {
            ctx.save(); ctx.rotate(i * Math.PI / 4);
            ctx.fillRect(-r * 0.11, -r, r * 0.22, r * 0.3);
            ctx.restore();
        }
        ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.fillStyle = c.face; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1, r * 0.06); ctx.strokeStyle = c.edge; ctx.stroke();
        ctx.fillStyle = c.text; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "bold " + Math.round(r * 0.5) + "px sans-serif";
        ctx.fillText(String(value), 0, 1);
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    // Lighten (amt>0) or darken (amt<0) a #rrggbb color; returns an rgb() string.
    function shade(hex, amt) {
        const c = hex.replace("#", "");
        let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
        const target = amt < 0 ? 0 : 255, t = Math.min(1, Math.abs(amt));
        r = Math.round(r + (target - r) * t);
        g = Math.round(g + (target - g) * t);
        b = Math.round(b + (target - b) * t);
        return "rgb(" + r + "," + g + "," + b + ")";
    }
    CasinoGfx.shade = shade;

    // A dice cup (mouth-down, as if covering dice on a table), on its own bitmap
    // so it can live on a Sprite and be animated (lifted) for the reveal.
    CasinoGfx.cupBitmap = function(w, h, color) {
        const bmp = new Bitmap(w, h);
        const ctx = CasinoGfx.ctx(bmp);
        const tw = w * 0.7, topY = h * 0.15;
        const lx = (w - tw) / 2, rx = (w + tw) / 2;
        const dark = shade(color, -0.4), light = shade(color, 0.28);
        ctx.save();
        // ground shadow at the mouth
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath(); ctx.ellipse(w / 2, h - 4, w * 0.5, h * 0.055, 0, 0, Math.PI * 2); ctx.fill();
        // body
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, dark); grad.addColorStop(0.32, light);
        grad.addColorStop(0.62, color); grad.addColorStop(1, dark);
        ctx.beginPath();
        ctx.moveTo(2, h - 6);
        ctx.lineTo(lx, topY);
        ctx.quadraticCurveTo(w / 2, topY - h * 0.09, rx, topY);
        ctx.lineTo(w - 2, h - 6);
        ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
        // top cap
        ctx.beginPath(); ctx.ellipse(w / 2, topY, tw / 2, tw * 0.13, 0, 0, Math.PI * 2);
        ctx.fillStyle = light; ctx.fill();
        ctx.strokeStyle = shade(color, -0.2); ctx.lineWidth = 1; ctx.stroke();
        // mouth opening (dark ellipse at bottom)
        ctx.beginPath(); ctx.ellipse(w / 2, h - 6, w * 0.5 - 2, w * 0.085, 0, 0, Math.PI * 2);
        ctx.fillStyle = shade(color, -0.55); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w / 2, h - 6, w * 0.5 - 2, w * 0.085, 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = light; ctx.lineWidth = 2; ctx.stroke();
        // gloss highlight
        ctx.globalAlpha = 0.22; ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(lx + tw * 0.18, topY + 4);
        ctx.lineTo(lx + tw * 0.32, topY + 4);
        ctx.lineTo(w * 0.34, h - 12);
        ctx.lineTo(w * 0.25, h - 12);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        CasinoGfx.update(bmp);
        return bmp;
    };

    // A small labelled chip + amount, e.g. bet display.
    CasinoGfx.drawBetChip = function(bmp, amount, x, y, label) {
        CasinoGfx.drawChip(bmp, amount, x + 20, y + 20, 20);
        const ctx = CasinoGfx.ctx(bmp);
        ctx.save();
        ctx.fillStyle = COLOR.goldHi; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText((label || "Bet") + "  " + amount, x + 48, y + 20);
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    //----------------------------------------------------------------- panels
    CasinoGfx.drawPanel = function(bmp, x, y, w, h, opts) {
        opts = opts || {};
        const ctx = CasinoGfx.ctx(bmp);
        ctx.save();
        const r = opts.radius || 14;
        CasinoGfx.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, r);
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, opts.top || COLOR.panelTop);
        g.addColorStop(1, opts.bottom || COLOR.panelBot);
        ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = opts.border || COLOR.gold; ctx.stroke();
        CasinoGfx.roundRect(ctx, x + 6, y + 6, w - 12, h - 12, Math.max(0, r - 4));
        ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.stroke();
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    // Make an existing window frameless with a themed panel behind its contents.
    CasinoGfx.decoratePanel = function(win, opts) {
        if (!win || win._casinoPanelSprite) return;
        win.opacity = 0;
        const bmp = new Bitmap(Math.max(1, win.width), Math.max(1, win.height));
        CasinoGfx.drawPanel(bmp, 0, 0, win.width, win.height, opts);
        const sp = new Sprite(bmp);
        if (win.addChildToBack) win.addChildToBack(sp); else win.addChild(sp);
        win._casinoPanelSprite = sp;
    };

    //------------------------------------------------------------------- felt
    CasinoGfx.feltBitmap = function(w, h) {
        const bmp = new Bitmap(w, h);
        const ctx = CasinoGfx.ctx(bmp);
        const g = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.08, w / 2, h / 2, Math.max(w, h) * 0.8);
        g.addColorStop(0, COLOR.feltA);
        g.addColorStop(1, COLOR.feltB);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // subtle felt speckle
        for (let i = 0; i < Math.floor(w * h / 900); i++) {
            const rx = Math.random() * w, ry = Math.random() * h;
            ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.04)";
            ctx.fillRect(rx, ry, 2, 2);
        }
        // vignette
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
        CasinoGfx.update(bmp);
        return bmp;
    };

    //------------------------------------------------------------- roulette wheel
    CasinoGfx.WHEEL_SEQUENCE = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8,
        23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    CasinoGfx.numberColor = n => (n === 0 ? "green" : (RED_NUMS.has(n) ? "red" : "black"));

    CasinoGfx.wheelBitmap = function(D) {
        const bmp = new Bitmap(D, D);
        const ctx = CasinoGfx.ctx(bmp);
        const cx = D / 2, cy = D / 2, R = D / 2 - 2;
        const seq = CasinoGfx.WHEEL_SEQUENCE;
        const n = seq.length;
        const step = (Math.PI * 2) / n;
        // outer rim
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = "#3a2410"; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = COLOR.gold; ctx.stroke();
        const rIn = R * 0.72;
        for (let i = 0; i < n; i++) {
            const a0 = -Math.PI / 2 + i * step - step / 2;
            const a1 = a0 + step;
            const num = seq[i];
            const c = CasinoGfx.numberColor(num);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R * 0.96, a0, a1);
            ctx.closePath();
            ctx.fillStyle = c === "green" ? "#1a7a3c" : (c === "red" ? COLOR.red : COLOR.black);
            ctx.fill();
            ctx.strokeStyle = COLOR.gold; ctx.lineWidth = 1; ctx.stroke();
            // number
            const am = a0 + step / 2;
            ctx.save();
            ctx.translate(cx + Math.cos(am) * R * 0.85, cy + Math.sin(am) * R * 0.85);
            ctx.rotate(am + Math.PI / 2);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold " + Math.round(D * 0.045) + "px sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(String(num), 0, 0);
            ctx.restore();
        }
        // inner hub
        ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
        ctx.fillStyle = "#5a3a1a"; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = COLOR.goldHi; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, rIn * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#7a5228"; ctx.fill();
        ctx.strokeStyle = COLOR.gold; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        CasinoGfx.update(bmp);
        return bmp;
    };

    // Rotation (radians) so that `result` ends up under a pointer fixed at the top,
    // plus `spins` extra full turns. Pocket i is drawn centered at angle
    // (-90deg + i*step); rotating the sprite by -that angle brings it to the top.
    CasinoGfx.wheelAngleForResult = function(result, spins) {
        const seq = CasinoGfx.WHEEL_SEQUENCE;
        const i = Math.max(0, seq.indexOf(result));
        const step = (Math.PI * 2) / seq.length;
        const base = -(i * step); // brings pocket i to the top pointer
        return base + (spins || 6) * Math.PI * 2;
    };

    //------------------------------------------------------- card bitmaps + sprite
    CasinoGfx.cardBitmap = function(card, w, h) {
        w = w || 66; h = h || 92;
        const bmp = new Bitmap(w + 10, h + 12);
        CasinoGfx.drawCard(bmp, card, 5, 5, w, h);
        return bmp;
    };
    CasinoGfx.cardBackBitmap = function(w, h) {
        w = w || 66; h = h || 92;
        const bmp = new Bitmap(w + 10, h + 12);
        CasinoGfx.drawCardBack(bmp, 5, 5, w, h);
        return bmp;
    };

    // A card that can be dealt (slides in) and flipped (2D scale-x flip).
    function Sprite_Card() { this.initialize(...arguments); }
    Sprite_Card.prototype = Object.create(Sprite.prototype);
    Sprite_Card.prototype.constructor = Sprite_Card;
    Sprite_Card.prototype.initialize = function(card, faceUp, w, h) {
        Sprite.prototype.initialize.call(this);
        this._w = w || 66; this._h = h || 92;
        this._card = card || null;
        this._faceUp = !!faceUp;
        this.anchor.set(0.5);
        this._faceBmp = this._card ? CasinoGfx.cardBitmap(this._card, this._w, this._h) : null;
        this._backBmp = CasinoGfx.cardBackBitmap(this._w, this._h);
        this.bitmap = (this._faceUp && this._faceBmp) ? this._faceBmp : this._backBmp;
        this._flip = null; this._move = null;
    };
    Sprite_Card.prototype.setCard = function(card) {
        this._card = card;
        this._faceBmp = card ? CasinoGfx.cardBitmap(card, this._w, this._h) : null;
        if (this._faceUp) this.bitmap = this._faceBmp || this._backBmp;
    };
    Sprite_Card.prototype.startFlip = function(toFace, dur) { this._flip = { t: 0, dur: dur || 16, toFace: toFace }; };
    Sprite_Card.prototype.replaceWithFlip = function(newCard, dur) {
        this._pendingCard = newCard; this._replaceDur = dur || 16; this._replacing = true;
        this.startFlip(false, this._replaceDur);   // flip to back, then swap in the new face
    };
    Sprite_Card.prototype.dealFrom = function(sx, sy, tx, ty, dur, delay, flipAtEnd) {
        this.x = sx; this.y = sy; this._faceUp = false; this.bitmap = this._backBmp; this.scale.x = 1;
        this._move = { t: 0, dur: dur || 16, delay: delay || 0, sx, sy, tx, ty, flipAtEnd: !!flipAtEnd };
        this.visible = (delay || 0) <= 0;
    };
    Sprite_Card.prototype.isBusy = function() { return !!(this._flip || this._move); };
    Sprite_Card.prototype.update = function() {
        Sprite.prototype.update.call(this);
        if (this._move) {
            const m = this._move;
            if (m.delay > 0) { m.delay--; if (m.delay <= 0) this.visible = true; return; }
            this.visible = true;
            m.t++;
            const p = Math.min(1, m.t / m.dur), e = 1 - Math.pow(1 - p, 2);
            this.x = m.sx + (m.tx - m.sx) * e;
            this.y = m.sy + (m.ty - m.sy) * e;
            if (p >= 1) { const fa = m.flipAtEnd; this._move = null; if (fa) this.startFlip(true, 16); }
        }
        if (this._flip) {
            const f = this._flip; f.t++;
            const half = f.dur / 2;
            if (f.t <= half) this.scale.x = Math.max(0.03, 1 - f.t / half);
            else {
                if (!f._swapped) {
                    this._faceUp = f.toFace;
                    this.bitmap = f.toFace ? (this._faceBmp || this._backBmp) : this._backBmp;
                    f._swapped = true;
                }
                this.scale.x = Math.min(1, (f.t - half) / half);
            }
            if (f.t >= f.dur) {
                this.scale.x = 1; this._flip = null;
                if (this._replacing && !this._faceUp) {
                    this._replacing = false;
                    this.setCard(this._pendingCard);
                    this.startFlip(true, this._replaceDur);
                }
            }
        }
    };
    window.Sprite_Card = Sprite_Card;

    //------------------------------------------------------------- arc / curved text
    CasinoGfx.arcText = function(bmp, text, cx, cy, radius, a0, a1, color, font) {
        const ctx = CasinoGfx.ctx(bmp);
        ctx.save();
        ctx.fillStyle = color; ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const n = text.length;
        for (let i = 0; i < n; i++) {
            const a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1));
            const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius;
            ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); ctx.fillText(text[i], 0, 0); ctx.restore();
        }
        ctx.restore();
        CasinoGfx.update(bmp);
    };

    //------------------------------------------------------------- table backgrounds
    function feltFill(ctx, x, y, w, h) {
        const g = ctx.createRadialGradient(x + w / 2, y + h * 0.4, Math.min(w, h) * 0.1, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, "#1f8a55"); g.addColorStop(1, "#0c3f28");
        return g;
    }

    // Classic blackjack "D" table: flat dealer edge on top, curved player edge below.
    CasinoGfx.blackjackTableBitmap = function(w, h) {
        const bmp = new Bitmap(w, h);
        const ctx = CasinoGfx.ctx(bmp);
        ctx.fillStyle = "#0a0a0c"; ctx.fillRect(0, 0, w, h);
        const L = 24, R = w - 24, T = 40, midY = h * 0.46, B = h - 20, cxm = w / 2;
        function tablePath(inset) {
            const l = L + inset, r = R - inset, t = T + inset, b = B - inset, my = midY;
            ctx.beginPath();
            ctx.moveTo(l, t);
            ctx.lineTo(r, t);
            ctx.lineTo(r, my);
            ctx.quadraticCurveTo(r, b, cxm, b);
            ctx.quadraticCurveTo(l, b, l, my);
            ctx.closePath();
        }
        // leather rail
        tablePath(0); ctx.fillStyle = "#3c2415"; ctx.fill();
        tablePath(6); ctx.fillStyle = "#5a3a1e"; ctx.fill();
        // felt
        tablePath(20); ctx.fillStyle = feltFill(ctx, L, T, R - L, B - T); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.stroke();
        // dealer rule, just under the dealer's cards
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "14px sans-serif";
        ctx.fillText("DEALER MUST STAND ON 17 AND DRAW TO 16", cxm, 226);
        ctx.restore();
        // big centre arc
        CasinoGfx.arcText(bmp, "BLACKJACK PAYS 3 TO 2", cxm, 120, 200,
            Math.PI * 0.70, Math.PI * 0.30, "#f2e2a8", "bold 22px sans-serif");
        CasinoGfx.update(bmp);
        return bmp;
    };

    // Oval poker table with padded rail.
    CasinoGfx.pokerTableBitmap = function(w, h) {
        const bmp = new Bitmap(w, h);
        const ctx = CasinoGfx.ctx(bmp);
        ctx.fillStyle = "#0a0a0c"; ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h * 0.54, rx = w * 0.46, ry = h * 0.40;
        function oval(irx, iry) { ctx.beginPath(); ctx.ellipse(cx, cy, irx, iry, 0, 0, Math.PI * 2); ctx.closePath(); }
        oval(rx, ry); ctx.fillStyle = "#3c2415"; ctx.fill();
        oval(rx - 8, ry - 8); ctx.fillStyle = "#5a3a1e"; ctx.fill();
        oval(rx - 22, ry - 22);
        ctx.fillStyle = feltFill(ctx, cx - rx, cy - ry, rx * 2, ry * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.stroke();
        // subtle centre line arc
        ctx.save();
        ctx.strokeStyle = "rgba(240,225,170,0.35)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx - 60, ry - 46, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        CasinoGfx.update(bmp);
        return bmp;
    };

    window.CasinoGfx = CasinoGfx;

    //=========================================================================
    // Window_CasinoBase — a Window_Base variant with a themed panel
    //=========================================================================
    function Window_CasinoBase() { this.initialize(...arguments); }
    Window_CasinoBase.prototype = Object.create(Window_Base.prototype);
    Window_CasinoBase.prototype.constructor = Window_CasinoBase;
    Window_CasinoBase.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        CasinoGfx.decoratePanel(this);
    };
    window.Window_CasinoBase = Window_CasinoBase;

    //=========================================================================
    // Global re-skin: felt backgrounds + chip-tray balance + hub panels
    //=========================================================================
    function feltBackground(scene) {
        scene._backgroundSprite = new Sprite(CasinoGfx.feltBitmap(Graphics.width, Graphics.height));
        scene.addChild(scene._backgroundSprite);
    }

    if (window.Scene_CasinoGameBase) {
        Scene_CasinoGameBase.prototype.createBackground = function() { feltBackground(this); };
    }
    if (window.Scene_CasinoHub) {
        Scene_CasinoHub.prototype.createBackground = function() { feltBackground(this); };
        const _hubCreate = Scene_CasinoHub.prototype.create;
        Scene_CasinoHub.prototype.create = function() {
            _hubCreate.call(this);
            // move chip tray to top-left so it doesn't collide with the touch Back button
            if (this._balanceWindow) { this._balanceWindow.x = 8; this._balanceWindow.y = 8; }
            [this._balanceWindow, this._descWindow, this._listWindow]
                .forEach(w => { if (w) CasinoGfx.decoratePanel(w); });
        };
    }

    // Chip-tray styling for the shared balance window (used by hub + every game).
    if (window.Window_ChipBalance) {
        const _init = Window_ChipBalance.prototype.initialize;
        Window_ChipBalance.prototype.initialize = function(rect) {
            _init.call(this, rect);
            CasinoGfx.decoratePanel(this);
            this.refresh();
        };
        Window_ChipBalance.prototype.refresh = function() {
            this.contents.clear();
            const val = CasinoCore.chips();
            const r = 16, cx = r + 4, cy = this.innerHeight / 2;
            CasinoGfx.drawChip(this.contents, val >= 1000 ? 1000 : (val >= 100 ? 100 : 25), cx, cy, r);
            const ctx = CasinoGfx.ctx(this.contents);
            ctx.save();
            ctx.fillStyle = CasinoGfx.COLOR.goldHi;
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText(String(val), this.innerWidth, cy);
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.textAlign = "left"; ctx.font = "14px sans-serif";
            ctx.fillText(CasinoCore.chipUnit, cx + r + 6, cy);
            ctx.restore();
            CasinoGfx.update(this.contents);
        };
    }
})();
