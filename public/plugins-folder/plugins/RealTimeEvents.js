//=============================================================================
// RealTimeEvents.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Real-world Time-of-Day event triggers. Fires switches / common events when a chosen real clock time is reached. 1:1 with real time (24h real = 24h game). Timezone + custom starting point configurable at runtime.
 * @author Claude
 *
 * @param ---Time Source---
 * @default
 *
 * @param timezoneMode
 * @parent ---Time Source---
 * @text Timezone Mode
 * @type select
 * @option System Local (auto, follows the player's device + DST)
 * @value system
 * @option Fixed UTC Offset (a canonical zone for everyone)
 * @value fixed
 * @default system
 * @desc How the "wall clock" is read. System = the player's own zone. Fixed = one zone for all players.
 *
 * @param utcOffsetHours
 * @parent ---Time Source---
 * @text Fixed Offset - Hours
 * @type number
 * @min -12
 * @max 14
 * @default 0
 * @desc Used only when Mode = Fixed. Examples: New York -5, London 0, Tokyo 9, India 5, LA -8.
 *
 * @param utcOffsetMinutes
 * @parent ---Time Source---
 * @text Fixed Offset - Minutes
 * @type number
 * @min 0
 * @max 59
 * @default 0
 * @desc Extra minutes for half/quarter-hour zones (India = 30, Nepal = 45). Applied in the same direction as the hours.
 *
 * @param ---Starting Point---
 * @default
 *
 * @param startOffsetHours
 * @parent ---Starting Point---
 * @text Start Offset - Hours
 * @type number
 * @min -23
 * @max 23
 * @default 0
 * @desc Shifts the whole clock. Leave at 0 for "game time = real time". Can also be set live via plugin commands.
 *
 * @param startOffsetMinutes
 * @parent ---Starting Point---
 * @text Start Offset - Minutes
 * @type number
 * @min -59
 * @max 59
 * @default 0
 *
 * @param startOffsetSeconds
 * @parent ---Starting Point---
 * @text Start Offset - Seconds
 * @type number
 * @min -59
 * @max 59
 * @default 0
 *
 * @param ---Behavior---
 * @default
 *
 * @param catchUpMissed
 * @parent ---Behavior---
 * @text Catch Up Missed Triggers
 * @type boolean
 * @on Fire on load if time already passed today
 * @off Only fire at the exact live crossing
 * @default true
 * @desc TRUE: if a trigger's time has already passed when the player loads/enters the map, it fires immediately (recommended). FALSE: only fires while the game is running and the clock crosses that moment.
 *
 * @param use24Hour
 * @parent ---Behavior---
 * @text 24-Hour Time String
 * @type boolean
 * @on 24-hour (18:30)
 * @off 12-hour (6:30 PM)
 * @default true
 * @desc Format used for the Time String variable below.
 *
 * @param ---Live Variables (0 = off)---
 * @default
 *
 * @param hourVariableId
 * @parent ---Live Variables (0 = off)---
 * @text Hour Variable
 * @type variable
 * @default 0
 * @desc Continuously written with the current hour (0-23).
 *
 * @param minuteVariableId
 * @parent ---Live Variables (0 = off)---
 * @text Minute Variable
 * @type variable
 * @default 0
 * @desc Continuously written with the current minute (0-59).
 *
 * @param secondVariableId
 * @parent ---Live Variables (0 = off)---
 * @text Second Variable
 * @type variable
 * @default 0
 * @desc Continuously written with the current second (0-59).
 *
 * @param dayOfWeekVariableId
 * @parent ---Live Variables (0 = off)---
 * @text Day-of-Week Variable
 * @type variable
 * @default 0
 * @desc Continuously written with the day of week (0=Sunday ... 6=Saturday).
 *
 * @param minutesSinceMidnightVariableId
 * @parent ---Live Variables (0 = off)---
 * @text Minutes-Since-Midnight Variable
 * @type variable
 * @default 0
 * @desc Continuously written with minutes since midnight (0-1439). Handy for Conditional Branch range checks.
 *
 * @param timeStringVariableId
 * @parent ---Live Variables (0 = off)---
 * @text Time String Variable
 * @type variable
 * @default 0
 * @desc Continuously written with a display string like "18:30". Show it in messages with \V[n].
 *
 * @param ---Triggers---
 * @default
 *
 * @param triggers
 * @parent ---Triggers---
 * @text Time Triggers
 * @type struct<TimeTrigger>[]
 * @default []
 * @desc Define the real-world times that fire switches / common events. See Help for details.
 *
 * @command syncTime
 * @text Sync Time Now
 * @desc Forces an immediate clock read + variable update + trigger check this frame.
 *
 * @command setFixedTimezone
 * @text Set Timezone (Fixed Offset)
 * @desc Switches to a Fixed UTC offset at runtime. Great for an in-game "choose your region" menu.
 * @arg hours
 * @text UTC Offset Hours
 * @type number
 * @min -12
 * @max 14
 * @default 0
 * @arg minutes
 * @text UTC Offset Minutes
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @command useSystemTimezone
 * @text Set Timezone (System Local)
 * @desc Switches back to the player's own device timezone (auto-handles DST).
 *
 * @command setStartOffset
 * @text Set Starting Point (Offset)
 * @desc Sets the clock offset directly. Values may be negative. Persists in the save.
 * @arg hours
 * @type number
 * @min -23
 * @max 23
 * @default 0
 * @arg minutes
 * @type number
 * @min -59
 * @max 59
 * @default 0
 * @arg seconds
 * @type number
 * @min -59
 * @max 59
 * @default 0
 *
 * @command anchorNow
 * @text Set Starting Point (Anchor Now)
 * @desc Makes THIS real-world moment read as the given clock time. Ideal for "let the player pick their starting time". Uses the current timezone setting.
 * @arg hour
 * @type number
 * @min 0
 * @max 23
 * @default 0
 * @arg minute
 * @type number
 * @min 0
 * @max 59
 * @default 0
 * @arg second
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @command resetTrigger
 * @text Reset One Trigger
 * @desc Clears a trigger's "already fired" memory so it can fire again.
 * @arg name
 * @text Trigger Name
 * @type string
 * @default
 *
 * @command resetAllTriggers
 * @text Reset All Triggers
 * @desc Clears the fired memory of every trigger.
 *
 * @command setTriggersEnabled
 * @text Enable / Disable All Triggers
 * @arg enabled
 * @type boolean
 * @default true
 *
 * @command getTimeToVariables
 * @text Read Time Into Variables (one-off)
 * @desc Writes the current time into the chosen variables once. 0 = skip that field.
 * @arg hourVar
 * @type variable
 * @default 0
 * @arg minuteVar
 * @type variable
 * @default 0
 * @arg secondVar
 * @type variable
 * @default 0
 * @arg dayOfWeekVar
 * @type variable
 * @default 0
 *
 * @help
 * ============================================================================
 * RealTimeEvents  -  Real-World Time-of-Day Triggers
 * ============================================================================
 *
 * This plugin reads the ACTUAL real-world clock and fires events when a
 * configured time of day arrives in real life. It is a 1:1 clock:
 * one real second = one game second, 24 real hours = 24 game hours.
 * (This is NOT a sped-up in-game day/night cycle.)
 *
 * ----------------------------------------------------------------------------
 * CORE CONCEPTS
 * ----------------------------------------------------------------------------
 * 1) TIMEZONE
 *    - "System Local" reads the player's own device clock (and follows their
 *      Daylight Saving automatically). Use this if you want each player's
 *      events tied to THEIR local time (e.g. a shop that opens at 6pm wherever
 *      the player lives).
 *    - "Fixed UTC Offset" reads one canonical zone for everyone. Use this for
 *      global/synchronized events (e.g. a world boss that appears at 20:00 JST
 *      for every player on Earth = Fixed offset +9).
 *
 * 2) STARTING POINT (offset)
 *    The "starting point" shifts the whole clock so any real moment can map to
 *    any clock time you like. Two ways to set it:
 *      - "Set Starting Point (Offset)" : add/subtract H:M:S from the clock.
 *      - "Set Starting Point (Anchor Now)" : "make right now read as 08:00".
 *    Combine timezone + starting point and the player can define any unique
 *    starting point that coincides with any timezone -- typically via an
 *    in-game options menu that calls these plugin commands.
 *
 * 3) TRIGGERS
 *    Each trigger is either:
 *      - POINT : at H:M:S it turns ON a Switch and/or runs a Common Event.
 *                (Repeats daily, or once ever.)
 *      - WINDOW: the Switch stays ON during a time range and OFF outside it
 *                (perfect for an "isNight" / "shopOpen" flag). The Common
 *                Event runs once each time the window is entered. A WINDOW
 *                trigger fully OWNS its Switch and will force it on/off.
 *    "Active Days" (optional) limits a trigger to certain weekdays.
 *    0=Sunday, 1=Monday ... 6=Saturday. Leave blank = every day.
 *    Wrap-around windows are supported: End 06:00 with Start 22:00 means
 *    10pm through 6am the next morning.
 *
 * ----------------------------------------------------------------------------
 * QUICK SETUP EXAMPLE
 * ----------------------------------------------------------------------------
 * Goal: a "Night Market" that is open from 6:00 PM to 11:00 PM local time.
 *   - Add a Time Trigger:
 *       Name        : NightMarket
 *       Mode        : Window
 *       Start Hour  : 18   Start Minute : 0
 *       End Hour    : 23   End Minute   : 0
 *       Switch      : (pick a switch, e.g. #10 "MarketOpen")
 *       Common Event: (optional, runs when it opens)
 *   - In your map events, gate the market NPCs behind Switch #10.
 *
 * Goal: a global event at exactly 20:00 Tokyo time for all players.
 *   - Timezone Mode = Fixed, Offset Hours = 9, Minutes = 0.
 *   - Add a POINT trigger at Hour 20, Minute 0 that runs a Common Event.
 *
 * ----------------------------------------------------------------------------
 * LETTING THE PLAYER CHOOSE (in-game menu pattern)
 * ----------------------------------------------------------------------------
 * Build a simple event/menu with "Show Choices", then per choice call:
 *   - Plugin Command > Set Timezone (Fixed Offset)  [their region]
 *   - Plugin Command > Set Starting Point (Anchor Now) [their chosen time]
 * Everything persists in the save file.
 *
 * ----------------------------------------------------------------------------
 * SCRIPT HELPERS (for Conditional Branch > Script, or Control Variables > Script)
 * ----------------------------------------------------------------------------
 *   RealTimeEvents.hour()            -> 0-23
 *   RealTimeEvents.minute()          -> 0-59
 *   RealTimeEvents.second()          -> 0-59
 *   RealTimeEvents.dayOfWeek()       -> 0 (Sun) - 6 (Sat)
 *   RealTimeEvents.secondsOfDay()    -> 0-86399
 *   RealTimeEvents.minutesOfDay()    -> 0-1439
 *   RealTimeEvents.timeString(true)  -> "18:30" (false = "6:30 PM")
 *   RealTimeEvents.isBetween(22,0,6,0) -> true if it's currently 10pm..6am
 *
 * ----------------------------------------------------------------------------
 * NOTES
 * ----------------------------------------------------------------------------
 * - Trigger names must be UNIQUE.
 * - Triggers are checked while on the Map scene (Common Events need the map).
 *   Live variables also update on the map. If a POINT time passes during a
 *   menu/battle, "Catch Up Missed Triggers" will fire it when you return.
 * - Because this reads the device clock, a player can change their clock to
 *   game the timers. Use Fixed offset + server logic if you need it tamper-proof.
 *
 * Free to use and edit in commercial and non-commercial projects.
 * ============================================================================
 */
/*~struct~TimeTrigger:
 * @param name
 * @text Trigger Name (unique)
 * @type string
 * @default MyTrigger
 * @desc A unique label. Used by the Reset plugin commands too.
 *
 * @param mode
 * @text Mode
 * @type select
 * @option Point (fires at the moment)
 * @value point
 * @option Window (switch ON during a range)
 * @value window
 * @default point
 *
 * @param hour
 * @text Start Hour
 * @type number
 * @min 0
 * @max 23
 * @default 12
 *
 * @param minute
 * @text Start Minute
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @param second
 * @text Start Second
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @param endHour
 * @text End Hour (Window mode only)
 * @type number
 * @min 0
 * @max 23
 * @default 0
 *
 * @param endMinute
 * @text End Minute (Window mode only)
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @param days
 * @text Active Days (optional)
 * @type string
 * @default
 * @desc Comma list, 0=Sun..6=Sat. e.g. "0,6" = weekends only. Blank = every day.
 *
 * @param switchId
 * @text Switch (optional)
 * @type switch
 * @default 0
 * @desc Point: turned ON when fired. Window: forced ON inside range, OFF outside. 0 = none.
 *
 * @param commonEventId
 * @text Common Event (optional)
 * @type common_event
 * @default 0
 * @desc Point: runs when fired. Window: runs when the window is entered. 0 = none.
 *
 * @param repeat
 * @text Repeat (Point mode)
 * @type select
 * @option Daily
 * @value daily
 * @option Once ever
 * @value once
 * @default daily
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "RealTimeEvents";
    const P = PluginManager.parameters(PLUGIN_NAME);

    const toNum = (v, d) => { const n = Number(v); return isNaN(n) ? d : n; };
    const toBool = (v, d) => (v === undefined || v === "") ? d : v === "true";

    const CFG = {
        timezoneMode: String(P.timezoneMode || "system"),
        utcOffsetHours: toNum(P.utcOffsetHours, 0),
        utcOffsetMinutes: toNum(P.utcOffsetMinutes, 0),
        startOffsetHours: toNum(P.startOffsetHours, 0),
        startOffsetMinutes: toNum(P.startOffsetMinutes, 0),
        startOffsetSeconds: toNum(P.startOffsetSeconds, 0),
        catchUpMissed: toBool(P.catchUpMissed, true),
        use24Hour: toBool(P.use24Hour, true),
        hourVar: toNum(P.hourVariableId, 0),
        minuteVar: toNum(P.minuteVariableId, 0),
        secondVar: toNum(P.secondVariableId, 0),
        dowVar: toNum(P.dayOfWeekVariableId, 0),
        somVar: toNum(P.minutesSinceMidnightVariableId, 0),
        timeStrVar: toNum(P.timeStringVariableId, 0),
    };

    // Fixed offset (hours + minutes applied in the same direction as hours sign).
    function fixedOffsetSecFromParams() {
        const sign = CFG.utcOffsetHours < 0 ? -1 : 1;
        return CFG.utcOffsetHours * 3600 + sign * CFG.utcOffsetMinutes * 60;
    }
    function startOffsetSecFromParams() {
        return CFG.startOffsetHours * 3600 + CFG.startOffsetMinutes * 60 + CFG.startOffsetSeconds;
    }

    function parseTriggers(raw) {
        let arr = [];
        try { arr = JSON.parse(raw || "[]"); } catch (e) { arr = []; }
        return arr.map(str => {
            let o = {};
            try { o = JSON.parse(str); } catch (e) { o = {}; }
            const days = String(o.days || "")
                .split(",")
                .map(x => parseInt(x, 10))
                .filter(x => !isNaN(x) && x >= 0 && x <= 6);
            return {
                name: String(o.name || "").trim(),
                mode: String(o.mode || "point"),
                hour: toNum(o.hour, 0),
                minute: toNum(o.minute, 0),
                second: toNum(o.second, 0),
                endHour: toNum(o.endHour, 0),
                endMinute: toNum(o.endMinute, 0),
                days: days,
                switchId: toNum(o.switchId, 0),
                commonEventId: toNum(o.commonEventId, 0),
                repeat: String(o.repeat || "daily"),
            };
        }).filter(t => t.name.length > 0);
    }

    const TRIGGERS = parseTriggers(P.triggers);

    //=========================================================================
    // Game_System : persistent runtime settings + trigger memory
    //=========================================================================
    const _GS_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () {
        _GS_initialize.call(this);
        this._rteTimezoneMode = CFG.timezoneMode;
        this._rteFixedOffsetSec = fixedOffsetSecFromParams();
        this._rteStartOffsetSec = startOffsetSecFromParams();
        this._rteEnabled = true;
        this._rteState = {}; // name -> { lastFiredKey, firedEver, wasInWindow }
    };

    Game_System.prototype.rteTriggerState = function (name) {
        if (!this._rteState) this._rteState = {};
        if (!this._rteState[name]) {
            this._rteState[name] = { lastFiredKey: null, firedEver: false, wasInWindow: false };
        }
        return this._rteState[name];
    };

    //=========================================================================
    // RealTimeEvents core
    //=========================================================================
    const RealTimeEvents = {
        _lastTickSec: -1,
        _lastSecOfDay: null,
        _lastDateKey: null,

        // ---- config resolution (falls back to params if no save loaded) ----
        _mode() {
            return ($gameSystem && $gameSystem._rteTimezoneMode) || CFG.timezoneMode;
        },
        tzOffsetSeconds() {
            if (this._mode() === "fixed") {
                if ($gameSystem && $gameSystem._rteFixedOffsetSec != null) return $gameSystem._rteFixedOffsetSec;
                return fixedOffsetSecFromParams();
            }
            // System local: negate device offset so UTC getters read local wall-clock.
            return -new Date().getTimezoneOffset() * 60;
        },
        startOffsetSeconds() {
            if ($gameSystem && $gameSystem._rteStartOffsetSec != null) return $gameSystem._rteStartOffsetSec;
            return startOffsetSecFromParams();
        },
        enabled() {
            return $gameSystem ? ($gameSystem._rteEnabled !== false) : true;
        },

        // ---- time readouts ----
        adjustedDate() {
            const ms = Date.now() + (this.tzOffsetSeconds() + this.startOffsetSeconds()) * 1000;
            return new Date(ms);
        },
        hour() { return this.adjustedDate().getUTCHours(); },
        minute() { return this.adjustedDate().getUTCMinutes(); },
        second() { return this.adjustedDate().getUTCSeconds(); },
        dayOfWeek() { return this.adjustedDate().getUTCDay(); },
        secondsOfDay() {
            const d = this.adjustedDate();
            return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
        },
        minutesOfDay() { return Math.floor(this.secondsOfDay() / 60); },
        dateKeyOf(d) { return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; },
        timeString(use24) {
            const twentyFour = (use24 === undefined) ? CFG.use24Hour : use24;
            const d = this.adjustedDate();
            let h = d.getUTCHours();
            const m = d.getUTCMinutes();
            const mm = m < 10 ? "0" + m : "" + m;
            if (twentyFour) {
                const hh = h < 10 ? "0" + h : "" + h;
                return `${hh}:${mm}`;
            }
            const ampm = h >= 12 ? "PM" : "AM";
            h = h % 12; if (h === 0) h = 12;
            return `${h}:${mm} ${ampm}`;
        },
        isBetween(h1, m1, h2, m2) {
            const start = h1 * 60 + m1;
            const end = h2 * 60 + m2;
            const now = this.minutesOfDay();
            return (start <= end) ? (now >= start && now < end) : (now >= start || now < end);
        },

        // ---- update loop (throttled to ~1x per real second) ----
        forceUpdate() {
            this._lastTickSec = -1;
            this.update();
        },
        update() {
            if (!$gameSystem || !$gameVariables) return;
            const nowSec = Math.floor(Date.now() / 1000);
            if (nowSec === this._lastTickSec) return;
            this._lastTickSec = nowSec;

            const d = this.adjustedDate();
            const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds();
            const dow = d.getUTCDay();
            const secOfDay = h * 3600 + m * 60 + s;
            const dateKey = this.dateKeyOf(d);

            this._writeVariables(h, m, s, dow);

            if (this.enabled()) {
                for (const t of TRIGGERS) this._processTrigger(t, secOfDay, dateKey, dow);
            }

            this._lastSecOfDay = secOfDay;
            this._lastDateKey = dateKey;
        },

        _writeVariables(h, m, s, dow) {
            if (CFG.hourVar > 0) $gameVariables.setValue(CFG.hourVar, h);
            if (CFG.minuteVar > 0) $gameVariables.setValue(CFG.minuteVar, m);
            if (CFG.secondVar > 0) $gameVariables.setValue(CFG.secondVar, s);
            if (CFG.dowVar > 0) $gameVariables.setValue(CFG.dowVar, dow);
            if (CFG.somVar > 0) $gameVariables.setValue(CFG.somVar, h * 60 + m);
            if (CFG.timeStrVar > 0) $gameVariables.setValue(CFG.timeStrVar, this.timeString());
        },

        _dayActive(trig, dow) {
            return trig.days.length === 0 || trig.days.includes(dow);
        },

        _fire(trig) {
            if (trig.switchId > 0) $gameSwitches.setValue(trig.switchId, true);
            if (trig.commonEventId > 0) $gameTemp.reserveCommonEvent(trig.commonEventId);
        },

        _processTrigger(trig, secOfDay, dateKey, dow) {
            if (trig.mode === "window") return this._processWindow(trig, secOfDay, dateKey, dow);
            return this._processPoint(trig, secOfDay, dateKey, dow);
        },

        _processPoint(trig, secOfDay, dateKey, dow) {
            const state = $gameSystem.rteTriggerState(trig.name);
            if (trig.repeat === "once" && state.firedEver) return;
            if (!this._dayActive(trig, dow)) return;

            const triggerSec = trig.hour * 3600 + trig.minute * 60 + trig.second;
            let shouldFire = false;

            if (CFG.catchUpMissed) {
                if (secOfDay >= triggerSec && state.lastFiredKey !== dateKey) shouldFire = true;
            } else {
                const sameDay = this._lastDateKey === dateKey && this._lastSecOfDay != null;
                if (sameDay) {
                    if (this._lastSecOfDay < triggerSec && secOfDay >= triggerSec &&
                        state.lastFiredKey !== dateKey) shouldFire = true;
                } else if (secOfDay >= triggerSec && state.lastFiredKey !== dateKey &&
                           secOfDay - triggerSec <= 5) {
                    // First check of a new day, right at the boundary.
                    shouldFire = true;
                }
            }

            if (shouldFire) {
                this._fire(trig);
                state.lastFiredKey = dateKey;
                state.firedEver = true;
            }
        },

        _processWindow(trig, secOfDay, dateKey, dow) {
            const state = $gameSystem.rteTriggerState(trig.name);
            const startSec = trig.hour * 3600 + trig.minute * 60 + trig.second;
            const endSec = trig.endHour * 3600 + trig.endMinute * 60;
            const inRange = (startSec <= endSec)
                ? (secOfDay >= startSec && secOfDay < endSec)
                : (secOfDay >= startSec || secOfDay < endSec);
            const active = this._dayActive(trig, dow) && inRange;

            if (active) {
                if (trig.switchId > 0 && $gameSwitches.value(trig.switchId) !== true) {
                    $gameSwitches.setValue(trig.switchId, true);
                }
                if (!state.wasInWindow) {
                    if (trig.commonEventId > 0) $gameTemp.reserveCommonEvent(trig.commonEventId);
                    state.wasInWindow = true;
                    state.lastFiredKey = dateKey;
                }
            } else {
                if (trig.switchId > 0 && $gameSwitches.value(trig.switchId) === true) {
                    $gameSwitches.setValue(trig.switchId, false);
                }
                state.wasInWindow = false;
            }
        },
    };

    window.RealTimeEvents = RealTimeEvents;

    //=========================================================================
    // Scene hook : run the clock while on the map
    //=========================================================================
    const _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _SceneMap_update.call(this);
        RealTimeEvents.update();
    };

    // Refresh once when entering the map so windows/switches reconcile on load.
    const _SceneMap_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function () {
        _SceneMap_onMapLoaded.call(this);
        RealTimeEvents._lastSecOfDay = null;
        RealTimeEvents._lastDateKey = null;
        RealTimeEvents.forceUpdate();
    };

    //=========================================================================
    // Plugin Commands
    //=========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "syncTime", () => {
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setFixedTimezone", args => {
        const hh = toNum(args.hours, 0);
        const mm = toNum(args.minutes, 0);
        const sign = hh < 0 ? -1 : 1;
        $gameSystem._rteTimezoneMode = "fixed";
        $gameSystem._rteFixedOffsetSec = hh * 3600 + sign * mm * 60;
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "useSystemTimezone", () => {
        $gameSystem._rteTimezoneMode = "system";
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setStartOffset", args => {
        $gameSystem._rteStartOffsetSec =
            toNum(args.hours, 0) * 3600 + toNum(args.minutes, 0) * 60 + toNum(args.seconds, 0);
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "anchorNow", args => {
        const th = toNum(args.hour, 0), tm = toNum(args.minute, 0), ts = toNum(args.second, 0);
        // "Base" = timezone-adjusted real time WITHOUT the start offset.
        const base = new Date(Date.now() + RealTimeEvents.tzOffsetSeconds() * 1000);
        const curSec = base.getUTCHours() * 3600 + base.getUTCMinutes() * 60 + base.getUTCSeconds();
        const targetSec = th * 3600 + tm * 60 + ts;
        $gameSystem._rteStartOffsetSec = targetSec - curSec;
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "resetTrigger", args => {
        const name = String(args.name || "").trim();
        if ($gameSystem._rteState && $gameSystem._rteState[name]) {
            delete $gameSystem._rteState[name];
        }
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "resetAllTriggers", () => {
        $gameSystem._rteState = {};
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setTriggersEnabled", args => {
        $gameSystem._rteEnabled = toBool(args.enabled, true);
        RealTimeEvents.forceUpdate();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "getTimeToVariables", args => {
        const hv = toNum(args.hourVar, 0);
        const mv = toNum(args.minuteVar, 0);
        const sv = toNum(args.secondVar, 0);
        const dv = toNum(args.dayOfWeekVar, 0);
        const d = RealTimeEvents.adjustedDate();
        if (hv > 0) $gameVariables.setValue(hv, d.getUTCHours());
        if (mv > 0) $gameVariables.setValue(mv, d.getUTCMinutes());
        if (sv > 0) $gameVariables.setValue(sv, d.getUTCSeconds());
        if (dv > 0) $gameVariables.setValue(dv, d.getUTCDay());
    });

})();
