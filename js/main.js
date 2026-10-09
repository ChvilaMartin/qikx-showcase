import { pictogram, fullLogo } from "./logos.js";
import { BuildScene } from "./iso.js";
import { EN } from "./i18n.js";

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = gsap.utils.clamp;

/* ---------- logos ---------- */
$$("[data-logo]").forEach((el) => (el.innerHTML = fullLogo(el.dataset.logo)));
$$("[data-pg]").forEach((el) => (el.innerHTML = pictogram(el.dataset.pg)));

/* ---------- text splitting ---------- */
function splitChars(el) {
  const text = el.textContent;
  el.innerHTML = "";
  const out = [];
  // chars live inside a nowrap word wrapper so lines only break between words
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
    const word = document.createElement("span");
    word.style.cssText = "display:inline-block;white-space:nowrap";
    [...part].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "c"; s.textContent = ch;
      word.appendChild(s); out.push(s);
    });
    el.appendChild(word);
  });
  return out;
}
function splitWords(el, cls = "w") {
  const out = [];
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(" "));
        const w = document.createElement("span");
        if (cls === "w") { w.className = "w"; const i = document.createElement("span"); i.className = "wi"; i.textContent = part; w.appendChild(i); out.push(i); }
        else { w.className = cls; w.textContent = part; out.push(w); }
        frag.appendChild(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(el);
  return out;
}

/* ---------- i18n ---------- */
const i18nEls = $$("[data-i18n]");
i18nEls.forEach((el) => (el.dataset.cs = el.innerHTML));
let lang = "cs";
const splits = () => {
  $$(".ht").forEach((el) => (el._c = splitChars(el)));
  $$(".mega-l").forEach((el) => (el._c = splitChars(el)));
  $$(".h2 .split").forEach((el) => (el._c = splitWords(el)));
  $$(".intro-text").forEach((el) => (el._c = splitWords(el, "iw")));
  buildWave();
};
function setLang(l) {
  if (l === lang) return;
  lang = l;
  document.documentElement.lang = l;
  i18nEls.forEach((el) => (el.innerHTML = l === "en" ? EN[el.dataset.i18n] ?? el.dataset.cs : el.dataset.cs));
  splits();
  $$(".ht, .mega-l").forEach((el) => gsap.fromTo(el._c, { yPercent: 100 }, { yPercent: 0, stagger: 0.02, duration: 0.8, ease: "expo.out" }));
  gsap.set($(".intro-text")._c, { opacity: 1 });
  $$(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === l));
  document.title = l === "en" ? "QIK Group — From sketch to keys" : "Skupina QIK — Od studie po klíč";
  showChapter(chapter, true);
  ScrollTrigger.refresh();
}
$$(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

/* ---------- wave marquee (variable width wave) ---------- */
let waveWords = [];
function buildWave() {
  const track = $(".wave-track");
  const src = track.textContent.trim();
  track.innerHTML = "";
  waveWords = [];
  for (let k = 0; k < 2; k++) {
    src.split(" · ").forEach((txt) => {
      txt = txt.replace(/·$/, "").trim();
      if (!txt) return;
      const w = document.createElement("span"); w.className = "wd"; w.textContent = txt;
      const d = document.createElement("span"); d.className = "wd dot"; d.textContent = "·";
      track.append(w, d); waveWords.push(w, d);
    });
  }
}
splits();

let waveX = 0;
gsap.ticker.add((t, dms) => {
  const track = $(".wave-track");
  const half = track.scrollWidth / 2;
  if (!half) return;
  const v = lenis ? lenis.velocity : 0;
  waveX -= (reduced ? 0 : 0.9 + Math.abs(v) * 0.6) * (dms / 16.7);
  if (-waveX > half) waveX += half;
  track.style.transform = `translate3d(${waveX}px,0,0)`;
  const W = innerWidth;
  // read every position first, then write — one layout per frame instead of one per word
  const centres = waveWords.map((w) => w.offsetLeft + waveX + w.offsetWidth / 2);
  waveWords.forEach((w, i) => {
    const r = centres[i];
    if (r < -300 || r > W + 300) return;
    const s = 0.5 + 0.5 * Math.sin((r / W) * Math.PI * 2 - t * 1.2);
    w.style.setProperty("--w", (62 + s * 63).toFixed(1));
  });
});

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target) => (lenis ? lenis.scrollTo(target, { duration: 1.8 }) : window.scrollTo({ top: typeof target === "number" ? target : target.offsetTop, behavior: "smooth" }));
$$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const t = $(a.getAttribute("href"));
  if (!t) return;
  e.preventDefault();
  if (t.classList.contains("co")) openCompany(t);
  scrollTo(t.classList.contains("co") ? t.offsetTop + $("#companies").offsetTop - 90 : t);
}));

/* ---------- cursor ---------- */
if (fine) {
  const cur = $(".cursor");
  const qx = gsap.quickTo(cur, "x", { duration: 0.18 }), qy = gsap.quickTo(cur, "y", { duration: 0.18 });
  addEventListener("pointermove", (e) => { qx(e.clientX); qy(e.clientY); });
  document.addEventListener("pointerover", (e) => cur.classList.toggle("big", !!e.target.closest("a, button")));
}

