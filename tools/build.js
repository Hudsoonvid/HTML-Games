#!/usr/bin/env node
// Packs every game in games/ into one self-contained all-in-one.html, and refreshes
// the game list in index.html. Usage: node tools/build.js [--allow-missing]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const TEMPLATE = path.join(__dirname, 'all-in-one-template.html');
const OUT = path.join(ROOT, 'all-in-one.html');
const INDEX = path.join(ROOT, 'index.html');
const LIST = require('./games.js');
const allowMissing = process.argv.includes('--allow-missing');
// In all-in-one.html the game list is always beside the game, so the back link is dropped.
const BACK_LINK = /<a class="back" href="\.\.\/index\.html">[^<]*<\/a>/;

// Drop indentation, blank lines and whole-line comments to keep the bundle small.
// Safe for these sources because none of them use multi-line template strings.
function squeeze(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('// ') && !/^\/\*.*\*\/$/.test(line))
    .join('\n');
}

// A JS literal that can sit inside a <script> element without ending it early.
function literal(value) {
  return JSON.stringify(value)
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const fail = msg => { console.error(msg); process.exit(1); };
const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5));
const ids = LIST.map(g => g[0]);
const unlisted = files.filter(id => !ids.includes(id));
if (unlisted.length) fail('games/ has pages missing from tools/games.js: ' + unlisted.join(', '));
const missing = ids.filter(id => !files.includes(id));
if (missing.length && !allowMissing) fail('tools/games.js lists games with no page yet: ' + missing.join(', '));
const games = LIST.filter(g => files.includes(g[0]));

// shared files a game pulls in with <script src="x.js"> or <link rel="stylesheet" href="x.css">
const libs = {};
const pages = {};
for (const [id] of games) {
  const html = fs.readFileSync(path.join(GAMES_DIR, id + '.html'), 'utf8');
  if (!BACK_LINK.test(html)) fail(`${id}.html needs the ← Arcade back link to ../index.html`);
  const refs = [...html.matchAll(/<script src="([\w-]+\.js)"><\/script>|<link rel="stylesheet" href="([\w-]+\.css)">/g)].map(m => m[1] || m[2]);
  for (const name of refs) {
    if (!fs.existsSync(path.join(GAMES_DIR, name))) fail(`${id}.html uses ${name}, which is not in games/`);
    if (!libs[name]) libs[name] = squeeze(fs.readFileSync(path.join(GAMES_DIR, name), 'utf8'));
  }
  pages[id] = squeeze(html.replace(BACK_LINK, ''));
}

const json = JSON.stringify({ libs, games: pages });
const pack = zlib.deflateRawSync(Buffer.from(json, 'utf8'), { level: 9 }).toString('base64');
const inflate = fs.readFileSync(path.join(__dirname, 'inflate.js'), 'utf8').replace(/\nif \(typeof module[^\n]*\n?$/, '\n');

const out = fs.readFileSync(TEMPLATE, 'utf8')
  .replace('"@PACK@"', () => JSON.stringify(pack))
  .replace('"@GAMES@"', () => literal(games))
  .replace('/*@INFLATE@*/', () => inflate.trim())
  .replace(/@COUNT@/g, String(games.length));
fs.writeFileSync(OUT, out);

// keep the regular launcher's list in step
const index = fs.readFileSync(INDEX, 'utf8');
const listJs = 'const GAMES = ' + literal(games) + '.map(([id, name, icon, cat, desc, flag]) => ({ id, name, icon, cat, desc, flag }));';
const newIndex = index.replace(/\/\/ @GAMES-START[\s\S]*?\/\/ @GAMES-END/, () => `// @GAMES-START (written by tools/build.js)\n${listJs}\n// @GAMES-END`);
if (newIndex === index && !index.includes(listJs)) console.warn('index.html has no // @GAMES-START ... // @GAMES-END block; not updated');
fs.writeFileSync(INDEX, newIndex);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`Wrote all-in-one.html: ${games.length} games, ${kb(Buffer.byteLength(out))} (games ${kb(json.length)} unpacked)` + (missing.length ? ` — ${missing.length} listed games not written yet` : ''));
