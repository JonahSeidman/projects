// ===========================================================
// engine.js — renderer, camera, bloom post-processing, environment
// ===========================================================
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GradeShader } from "./art.js";

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070514, 0.0013);

    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 6000);
    this.camera.position.set(0, 6, 16);

    this._setupLights();
    this._setupEnvironment();
    this._setupComposer();

    addEventListener("resize", () => this.resize());
  }

  _setupLights() {
    // Key light = the distant sun
    this.sunLight = new THREE.DirectionalLight(0xfff2dc, 1.9);
    this.sunLight.position.set(120, 200, 80);
    this.sunLight.castShadow = true;
    const s = this.sunLight.shadow;
    s.mapSize.set(2048, 2048);
    s.camera.near = 1;
    s.camera.far = 900;
    s.camera.left = -260; s.camera.right = 260;
    s.camera.top = 260; s.camera.bottom = -260;
    s.bias = -0.0006;
    s.normalBias = 0.5;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Cool bounce / fill from the planet side
    this.fill = new THREE.HemisphereLight(0x4a63d8, 0x0a0a18, 0.32);
    this.scene.add(this.fill);

    const rim = new THREE.DirectionalLight(0x6fd6ff, 0.35);
    rim.position.set(-120, 40, -90);
    this.scene.add(rim);
  }

  _setupEnvironment() {
    this.env = new THREE.Group();
    this.scene.add(this.env);

    // --- Gradient sky dome (background) ---
    const skyGeo = new THREE.SphereGeometry(4000, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x010103) },    // near-black zenith
        mid: { value: new THREE.Color(0x060314) },
        bot: { value: new THREE.Color(0x10051e) },
        neb1: { value: new THREE.Color(0x8e2ea0) },   // electric violet
        neb2: { value: new THREE.Color(0x1f6f9e) },   // deep teal
        neb3: { value: new THREE.Color(0xc23d49) },   // crimson ember
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 top, mid, bot, neb1, neb2, neb3;
        // cheap 3D value-noise fbm for soft nebula clouds
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.99, 78.23, 37.71))) * 43758.5); }
        float vnoise(vec3 p){
          vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          float n = mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                            mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                            mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
          return n;
        }
        float fbm(vec3 p){
          float s=0.0, a=0.5;
          for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; }
          return s;
        }
        void main(){
          float h = vPos.y;
          vec3 c = mix(bot, mid, smoothstep(-0.6, 0.05, h));
          c = mix(c, top, smoothstep(0.05, 0.85, h));

          // nebula bands concentrated near the galactic plane
          float band = exp(-pow((h + 0.05) * 2.2, 2.0));
          float n1 = fbm(vPos * 3.0 + 11.0);
          float n2 = fbm(vPos * 5.5 - 4.0);
          float clouds = smoothstep(0.45, 0.95, n1 * 0.7 + n2 * 0.5);
          vec3 neb = neb1 * n1 + neb2 * (1.0 - n2) + neb3 * pow(n2, 3.0);
          c += neb * clouds * band * 0.62;

          // faint dust everywhere
          c += neb2 * fbm(vPos * 8.0) * 0.04;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });
    this.env.add(new THREE.Mesh(skyGeo, skyMat));

    // --- Starfield (two layers) ---
    this.env.add(this._makeStars(2600, 3500, 1.7, 0.9));
    this.env.add(this._makeStars(1400, 2200, 1.1, 0.6));

    // --- Milky-Way band: dense stars hugging a tilted galactic plane ---
    const band = this._makeBandStars(3200, 3200);
    band.rotation.z = 0.5; band.rotation.x = 0.25;
    this.env.add(band);

    // --- Floating dust motes near the play space (parallax life) ---
    this.dust = this._makeDust(900, 700);
    this.scene.add(this.dust);

    // --- The Sun (bloom source) ---
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false })
    );
    sun.position.copy(this.sunLight.position).multiplyScalar(7);
    this.env.add(sun);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(90, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffcf73, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    halo.position.copy(sun.position);
    this.env.add(halo);

    // --- EARTH hanging in the lunar sky ---
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(340, 64, 64),
      new THREE.MeshStandardMaterial({
        map: makeEarthTexture(),
        roughness: 0.75, metalness: 0.0,
        emissive: 0x10243f, emissiveIntensity: 0.55,
        fog: false,
      })
    );
    this.earth.position.set(1300, 540, -1500);   // forward-left of the line of travel
    this.earth.rotation.z = 0.35;
    this.env.add(this.earth);
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(366, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    atmo.position.copy(this.earth.position);
    this.env.add(atmo);

    // distant ringed planet for variety
    const ringed = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xd8a36a, roughness: 1, emissive: 0x402611, emissiveIntensity: 0.3, fog: false })
    );
    ringed.position.set(-1500, 750, 1100);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(150, 230, 64),
      new THREE.MeshBasicMaterial({ color: 0xe8c79a, side: THREE.DoubleSide, transparent: true, opacity: 0.6, fog: false })
    );
    ring.rotation.x = Math.PI * 0.42;
    ring.rotation.y = 0.3;
    ringed.add(ring);
    this.env.add(ringed);
  }

  _makeStars(count, radius, size, brightness) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // distribute on a sphere shell
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.85 + Math.random() * 0.15);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const hue = 0.55 + (Math.random() - 0.5) * 0.18;
      c.setHSL(hue, 0.4, 0.6 + Math.random() * 0.35 * brightness);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0.95, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  // Dense stars concentrated near a plane -> reads as a galactic core/band.
  _makeBandStars(count, radius) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      // bias toward the equatorial band (small |y|)
      const yb = (Math.random() - 0.5);
      const y = Math.sign(yb) * Math.pow(Math.abs(yb), 3.0) * 0.5;
      const rr = Math.sqrt(1 - Math.min(1, y * y));
      const r = radius * (0.85 + Math.random() * 0.15);
      pos[i * 3] = r * rr * Math.cos(theta);
      pos[i * 3 + 1] = r * y;
      pos[i * 3 + 2] = r * rr * Math.sin(theta);
      const warm = Math.random();
      c.setHSL(0.58 - warm * 0.12, 0.5, 0.55 + Math.random() * 0.4);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.4, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0.8, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    }));
  }

  _makeDust(count, spread) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.2) * spread * 1.6;
      pos[i * 3 + 1] = (Math.random() - 0.2) * spread * 0.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x9fc4ff, size: 0.7, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    }));
  }

  _setupComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.42,  // strength
      0.4,   // radius
      0.95   // threshold — only very bright (emissive) things bloom
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setHiRes(on) {
    this.renderer.setPixelRatio(on ? Math.min(devicePixelRatio || 1, 2) : 1);
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  // Keep the sun shadow frustum centered on the player for crisp shadows
  focusShadow(target) {
    this.sunLight.target.position.copy(target);
    const dir = new THREE.Vector3(120, 200, 80).normalize();
    this.sunLight.position.copy(target).addScaledVector(dir, 320);
  }

  render(t = 0) {
    this.grade.uniforms.uTime.value = t;
    if (this.dust) {
      this.dust.rotation.y = t * 0.005;
      this.dust.material.opacity = 0.5 + Math.sin(t * 0.6) * 0.12;
    }
    if (this.earth) this.earth.rotation.y = t * 0.01;
    this.composer.render();
  }
}

