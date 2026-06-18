// ===========================================================
// world.js — THE CRATER
// The level IS the landform: a colossal impact crater (1.3km
// across, 240m deep). The course is a shelf carved into its
// inner wall — long traverses stacked by hairpins, rim to floor.
// ONE analytic heightfield drives both physics and every mesh,
// so the ground is continuous everywhere: no seams, no holes.
// Style: hand-drawn cel — contour ink, hatching, ink outlines.
// ===========================================================
import * as THREE from "three";
import { toonMat, addOutline } from "./art.js";

const RIBBON = 11;        // half-width of the carved course shelf
const BLEND_OUT = 24;     // where the raw crater wall takes over

// ---------- deterministic noise ----------
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

export class World {
  constructor(scene, def) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.stars = [];
    this.arrows = [];
    this.killY = -9999;

    this._materials();
    this._sharedGeo();
    this.loadLevel(def);
  }

  loadLevel(def) {
    this.def = def;
    this.levelName = def.name;
    this.R = def.crater.R;
    this.D = def.crater.D;
    // crater center: course starts at the world origin, high on the wall
    this.C = { x: 0, z: this.R - 80 };

    if (this._chunkGeos) for (const g of this._chunkGeos) g.dispose();
    this._chunkGeos = [];
    this.root.clear();
    this.stars = [];
    this.arrows = [];
    this.obstacles = [];   // {x, z, r, yTop} — solid props the ball can't pass
    this.finish = null;
    this._lastApex = null;

    this._buildPath();
    // SPEED BOWLS: circular wells on the line — orbit the wall, sling out
    this.bowls = (def.bowls || []).map((b) => {
      const p = this._pathPoint(this.pathLength * b.f);
      return { cx: p.x, cz: p.z, r: b.r, depth: b.depth, s: this.pathLength * b.f };
    });
    // PIPE SECTIONS — wide rounded half-pipes carved into the terrain itself
    // (no separate tube mesh); you ride up the walls and carve loops inside.
    this.pipes = (def.pipes || def.tunnels || []).map(([f0, f1]) => ({ s0: f0 * this.pathLength, s1: f1 * this.pathLength }));
    this._buildTerrain();
    this._buildCourseProps();
    this.spawn = new THREE.Vector3(0, this.heightAt(0, 0) + 0.1, 0);
  }

  // 0..1 — how deep inside a pipe section (smooth at the mouths)
  _pipeFactor(s) {
    if (!this.pipes) return 0;
    let f = 0;
    for (const t of this.pipes) {
      if (s > t.s0 - 18 && s < t.s1 + 18) {
        const inn = THREE.MathUtils.smoothstep(s, t.s0 - 16, t.s0 + 18);
        const out = 1 - THREE.MathUtils.smoothstep(s, t.s1 - 18, t.s1 + 16);
        f = Math.max(f, Math.min(inn, out));
      }
    }
    return f;
  }

  // inside a bowl? (used by the orbit-assist physics)
  bowlAt(x, z) {
    for (const b of this.bowls) {
      const dx = x - b.cx, dz = z - b.cz;
      const d = Math.hypot(dx, dz);
      if (d < b.r * 1.15) return { ...b, d, q2: d / b.r };
    }
    return null;
  }

  // ---------------------------------------------------------- THE LANDFORM
  // One function. Everything — physics, near ground, far peaks — reads it.
  craterGlobal(x, z) {
    const dx = x - this.C.x, dz = z - this.C.z;
    const r = Math.hypot(dx, dz);
    let h;
    if (r < this.R) {
      // parabolic bowl: 0 at the rim, -D at the centre. At the course's
      // starting radius the wall runs ~33° — a real wall, not a hill.
      const f = r / this.R;
      h = -this.D * (1 - f * f);
    } else {
      // outside: ejecta apron falling away, then distant peaks
      h = -(r - this.R) * 0.05
        + Math.pow(vnoise(x * 0.004 + 13, z * 0.004 - 7), 3) * 220
          * THREE.MathUtils.smoothstep(r, this.R + 180, this.R + 600);
    }
    // raised rim lip on both sides
    h += 30 * Math.exp(-Math.pow((r - this.R) / 70, 2));
    // CENTRAL PEAK — the mountain in the middle of the bowl
    if (r < 210) {
      const f = 1 - r / 210;
      h += 130 * f * f;
    }
    return h;
  }

  // ---------------------------------------------------------- THE PATH
  _buildPath() {
    const pts = [];
    let x = 0, z = 0, heading = 0;   // spawn at origin, heading along the wall
    const push = () => pts.push(new THREE.Vector2(x, z));
    const straight = (len) => {
      const n = Math.ceil(len / 6);
      for (let i = 1; i <= n; i++) {
        x += Math.cos(heading) * (len / n);
        z += Math.sin(heading) * (len / n);
        push();
      }
    };
    const arc = (angle, radius) => {
      const steps = Math.max(6, Math.ceil(Math.abs(angle) * radius / 7));
      const cx = x - Math.sin(heading) * radius * Math.sign(angle);
      const cz = z + Math.cos(heading) * radius * Math.sign(angle);
      const a0 = Math.atan2(z - cz, x - cx);
      for (let i = 1; i <= steps; i++) {
        const a = a0 + (angle * i) / steps;
        x = cx + Math.cos(a) * radius;
        z = cz + Math.sin(a) * radius;
        push();
      }
      heading += angle;
    };

    push();
    for (const step of this.def.plan) {
      if (step[0] === "s") straight(step[1]);
      else if (step[0] === "aim") {
        // point the heading at the crater centre (+ optional bias)
        heading = Math.atan2(this.C.z - z, this.C.x - x) + (step[1] || 0);
      }
      else arc(step[1], step[2]);
    }

    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p.x, 0, p.y)), false, "centripetal", 0.5
    );
    const total = curve.getLength();
    const N = Math.ceil(total / 2);
    this.path = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = curve.getPointAt(u);
      const tan = curve.getTangentAt(u);
      this.path.push({ x: p.x, z: p.z, s: u * total, tx: tan.x, tz: tan.z, curv: 0, h: 0 });
    }
    for (let i = 1; i < this.path.length - 1; i++) {
      const a = this.path[i - 1], b = this.path[i + 1];
      const h0 = Math.atan2(a.tz, a.tx), h1 = Math.atan2(b.tz, b.tx);
      let dh = h1 - h0;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.path[i].curv = dh / (b.s - a.s);
    }
    this.pathLength = total;

    // ---- course heights: sampled FROM the crater wall, then smoothed.
    // The shelf follows the real landform; smoothing turns the hairpin
    // drops into rideable grades (a carved road, not a cliff).
    const raw = this.path.map((p) => this.craterGlobal(p.x, p.z));
    const W = 44;   // ±88m smoothing — long, flowing grades
    for (let i = 0; i < this.path.length; i++) {
      let sum = 0, cnt = 0;
      for (let k = Math.max(0, i - W); k <= Math.min(this.path.length - 1, i + W); k++) {
        sum += raw[k]; cnt++;
      }
      this.path[i].h = sum / cnt + this.def.rollers * Math.sin(this.path[i].s * 0.05);
    }

    // bbox of the course (+ margin) — points outside skip path lookups
    let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    for (const p of this.path) {
      mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x);
      mnz = Math.min(mnz, p.z); mxz = Math.max(mxz, p.z);
    }
    this.pathBox = { minX: mnx - 70, maxX: mxx + 70, minZ: mnz - 70, maxZ: mxz + 70 };

    // spatial grid for nearest-sample lookups
    this.grid = new Map();
    const CELL = this.CELL = 16;
    this.path.forEach((p, i) => {
      const k = `${Math.floor(p.x / CELL)}_${Math.floor(p.z / CELL)}`;
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(i);
    });
  }

  // nearest path sample — proper expanding ring search, no gaps
  nearestPath(x, z) {
    const b = this.pathBox;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
    const CELL = this.CELL;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    let best = -1, bestD2 = Infinity;
    const scan = (radius) => {
      for (let ix = cx - radius; ix <= cx + radius; ix++) {
        for (let iz = cz - radius; iz <= cz + radius; iz++) {
          const cell = this.grid.get(`${ix}_${iz}`);
          if (!cell) continue;
          for (const i of cell) {
            const p = this.path[i];
            const d2 = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
            if (d2 < bestD2) { bestD2 = d2; best = i; }
          }
        }
      }
    };
    scan(2);
    if (best < 0) scan(4);
    if (best < 0) return null;
    const p = this.path[best];
    const dx = x - p.x, dz = z - p.z;
    const side = Math.sign(p.tx * dz - p.tz * dx) || 1;
    return { i: best, d: Math.sqrt(bestD2), side, s: p.s, curv: p.curv, h: p.h, tx: p.tx, tz: p.tz, px: p.x, pz: p.z };
  }

  // ---------------------------------------------------------- HEIGHT
  heightAt(x, z) {
    return this.heightWithQ(x, z, this.nearestPath(x, z));
  }

  heightWithQ(x, z, q) {
    const base = this.craterGlobal(x, z);
    if (!q) return base;

    // BANKED CHANNEL — a flat racing floor with tall containment walls on
    // BOTH sides. The only way through is along the line: shortcuts are
    // walled off by the shape of the level, not by any penalty.
    const dSigned = q.d * q.side;
    const off = q.d;
    const flat = 8;                                  // flat floor half-width
    // QUARTER-PIPE LIP: floor → smooth rise → vertical tangent at the top,
    // so riding up the bank curls you back in. You can't roll over it; a
    // continued steep climb beyond seals it as the crater wall.
    const lipW = 9, lipH = 11;
    let wallH = 0;
    if (off > flat) {
      const o = Math.min(off - flat, lipW);
      wallH = lipH * (1 - Math.cos((o / lipW) * (Math.PI / 2)));  // vertical at o=lipW
      if (off - flat > lipW) wallH += (off - flat - lipW) * 7;    // wall continues up
    }
    // curvature banks the floor: outer edge lifts, inner drops (held corners)
    const bankAmt = THREE.MathUtils.clamp(-q.curv * 26, -0.8, 0.8);
    const tilt = bankAmt * dSigned * 0.55 * THREE.MathUtils.smoothstep(off, 0.5, flat + 4);
    // PIPE: a wide, deep, rounded U (radius PIPE_R) you can carve loops in
    const pf = this._pipeFactor(q.s);
    if (pf > 0) {
      const PR = Math.min(24, 0.8 / Math.max(0.002, Math.abs(q.curv)));   // ~48m wide, auto-narrow on curves
      const pipeH = off < PR ? (PR - Math.sqrt(PR * PR - off * off)) : (PR + (off - PR) * 4);
      wallH = wallH * (1 - pf) + pipeH * pf;
    }
    const shelf = q.h + wallH + tilt * (1 - pf);

    // off the shelf: raw crater wall + rubble + little impact craterlets
    let wild = base + 1.2 * vnoise(x * 0.02, z * 0.02) + 0.35 * vnoise(x * 0.07, z * 0.07);
    if (q.d > 24) {
      const CC = 26;
      const cgx = Math.floor(x / CC), cgz = Math.floor(z / CC);
      for (let ix = cgx; ix <= cgx + 1; ix++) {
        for (let iz = cgz; iz <= cgz + 1; iz++) {
          const r0 = hash2(ix * 3 + 11, iz * 5 - 7);
          if (r0 < 0.45) continue;
          const ccx = (ix + 0.15 + hash2(ix, iz + 3) * 0.7) * CC;
          const ccz = (iz + 0.15 + hash2(ix + 9, iz) * 0.7) * CC;
          const cr = 3 + r0 * 6, cd = 0.5 + r0 * 1.2;
          const dq = Math.hypot(x - ccx, z - ccz) / cr;
          if (dq < 1) wild -= cd * (1 - dq * dq);
          wild += cd * 0.4 * Math.exp(-Math.pow((dq - 1) * 3.5, 2));
        }
      }
    }

    const w = THREE.MathUtils.smoothstep(off, 30, 48);
    let h = shelf * (1 - w) + wild * w;

    // speed bowls: a deep round well with a raised launching lip
    for (const b of this.bowls) {
      const bdx = x - b.cx, bdz = z - b.cz;
      const bd2 = bdx * bdx + bdz * bdz;
      const lim = b.r * 1.4;
      if (bd2 < lim * lim) {
        const q2 = Math.sqrt(bd2) / b.r;
        if (q2 < 1) h -= b.depth * (1 - q2 * q2);
        h += b.depth * 0.32 * Math.exp(-Math.pow((q2 - 1) * 4, 2));
      }
    }

    // calm spawn pad
    const dHome = Math.hypot(x, z);
    if (dHome < 16) {
      const f = THREE.MathUtils.smoothstep(dHome, 4, 16);
      h = this.path[0].h * (1 - f) + h * f;
    }
    return h;
  }

  normalAt(x, z, out) {
    const e = 1.1;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    out.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
    return out;
  }

  // off the line = off the run. Tight corridor: drifting wide or dropping
  // below the shelf resets — no cutting the switchbacks.
  isOff(x, z, y) {
    const q = this.nearestPath(x, z);
    if (!q) return true;
    return q.d > 34 || y < q.h - 16;
  }

  // ---------------------------------------------------------- MATERIALS
  _materials() {
    this.matMoon = toonMat({ color: 0xcfccdf, rim: 0x8fa6e0, rimStrength: 0.25, steps: 3 });
    this.matMoon.vertexColors = true;
    this.matRock = toonMat({ color: 0x55516e, rim: 0x8fa6e0, rimStrength: 0.5, steps: 3 });
    this.matMonolith = toonMat({ color: 0x16131f, rim: 0xff8a3d, rimStrength: 0.9, steps: 2 });
    this.matStar = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc23a, emissiveIntensity: 2.2, roughness: 0.3 });
    this.matArrow = new THREE.MeshStandardMaterial({ color: 0x0a0e22, emissive: 0xd6e0ff, emissiveIntensity: 1.4 });
    this.matGate = new THREE.MeshStandardMaterial({ color: 0x100d18, emissive: 0xff8a3d, emissiveIntensity: 1.8, roughness: 0.4, metalness: 0.3 });
    this.matFinish = new THREE.MeshStandardMaterial({ color: 0x100d18, emissive: 0xb88aff, emissiveIntensity: 2.2, roughness: 0.4 });
    this.matTunnel = new THREE.MeshStandardMaterial({ color: 0x171426, emissive: 0x2a2647, emissiveIntensity: 0.6, roughness: 0.95, metalness: 0.1, side: THREE.BackSide });
    this.matTunnelLight = new THREE.MeshBasicMaterial({ color: 0x8fb6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false });
    this.matBeacon = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false });
    this.matBeaconFin = new THREE.MeshBasicMaterial({ color: 0xb88aff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false });
    this.matGlowStar = new THREE.MeshBasicMaterial({ color: 0xffd45c, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.matRingStar = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.7 });
  }

  _sharedGeo() {
    this.geoStar = new THREE.OctahedronGeometry(0.7, 0);
    this.geoGlow = new THREE.SphereGeometry(1.0, 14, 14);
    this.geoRing = new THREE.TorusGeometry(1.1, 0.055, 8, 26);
    this.geoRocks = [0, 1, 2].map(() => new THREE.DodecahedronGeometry(1, 1));
    this.geoBeacon = new THREE.CylinderGeometry(0.5, 1.7, 80, 12, 1, true);
    this.geoTunnelRing = new THREE.TorusGeometry(10.2, 0.18, 8, 30);
    this.geoTunnelPortal = new THREE.TorusGeometry(10.8, 0.6, 10, 34);
    this.geoGate = new THREE.TorusGeometry(7.0, 0.6, 12, 48);
    this.geoGateRing = new THREE.TorusGeometry(6.8, 0.42, 14, 56);
    this.geoGateDisc = new THREE.CircleGeometry(6.4, 40);
    this.geoDot = new THREE.CircleGeometry(0.45, 12);
    this.geoMono = new THREE.BoxGeometry(1, 1, 1);
    const s = new THREE.Shape();
    s.moveTo(-1.1, -0.4); s.lineTo(0, 0.55); s.lineTo(1.1, -0.4);
    s.lineTo(1.1, 0.15); s.lineTo(0, 1.1); s.lineTo(-1.1, 0.15); s.closePath();
    this.geoArrow = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false });
  }

  // ---------------------------------------------------------- TERRAIN MESH
  // One uniform grid over the whole crater. High-res where the course
  // runs (tested at 5 points per chunk, so corridor edges never get
  // skipped); low-res everywhere else, slightly oversized and sunk so
  // resolution borders can never open a visible hole.
  _buildTerrain() {
    if (!this._hatch) this._hatch = makeHatchTexture();
    this.matMoon.map = this._hatch;
    this.matRock.map = this._hatch;
    this.matMonolith.map = this._hatch;
    if (this.matTunnel) this.matTunnel.map = this._hatch;

    const CH = 150;
    const EXTENT = 1350;   // C ± 1350 → a 2.7km square of moon
    const c0x = Math.floor((this.C.x - EXTENT) / CH), c1x = Math.floor((this.C.x + EXTENT) / CH);
    const c0z = Math.floor((this.C.z - EXTENT) / CH), c1z = Math.floor((this.C.z + EXTENT) / CH);

    const cLow = new THREE.Color(0x6f6b66);    // shadowed regolith (warm slate)
    const cHigh = new THREE.Color(0xeae7e0);   // sunlit dust
    const cInk = new THREE.Color(0x2e2b26);    // ink, warm-neutral
    const cEmber = new THREE.Color(this.def.tint);
    const col = new THREE.Color();

    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const x0 = cx * CH, z0 = cz * CH;

        // near the course? test centre + corners (this is the hole fix)
        let near = false;
        for (const [px, pz] of [[x0 + CH / 2, z0 + CH / 2], [x0, z0], [x0 + CH, z0], [x0, z0 + CH], [x0 + CH, z0 + CH]]) {
          const q = this.nearestPath(px, pz);
          if (q && q.d < 100) { near = true; break; }
        }

        const segs = near ? 90 : 16;
        const size = near ? CH : CH + 12;     // low-res overlaps its borders
        const sink = near ? 0 : -0.45;        // …and tucks underneath
        const geo = new THREE.PlaneGeometry(size, size, segs, segs);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        const uvs = geo.attributes.uv;
        const colors = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i) + x0 + CH / 2;
          const wz = pos.getZ(i) + z0 + CH / 2;
          const q = this.nearestPath(wx, wz);   // one lookup: height + colour
          const h = this.heightWithQ(wx, wz, q) + sink;
          pos.setY(i, h);
          uvs.setXY(i, wx * (near ? 0.05 : 0.018), wz * (near ? 0.05 : 0.018));

          // smooth tonal ramp with a gentle hand-shaded step on top
          const tone = THREE.MathUtils.clamp((h + this.D + 40) / 380, 0, 1);
          const stepped = Math.floor(tone * 7) / 7;
          col.copy(cLow).lerp(cHigh, tone * 0.7 + stepped * 0.3);
          if (q) {
            const onCourse = 1 - THREE.MathUtils.smoothstep(q.d, RIBBON, BLEND_OUT);
            col.lerp(cEmber, onCourse * 0.24);
          }
          // contour ink every 9 metres — fine pen lines, not zebra stripes
          const f = ((h % 9) + 9) % 9;
          if (f < 0.22) col.lerp(cInk, 0.35);
          col.offsetHSL(0.005, -0.12, (vnoise(wx * 0.31, wz * 0.31) - 0.5) * 0.03);
          colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
        }
        geo.computeVertexNormals();
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        this._chunkGeos.push(geo);
        const mesh = new THREE.Mesh(geo, this.matMoon);
        mesh.position.set(x0 + CH / 2, 0, z0 + CH / 2);
        mesh.receiveShadow = near;
        this.root.add(mesh);
      }
    }
  }

  // ---------------------------------------------------------- PROPS
  _pathPoint(s) {
    const i = THREE.MathUtils.clamp(Math.round(s / 2), 0, this.path.length - 1);
    return this.path[i];
  }

  _star(x, y, z) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.geoStar, this.matStar);
    g.add(core);
    addOutline(core, 1.2);
    const glow = new THREE.Mesh(this.geoGlow, this.matGlowStar);
    g.add(glow);
    const ring = new THREE.Mesh(this.geoRing, this.matRingStar);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.position.set(x, y, z);
    this.root.add(g);
    this.stars.push({ mesh: g, core, ring, collected: false, baseY: y });
  }

  // an arch worth flying through: thin glow ring + inner disc, flanked by
  // leaning monolith pylons on stone pads. Pylons are solid.
  _buildGate(p, th, ringMat, beaconMat, glowHex) {
    const latX = -p.tz, latZ = p.tx;   // lateral (perpendicular to travel)

    const ring = new THREE.Mesh(this.geoGateRing, ringMat);
    ring.position.set(p.x, th + 5.6, p.z);
    ring.rotation.y = Math.atan2(p.tx, p.tz) + Math.PI / 2;
    addOutline(ring, 1.06);
    this.root.add(ring);

    const disc = new THREE.Mesh(
      this.geoGateDisc,
      new THREE.MeshBasicMaterial({ color: glowHex, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false })
    );
    disc.position.copy(ring.position);
    disc.rotation.copy(ring.rotation);
    this.root.add(disc);

    return { ring };   // just the floating arch — no pillars, no rod
  }

  _buildCourseProps() {
    const L = this.pathLength;

    // guide dots hugging the racing line
    for (let s = 12; s < L - 14; s += 7) {
      const p = this._pathPoint(s);
      const dot = new THREE.Mesh(this.geoDot, this.matArrow);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(p.x, this.heightAt(p.x, p.z) + 0.14, p.z);
      this.root.add(dot);
    }
    // chevrons ahead of each hairpin
    for (let i = 4; i < this.path.length - 4; i++) {
      const p = this.path[i];
      if (Math.abs(p.curv) > 0.035 && Math.abs(this.path[i - 4].curv) < 0.012) {
        const m = new THREE.Mesh(this.geoArrow, this.matArrow);
        m.position.set(p.x, this.heightAt(p.x, p.z) + 1.8, p.z);
        m.rotation.y = Math.atan2(p.tx, p.tz) + (p.curv > 0 ? 0.5 : -0.5);
        m.rotation.x = 0.45;
        m.scale.setScalar(0.9);
        this.root.add(m);
        this.arrows.push({ mesh: m, baseY: m.position.y, phase: i });
      }
    }

    // (no fuel gates — the jet runs on a single tank that slowly recharges)

    // FINISH portal — the same arch, in victory violet, slightly grander
    const pe = this._pathPoint(L - 6);
    const th = this.heightAt(pe.x, pe.z);
    const builtF = this._buildGate(pe, th, this.matFinish, this.matBeaconFin, 0xb88aff);
    builtF.ring.scale.setScalar(1.25);
    this.finish = { pos: new THREE.Vector3(pe.x, th + 5.6, pe.z), mesh: builtF.ring };

    // stars: apex line through every turn + a few on the traverses
    for (let i = 6; i < this.path.length - 6; i += 3) {
      const p = this.path[i];
      if (Math.abs(p.curv) > 0.028) {
        const inx = p.x - p.tz * 4 * Math.sign(p.curv);
        const inz = p.z + p.tx * 4 * Math.sign(p.curv);
        if (!this._lastApex || Math.abs(p.s - this._lastApex) > 26) {
          this._lastApex = p.s;
          this._star(inx, this.heightAt(inx, inz) + 1.8, inz);
        }
      }
    }
    for (const f of [0.15, 0.45, 0.55, 0.82, 0.92]) {
      const p = this._pathPoint(L * f);
      this._star(p.x, this.heightAt(p.x, p.z) + 1.8, p.z);
    }
    for (const f of [0.4, 0.72]) {
      const p = this._pathPoint(L * f);
      this._star(p.x, this.heightAt(p.x, p.z) + 8.5, p.z);
    }

    // SPEED BOWL dressing: a golden dotted rim + stars around the wall
    for (const b of this.bowls) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const dx = b.cx + Math.cos(a) * b.r;
        const dz = b.cz + Math.sin(a) * b.r;
        const dot = new THREE.Mesh(this.geoDot, this.matGate);
        dot.rotation.x = -Math.PI / 2;
        dot.scale.setScalar(1.3);
        dot.position.set(dx, this.heightAt(dx, dz) + 0.16, dz);
        this.root.add(dot);
      }
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.5;
        const sx = b.cx + Math.cos(a) * b.r * 0.62;
        const sz = b.cz + Math.sin(a) * b.r * 0.62;
        this._star(sx, this.heightAt(sx, sz) + 1.7, sz);
      }
    }

    // rubble — well outside the rideable channel, decoration only
    for (let s = 20; s < L - 20; s += 15) {
      const p = this._pathPoint(s);
      const side = hash2(Math.round(s), 11) > 0.5 ? 1 : -1;
      const off = 24 + hash2(s, 13) * 16;
      const rx = p.x - p.tz * off * side, rz = p.z + p.tx * off * side;
      const sc = 0.7 + hash2(s, 17) * 1.8;
      const rock = new THREE.Mesh(this.geoRocks[Math.round(s) % 3], this.matRock);
      rock.position.set(rx, this.heightAt(rx, rz) + sc * 0.3, rz);
      rock.scale.set(sc, sc * 0.7, sc);
      rock.rotation.set(hash2(s, 21) * 3, hash2(s, 22) * 3, 0);
      rock.castShadow = true;
      addOutline(rock, 1.07);
      this.root.add(rock);
      this.obstacles.push({ x: rx, z: rz, r: sc * 0.95, yTop: rock.position.y + sc * 0.8 });
    }
  }

  // nearest-obstacle resolution for the ball (deflect, don't stop)
  collideObstacles(pos, vel, radius) {
    let hit = false;
    for (const o of this.obstacles) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const rr = o.r + radius;
      if (pos.y > o.yTop) continue;            // clear over the top
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      pos.x = o.x + nx * rr;
      pos.z = o.z + nz * rr;
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) {
        vel.x -= nx * vn;                       // slide along the surface
        vel.z -= nz * vn;
        vel.multiplyScalar(0.95);               // a scrape costs a little
        hit = true;
      }
    }
    return hit;
  }

  // ---------------------------------------------------------- runtime
  resetRun() {
    for (const s of this.stars) { s.collected = false; s.mesh.visible = true; }
  }

  collectStar(s) { s.collected = true; s.mesh.visible = false; }

  ensure() {}
  cull() {}

  update(dt, t) {
    for (const s of this.stars) {
      if (s.collected) continue;
      s.core.rotation.y += dt * 1.6;
      s.ring.rotation.z += dt * 1.2;
      s.core.scale.setScalar(1 + Math.sin(t * 3 + s.baseY) * 0.1);
      s.mesh.position.y = s.baseY + Math.sin(t * 2 + s.baseY) * 0.25;
    }
    for (const a of this.arrows) {
      a.mesh.position.y = a.baseY + Math.sin(t * 2.2 + a.phase) * 0.3;
    }
    this.matArrow.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.5;
    this.matGate.emissiveIntensity = 1.6 + Math.sin(t * 2.2) * 0.5;
    this.matFinish.emissiveIntensity = 2.0 + Math.sin(t * 2.6) * 0.7;
    if (this.finish) this.finish.mesh.rotation.x = Math.sin(t * 0.8) * 0.05;
  }
}

