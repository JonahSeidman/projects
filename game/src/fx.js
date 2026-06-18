// ===========================================================
// fx.js — pooled particles, shockwave rings, and screen shake.
// All additive/glowy to fit the cosmic art direction.
// ===========================================================
import * as THREE from "three";

const MAX = 2200;

function softSprite() {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class FX {
  constructor(scene) {
    this.scene = scene;

    // --- particle pool (additive points) ---
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.drag = new Float32Array(MAX);
    this.head = 0;
    this.c0 = new Float32Array(MAX * 3); // base color

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, MAX);
    const mat = new THREE.PointsMaterial({
      map: softSprite(), size: 1, sizeAttenuation: true, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    // honor per-particle size attribute
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("uniform float size;", "attribute float size;")
        .replace("gl_PointSize = size;", "gl_PointSize = size;");
    };
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // --- shockwave ring pool ---
    this.rings = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.0, 40),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false })
      );
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, t: 0, dur: 1, from: 1, to: 6 });
    }
    this.ringHead = 0;

    // --- screen shake ---
    this.trauma = 0;
    this.shake = new THREE.Vector3();
    this._tmp = new THREE.Color();
  }

  _emit(x, y, z, vx, vy, vz, r, g, b, size, life, grav, drag) {
    const i = this.head;
    this.head = (this.head + 1) % MAX;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.c0[i * 3] = r; this.c0[i * 3 + 1] = g; this.c0[i * 3 + 2] = b;
    this.size[i] = size;
    this.life[i] = this.maxLife[i] = life;
    this.grav[i] = grav; this.drag[i] = drag;
  }

  _rgb(hex) { this._tmp.set(hex); return this._tmp; }

  // ---- public emitters ----
  burst(p, hex = 0xffd45c, n = 18, speed = 7, size = 1.6, life = 0.7) {
    const c = this._rgb(hex);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.8);
      this._emit(p.x, p.y, p.z,
        Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s + 1.5, Math.sin(b) * Math.sin(a) * s,
        c.r, c.g, c.b, size * (0.6 + Math.random() * 0.8), life * (0.7 + Math.random() * 0.6), 6, 2.2);
    }
  }

  dust(p, hex = 0xbfc6da, n = 10, power = 1) {
    const c = this._rgb(hex);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = (1.4 + Math.random() * 3.2) * power;
      this._emit(p.x, p.y + 0.05, p.z,
        Math.cos(a) * s, Math.random() * 1.6 * power, Math.sin(a) * s,
        c.r, c.g, c.b, (1.4 + Math.random() * 1.6) * power, 0.45 + Math.random() * 0.4, -1.5, 3.0);
    }
  }

  sparks(p, hex = 0xffb27a, n = 22, speed = 14) {
    const c = this._rgb(hex);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.3 + Math.random());
      this._emit(p.x, p.y, p.z,
        Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s,
        c.r, c.g, c.b, 0.8 + Math.random() * 1.2, 0.4 + Math.random() * 0.5, 10, 1.5);
    }
  }

  // trail particle dropped behind the flying player
  trail(p, hex = 0xff9a6a, size = 2.2, life = 0.55) {
    const c = this._rgb(hex);
    this._emit(p.x, p.y, p.z, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2,
      c.r, c.g, c.b, size * (0.7 + Math.random() * 0.6), life, 0, 1.2);
  }

  ring(p, hex = 0xffd9a0, to = 7, dur = 0.55, normal = "y") {
    const r = this.rings[this.ringHead];
    this.ringHead = (this.ringHead + 1) % this.rings.length;
    r.mesh.position.copy(p);
    r.mesh.rotation.set(normal === "y" ? -Math.PI / 2 : 0, 0, 0);
    r.mesh.material.color.set(hex);
    r.t = 0; r.dur = dur; r.from = 0.6; r.to = to; r.mesh.visible = true;
  }

  addShake(a) { if (this.shakeEnabled !== false) this.trauma = Math.min(1, this.trauma + a); }

  update(dt) {
    // particles
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const f = Math.max(0, this.life[i] / this.maxLife[i]);
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const fade = f * f;
      this.col[i * 3] = this.c0[i * 3] * fade;
      this.col[i * 3 + 1] = this.c0[i * 3 + 1] * fade;
      this.col[i * 3 + 2] = this.c0[i * 3 + 2] * fade;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.size.needsUpdate = true;

    // rings
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { r.mesh.visible = false; continue; }
      const s = r.from + (r.to - r.from) * k;
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = (1 - k) * 0.8;
    }

    // shake
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const s = this.trauma * this.trauma;
    this.shake.set((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s).multiplyScalar(1.4);
  }
}
