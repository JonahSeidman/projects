// ===========================================================
// player.js — MOMENTUM ENGINE
// Low-gravity ski physics on a heightfield: velocity is projected
// along the surface every frame, gravity pulls you down slopes,
// slides carve without braking, landings keep tangential speed,
// and a fuel-limited jetpack thrusts along your motion.
// ===========================================================
import * as THREE from "three";
import { toonMat, addOutline } from "./art.js";

const UP = new THREE.Vector3(0, 1, 0);
const G = 15;               // gravity — felt on banks, but not glue-heavy
const PH = 1.1;            // ball: centre sits at 0.55
const RUN_T = 12;           // input-driven target speed
const TOP = 60;             // soft top speed (m/s)
const JUMP_V = 12.5;        // raised to match the heavier gravity
const COYOTE = 0.14, BUFFER = 0.12;
const FUEL_MAX = 100;


export class Player {
  constructor(scene, camera, world, input, audio, ui, fx) {
    this.scene = scene;
    this.cam = camera;
    this.world = world;
    this.input = input;
    this.audio = audio;
    this.ui = ui;
    this.fx = fx;

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.grounded = false;
    this.sliding = false;
    this.thrusting = false;
    this.fuel = FUEL_MAX;
    this.coyote = 0;
    this.buffer = 0;
    this.facing = Math.PI / 2;
    this.stepTimer = 0;
    this.normal = new THREE.Vector3(0, 1, 0);

    this.camYaw = -Math.PI / 2;
    this.camPitch = 0.38;
    this._look = new THREE.Vector3();
    this._snap = true;

    this.slowmoT = 0;
    this.fovBase = camera.fov;
    this.fov = camera.fov;
    this.fovKick = 0;
    this._squash = 0;
    this._skidT = 0;
    this._trailT = 0;

    this.score = 0;
    this.onFinish = null;
    this.onFall = null;
    this.onSling = null;
    this.finished = false;
    this.inBowl = false;
    this.orbitT = 0;

    this._buildBall();
    this.reset();
  }

