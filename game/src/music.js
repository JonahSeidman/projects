// ===========================================================
// music.js — ONE public-domain classical track played straight through
// (no speed switching), with a fully SYNTHESIZED techno layer generated
// here in WebAudio (original — no copyrighted recordings) steady on top.
//
// Classical: Grieg, "In the Hall of the Mountain King" — Internet
// Archive, Great 78 Project (pre-1929 disc: composition AND recording
// are public domain). Techno: a fixed-tempo four-on-the-floor kick/hat/
// bass. Classical melody over a driving pulse.
// ===========================================================

// ONE classical track, played start to finish (no speed switching),
// with the synth techno layer steady underneath — techno + classical.
const TRACKS = [
  {
    name: "In the Hall of the Mountain King",
    url: "https://archive.org/download/78_peer-gynt-suite-no-1-op-46-4-in-the-hall-of-the-mountain-king_grieg-london-philharm_gbia7041782a/PEER%20GYNT-SUITE%20NO.%201%2C%20OP.%2046%20-%204.%20In%20the%20Hall%20of.mp3",
    weight: () => 1,   // always full — never crossfades by speed
  },
];

function ss(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const BASS = [55.0, 55.0, 82.41, 55.0, 73.42, 55.0, 49.0, 65.41];  // A1 riff

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.ready = false;
    this.tracks = [];
    this._smooth = 0;
    this._bpm = 132;   // fixed techno tempo
    this._step = 0;
    this._nextNote = 0;
    this._technoTarget = 0;
    this.enabled = true;   // overridden by settings (muted by default)
    this._ducked = false;
  }

  // single source of truth for the music bus volume
  _busLevel() { return !this.enabled ? 0.0001 : (this._ducked ? 0.08 : 0.36); }

  setEnabled(on) {
    this.enabled = on;
    if (this.bus) {
      this.bus.gain.setTargetAtTime(this._busLevel(), this.audio.ctx.currentTime, 0.4);
      if (on) this.resume();
    }
  }

  init() {
    if (this.ready || !this.audio.ctx) return;
    const ctx = this.audio.ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.connect(this.audio.master);
    this.bus.gain.setTargetAtTime(this._busLevel(), ctx.currentTime, 1.5);

    // classical tracks
    for (const def of TRACKS) {
      try {
        const el = new window.Audio();
        el.crossOrigin = "anonymous";
        el.src = def.url;
        el.loop = true;
        el.preload = "auto";
        const src = ctx.createMediaElementSource(el);
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(g).connect(this.bus);
        el.play().catch(() => {});
        this.tracks.push({ ...def, el, g });
      } catch (e) { console.warn("music track failed:", def.name, e); }
    }

    // techno layer — its own gain + a lookahead step scheduler
    this.technoGain = ctx.createGain();
    this.technoGain.gain.value = 0.0001;
    this.technoGain.connect(this.bus);
    this._nextNote = ctx.currentTime + 0.1;
    this._sched = setInterval(() => this._scheduleTechno(), 25);

    this.ready = true;
  }

  _scheduleTechno() {
    const ctx = this.audio.ctx;
    if (!ctx) return;
    const stepDur = 60 / this._bpm / 4;   // sixteenth note
    while (this._nextNote < ctx.currentTime + 0.12) {
      this._emitStep(this._step, this._nextNote);
      this._step = (this._step + 1) % 16;
      this._nextNote += stepDur;
    }
  }

  _emitStep(step, t) {
    const ctx = this.audio.ctx;
    const g = this.technoGain;
    // kick on every quarter
    if (step % 4 === 0) {
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      e.gain.setValueAtTime(0.9, t);
      e.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(e).connect(g); o.start(t); o.stop(t + 0.22);
    }
    // hat on the off-eighths
    if (step % 2 === 1) {
      const len = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7500;
      const e = ctx.createGain(); e.gain.value = 0.10;
      src.connect(hp).connect(e).connect(g); src.start(t);
    }
    // bass on the eighths
    if (step % 2 === 0) {
      const o = ctx.createOscillator(), e = ctx.createGain();
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      o.type = "sawtooth";
      o.frequency.value = BASS[(step / 2) % BASS.length];
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(lp).connect(e).connect(g); o.start(t); o.stop(t + 0.16);
    }
  }

  resume() {
    for (const t of this.tracks) if (t.el.paused) t.el.play().catch(() => {});
  }

  update(speed, dt) {
    if (!this.ready) return;
    // levels are fixed — the mix does not react to speed
    const now = this.audio.ctx.currentTime;
    for (const t of this.tracks) t.g.gain.setTargetAtTime(0.6, now, 0.9);
    this.technoGain.gain.setTargetAtTime(0.4, now, 0.8);
  }

  duck(on) {
    if (!this.ready) return;
    this._ducked = on;
    this.bus.gain.setTargetAtTime(this._busLevel(), this.audio.ctx.currentTime, 0.5);
  }
}
