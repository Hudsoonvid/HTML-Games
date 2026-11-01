// Online play for the arcade: matchmaking over free public MQTT relays, computer
// opponents, adaptive difficulty and the shared "choose a mode" menu.
// Load after shared.js.

const NET = {
  prefix: 'hga-arcade-v1',
  brokers: ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'],
  searchMs: [5000, 9000], // how long to look for a real player before falling back
  helloMs: 4000
};

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- minimal MQTT 3.1.1 client over WebSocket (QoS 0 only) ----------
const mqEnc = new TextEncoder(), mqDec = new TextDecoder();
const mqStr = s => { const b = mqEnc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
function mqPacket(head, body) {
  const len = [];
  let n = body.length;
  do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; len.push(d); } while (n);
  const out = new Uint8Array(1 + len.length + body.length);
  out[0] = head;
  out.set(len, 1);
  out.set(body, 1 + len.length);
  return out;
}

class MqttLink {
  constructor(url, clientId, onMessage, onChange) {
    this.ok = false;
    this.dead = false;
    this.buf = new Uint8Array(0);
    this.pid = 1;
    this.subs = new Set();
    this.onMessage = onMessage;
    this.onChange = onChange;
    try { this.ws = new WebSocket(url, 'mqtt'); } catch (e) { setTimeout(() => this.fail(), 0); return; }
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => this.raw(mqPacket(0x10, [...mqStr('MQTT'), 4, 0x02, 0, 40, ...mqStr(clientId)]));
    this.ws.onmessage = e => this.feed(new Uint8Array(e.data));
    this.ws.onclose = () => this.fail();
    this.ws.onerror = () => this.fail();
    this.timer = setTimeout(() => { if (!this.ok) this.fail(); }, 7000);
  }
  raw(bytes) { try { if (this.ws && this.ws.readyState === 1) this.ws.send(bytes); } catch (e) { /* ignore */ } }
  fail() {
    if (this.dead) return;
    this.dead = true;
    this.ok = false;
    clearTimeout(this.timer);
    clearInterval(this.pinger);
    try { if (this.ws) this.ws.close(); } catch (e) { /* ignore */ }
    this.onChange();
  }
  feed(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length);
    b.set(this.buf);
    b.set(chunk, this.buf.length);
    this.buf = b;
    for (;;) {
      if (this.buf.length < 2) return;
      let mul = 1, len = 0, i = 1, byte;
      do {
        if (i >= this.buf.length) return;
        byte = this.buf[i++];
        len += (byte & 127) * mul;
        mul *= 128;
      } while (byte & 128);
      if (this.buf.length < i + len) return;
      const head = this.buf[0], body = this.buf.slice(i, i + len);
      this.buf = this.buf.slice(i + len);
      this.packet(head >> 4, head & 15, body);
    }
  }
  packet(type, flags, body) {
    if (type === 2) { // CONNACK
      if (body[1] !== 0) return this.fail();
      this.ok = true;
      clearTimeout(this.timer);
      this.pinger = setInterval(() => this.raw(new Uint8Array([0xc0, 0])), 25000);
      this.subs.forEach(t => this.sendSub(t));
      this.onChange();
    } else if (type === 3) { // PUBLISH
      const tl = (body[0] << 8) | body[1];
      const topic = mqDec.decode(body.subarray(2, 2 + tl));
      const off = 2 + tl + (((flags >> 1) & 3) ? 2 : 0);
      this.onMessage(topic, mqDec.decode(body.subarray(off)));
    }
  }
  nextId() { this.pid = (this.pid % 65535) + 1; return this.pid; }
  sendSub(topic) { const id = this.nextId(); this.raw(mqPacket(0x82, [id >> 8, id & 255, ...mqStr(topic), 0])); }
  subscribe(topic) { this.subs.add(topic); if (this.ok) this.sendSub(topic); }
  unsubscribe(topic) {
    this.subs.delete(topic);
    if (this.ok) { const id = this.nextId(); this.raw(mqPacket(0xa2, [id >> 8, id & 255, ...mqStr(topic)])); }
  }
  publish(topic, text, retain) { if (this.ok) this.raw(mqPacket(0x30 | (retain ? 1 : 0), [...mqStr(topic), ...mqEnc.encode(text)])); }
}

