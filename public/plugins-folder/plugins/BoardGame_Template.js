/*:
 * @target MZ
 * @plugindesc [v1.0.0] TEMPLATE / smoke-test game for BoardGameCore. Copy this to build a real game. Requires BoardGameCore.js above it.
 * @author You (scaffolded by Claude)
 * @base BoardGameCore
 * @orderAfter BoardGameCore
 * @url
 *
 * @help
 * ============================================================================
 * BoardGame_Template.js  —  reference implementation
 * ============================================================================
 * This is NOT one of your real board games. It is the smallest possible game
 * that touches every part of the BoardGameCore contract, so you can:
 *   1) confirm the core is installed correctly (launch it and it just works),
 *   2) copy this file as the skeleton for a real game (Checkers, Bingo, ...).
 *
 * The "game" is a best-of-3 coin duel: each round the player calls Heads or
 * Tails, the opponent calls the other side via the shared AI helper, then a
 * coin is flipped. Whoever called correctly wins the round.
 *
 * Launch it from an event with the "Start Board Game" plugin command using
 *   Game Id: coin_duel
 *
 * Everything below is annotated. Delete the coin logic and drop your real board
 * logic into onMatchStart() / updateGame(), keeping the same structure.
 * ============================================================================
 */

(() => {
    "use strict";

    if (typeof Scene_BoardGameBase === "undefined") {
        console.error("[BoardGame_Template] BoardGameCore.js must be installed ABOVE this plugin.");
        return;
    }

    const C = BoardGameTheme.colors;

    class Scene_CoinDuel extends Scene_BoardGameBase {

        // Called once after the shell (header, portrait, ticker) is built.
        // Set up your board and initial state here.
        onMatchStart() {
            this._playerScore = 0;
            this._aiScore = 0;
            this._round = 1;
            this._maxRounds = 3;
            this._call = 0;          // 0 = Heads, 1 = Tails (player's current pick)
            this._phase = "choose";  // 'choose' -> 'reveal' -> 'choose' ... -> done
            this._revealTimer = 0;
            this._lastFlip = null;

            // Draw a simple board panel into the free area the core gives us.
            const area = this.boardAreaRect();
            this._boardSprite = new Sprite(new Bitmap(area.width, area.height));
            this._boardSprite.x = area.x;
            this._boardSprite.y = area.y;
            this.addChild(this._boardSprite);

            this.refreshBoard();
            this.refreshStatus();
            this.showMessage("Round 1 — call it: \u2190/\u2192 to pick, OK to flip.");
        }

        // Called every frame while the match is active (not finished, not in the
        // quit-confirm). Read input, advance state, and call this.endMatch(...)
        // when the game is decided.
        updateGame() {
            if (this._phase === "choose") {
                if (Input.isRepeated("left") || Input.isRepeated("right")) {
                    this._call = this._call === 0 ? 1 : 0;
                    this.playSe("select");
                    this.refreshBoard();
                } else if (Input.isTriggered("ok")) {
                    this.resolveRound();
                }
            } else if (this._phase === "reveal") {
                if (--this._revealTimer <= 0) this.nextRound();
            }
        }

        // ---- game-specific logic ------------------------------------------
        resolveRound() {
            this.playSe("move");

            // Opponent calls a side using the shared AI helper. A perfect coin
            // is pure luck, so we let skill only nudge the "read" of the player:
            // higher skill => more likely to call the SAME side as the player
            // (a tiny psychological edge), lower skill => more random.
            const candidates = [0, 1];
            const aiCall = BoardGameAI.chooseMove(
                candidates,
                side => (side === this._call ? 1 : 0), // prefer matching the player
                this.difficulty
            );

            const flip = BoardGameAI.randomInt(2); // 0 Heads, 1 Tails
            this._lastFlip = flip;

            const playerRight = this._call === flip;
            const aiRight = aiCall === flip;
            if (playerRight && !aiRight) this._playerScore++;
            else if (aiRight && !playerRight) this._aiScore++;
            // both right or both wrong => push, no point

            const face = flip === 0 ? "Heads" : "Tails";
            this.showMessage(`It's ${face}! ` +
                `You called ${this._call === 0 ? "Heads" : "Tails"}, ` +
                `${this.opponent.name} called ${aiCall === 0 ? "Heads" : "Tails"}.`);
            if (BoardGameAI.randomInt(3) === 0) this.taunt("thinking");

            this.refreshBoard();
            this.refreshStatus();
            this._phase = "reveal";
            this._revealTimer = 75; // ~1.25s pause before next round
        }

        nextRound() {
            // Decide the match if someone has clinched or rounds are used up.
            const remaining = this._maxRounds - this._round;
            const clinched = Math.abs(this._playerScore - this._aiScore) > remaining;
            if (this._round >= this._maxRounds || clinched) {
                if (this._playerScore > this._aiScore) this.endMatch("win");
                else if (this._aiScore > this._playerScore) this.endMatch("lose");
                else this.endMatch("draw");
                return;
            }
            this._round++;
            this._phase = "choose";
            this.refreshBoard();
            this.refreshStatus();
            this.showMessage(`Round ${this._round} — call it: \u2190/\u2192 to pick, OK to flip.`);
        }

        // ---- drawing -------------------------------------------------------
        refreshBoard() {
            const bmp = this._boardSprite.bitmap;
            const w = bmp.width, h = bmp.height;
            bmp.clear();
            bmp.fillRect(0, 0, w, h, C.panel);
            bmp.strokeRect(0, 0, w, h, C.lineColor);

            // Two call buttons.
            const bw = 150, bh = 60, gap = 40;
            const totalW = bw * 2 + gap;
            const bx = Math.floor((w - totalW) / 2);
            const by = Math.floor(h * 0.30);
            this.drawCallButton(bmp, bx, by, bw, bh, "HEADS", this._call === 0);
            this.drawCallButton(bmp, bx + bw + gap, by, bw, bh, "TAILS", this._call === 1);

            // Last flip readout.
            if (this._lastFlip !== null) {
                bmp.fontFace = BoardGameTheme.fonts.main();
                bmp.fontSize = 26;
                bmp.textColor = C.highlight;
                const face = this._lastFlip === 0 ? "HEADS" : "TAILS";
                bmp.drawText("Coin: " + face, 0, Math.floor(h * 0.62), w, 32, "center");
            }
        }

        drawCallButton(bmp, x, y, w, h, label, selected) {
            bmp.fillRect(x, y, w, h, selected ? C.panelAccent : C.panel);
            bmp.strokeRect(x, y, w, h, selected ? C.highlight : C.lineColor);
            bmp.fontFace = BoardGameTheme.fonts.main();
            bmp.fontSize = 24;
            bmp.textColor = selected ? C.textMain : C.textDim;
            bmp.drawText(label, x, y + Math.floor((h - 24) / 2), w, 24, "center");
        }

        refreshStatus() {
            this.setStatus([
                "Round " + this._round + " / " + this._maxRounds,
                "",
                "You:  " + this._playerScore,
                this.opponent.name + ":  " + this._aiScore
            ]);
        }
    }

    // Register the game with the core. Now the launch command's "coin_duel"
    // Game Id will open this scene.
    BoardGameManager.registerGame({
        id: "coin_duel",
        name: "Coin Duel",
        minSkill: 1,
        maxSkill: BoardGameManager.MAX_SKILL,
        scene: Scene_CoinDuel
    });

})();
