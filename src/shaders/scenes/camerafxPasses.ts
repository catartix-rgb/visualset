// Modular Camera FX as a chain of independent single-effect PASSES. Each effect reads
// a generic input texture (uTex = the previous pass's result) and writes a full image,
// so effects can be freely enabled, combined AND reordered (Halftone->Dither looks
// different from Dither->Halftone). The base pass produces the raw camera; everything
// else is opt-in. Driven by CameraFXScene which ping-pongs FBOs in the user's order.
import { COMMON_UNIFORMS, COMMON_LIB } from "../common";
import type { CamFxStage } from "@/lib/fx";

const DECL = /* glsl */ `
uniform sampler2D uTex;
uniform vec4 uHand0;
uniform float uDsTouch, uDsBass, uDsJitter;
uniform float uHtSize, uHtAngle, uHtShape, uHtAudio;
uniform float uHtDepth, uHtCenterSize, uHtEdgeSize, uHtFalloff;
uniform float uHtFocusR, uHtFocusSoft, uHtFocusMode, uHtFocusX, uHtFocusY;
uniform float uDmDensity, uDmGlow, uDmAudio;
uniform float uDiAlgo, uDiScale, uDiThresh, uDiContrast, uDiNoise, uDiAudio;
uniform float uEdStrength, uEdThick, uEdGlow, uEdInvert, uEdAudio;
uniform float uPoLevels, uPoAudio;
uniform float uThValue, uThSoft, uThInvert, uThAudio;
uniform float uMoTint, uMoGamma;
uniform float uPsAmount, uPsThresh, uPsMode, uPsLength, uPsAngle, uPsSpeed, uPsDensity, uPsBright, uPsColor, uPsMotion, uPsAudio;
uniform float uChAmount, uChAudio;
uniform float uScIntensity, uScSpacing, uScThick;
uniform float uCrtCurve, uCrtGlow;
uniform float uBlAmount, uBlAudio;
uniform float uGrAmount;

float lumc(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 coverUv(vec2 uv, float ta, float sa){
  vec2 c = uv - 0.5;
  if(sa > ta) c.x *= ta / sa; else c.y *= sa / ta;
  return c + 0.5;
}
float b2c(vec2 p){ p = mod(floor(p), 2.0); return 2.0*p.x + 3.0*p.y - 4.0*p.x*p.y; }
float bayer4(vec2 p){ return (4.0*b2c(floor(p/2.0)) + b2c(p)) / 16.0; }
float ditherT(vec2 pix, int algo){
  if(algo == 0) return bayer4(pix);
  if(algo == 1) return b2c(pix) / 4.0;
  if(algo == 2) return bayer4(pix) * 0.8 + 0.1;
  return hash21(floor(pix));
}
vec3 src(vec2 uv){ return texture2D(uTex, uv).rgb; }
`;

const build = (main: string) => COMMON_UNIFORMS + COMMON_LIB + DECL + main;

// ---- base: raw camera, cover-fitted + mirrored (the start of every chain) ----
export const CAMFX_BASE = build(/* glsl */ `
void main(){
  float scr = uRes.x / uRes.y;
  vec2 uv = mirrorUv(coverUv(vUv, 1.3333, scr));
  vec3 col;
  if(uCamActive < 0.5){
    float g = 0.02 + 0.02 * sin(vUv.y * 30.0 + uTime);
    col = vec3(g);
  } else {
    col = texture2D(uCam, uv).rgb;
  }
  gl_FragColor = vec4(col, 1.0);
}
`);

