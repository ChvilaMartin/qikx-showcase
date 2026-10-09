// Vector re-drawings of the QIK group logos (pictogram strip + boxed wordmark).
// Strip space: 386 × 880. Full logo space: 1420 × 880.
// Each pictogram carries its own looping CSS animation (see .pg-* in style.css).

const TAU = Math.PI * 2;

function gearPath(cx, cy, r, teeth) {
  const ro = r, ri = r * 0.8, hole = r * 0.38;
  const step = TAU / teeth;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [a - step * 0.5, ri], [a - step * 0.22, ri], [a - step * 0.16, ro],
      [a + step * 0.16, ro], [a + step * 0.22, ri],
    ];
    pts.forEach(([ang, rad], k) => {
      const x = (cx + Math.cos(ang) * rad).toFixed(1), y = (cy + Math.sin(ang) * rad).toFixed(1);
      d += (i === 0 && k === 0 ? "M" : "L") + x + "," + y;
    });
  }
  d += "Z";
  // hole as a second sub-path (evenodd)
  d += `M${cx + hole},${cy}A${hole},${hole} 0 1 0 ${cx - hole},${cy}A${hole},${hole} 0 1 0 ${cx + hole},${cy}Z`;
  return d;
}

let uid = 0;

const STRIPS = {
  as() {
    const id = "gclip" + uid++;
    const gears = [
      [125, 125, 112, 12], [42, 290, 40, 8], [185, 322, 84, 10], [262, 160, 60, 9], [70, 430, 62, 9],
      [175, 470, 44, 8], [300, 420, 70, 10], [62, 610, 96, 11], [255, 612, 72, 10], [190, 805, 92, 11], [30, 820, 50, 8], [350, 790, 60, 9],
    ];
    return `<defs><clipPath id="${id}"><rect x="0" y="0" width="386" height="880"/></clipPath></defs>
      <g clip-path="url(#${id})">${gears.map(([x, y, r, t], i) =>
        `<path class="pg-gear" fill-rule="evenodd" d="${gearPath(x, y, r, t)}" style="transform-origin:${x}px ${y}px;animation-duration:${(t * 0.9).toFixed(1)}s;animation-direction:${i % 2 ? "reverse" : "normal"}"/>`).join("")}</g>`;
  },
  services() {
    return [10, 310, 610].map((y, i) => `
      <g class="pg-check" style="--i:${i}">
        <rect x="40" y="${y}" width="262" height="262"/>
        <path class="ck-o" d="M28,${y + 140} L158,${y + 238} L345,${y + 52}"/>
        <path class="ck-i" pathLength="1" d="M28,${y + 140} L158,${y + 238} L345,${y + 52}"/>
      </g>`).join("");
  },
  realizace() {
    const rows = [];
    let k = 0;
    for (let r = 0; r < 8; r++) {
      const y = 10 + r * 112;
      const xs = r % 2 ? [[12, 76], [114, 282], [320, 386]] : [[12, 180], [218, 386]];
      xs.forEach(([a, b]) => rows.push(`<rect class="pg-brick" style="--i:${k++};--r:${7 - r}" x="${a}" y="${y}" width="${b - a}" height="80"/>`));
    }
    return rows.join("");
  },
  home() {
    return `
      <path class="pg-roof" d="M12,196 L12,10 L199,10 Z"/><path class="pg-roof" d="M386,196 L386,10 L199,10 Z"/>
      <path class="pg-col" style="--i:0" d="M49,212 L199,63 L248,112 L121,239 L121,872 L49,872 Z"/>
      <path class="pg-col" style="--i:1" d="M159,255 L274,139 L324,188 L231,281 L231,872 L159,872 Z"/>
      <path class="pg-col" style="--i:2" d="M269,297 L349,216 L349,872 L269,872 Z"/>`;
  },
  metal() {
    const tris = ["59,77 308,231 59,415", "96,57 340,57 340,205", "87,441 340,254 340,628", "59,467 308,652 59,805", "96,826 340,677 340,826"];
    return `<rect class="pg-frame" x="19" y="17" width="360" height="848"/>
      ${tris.map((p, i) => `<polygon class="pg-tri" style="--i:${i}" pathLength="1" points="${p}"/>`).join("")}`;
  },
  solutions() {
    // not part of the original system: a "data" strip in the same visual language
    let s = `<path class="pg-sroof" d="M12,180 L199,30 L386,180"/>`;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
      const x = 22 + c * 92, y = 232 + r * 80;
      s += `<rect class="pg-px" style="--d:${((r * 7 + c * 13) % 17) * 0.23}s" x="${x}" y="${y}" width="66" height="56"/>`;
    }
    return s;
  },
};

export function pictogram(kind) {
  return `<svg class="pg pg-${kind}" viewBox="0 0 386 880" aria-hidden="true">${STRIPS[kind]()}</svg>`;
}

const SUBS = { services: "services", realizace: "realizace", home: "home", metal: "metal" };

export function fullLogo(kind) {
  if (kind === "solutions") return solutionsLogo();
  const strip = STRIPS[kind]();
  const sub = kind === "as"
    ? `<text class="lg-sub" x="1350" y="660" text-anchor="end" font-size="118">akciová</text><text class="lg-sub" x="1350" y="775" text-anchor="end" font-size="118">společnost</text>`
    : `<text class="lg-sub" x="508" y="757" font-size="150" textLength="832" lengthAdjust="spacing">${SUBS[kind]}</text>`;
  return `<svg class="lg lg-${kind}" viewBox="0 0 1420 880" role="img" aria-label="QIK ${SUBS[kind] || "a.s."}">
    <g class="pg pg-${kind}">${strip}</g>
    <rect class="lg-box" x="443" y="28" width="966" height="826"/>
    <text class="lg-qik" x="926" y="${kind === "as" ? 470 : 500}" text-anchor="middle" font-size="${kind === "as" ? 430 : 470}">QIK</text>
    ${sub}
  </svg>`;
}

function solutionsLogo() {
  // QIK Solutions keeps its own mark (q + pencil, i + ruler, k + folding rule, roof)
  return `<svg class="lg lg-solutions" viewBox="120 80 400 280" role="img" aria-label="QIK Solutions">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="12">
      <circle cx="235" cy="262" r="48"/>
      <path stroke-width="6" d="M235,272 L295,332 L310.6,337.6 L305,322 L245,262 Z"/>
      <line x1="340" y1="214" x2="340" y2="310"/><line x1="395" y1="154" x2="395" y2="310"/>
      <line x1="450" y1="214" x2="395" y2="268"/><line x1="414" y1="250" x2="458" y2="310"/>
      <path d="M150,212 L320,108 L490,212"/><path d="M434,177 L434,140 L458,140 L458,192"/>
    </g><circle cx="340" cy="194" r="8" fill="currentColor"/>
  </svg>`;
}
