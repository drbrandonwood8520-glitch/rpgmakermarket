/*:
 * @target MZ
 * @plugindesc [v1.0] Doom-style first-person raycaster view for the map (walls only). Toggle with a key. by Claude
 * @author Claude
 *
 * @help
 * ============================================================================
 * FirstPersonRaycaster.js  —  a proof-of-concept "put the map in first person"
 * ============================================================================
 *
 * Renders the current map as a Wolfenstein-3D / Doom-style raycasted view
 * instead of the normal top-down tilemap. Walls are derived from the map's
 * own passability, so it works on ANY map with no extra setup.
 *
 * This is a WALLS-ONLY exploration demo:
 *   - No events / NPCs / enemies are drawn in the 3D view (yet).
 *   - The normal 2D map is simply hidden while the view is active.
 *   - Your logical position + facing are kept in sync with the engine, so
 *     action-button events, and "player touch" transfers still fire.
 *
 * ----------------------------------------------------------------------------
 * CONTROLS (while active)
 * ----------------------------------------------------------------------------
 *   Up / Down .......... walk forward / back
 *   Left / Right ....... turn
 *   A / D .............. strafe left / right
 *   Shift .............. run
 *   OK (Enter/Space/Z) . interact with the event you're facing
 *   F (default) ........ toggle first-person view on/off
 *
 * You can also toggle it from an event with the Plugin Command
 * "Set First Person" (on / off / toggle).
 *
 * ----------------------------------------------------------------------------
 * HOW "WALL" IS DECIDED
 * ----------------------------------------------------------------------------
 * A tile is treated as a solid wall if it is impassable from all four
 * directions (or off the edge of the map). This matches typical dungeon
 * walls well. It's a heuristic — see the params to tune, and read the note
 * in the chat where this plugin was generated for how to extend it.
 *
 * Free to use and modify. No warranty; test on a backup of your project.
 *
 * @param toggleKeyCode
 * @text Toggle Key (keyCode)
 * @desc JS keyCode to toggle the view. 70 = F. (65=A,68=D are used for strafe.)
 * @type number
 * @default 70
 *
 * @param startActive
 * @text Start In First-Person
 * @type boolean
 * @default false
 *
 * @param renderWidth
 * @text Internal Render Width
 * @desc Horizontal resolution of the raycast buffer. Lower = chunkier + faster.
 * @type number
 * @min 80
 * @max 960
 * @default 320
 *
 * @param fov
 * @text Field Of View (degrees)
 * @type number
 * @min 30
 * @max 120
 * @default 66
 *
 * @param moveSpeed
 * @text Move Speed (tiles/frame)
 * @type number
 * @decimals 3
 * @default 0.060
 *
 * @param rotSpeed
 * @text Turn Speed (radians/frame)
 * @type number
 * @decimals 3
 * @default 0.050
 *
 * @param texturedWalls
 * @text Textured Walls
 * @desc ON = procedural brick texture. OFF = flat shaded color (uses Wall Color).
 * @type boolean
 * @default true
 *
 * @param wallColor
 * @text Wall Color (flat mode)
 * @desc Used only when Textured Walls is OFF.
 * @default #9a8f80
 *
 * @param ceilingColor
 * @text Ceiling Color
 * @default #33384a
 *
 * @param floorColor
 * @text Floor Color
 * @default #262421
 *
 * @param fogDistance
 * @text Fog Distance (tiles)
 * @desc Walls fade to black by this distance. Bigger = you see farther.
 * @type number
 * @default 12
 *
 * @command setFirstPerson
 * @text Set First Person
 * @desc Turn the first-person view on, off, or toggle it.
 *
 * @arg mode
 * @text Mode
 * @type select
 * @option on
 * @option off
 * @option toggle
 * @default toggle
 */

