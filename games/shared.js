// Small helpers shared by the games in this folder.

// localStorage wrapper that never throws (private mode, blocked storage, etc).
const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('html-games:' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem('html-games:' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
};

// Save a score if it beats the stored best; returns the (possibly new) best.
function recordBest(key, score, lowerIsBetter) {
  const best = Store.get(key, null);
  if (best === null || (lowerIsBetter ? score < best : score > best)) {
    Store.set(key, score);
    return score;
  }
  return best;
}

const rand = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Report swipe gestures on an element as 'up' | 'down' | 'left' | 'right'.
function onSwipe(el, cb, minDist = 24) {
  let sx = 0, sy = 0, active = false;
  el.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; active = true;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    if (!active) return;
    active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < minDist) return;
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
}

// Convert a mouse / pointer / touch event into canvas pixel coordinates.
function canvasPoint(canvas, e) {
  const r = canvas.getBoundingClientRect();
  let p = e;
  if (e.touches && e.touches.length) p = e.touches[0];
  else if (e.changedTouches && e.changedTouches.length) p = e.changedTouches[0];
  return {
    x: (p.clientX - r.left) * canvas.width / r.width,
    y: (p.clientY - r.top) * canvas.height / r.height
  };
}

// Wire an on-screen button so it reports press / release (for touch controls).
function holdButton(el, onChange) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.classList.add('on');
    onChange(true);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, () => {
    if (!el.classList.contains('on')) return;
    el.classList.remove('on');
    onChange(false);
  }));
}

// Show HTML in an overlay element, or hide it when html is null.
function overlay(el, html) {
  if (html == null) {
    el.classList.add('hidden');
  } else {
    el.innerHTML = html;
    el.classList.remove('hidden');
  }
}

// Tiny Web Audio beeper. Created lazily on first use (after a user gesture).
const Sound = {
  ctx: null,
  muted: Store.get('muted', false),
  beep(freq = 440, dur = 0.08, type = 'square', vol = 0.04) {
    if (this.muted) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* audio unavailable */ }
  }
};

// Add mute and fullscreen toggles to the top bar of every game.
(function addTopbarButtons() {
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  const b = document.createElement('button');
  b.className = 'btn alt mute';
  b.title = 'Toggle sound';
  const paint = () => { b.textContent = Sound.muted ? '🔇' : '🔊'; };
  b.onclick = () => { Sound.muted = !Sound.muted; Store.set('muted', Sound.muted); paint(); };
  paint();
  bar.appendChild(b);
  if (document.fullscreenEnabled) {
    const fs = document.createElement('button');
    fs.className = 'btn alt mute';
    fs.title = 'Full screen';
    fs.textContent = '⛶';
    fs.onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    };
    bar.appendChild(fs);
  }
})();

// Keep arrow keys and space from scrolling the page while playing.
window.addEventListener('keydown', e => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
}, { passive: false });

// Clicking a button should not leave it focused, otherwise Space/Enter re-press it mid-game.
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('button');
  if (b) b.blur();
});
