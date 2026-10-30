#!/usr/bin/env node
// Bundles every game in games/ into one self-contained all-in-one.html.
// Usage: node tools/build.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const TEMPLATE = path.join(__dirname, 'all-in-one-template.html');
const OUT = path.join(ROOT, 'all-in-one.html');
const LINK_TAG = '<link rel="stylesheet" href="shared.css">';
const SCRIPT_TAG = '<script src="shared.js"></script>';
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

// A JS string literal that can sit inside a <script> element without ending it early.
function literal(text) {
  return JSON.stringify(text)
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const template = fs.readFileSync(TEMPLATE, 'utf8');
const listed = [...template.matchAll(/^\s*\['([a-z0-9-]+)', '/gm)].map(m => m[1]);
const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).sort();

const missing = listed.filter(id => !files.includes(id));
const unlisted = files.filter(id => !listed.includes(id));
if (missing.length || unlisted.length) {
  console.error('Launcher list and games/ folder disagree.', { missing, unlisted });
  process.exit(1);
}

const sources = listed.map(id => {
  const html = fs.readFileSync(path.join(GAMES_DIR, id + '.html'), 'utf8');
  if (!html.includes(LINK_TAG) || !html.includes(SCRIPT_TAG) || !BACK_LINK.test(html)) {
    console.error(`${id}.html must include ${LINK_TAG}, ${SCRIPT_TAG} and the ← Arcade back link`);
    process.exit(1);
  }
  return `${JSON.stringify(id)}: ${literal(squeeze(html.replace(BACK_LINK, '')))}`;
});

const out = template
  .replace('"@SHARED_CSS@"', () => literal(squeeze(fs.readFileSync(path.join(GAMES_DIR, 'shared.css'), 'utf8'))))
  .replace('"@SHARED_JS@"', () => literal(squeeze(fs.readFileSync(path.join(GAMES_DIR, 'shared.js'), 'utf8'))))
  .replace('"@GAME_SOURCES@"', () => '{\n' + sources.join(',\n') + '\n}')
  .replace(/@COUNT@/g, String(listed.length));

fs.writeFileSync(OUT, out);
console.log(`Wrote ${path.relative(ROOT, OUT)}: ${listed.length} games, ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB`);
