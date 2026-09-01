//=============================================================================
// OllamaNPC.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Connect a local Ollama LLM to RPG Maker MZ for free, dynamic, persona-driven NPC dialogue.
 * @author You (built with Claude)
 * @url https://ollama.com
 *
 * @help
 * ============================================================================
 * OllamaNPC — Dynamic NPC dialogue powered by a LOCAL Ollama model
 * ============================================================================
 *
 * This plugin lets any NPC hold a real, in-character conversation with the
 * player. You define a persona (personality, knowledge, speech style) once,
 * and the NPC generates its own lines at runtime through your local Ollama
 * server. It is 100% free and offline — no API keys, no cloud, no per-token
 * cost.
 *
 * ----------------------------------------------------------------------------
 * 1. SETUP OLLAMA (one time)
 * ----------------------------------------------------------------------------
 *   a. Install Ollama:            https://ollama.com/download
 *   b. Pull a small, fast model:  ollama pull llama3.2
 *        (alternatives: qwen2.5, mistral, gemma2, phi3 ...)
 *   c. Ollama runs a server at    http://localhost:11434  automatically.
 *
 *   IMPORTANT — CORS: When you PLAYTEST in a browser (or deploy to web),
 *   the browser blocks requests to Ollama unless you allow the origin.
 *   Start Ollama with an allowed origin, e.g.:
 *
 *       (macOS/Linux)   OLLAMA_ORIGINS='*' ollama serve
 *       (Windows PS)    $env:OLLAMA_ORIGINS='*'; ollama serve
 *
 *   The standard NW.js desktop playtest/deploy usually works without this,
 *   but setting OLLAMA_ORIGINS is the fix if requests fail with a CORS error.
 *
 * ----------------------------------------------------------------------------
 * 2. INSTALL THE PLUGIN
 * ----------------------------------------------------------------------------
 *   - Drop OllamaNPC.js into your project's  js/plugins/  folder.
 *   - Enable it in the Plugin Manager.
 *   - Set your default Model to whatever you pulled (e.g. llama3.2).
 *
 * ----------------------------------------------------------------------------
 * 3. DEFINE A PERSONA
 * ----------------------------------------------------------------------------
 *   Either fill in "Predefined Personas" in the Plugin Manager, OR register
 *   one at runtime with the "Register Persona" command. Each persona has a
 *   KEY (a unique id you reference later, e.g. "old_blacksmith").
 *
 *   Example persona text:
 *     "You are Borin, a gruff but kind-hearted dwarven blacksmith in the
 *      village of Stonehollow. You love your craft, distrust elves, and
 *      speak in short, blunt sentences. You know the mountain pass to the
 *      north is blocked by a rockslide. You do NOT know anything about the
 *      royal capital."
 *
 * ----------------------------------------------------------------------------
 * 4. TALK TO THE NPC (in an event)
 * ----------------------------------------------------------------------------
 *   Simplest flow, on an NPC event:
 *
 *     Plugin Command > OllamaNPC > Talk With Player Input
 *        NPC Key:  old_blacksmith
 *
 *   This pops a text box, the player types a question, and the NPC replies
 *   in-character in the normal message window (with the persona's face/name).
 *
 *   To feed a fixed line instead of asking the player (e.g. the NPC reacting
 *   to an event), use "Talk" and put text in "Player / Prompt Text", or leave
 *   it blank to just have the NPC speak/greet.
 *
 *   Conversation memory is per-NPC and is saved inside your save file, so the
 *   NPC remembers what was said earlier — even across save/load. Use
 *   "Reset Conversation" to wipe an NPC's memory.
 *
 * ----------------------------------------------------------------------------
 * 5. DYNAMIC CONTEXT (variables & actor names)
 * ----------------------------------------------------------------------------
 *   Inside persona text, world context, prompts, and player text you can use:
 *       \V[n]   -> value of game variable n
 *       \N[n]   -> name of actor n
 *       {player}-> the party leader's name
 *   Example: "The hero's name is {player}. They currently have \V[5] gold."
 *   Set "World / Setting Context" to shared lore every NPC should know.
 *
 * ----------------------------------------------------------------------------
 * TIPS
 * ----------------------------------------------------------------------------
 *   - Keep replies short: the default prompt asks the model for 1-3 sentences
 *     so they fit the message window. Long replies auto-paginate.
 *   - A small model (llama3.2 / phi3) gives near-instant replies on most PCs.
 *   - Put concrete facts in the persona ("the key is under the barrel") to let
 *     NPCs reveal real hints while still improvising the wording.
 *
 * ============================================================================
 *
 * @param connection
 * @text ── Connection ──
 *
 * @param host
 * @parent connection
 * @text Ollama Host URL
 * @desc Base URL of the Ollama server. Default is fine for a local install.
 * @default http://localhost:11434
 *
 * @param model
 * @parent connection
 * @text Default Model
 * @desc The model name you pulled (e.g. llama3.2, qwen2.5, mistral).
 * @default llama3.2
 *
 * @param temperature
 * @parent connection
 * @text Temperature
 * @type number
 * @decimals 2
 * @min 0
 * @max 2
 * @desc Higher = more creative/varied, lower = more consistent. 0.7 is a good default.
 * @default 0.80
 *
 * @param maxTokens
 * @parent connection
 * @text Max Response Length
 * @type number
 * @min 16
 * @desc Max tokens the model may generate per reply (num_predict). Keep modest for snappy dialogue.
 * @default 160
 *
 * @param timeoutMs
 * @parent connection
 * @text Request Timeout (ms)
 * @type number
 * @min 1000
 * @desc Abort and show the fallback line if the model takes longer than this.
 * @default 30000
 *
 * @param prompting
 * @text ── Prompting ──
 *
 * @param baseSystemPrompt
 * @parent prompting
 * @text Base System Prompt
 * @type multiline_string
 * @desc Wraps every persona. Placeholders: {name} {persona} {world}. Escapes \V[n] \N[n] {player} also work.
 * @default You are {name}, a character in a video game. Stay fully in character at all times. Never say that you are an AI, a model, or a program, and never break character.
 *
 * CHARACTER:
 * {persona}
 *
 * WORLD / SETTING:
 * {world}
 *
 * Speak naturally as {name}. Keep replies short: 1 to 3 sentences, at most about 45 words, like a line of game dialogue. No markdown, no emoji, no asterisks, no stage directions. Reply only with the words {name} says out loud.
 *
 * @param worldContext
 * @parent prompting
 * @text World / Setting Context
 * @type multiline_string
 * @desc Shared lore injected into every NPC's prompt via {world}. Can use \V[n], \N[n], {player}.
 * @default A fantasy kingdom of forests, villages, and old ruins. The player is a traveling adventurer.
 *
 * @param continuationPrompt
 * @parent prompting
 * @text Greeting / Silence Prompt
 * @desc Hidden instruction sent when the player says nothing (used by "Talk" with blank text).
 * @default (The player approaches you without speaking. Greet them or say something in character.)
 *
 * @param historyLength
 * @parent prompting
 * @text Memory Length (turns)
 * @type number
 * @min 0
 * @desc How many past user+NPC messages to keep as context. Higher = better memory, slower. 0 = no memory.
 * @default 12
 *
 * @param display
 * @text ── Display ──
 *
 * @param maxCharsPerLine
 * @parent display
 * @text Max Characters Per Line
 * @type number
 * @min 10
 * @desc Word-wrap width for the message window. ~48 suits the default resolution/font.
 * @default 48
 *
 * @param maxLinesPerPage
 * @parent display
 * @text Max Lines Per Page
 * @type number
 * @min 1
 * @max 4
 * @desc Lines shown before continuing to a new message page.
 * @default 4
 *
 * @param sanitizeOutput
 * @parent display
 * @text Sanitize Output
 * @type boolean
 * @desc Escape backslashes and strip markdown so model output can't break RPG Maker text codes.
 * @default true
 *
 * @param showTypingIndicator
 * @parent display
 * @text Show "Thinking..." Indicator
 * @type boolean
 * @desc Show a small overlay while the model is generating a reply.
 * @default true
 *
 * @param typingText
 * @parent display
 * @text Thinking Text
 * @desc Text shown while generating (NPC name is prefixed automatically).
 * @default is thinking...
 *
 * @param fallbackLine
 * @parent display
 * @text Fallback Line
 * @desc Shown if Ollama is unreachable, times out, or errors. Keep it in-universe.
 * @default ...I'm sorry, my mind wandered. What were you saying?
 *
 * @param inputPromptLabel
 * @parent display
 * @text Default Input Label
 * @desc Prompt shown above the text box in "Talk With Player Input".
 * @default Say something...
 *
 * @param personas
 * @text Predefined Personas
 * @type struct<Persona>[]
 * @desc Personas available from the start. You can also add more at runtime with Register Persona.
 * @default []
 *
 * @command Talk
 * @text Talk
 * @desc Have an NPC speak. Provide fixed text as the player's line, or leave blank to greet/continue.
 *
 * @arg npcKey
 * @text NPC Key
 * @desc The persona key to speak as (e.g. old_blacksmith).
 * @default
 *
 * @arg playerText
 * @text Player / Prompt Text
 * @type multiline_string
 * @desc What the player "says" to the NPC. Leave blank for a greeting/continuation. Supports \V[n] \N[n] {player}.
 * @default
 *
 * @arg faceName
 * @text Face Image (override)
 * @type file
 * @dir img/faces
 * @desc Optional. Overrides the persona's face for this line.
 * @default
 *
 * @arg faceIndex
 * @text Face Index (override)
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @command TalkWithInput
 * @text Talk With Player Input
 * @desc Pop a text box, let the player type, then have the NPC reply in character.
 *
 * @arg npcKey
 * @text NPC Key
 * @default
 *
 * @arg label
 * @text Input Prompt Label
 * @desc Optional. Overrides the default label shown above the text box.
 * @default
 *
 * @command RegisterPersona
 * @text Register Persona
 * @desc Create or overwrite a persona at runtime (persists in the save file).
 *
 * @arg key
 * @text NPC Key
 * @default
 *
 * @arg name
 * @text Display Name
 * @default
 *
 * @arg persona
 * @text Persona / Description
 * @type multiline_string
 * @default
 *
 * @arg greeting
 * @text Scripted First Line (optional)
 * @desc If set, this exact line is spoken the first time (no model call) before the conversation begins.
 * @default
 *
 * @arg faceName
 * @text Face Image
 * @type file
 * @dir img/faces
 * @default
 *
 * @arg faceIndex
 * @text Face Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @command ResetConversation
 * @text Reset Conversation
 * @desc Wipe an NPC's memory so the next talk starts fresh.
 *
 * @arg npcKey
 * @text NPC Key
 * @default
 *
 * @command SetWorldContext
 * @text Set World Context
 * @desc Change the shared {world} lore at runtime (persists in the save file).
 *
 * @arg text
 * @text World Context
 * @type multiline_string
 * @default
 *
 * @command SetModel
 * @text Set Model
 * @desc Switch the active Ollama model at runtime (persists in the save file).
 *
 * @arg model
 * @text Model Name
 * @default
 */
/*~struct~Persona:
 * @param key
 * @text NPC Key
 * @desc Unique id you reference in commands (e.g. old_blacksmith).
 * @default
 *
 * @param name
 * @text Display Name
 * @desc Shown as the speaker name in the message window.
 * @default
 *
 * @param persona
 * @text Persona / Description
 * @type multiline_string
 * @desc Personality, knowledge, speech style, and any facts this NPC knows.
 * @default
 *
 * @param greeting
 * @text Scripted First Line (optional)
 * @desc If set, spoken verbatim the first time (no model call) to open the conversation.
 * @default
 *
 * @param faceName
 * @text Face Image
 * @type file
 * @dir img/faces
 * @default
 *
 * @param faceIndex
 * @text Face Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "OllamaNPC";
    const WAIT_MODE = "ollamaNPC";

    //-------------------------------------------------------------------------
    // Parameter parsing
    //-------------------------------------------------------------------------
    const raw = PluginManager.parameters(PLUGIN_NAME);

    function parsePersonaStruct(str) {
        try {
            const o = JSON.parse(str);
            return {
                key: (o.key || "").trim(),
                name: o.name || "",
                persona: o.persona || "",
                greeting: o.greeting || "",
                faceName: o.faceName || "",
                faceIndex: Number(o.faceIndex || 0)
            };
        } catch (e) {
            console.error("[OllamaNPC] Bad persona struct:", str, e);
            return null;
        }
    }

    const paramPersonas = {};
    try {
        const list = JSON.parse(raw.personas || "[]");
        for (const item of list) {
            const p = parsePersonaStruct(item);
            if (p && p.key) paramPersonas[p.key] = p;
        }
    } catch (e) {
        console.error("[OllamaNPC] Could not parse personas list.", e);
    }

    const params = {
        host: (raw.host || "http://localhost:11434").trim(),
        model: (raw.model || "llama3.2").trim(),
        temperature: Number(raw.temperature || 0.8),
        maxTokens: Number(raw.maxTokens || 160),
        timeoutMs: Number(raw.timeoutMs || 30000),
        baseSystemPrompt: raw.baseSystemPrompt || "",
        worldContext: raw.worldContext || "",
        continuationPrompt: raw.continuationPrompt || "(Greet the player in character.)",
        historyLength: Number(raw.historyLength || 12),
        maxCharsPerLine: Number(raw.maxCharsPerLine || 48),
        maxLinesPerPage: Math.min(4, Number(raw.maxLinesPerPage || 4)),
        sanitizeOutput: raw.sanitizeOutput !== "false",
        showTypingIndicator: raw.showTypingIndicator !== "false",
        typingText: raw.typingText || "is thinking...",
        fallbackLine: raw.fallbackLine || "...Sorry, what were you saying?",
        inputPromptLabel: raw.inputPromptLabel || "Say something..."
    };

    //-------------------------------------------------------------------------
    // Persistent state on Game_System (saved with the save file)
    //-------------------------------------------------------------------------
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._ollamaConversations = {};   // key -> [{role, content}, ...]
        this._ollamaPersonas = {};        // runtime-registered personas
        this._ollamaGreeted = {};         // key -> true once greeting used
        this._ollamaWorld = null;         // overrides param world context
        this._ollamaModel = null;         // overrides param model
    };

    Game_System.prototype.ollamaHistory = function(key) {
        if (!this._ollamaConversations) this._ollamaConversations = {};
        if (!this._ollamaConversations[key]) this._ollamaConversations[key] = [];
        return this._ollamaConversations[key];
    };
    Game_System.prototype.ollamaResetHistory = function(key) {
        if (this._ollamaConversations) this._ollamaConversations[key] = [];
        if (this._ollamaGreeted) this._ollamaGreeted[key] = false;
    };
    Game_System.prototype.ollamaRegisterPersona = function(p) {
        if (!this._ollamaPersonas) this._ollamaPersonas = {};
        this._ollamaPersonas[p.key] = p;
    };
    Game_System.prototype.ollamaGetRuntimePersona = function(key) {
        return this._ollamaPersonas ? this._ollamaPersonas[key] : null;
    };
    Game_System.prototype.ollamaWorld = function() {
        return this._ollamaWorld != null ? this._ollamaWorld : params.worldContext;
    };
    Game_System.prototype.ollamaModel = function() {
        return this._ollamaModel || params.model;
    };
    Game_System.prototype.ollamaHasGreeted = function(key) {
        return !!(this._ollamaGreeted && this._ollamaGreeted[key]);
    };
    Game_System.prototype.ollamaMarkGreeted = function(key) {
        if (!this._ollamaGreeted) this._ollamaGreeted = {};
        this._ollamaGreeted[key] = true;
    };

    //-------------------------------------------------------------------------
    // Persona lookup: runtime overrides win, then plugin params, then a stub
    //-------------------------------------------------------------------------
    function getPersona(key) {
        key = String(key || "").trim();
        const runtime = $gameSystem.ollamaGetRuntimePersona(key);
        if (runtime) return runtime;
        if (paramPersonas[key]) return paramPersonas[key];
        return {
            key,
            name: key || "Stranger",
            persona: "A mysterious character with no defined personality.",
            greeting: "",
            faceName: "",
            faceIndex: 0
        };
    }

    //-------------------------------------------------------------------------
    // Text substitution: \V[n], \N[n], {player}
    //-------------------------------------------------------------------------
    function substitute(text) {
        if (text == null) return "";
        let t = String(text);
        t = t.replace(/\\V\[(\d+)\]/gi, (_, n) => $gameVariables.value(Number(n)));
        t = t.replace(/\\N\[(\d+)\]/gi, (_, n) => {
            const a = $gameActors.actor(Number(n));
            return a ? a.name() : "";
        });
        const leader = $gameParty && $gameParty.leader && $gameParty.leader();
        t = t.replace(/\{player\}/gi, leader ? leader.name() : "adventurer");
        return t;
    }

    function buildSystemPrompt(persona) {
        const world = substitute($gameSystem.ollamaWorld());
        let s = params.baseSystemPrompt
            .replace(/\{name\}/g, persona.name || persona.key || "the character")
            .replace(/\{persona\}/g, persona.persona || "")
            .replace(/\{world\}/g, world || "(none)");
        return substitute(s).trim();
    }

    //-------------------------------------------------------------------------
    // Ollama request (non-streaming, with timeout)
    //-------------------------------------------------------------------------
    function requestChat(messages) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), params.timeoutMs);
        const url = params.host.replace(/\/+$/, "") + "/api/chat";
        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: $gameSystem.ollamaModel(),
                messages,
                stream: false,
                options: {
                    temperature: params.temperature,
                    num_predict: params.maxTokens
                }
            }),
            signal: controller.signal
        }).then(res => {
            clearTimeout(timer);
            if (!res.ok) throw new Error("Ollama HTTP " + res.status);
            return res.json();
        }).then(data => (data && data.message && data.message.content ? data.message.content : "").trim());
    }

    //-------------------------------------------------------------------------
    // Output cleanup + pagination for the message window
    //-------------------------------------------------------------------------
    function cleanOutput(text) {
        let t = String(text || "").trim();
        t = t.replace(/^[\s"'“”‘’]+/, "").replace(/[\s"'“”‘’]+$/, "");
        t = t.replace(/[*_`]+/g, "");
        t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
        if (params.sanitizeOutput) t = t.replace(/\\/g, "\\\\");
        return t.trim();
    }

    function paginate(text) {
        const maxChars = params.maxCharsPerLine;
        const maxLines = params.maxLinesPerPage;
        const paragraphs = String(text).split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
        const lines = [];
        for (const p of paragraphs) {
            const words = p.split(/\s+/);
            let cur = "";
            for (const w of words) {
                if (!cur) cur = w;
                else if ((cur + " " + w).length <= maxChars) cur += " " + w;
                else { lines.push(cur); cur = w; }
            }
            if (cur) lines.push(cur);
        }
        const pages = [];
        for (let i = 0; i < lines.length; i += maxLines) {
            pages.push(lines.slice(i, i + maxLines));
        }
        if (pages.length === 0) pages.push([""]);
        return pages;
    }

    function trimForRequest(history) {
        if (params.historyLength <= 0) return [];
        return history.slice(-params.historyLength);
    }
    function capHistory(key) {
        const h = $gameSystem.ollamaHistory(key);
        const cap = Math.max(params.historyLength, 2);
        if (h.length > cap) h.splice(0, h.length - cap);
    }

    //-------------------------------------------------------------------------
    // Turn state (singleton — only one message window at a time)
    //-------------------------------------------------------------------------
    const Turn = { state: "idle", persona: null, pages: [] };

    function speakPages(persona, text) {
        Turn.persona = persona;
        Turn.pages = paginate(text);
        Turn.state = "paging";
    }

    function beginTurn(interpreter, key, userText, overrides) {
        const base = getPersona(key);
        const persona = Object.assign({}, base, overrides || {});

        interpreter.setWaitMode(WAIT_MODE);

        // Scripted greeting on first contact — no model call.
        const hasStored = $gameSystem.ollamaHistory(key).length > 0;
        if ((!userText || !userText.length) && !hasStored &&
            !$gameSystem.ollamaHasGreeted(key) && persona.greeting) {
            $gameSystem.ollamaMarkGreeted(key);
            const g = cleanOutput(substitute(persona.greeting));
            $gameSystem.ollamaHistory(key).push({ role: "assistant", content: g });
            speakPages(persona, g);
            return;
        }

        Turn.state = "fetching";
        Turn.persona = persona;
        Turn.pages = [];
        showTyping(persona);

        const history = $gameSystem.ollamaHistory(key);
        const clean = userText ? substitute(userText).trim() : "";
        if (clean) history.push({ role: "user", content: clean });

        const outgoing = trimForRequest(history).slice();
        if (!clean) outgoing.push({ role: "user", content: substitute(params.continuationPrompt) });

        const messages = [{ role: "system", content: buildSystemPrompt(persona) }].concat(outgoing);

        requestChat(messages).then(reply => {
            let text = cleanOutput(reply || params.fallbackLine);
            if (!text) text = cleanOutput(params.fallbackLine);
            history.push({ role: "assistant", content: text });
            capHistory(key);
            $gameSystem.ollamaMarkGreeted(key);
            hideTyping();
            speakPages(persona, text);
        }).catch(err => {
            console.error("[OllamaNPC] Request failed:", err);
            hideTyping();
            speakPages(persona, cleanOutput(params.fallbackLine));
        });
    }

    //-------------------------------------------------------------------------
    // Interpreter wait integration
    //-------------------------------------------------------------------------
    const _updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === WAIT_MODE) {
            if (Turn.state === "fetching") return true;
            if (Turn.state === "paging") {
                if ($gameMessage.isBusy()) return true;      // current page still showing
                if (Turn.pages.length > 0) {
                    const page = Turn.pages.shift();
                    const p = Turn.persona || {};
                    $gameMessage.setFaceImage(p.faceName || "", p.faceIndex || 0);
                    $gameMessage.setSpeakerName(p.name || "");
                    for (const line of page) $gameMessage.add(line);
                    return true;                              // becomes busy this frame
                }
                Turn.state = "idle";
                Turn.persona = null;
                this._waitMode = "";
                return false;
            }
            // Waiting on player text input (handled by the input overlay promise)
            return true;
        }
        return _updateWaitMode.call(this);
    };

    //-------------------------------------------------------------------------
    // DOM overlays: typing indicator + text input
    //-------------------------------------------------------------------------
    function injectStyleOnce() {
        if (document.getElementById("ollama-npc-style")) return;
        const style = document.createElement("style");
        style.id = "ollama-npc-style";
        style.textContent = `
        #ollama-typing{position:fixed;left:50%;bottom:18%;transform:translateX(-50%);
            background:rgba(15,18,32,.88);color:#e8ecff;font:16px/1.2 sans-serif;
            padding:8px 16px;border-radius:20px;border:1px solid rgba(120,140,255,.5);
            z-index:9999;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.45)}
        #ollama-typing .dot{animation:ollamaBlink 1.2s infinite both;opacity:.3}
        #ollama-typing .dot:nth-child(2){animation-delay:.2s}
        #ollama-typing .dot:nth-child(3){animation-delay:.4s}
        @keyframes ollamaBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
        #ollama-input-wrap{position:fixed;inset:0;display:flex;align-items:flex-end;
            justify-content:center;z-index:10000;background:rgba(0,0,0,.15)}
        #ollama-input-box{width:min(720px,86%);margin-bottom:6%;background:rgba(15,18,32,.96);
            border:1px solid rgba(120,140,255,.55);border-radius:12px;padding:14px 16px;
            box-shadow:0 8px 30px rgba(0,0,0,.5);font-family:sans-serif}
        #ollama-input-box .lbl{color:#aab4ff;font-size:14px;margin-bottom:8px}
        #ollama-input-box input{width:100%;box-sizing:border-box;font-size:18px;
            padding:10px 12px;border-radius:8px;border:1px solid rgba(120,140,255,.4);
            background:#0c0f1c;color:#eef1ff;outline:none}
        #ollama-input-box input:focus{border-color:#8aa0ff}
        #ollama-input-box .row{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
        #ollama-input-box button{font-size:15px;padding:8px 18px;border-radius:8px;
            border:1px solid rgba(120,140,255,.4);background:#26305a;color:#eef1ff;cursor:pointer}
        #ollama-input-box button:hover{background:#33407a}
        #ollama-input-box button.cancel{background:#2a2f42}
        `;
        document.body.appendChild(style);
    }

    let _typingEl = null;
    function showTyping(persona) {
        if (!params.showTypingIndicator) return;
        injectStyleOnce();
        hideTyping();
        const el = document.createElement("div");
        el.id = "ollama-typing";
        const who = persona && persona.name ? persona.name + " " : "";
        el.innerHTML = who + params.typingText.replace(/\.\.\.$/, "") +
            ' <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        document.body.appendChild(el);
        _typingEl = el;
    }
    function hideTyping() {
        if (_typingEl) { _typingEl.remove(); _typingEl = null; }
    }

    function openTextInput(label) {
        injectStyleOnce();
        return new Promise(resolve => {
            const wrap = document.createElement("div");
            wrap.id = "ollama-input-wrap";
            const box = document.createElement("div");
            box.id = "ollama-input-box";
            const lbl = document.createElement("div");
            lbl.className = "lbl";
            lbl.textContent = label || params.inputPromptLabel;
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 300;
            const row = document.createElement("div");
            row.className = "row";
            const cancel = document.createElement("button");
            cancel.className = "cancel";
            cancel.textContent = "Leave";
            const ok = document.createElement("button");
            ok.textContent = "Say";

            let done = false;
            function finish(val) {
                if (done) return;
                done = true;
                wrap.remove();
                resolve(val);
            }
            input.addEventListener("keydown", e => {
                e.stopPropagation();
                if (e.key === "Enter") finish(input.value.trim());
                else if (e.key === "Escape") finish(null);
            });
            input.addEventListener("keyup", e => e.stopPropagation());
            ok.addEventListener("click", () => finish(input.value.trim()));
            cancel.addEventListener("click", () => finish(null));

            row.appendChild(cancel);
            row.appendChild(ok);
            box.appendChild(lbl);
            box.appendChild(input);
            box.appendChild(row);
            wrap.appendChild(box);
            document.body.appendChild(wrap);
            setTimeout(() => input.focus(), 30);
        });
    }

    //-------------------------------------------------------------------------
    // Plugin commands
    //-------------------------------------------------------------------------
    PluginManager.registerCommand(PLUGIN_NAME, "Talk", function(args) {
        const overrides = {};
        if (args.faceName) {
            overrides.faceName = args.faceName;
            overrides.faceIndex = Number(args.faceIndex || 0);
        }
        beginTurn(this, args.npcKey, args.playerText || "", overrides);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "TalkWithInput", function(args) {
        const interpreter = this;
        const key = args.npcKey;
        interpreter.setWaitMode(WAIT_MODE);
        Turn.state = "input";
        openTextInput(args.label).then(text => {
            if (text == null || text === "") {
                // Player cancelled — release the wait without speaking.
                Turn.state = "idle";
                interpreter._waitMode = "";
                return;
            }
            beginTurn(interpreter, key, text, {});
        });
    });

    PluginManager.registerCommand(PLUGIN_NAME, "RegisterPersona", function(args) {
        const key = String(args.key || "").trim();
        if (!key) { console.warn("[OllamaNPC] RegisterPersona: empty key."); return; }
        $gameSystem.ollamaRegisterPersona({
            key,
            name: args.name || key,
            persona: args.persona || "",
            greeting: args.greeting || "",
            faceName: args.faceName || "",
            faceIndex: Number(args.faceIndex || 0)
        });
    });

    PluginManager.registerCommand(PLUGIN_NAME, "ResetConversation", function(args) {
        $gameSystem.ollamaResetHistory(String(args.npcKey || "").trim());
    });

    PluginManager.registerCommand(PLUGIN_NAME, "SetWorldContext", function(args) {
        $gameSystem._ollamaWorld = args.text || "";
    });

    PluginManager.registerCommand(PLUGIN_NAME, "SetModel", function(args) {
        const m = String(args.model || "").trim();
        if (m) $gameSystem._ollamaModel = m;
    });

})();
