// Isometric "build" scene. One scroll value p ∈ [0, 5] drives five phases:
// 0 Services (plot + survey) · 1 Solutions (digital model) · 2 Metal (steel frame)
// 3 Realizace (concrete, walls, roof) · 4 Home (lights, trees, life)

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

const FH = 1.1;            // floor height
const FLOORS = 3;
const W = 6, D = 4;        // footprint
const COLS_X = [0, 2, 4, 6], COLS_Z = [0, 2, 4];

const C = {
  ink: "18,18,18",
  accent: "255,79,0",
  plot: ["#e2ded6", "#d3cec4", "#c4beb3"],
  concrete: ["#e7e3db", "#cdc8be", "#b7b1a6"],
  steel: ["#585858", "#363636", "#232323"],
  wall: ["#f7f5f1", "#ebe7e0", "#d9d4ca"],
  glass: "#2b2f34",
  glow: "255,184,92",
  tree: ["#9aa58c", "#7f8b71"],
};

export class BuildScene {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.P = [0, 0, 0, 0, 0];
    this.p = 0;
    this.items = [];
    this.build();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  setProgress(p) {
    this.p = p;
    for (let k = 0; k < 5; k++) this.P[k] = clamp(p - k);
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = this.c.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fit the plot (-2..8, -2..6) plus building height
    const s1 = (this.w * 0.94) / (18 * 0.866);
    const s2 = (this.h * 0.92) / (18 * 0.5 + 5.2);
    this.s = Math.min(s1, s2);
    // centre on (3, 1.8, 2)
    this.ox = this.w / 2 - (3 - 2) * this.s * 0.866;
    this.oy = this.h / 2 - (3 + 2) * this.s * 0.5 + 1.8 * this.s + this.s * 0.6;
  }

  iso(x, y, z) {
    return [this.ox + (x - z) * this.s * 0.866, this.oy + (x + z) * this.s * 0.5 - y * this.s];
  }