  // ------------------------------------------------- THE BALL
  // The player is an anonymous cel-shaded sphere — a cannonball.
  // A hand-inked pattern makes the roll readable.
  _buildBall() {
    const g = new THREE.Group();
    this.model = g;
    this.scene.add(g);

    const mat = toonMat({ color: 0xffffff, rim: 0xffb454, rimStrength: 0.75, steps: 3 });
    mat.map = makeBallTexture();
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 32), mat);
    this.ballMesh.position.y = 0.55;
    this.ballMesh.castShadow = true;
    addOutline(this.ballMesh, 1.08);
    g.add(this.ballMesh);

    // jet flame — appears opposite the thrust direction
    this.thrust = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.0, 12),
      new THREE.MeshBasicMaterial({ color: 0xffc878, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.thrust.position.y = 0.55;
    g.add(this.thrust);

    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 20),
      new THREE.MeshBasicMaterial({ color: 0x14122a, transparent: true, opacity: 0.34, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);
  }

  // ------------------------------------------------- lifecycle
  reset() {
    this.pos.copy(this.world.spawn);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.sliding = false;
    this.thrusting = false;
    this.fuel = FUEL_MAX;
    this.camYaw = -Math.PI / 2;
    this.facing = Math.PI / 2;
    this.camPitch = 0.38;
    this.score = 0;
    this.finished = false;
    this._snap = true;
    this._skidT = 0; this.slowmoT = 0; this.fovKick = 0;
    this.inBowl = false; this.orbitT = 0; this._bowlEntrySp = 0;
    this._fellFrom = this.pos.y;
    this._renderY = this.pos.y;
    this._wallDrop = false;
    this.locked = true;   // frozen at the start until the player moves
    this.fov = this.fovBase; this.cam.fov = this.fovBase; this.cam.updateProjectionMatrix();
    this.ui.setStars(0);
  }

  // ------------------------------------------------- core update
  update(dt, t) {
    if (this.finished) {
      this.vel.multiplyScalar(Math.exp(-2 * dt));
      this.pos.addScaledVector(this.vel, dt);
      const th = this.world.heightAt(this.pos.x, this.pos.z);
      if (this.pos.y > th) { this.vel.y -= 13.5 * dt; this.pos.y = Math.max(th, this.pos.y + this.vel.y * dt); }
      this._updateModel(dt, t);
      this._updateCamera(dt);
      return;
    }
    const look = this.input.consumeLook();
    this.camYaw -= look.dx;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + look.dy, -0.3, 1.1);

    // hold at the start line — no gravity, no roll — until the first input
    if (this.locked) {
      const a = this.input.moveAxis();
      if (a.x || a.z || this.input.held("Space")) {
        this.locked = false;
      } else {
        this.vel.set(0, 0, 0);
        this.grounded = true;
        this._updateModel(dt, t);
        this._updateCamera(dt);
        return;
      }
    }

    this._move(dt);
    // slow-trickle regen — never permanently empty, but never a full top-up
    if (!this.thrusting) this.fuel = Math.min(FUEL_MAX, this.fuel + 6 * dt);
    this._checkStars();
    this._checkFinish();

    // WIPEOUT only on a hard landing (fell from too high) — leaving the line
    // or dropping off a ledge just lets the fall play out; gentle landings
    // roll on. A deep-void backstop catches anything that falls off the world.
    if (!this.finished) {
      if (this._landImpact > 62) { if (this.onFall) this.onFall("crash"); }   // ~2.6x more grace
      else if (this.pos.y < -420) { if (this.onFall) this.onFall("void"); }
    }

    this._updateModel(dt, t);
    this._updateCamera(dt);
  }

  _wishDir(out) {
    const fwd = tmpA.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = tmpB.crossVectors(fwd, UP).normalize();
    const axis = this.input.moveAxis();
    out.set(0, 0, 0).addScaledVector(fwd, -axis.z).addScaledVector(right, axis.x);
    const has = out.lengthSq() > 0.001;
    if (has) out.normalize();
    return has;
  }

  // rotate velocity toward a wish direction WITHOUT changing its magnitude.
  // Grounded: rotates IN THE SLOPE'S TANGENT PLANE (around the surface
  // normal) so carving never fights the ground projection — zero bleed.
  _redirect(wish, rate, dt, n = UP) {
    const sp = this.vel.length();
    if (sp < 0.5) return;
    // wish projected into the tangent plane
    tmpR1.copy(wish).addScaledVector(n, -wish.dot(n));
    if (tmpR1.lengthSq() < 1e-6) return;
    tmpR1.normalize();
    // velocity direction in the plane
    tmpR2.copy(this.vel).addScaledVector(n, -this.vel.dot(n));
    const vp = tmpR2.length();
    if (vp < 0.5) return;
    tmpR2.multiplyScalar(1 / vp);
    // signed angle around n
    const cross = tmpR3.crossVectors(tmpR2, tmpR1).dot(n);
    const ang = Math.atan2(cross, THREE.MathUtils.clamp(tmpR2.dot(tmpR1), -1, 1));
    this.vel.applyAxisAngle(n, THREE.MathUtils.clamp(ang, -1, 1) * rate * dt);
  }

  // directional thruster — flat boost along your steering (or your line)
  _applyJet(dt, hasWish, wish, want) {
    if (want) {
      const hvSp = Math.hypot(this.vel.x, this.vel.z);
      if (hasWish) {
        tmpC.set(wish.x, 0, wish.z).normalize();
      } else if (hvSp > 2) {
        tmpC.set(this.vel.x / hvSp, 0, this.vel.z / hvSp);
      } else {
        tmpC.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)).normalize();
      }
      this.vel.addScaledVector(tmpC, 9 * dt);   // weak directional shove
      // glide assist applies ONLY to a jump arc — extends jumps over craters.
      // Otherwise the jet is purely a horizontal change-of-momentum tool.
      if (!this.grounded && this._airFromJump) this.vel.y += G * 0.62 * dt;
      this.fuel = Math.max(0, this.fuel - 26 * dt);
      if (!this.thrusting) { this.thrusting = true; this.audio.startJet(); }
      this.audio.updateJet(this.fuel / FUEL_MAX, this.vel.length());
      this.fovKick = Math.min(this.fovKick + 30 * dt, 6);
      this.thrust.material.opacity = 1;
      this._trailT -= dt;
      if (this._trailT <= 0) {
        this._trailT = 0.02;
        this.fx.trail(this._centerXYZ(), 0xffb454, 2.2, 0.45);
      }
    } else if (this.thrusting) {
      this.thrusting = false;
      this.audio.stopJet();
    }
  }

  _move(dt) {
    const w = this.world;
    this._landImpact = 0;          // set on a fresh landing; read by update()
    const hasWish = this._wishDir(tmpD);
    const wish = tmpD;
    this.sliding = this.grounded && this.vel.length() > 6;   // carving is automatic now
    this._spaceHeldT = this.input.held("Space") ? (this._spaceHeldT || 0) + dt : 0;
    this._jumpGrace = Math.max(0, (this._jumpGrace || 0) - dt);

    if (this.grounded) {
      this._airFromJump = false;
      const n = w.normalAt(this.pos.x, this.pos.z, this.normal);

      // NORMAL FORCE ONLY — resist sinking into the surface, but never
      // hold you down. Crest a convex lip at speed and you leave the
      // ground, like real physics. Containment comes from the geometry
      // (the banked lip), not magnetism.
      const vDotN = this.vel.dot(n);
      if (vDotN < 0) this.vel.addScaledVector(n, -vDotN);

      // gravity along the slope — the engine of the whole game
      const gDotN = -G * n.y;
      tmpC.set(0, -G, 0).addScaledVector(n, -gDotN);
      this.vel.addScaledVector(tmpC, dt);

      const sp = this.vel.length();

      // ALWAYS CARVING — the ball is the slide. A/D redirect your line,
      // W pushes when slow, pulling hard against your motion brakes.
      if (hasWish && sp > 1) {
        this._redirect(wish, 1.5 + Math.min(0.9, sp * 0.02), dt, n);
        this._carving = THREE.MathUtils.clamp(
          Math.atan2(wish.x, wish.z) - Math.atan2(this.vel.x, this.vel.z), -1, 1);
      }
      if (hasWish && sp < RUN_T) this.vel.addScaledVector(wish, 20 * dt);
      // ENGINE — holding forward accelerates hard toward the top speed,
      // tapering as you approach it (gravity adds on top going downhill)
      if (hasWish && sp >= RUN_T) {
        const velDir = tmpEng.set(this.vel.x, this.vel.y, this.vel.z).multiplyScalar(1 / Math.max(sp, 0.001));
        this.vel.addScaledVector(velDir, 26 * Math.max(0, 1 - sp / TOP) * dt);
      }

      // RAIL ASSIST — momentum is steered around the curve for free.
      // Hands-off, the line carries you; steering blends with it.
      if (sp > 6) {
        const qRail = w.nearestPath(this.pos.x, this.pos.z);
        if (qRail && qRail.d < 16) {
          const fdot = this.vel.x * qRail.tx + this.vel.z * qRail.tz;
          if (fdot > 0) {
            tmpRail.set(qRail.tx, 0, qRail.tz);
            this._redirect(tmpRail, hasWish ? 0.3 : 0.9, dt, n);
          }
        }
      }

      let brake = 0;
      if (hasWish && sp > 2) {
        const along = (wish.x * this.vel.x + wish.z * this.vel.z) / sp;
        if (along < -0.75) brake = 1.6;   // only a hard pull-back brakes
      }
      // whisper of friction, soft ceiling at TOP — get FAST
      // 60 is the W-on-flat ceiling; downhill/slingshot push toward ~70 terminal
      const overSpd = Math.max(0, sp - 70);
      this.vel.multiplyScalar(Math.exp(-(0.008 + brake + overSpd * 0.1) * dt));

      // ---- SPEED BOWL ORBIT ----
      // Circle the wall of a bowl and centripetal magic pays you speed.
      // The more tangential your motion, the harder it pulls you around.
      const bowl = this.world.bowlAt ? this.world.bowlAt(this.pos.x, this.pos.z) : null;
      if (bowl && !this.inBowl) { this.inBowl = true; this._bowlEntrySp = this.vel.length(); this.orbitT = 0; }
      if (!bowl && this.inBowl) {
        this.inBowl = false;
        const gain = this.vel.length() - this._bowlEntrySp;
        if (this.orbitT > 1.0 && gain > 4) {
          this.fovKick = 9;
          this.slowmoT = 0.08;
          this.fx.ring(this._centerXYZ(), 0xffd45c, 8, 0.6, "free");
          this.fx.burst(this._centerXYZ(), 0xffd45c, 20, 9, 2, 0.6);
          this.audio.collect();
          if (this.onSling) this.onSling(gain);
        }
      }
      if (bowl && bowl.q2 > 0.3 && bowl.q2 < 1.12) {
        const sp2 = this.vel.length();
        if (sp2 > 3) {
          // tangential quality: 1 when circling, 0 when cutting through
          const rx = (this.pos.x - bowl.cx) / (bowl.d || 1);
          const rz = (this.pos.z - bowl.cz) / (bowl.d || 1);
          const radialDot = Math.abs((this.vel.x * rx + this.vel.z * rz) / sp2);
          const tangentQ = 1 - radialDot;
          if (tangentQ > 0.45) {
            const headroom = Math.max(0, 1 - sp2 / 56);
            tmpC.copy(this.vel).multiplyScalar(1 / sp2);
            this.vel.addScaledVector(tmpC, 9.5 * tangentQ * headroom * dt);
            this.orbitT += dt;
            this._trailT -= dt;
            if (this._trailT <= 0) {
              this._trailT = 0.03;
              this.fx.trail(this._centerXYZ(), 0xffd45c, 2.0, 0.45);
            }
          }
        }
      } else if (!bowl) {
        this.orbitT = Math.max(0, this.orbitT - dt * 0.5);
      }

      // GROUND BOOST: keep holding Space (past the jump tap) to burn fuel
      // for raw speed anywhere — one tank, no refills, spend it wisely
      this._applyJet(dt, hasWish, wish, this._spaceHeldT > 0.22 && this.fuel > 0);

      const hv = Math.hypot(this.vel.x, this.vel.z);
      if (hv > 1) this.facing = dampAngle(this.facing, Math.atan2(this.vel.x, this.vel.z), 14, dt);
      else if (hasWish) this.facing = dampAngle(this.facing, Math.atan2(wish.x, wish.z), 14, dt);

      this.coyote = COYOTE;
    } else {
      // -------- airborne --------
      this.vel.y -= G * dt;
      const aSp = this.vel.length();
      if (aSp > 76) this.vel.multiplyScalar(Math.exp(-(aSp - 76) * 0.06 * dt));

      // air control = REDIRECTION first (turn fast, lose nothing),
      // plus a whisper of added accel for fine adjustment
      if (hasWish) {
        this._redirect(wish, this.thrusting ? 4.0 : 1.6, dt);   // jet curves your momentum hard
        this.vel.x += wish.x * 2.5 * dt;
        this.vel.z += wish.z * 2.5 * dt;
      }

      // jetpack in the air: any hold of Space
      this._applyJet(dt, hasWish, wish, this.input.held("Space") && this.fuel > 0 && this.coyote <= 0);
      this.coyote = Math.max(0, this.coyote - dt);
      this.facing = dampAngle(this.facing, Math.atan2(this.vel.x, this.vel.z) || this.facing, 6, dt);
    }

    // jump (buffered + coyote) — preserves all horizontal momentum
    if (this.input.pressed("Space") && (this.grounded || this.coyote > 0)) {
      this.buffer = BUFFER;
    }
    this.buffer -= dt;
    if (this.buffer > 0 && (this.grounded || this.coyote > 0)) {
      const n = this.grounded ? this.normal : UP;
      this.vel.y = Math.max(this.vel.y, JUMP_V * (0.7 + 0.3 * n.y));
      this.vel.addScaledVector(n, 1.6);
      this.grounded = false;
      this._airFromJump = true;        // glide assist allowed for this jump arc
      this.coyote = 0;
      this.buffer = 0;
      this._jumpGrace = 0.18;          // no ground-snap right after takeoff
      this.audio.jump();
      this._squash = -0.14;
      this.fx.dust(this.pos, 0xcdd4e8, 7, 0.8);
    }

    // integrate
    const wasGrounded = this.grounded;
    this.pos.addScaledVector(this.vel, dt);

    // terrain contact + crest snapping
    const th = this.world.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= th) {
      this.pos.y = th;
      const n = this.world.normalAt(this.pos.x, this.pos.z, this.normal);
      const vDotN = this.vel.dot(n);
      if (vDotN < 0) {
        // contact: bend the velocity along the ground, keep its energy
        // (a rail redirects — it doesn't absorb)
        const spPre = this.vel.length();
        this.vel.addScaledVector(n, -vDotN);
        const spPost = this.vel.length();
        if (spPost > 0.2 && spPre > 0.2) {
          // true landings pay a small thump tax; rolling contact pays none
          const keep = wasGrounded ? 1.0 : 0.97;
          this.vel.multiplyScalar(Math.min(spPre / spPost, 1.25) * keep);
        }
        if (!wasGrounded) {
          this._landImpact = this._wallDrop ? 0 : (this._fellFrom - this.pos.y);   // dropping in off a wall is safe
          this._wallDrop = false;
          const impact = Math.min(1, -vDotN / 22);
          if (impact > 0.12) {
            this.audio.land(0.3 + impact * 0.6);
            this._squash = 0.18 + impact * 0.3;
            this.fx.dust(this.pos, 0xc6ccde, 6 + Math.round(impact * 16), 0.8 + impact * 1.5);
            if (impact > 0.45) { this.fx.ring(this.pos, 0xd6e0ff, 4 + impact * 4, 0.5); this.fx.addShake(impact * 0.5); this.fovKick = -6 * impact; }
            this._skidT = 0.6;
          }
        }
      }
      this.grounded = true;
    } else if (wasGrounded && this._jumpGrace <= 0 && this.vel.y < 7.5 &&
               this.pos.y < th + 1.4 + Math.min(2.6, Math.hypot(this.vel.x, this.vel.z) * dt * 1.5)) {
      // FOLLOW THE SURFACE: keep the wheels on the road/bank you're driving
      // across. Not a downward magnet — a real jump (Space, vel.y high) or a
      // genuine kicker launches you clear.
      this.pos.y = th;
      if (this.vel.y < 0) this.vel.y = 0;
      this.grounded = true;
    } else {
      if (this.grounded && this.normal.y < 0.8) this._wallDrop = true;  // left a steep wall
      this.grounded = false;
    }
    // remember the height to measure the next fall from
    if (this.grounded) this._fellFrom = this.pos.y;
    else this._fellFrom = Math.max(this._fellFrom ?? this.pos.y, this.pos.y);

    // solid props: scrape and deflect, never phase through
    if (this.world.collideObstacles && this.world.collideObstacles(this.pos, this.vel, 0.55)) {
      this.fx.sparks(this._centerXYZ(), 0xffd9a0, 8, 7);
      this.fx.addShake(0.15);
      this.audio.step();
    }

    // speed trail when really moving
    const spd = this.vel.length();
    if (spd > 18 && !this.thrusting) {
      this._trailT -= dt;
      if (this._trailT <= 0) {
        this._trailT = 0.03;
        this.fx.trail(this._centerXYZ(), this.sliding ? 0xd6e0ff : 0x9fb8e8, 1.6, 0.4);
      }
    }

    // ground FX while sliding fast
    if (this.grounded && this.sliding && spd > 10) {
      this.stepTimer -= dt * spd;
      if (this.stepTimer <= 0) { this.stepTimer = 5; this.fx.dust(this.pos, 0xb6bdd2, 3, 0.6); }
    }
  }

  _centerXYZ() { return tmpC2.set(this.pos.x, this.pos.y + PH * 0.5, this.pos.z); }

  _checkStars() {
    const c = this._centerXYZ();
    const spd = this.vel.length();
    const rad = spd > 16 ? 3.6 : 2.6;
    for (const s of this.world.stars) {
      if (s.collected) continue;
      const wp = s.mesh.getWorldPosition(tmpF);
      if (c.distanceToSquared(wp) < rad * rad) {
        this.world.collectStar(s);
        this.score++;
        this.audio.collect();
        this.ui.setStars(this.score);
        this.ui.popStar();
        this.fx.burst(wp, 0xffd45c, 22, 8, 1.7, 0.7);
        this.fx.ring(wp, 0xffe9a8, 4, 0.5, "free");
      }
    }
  }

  _checkFinish() {
    const f = this.world.finish;
    if (!f || this.finished) return;
    const qF = this.world.nearestPath(this.pos.x, this.pos.z);
    const reachedEnd = qF && qF.s >= this.world.pathLength - 9;
    if (reachedEnd || this._centerXYZ().distanceTo(f.pos) < 11) {
      this.finished = true;
      this.slowmoT = 0.35;
      this.fovKick = 12;
      this.audio.win();
      this.fx.burst(f.pos, 0xb88aff, 40, 12, 2.4, 0.9);
      this.fx.ring(f.pos, 0xb88aff, 14, 0.8, "free");
      if (this.onFinish) this.onFinish();
    }
  }

  // ------------------------------------------------- visuals
  _updateModel(dt, t) {
    this._squash -= this._squash * Math.min(1, dt * 8);
    const sq = 1 - this._squash * 0.5;
    const st = 1 + this._squash * 0.25;
    // render-Y smoothing: ease the drawn height toward the true physics
    // height so tiny contact pops never read as the ball clipping/jittering.
    if (this._renderY == null || Math.abs(this.pos.y - this._renderY) > 4) this._renderY = this.pos.y;
    else this._renderY += (this.pos.y - this._renderY) * (1 - Math.exp(-26 * dt));
    this.model.position.set(this.pos.x, this._renderY, this.pos.z);
    this.model.scale.set(st, sq, st);

    // rolling: spin about (surface normal × velocity) at v / r.
    // Airborne the spin coasts — a thrown ball keeps turning.
    const axisN = this.grounded ? this.normal : UP;
    tmpRoll.crossVectors(axisN, this.vel);
    if (tmpRoll.lengthSq() > 1e-6) {
      tmpRoll.normalize();
      if (!this._rollAxis) this._rollAxis = tmpRoll.clone();
      this._rollAxis.lerp(tmpRoll, this.grounded ? 0.45 : 0.05).normalize();
    }
    if (this._rollAxis) {
      const spin = (this.grounded ? this.vel.length() : this.vel.length() * 0.5) / 0.55;
      this.ballMesh.rotateOnWorldAxis(this._rollAxis, spin * dt);
    }

    // jet flame opposite the motion
    if (this.thrusting) {
      this.thrust.material.opacity = Math.min(1, this.thrust.material.opacity + dt * 10);
      const v = this.vel.length() || 1;
      this.thrust.position.set(
        -this.vel.x / v * 0.75,
        0.55 - this.vel.y / v * 0.75,
        -this.vel.z / v * 0.75
      );
      // cone points away from travel
      this.thrust.lookAt(
        this.pos.x - this.vel.x,
        this.pos.y + 0.55 - this.vel.y,
        this.pos.z - this.vel.z
      );
      this.thrust.rotateX(-Math.PI / 2);
    } else {
      this.thrust.material.opacity = Math.max(0, this.thrust.material.opacity - dt * 5);
    }

    const groundY = this.world.heightAt(this.pos.x, this.pos.z);
    this.blob.position.set(this.pos.x, groundY + 0.06, this.pos.z);
    const h = Math.max(0, this.pos.y - groundY);
    this.blob.material.opacity = Math.max(0, 0.32 - h * 0.03);
    const bs = 1 - Math.min(0.6, h * 0.04);
    this.blob.scale.set(bs, bs, bs);
  }

  _updateCamera(dt) {
    const spd = this.vel.length();
    const desired = tmpA, lookAt = tmpB;

    // chase: behind velocity when fast, behind camYaw otherwise
    let yaw = this.camYaw;
    if (spd > 14) {
      const vyaw = Math.atan2(-this.vel.x, -this.vel.z);
      // ease the orbit toward the velocity direction
      let d = vyaw - this.camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.camYaw += d * (1 - Math.exp(-1.8 * dt));
      yaw = this.camYaw;
    }

    const dist = 9.8 + Math.min(6, spd * 0.13);
    const pitch = this.camPitch * (this.sliding ? 0.7 : 1);
    const ox = dist * Math.cos(pitch) * Math.sin(yaw);
    const oy = dist * Math.sin(pitch) + (this.sliding ? -0.5 : 0);
    const oz = dist * Math.cos(pitch) * Math.cos(yaw);
    const head = tmpC.set(this.pos.x, this.pos.y + 0.9, this.pos.z);
    desired.set(head.x + ox, head.y + oy, head.z + oz);

    // never let the camera dip under the terrain
    const camGround = this.world.heightAt(desired.x, desired.z);
    if (desired.y < camGround + 1.2) desired.y = camGround + 1.2;

    lookAt.set(
      head.x + this.vel.x * 0.22,
      head.y + this.vel.y * 0.08,
      head.z + this.vel.z * 0.22
    );

    const k = this._snap ? 1 : 1 - Math.exp(-12 * dt);
    this.cam.position.lerp(desired, k);
    this._look.lerp(lookAt, k);

    // FOV: speed is the whole story
    let fovT = this.fovBase + Math.min(26, Math.max(0, spd - 8) * 0.55);
    this.fovKick *= Math.exp(-5.5 * dt);
    fovT += this.fovKick;
    this.fov += (fovT - this.fov) * (1 - Math.exp(-8 * dt));
    if (Math.abs(this.fov - this.cam.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }

    if (this.fx) this.cam.position.add(this.fx.shake);
    this.cam.lookAt(this._look);
    // roll the camera into carves — the 180s feel like leaning into them
    const rollT = (this.sliding && this.grounded) ? -(this._carving || 0) * 0.10 : 0;
    this._camRoll = (this._camRoll || 0) + (rollT - (this._camRoll || 0)) * (1 - Math.exp(-6 * dt));
    this.cam.rotateZ(this._camRoll);
    this._carving = (this._carving || 0) * Math.exp(-4 * dt);
    this._snap = false;
  }
}