const EFFECTS: Record<CamFxStage, string> = {
  distort: build(/* glsl */ `
    void main(){
      vec2 uv = vUv;
      vec3 tch = touchAt(vUv);
      uv += tch.rg * uForce * 0.06 * uDsTouch;
      uv.y += sin(uv.x * 34.0 + uTime * 4.0) * uBass * 0.02 * uDsBass;
      uv.x += sin(uv.y * 28.0 - uTime * 3.0) * uBass * 0.015 * uDsBass;
      uv += vec2(snoise(vUv*9.0+uTime), snoise(vUv*9.0-uTime)) * uTreble * 0.012 * uDsJitter;
      uv = 0.5 + (uv - 0.5) * (1.0 - uHandExpand * 0.25);
      gl_FragColor = vec4(src(uv), 1.0);
    }`),

  halftone: build(/* glsl */ `
    void main(){
      float lum = lumc(src(vUv));
      float scr = uRes.x / uRes.y;

      float sizeLocal;
      if(uHtDepth > 0.5){
        // Depth / Focus Halftone: pick the focus point (center / mouse / finger / manual)
        vec2 fc = vec2(0.5);
        int fm = int(uHtFocusMode + 0.5);
        if(fm == 1) fc = uPointer;                 // mouse
        else if(fm == 2) fc = uHand0.xy * 0.5 + 0.5; // index fingertip
        else if(fm == 3) fc = vec2(uHtFocusX, uHtFocusY);
        // aspect-correct distance to focus; bass expands the focus radius
        float fd = length((vUv - fc) * vec2(scr, 1.0));
        float fr = uHtFocusR * (1.0 + uBass * uHtAudio * 0.8);
        float t = pow(clamp(smoothstep(fr - uHtFocusSoft, fr + uHtFocusSoft, fd), 0.0, 1.0), max(0.2, uHtFalloff));
        // big dots near focus, fine dots toward the edges; treble sharpens the detail
        sizeLocal = mix(uHtCenterSize * (1.0 + uBass * uHtAudio * 0.2), uHtEdgeSize, t);
        sizeLocal = clamp(sizeLocal - t * uTreble * uHtAudio * 0.1, 0.04, 1.0);
      } else {
        sizeLocal = clamp(uHtSize + uBass * uHtAudio * 0.5, 0.05, 1.0);
      }

      // bigger size -> fewer/larger cells; smaller -> denser/finer (density rises at edges)
      float cells = mix(230.0, 40.0, sizeLocal);
      vec2 rc = (vUv - 0.5); rc *= rot(uHtAngle); rc += 0.5;
      vec2 g = fract(rc * cells * vec2(scr, 1.0)) - 0.5;
      float radius = (1.0 - lum) * 0.62 * (0.85 + uBass * uHtAudio);
      int shape = int(uHtShape + 0.5);
      float dsh = shape == 0 ? length(g) : shape == 1 ? max(abs(g.x), abs(g.y)) : abs(g.y);
      float ink = smoothstep(radius, radius - 0.08, dsh);
      gl_FragColor = vec4(ramp(0.15 + lum * 0.8) * ink, 1.0);
    }`),

  dotmatrix: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv); float lum = lumc(s);
      float scr = uRes.x / uRes.y;
      float grid = uDmDensity + uMid * uDmAudio * 60.0;
      vec2 c = fract(vUv * grid * vec2(scr, 1.0)) - 0.5;
      float led = smoothstep(0.5, 0.12, length(c));
      gl_FragColor = vec4(ramp(lum) * led * (0.5 + lum) * (1.0 + uDmGlow + uBass * uDmAudio), 1.0);
    }`),

  dither: build(/* glsl */ `
    void main(){
      float lum = lumc(src(vUv));
      float l = clamp((lum - 0.5) * uDiContrast + 0.5, 0.0, 1.0);
      float thr = ditherT(vUv * uRes / max(1.0, uDiScale * 2.0), int(uDiAlgo + 0.5));
      float nz = (hash21(vUv * uRes + uTime) - 0.5) * uDiNoise;
      float th = uDiThresh - uTreble * uDiAudio * 0.3;
      float v = step(th, l + (thr - 0.5) * 0.9 + nz);
      gl_FragColor = vec4(mix(vec3(0.015), ramp(0.7 + lum * 0.3), v), 1.0);
    }`),

  edge: build(/* glsl */ `
    void main(){
      float e = (1.0 + uEdThick) / uRes.y;
      float gx = lumc(src(vUv + vec2(e,0.0))) - lumc(src(vUv - vec2(e,0.0)));
      float gy = lumc(src(vUv + vec2(0.0,e))) - lumc(src(vUv - vec2(0.0,e)));
      float edge = clamp(length(vec2(gx,gy)) * (uEdStrength + uTreble * uEdAudio * 8.0), 0.0, 1.0);
      if(uEdInvert > 0.5) edge = 1.0 - edge;
      gl_FragColor = vec4(ramp(0.3 + edge * 0.7) * edge * (0.6 + uEdGlow), 1.0);
    }`),

  posterize: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv);
      float levels = max(2.0, floor(uPoLevels + uMid * uPoAudio * 4.0));
      gl_FragColor = vec4(floor(s * levels) / levels, 1.0);
    }`),

  threshold: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv);
      float th = uThValue - uBeat * uThAudio * 0.25;
      float v = smoothstep(th - uThSoft, th + uThSoft, lumc(s));
      if(uThInvert > 0.5) v = 1.0 - v;
      gl_FragColor = vec4(mix(vec3(0.01), ramp(0.85), v), 1.0);
    }`),

  mono: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv);
      float g = pow(clamp(lumc(s), 0.0, 1.0), max(0.1, uMoGamma));
      gl_FragColor = vec4(mix(vec3(g), ramp(uMoTint) * g * 2.0, 0.5), 1.0);
    }`),

  pixelsort: build(/* glsl */ `
    // sort criterion: brightness, optionally biased toward colour intensity
    float psScore(vec3 c){ return mix(lumc(c), max(max(c.r, c.g), c.b), uPsColor); }

    void main(){
      vec3 s0 = src(vUv);
      int mode = int(uPsMode + 0.5);
      vec2 cen = vUv - 0.5;
      float motion = motionAt(vUv);

      // ---- sort direction per mode ----
      vec2 dir;
      if(mode == 0) dir = vec2(1.0, 0.0);                 // horizontal
      else if(mode == 1) dir = vec2(0.0, 1.0);            // vertical
      else if(mode == 2) dir = normalize(cen + 1e-4);     // radial
      else if(mode == 3){ float a = uPsAngle * 6.2831853 + uMid * uPsAudio * 3.0; dir = vec2(cos(a), sin(a)); } // directional (+mid bends it)
      else if(mode == 4) dir = normalize(curl(vUv * 3.0 + uTime * 0.2 * uPsSpeed) + 1e-4); // noise driven
      else {                                              // motion driven: follow silhouette flow
        float e = 2.0 / uRes.y;
        vec2 g = vec2(motionAt(vUv + vec2(e,0.0)) - motionAt(vUv - vec2(e,0.0)),
                      motionAt(vUv + vec2(0.0,e)) - motionAt(vUv - vec2(0.0,e)));
        dir = normalize(g + vec2(0.0001, 1.0));
      }

      // ---- streak length: base + bass (audio) + local motion (silhouette) ----
      float baseScore = psScore(s0);
      float len = uPsLength * (0.15 + uPsDensity)
                * (1.0 + uBass * uPsAudio * 1.6)
                * (1.0 + motion * uPsMotion * 4.0)
                * (0.4 + baseScore * uPsBright * 1.6);
      // animate the read offset so streaks flow / sweep over time
      vec2 phase = dir * sin(uTime * uPsSpeed + vUv.y * 20.0) * 0.004 * uPsSpeed;

      // march back along the direction, carrying the brightest sample inside a span
      // that stays above threshold; crossing threshold ends the span (fragmentation).
      vec3 acc = s0; float best = baseScore; float cont = 1.0;
      for(int i = 1; i < 28; i++){
        float fi = float(i) / 28.0;
        vec2 uv2 = vUv - dir * fi * len + phase;
        // treble adds organic jitter perpendicular to the sort -> finer fragmentation
        uv2 += vec2(-dir.y, dir.x) * snoise(vUv * 60.0 + uTime) * uTreble * uPsAudio * 0.006;
        vec3 s = src(uv2);
        float sc = psScore(s);
        cont *= step(uPsThresh, sc + 0.001);   // span ends once below threshold
        if(cont > 0.5 && sc > best){ best = sc; acc = s; }
      }

      // sorted pixels only replace the image where the span criterion is met
      float k = uPsAmount * smoothstep(uPsThresh - 0.05, uPsThresh + 0.05, baseScore + motion * uPsMotion);
      gl_FragColor = vec4(mix(s0, acc, k), 1.0);
    }`),

  chroma: build(/* glsl */ `
    void main(){
      vec2 d = vUv - 0.5;
      float amt = uChAmount * (1.0 + uChAudio * uBass * 2.5) * 0.02;
      vec3 c;
      c.r = src(vUv + d * amt).r;
      c.g = src(vUv).g;
      c.b = src(vUv - d * amt).b;
      gl_FragColor = vec4(c, 1.0);
    }`),

  scan: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv);
      float sl = 0.5 + 0.5 * sin(vUv.y * uScSpacing);
      float line = smoothstep(1.0 - uScThick, 1.0, sl);
      gl_FragColor = vec4(s * (1.0 - uScIntensity * (1.0 - line)), 1.0);
    }`),

  crt: build(/* glsl */ `
    void main(){
      vec2 cc = vUv - 0.5;
      vec2 uv = 0.5 + cc * (1.0 + uCrtCurve * dot(cc, cc) * 1.5);
      vec3 s = src(uv);
      s *= smoothstep(0.95, 0.3, length(cc) * 1.4);
      s += s * uCrtGlow * 0.5;
      if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) s = vec3(0.0);
      gl_FragColor = vec4(s, 1.0);
    }`),

  bloom: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv);
      vec3 bl = vec3(0.0);
      for(int i=0;i<8;i++){
        float a = float(i) / 8.0 * 6.2831853;
        bl += max(vec3(0.0), src(vUv + vec2(cos(a), sin(a)) * 0.012) - 0.55);
      }
      gl_FragColor = vec4(s + (bl / 8.0) * (uBlAmount * 4.0) * (1.0 + uBlAudio * uRms * 2.0), 1.0);
    }`),

  grain: build(/* glsl */ `
    void main(){
      vec3 s = src(vUv);
      gl_FragColor = vec4(s + (hash21(vUv * uRes + uTime) - 0.5) * uGrAmount, 1.0);
    }`),
};

export const CAMFX_EFFECTS = EFFECTS;
