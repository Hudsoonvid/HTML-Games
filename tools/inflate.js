// Raw DEFLATE decoder (RFC 1951). Used by all-in-one.html when the browser has no
// DecompressionStream. Small and dependency-free; based on the structure of zlib's puff.c.
function inflateRaw(data) {
  let pos = 0, bit = 0, out = new Uint8Array(data.length * 5 + 1024), len = 0;
  const need = n => { if (len + n > out.length) { const o = new Uint8Array(Math.max(out.length * 2, len + n)); o.set(out.subarray(0, len)); out = o; } };
  const getBit = () => { const b = (data[pos] >> bit) & 1; if (++bit === 8) { bit = 0; pos++; } return b; };
  const bits = n => { let v = 0; for (let i = 0; i < n; i++) v |= getBit() << i; return v; };
  const table = lengths => {
    const count = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(lengths.length);
    for (let i = 0; i < lengths.length; i++) count[lengths[i]]++;
    count[0] = 0;
    for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
    for (let i = 0; i < lengths.length; i++) if (lengths[i]) sym[offs[lengths[i]]++] = i;
    return { count, sym };
  };
  const decode = t => {
    let code = 0, first = 0, index = 0;
    for (let l = 1; l < 16; l++) {
      code |= getBit();
      const c = t.count[l];
      if (code - c < first) return t.sym[index + (code - first)];
      index += c; first += c; first <<= 1; code <<= 1;
    }
    throw new Error('inflate: bad code');
  };
  const LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  let fixedL, fixedD;
  for (let last = 0; !last;) {
    last = getBit();
    const type = bits(2);
    if (type === 0) {
      if (bit) { bit = 0; pos++; }
      const n = data[pos] | (data[pos + 1] << 8);
      pos += 4;
      need(n);
      out.set(data.subarray(pos, pos + n), len);
      len += n; pos += n;
      continue;
    }
    let lt, dt;
    if (type === 1) {
      if (!fixedL) {
        const l = new Uint8Array(288);
        l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288);
        fixedL = table(l);
        fixedD = table(new Uint8Array(30).fill(5));
      }
      lt = fixedL; dt = fixedD;
    } else if (type === 2) {
      const nl = bits(5) + 257, nd = bits(5) + 1, nc = bits(4) + 4;
      const order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      const cl = new Uint8Array(19);
      for (let i = 0; i < nc; i++) cl[order[i]] = bits(3);
      const ct = table(cl);
      const lens = new Uint8Array(nl + nd);
      for (let i = 0; i < nl + nd;) {
        const s = decode(ct);
        if (s < 16) lens[i++] = s;
        else {
          let rep, val = 0;
          if (s === 16) { val = lens[i - 1]; rep = 3 + bits(2); }
          else if (s === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          while (rep--) lens[i++] = val;
        }
      }
      lt = table(lens.subarray(0, nl));
      dt = table(lens.subarray(nl));
    } else throw new Error('inflate: bad block');
    for (;;) {
      const s = decode(lt);
      if (s < 256) { need(1); out[len++] = s; }
      else if (s === 256) break;
      else {
        const n = LB[s - 257] + bits(LE[s - 257]);
        const d = decode(dt);
        const dist = DB[d] + bits(DE[d]);
        need(n);
        for (let i = 0; i < n; i++, len++) out[len] = out[len - dist];
      }
    }
  }
  return out.subarray(0, len);
}
if (typeof module !== 'undefined') module.exports = inflateRaw;