// scratch vectors
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpC2 = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpF = new THREE.Vector3();
const tmpR1 = new THREE.Vector3();
const tmpR2 = new THREE.Vector3();
const tmpR3 = new THREE.Vector3();
const tmpRoll = new THREE.Vector3();
const tmpRail = new THREE.Vector3();
const tmpEng = new THREE.Vector3();

// hand-inked ball pattern: ice shell, ink meridian, ember band + dots
function makeBallTexture() {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#e9edfb";
  ctx.fillRect(0, 0, W, H);
  // wobbly ink equator
  ctx.strokeStyle = "#1a1730";
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = H / 2 + Math.sin(x * 0.07) * 4;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  // ember band above the equator
  ctx.fillStyle = "rgba(255,138,61,0.85)";
  ctx.fillRect(0, H * 0.30, W, 14);
  // ink dots on the lower hemisphere
  ctx.fillStyle = "#1a1730";
  for (let k = 0; k < 26; k++) {
    const x = (k / 26) * W + (k % 3) * 7;
    const y = H * 0.72 + ((k * 37) % 30);
    ctx.beginPath();
    ctx.arc(x, y, 7 + (k % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // light hatching for tooth
  ctx.strokeStyle = "rgba(40,36,70,0.12)";
  ctx.lineWidth = 1.2;
  for (let i = -H; i < W; i += 11) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function dampAngle(cur, target, rate, dt) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-rate * dt));
}