// Stylized Earth texture painted on a canvas: oceans, continents, clouds, ice caps.
function makeEarthTexture() {
  const W = 1024, H = 512;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");

  // ocean gradient
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, "#1c4f9e");
  og.addColorStop(0.5, "#2a6fd6");
  og.addColorStop(1, "#1c4f9e");
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);

  // continents: clustered blobby landmasses
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blob = (cx, cy, r, color) => {
    ctx.fillStyle = color;
    const n = 8 + Math.floor(rnd() * 6);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.55 + rnd() * 0.75);
      const x = cx + Math.cos(a) * rr * 1.5;
      const y = cy + Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };
  // major landmasses (greens with desert patches)
  for (let i = 0; i < 9; i++) {
    const cx = rnd() * W;
    const cy = H * 0.22 + rnd() * H * 0.56;
    const r = 36 + rnd() * 64;
    blob(cx, cy, r, "#3e8f4e");
    blob(cx + r * 0.4, cy - r * 0.2, r * 0.45, "#57a85f");
    if (rnd() > 0.55) blob(cx - r * 0.3, cy + r * 0.25, r * 0.35, "#b89e5a");
  }

  // polar ice caps
  ctx.fillStyle = "#eaf4ff";
  ctx.fillRect(0, 0, W, 26);
  ctx.fillRect(0, H - 26, W, 26);
  for (let i = 0; i < 26; i++) {
    blob(rnd() * W, 22 + rnd() * 16, 14 + rnd() * 12, "#eaf4ff");
    blob(rnd() * W, H - 22 - rnd() * 16, 14 + rnd() * 12, "#eaf4ff");
  }

  // cloud streaks (soft white, wide ellipses)
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 42; i++) {
    const cx = rnd() * W, cy = rnd() * H;
    const rw = 30 + rnd() * 90, rh = 6 + rnd() * 12;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, rh / rw);
    ctx.beginPath();
    ctx.arc(0, 0, rw, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
