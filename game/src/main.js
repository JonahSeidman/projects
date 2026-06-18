// ===========================================================
// main.js — game flow: title → level select → run → finish → next
// Plus: settings (persisted) and the interactive training tutorial.
// ===========================================================
import * as THREE from "three";
import { Engine } from "./engine.js";
import { Input } from "./input.js";
import { Audio } from "./audio.js";
import { UI, fmtClock } from "./ui.js";
import { World } from "./world.js";
import { Player } from "./player.js";
import { FX } from "./fx.js";
import { LEVELS, levelById, recordRun } from "./levels.js";
import { Music } from "./music.js";

const ui = new UI();

let engine, input, audio, world, player, fx, music;
let state = "menu";          // menu | select | playing | paused | finished
let settingsFrom = null;     // where to return from the settings panel
let currentLevel = LEVELS[0];
let tutorial = null;
let t = 0;
let elapsed = 0;
let started = false;
let wrongWayT = 0, lastWrongWay = -10;
let last = performance.now();

// ---------------- settings ----------------
const SET_KEY = "cc_settings_v2";   // v2: muted by default
const settings = Object.assign(
  { sens: 1.0, vol: 0.0, music: false, shake: true, invert: false, hires: true },  // muted by default
  (() => { try { return JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch { return {}; } })()
);
function applySettings() {
  input.sensScale = settings.sens;
  input.invertY = settings.invert;
  audio.setVolume(settings.vol);
  fx.shakeEnabled = settings.shake;
  if (music) music.setEnabled(settings.music);
  engine.setHiRes(settings.hires);
  localStorage.setItem(SET_KEY, JSON.stringify(settings));
}

// ---------------- tutorial ----------------
class Tutorial {
  constructor() {
    this.acc = { moved: 0, carved: 0, jet: 0, jumped: false };
    this.idx = 0;
    this.steps = [
      { text: "ROLL WITH <b>W A S D</b>", done: (a) => a.moved > 8 },
      { text: "POINT IT DOWNHILL — BUILD SPEED", done: () => player.vel.length() > 12 },
      { text: "CARVE THE TURN WITH <b>A</b> / <b>D</b>", done: (a) => a.carved > 0.8 },
      { text: "TAP <b>SPACE</b> — HOP", done: (a) => a.jumped },
      { text: "HOLD <b>SPACE</b> IN THE AIR — <b>JET BOOST</b>", done: (a) => a.jet > 0.6 },
      { text: "AHEAD: DROP INTO THE <b>GOLDEN BOWL</b>", done: () => player.inBowl },
      { text: "CIRCLE THE BOWL WALL — <b>BUILD SPEED</b>", done: () => player.orbitT > 1.6 },
      { text: "SLING OUT — RIDE THE LINE TO THE <b>FINISH</b>", done: () => false },
    ];
    this._prevPos = null;
    this.show();
  }
  show() { ui.showTutStep(this.idx + 1, this.steps.length, this.steps[this.idx].text); }
  update(dt) {
    const a = this.acc;
    if (this._prevPos) a.moved += player.pos.distanceTo(this._prevPos);
    this._prevPos = player.pos.clone();
    if (player.grounded && player.vel.length() > 8 && Math.abs(input.moveAxis().x) > 0.5) a.carved += dt;
    if (player.thrusting) a.jet += dt;
    if (!player.grounded && player.vel.y > 4) a.jumped = true;

    const step = this.steps[this.idx];
    if (this.idx < this.steps.length - 1 && step.done(a)) {
      this.idx++;
      audio.collect();
      ui.splash("NICE!");
      this.show();
    }
  }
}

// ---------------- boot ----------------
function boot() {
  try {
    const canvas = document.getElementById("scene");
    engine = new Engine(canvas);
    input = new Input(canvas);
    audio = new Audio();
    world = new World(engine.scene, currentLevel);
    fx = new FX(engine.scene);
    player = new Player(engine.scene, engine.camera, world, input, audio, ui, fx);

    player.onFinish = () => {
      state = "finished";
      const isBest = recordRun(currentLevel.id, elapsed);
      input.exitLock();
      ui.setObjective("");
      ui.hideTut();
      const idx = LEVELS.findIndex((l) => l.id === currentLevel.id);
      const hasNext = idx >= 0 && idx < LEVELS.length - 1;
      ui.showFinish(currentLevel.id, elapsed, player.score, isBest, hasNext);
      ui.setBestDisplay(currentLevel.id);
    };
    player.onFall = () => {
      ui.splash("WIPEOUT");
      restartRun(false);
    };
    player.onSling = (gain) => {
      ui.splash(`SLINGSHOT +${Math.round(gain)}`);
    };
    music = new Music(audio);

    applySettings();
    ui.bindSettings(settings, applySettings);
    ui.setLoadStatus("", true);

    window.__game = { engine, input, audio, world, player, fx, get music() { return music; }, THREE, settings, get state() { return state; }, get tutorial() { return tutorial; } };

    input.onLockChange((locked) => {
      if (!locked && state === "playing") pause();
    });

    wireButtons();
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    ui.showFatal("Could not start the 3D engine: " + (err && err.message ? err.message : err) +
      " — this game needs WebGL and internet access for Three.js.");
  }
}

function wireButtons() {
  const on = (id, fn) => document.getElementById(id).addEventListener("click", fn);
  on("playBtn", openSelect);
  on("selBack", () => { ui.hideSelect(); if (state === "select") { state = "menu"; ui.showMenu(); } });
  on("settingsBtn", () => openSettings("menu"));
  on("howBtn", () => ui.showHow());
  on("howClose", () => ui.hideHow());
  on("setBack", closeSettings);

  on("resumeBtn", resume);
  on("restartBtn", () => { ui.hidePause(); restartRun(true); });
  on("pauseSelBtn", () => { ui.hidePause(); openSelect(); });
  on("pauseSetBtn", () => openSettings("paused"));
  on("quitBtn", quitToTitle);

  on("retryBtn", () => { ui.hideFinish(); restartRun(true); });
  on("nextBtn", () => {
    ui.hideFinish();
    const idx = LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (idx < LEVELS.length - 1) startLevel(LEVELS[idx + 1]);
  });
  on("finMenuBtn", () => { ui.hideFinish(); openSelect(); });

  addEventListener("keydown", (e) => {
    const enter = e.code === "Enter" || e.code === "NumpadEnter";
    if (state === "menu" && enter && !document.getElementById("playBtn").disabled) openSelect();
    else if (state === "finished" && (enter || e.code === "KeyR")) {
      ui.hideFinish();
      restartRun(true);
    } else if (state === "paused" && e.code === "Escape") resume();
  });
}

// ---------------- flow ----------------
function openSelect() {
  ui.hideMenu();
  ui.hidePause();
  if (state === "playing") input.exitLock();
  state = "select";
  ui.showSelect((lvl) => { ui.hideSelect(); startLevel(lvl); });
}

function openSettings(from) {
  settingsFrom = from;
  ui.showSettings();
}
function closeSettings() {
  ui.hideSettings();
  if (settingsFrom === "paused") ui.showPause(elapsed, player.score);
}

function startLevel(def) {
  currentLevel = def;
  audio.init();
  audio.resume();
  music.init();
  music.resume();
  ui.splash("CARVING THE COURSE…");
  state = "loading";
  setTimeout(() => _startLevelNow(def), 40);   // let the splash paint first
}

function _startLevelNow(def) {
  world.loadLevel(def);
  player.reset();
  elapsed = 0; started = false;
  tutorial = def.tutorial ? new Tutorial() : null;
  if (!def.tutorial) ui.hideTut();

  ui.setLevel(def.name);
  ui.setStars(0);
  ui.setBestDisplay(def.id);
  ui.hideMenu();
  ui.showHUD();
  ui.showFuel(true);
  state = "playing";
  player._snap = true;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  input.requestLock();
}

function restartRun(relock) {
  elapsed = 0; started = false;
  world.resetRun();
  player.reset();
  ui.setStars(0);
  state = "playing";
  audio.resume();
  if (tutorial) tutorial.show();
  if (relock) input.requestLock();
}

function pause() {
  if (state !== "playing") return;
  state = "paused";
  if (audio.stopJet) audio.stopJet();
  if (music) music.duck(true);
  ui.showPause(elapsed, player.score);
}

function resume() {
  if (state !== "paused") return;
  ui.hidePause();
  ui.hideSettings();
  state = "playing";
  last = performance.now();
  audio.resume();
  if (music) { music.resume(); music.duck(false); }
  input.requestLock();
}

function quitToTitle() {
  ui.hidePause();
  ui.hideFinish();
  ui.hideSelect();
  ui.hideSettings();
  ui.hideHUD();
  ui.hideTut();
  ui.showMenu();
  state = "menu";
  input.exitLock();
  world.resetRun();
  player.reset();
}

// title camera: drift over the course's first turn
const menuLook = new THREE.Vector3();
function menuCamera(dt) {
  const a = t * 0.06;
  const p = world._pathPoint(Math.min(110, world.pathLength * 0.25));
  const ty = world.heightAt(p.x, p.z);
  const px = p.x + Math.cos(a) * 42;
  const pz = p.z + Math.sin(a) * 42;
  engine.camera.position.lerp(new THREE.Vector3(px, ty + 16 + Math.sin(t * 0.2) * 3, pz), 1 - Math.exp(-2.5 * dt));
  menuLook.lerp(new THREE.Vector3(p.x, ty + 2, p.z), 1 - Math.exp(-2.5 * dt));
  engine.camera.lookAt(menuLook);
}

// ---------------- loop ----------------
function loop(now) {
  requestAnimationFrame(loop);
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  let scale = 1;
  if (player && player.slowmoT > 0) { player.slowmoT -= rawDt; scale = 0.32; }
  const dt = rawDt * scale;

  t += dt;
  world.update(dt, t);
  fx.update(dt);
  if (music) music.update(state === "playing" ? player.vel.length() : 0, rawDt);

  if (state === "menu" || state === "select") {
    menuCamera(rawDt);
  } else if (state === "playing" || state === "finished") {
    player.update(dt, t);

    if (state === "playing") {
      if (!player.locked) elapsed += rawDt;   // clock starts the moment you move
      if (input.pressed("KeyR")) restartRun(true);

      ui.setTime(elapsed);
      ui.setFuel(player.fuel / 100);
      const spd = player.vel.length();
      ui.setSpeedo(spd, spd > 5);
      ui.updateCompass(player, world);

      // forced direction: shout when the player rides against the course
      const q = world.nearestPath(player.pos.x, player.pos.z);
      const spdH = Math.hypot(player.vel.x, player.vel.z);
      if (q && spdH > 6 && (player.vel.x * q.tx + player.vel.z * q.tz) < -0.35 * spdH) {
        wrongWayT += rawDt;
        if (wrongWayT > 1.1 && t - lastWrongWay > 2.2) {
          lastWrongWay = t;
          ui.splash("WRONG WAY!");
        }
      } else {
        wrongWayT = 0;
      }

      if (player.inBowl && !tutorial) {
        ui.setObjective("CIRCLE THE WALL — <b>SLING OUT</b> FASTER");
      } else if (tutorial) {
        tutorial.update(rawDt);
        ui.setObjective("");
      } else if (!player.grounded) {
        ui.setObjective(player.fuel > 1 ? "HOLD <b>SPACE</b> — JET WHERE YOU STEER" : "EMPTY — LAND TO RECHARGE");
      } else if (spd < 6) {
        ui.setObjective("POINT IT DOWNHILL — <b>W</b> TO PUSH");
      } else {
        ui.setObjective("CARVE WITH <b>A</b>/<b>D</b> · STAY ON THE LINE");
      }
    }
    engine.focusShadow(player.pos);
  }

  if (engine.grade) engine.grade.uniforms.uSpeed.value = (state === "playing") ? player.vel.length() : 0;
  engine.render(t);
  input.endFrame();
}

boot();
