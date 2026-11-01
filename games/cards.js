// Playing-card helpers shared by the card games: decks and a canvas card painter.
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const isRed = c => c.s === 1 || c.s === 2;

// n full decks (or only the given suits), each card { s, r (1-13), up, id }
function makeDeck(n = 1, suits = [0, 1, 2, 3]) {
  const d = [];
  let id = 0;
  for (let k = 0; k < n; k++) for (const s of suits) for (let r = 1; r <= 13; r++) d.push({ s, r, up: false, id: id++ });
  return d;
}

// draw one card with its top-left corner at (x, y)
function drawCard(ctx, c, x, y, w, h, opts = {}) {
  const rad = Math.max(4, w * 0.09);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = opts.lift ? 14 : 3;
  ctx.shadowOffsetY = opts.lift ? 6 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
  if (!c.up) {
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, w - 6, h - 6, rad * 0.7);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#4338ca'); g.addColorStop(1, '#6d28d9');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 7, y + 7, w - 14, h - 14, rad * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h * 0.35); ctx.lineTo(x + w * 0.65, y + h / 2); ctx.lineTo(x + w / 2, y + h * 0.65); ctx.lineTo(x + w * 0.35, y + h / 2);
    ctx.fill();
  } else {
    ctx.fillStyle = opts.dim ? '#d1d5db' : '#fff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const col = isRed(c) ? '#dc2626' : '#111827';
    ctx.fillStyle = col;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const fs = Math.max(10, w * 0.26);
    ctx.font = `bold ${fs}px system-ui, sans-serif`;
    ctx.fillText(RANKS[c.r], x + w * 0.07, y + h * 0.04);
    ctx.font = `${fs * 0.9}px system-ui, sans-serif`;
    ctx.fillText(SUITS[c.s], x + w * 0.07, y + h * 0.04 + fs);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${w * (c.r > 10 ? 0.42 : 0.5)}px system-ui, sans-serif`;
    ctx.fillText(c.r > 10 ? ['J', 'Q', 'K'][c.r - 11] + SUITS[c.s] : SUITS[c.s], x + w / 2, y + h * 0.6);
  }
  if (opts.hi) {
    ctx.strokeStyle = opts.hi === true ? '#facc15' : opts.hi;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, w + 2, h + 2, rad);
    ctx.stroke();
  }
  ctx.restore();
}

// an empty pile outline
function drawSlot(ctx, x, y, w, h, label) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, w - 2, h - 2, Math.max(4, w * 0.09));
  ctx.stroke();
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font = `${w * 0.36}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

// green felt background
function drawFelt(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, 0, 50, w / 2, h / 2, Math.max(w, h));
  g.addColorStop(0, '#15803d');
  g.addColorStop(1, '#14532d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