(() => {
  "use strict";

  const script = document.currentScript;
  const pluginName = script
    ? decodeURIComponent(script.src.split("/").pop().replace(/\.js$/, ""))
    : "FirstPersonRaycaster";

  const P = PluginManager.parameters(pluginName);
  const CFG = {
    toggleKeyCode: Number(P.toggleKeyCode || 70),
    startActive: String(P.startActive) === "true",
    renderWidth: Number(P.renderWidth || 320),
    fov: Number(P.fov || 66),
    moveSpeed: Number(P.moveSpeed || 0.06),
    rotSpeed: Number(P.rotSpeed || 0.05),
    textured: String(P.texturedWalls) === "true",
    wallColor: String(P.wallColor || "#9a8f80"),
    ceilingColor: String(P.ceilingColor || "#33384a"),
    floorColor: String(P.floorColor || "#262421"),
    fogDistance: Math.max(1, Number(P.fogDistance || 12)),
  };

  // Shared runtime state (module-global so it survives menu/scene changes).
  const FPR = { active: CFG.startActive };
  window.$firstPerson = FPR; // handy for debugging in the console

  // --- input mapping -------------------------------------------------------
  Input.keyMapper[CFG.toggleKeyCode] = "toggleFp";
  Input.keyMapper[65] = "strafeLeft"; // A
  Input.keyMapper[68] = "strafeRight"; // D

  // --- small helpers -------------------------------------------------------
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return { r: 150, g: 150, b: 150 };
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function isWallTile(x, y) {
    if (!$gameMap.isValid(x, y)) return true;
    return (
      !$gameMap.isPassable(x, y, 2) &&
      !$gameMap.isPassable(x, y, 4) &&
      !$gameMap.isPassable(x, y, 6) &&
      !$gameMap.isPassable(x, y, 8)
    );
  }

  function angleToDirection(angle) {
    // +X = east(6), +Y = south(2), -X = west(4), -Y = north(8)
    let a = angle % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    const q = Math.PI / 4;
    if (a < q || a >= 7 * q) return 6;
    if (a < 3 * q) return 2;
    if (a < 5 * q) return 4;
    return 8;
  }

  // ========================================================================
  //  Sprite_Raycaster : owns the render buffer, camera, input, sync
  // ========================================================================
  class Sprite_Raycaster extends Sprite {
    constructor() {
      super();
      this._iw = Math.max(80, Math.floor(CFG.renderWidth));
      this._ih = Math.max(
        60,
        Math.round((this._iw * Graphics.height) / Graphics.width)
      );

      // Draw with MZ's native Bitmap API (fillRect/blt) on a core Sprite:
      // exactly how the engine draws every window and gauge, so it is
      // guaranteed to reach the screen on this build.
      this.bitmap = new Bitmap(this._iw, this._ih);
      this.bitmap.smooth = false; // nearest-neighbor upscale = crunchy pixels
      this.scale.set(Graphics.width / this._iw, Graphics.height / this._ih);
      this.visible = false;

      this._buildTexture();

      this._wall = hexToRgb(CFG.wallColor);
      this._lastTX = -999;
      this._lastTY = -999;

      this.syncFromPlayer();
    }

    _buildTexture() {
      const s = 64;
      const bmp = new Bitmap(s, s);
      const g = bmp.context;
      // mortar
      g.fillStyle = "#4d3b33";
      g.fillRect(0, 0, s, s);
      // offset brick rows
      const bh = 16;
      const bw = 32;
      for (let row = 0; row * bh < s; row++) {
        const offset = row % 2 === 0 ? 0 : -bw / 2;
        for (let bx = offset; bx < s; bx += bw) {
          const shade = 150 + ((row * 7 + bx) % 5) * 6;
          g.fillStyle = `rgb(${shade},${Math.floor(shade * 0.55)},${Math.floor(
            shade * 0.42
          )})`;
          g.fillRect(bx + 1, row * bh + 1, bw - 2, bh - 2);
        }
      }
      bmp.baseTexture.update();
      this._texBitmap = bmp;
      this._texW = s;
      this._texH = s;
    }

    syncFromPlayer() {
      this.posX = $gamePlayer.x + 0.5;
      this.posY = $gamePlayer.y + 0.5;
      const d = $gamePlayer.direction();
      this.angle =
        d === 6 ? 0 : d === 2 ? Math.PI / 2 : d === 4 ? Math.PI : -Math.PI / 2;
      this._lastTX = Math.floor(this.posX);
      this._lastTY = Math.floor(this.posY);
    }

    syncToPlayer() {
      const tx = Math.floor(this.posX);
      const ty = Math.floor(this.posY);
      $gamePlayer._x = $gamePlayer._realX = tx;
      $gamePlayer._y = $gamePlayer._realY = ty;
      $gamePlayer._direction = angleToDirection(this.angle);
    }

    // called every frame from Spriteset_Map.update
    updateFp() {
      if (Input.isTriggered("toggleFp")) {
        FPR.active = !FPR.active;
        if (FPR.active) this.syncFromPlayer();
        else this.syncToPlayer();
      }

      this.visible = FPR.active;
      if (this._baseRef) this._baseRef.visible = !FPR.active;
      if (!FPR.active) return;

      const canWalk =
        SceneManager._scene &&
        SceneManager._scene.constructor === Scene_Map &&
        !$gameMap.isEventRunning() &&
        !$gameMessage.isBusy();
      if (canWalk) this._handleInput();

      // keep the engine's idea of where we are in sync
      const tx = Math.floor(this.posX);
      const ty = Math.floor(this.posY);
      $gamePlayer._x = $gamePlayer._realX = tx;
      $gamePlayer._y = $gamePlayer._realY = ty;
      $gamePlayer._direction = angleToDirection(this.angle);
      if (tx !== this._lastTX || ty !== this._lastTY) {
        this._lastTX = tx;
        this._lastTY = ty;
        if (!$gameMap.isEventRunning()) {
          $gamePlayer.checkEventTriggerHere([1, 2]);
          $gameMap.setupStartingEvent();
        }
      }

      this._render();
    }

    _handleInput() {
      const run = Input.isPressed("shift");
      const mv = CFG.moveSpeed * (run ? 1.7 : 1);
      const rot = CFG.rotSpeed * (run ? 1.25 : 1);

      if (Input.isPressed("left")) this.angle -= rot;
      if (Input.isPressed("right")) this.angle += rot;

      const dx = Math.cos(this.angle);
      const dy = Math.sin(this.angle);
      let mx = 0;
      let my = 0;
      if (Input.isPressed("up")) {
        mx += dx * mv;
        my += dy * mv;
      }
      if (Input.isPressed("down")) {
        mx -= dx * mv;
        my -= dy * mv;
      }
      // strafe: perpendicular vector (-dy, dx)
      if (Input.isPressed("strafeLeft")) {
        mx += dy * mv;
        my -= dx * mv;
      }
      if (Input.isPressed("strafeRight")) {
        mx -= dy * mv;
        my += dx * mv;
      }
      this._tryMove(mx, my);
    }

    _canStand(x, y) {
      const r = 0.2;
      return (
        !isWallTile(Math.floor(x - r), Math.floor(y)) &&
        !isWallTile(Math.floor(x + r), Math.floor(y)) &&
        !isWallTile(Math.floor(x), Math.floor(y - r)) &&
        !isWallTile(Math.floor(x), Math.floor(y + r))
      );
    }

    _tryMove(mx, my) {
      const nx = this.posX + mx;
      if (this._canStand(nx, this.posY)) this.posX = nx;
      const ny = this.posY + my;
      if (this._canStand(this.posX, ny)) this.posY = ny;
    }

    _render() {
      const W = this._iw;
      const H = this._ih;
      const bmp = this.bitmap;
      const halfH = Math.floor(H / 2);

      // ceiling + floor (native fillRect)
      bmp.fillRect(0, 0, W, halfH, CFG.ceilingColor);
      bmp.fillRect(0, halfH, W, H - halfH, CFG.floorColor);

      const posX = this.posX;
      const posY = this.posY;
      const dirX = Math.cos(this.angle);
      const dirY = Math.sin(this.angle);
      const planeLen = Math.tan(((CFG.fov * Math.PI) / 180) / 2);
      const planeX = -dirY * planeLen;
      const planeY = dirX * planeLen;

      for (let x = 0; x < W; x++) {
        const cameraX = (2 * x) / W - 1;
        const rayDirX = dirX + planeX * cameraX;
        const rayDirY = dirY + planeY * cameraX;

        let mapX = Math.floor(posX);
        let mapY = Math.floor(posY);

        const deltaX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
        const deltaY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

        let stepX;
        let stepY;
        let sideDistX;
        let sideDistY;
        if (rayDirX < 0) {
          stepX = -1;
          sideDistX = (posX - mapX) * deltaX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1 - posX) * deltaX;
        }
        if (rayDirY < 0) {
          stepY = -1;
          sideDistY = (posY - mapY) * deltaY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1 - posY) * deltaY;
        }

        let side = 0;
        let hit = false;
        let guard = 0;
        while (!hit && guard++ < 1024) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaX;
            mapX += stepX;
            side = 0;
          } else {
            sideDistY += deltaY;
            mapY += stepY;
            side = 1;
          }
          if (isWallTile(mapX, mapY)) hit = true;
        }

        let perp = side === 0 ? sideDistX - deltaX : sideDistY - deltaY;
        if (perp < 0.0001) perp = 0.0001;

        const lineH = Math.floor(H / perp);
        let drawStart = Math.floor(-lineH / 2 + H / 2);
        let drawEnd = Math.floor(lineH / 2 + H / 2);
        if (drawStart < 0) drawStart = 0;
        if (drawEnd >= H) drawEnd = H - 1;
        const stripH = drawEnd - drawStart;
        if (stripH <= 0) continue;

        let shade = 1 - Math.min(perp / CFG.fogDistance, 1);
        if (side === 1) shade *= 0.7;

        if (CFG.textured) {
          let wallX =
            side === 0 ? posY + perp * rayDirY : posX + perp * rayDirX;
          wallX -= Math.floor(wallX);
          let texX = Math.floor(wallX * this._texW);
          if (side === 0 && rayDirX > 0) texX = this._texW - texX - 1;
          if (side === 1 && rayDirY < 0) texX = this._texW - texX - 1;
          bmp.blt(
            this._texBitmap,
            texX,
            0,
            1,
            this._texH,
            x,
            drawStart,
            1,
            stripH
          );
          if (shade < 1) {
            bmp.fillRect(
              x,
              drawStart,
              1,
              stripH,
              "rgba(0,0,0," + (1 - shade).toFixed(3) + ")"
            );
          }
        } else {
          const r = Math.floor(this._wall.r * shade);
          const g = Math.floor(this._wall.g * shade);
          const b = Math.floor(this._wall.b * shade);
          bmp.fillRect(x, drawStart, 1, stripH, `rgb(${r},${g},${b})`);
        }
      }

      // Native fillRect/blt already flag the bitmap for upload; this is a
      // harmless belt-and-suspenders nudge.
      const bt = this.bitmap.baseTexture;
      if (bt) bt.update();

      if (!this._diagLogged) {
        this._diagLogged = true;
        let px = null;
        try {
          // read a pixel where we just painted the ceiling color
          px = Array.from(this.bitmap.context.getImageData(2, 2, 1, 1).data);
        } catch (e) {
          px = "getImageData failed: " + e.message;
        }
        console.log("[FirstPersonRaycaster] render diagnostics:", {
          renderPath: "core Sprite + native Bitmap",
          pixelAt2x2: px, // expect the ceiling color's RGBA if drawing lands
          bitmapReady: this.bitmap.isReady ? this.bitmap.isReady() : "n/a",
          loadingState: this.bitmap._loadingState,
          worldVisible: this.worldVisible,
          alpha: this.alpha,
          sameBaseTexture:
            !!this.texture &&
            this.texture.baseTexture === this.bitmap.baseTexture,
          dirtyId: bt ? bt.dirtyId : null,
          textureValid: this.texture ? this.texture.valid : null,
          baseTexValid: bt ? bt.valid : null,
          bitmapW: this.bitmap ? this.bitmap.width : null,
          bitmapH: this.bitmap ? this.bitmap.height : null,
          scaleX: Number(this.scale.x.toFixed(3)),
          scaleY: Number(this.scale.y.toFixed(3)),
          graphicsW: Graphics.width,
          graphicsH: Graphics.height,
        });
      }
    }
  }

  // ========================================================================
  //  Spriteset_Map hooks : create the sprite + drive its update
  // ========================================================================
  const _createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
  Spriteset_Map.prototype.createUpperLayer = function () {
    _createUpperLayer.call(this);
    this._fpRaycaster = new Sprite_Raycaster();
    this._fpRaycaster._baseRef = this._baseSprite;
    this.addChild(this._fpRaycaster);
  };

  const _ssUpdate = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function () {
    _ssUpdate.call(this);
    if (this._fpRaycaster) this._fpRaycaster.updateFp();
  };

  // ========================================================================
  //  Game_Player : suppress default grid movement while active
  // ========================================================================
  const _moveByInput = Game_Player.prototype.moveByInput;
  Game_Player.prototype.moveByInput = function () {
    if (FPR.active) return;
    _moveByInput.call(this);
  };

  // ========================================================================
  //  Plugin command
  // ========================================================================
  PluginManager.registerCommand(pluginName, "setFirstPerson", (args) => {
    const m = String(args.mode || "toggle");
    FPR.active = m === "toggle" ? !FPR.active : m === "on";
  });
})();
