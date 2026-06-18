// ===========================================================
// levels.js — course definitions.
// One level for now: THE DESCENT — a run from the rim of a
// colossal impact crater down its inner wall to the floor.
// plan: ["s", len] = straight · ["a", angle, radius] = arc
// (positive angle turns left). The big sweeps follow the
// crater wall; tight arcs are the switchback hairpins.
// ===========================================================
const PI = Math.PI;

export const LEVELS = [
  {
    id: "longway",
    name: "The Long Way Down",
    sub: "TUTORIAL · MISSION 01",
    blurb: "Spiral the whole crater wall, dive to the floor, and reach the foot of the central peak. Now with a bored tunnel on the way down.",
    tutorial: true,
    crater: { R: 650, D: 240 },
    rollers: 1.1,
    tint: 0xc99a6a,
    plan: [
      ["a", 1.15, 565],
      ["a", PI, 19],
      ["a", -1.05, 520],
      ["a", -PI, 19],
      ["a", 0.85, 470],
      ["aim", 0.42],
      ["s", 210],
      ["a", -0.55, 130],
      ["s", 55],
    ],
    pipes: [[0.36, 0.56], [0.66, 0.78]],   // wide rounded half-pipes — carve loops inside
    bowls: [
      { f: 0.20, r: 24, depth: 8 },
      { f: 0.68, r: 26, depth: 9 },
      { f: 0.88, r: 30, depth: 10 },
    ],
    medals: { gold: 100, silver: 125, bronze: 170 },
  },
  {
    id: "deepcut",
    name: "Deep Cut",
    sub: "MISSION 02",
    blurb: "Fewer switchbacks, longer straights — and a long tunnel bored clean through the crater wall.",
    crater: { R: 650, D: 240 },
    rollers: 1.0,
    tint: 0x8fb6a0,
    plan: [
      ["a", 0.95, 560],
      ["a", PI, 20],
      ["s", 150],                    // long straight → big tunnel
      ["a", -PI, 21],
      ["aim", 0.40],
      ["s", 200],
      ["a", -0.5, 130],
      ["s", 55],
    ],
    pipes: [[0.12, 0.40], [0.76, 0.90]],   // two big half-pipe runs
    bowls: [
      { f: 0.74, r: 28, depth: 10 },
      { f: 0.90, r: 30, depth: 10 },
    ],
    medals: { gold: 95, silver: 120, bronze: 165 },
  },
  {
    id: "twintubes",
    name: "Twin Tubes",
    sub: "MISSION 03",
    blurb: "Two long bores back to back, threaded between tight hairpins. Hold your line in the dark.",
    crater: { R: 650, D: 240 },
    rollers: 0.9,
    tint: 0xb88aff,
    plan: [
      ["a", 0.7, 540],
      ["a", PI, 18],
      ["s", 110],                    // tunnel 1
      ["a", -PI, 18],
      ["s", 80],
      ["a", 0.6, 300],
      ["s", 120],                    // tunnel 2
      ["aim", 0.45],
      ["s", 180],
      ["a", 0.5, 120],
      ["s", 50],
    ],
    pipes: [[0.10, 0.24], [0.50, 0.70]],   // two long wide pipes
    bowls: [
      { f: 0.50, r: 26, depth: 9 },
      { f: 0.86, r: 30, depth: 10 },
    ],
    medals: { gold: 115, silver: 145, bronze: 195 },
  },
  {
    id: "switchbacks",
    name: "Switchback City",
    sub: "MISSION 04",
    blurb: "Five traverses stacked by four hairpins — the whole wall, cut to ribbons. Three pipes and four bowls to bleed speed back into.",
    crater: { R: 650, D: 240 },
    rollers: 0.85,
    tint: 0x6ad0ff,
    plan: [
      ["a", 0.9, 575],
      ["a", PI, 18],
      ["a", -0.85, 525],
      ["a", -PI, 18],
      ["a", 0.8, 475],
      ["a", PI, 18],
      ["a", -0.75, 425],
      ["a", -PI, 18],
      ["a", 0.7, 375],
      ["aim", 0.42],
      ["s", 195],
      ["a", -0.55, 130],
      ["s", 55],
    ],
    pipes: [[0.08, 0.20], [0.40, 0.52], [0.70, 0.82]],
    bowls: [
      { f: 0.30, r: 26, depth: 9 },
      { f: 0.58, r: 26, depth: 9 },
      { f: 0.78, r: 28, depth: 10 },
      { f: 0.92, r: 30, depth: 11 },
    ],
    medals: { gold: 130, silver: 165, bronze: 215 },
  },
  {
    id: "loops",
    name: "The Long Loops",
    sub: "MISSION 05",
    blurb: "Three sweeping orbits of the crater, each a long pipe you can carve full loops inside. Ride high on the wall and let it sling you down.",
    crater: { R: 650, D: 240 },
    rollers: 1.2,
    tint: 0xff7ab0,
    plan: [
      ["a", 1.7, 560],
      ["a", PI, 18],
      ["a", -1.5, 470],
      ["a", -PI, 18],
      ["a", 1.3, 385],
      ["a", PI, 18],
      ["a", -0.7, 320],
      ["aim", 0.4],
      ["s", 185],
      ["a", 0.5, 120],
      ["s", 50],
    ],
    pipes: [[0.06, 0.26], [0.34, 0.54], [0.62, 0.80]],   // long pipes inside each orbit
    bowls: [
      { f: 0.30, r: 27, depth: 10 },
      { f: 0.58, r: 27, depth: 10 },
      { f: 0.86, r: 30, depth: 11 },
    ],
    medals: { gold: 150, silver: 185, bronze: 245 },
  },
  {
    id: "maelstrom",
    name: "The Maelstrom",
    sub: "MISSION 06 · FINALE",
    blurb: "The full descent: six looping traverses, five hairpins, four pipes and five bowls, plunging to the foot of the central peak. Everything you've learned, in one run.",
    crater: { R: 650, D: 240 },
    rollers: 1.0,
    tint: 0xff5a3d,
    plan: [
      ["a", 1.3, 580],
      ["a", PI, 17],
      ["a", -1.2, 520],
      ["a", -PI, 17],
      ["a", 1.1, 460],
      ["a", PI, 17],
      ["a", -1.0, 400],
      ["a", -PI, 17],
      ["a", 0.9, 345],
      ["a", PI, 17],
      ["a", -0.8, 290],
      ["aim", 0.42],
      ["s", 165],
      ["a", -0.5, 120],
      ["s", 48],
    ],
    pipes: [[0.05, 0.16], [0.30, 0.42], [0.52, 0.63], [0.72, 0.83]],
    bowls: [
      { f: 0.22, r: 26, depth: 9 },
      { f: 0.47, r: 27, depth: 10 },
      { f: 0.68, r: 27, depth: 10 },
      { f: 0.80, r: 28, depth: 10 },
      { f: 0.92, r: 30, depth: 11 },
    ],
    medals: { gold: 175, silver: 215, bronze: 285 },
  },
];

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

// ---- progress persistence ----
const PROG_KEY = "cc_progress_v3";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY)) || { bests: {}, done: {} }; }
  catch { return { bests: {}, done: {} }; }
}
export function saveProgress(p) {
  localStorage.setItem(PROG_KEY, JSON.stringify(p));
}
export function recordRun(levelId, time) {
  const p = loadProgress();
  p.done[levelId] = true;
  const prev = p.bests[levelId];
  const isBest = !prev || time < prev;
  if (isBest) p.bests[levelId] = time;
  saveProgress(p);
  return isBest;
}
export function bestFor(levelId) {
  return loadProgress().bests[levelId] || null;
}
export function isUnlocked(levelId) {
  const idx = LEVELS.findIndex((l) => l.id === levelId);
  if (idx <= 1) return true;
  const prev = LEVELS[idx - 1];
  return !!loadProgress().done[prev.id];
}
export function medalFor(levelId, time) {
  const l = levelById(levelId);
  if (time == null) return null;
  if (time <= l.medals.gold) return "gold";
  if (time <= l.medals.silver) return "silver";
  if (time <= l.medals.bronze) return "bronze";
  return null;
}
