// Noise Field — living digital smoke / procedural fluid. Uses two-level domain
// warping (fbm of fbm) so the structure is large, soft and rolling rather than
// high-frequency static. Multiple incommensurate time drifts keep it from looping;
// audio swells and ignites it; the interaction field lets a finger smear the smoke.
export const NOISEFIELD_MAIN = /* glsl */ `
void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);
  p *= (uScale * 0.8 + 0.35);

  float t = uTime * uSpeed * (1.0 + uAToSpeed * uRms);

  // slow non-repeating drift + finger force
  p += vec2(t * 0.03, sin(t * 0.117) * 0.4 + t * 0.011);
  vec3 tch = touchAt(uv);
  vec2 fvel = tch.rg * uForce;
  // currents: the smoke is dragged along the fluid velocity from the finger
  p += fvel * (0.7 + uFlow * 0.4);

  float warp = 1.4 + uDistort * 1.2 + uMid * 1.0 + uCamMotion * 1.5;

  // ---- two-level domain warp (rolling smoke) ----
  vec2 q = vec2(
    fbm(p + t * 0.10, 4),
    fbm(p + vec2(5.2, 1.3) - t * 0.08, 4)
  );
  vec2 r = vec2(
    fbm(p + warp * q + vec2(1.7, 9.2) + t * 0.06, 4),
    fbm(p + warp * q + vec2(8.3, 2.8) - t * 0.05, 4)
  );
  float f = fbm(p + warp * r + t * 0.04, 5);

  // finger interaction: opens tunnels (clears smoke) + injects energy waves
  float fmag = length(fvel);
  float dens = clamp(0.62 + 0.6 * f + uBass * 0.3, 0.0, 1.7);
  dens -= smoothstep(0.3, 1.4, fmag) * 0.7;   // tunnels only on a strong push
  dens += tch.b * uForce * 0.6;               // energy waves
  float detail = length(r);
  float tone = clamp(0.25 + 0.45 * dens + 0.3 * detail + uHue, 0.0, 1.0);

  vec3 col = ramp(tone);
  col = mix(uBg, col, smoothstep(-0.15, 0.7, dens));    // dense, billowing body
  col += ramp(tone) * 0.12 * smoothstep(0.0, 0.5, dens); // ambient smoke fill

  // glowing filaments where the warp folds most (coherent, soft)
  float fil = smoothstep(0.55, 1.2, detail);
  col += ramp(0.92) * fil * uGlow * (0.6 + uTreble * 1.3);
  // touch ripple bloom + beat + bass swell
  col += ramp(0.82) * tch.b * (0.5 + uGlow);
  col += uBeat * ramp(0.85) * 0.18;
  col *= 1.0 + uBass * 0.3;

  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
