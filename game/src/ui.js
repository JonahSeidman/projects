// ===========================================================
// ui.js — time-attack HUD + title/finish screens
// ===========================================================
import { LEVELS, bestFor, isUnlocked, medalFor, loadProgress } from "./levels.js";

const $ = (id) => document.getElementById(id);

export function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export class UI {
  constructor() {
    this.menu = $("menu");
    this.pause = $("pause");
    this.finish = $("finish");
    this.fatal = $("fatal");
    this.hud = $("hud");

    this.levelName = $("levelName");
    this.starChip = $("starChip");
    this.starCount = $("starCount");
    this.timeVal = $("timeVal");
    this.bestVal = $("bestVal");

    this.compass = $("compass");
    this.compassArrow = $("compassArrow");
    this.compassName = $("compassName");
    this.compassDist = $("compassDist");

    this.prompt = $("prompt");
    this.fuelWrap = $("fuelWrap");
    this.fuelFill = $("fuelFill");
    this.toast = $("toast");
    this.speedo = $("speedo");
    this.speedVal = $("speedVal");

    this.playBtn = $("playBtn");
    this.loadStatus = $("loadStatus");
    this.howCard = $("howCard");

    this.objective = $("objective");
    this.splashEl = $("splash");
    this._lastObjective = null;
    this._showBest();
  }

  setObjective(html) {
    if (html === this._lastObjective) return;
    this._lastObjective = html;
    this.objective.innerHTML = html || "";
  }

  splash(text) {
    this.splashEl.textContent = text;
    this.splashEl.classList.remove("show");
    void this.splashEl.offsetWidth;
    this.splashEl.classList.add("show");
  }

  setLoadStatus(text, ready = false) {
    this.loadStatus.textContent = ready ? "COURSE SET — READY TO RUN" : text;
    this.playBtn.disabled = !ready;
  }

  showHUD() { this.hud.classList.remove("hidden"); }
  hideHUD() { this.hud.classList.add("hidden"); }
  showMenu() { this.menu.classList.remove("hidden"); this._showBest(); }
  hideMenu() { this.menu.classList.add("hidden"); this.hideHow(); }
  showPause(time, stars) {
    $("pauseDist").textContent = fmtClock(time);
    $("pauseStars").textContent = `★ ${stars}`;
    this.pause.classList.remove("hidden");
  }
  hidePause() { this.pause.classList.add("hidden"); }
  showHow() { this.howCard.classList.remove("hidden"); }
  hideHow() { this.howCard.classList.add("hidden"); }
  showFatal(msg) { $("fatalMsg").textContent = msg; this.fatal.classList.remove("hidden"); }

  showFinish(levelId, time, stars, isBest, hasNext) {
    $("finishTime").textContent = fmtClock(time);
    const best = bestFor(levelId);
    $("finishBest").textContent = isBest ? "NEW BEST!" : `BEST ${best ? fmtClock(best) : "—"}`;
    $("finishStars").textContent = `★ ${stars}`;
    const medal = medalFor(levelId, time);
    const medalEl = $("finishMedal");
    medalEl.classList.toggle("hidden", !medal);
    if (medal) {
      medalEl.className = `fin-medal ${medal}`;
      $("finishMedalText").textContent = medal.toUpperCase();
    }
    $("nextBtn").classList.toggle("hidden", !hasNext);
    this.finish.classList.remove("hidden");
  }
  hideFinish() { this.finish.classList.add("hidden"); }

  // ---- level select ----
  buildSelect(onPick) {
    const wrap = $("levelCards");
    wrap.innerHTML = "";
    for (const lvl of LEVELS) {
      const unlocked = isUnlocked(lvl.id);
      const best = bestFor(lvl.id);
      const medal = medalFor(lvl.id, best);
      const card = document.createElement("button");
      card.className = "lvl-card" + (unlocked ? "" : " locked");
      card.innerHTML = `
        ${lvl.tutorial ? '<span class="lc-tut">TUTORIAL</span>' : ""}
        <div class="lc-sub">${lvl.sub}</div>
        <div class="lc-name">${lvl.name}</div>
        <div class="lc-blurb">${lvl.blurb}</div>
        <div class="lc-meta">
          ${unlocked
            ? (best
                ? `<span class="lc-best">BEST ${fmtClock(best)}</span>` +
                  (medal ? `<span class="lc-medal ${medal}"><span class="medal-dot"></span>${medal.toUpperCase()}</span>` : "")
                : `<span class="lc-best">NOT CLEARED</span>`)
            : `<span class="lc-lock">🔒 FINISH THE PREVIOUS LEVEL</span>`}
        </div>
        <div class="lc-targets">
          <span><b>◉</b> ${fmtClock(lvl.medals.gold)}</span>
          <span><b>◎</b> ${fmtClock(lvl.medals.silver)}</span>
          <span><b>○</b> ${fmtClock(lvl.medals.bronze)}</span>
        </div>`;
      if (unlocked) card.addEventListener("click", () => onPick(lvl));
      wrap.appendChild(card);
    }
  }
  showSelect(onPick) { this.buildSelect(onPick); $("select").classList.remove("hidden"); }
  hideSelect() { $("select").classList.add("hidden"); }

  // ---- settings panel ----
  bindSettings(settings, onChange) {
    const sens = $("setSens"), vol = $("setVol");
    const upd = () => {
      $("setSensVal").textContent = `${parseFloat(sens.value).toFixed(1)}×`;
      $("setVolVal").textContent = `${Math.round(vol.value * 100)}%`;
      $("setMusic").textContent = settings.music ? "ON" : "OFF";
      $("setMusic").classList.toggle("on", settings.music);
      $("setShake").textContent = settings.shake ? "ON" : "OFF";
      $("setShake").classList.toggle("on", settings.shake);
      $("setInvert").textContent = settings.invert ? "ON" : "OFF";
      $("setInvert").classList.toggle("on", settings.invert);
      $("setRes").textContent = settings.hires ? "HIGH" : "LOW";
      $("setRes").classList.toggle("on", settings.hires);
    };
    sens.value = settings.sens;
    vol.value = settings.vol;
    sens.addEventListener("input", () => { settings.sens = parseFloat(sens.value); upd(); onChange(); });
    vol.addEventListener("input", () => { settings.vol = parseFloat(vol.value); upd(); onChange(); });
    $("setMusic").addEventListener("click", () => { settings.music = !settings.music; upd(); onChange(); });
    $("setShake").addEventListener("click", () => { settings.shake = !settings.shake; upd(); onChange(); });
    $("setInvert").addEventListener("click", () => { settings.invert = !settings.invert; upd(); onChange(); });
    $("setRes").addEventListener("click", () => { settings.hires = !settings.hires; upd(); onChange(); });
    upd();
  }
  showSettings() { $("settings").classList.remove("hidden"); }
  hideSettings() { $("settings").classList.add("hidden"); }

  // ---- tutorial ----
  showTutStep(idx, total, html) {
    $("tutStep").classList.remove("hidden");
    $("tutNum").textContent = `${idx}/${total}`;
    $("tutText").innerHTML = html;
  }
  hideTut() { $("tutStep").classList.add("hidden"); }

  setBestDisplay(levelId) {
    const best = bestFor(levelId);
    if (this.bestVal) this.bestVal.textContent = best ? fmtClock(best) : "—";
  }

  // ---- HUD ----
  setLevel(name) { this.levelName.textContent = name; }
  setStars(n) { this.starCount.textContent = n; }
  popStar() {
    this.starChip.classList.remove("pop");
    void this.starChip.offsetWidth;
    this.starChip.classList.add("pop");
  }
  setTime(sec) { this.timeVal.textContent = fmtClock(sec); }

  setPrompt(text) {
    if (text) { this.prompt.innerHTML = text; this.prompt.classList.remove("hidden"); }
    else this.prompt.classList.add("hidden");
  }
  setFuel(v) {
    this.fuelFill.style.width = `${Math.round(v * 100)}%`;
    this.fuelFill.classList.toggle("low", v < 0.25);
  }
  showFuel(v) { this.fuelWrap.classList.toggle("hidden", !v); }
  setSpeedo(v, on) {
    this.speedo.classList.toggle("hidden", !on);
    if (on) this.speedVal.textContent = Math.round(v);
  }
  setCrosshair() {}

  showToast(text) {
    this.toast.textContent = text;
    this.toast.classList.remove("show");
    void this.toast.offsetWidth;
    this.toast.classList.add("show");
  }

  // compass points at the finish
  updateCompass(player, world) {
    const target = world.finish ? world.finish.pos : null;
    if (!target) { this.compass.classList.add("hidden"); return; }
    const name = "FINISH";

    const dx = target.x - player.pos.x, dz = target.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    const fx = -Math.sin(player.camYaw), fz = -Math.cos(player.camYaw);
    const len = dist || 1;
    const gx = dx / len, gz = dz / len;
    const ang = Math.atan2(fx * gz - fz * gx, fx * gx + fz * gz);

    this.compass.classList.remove("hidden");
    this.compassArrow.style.transform = `rotate(${ang}rad)`;
    this.compassName.textContent = name;
    this.compassDist.textContent = `${Math.round(dist)} m`;
  }

  // overall best across levels for the title screen badge
  _showBest() {
    const p = loadProgress();
    const bests = Object.values(p.bests);
    const row = $("bestRow");
    if (row && bests.length) {
      $("bestDist").textContent = fmtClock(Math.min(...bests));
      row.classList.remove("hidden");
    }
  }
}
