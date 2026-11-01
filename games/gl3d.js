// Tiny WebGL helper for the arcade's 3D games: lit, vertex-coloured triangle meshes,
// a perspective camera and distance fog. No dependencies.

const M4 = {
  identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  perspective(fovDeg, aspect, near, far) {
    const f = 1 / Math.tan(fovDeg * Math.PI / 360), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  },
  lookAt(e, t, up = [0, 1, 0]) {
    let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  translate: (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]),
  scale: (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]),
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  // chain: M4.chain(A, B, C) = A * B * C
  chain(...ms) { return ms.reduce((a, b) => M4.mul(a, b)); }
};

// Collects triangles, then uploads them as one mesh.
class MeshBuilder {
  constructor() { this.p = []; this.n = []; this.c = []; }
  tri(a, b, c, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const v of [a, b, c]) { this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); }
    return this;
  }
  quad(a, b, c, d, col) { return this.tri(a, b, c, col).tri(a, c, d, col); }
  // axis-aligned box from (x,y,z) with size (w,h,d); col is [r,g,b] 0..1 or one colour per face
  // faces order: +x, -x, +y, -y, +z, -z. skip: optional set of face indexes to leave out.
  box(x, y, z, w, h, d, col, skip) {
    const X = x + w, Y = y + h, Z = z + d;
    const f = i => (Array.isArray(col[0]) ? col[i] : col);
    const faces = [
      [[X, y, Z], [X, y, z], [X, Y, z], [X, Y, Z]],
      [[x, y, z], [x, y, Z], [x, Y, Z], [x, Y, z]],
      [[x, Y, Z], [X, Y, Z], [X, Y, z], [x, Y, z]],
      [[x, y, z], [X, y, z], [X, y, Z], [x, y, Z]],
      [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]],
      [[X, y, z], [x, y, z], [x, Y, z], [X, Y, z]]
    ];
    faces.forEach((q, i) => { if (!skip || !skip.has(i)) this.quad(q[0], q[1], q[2], q[3], f(i)); });
    return this;
  }
  // centred box helper
  cube(cx, cy, cz, w, h, d, col) { return this.box(cx - w / 2, cy - h / 2, cz - d / 2, w, h, d, col); }
  // cylinder along Y (sides + caps), radius r, from y0 to y1
  cylinder(cx, cz, r, y0, y1, col, seg = 16, capCol) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      this.quad([p0[0], y0, p0[1]], [p0[0], y1, p0[1]], [p1[0], y1, p1[1]], [p1[0], y0, p1[1]], col);
      this.tri([cx, y1, cz], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], capCol || col);
      this.tri([cx, y0, cz], [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], capCol || col);
    }
    return this;
  }
  // UV sphere
  sphere(cx, cy, cz, r, col, seg = 12) {
    const pt = (i, j) => { const th = i / seg * Math.PI, ph = j / seg * Math.PI * 2; return [cx + r * Math.sin(th) * Math.cos(ph), cy + r * Math.cos(th), cz + r * Math.sin(th) * Math.sin(ph)]; };
    for (let i = 0; i < seg; i++) for (let j = 0; j < seg; j++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      if (i > 0) this.tri(a, c, b, col);
      if (i < seg - 1) this.tri(a, d, c, col);
    }
    return this;
  }
}

const GL3D = {
  supported() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } },
  builder: () => new MeshBuilder(),
  create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const vs = `attribute vec3 aP; attribute vec3 aN; attribute vec3 aC;
      uniform mat4 uProj, uView, uModel; varying vec3 vC; varying vec3 vN; varying float vD;
      void main() { vec4 w = uModel * vec4(aP, 1.0); vec4 v = uView * w; gl_Position = uProj * v;
        vC = aC; vN = normalize((uModel * vec4(aN, 0.0)).xyz); vD = -v.z; }`;
    const fs = `precision mediump float; varying vec3 vC; varying vec3 vN; varying float vD;
      uniform vec3 uLight, uFog, uTint; uniform float uNear, uFar, uAmb;
      void main() { float d = max(dot(normalize(vN), -uLight), 0.0);
        vec3 c = vC * uTint * (uAmb + (1.0 - uAmb) * d);
        float f = smoothstep(uNear, uFar, vD); gl_FragColor = vec4(mix(c, uFog, f), 1.0); }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const A = n => gl.getAttribLocation(prog, n), U = n => gl.getUniformLocation(prog, n);
    const loc = { p: A('aP'), n: A('aN'), c: A('aC'), proj: U('uProj'), view: U('uView'), model: U('uModel'), light: U('uLight'), fog: U('uFog'), tint: U('uTint'), near: U('uNear'), far: U('uFar'), amb: U('uAmb') };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    const I = M4.identity();
    const r = {
      gl, canvas,
      fog: opts.fog || [0.53, 0.75, 0.95],
      fogNear: opts.fogNear ?? 40,
      fogFar: opts.fogFar ?? 90,
      light: opts.light || [-0.4, -1, -0.55],
      ambient: opts.ambient ?? 0.45,
      fov: opts.fov || 60,
      proj: I, view: I,
      resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        this.proj = M4.perspective(this.fov, w / h, 0.1, 400);
      },
      camera(eye, target, up) { this.view = M4.lookAt(eye, target, up); this.eye = eye; },
      mesh(b) {
        const m = { count: 0, bufs: [gl.createBuffer(), gl.createBuffer(), gl.createBuffer()] };
        this.update(m, b);
        return m;
      },
      update(m, b) {
        [b.p, b.n, b.c].forEach((arr, i) => { gl.bindBuffer(gl.ARRAY_BUFFER, m.bufs[i]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); });
        m.count = b.p.length / 3;
      },
      free(m) { m.bufs.forEach(x => gl.deleteBuffer(x)); },
      begin() {
        const l = this.light, ll = Math.hypot(...l);
        gl.clearColor(this.fog[0], this.fog[1], this.fog[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(loc.proj, false, this.proj);
        gl.uniformMatrix4fv(loc.view, false, this.view);
        gl.uniform3f(loc.light, l[0] / ll, l[1] / ll, l[2] / ll);
        gl.uniform3fv(loc.fog, this.fog);
        gl.uniform1f(loc.near, this.fogNear);
        gl.uniform1f(loc.far, this.fogFar);
        gl.uniform1f(loc.amb, this.ambient);
      },
      draw(m, model, tint) {
        if (!m.count) return;
        gl.uniformMatrix4fv(loc.model, false, model || I);
        gl.uniform3fv(loc.tint, tint || [1, 1, 1]);
        [loc.p, loc.n, loc.c].forEach((a, i) => { gl.bindBuffer(gl.ARRAY_BUFFER, m.bufs[i]); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0); });
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      }
    };
    r.resize();
    return r;
  },
  // hex colour '#rrggbb' to [r,g,b] in 0..1
  rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; },
  shade(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
};
