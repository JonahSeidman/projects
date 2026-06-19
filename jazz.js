/* Procedural lo-fi jazz — soft Rhodes (I–vi–ii–V), walking bass, swung hats.
   No external audio files. Starts on first user gesture (browsers block
   silent autostart). Volume slider lives top-right and hides on scroll. */

(function () {
  "use strict";

  const BPM = 110;
  const beat = 60 / BPM;        // seconds per quarter note
  const barLen = beat * 4;
  const SWING = 0.64;           // off-beat placement (0.5 = straight)

  // I vi ii V in C — maj7 / m7 / m7 / dom7 voicings (MIDI)
  const CHORDS = [
    [60, 64, 67, 71], // Cmaj7
    [57, 60, 64, 67], // Am7
    [62, 65, 69, 72], // Dm7
    [55, 59, 62, 65], // G7
  ];
  // Walking bass: chord tones + chromatic approach to the next root
  const BASS = [
    [36, 40, 43, 44], // C  E  G  G#-> A
    [45, 48, 52, 49], // A  C  E  C#-> D
    [38, 41, 45, 42], // D  F  A  F#-> G
    [43, 47, 50, 48], // G  B  D  C -> C
  ];

  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  let ctx = null, master = null, chordBus = null, bassBus = null, percBus = null;
  let noiseBuf = null, timer = null, nextBarTime = 0, bar = 0, started = false;
  let targetVol = 0.5, muted = false;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    // gentle limiter so the louder mix stays clean
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);

    // shared spacious feedback delay (poor-man's reverb)
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.26;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    chordBus = ctx.createGain(); chordBus.gain.value = 0.5;
    bassBus = ctx.createGain(); bassBus.gain.value = 0.7;
    percBus = ctx.createGain(); percBus.gain.value = 0.5;
    [chordBus, bassBus, percBus].forEach((b) => { b.connect(master); b.connect(delay); });

    // noise buffer for hats
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function rhodes(t, freq, dur, vel) {
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.0;
    const o2g = ctx.createGain(); o2g.gain.value = 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    const g = ctx.createGain();
    o1.connect(g); o2.connect(o2g); o2g.connect(g); g.connect(lp); lp.connect(chordBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  function bass(t, freq, vel) {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650;
    const g = ctx.createGain();
    o.connect(g); g.connect(lp); lp.connect(bassBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.95);
    o.start(t); o.stop(t + beat);
  }

  function hat(t, vel) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7500;
    const g = ctx.createGain();
    s.connect(hp); hp.connect(g); g.connect(percBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.start(t); s.stop(t + 0.09);
  }

  function scheduleBar(idx, t) {
    const c = idx % 4;
    // chord — gently rolled
    CHORDS[c].forEach((m, i) => rhodes(t + i * 0.02, m2f(m), barLen * 0.92, 0.12));
    // walking bass on each beat
    BASS[c].forEach((m, i) => bass(t + i * beat, m2f(m), 0.24));
    // swung hats
    for (let b = 0; b < 4; b++) {
      hat(t + b * beat, 0.06);
      hat(t + (b + SWING) * beat, 0.04);
    }
  }

  function scheduler() {
    while (nextBarTime < ctx.currentTime + 0.25) {
      scheduleBar(bar, nextBarTime);
      nextBarTime += barLen;
      bar++;
    }
  }

  function applyVol() {
    if (!master) return;
    const v = muted ? 0 : targetVol * 0.95;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
  }

  function start() {
    if (!ctx) build();
    if (ctx.state === "suspended") ctx.resume();
    if (!started) {
      started = true;
      nextBarTime = ctx.currentTime + 0.15;
      timer = setInterval(scheduler, 25);
    }
    applyVol();
  }

  /* ---------- UI wiring ---------- */

  function setIcon(btn) {
    btn.innerHTML = muted
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  }

  function init() {
    const wrap = document.getElementById("vol");
    const btn = document.getElementById("volBtn");
    const range = document.getElementById("volRange");
    if (!wrap || !btn || !range) return;

    targetVol = parseFloat(range.value);
    setIcon(btn);

    range.addEventListener("input", () => {
      targetVol = parseFloat(range.value);
      if (targetVol > 0 && muted) { muted = false; setIcon(btn); }
      start();
    });
    btn.addEventListener("click", () => {
      muted = !muted;
      setIcon(btn);
      start();
    });

    // start on first real user gesture (autostart with sound is blocked)
    const kick = () => { start(); off(); };
    const off = () => ["pointerdown", "keydown", "touchstart", "wheel"].forEach((e) =>
      window.removeEventListener(e, kick));
    ["pointerdown", "keydown", "touchstart", "wheel"].forEach((e) =>
      window.addEventListener(e, kick, { passive: true }));

    // hide the slider once you scroll down
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        wrap.classList.toggle("hidden", window.scrollY > 60);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // try to play immediately on open; if the browser blocks autoplay the
    // gesture listeners above will start it on the first interaction
    start();
    if (ctx && ctx.state === "suspended") {
      window.addEventListener("load", start, { once: true });
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
