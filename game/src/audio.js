// ===========================================================
// audio.js — tiny synthesized SFX + ambient pad (WebAudio, no assets)
// ===========================================================

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._ambient = null;
  }

  // Must be created after a user gesture (browser autoplay policy).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = (this._vol ?? 0.7) * 0.7;
    this.master.connect(this.ctx.destination);
    this._startAmbient();
  }

  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  setVolume(v) {
    this._vol = v;
    if (this.master) this.master.gain.setTargetAtTime(v * 0.7, this.ctx.currentTime, 0.05);
  }

  _now() { return this.ctx.currentTime; }

  _tone(freq, dur, { type = "sine", gain = 0.3, attack = 0.005, decay = null, slideTo = null, when = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this._now() + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, { gain = 0.3, lp = 1200, hp = 200, when = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this._now() + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lpf = this.ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = lp;
    const hpf = this.ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(hpf).connect(lpf).connect(g).connect(this.master);
    src.start(t0);
  }

  jump() { this._tone(420, 0.18, { type: "triangle", gain: 0.22, slideTo: 720 }); }
  land(power = 0.4) { this._noise(0.12, { gain: 0.18 * power + 0.05, lp: 900 }); this._tone(120, 0.1, { type: "sine", gain: 0.12 * power }); }
  step() { this._noise(0.045, { gain: 0.04, lp: 1600, hp: 500 }); }

  collect() {
    this._tone(880, 0.09, { type: "triangle", gain: 0.2 });
    this._tone(1320, 0.12, { type: "triangle", gain: 0.18, when: 0.07 });
  }

  // ---- jetpack: looped noise whoosh + saw rumble ----
  startJet() {
    if (!this.ctx || this.muted || this._jet) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass"; band.frequency.value = 520; band.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(band).connect(g).connect(this.master);
    src.start();

    const osc = ctx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.value = 62;
    const og = ctx.createGain(); og.gain.value = 0.0001;
    const olp = ctx.createBiquadFilter(); olp.type = "lowpass"; olp.frequency.value = 240;
    osc.connect(olp).connect(og).connect(this.master);
    osc.start();

    g.gain.setTargetAtTime(0.22, ctx.currentTime, 0.06);
    og.gain.setTargetAtTime(0.10, ctx.currentTime, 0.06);
    this._jet = { src, band, g, osc, og };
  }
  updateJet(fuel01, speed) {
    if (!this._jet) return;
    const t = this.ctx.currentTime;
    // pitch lifts with speed, thins out as the tank empties
    this._jet.band.frequency.setTargetAtTime(420 + speed * 22, t, 0.08);
    this._jet.g.gain.setTargetAtTime(0.1 + 0.16 * fuel01, t, 0.1);
    this._jet.osc.frequency.setTargetAtTime(52 + speed * 0.9, t, 0.1);
  }
  stopJet() {
    if (!this._jet) return;
    const t = this.ctx.currentTime;
    const j = this._jet;
    j.g.gain.setTargetAtTime(0.0001, t, 0.08);
    j.og.gain.setTargetAtTime(0.0001, t, 0.08);
    j.src.stop(t + 0.4);
    j.osc.stop(t + 0.4);
    this._jet = null;
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._tone(f, 0.4, { type: "triangle", gain: 0.22, when: i * 0.12 }));
  }
  checkpoint() { this._tone(660, 0.12, { type: "sine", gain: 0.16, slideTo: 880 }); }

  _startAmbient() {
    if (!this.ctx) return;
    // Two slowly detuned low pads for a calm space hum.
    const make = (freq, gain) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = gain;
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoG.gain.value = gain * 0.5;
      lfo.connect(lfoG).connect(g.gain);
      osc.connect(g).connect(this.master);
      osc.start(); lfo.start();
      return osc;
    };
    make(55, 0.05);
    make(82.4, 0.035);
    make(110.0, 0.02);
  }
}
