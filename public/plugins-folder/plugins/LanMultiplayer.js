/*:
 * @target MZ
 * @plugindesc Simple LAN multiplayer for RPG Maker MZ: auto-discovery over Wi-Fi/Ethernet + see other players walk the map. Desktop (NW.js) only.
 * @author You
 * @url
 *
 * @help
 * ============================================================================
 * LanMultiplayer.js
 * ============================================================================
 * One player HOSTS from their own machine. Everyone else on the same Wi-Fi or
 * Ethernet network JOINS automatically -- no IP typing. You then see each
 * other's characters walk around on shared maps.
 *
 * HOW IT WORKS
 *   Discovery : the host shouts a UDP broadcast on the LAN once a second.
 *               Clients listen for it and grab the host's IP + port.
 *   Transport : plain TCP (Node 'net'). Each peer sends its position ~10x/sec;
 *               the host relays every peer's state to everyone else.
 *   Rendering : remote players are drawn as normal character sprites on the
 *               map, added exactly the way MZ adds its own characters.
 *
 * REQUIREMENTS / LIMITS
 *   - Works only in the DESKTOP (NW.js) deployment or the Playtest. A browser /
 *     mobile export has no Node access, so the plugin no-ops there.
 *   - Everyone must be on the same subnet. Guest Wi-Fi / "AP isolation" blocks
 *     broadcast -- use a normal home router or a switch.
 *   - Allow the port through the OS firewall the first time (Windows will ask).
 *   - This syncs POSITION + APPEARANCE only. Events, battles, and switches are
 *     NOT synced -- see "EXTENDING" below for how to add a message channel.
 *
 * USAGE
 *   1. Drop this file in js/plugins/ and enable it in the Plugin Manager.
 *   2. Host: run plugin command "Start Hosting".
 *      Others: run plugin command "Find & Join Game".
 *      (Or set "Auto start role" below to start on the first map automatically.)
 *   3. Walk onto the same map and you'll see each other.
 *
 * EXTENDING
 *   All traffic is newline-delimited JSON. To add chat or shared switches,
 *   send your own message objects with Lan.sendMessage({t:'chat', text:'hi'})
 *   and handle them in handlePeerMessage(). The transport already fans them out.
 *
 * ============================================================================
 *
 * @param autoRole
 * @text Auto start role
 * @desc Automatically start on the first map. Choose "off" to only start via plugin commands.
 * @type select
 * @option off
 * @option host
 * @option client
 * @default off
 *
 * @param gameName
 * @text Game name (host)
 * @desc Shown to clients while they search the LAN.
 * @default My RPG
 *
 * @param tcpPort
 * @text TCP port
 * @desc Port the host listens on. Must be allowed through the firewall.
 * @type number
 * @min 1024
 * @max 65535
 * @default 8080
 *
 * @param sendMs
 * @text Send interval (ms)
 * @desc How often each peer broadcasts its position. Lower = smoother, more traffic.
 * @type number
 * @min 33
 * @max 1000
 * @default 100
 *
 * @command host
 * @text Start Hosting
 * @desc Begin hosting a LAN game from this machine.
 *
 * @command join
 * @text Find & Join Game
 * @desc Search the LAN and join the first host found.
 *
 * @command disconnect
 * @text Disconnect
 * @desc Leave / stop hosting and clear remote players.
 */