// ---------- Relay: talks to several brokers at once and de-duplicates ----------
// Publishing to every reachable broker means two players meet even if each can
// only reach some of the public relays.
const Relay = {
  me: uid(),
  links: [],
  handlers: [],
  seen: new Map(),
  listeners: new Set(),
  start() {
    if (this.links.length) return;
    const list = Store.get('brokers', null) || NET.brokers;
    this.links = list.map((url, i) => new MqttLink(url, 'hga_' + this.me + '_' + i, (t, m) => this.dispatch(t, m), () => this.changed()));
  },
  changed() { this.listeners.forEach(fn => fn()); },
  get up() { return this.links.some(l => l.ok); },
  get down() { return this.links.length > 0 && this.links.every(l => l.dead); },
  watch(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  sub(topic, fn) {
    const h = { topic, fn };
    this.handlers.push(h);
    if (this.handlers.filter(x => x.topic === topic).length === 1) this.links.forEach(l => l.subscribe(topic));
    return () => {
      this.handlers = this.handlers.filter(x => x !== h);
      if (!this.handlers.some(x => x.topic === topic)) this.links.forEach(l => l.unsubscribe(topic));
    };
  },
  pub(topic, obj, retain) {
    const text = JSON.stringify({ ...obj, _m: uid() + uid() });
    this.links.forEach(l => l.publish(topic, text, retain));
  },
  match(filter, topic) {
    const f = filter.split('/'), t = topic.split('/');
    for (let i = 0; i < f.length; i++) {
      if (f[i] === '#') return true;
      if (f[i] !== '+' && f[i] !== t[i]) return false;
    }
    return f.length === t.length;
  },
  dispatch(topic, text) {
    let msg;
    try { msg = JSON.parse(text); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg._m) {
      if (this.seen.has(msg._m)) return;
      this.seen.set(msg._m, Date.now());
      if (this.seen.size > 800) { const cut = Date.now() - 60000; this.seen.forEach((t, k) => { if (t < cut) this.seen.delete(k); }); }
    }
    this.handlers.slice().forEach(h => { if (this.match(h.topic, topic)) { try { h.fn(msg, topic); } catch (e) { console.warn(e); } } });
  }
};

// ---------- adaptive difficulty ----------
// Each game keeps a skill value between 0 and 1. Beating opponents of a similar
// level nudges it up, losing nudges it down; computer opponents play at it.
const Skill = {
  get(game) { return clamp(+Store.get('skill-' + game, 0.3) || 0.3, 0, 1); },
  update(game, opp, result) {
    const s = this.get(game);
    const expected = 1 / (1 + Math.exp(-(s - opp) * 6));
    const next = clamp(s + 0.1 * (result - expected), 0, 1);
    Store.set('skill-' + game, +next.toFixed(3));
    return next;
  },
  difficulty(game) {
    const d = Store.get('difficulty-' + game, { auto: true, value: 0.5 });
    return d.auto ? this.get(game) : clamp(+d.value, 0, 1);
  }
};

const BOT_NAMES = {
  a: ['Swift', 'Lucky', 'Sneaky', 'Silent', 'Crazy', 'Happy', 'Turbo', 'Mega', 'Pixel', 'Shadow', 'Cosmic', 'Frosty', 'Golden', 'Brave', 'Sly', 'Ultra', 'Epic', 'Lazy', 'Rapid', 'Neon'],
  n: ['Fox', 'Panda', 'Tiger', 'Ninja', 'Wolf', 'Gamer', 'Rider', 'Falcon', 'Shark', 'Comet', 'Dragon', 'Otter', 'Knight', 'Wizard', 'Bear', 'Hawk', 'Taco', 'Koala', 'Pilot', 'Rocket'],
  solo: ['Maya', 'Leo', 'Ava', 'Noah', 'Zoe', 'Eli', 'Luna', 'Max', 'Ivy', 'Kai', 'Nora', 'Finn', 'Ruby', 'Jay', 'Mila', 'Theo']
};
function randomName() {
  const r = Math.random();
  if (r < 0.3) return pick(BOT_NAMES.solo) + (Math.random() < 0.6 ? randInt(1, 99) : '');
  if (r < 0.65) return pick(BOT_NAMES.a) + pick(BOT_NAMES.n) + (Math.random() < 0.5 ? randInt(1, 999) : '');
  return (pick(BOT_NAMES.n) + '_' + pick(BOT_NAMES.solo)).toLowerCase() + (Math.random() < 0.5 ? randInt(10, 99) : '');
}
function playerName() {
  let n = Store.get('player-name', null);
  if (!n) { n = 'Player' + randInt(100, 9999); Store.set('player-name', n); }
  return n;
}

// ---------- sessions ----------
// A session is one opponent connection. mode: 'online' | 'cpu' | 'local'.
// ai is true whenever the computer plays the other side (including when no
// online opponent was found). seat 0 is the host / first player, seat 1 the guest.
class Session {
  constructor(o) {
    Object.assign(this, { mode: 'cpu', ai: false, level: 0.5, seat: 0, host: true, round: 0 }, o);
    this.handlers = { hb() {} };
    this.leaveFns = [];
    this.left = false;
    this.unsub = null;
    if (this.room) this.connectRoom();
  }
  get human() { return this.mode === 'online' && !this.ai; }
  connectRoom() {
    this.unsub = Relay.sub(this.room, msg => {
      if (msg.from === this.myId) return;
      this.lastSeen = Date.now();
      const fn = this.handlers[msg.t];
      if (fn) fn(msg.d, msg);
      else if (!msg.t || msg.t[0] !== '_' || msg.t === '__start' || msg.t === '__again') {
        // keep early messages until the game registers a handler for them
        this.queue = (this.queue || []).slice(-50);
        this.queue.push(msg);
      }
    });
    this.lastSeen = Date.now();
    this.hb = setInterval(() => {
      this.send('hb');
      if (!this.left && Date.now() - this.lastSeen > 10000) this.markLeft();
    }, 2000);
    // tell the other player straight away when this page closes
    this.bye = () => this.send('__bye');
    window.addEventListener('pagehide', this.bye);
  }
  markLeft() {
    if (this.left) return;
    this.left = true;
    this.leaveFns.forEach(fn => fn());
  }
  send(type, data) { if (this.human && !this.closed) Relay.pub(this.room, { t: type, d: data, from: this.myId }); }
  on(type, fn) {
    this.handlers[type] = fn;
    if (this.queue) {
      const later = [];
      this.queue.forEach(m => (m.t === type ? fn(m.d, m) : later.push(m)));
      this.queue = later;
    }
  }
  off(type) { delete this.handlers[type]; }
  onLeave(fn) { this.leaveFns.push(fn); }
  // Host makes the round settings and shares them; everyone else waits for them.
  startRound(make, begin) {
    this.round++;
    if (this.human && !this.host) { this.on('__start', cfg => { this.off('__start'); begin(cfg); }); return; }
    const cfg = make();
    if (this.human) this.send('__start', cfg);
    begin(cfg);
  }
  // How long the computer should "think" so it feels like a person.
  delay(min = 350, max = 900) { return this.mode === 'online' ? rand(min * 2, max * 2.2) : rand(min, max); }
  finish(result) {
    if (this.mode === 'local' || this.finished === this.round) return null;
    this.finished = this.round;
    const before = Skill.get(this.game);
    const opp = this.ai ? this.level : (this.opp && typeof this.opp.skill === 'number' ? this.opp.skill : before);
    const after = Skill.update(this.game, opp, result);
    return { before, after };
  }
  close() {
    if (this.human && !this.closed) this.send('__bye');
    this.closed = true;
    clearInterval(this.hb);
    if (this.bye) window.removeEventListener('pagehide', this.bye);
    if (this.unsub) this.unsub();
  }
}

// ---------- matchmaking ----------
// Players looking for the same game announce themselves in a lobby topic. The one
// with the smaller id invites, the other accepts, and both move to a private room.
// If nobody turns up in time, a computer opponent with a player-style name steps in.
function findMatch(game, onFound, onStatus) {
  Relay.start();
  const myId = uid(), name = playerName(), skill = Skill.get(game);
  const base = `${NET.prefix}/${game}`, lobby = base + '/lobby', inbox = `${base}/u/${myId}`;
  let state = 'seeking', pending = null, unsubs = [], timers = [];
  const started = Date.now();
  const giveUpAt = started + rand(NET.searchMs[0], NET.searchMs[1]);

  const cleanup = () => { unsubs.forEach(u => u()); unsubs = []; timers.forEach(clearInterval); timers = []; };
  const done = s => { cleanup(); state = 'done'; onFound(s); };

  const enterRoom = (room, host, opp) => {
    state = 'hello';
    const s = new Session({ game, mode: 'online', ai: false, room, myId, host, seat: host ? 0 : 1, me: { name, skill }, opp });
    let got = false;
    s.on('__hello', d => { got = true; s.opp = { ...s.opp, ...d }; });
    const sayHello = setInterval(() => s.send('__hello', { name, skill }), 500);
    s.send('__hello', { name, skill });
    const t0 = Date.now();
    const wait = setInterval(() => {
      if (state === 'cancelled') { clearInterval(wait); clearInterval(sayHello); s.close(); return; }
      if (got) {
        setTimeout(() => clearInterval(sayHello), 1500);
        clearInterval(wait);
        s.off('__hello');
        s.on('__hello', () => {});
        s.on('__bye', () => s.markLeft());
        done(s);
      } else if (Date.now() - t0 > NET.helloMs) {
        clearInterval(wait);
        clearInterval(sayHello);
        s.close();
        state = 'seeking';
        pending = null;
      }
    }, 100);
  };

  unsubs.push(Relay.sub(lobby, msg => {
    if (state !== 'seeking' || msg.t !== 'seek' || msg.id === myId || pending) return;
    if (Math.abs(Date.now() - (msg.ts || 0)) > 20000) return;
    if (myId < msg.id) {
      pending = msg.id;
      Relay.pub(`${base}/u/${msg.id}`, { t: 'invite', from: myId, name, skill, room: `${base}/r/${myId}${msg.id}` });
      setTimeout(() => { if (pending === msg.id && state === 'seeking') pending = null; }, 2500);
    }
  }));
  unsubs.push(Relay.sub(inbox, msg => {
    if (msg.t === 'invite' && state === 'seeking' && !pending) {
      Relay.pub(`${base}/u/${msg.from}`, { t: 'accept', from: myId, name, skill, room: msg.room });
      enterRoom(msg.room, false, { name: String(msg.name).slice(0, 20), skill: +msg.skill });
    } else if (msg.t === 'accept' && state === 'seeking' && pending === msg.from) {
      enterRoom(msg.room, true, { name: String(msg.name).slice(0, 20), skill: +msg.skill });
    }
  }));

  timers.push(setInterval(() => {
    if (state === 'seeking' && Relay.up) Relay.pub(lobby, { t: 'seek', id: myId, name, skill, ts: Date.now() });
    if (onStatus) onStatus(Math.floor((Date.now() - started) / 1000));
    const noNetwork = Relay.down || (!Relay.up && Date.now() - started > 4000);
    if (state === 'seeking' && (Date.now() > giveUpAt || noNetwork)) {
      // nobody around: a computer player takes the seat, and plays at your level
      const level = clamp(skill + rand(-0.06, 0.06), 0, 1);
      done(new Session({ game, mode: 'online', ai: true, level, seat: 0, host: true, me: { name, skill }, opp: { name: randomName(), skill: level } }));
    }
  }, 600));

  return () => { if (state !== 'done') { state = 'cancelled'; cleanup(); } };
}

// ---------- the mode menu shown before every multiplayer-capable game ----------
const Lobby = {
  el: null,
  opts: null,
  show(html) {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'lobby';
      document.body.appendChild(this.el);
    }
    this.el.innerHTML = `<div class="lobby-card">${html}</div>`;
    this.el.classList.remove('hidden');
    return this.el;
  },
  hide() { if (this.el) this.el.classList.add('hidden'); },
  // opts: { game, title, local (bool), cpu (default true), online (default true), onStart(session) }
  open(opts) {
    if (opts) this.opts = { cpu: true, online: true, ...opts };
    const o = this.opts;
    if (this.session) { this.session.close(); this.session = null; }
    const diff = Store.get('difficulty-' + o.game, { auto: true, value: 0.5 });
    const skill = Skill.get(o.game);
    const val = diff.auto ? skill : diff.value;
    const el = this.show(`
      <h2>${o.title}</h2>
      <label class="lobby-name">Your name <input id="lbName" maxlength="16" value="${playerName().replace(/"/g, '')}"></label>
      ${o.online ? '<button class="btn big" id="lbOnline">🌐 Play online</button>' : ''}
      ${o.cpu ? `<button class="btn big alt" id="lbCpu">🤖 Play vs computer</button>
      <div class="lobby-diff">
        <div class="row"><span>Difficulty</span><b id="lbVal">${val.toFixed(2)}</b>
        <label><input type="checkbox" id="lbAuto" ${diff.auto ? 'checked' : ''}> Auto</label></div>
        <input type="range" id="lbRange" min="0" max="1" step="0.01" value="${val}">
        <div class="hint">Auto follows your skill in this game (now ${skill.toFixed(2)}).</div>
      </div>` : ''}
      ${o.local ? '<button class="btn big alt" id="lbLocal">👥 2 players on this device</button>' : ''}`);
    const nameEl = el.querySelector('#lbName');
    nameEl.addEventListener('change', () => { const v = nameEl.value.trim().slice(0, 16); if (v) Store.set('player-name', v); });
    const range = el.querySelector('#lbRange'), auto = el.querySelector('#lbAuto'), lab = el.querySelector('#lbVal');
    if (range) {
      range.oninput = () => { auto.checked = false; lab.textContent = (+range.value).toFixed(2); Store.set('difficulty-' + o.game, { auto: false, value: +range.value }); };
      auto.onchange = () => {
        const d = { auto: auto.checked, value: +range.value };
        Store.set('difficulty-' + o.game, d);
        if (auto.checked) { range.value = Skill.get(o.game); lab.textContent = Skill.get(o.game).toFixed(2); }
      };
    }
    const saveName = () => { const v = nameEl.value.trim().slice(0, 16); if (v) Store.set('player-name', v); };
    const on = (id, fn) => { const b = el.querySelector(id); if (b) b.onclick = () => { saveName(); fn(); }; };
    on('#lbOnline', () => this.search());
    on('#lbCpu', () => this.begin(new Session({ game: o.game, mode: 'cpu', ai: true, level: Skill.difficulty(o.game), me: { name: playerName() }, opp: { name: 'Computer' } })));
    on('#lbLocal', () => this.begin(new Session({ game: o.game, mode: 'local', ai: false, me: { name: 'Player 1' }, opp: { name: 'Player 2' } })));
  },
  search() {
    const o = this.opts;
    const el = this.show(`<h2>${o.title}</h2><div class="spinner"></div><p id="lbStatus">Finding an opponent…</p><button class="btn alt" id="lbCancel">Cancel</button>`);
    const status = el.querySelector('#lbStatus');
    const cancel = findMatch(o.game, s => {
      status.textContent = `Matched with ${s.opp.name}!`;
      el.querySelector('#lbCancel').remove();
      Sound.beep(880, 0.12, 'triangle');
      setTimeout(() => this.begin(s), 800);
    }, secs => { status.textContent = `Finding an opponent… ${secs}s`; });
    el.querySelector('#lbCancel').onclick = () => { cancel(); this.open(); };
  },
  begin(s) {
    this.session = s;
    this.hide();
    s.onLeave(() => {
      if (this.session !== s || s.ended) return;
      this.end(s, { result: 1, title: `${s.opp.name} left the game`, detail: 'You win by forfeit.', noRematch: true });
    });
    this.opts.onStart(s);
  },
  // result: 1 win, 0.5 draw, 0 loss (from this player's side)
  end(s, { result, title, detail = '', noRematch = false }) {
    if (!s) return;
    s.ended = true;
    const change = s.finish(result);
    const skillLine = change ? `<p class="hint">Skill ${change.before.toFixed(2)} → <b>${change.after.toFixed(2)}</b></p>` : '';
    const el = this.show(`<h2>${title}</h2>${detail ? `<p>${detail}</p>` : ''}${skillLine}
      ${noRematch || s.left ? '' : '<button class="btn big" id="lbAgain">Play again</button>'}
      ${s.mode === 'online' ? '<button class="btn big alt" id="lbNew">🌐 New opponent</button>' : ''}
      <button class="btn alt" id="lbMenu">Menu</button>`);
    const again = el.querySelector('#lbAgain');
    if (again) again.onclick = () => this.rematch(s);
    const nw = el.querySelector('#lbNew');
    if (nw) nw.onclick = () => { s.close(); this.session = null; this.search(); };
    el.querySelector('#lbMenu').onclick = () => this.open();
  },
  rematch(s) {
    const go = () => { s.ended = false; this.hide(); this.opts.onStart(s); };
    if (!s.human) return go();
    const el = this.show(`<h2>Rematch?</h2><div class="spinner"></div><p>Waiting for ${s.opp.name}…</p><button class="btn alt" id="lbMenu">Menu</button>`);
    el.querySelector('#lbMenu').onclick = () => this.open();
    const gone = setInterval(() => {
      if (this.session !== s || !s.wantAgain) return clearInterval(gone);
      if (s.left) { clearInterval(gone); this.end(s, { result: 0.5, title: `${s.opp.name} left`, detail: 'Find someone new to play?', noRematch: true }); }
    }, 500);
    s.wantAgain = true;
    s.send('__again');
    const check = () => { if (s.wantAgain && s.oppAgain) { s.wantAgain = s.oppAgain = false; go(); } };
    s.on('__again', () => { s.oppAgain = true; check(); });
    check();
  }
};
