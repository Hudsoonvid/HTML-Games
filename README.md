# HTML Games Arcade

**64 browser games, plus an all-in-one version that fits every game into a single HTML file you can embed on any website.** Everything is written from scratch in plain HTML, CSS and JavaScript: no frameworks, no external assets, no internet connection needed.

![Games](https://img.shields.io/badge/games-64-8b5cf6) ![All-in-one](https://img.shields.io/badge/all--in--one-1%20file%2C%20486%20KB-22c55e)

| File | What it is |
|---|---|
| [`all-in-one.html`](all-in-one.html) | **Mega All-In-One:** every game inside one self-contained file, with a searchable game list beside the player. This is the file to put on your website. |
| [`index.html`](index.html) | The regular arcade homepage for this folder; it opens the separate files in `games/`. |
| `games/` | One page per game. Each works on its own, and they're the source that `all-in-one.html` is built from. |

## Putting the games on your website

You only need **`all-in-one.html`** (rename it if you like). Pick whichever way your site supports:

**Option 1: upload the file and embed it with an iframe** (works everywhere and is the most reliable):

```html
<iframe src="all-in-one.html" style="width:100%;height:900px;border:0" allow="fullscreen *; autoplay *"></iframe>
```

**Option 2: paste the code.** Open `all-in-one.html` in a text editor, copy everything, and paste it into your site builder's *Embed code*, *Custom HTML* or *Code* block. The arcade draws itself inside a sealed-off box, so your site's styles can't break it and it won't restyle your site. On a narrow page column the list stacks above the game automatically.

**Option 3: link to it.** Upload `all-in-one.html` anywhere that serves files (GitHub Pages, Netlify, your own host) and link to it.

### Starting on a particular game

- Add `data-game="sudoku"` to the arcade's container: change `<div id="html-games-arcade"></div>` to `<div id="html-games-arcade" data-game="sudoku"></div>`, or
- link to the file with the game id after a `#`, for example `all-in-one.html#sudoku`. The address updates as you switch games, so you can copy a link to any game.

The id is the game's file name in `games/` (`2048`, `sudoku`, `solitaire`, `pixel-jumper`, …).

### Good to know

- If a site builder refuses the pasted code because it's too large, use option 1 instead.
- Each game runs in its own frame, so games never interfere with each other or with your page, and switching games stops the previous one.
- High scores, best times and progress (Gem Clicker save, Box Pusher levels, Blackjack bankroll, …) are saved in each visitor's browser. Sites that block browser storage still work; scores just aren't kept.
- Each game has 🔊 mute and ⛶ fullscreen buttons. Fullscreen needs `allow="fullscreen *"` on your iframe. **Open Game** opens the current game by itself in a new tab.

## Playing locally

Double-click `all-in-one.html` (or `index.html`) to play straight from your disk in any modern browser.

## The games


### Arcade (22)

| | Game | Description |
|---|---|---|
| 🐍 | [Snake](games/snake.html) | Eat apples and grow longer without biting yourself. |
| 🧱 | [Blockfall](games/blockfall.html) | Classic falling-blocks puzzler with hold, ghost piece and levels. |
| 🏏 | [Brick Breaker](games/brick-breaker.html) | Bounce the ball, smash bricks, catch power-ups. |
| 🏓 | [Pong](games/pong.html) | The original paddle duel — vs the CPU or a friend. |
| 👾 | [Alien Invasion](games/alien-invasion.html) | Hold off waves of marching aliens from behind your bunkers. |
| ☄️ | [Asteroids](games/asteroids.html) | Thrust, rotate and blast drifting space rocks. |
| 🐤 | [Flappy](games/flappy.html) | Tap to flap through an endless line of pipes. |
| 🦖 | [Dino Run](games/dino-run.html) | Jump cacti and duck birds in an endless desert run. |
| 🐸 | [Road Hopper](games/road-hopper.html) | Hop across traffic and ride logs to reach home. |
| 🟡 | [Maze Muncher](games/maze-muncher.html) | Gobble every dot while four ghosts hunt you down. |
| 🚀 | [Missile Defense](games/missile-defense.html) | Intercept incoming missiles to protect six cities. |
| 🚁 | [Cave Flyer](games/cave-flyer.html) | Hold to climb, release to fall through a narrowing cave. |
| 🦘 | [Sky Jumper](games/sky-jumper.html) | Bounce from platform to platform, ever upward. |
| 🏍️ | [Light Cycles](games/light-cycles.html) | Trap up to three bots with your light trail. |
| 🌠 | [Star Shooter](games/star-shooter.html) | Vertical space shooter with power-ups and bosses. |
| 🌙 | [Lunar Lander](games/lunar-lander.html) | Feather the thrusters and touch down gently. |
| 🏗️ | [Stack Tower](games/stack-tower.html) | Time each drop to build the tallest tower. |
| 🧺 | [Fruit Catcher](games/fruit-catcher.html) | Catch falling fruit in your basket, dodge the bombs. |
| 🫧 | [Bubble Shooter](games/bubble-shooter.html) | Aim, bounce and pop clusters of matching bubbles. |
| 🏒 | [Air Hockey](games/air-hockey.html) | Fast-paced puck physics against a CPU opponent. |
| 💣 | [Artillery](games/artillery.html) | Angle, power and wind — a turn-based tank duel. |
| 🍄 | [Pixel Jumper](games/pixel-jumper.html) | A three-level side-scrolling platformer. |

### Skill (9)

| | Game | Description |
|---|---|---|
| 🔨 | [Whack-a-Mole](games/whack-a-mole.html) | 30 seconds to bop as many moles as you can. |
| 🚦 | [Simon Says](games/simon.html) | Repeat the ever-growing sequence of lights and tones. |
| ⚡ | [Reaction Time](games/reaction-time.html) | How fast can you click when the screen turns green? |
| 🎯 | [Aim Trainer](games/aim-trainer.html) | Hit 30 targets as quickly and accurately as possible. |
| ⌨️ | [Typing Rush](games/typing-rush.html) | Type the falling words before they hit the ground. |
| 🎹 | [Piano Tiles](games/piano-tiles.html) | Tap the black tiles and don't miss a beat. |
| 🎨 | [Color Match](games/color-match.html) | A speedy brain teaser: meaning vs ink colour. |
| ➗ | [Quick Math](games/quick-math.html) | Solve as many sums as you can in 60 seconds. |
| 💎 | [Gem Clicker](games/gem-clicker.html) | Click, upgrade and automate your way to riches. |

### Puzzle (16)

| | Game | Description |
|---|---|---|
| 🔢 | [2048](games/2048.html) | Slide and merge tiles to reach 2048. |
| 🚩 | [Minesweeper](games/minesweeper.html) | Clear the field without setting off a mine. |
| 🧮 | [Sudoku](games/sudoku.html) | Freshly generated puzzles with notes and hints. |
| 🧩 | [Sliding Puzzle](games/sliding-puzzle.html) | The classic 8, 15 and 24 tile puzzles. |
| 🃏 | [Memory Match](games/memory-match.html) | Flip cards and find all the pairs. |
| 💡 | [Lights Out](games/lights-out.html) | Toggle lights in a cross pattern until all are off. |
| 📦 | [Box Pusher](games/box-pusher.html) | 14 hand-made crate-pushing levels. |
| 🖼️ | [Nonogram](games/nonogram.html) | Use number clues to paint a hidden picture. |
| 🌀 | [Maze Runner](games/maze-runner.html) | Escape randomly generated mazes that keep growing. |
| 🟠 | [Peg Solitaire](games/peg-solitaire.html) | Jump pegs until only one remains. |
| 🗼 | [Tower of Hanoi](games/tower-of-hanoi.html) | Move the tower one disk at a time. |
| 🌊 | [Flood It](games/flood-it.html) | Flood the board with one colour in limited moves. |
| 💠 | [Gem Swap](games/gem-swap.html) | Match-3 with cascades — 30 moves to score big. |
| 🟪 | [SameGame](games/same-game.html) | Pop groups of blocks; bigger groups score more. |
| 🔐 | [Code Breaker](games/code-breaker.html) | Deduce the hidden colour code in 10 guesses. |
| 🔌 | [Pipes](games/pipes.html) | Rotate tiles to connect every pipe to the power. |

### Word (4)

| | Game | Description |
|---|---|---|
| 🟩 | [Word Guess](games/word-guess.html) | Find the 5-letter word in six tries. Daily and unlimited. |
| 🪢 | [Hangman](games/hangman.html) | Guess the word letter by letter across seven categories. |
| 🔍 | [Word Search](games/word-search.html) | Find the hidden words in a grid of letters. |
| 🔤 | [Word Scramble](games/word-scramble.html) | Unscramble words against the clock. |

### Board (8)

| | Game | Description |
|---|---|---|
| ❌ | [Tic-Tac-Toe](games/tic-tac-toe.html) | Noughts and crosses with an unbeatable CPU. |
| 🔴 | [Connect Four](games/connect-four.html) | Drop discs and line up four before the CPU does. |
| ⛀ | [Checkers](games/checkers.html) | Draughts with forced captures, kings and a smart CPU. |
| ⚫ | [Reversi](games/reversi.html) | Outflank and flip your opponent’s discs. |
| ⚪ | [Gomoku](games/gomoku.html) | Five in a row on a 15×15 board. |
| 🔲 | [Dots & Boxes](games/dots-and-boxes.html) | Draw lines, close boxes, don’t give away chains. |
| 🚢 | [Battleship](games/battleship.html) | Hunt down and sink the enemy fleet. |
| 🫘 | [Mancala](games/mancala.html) | Sow and capture seeds in this ancient game. |

### Cards & Dice (5)

| | Game | Description |
|---|---|---|
| 🂡 | [Solitaire](games/solitaire.html) | Klondike with drag-and-drop, undo and hints. |
| ♠️ | [Blackjack](games/blackjack.html) | Beat the dealer to 21. Split, double and bet. |
| 🎲 | [Yacht Dice](games/yacht-dice.html) | Roll five dice and fill the 13-box scorecard. |
| ⬆️ | [Higher or Lower](games/higher-lower.html) | Guess if the next card is higher or lower. |
| ✊ | [Rock Paper Scissors](games/rock-paper-scissors.html) | Against a CPU that learns your patterns. |

## Controls at a glance

- **Keyboard:** arrow keys / WASD to move, <kbd>Space</kbd> for the main action, <kbd>P</kbd> to pause where it makes sense. Each game lists its keys under the play area.
- **Mouse / touch:** every game can be played with a pointer. Action games show on-screen buttons on touch devices and support swipes where it fits (Snake, 2048, Blockfall, Road Hopper, and more).
- **Computer opponents:** the board games (Tic-Tac-Toe, Connect Four, Checkers, Reversi, Gomoku, Dots & Boxes, Battleship, Mancala), Pong, Air Hockey, Light Cycles and Artillery all have built-in AI with selectable difficulty. Many also have a 2-player mode.

## Project layout

```
all-in-one.html       Mega All-In-One: every game in one file (generated, don't edit by hand)
index.html            arcade homepage that links to the separate game files
games/                the source of each game, one page per game (each also runs on its own)
  shared.css          common theme: colours, top bar, buttons, overlays, touch pad
  shared.js           tiny helpers: Store (localStorage), recordBest, rand/pick/shuffle, onSwipe,
                      canvasPoint, holdButton, overlay, Sound (Web Audio beeps), mute/fullscreen
tools/
  all-in-one-template.html  the Mega All-In-One page (layout, styles, game list)
  build.js                  packs the template + games/ into all-in-one.html
```

## Editing or adding a game

1. Edit a page in `games/`, or create `games/my-game.html` by copying an existing game: it links `shared.css`, has a `<header class="topbar">` with a `← Arcade` link to `../index.html`, and loads `shared.js` before its own inline `<script>`.
2. For a new game, add the same entry to the `GAMES` list in both `index.html` and `tools/all-in-one-template.html`: `['my-game', 'My Game', '🎮', 'Arcade', 'One-line description.']`.
3. Rebuild the single file with [Node.js](https://nodejs.org): `node tools/build.js`. It checks that every listed game exists and writes a fresh `all-in-one.html`.