(() => {
  "use strict";

  const PLUGIN = "LanMultiplayer";
  const P = PluginManager.parameters(PLUGIN);
  const AUTO_ROLE = String(P.autoRole || "off");
  const GAME_NAME = String(P.gameName || "My RPG");
  const TCP_PORT = Number(P.tcpPort || 8080);
  const SEND_MS = Number(P.sendMs || 100);
  const DISCOVERY_PORT = 40404;           // fixed UDP port every peer agrees on
  const BROADCAST_ADDR = "255.255.255.255";
  const MAGIC = "rmmz-lan";               // tag so we ignore unrelated UDP noise

  // ---- Node access (desktop / NW.js only) -------------------------------
  const req =
    typeof require === "function" ? require :
    (typeof window !== "undefined" && window.require) ? window.require : null;

  function nodeReady() {
    return !!(req && typeof Utils !== "undefined" && Utils.isNwjs && Utils.isNwjs());
  }
  const net = nodeReady() ? req("net") : null;
  const dgram = nodeReady() ? req("dgram") : null;
  const os = nodeReady() ? req("os") : null;

  function localIPv4() {
    if (!os) return "127.0.0.1";
    for (const iface of Object.values(os.networkInterfaces())) {
      for (const n of iface) {
        if (n.family === "IPv4" && !n.internal) return n.address;
      }
    }
    return "127.0.0.1";
  }

  const rid = () => Math.random().toString(36).slice(2, 9);

  // ---- TCP framing: newline-delimited JSON ------------------------------
  function lineReader(onObj) {
    let buf = "";
    return (chunk) => {
      buf += chunk.toString("utf8");
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line) { try { onObj(JSON.parse(line)); } catch (e) { /* skip */ } }
      }
    };
  }
  function sendTo(sock, obj) {
    try { sock.write(JSON.stringify(obj) + "\n"); } catch (e) { /* dead socket */ }
  }

  // =======================================================================
  //  Network core
  // =======================================================================
  const Lan = {
    active: false,
    role: null,
    myId: null,
    server: null,
    sockets: new Set(),   // host: connected clients
    socket: null,         // client: connection to host
    beacon: null,
    finder: null,
    beaconTimer: null,
    sendTimer: null,
    peers: {},            // id -> latest {mapId,x,y,dir,name,ci}
  };

  Lan.startHost = function () {
    if (this.active) return;
    if (!nodeReady()) { console.warn("[LAN] Node unavailable (browser export?) -- cannot host."); return; }
    this.role = "host";
    this.myId = "H-" + rid();
    this.active = true;

    this.server = net.createServer((sock) => {
      this.sockets.add(sock);
      sock.on("data", lineReader((msg) => this._onHostMsg(sock, msg)));
      sock.on("close", () => { this.sockets.delete(sock); this._dropSocketPeer(sock); });
      sock.on("error", () => {});
    });
    this.server.on("error", (e) => console.warn("[LAN] server error: " + e.message));
    this.server.listen(TCP_PORT, () =>
      console.log(`[LAN] hosting "${GAME_NAME}" on ${localIPv4()}:${TCP_PORT}`));

    this._startBeacon();
    this._startSendLoop();
  };

  Lan.findAndJoin = function () {
    if (this.active) return;
    if (!nodeReady()) { console.warn("[LAN] Node unavailable (browser export?) -- cannot join."); return; }
    this.role = "client";
    this.myId = "C-" + rid();
    this.active = true;

    this.finder = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.finder.on("message", (data) => {
      let info;
      try { info = JSON.parse(data.toString()); } catch (e) { return; }
      if (!info || info.kind !== MAGIC) return;
      try { this.finder.close(); } catch (e) {}
      this.finder = null;
      this._connectTo(info);
    });
    this.finder.on("error", (e) => console.warn("[LAN] finder error: " + e.message));
    this.finder.bind(DISCOVERY_PORT, () => console.log("[LAN] searching for a game..."));
  };

  Lan._connectTo = function (info) {
    this.socket = net.connect(info.port, info.ip, () => {
      console.log(`[LAN] joined "${info.name}" at ${info.ip}:${info.port}`);
      this._startSendLoop();
    });
    this.socket.on("data", lineReader((msg) => this._onClientMsg(msg)));
    this.socket.on("close", () => this.stop());
    this.socket.on("error", () => {});
  };

  Lan._startBeacon = function () {
    this.beacon = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.beacon.bind(() => { try { this.beacon.setBroadcast(true); } catch (e) {} });
    this.beaconTimer = setInterval(() => {
      const msg = Buffer.from(JSON.stringify({
        kind: MAGIC, name: GAME_NAME, ip: localIPv4(), port: TCP_PORT,
      }));
      try { this.beacon.send(msg, DISCOVERY_PORT, BROADCAST_ADDR); } catch (e) {}
    }, 1000);
  };

  Lan._startSendLoop = function () {
    if (this.sendTimer) return;
    this.sendTimer = setInterval(() => {
      if (!this.active || !$gameMap || !$gamePlayer) return;
      const state = {
        t: "state", id: this.myId,
        mapId: $gameMap.mapId(),
        x: $gamePlayer.x, y: $gamePlayer.y,
        dir: $gamePlayer.direction(),
        name: $gamePlayer.characterName(),
        ci: $gamePlayer.characterIndex(),
      };
      if (this.role === "host") this.broadcast(state);
      else if (this.socket) sendTo(this.socket, state);
    }, SEND_MS);
  };

  Lan.broadcast = function (obj) {
    for (const s of this.sockets) sendTo(s, obj);
  };

  // Public: send any custom message (chat, switches, etc.) to everyone else.
  Lan.sendMessage = function (obj) {
    if (!this.active) return;
    obj.id = this.myId;
    if (this.role === "host") this.broadcast(obj);
    else if (this.socket) sendTo(this.socket, obj);
  };

  Lan._onHostMsg = function (sock, msg) {
    sock._peerId = msg.id;
    this._handlePeerMessage(msg);
    for (const s of this.sockets) if (s !== sock) sendTo(s, msg); // relay to others
  };

  Lan._onClientMsg = function (msg) {
    if (msg.id === this.myId) return;
    this._handlePeerMessage(msg);
  };

  // One place to interpret incoming messages. Add your own 't' cases here.
  Lan._handlePeerMessage = function (msg) {
    if (msg.t === "state") {
      this.peers[msg.id] = msg;
    } else if (msg.t === "leave") {
      delete this.peers[msg.id];
      RemoteView.remove(msg.id);
    }
    // else if (msg.t === "chat") { ...your handler... }
  };

  Lan._dropSocketPeer = function (sock) {
    const id = sock._peerId;
    if (!id) return;
    delete this.peers[id];
    RemoteView.remove(id);
    this.broadcast({ t: "leave", id });
  };

  Lan.stop = function () {
    if (this.sendTimer) { clearInterval(this.sendTimer); this.sendTimer = null; }
    if (this.beaconTimer) { clearInterval(this.beaconTimer); this.beaconTimer = null; }
    try { this.beacon && this.beacon.close(); } catch (e) {}
    try { this.finder && this.finder.close(); } catch (e) {}
    try { this.socket && this.socket.destroy(); } catch (e) {}
    for (const s of this.sockets) { try { s.destroy(); } catch (e) {} }
    try { this.server && this.server.close(); } catch (e) {}
    this.sockets.clear();
    this.beacon = this.finder = this.socket = this.server = null;
    this.peers = {};
    this.active = false; this.role = null; this.myId = null;
    RemoteView.clear();
    console.log("[LAN] disconnected.");
  };

  window.Lan = Lan; // expose for extensions / debugging

  // =======================================================================
  //  Remote player = a lightweight Game_Character rendered on the map
  // =======================================================================
  function Game_RemotePlayer() { this.initialize.apply(this, arguments); }
  Game_RemotePlayer.prototype = Object.create(Game_Character.prototype);
  Game_RemotePlayer.prototype.constructor = Game_RemotePlayer;

  Game_RemotePlayer.prototype.initialize = function () {
    Game_Character.prototype.initialize.call(this);
    this.setThrough(true);      // don't block anything
    this._priorityType = 1;     // same layer as the player
  };

  // Feed in a network state; base update() then slides the sprite toward it.
  Game_RemotePlayer.prototype.applyState = function (st) {
    if (this._characterName !== st.name || this._characterIndex !== st.ci) {
      this.setImage(st.name, st.ci);
    }
    this._x = st.x;             // set logical tile; updateMove lerps _realX/_realY
    this._y = st.y;
    if (st.dir) this.setDirection(st.dir);
  };

  // Manages the remote sprites for whatever Spriteset_Map is current.
  const RemoteView = {
    chars: {},     // id -> Game_RemotePlayer
    sprites: {},   // id -> Sprite_Character

    reset() { this.chars = {}; this.sprites = {}; }, // called when a new map's spriteset is built

    remove(id) {
      const sp = this.sprites[id];
      if (sp) { if (sp.parent) sp.parent.removeChild(sp); if (sp.destroy) sp.destroy(); }
      delete this.sprites[id];
      delete this.chars[id];
    },

    clear() { for (const id of Object.keys(this.chars)) this.remove(id); },

    reconcile(spriteset) {
      if (!$gameMap) return;
      const here = $gameMap.mapId();

      // create / update remotes that belong on this map
      for (const id in Lan.peers) {
        if (id === Lan.myId) continue;
        const st = Lan.peers[id];
        if (!st || st.t !== "state" || st.mapId !== here) { this.remove(id); continue; }
        let ch = this.chars[id];
        if (!ch) {
          ch = new Game_RemotePlayer();
          ch.locate(st.x, st.y);           // spawn without sliding in from 0,0
          ch.setImage(st.name, st.ci);
          this.chars[id] = ch;
          const sp = new Sprite_Character(ch);
          this.sprites[id] = sp;
          spriteset._tilemap.addChild(sp); // exactly how MZ adds its own characters
        }
        ch.applyState(st);
        ch.update();                        // advance movement + walk animation
      }

      // drop remotes that left this map / disconnected
      for (const id in this.chars) {
        const st = Lan.peers[id];
        if (!st || st.mapId !== here || id === Lan.myId) this.remove(id);
      }
    },
  };

  // Hook the map spriteset: refresh sprites each frame, reset on new map.
  const _createCharacters = Spriteset_Map.prototype.createCharacters;
  Spriteset_Map.prototype.createCharacters = function () {
    _createCharacters.call(this);
    RemoteView.reset(); // previous tilemap (and its sprites) are gone with the old scene
  };

  const _ssUpdate = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function () {
    _ssUpdate.call(this);
    if (Lan.active) RemoteView.reconcile(this);
  };

  // =======================================================================
  //  Plugin commands + optional auto-start
  // =======================================================================
  PluginManager.registerCommand(PLUGIN, "host", () => Lan.startHost());
  PluginManager.registerCommand(PLUGIN, "join", () => Lan.findAndJoin());
  PluginManager.registerCommand(PLUGIN, "disconnect", () => Lan.stop());

  if (AUTO_ROLE === "host" || AUTO_ROLE === "client") {
    const _onMapStart = Scene_Map.prototype.start;
    let started = false;
    Scene_Map.prototype.start = function () {
      _onMapStart.call(this);
      if (!started) {
        started = true;
        if (AUTO_ROLE === "host") Lan.startHost();
        else Lan.findAndJoin();
      }
    };
  }
})();
