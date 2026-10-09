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
};
function setLang(l) {
  if (l === lang) return;
  lang = l;
  document.documentElement.lang = l;
  i18nEls.forEach((el) => (el.innerHTML = l === "en" ? EN[el.dataset.i18n] ?? el.dataset.cs : el.dataset.cs));
  splits();
  $$(".ht, .mega-l").forEach((el) => gsap.fromTo(el._c, { yPercent: 100 }, { yPercent: 0, stagger: 0.02, duration: 0.8, ease: "expo.out" }));
  $$(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === l));
  document.title = l === "en" ? "QIK Group — From sketch to keys" : "Skupina QIK — Od studie po klíč";
  showChapter(chapter, true);
  ScrollTrigger.refresh();
}
$$(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

splits();

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
// hero type is condensed at rest and widens under the cursor
proximity($(".hero-copy"), () => $$(".ht .c"), 100, 62, 160);
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

/* ---------- hero + build story (one pinned scene) ----------
   Pin progress q:   0 ──── REWIND ── START ─────────────── 1
   scene p:          5  →→→   0        0  →→→ chapters →→→ 5
   On load p follows a time-lapse (introP 0 → 5), so the hero shows the
   building assembling itself; scrolling then rewinds it and rebuilds it slowly. */
const scene = new BuildScene($(".iso"));
const chapters = $$(".ch"), railBtns = $$(".build-rail button");
const heroCopy = $(".hero-copy"), rail = $(".build-rail");
const REWIND = 0.1, START = 0.12;
const rw = $(".rw");
const introP = { v: 0 };
let chapter = -1, q = 0, pNow = 0, buildVisible = true;

function showChapter(i, force = false) {
  if (i === chapter && !force) return;
  const prev = chapters[chapter];
  chapter = i;
  const next = chapters[i];
  if (prev && prev !== next) { prev.classList.remove("on"); gsap.to(prev, { opacity: 0, y: -30, duration: 0.45, ease: "power2.in", overwrite: true }); }
  railBtns.forEach((b, k) => { b.classList.toggle("on", k === i); b.classList.toggle("done", i >= 0 && k < i); });
  if (!next) return;
  next.classList.add("on");
  gsap.fromTo(next, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, delay: prev && prev !== next ? 0.2 : 0, ease: "expo.out", overwrite: true });
  gsap.fromTo($("h3", next), { "--w": 62 }, { "--w": 85, duration: 1.2, ease: "expo.out", delay: 0.2 });
  gsap.fromTo($$("li", next), { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.06, duration: 0.6, delay: 0.35, ease: "power3.out" });
}

const buildST = ScrollTrigger.create({
  trigger: ".build", pin: ".build-pin", start: "top top", end: "+=620%", scrub: true,
  onUpdate(self) { q = self.progress; },
});
ScrollTrigger.create({ trigger: ".build", start: "top bottom", end: "bottom top", onToggle: (s) => (buildVisible = s.isActive) });
railBtns.forEach((b, i) => b.addEventListener("click", () => {
  const f = START + ((i + 0.75) / 5.25) * (1 - START);
  scrollTo(buildST.start + f * (buildST.end - buildST.start));
}));

gsap.ticker.add((time) => {
  if (!buildVisible) return;
  let target;
  if (q < REWIND) target = 5 * (1 - q / REWIND);
  else if (q < START) target = 0;
  else target = Math.min(5, ((q - START) / (1 - START)) * 5.25);
  if (q >= START && introP.v < 5) { gsap.killTweensOf(introP); introP.v = 5; }
  if (q < START) target = Math.min(introP.v, target);
  pNow += (target - pNow) * (reduced ? 1 : 0.12);
  scene.setProgress(pNow);
  scene.frame(time);

  // hero copy leaves as the rewind starts; the rail arrives as it ends
  const h = clamp(0, 1, 1 - q / (REWIND * 0.5));
  heroCopy.style.opacity = h;
  heroCopy.style.transform = `translateY(${(1 - h) * -40}px)`;
  heroCopy.style.visibility = h > 0.01 ? "visible" : "hidden";
  rail.style.opacity = clamp(0, 1, (q - REWIND * 0.5) / (START - REWIND * 0.5));
  // rewind caption: fades in after the hero leaves, out as chapter 01 arrives
  const r = Math.min(clamp(0, 1, (q - REWIND * 0.35) / (REWIND * 0.2)), clamp(0, 1, (REWIND * 0.95 - q) / (REWIND * 0.15)));
  rw.style.opacity = r;
  rw.style.visibility = r > 0.01 ? "visible" : "hidden";
  rw.style.transform = `translateY(${(1 - r) * 20}px)`;
  showChapter(q < REWIND * 0.95 ? -1 : q < START ? 0 : Math.min(4, Math.floor(pNow + 0.02)));

  $(".rail-line i").style.transform = `scaleX(${q < START ? 0 : pNow / 5})`;
  $(".hud-ph").textContent = String(Math.min(5, Math.floor(pNow) + 1)).padStart(2, "0");
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
  // headline lands wide and settles condensed
  $$(".ht").forEach((el, i) => tl.fromTo(el._c, { yPercent: 105, "--w": 125 }, { yPercent: 0, "--w": 62, duration: 1.6, stagger: 0.03 }, i * 0.12));
  tl.from(".nav", { opacity: 0, duration: 1 }, 0.2)
    .from(".hc-kicker, .hc-lede, .stamp, .hc-scroll", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.35)
    .from(".stage-hud", { opacity: 0, duration: 1 }, 0.6);
  // the building time-lapses to completion
  gsap.to(introP, { v: 5, duration: reduced ? 0 : 4.6, ease: "power1.inOut", delay: 0.3 });
  $$(".stamp dd").forEach((dd, i) => {
    const o = { v: 0 };
    gsap.to(o, { v: +dd.dataset.to, duration: 1.6, delay: 0.7 + i * 0.1, ease: "power3.out", onUpdate: () => (dd.textContent = Math.round(o.v) + (dd.dataset.suf || "")) });
  });
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