  /* ---------- drawing primitives ---------- */
  poly(pts, fill, stroke, lw = 1) {
    const { ctx } = this;
    ctx.beginPath();
    pts.forEach((p, i) => { const [X, Y] = this.iso(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  box(b, col, alpha = 1, edge = 0.28) {
    if (alpha <= 0.001) return;
    const [x0, y0, z0, x1, y1, z1] = b;
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    const st = `rgba(${C.ink},${edge})`;
    this.poly([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], col[2], st, 0.8); // right (+x)
    this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col[1], st, 0.8); // left (+z)
    this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col[0], st, 0.8); // top
    ctx.globalAlpha = 1;
  }
  line(a, b, color, lw = 1, dash = null, frac = 1) {
    if (frac <= 0) return;
    const { ctx } = this;
    const A = this.iso(...a);
    const B3 = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
    const B = this.iso(...B3);
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }
  pathFrac(pts, frac, color, lw, dash) {
    // draw a polyline up to `frac` of its total length
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      segs.push([a, b, l]); total += l;
    }
    let left = total * frac;
    for (const [a, b, l] of segs) {
      if (left <= 0) break;
      this.line(a, b, color, lw, dash, Math.min(1, left / l));
      left -= l;
    }
  }
  text(str, x, y, z, color, size = 10, align = "center") {
    const [X, Y] = this.iso(x, y, z);
    const { ctx } = this;
    ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
    ctx.textAlign = align; ctx.fillStyle = color;
    ctx.fillText(str, X, Y);
  }

  /* ---------- model ---------- */
  add(floor, layer, key, fn) { this.items.push({ floor, layer, key, fn }); }

  build() {
    const S = this;
    const local = (P, start, dur) => clamp((P - start) / dur);

    // ===== phase 0: plot, grid, footprint, dimensions, stakes =====
    this.add(-1, 0, 0, (P) => {
      const t = ease(local(P[0], 0, 0.35));
      if (t <= 0) return;
      const k = t, cx = 3, cz = 2;
      const x0 = cx - 5 * k, x1 = cx + 5 * k, z0 = cz - 4 * k, z1 = cz + 4 * k;
      S.box([x0, -0.12, z0, x1, 0, z1], C.plot, 1, 0.18);
    });
    this.add(-1, 1, 0, (P) => {
      const t = local(P[0], 0.2, 0.45);
      if (t <= 0) return;
      const col = `rgba(${C.ink},0.09)`;
      for (let x = -2; x <= 8; x++) S.line([x, 0, -2], [x, 0, 6], col, 1, null, ease(clamp(t * 1.6 - (x + 2) * 0.05)));
      for (let z = -2; z <= 6; z++) S.line([-2, 0, z], [8, 0, z], col, 1, null, ease(clamp(t * 1.6 - (z + 2) * 0.05)));
    });
    this.add(-1, 2, 0, (P) => {
      const t = local(P[0], 0.45, 0.4);
      if (t <= 0) return;
      const fade = 1 - clamp(P[3] * 2) * 0.8;
      S.ctx.globalAlpha = fade;
      S.pathFrac([[0, 0, 0], [6, 0, 0], [6, 0, 4], [0, 0, 4], [0, 0, 0]], ease(t), `rgb(${C.accent})`, 1.6, [6, 5]);
      // structural grid axes
      const a = clamp(t * 2 - 1);
      COLS_X.forEach((x) => S.line([x, 0, -1.2], [x, 0, 5.2], `rgba(${C.accent},${0.35 * a})`, 1, [2, 4]));
      COLS_Z.forEach((z) => S.line([-1.2, 0, z], [7.2, 0, z], `rgba(${C.accent},${0.35 * a})`, 1, [2, 4]));
      S.ctx.globalAlpha = 1;
    });
    // dimensions in front
    this.add(5, 0, 0, (P) => {
      const t = local(P[0], 0.65, 0.35);
      if (t <= 0) return;
      const a = ease(t) * (1 - clamp(P[2] * 1.5));
      if (a <= 0) return;
      const col = `rgba(${C.ink},${0.7 * a})`;
      S.line([0, 0, 5.1], [6, 0, 5.1], col, 1, null, ease(t));
      S.line([0, 0, 4.9], [0, 0, 5.3], col); S.line([6, 0, 4.9], [6, 0, 5.3], col);
      S.line([7.1, 0, 0], [7.1, 0, 4], col, 1, null, ease(t));
      S.line([6.9, 0, 0], [7.3, 0, 0], col); S.line([6.9, 0, 4], [7.3, 0, 4], col);
      S.ctx.globalAlpha = a;
      S.text("24 000", 3, 0, 5.6, `rgb(${C.ink})`, 11);
      S.text("16 000", 7.7, 0, 2, `rgb(${C.ink})`, 11);
      S.ctx.globalAlpha = 1;
    });
    // survey stakes
    [[0, 0], [6, 0], [6, 4], [0, 4]].forEach(([x, z], i) => {
      this.add(-1, 3, x + z, (P) => {
        const t = local(P[0], 0.6 + i * 0.08, 0.25);
        if (t <= 0) return;
        const fade = 1 - clamp(P[3] * 3);
        const dy = (1 - easeBack(t)) * 1.2;
        S.box([x - 0.06, dy, z - 0.06, x + 0.06, 0.45 + dy, z + 0.06], ["#ff8a4d", "#ff6a1f", "#d94300"], clamp(t * 3) * fade, 0.3);
      });
    });

    // ===== phase 3 (drawn first per floor): foundation =====
    this.add(0, 0, 0, (P) => {
      const t = local(P[3], 0, 0.15);
      if (t <= 0) return;
      const dy = -(1 - ease(t)) * 0.4;
      S.box([-0.3, -0.32 + dy, -0.3, W + 0.3, 0 + dy, D + 0.3], C.concrete, clamp(t * 2), 0.3);
    });

    for (let f = 0; f < FLOORS; f++) {
      const yb = f * FH, yt = (f + 1) * FH;
      const base = f === 0 ? 0 : yb + 0.12;

      // slab (realizace) at base of floors 1+
      if (f > 0) {
        this.add(f, 0, 0, (P) => {
          const t = local(P[3], 0.12 + f * 0.24, 0.12);
          if (t <= 0) return;
          const dy = (1 - ease(t)) * 0.8;
          S.box([-0.12, yb + dy, -0.12, W + 0.12, yb + 0.12 + dy, D + 0.12], C.concrete, clamp(t * 2), 0.32);
        });
      }

      // steel columns (metal)
      COLS_X.forEach((x) => COLS_Z.forEach((z) => {
        const order = f * 0.33 + hash(x * 7 + z * 3 + f) * 0.12;
        this.add(f, 1, x + z, (P) => {
          const t = local(P[2], order, 0.16);
          if (t <= 0) return;
          const dy = (1 - ease(t)) * 2.4;
          S.box([x - 0.07, base + dy, z - 0.07, x + 0.07, yt + dy, z + 0.07], C.steel, clamp(t * 3), 0.4);
        });
      }));
      // steel beams
      COLS_Z.forEach((z) => {
        this.add(f, 1, 3 + z + 0.01, (P) => {
          const t = local(P[2], f * 0.33 + 0.14, 0.14);
          if (t <= 0) return;
          const dy = (1 - ease(t)) * 1.8;
          S.box([0, yt - 0.12 + dy, z - 0.06, W, yt + dy, z + 0.06], C.steel, clamp(t * 3), 0.4);
        });
      });
      COLS_X.forEach((x) => {
        this.add(f, 1, x + 2 + 0.02, (P) => {
          const t = local(P[2], f * 0.33 + 0.18, 0.14);
          if (t <= 0) return;
          const dy = (1 - ease(t)) * 1.8;
          S.box([x - 0.06, yt - 0.12 + dy, 0, x + 0.06, yt + dy, D], C.steel, clamp(t * 3), 0.4);
        });
      });

      // walls (realizace) — bays between columns, all four sides
      const bays = [];
      [[0, 2], [2, 4]].forEach(([z0, z1], i) => { bays.push({ side: "x1", z0, z1, i }); bays.push({ side: "x0", z0, z1, i }); });
      [[0, 2], [2, 4], [4, 6]].forEach(([x0, x1], i) => { bays.push({ side: "z1", x0, x1, i }); bays.push({ side: "z0", x0, x1, i }); });
      bays.forEach((bay, bi) => {
        const id = f * 20 + bi;
        let b, key;
        const th = 0.08;
        if (bay.side === "x1") { b = [W - 0.02, base, bay.z0 + 0.07, W + th, yt, bay.z1 - 0.07]; key = W + (bay.z0 + bay.z1) / 2; }
        if (bay.side === "x0") { b = [-th, base, bay.z0 + 0.07, 0.02, yt, bay.z1 - 0.07]; key = (bay.z0 + bay.z1) / 2 - 0.5; }
        if (bay.side === "z1") { b = [bay.x0 + 0.07, base, D - 0.02, bay.x1 - 0.07, yt, D + th]; key = D + (bay.x0 + bay.x1) / 2; }
        if (bay.side === "z0") { b = [bay.x0 + 0.07, base, -th, bay.x1 - 0.07, yt, 0.02]; key = (bay.x0 + bay.x1) / 2 - 0.5; }
        const front = bay.side === "x1" || bay.side === "z1";
        const entrance = f === 0 && bay.side === "z1" && bay.i === 1;
        this.add(f, 1, key - 0.05, (P, time) => {
          const t = local(P[3], 0.2 + f * 0.24 + hash(id) * 0.1, 0.12);
          if (t <= 0) return;
          const dy = (1 - ease(t)) * 0.6;
          const bb = [b[0], b[1] + dy, b[2], b[3], b[4] + dy, b[5]];
          S.box(bb, C.wall, clamp(t * 2.5), 0.25);
          if (!front) return;
          // window on the visible face
          const a = clamp(t * 2.5);
          const y0 = bb[1] + (entrance ? 0.02 : 0.28), y1 = bb[4] - 0.2;
          let quad;
          if (bay.side === "x1") { const x = bb[3] + 0.002, za = bb[2] + 0.22, zb = bb[5] - 0.22; quad = [[x, y0, za], [x, y0, zb], [x, y1, zb], [x, y1, za]]; }
          else { const z = bb[5] + 0.002, xa = bb[0] + (entrance ? 0.15 : 0.22), xb = bb[3] - (entrance ? 0.15 : 0.22); quad = [[xa, y0, z], [xb, y0, z], [xb, y1, z], [xa, y1, z]]; }
          S.ctx.globalAlpha = a;
          S.poly(quad, C.glass, `rgba(${C.ink},0.5)`, 0.8);
          // home: windows light up
          const g = clamp(P[4] * 1.8 - hash(id + 3) * 0.8);
          if (g > 0) {
            const flick = 0.82 + 0.18 * Math.sin(time * 1.7 + id);
            S.poly(quad, `rgba(${C.glow},${0.92 * g * flick})`);
            // mullion
            const m0 = quad[0], m1 = quad[1];
            const mid = [(m0[0] + m1[0]) / 2, y0, (m0[2] + m1[2]) / 2];
            S.line(mid, [mid[0], y1, mid[2]], `rgba(${C.ink},${0.35 * g})`, 1);
          }
          S.ctx.globalAlpha = 1;
        });
      });
    }

    // ===== roof =====
    this.add(3, 0, 0, (P) => {
      const t = local(P[3], 0.86, 0.12);
      if (t <= 0) return;
      const dy = (1 - ease(t)) * 0.8;
      S.box([-0.15, 3.3 + dy, -0.15, W + 0.15, 3.44 + dy, D + 0.15], C.concrete, clamp(t * 2), 0.32);
    });
    [[-0.15, -0.15, W + 0.15, 0], [-0.15, D, W + 0.15, D + 0.15], [-0.15, -0.15, 0, D + 0.15], [W, -0.15, W + 0.15, D + 0.15]].forEach(([x0, z0, x1, z1], i) => {
      this.add(3, 1, (x0 + x1) / 2 + (z0 + z1) / 2, (P) => {
        const t = local(P[3], 0.9 + i * 0.02, 0.08);
        if (t <= 0) return;
        S.box([x0, 3.44, z0, x1, 3.66, z1], C.concrete, clamp(t * 2), 0.3);
      });
    });
    // rooftop unit
    this.add(3, 1, 3, (P) => {
      const t = local(P[3], 0.94, 0.06);
      if (t <= 0) return;
      S.box([0.6, 3.44, 0.5, 1.8, 3.9, 1.4], C.steel, clamp(t * 2), 0.4);
    });

    // ===== phase 4: roof terrace, trees, path, smart pulses =====
    this.add(4, 1, 0, (P) => {
      const t = local(P[4], 0.25, 0.35);
      if (t <= 0) return;
      const a = ease(t);
      // planters
      [[3.2, 3.6], [4.4, 3.6], [5.4, 3.6]].forEach(([x, z], i) => {
        const k = ease(clamp(t * 2 - i * 0.3));
        S.box([x - 0.22, 3.44, z - 0.18, x + 0.22, 3.44 + 0.22 * k, z + 0.18], ["#c9b89b", "#b19f80", "#9a8a6c"], a, 0.3);
        if (k > 0.3) {
          const [X, Y] = S.iso(x, 3.44 + 0.22 * k + 0.12, z);
          S.ctx.globalAlpha = a; S.ctx.fillStyle = C.tree[0];
          S.ctx.beginPath(); S.ctx.arc(X, Y, S.s * 0.16 * k, 0, Math.PI * 2); S.ctx.fill(); S.ctx.globalAlpha = 1;
        }
      });
      // parasol
      const k = ease(clamp(t * 1.5 - 0.3));
      if (k > 0) {
        S.line([4.2, 3.44, 2], [4.2, 3.44 + 0.8 * k, 2], `rgba(${C.ink},${a})`, 1.5);
        const [X, Y] = S.iso(4.2, 3.44 + 0.8 * k, 2);
        S.ctx.globalAlpha = a; S.ctx.fillStyle = `rgb(${C.accent})`;
        S.ctx.beginPath(); S.ctx.ellipse(X, Y, S.s * 0.55 * k, S.s * 0.28 * k, 0, Math.PI, 0); S.ctx.fill(); S.ctx.globalAlpha = 1;
      }
    });

    const trees = [[-1.1, 5.0, 0.55], [7.3, 4.9, 0.5], [7.5, -0.9, 0.42], [-1.3, 1.2, 0.48], [1.3, 5.4, 0.34], [7.6, 2.4, 0.36]];
    trees.forEach(([x, z, r], i) => {
      const front = x > W || z > D;
      this.add(front ? 5 : -1, 4, x + z, (P) => {
        const t = local(P[4], i * 0.08, 0.4);
        if (t <= 0) return;
        const k = easeBack(t);
        const h = (0.6 + r) * k;
        S.line([x, 0, z], [x, h, z], `rgba(${C.ink},0.7)`, 1.5);
        const [X, Y] = S.iso(x, h + r * 0.6 * k, z);
        S.ctx.fillStyle = C.tree[i % 2];
        S.ctx.beginPath(); S.ctx.arc(X, Y, S.s * r * k, 0, Math.PI * 2); S.ctx.fill();
        S.ctx.strokeStyle = `rgba(${C.ink},0.25)`; S.ctx.lineWidth = 0.8; S.ctx.stroke();
      });
    });
    // entrance path
    this.add(-1, 2.5, 0, (P) => {
      const t = local(P[4], 0.1, 0.4);
      if (t <= 0) return;
      const z1 = 4.3 + 1.7 * ease(t);
      S.poly([[2.6, 0.005, 4.3], [3.4, 0.005, 4.3], [3.4, 0.005, z1], [2.6, 0.005, z1]], "#cfc6b6", `rgba(${C.ink},0.2)`);
    });

    // ===== overlay: digital model (Solutions) =====
    this.add(9, 0, 0, (P, time) => {
      const t = P[1];
      if (t <= 0) return;
      const fade = 1 - clamp(P[2] * 0.6 + P[3] * 0.4) * 0.85;
      const col = (a) => `rgba(${C.accent},${a * fade})`;
      for (let f = 0; f <= FLOORS; f++) {
        const k = ease(clamp(t * 1.6 - f * 0.18));
        if (k <= 0) continue;
        const y = f * FH;
        S.pathFrac([[0, y, 0], [W, y, 0], [W, y, D], [0, y, D], [0, y, 0]], k, col(0.9), 1.2);
        if (f < FLOORS) COLS_X.forEach((x) => COLS_Z.forEach((z) => S.line([x, y, z], [x, y + FH, z], col(0.35), 1, [3, 3], k)));
        // node dots
        COLS_X.forEach((x) => COLS_Z.forEach((z) => {
          const [X, Y] = S.iso(x, y, z);
          const pulse = 1 + 0.4 * Math.sin(time * 3 + x + z + f);
          S.ctx.fillStyle = col(0.9 * k);
          S.ctx.beginPath(); S.ctx.arc(X, Y, 2 * pulse, 0, Math.PI * 2); S.ctx.fill();
        }));
      }
      // scanning plane
      if (t > 0 && t < 1) {
        const y = t * FLOORS * FH * 1.05;
        S.poly([[-0.4, y, -0.4], [W + 0.4, y, -0.4], [W + 0.4, y, D + 0.4], [-0.4, y, D + 0.4]], `rgba(${C.accent},0.08)`, `rgba(${C.accent},0.6)`, 1);
      }
      // tags
      const tags = [["IfcColumn", 6, 1.6, 4], ["IfcBeam", 4, 2.2, 0], ["IfcSlab", 0, 3.3, 4], ["LOD 400", 6, 3.3, 0]];
      tags.forEach(([txt, x, y, z], i) => {
        const a = clamp(t * 3 - 1 - i * 0.3) * fade;
        if (a <= 0) return;
        const [X, Y] = S.iso(x, y, z);
        S.ctx.globalAlpha = a;
        S.ctx.strokeStyle = `rgb(${C.accent})`; S.ctx.lineWidth = 1;
        S.ctx.beginPath(); S.ctx.moveTo(X, Y); S.ctx.lineTo(X + 18, Y - 22); S.ctx.lineTo(X + 30, Y - 22); S.ctx.stroke();
        S.ctx.font = '500 10px "JetBrains Mono", monospace';
        const w = S.ctx.measureText(txt).width + 12;
        S.ctx.fillStyle = `rgb(${C.accent})`;
        S.ctx.fillRect(X + 30, Y - 31, w, 18);
        S.ctx.fillStyle = "#fff"; S.ctx.textAlign = "left";
        S.ctx.fillText(txt, X + 36, Y - 18);
        S.ctx.globalAlpha = 1;
      });
    });

    // smart-home pulses
    this.add(9, 1, 0, (P, time) => {
      const a = clamp(P[4] * 2 - 0.6);
      if (a <= 0) return;
      [[W + 0.1, 1.9, 1], [3, 2.9, D + 0.1], [1, 0.7, D + 0.1], [W + 0.1, 3.0, 3]].forEach(([x, y, z], i) => {
        const [X, Y] = S.iso(x, y, z);
        const ph = (time * 0.6 + i * 0.25) % 1;
        S.ctx.strokeStyle = `rgba(${C.accent},${(1 - ph) * a})`;
        S.ctx.lineWidth = 1.4;
        S.ctx.beginPath(); S.ctx.arc(X, Y, 4 + ph * S.s * 0.6, 0, Math.PI * 2); S.ctx.stroke();
        S.ctx.fillStyle = `rgba(${C.accent},${a})`;
        S.ctx.beginPath(); S.ctx.arc(X, Y, 3, 0, Math.PI * 2); S.ctx.fill();
      });
    });

    // tower crane (metal → realizace)
    this.add(5, 1, 10, (P, time) => {
      const a = clamp(P[2] * 4) * (1 - clamp(P[4] * 2.5));
      if (a <= 0) return;
      const bx = 8.0, bz = 0.4, H = 5.3;
      const grow = ease(clamp(P[2] * 2.5));
      const top = H * grow;
      const col = `rgba(${C.ink},${a})`;
      S.ctx.globalAlpha = a;
      S.box([bx - 0.3, 0, bz - 0.3, bx + 0.3, 0.2, bz + 0.3], C.concrete, 1, 0.3);
      S.ctx.globalAlpha = 1;
      // lattice mast
      const m = 0.12;
      S.line([bx - m, 0.2, bz + m], [bx - m, top, bz + m], col, 1.4);
      S.line([bx + m, 0.2, bz - m], [bx + m, top, bz - m], col, 1.4);
      for (let y = 0.2; y < top - 0.2; y += 0.3) S.line([bx - m, y, bz + m], [bx + m, y + 0.3, bz - m], `rgba(${C.ink},${a * 0.6})`, 0.8);
      if (grow < 0.98) return;
      // rotating jib
      const ang = 2.72 + Math.sin(time * 0.22) * 0.35; // jib swings out over the building
      const dx = Math.cos(ang), dz = Math.sin(ang);
      const L = 6.2, cL = 1.6;
      const tipA = [bx + dx * L, top, bz + dz * L], tipB = [bx - dx * cL, top, bz - dz * cL];
      S.line(tipB, tipA, `rgb(255,170,0)`, 3);
      S.line([bx, top + 0.7, bz], tipA, `rgba(${C.ink},${a * 0.7})`, 0.8);
      S.line([bx, top + 0.7, bz], tipB, `rgba(${C.ink},${a * 0.7})`, 0.8);
      S.line([bx, top, bz], [bx, top + 0.7, bz], col, 1.5);
      S.ctx.globalAlpha = a;
      S.box([tipB[0] - 0.2, top - 0.3, tipB[2] - 0.2, tipB[0] + 0.2, top, tipB[2] + 0.2], C.concrete, 1, 0.4);
      S.ctx.globalAlpha = 1;
      // trolley + hook + load
      const tr = 2.8 + Math.sin(time * 0.4) * 1.4;
      const hx = bx + dx * tr, hz = bz + dz * tr;
      const hy = 3.9 + Math.sin(time * 0.6) * 0.35;
      S.line([hx, top, hz], [hx, hy, hz], col, 0.8);
      S.ctx.globalAlpha = a;
      const steel = P[3] < 0.2;
      S.box([hx - (steel ? 0.9 : 0.5), hy - 0.12, hz - 0.08, hx + (steel ? 0.9 : 0.5), hy, hz + 0.08], steel ? C.steel : C.wall, 1, 0.4);
      S.ctx.globalAlpha = 1;
    });

    this.items.sort((a, b) => a.floor - b.floor || a.layer - b.layer || a.key - b.key);
  }

  frame(time) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const it of this.items) it.fn(this.P, time);
  }
}
