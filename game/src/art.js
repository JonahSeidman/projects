// ===========================================================
// art.js — shared art direction: palette, cel ramp, post-grade shader
// "Sunset Cosmos" — deep indigo space, coral/peach warmth, cyan edges.
// ===========================================================
import * as THREE from "three";

export const PALETTE = {
  space0: 0x05060f,
  space1: 0x140a2e,
  space2: 0x0b1740,
  coral: 0xff7a59,
  peach: 0xffb27a,
  cyan: 0x5cc8ff,
  teal: 0x47e0c8,
  gold: 0xffd45c,
  mint: 0x47e0a0,
  violet: 0x9b7bff,
  pink: 0xff8bd0,
  moon: 0xc4c1d8,
  rock: 0x9b93b4,
};

// A small N-band gradient texture for cel / toon shading.
let _rampCache = {};
export function toonRamp(steps = 4) {
  if (_rampCache[steps]) return _rampCache[steps];
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    // ease the ramp so the lit band dominates and shadows stay rich
    const v = Math.pow(i / (steps - 1), 0.85);
    const c = Math.round(40 + v * 215);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = c;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  _rampCache[steps] = tex;
  return tex;
}

// Cel-shaded material with a soft fresnel rim baked in via onBeforeCompile.
export function toonMat({ color = 0xffffff, rim = 0x6fd6ff, rimStrength = 0.6, steps = 4, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonRamp(steps),
    emissive,
    emissiveIntensity,
  });
  const rimCol = new THREE.Color(rim);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimCol };
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform vec3 uRimColor;
         uniform float uRimStrength;`
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         float rim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
         rim = pow(rim, 2.5) * uRimStrength;
         gl_FragColor.rgb += uRimColor * rim;`
      );
  };
  m.customProgramCacheKey = () => "toonRim" + rimStrength.toFixed(2);
  return m;
}

// Ink outline via inverted hull — the classic hand-drawn silhouette.
const _outlineMat = new THREE.MeshBasicMaterial({ color: 0x050409, side: THREE.BackSide });
export function addOutline(mesh, scale = 1.07) {
  const hull = new THREE.Mesh(mesh.geometry, _outlineMat);
  hull.scale.setScalar(scale);
  mesh.add(hull);
  return hull;
}

// ---- Cinematic post-process: grade + vignette + grain + chromatic aberration
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uVignette: { value: 0.7 },
    uGrain: { value: 0.045 },   // paper tooth
    uAberration: { value: 0.6 },
    uShadowTint: { value: new THREE.Color(0x0a1430) },
    uHighlightTint: { value: new THREE.Color(0xffe9c8) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uSpeed, uVignette, uGrain, uAberration;
    uniform vec3 uShadowTint, uHighlightTint;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main(){
      vec2 uv = vUv;

      // hand-drawn "line boil": tiny uv wobble stepped at ~8fps
      float bt = floor(uTime * 8.0) / 8.0;
      uv += vec2(
        sin(uv.y * 60.0 + bt * 37.0),
        cos(uv.x * 55.0 + bt * 41.0)
      ) * 0.0012;

      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // chromatic aberration grows toward the edges, and with speed
      float spd = clamp(uSpeed / 60.0, 0.0, 1.0);
      vec2 dir = c * (0.0016 * uAberration) * (0.4 + r2 * 2.0) * (1.0 + spd * 2.4);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir).b;

      // luma-based split tone (cool shadows, warm highlights)
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 tint = mix(uShadowTint, uHighlightTint, smoothstep(0.0, 0.9, l));
      col = mix(col, col * tint * 2.0, 0.18);

      // cel posterize — flatten tones toward animation cells
      col = mix(col, floor(col * 7.0 + 0.5) / 7.0, 0.6);

      // punchy contrast, crushed blacks (Batman Beyond ink)
      col = mix(vec3(l), col, 1.22);
      col = (col - 0.5) * 1.16 + 0.47;

      // vignette — constant, gentle. (No speed/turn darkening; the motion
      // cue lives entirely in the edge aberration above.)
      float vig = smoothstep(0.95, 0.25, r2 * 1.9);
      col *= mix(1.0, vig, uVignette * 0.6);

      // animated film grain
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      col += g * uGrain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