/* ---------- variable-width proximity on display type ---------- */
function proximity(zone, getChars, min = 62, max = 125, radius = 260) {
  if (!fine || reduced) return;
  let mx = -9999, active = false;
  zone.addEventListener("pointermove", (e) => { mx = e.clientX; active = true; });
  zone.addEventListener("pointerleave", () => { active = false; getChars().forEach((c) => gsap.to(c, { "--w": max, duration: 0.8, ease: "power3.out" })); });
  gsap.ticker.add(() => {
    if (!active) return;
    getChars().forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mx);
      const k = clamp(0, 1, d / radius);
      const target = min + (max - min) * (k * k * (3 - 2 * k));
      const cur = parseFloat(c.style.getPropertyValue("--w")) || max;
      c.style.setProperty("--w", (cur + (target - cur) * 0.2).toFixed(1));
    });
  });
}
proximity($(".hero"), () => $$(".ht .c"));
proximity($(".contact"), () => $$(".mega-l .c"), 62, 100, 220);

/* ---------- nav ---------- */
const nav = $(".nav");
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate(self) {
    const y = self.scroll();
    nav.classList.toggle("solid", y > 30);
    nav.classList.toggle("hide", y > 500 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("hide");
    lastY = y;
  },
});
// created after the pinned sections (see bottom) so start/end include pin spacing
const navDarkTriggers = () => $$(".dark, .careers").forEach((el) => ScrollTrigger.create({
  trigger: el, start: "top 40px", end: "bottom 40px",
  onToggle: (s) => nav.classList.toggle("on-dark", s.isActive),
}));

/* ---------- build story ---------- */
const scene = new BuildScene($(".iso"));
const chapters = $$(".ch"), railBtns = $$(".build-rail button");
let chapter = -1, pTarget = 0, pNow = 0, buildVisible = false;

function showChapter(i, force = false) {
  if (i === chapter && !force) return;
  const prev = chapters[chapter];
  chapter = i;
  const next = chapters[i];
  if (prev && prev !== next) { prev.classList.remove("on"); gsap.to(prev, { opacity: 0, y: -30, duration: 0.45, ease: "power2.in", overwrite: true }); }
  next.classList.add("on");
  gsap.fromTo(next, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, delay: prev && prev !== next ? 0.2 : 0, ease: "expo.out", overwrite: true });
  gsap.fromTo($("h3", next), { "--w": 62 }, { "--w": 85, duration: 1.2, ease: "expo.out", delay: 0.2 });
  gsap.fromTo($$("li", next), { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.06, duration: 0.6, delay: 0.35, ease: "power3.out" });
  railBtns.forEach((b, k) => { b.classList.toggle("on", k === i); b.classList.toggle("done", k < i); });
  $(".hud-ph").textContent = String(i + 1).padStart(2, "0");
}

const buildST = ScrollTrigger.create({
  trigger: ".build", pin: ".build-pin", start: "top top", end: "+=520%", scrub: true,
  onUpdate(self) { pTarget = Math.min(5, self.progress * 5.25); },
});
ScrollTrigger.create({ trigger: ".build", start: "top bottom", end: "bottom top", onToggle: (s) => (buildVisible = s.isActive) });
railBtns.forEach((b, i) => b.addEventListener("click", () => {
  const y = buildST.start + ((i + 0.75) / 5.25) * (buildST.end - buildST.start);
  scrollTo(y);
}));
showChapter(0);
gsap.ticker.add((time) => {
  if (!buildVisible) return;
  pNow += (pTarget - pNow) * (reduced ? 1 : 0.12);
  scene.setProgress(pNow);
  scene.frame(time);
  showChapter(Math.min(4, Math.floor(pNow + 0.02)));
  $(".rail-line i").style.transform = `scaleX(${pNow / 5})`;
  $(".hud-pct").textContent = Math.round((pNow / 5) * 100);
});

/* ---------- companies accordion ---------- */
function openCompany(co) {
  $$(".co").forEach((c) => c !== co && c.classList.remove("open"));
  co.classList.add("open");
  setTimeout(() => ScrollTrigger.refresh(), 650);
}
$$(".co-row").forEach((row) => row.addEventListener("click", () => {
  const co = row.closest(".co");
  if (co.classList.contains("open")) { co.classList.remove("open"); setTimeout(() => ScrollTrigger.refresh(), 650); }
  else openCompany(co);
}));

/* ---------- crane lattice ---------- */
(() => {
  let d = "";
  for (let y = 690; y > 80; y -= 40) d += `M110,${y} L150,${y - 40} M150,${y} L110,${y - 40} `;
  $(".cr-lat").setAttribute("d", d);
  let j = "";
  for (let x = 40; x < 580; x += 30) j += `M${x},70 L${x + 15},100 L${x + 30},70 `;
  $(".cr-jlat").setAttribute("d", j);
})();