// procedural hand-hatching texture — layered strokes, fibers, stipple
function makeHatchTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "rgba(40,36,70,0.085)";
  ctx.lineWidth = 1.6;
  for (let i = -S; i < S * 2; i += 13) {
    ctx.beginPath();
    for (let yy = 0; yy <= S; yy += 22) {
      const wob = Math.sin(yy * 0.05 + i * 0.7) * 3.4 + Math.sin(yy * 0.21 + i) * 1.2;
      if (yy === 0) ctx.moveTo(i + wob, yy);
      else ctx.lineTo(i + yy * 0.85 + wob, yy);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(40,36,70,0.045)";
  ctx.lineWidth = 1.2;
  for (let i = -S; i < S * 2; i += 19) {
    ctx.beginPath();
    for (let yy = 0; yy <= S; yy += 26) {
      const wob = Math.cos(yy * 0.06 + i) * 2.8;
      if (yy === 0) ctx.moveTo(i + wob, yy);
      else ctx.lineTo(i - yy * 0.75 + wob, yy);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(34,30,62,0.06)";
  ctx.lineWidth = 1;
  for (let k = 0; k < 900; k++) {
    const x = Math.random() * S, y = Math.random() * S;
    const a = Math.random() * Math.PI, l = 5 + Math.random() * 16;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  for (let k = 0; k < 7000; k++) {
    ctx.fillStyle = `rgba(30,26,60,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1.3, 1.3);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}