/* ---------- scroll animations ---------- */
function scrollAnims() {
  // section labels + headings
  $$(".h2 .split").forEach((el) => gsap.from(el._c, { yPercent: 110, duration: 1.1, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } }));
  $$(".label").forEach((el) => gsap.from(el, { opacity: 0, y: 20, duration: 0.8, scrollTrigger: { trigger: el, start: "top 90%", once: true } }));

  // intro words + width breathe
  const it = $(".intro-text");
  gsap.to(it._c, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: it, start: "top 80%", end: "bottom 50%", scrub: true } });
  gsap.fromTo(it, { "--w": 72 }, { "--w": 100, ease: "none", scrollTrigger: { trigger: it, start: "top 90%", end: "bottom 40%", scrub: true } });

  // stats
  $$(".stat b").forEach((b) => {
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: b, start: "top 90%", once: true, onEnter: () => gsap.to(o, { v: +b.dataset.to, duration: 1.8, ease: "power3.out", onUpdate: () => (b.textContent = Math.round(o.v) + (b.dataset.suf || "")) }) });
  });
  gsap.from(".stat", { y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".stats", start: "top 90%", once: true } });

  // companies rows
  gsap.from(".co", { y: 50, opacity: 0, stagger: 0.08, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".co-list", start: "top 85%", once: true } });

  // metal: crane lift
  const mm = gsap.matchMedia();
  const tonN = $(".ton-n"), steps = $$(".steps li");
  const load = $(".cr-load"), rope = $(".cr-rope"), trolley = $(".cr-trolley");
  const crane = (p) => {
    const dy = -p * 400, dx = -p * 110;
    const sway = Math.sin(p * Math.PI * 3) * 2.5 * (1 - p);
    load.setAttribute("transform", `translate(${dx},${dy}) rotate(${sway} 430 560)`);
    trolley.setAttribute("transform", `translate(${430 + dx},0)`);
    rope.setAttribute("x1", 430 + dx); rope.setAttribute("x2", 430 + dx); rope.setAttribute("y2", 560 + dy);
    tonN.textContent = Math.round(p * 7000).toLocaleString("cs-CZ");
    tonN.style.setProperty("--w", (62 + p * 63).toFixed(1));
    steps.forEach((s, i) => s.classList.toggle("on", p > (i + 0.5) / 5.5));
  };
  crane(0);
  mm.add("(min-width: 901px)", () => {
    ScrollTrigger.create({ trigger: ".metal", pin: ".metal-pin", start: "top top", end: "+=160%", scrub: 0.6, onUpdate: (s) => crane(s.progress) });
  });
  mm.add("(max-width: 900px)", () => {
    ScrollTrigger.create({ trigger: ".metal", start: "top 70%", end: "bottom 60%", scrub: 0.6, onUpdate: (s) => crane(s.progress) });
  });

  // contact mega
  $$(".mega-l").forEach((l, i) => gsap.fromTo(l._c, { yPercent: 105, "--w": 62 }, {
    yPercent: 0, "--w": 100, duration: 1.3, stagger: 0.03, ease: "expo.out", delay: i * 0.1,
    scrollTrigger: { trigger: ".mega", start: "top 85%", once: true },
  }));
  gsap.from(".foot-logos > span", { y: 30, opacity: 0, stagger: 0.07, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".footer", start: "top 90%", once: true } });
}
scrollAnims();
navDarkTriggers();

/* ---------- preloader → hero ---------- */
function intro() {
  document.body.classList.remove("is-loading");
  lenis?.start();
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  $$(".ht").forEach((el, i) => tl.fromTo(el._c, { yPercent: 105, "--w": 62 }, { yPercent: 0, "--w": 125, duration: 1.5, stagger: 0.035 }, i * 0.15));
  tl.from(".tower", { yPercent: 100, duration: 1.4, stagger: 0.08, ease: "expo.out" }, 0.25)
    .from(".nav", { opacity: 0, duration: 1 }, 0.3)
    .from(".hero-top", { y: -20, opacity: 0, duration: 1 }, 0.3)
    .from(".hero-lede, .hero-cta", { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, 0.6);
}
function preloader() {
  const pre = $(".pre");
  if (reduced) { pre.remove(); intro(); return; }
  const n = $(".pre-n"), o = { v: 0 };
  gsap.timeline()
    .from(".pre-strip", { yPercent: 30, opacity: 0, duration: 0.8, ease: "expo.out" })
    .to(".pre-box", { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "expo.inOut" }, 0.3)
    .from(".pre-qik", { "--w": 62, letterSpacing: "0.3em", opacity: 0, duration: 1, ease: "expo.out" }, 0.7)
    .to(o, { v: 99, duration: 1.7, ease: "power1.inOut", onUpdate: () => (n.textContent = String(Math.round(o.v)).padStart(2, "0")) }, 0)
    .to(".pre-stage", { scale: 0.9, opacity: 0, duration: 0.5, ease: "power3.in" }, 1.9)
    .to(pre, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 2.2)
    .call(intro, null, 2.45)
    .call(() => pre.remove());
}
document.fonts.ready.then(() => { ScrollTrigger.refresh(); preloader(); });
