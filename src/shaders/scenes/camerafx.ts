// Camera FX — a modular, stackable image-processing chain over the live webcam.
// Every stage is independent and toggleable with its own parameters, audio routing,
// and reacts to the fluid interaction field (finger pushes/ripples the image).
// Stages, applied in order: chroma sample -> pixel sort -> halftone/dot-matrix ->
// dither -> edge -> posterize -> threshold -> mono -> scanlines/CRT -> bloom -> grain.
export const CAMERAFX_MAIN = /* glsl */ `
uniform float uHtOn, uHtSize, uHtAngle, uHtShape, uHtAudio;
uniform float uDmOn, uDmDensity, uDmGlow, uDmAudio;
uniform float uDiOn, uDiAlgo, uDiScale, uDiThresh, uDiAudio;
uniform float uEdOn, uEdStrength, uEdGlow, uEdInvert, uEdAudio;
uniform float uPoOn, uPoLevels, uPoAudio;
uniform float uThOn, uThValue, uThSoft, uThInvert, uThAudio;
uniform float uMoOn, uMoTint, uMoGamma;
uniform float uPsOn, uPsAmount, uPsThresh;
uniform float uChOn, uChAmount, uChAudio;
uniform float uScOn, uScIntensity, uScCount, uScCrt;
uniform float uBlOn, uBlAmount, uBlAudio;
uniform float uGrOn, uGrAmount;

float lumc(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float camLum(vec2 q){ return lumc(texture2D(uCam, q).rgb); }

// ordered-dither thresholds without dynamic indexing
float b2(vec2 p){ p = mod(floor(p), 2.0); return 2.0*p.x + 3.0*p.y - 4.0*p.x*p.y; } // 0..3
float bayer4(vec2 p){ return (4.0*b2(floor(p/2.0)) + b2(p)) / 16.0; }
float ditherT(vec2 pix, int algo){
  if(algo == 0) return bayer4(pix);
  if(algo == 1) return b2(pix) / 4.0;                  // ordered 2x2
  if(algo == 2) return bayer4(pix) * 0.8 + 0.1;        // atkinson-ish
  return hash21(floor(pix));                            // random
}

void main(){
  vec2 base = vUv;
  vec2 uv = mirrorUv(base);
  float t = uTime * uSpeed;
  float aspect = uRes.x / uRes.y;

  // ---- fluid interaction + audio acting physically on the image ----
  vec3 tch = touchAt(base);
  vec2 fvel = tch.rg * uForce;
  uv += fvel * 0.06;                                   // finger drags the image
  uv += normalize(fvel + 1e-4) * tch.b * 0.03;         // ripples
  uv.y += sin(uv.x * 34.0 + t * 4.0) * uBass * 0.02;   // bass standing waves
  uv.x += sin(uv.y * 28.0 - t * 3.0) * uBass * 0.015;
  uv += vec2(snoise(base*9.0+t), snoise(base*9.0-t)) * uTreble * 0.012;

  if(uCamActive < 0.5){
    float n = fbm(base * 3.0 + t * 0.2, 4);
    vec3 ph = mix(uBg, ramp(0.4 + 0.3*n), 0.25 + 0.2*n);
    gl_FragColor = vec4(grade(ph, base), 1.0);
    return;
  }

  // ---- chromatic aberration at sample time ----
  float chroma = uChOn > 0.5 ? uChAmount * (1.0 + uChAudio * uBass * 2.5) * 0.02 : 0.0;
  vec2 cdir = (base - 0.5);
  vec3 cam;
  cam.r = texture2D(uCam, uv + cdir * chroma).r;
  cam.g = texture2D(uCam, uv).g;
  cam.b = texture2D(uCam, uv - cdir * chroma).b;

  // ---- pixel sort (approx): smear upward toward brightest in column ----
  if(uPsOn > 0.5){
    vec3 acc = cam; float best = lumc(cam);
    for(int i=1;i<6;i++){
      vec2 q = uv + vec2(0.0, float(i) * 0.01 * uPsAmount);
      vec3 s = texture2D(uCam, q).rgb;
      float lz = lumc(s);
      if(lz > uPsThresh && lz > best){ best = lz; acc = s; }
    }
    cam = mix(cam, acc, uPsAmount);
  }

  float lum = lumc(cam);
  vec3 col = cam;

  // ---- halftone ----
  if(uHtOn > 0.5){
    float size = clamp(uHtSize + uBass * uHtAudio * 0.5, 0.05, 1.0);
    float cells = mix(230.0, 45.0, size);
    vec2 rc = (base - 0.5); rc *= rot(uHtAngle); rc += 0.5;
    vec2 cell = rc * cells * vec2(aspect, 1.0);
    vec2 g = fract(cell) - 0.5;
    float radius = (1.0 - lum) * 0.62 * (0.85 + uBass * uHtAudio);
    float dsh;
    int shape = int(uHtShape + 0.5);
    if(shape == 0) dsh = length(g);
    else if(shape == 1) dsh = max(abs(g.x), abs(g.y));
    else dsh = abs(g.y);
    float ink = smoothstep(radius, radius - 0.08, dsh);
    col = ramp(0.15 + lum * 0.8) * ink;
  }

  // ---- dot matrix (LED panel) ----
  if(uDmOn > 0.5){
    float grid = uDmDensity + uMid * uDmAudio * 60.0;
    vec2 c = fract(base * grid * vec2(aspect, 1.0)) - 0.5;
    float led = smoothstep(0.5, 0.12, length(c));
    col = ramp(lum) * led * (0.5 + lum) * (1.0 + uDmGlow + uBass * uDmAudio);
  }

  // ---- dither ----
  if(uDiOn > 0.5){
    float thr = ditherT(base * uRes / max(1.0, uDiScale * 2.0), int(uDiAlgo + 0.5));
    float th = uDiThresh - uTreble * uDiAudio * 0.3;
    float v = step(th, lum + (thr - 0.5) * 0.9);
    col = mix(uBg, ramp(0.7 + lum * 0.3), v);
  }

  // ---- edge detection (sobel-ish) ----
  if(uEdOn > 0.5){
    float e = 1.4 / uRes.y;
    float gx = camLum(uv + vec2(e,0.0)) - camLum(uv - vec2(e,0.0));
    float gy = camLum(uv + vec2(0.0,e)) - camLum(uv - vec2(0.0,e));
    float edge = clamp(length(vec2(gx,gy)) * (uEdStrength + uTreble * uEdAudio * 8.0), 0.0, 1.0);
    if(uEdInvert > 0.5) edge = 1.0 - edge;
    vec3 ecol = ramp(0.3 + edge * 0.7) * edge * (0.6 + uEdGlow);
    col = mix(col, ecol, 0.85);
  }

  // ---- posterize ----
  if(uPoOn > 0.5){
    float levels = max(2.0, floor(uPoLevels + uMid * uPoAudio * 4.0));
    col = floor(col * levels) / levels;
  }

  // ---- threshold ----
  if(uThOn > 0.5){
    float th = uThValue - uBeat * uThAudio * 0.25;
    float v = smoothstep(th - uThSoft, th + uThSoft, lumc(col));
    if(uThInvert > 0.5) v = 1.0 - v;
    col = mix(uBg, ramp(0.85), v);
  }

  // ---- monochrome (tint + gamma) ----
  if(uMoOn > 0.5){
    float g = pow(clamp(lumc(col), 0.0, 1.0), max(0.1, uMoGamma));
    col = mix(vec3(g), ramp(uMoTint) * g * 2.0, 0.5);
  }

  // ---- scanlines / CRT ----
  if(uScOn > 0.5){
    if(uScCrt > 0.5){
      vec2 cc = base - 0.5;
      col *= smoothstep(0.9, 0.35, length(cc) * 1.4);   // vignette
    }
    float sl = 0.5 + 0.5 * sin(base.y * uScCount);
    col *= 1.0 - uScIntensity * (1.0 - sl);
  }

  // ---- bloom (bright-pass blur) ----
  if(uBlOn > 0.5){
    vec3 bl = vec3(0.0);
    for(int i=0;i<8;i++){
      float a = float(i) / 8.0 * 6.2831853;
      vec2 o = vec2(cos(a), sin(a)) * 0.012;
      vec3 s = texture2D(uCam, uv + o).rgb;
      bl += max(vec3(0.0), s - 0.55);
    }
    bl /= 8.0;
    col += bl * (uBlAmount * 4.0) * (1.0 + uBlAudio * uRms * 2.0);
  }

  // ---- film grain ----
  if(uGrOn > 0.5){
    col += (hash21(base * uRes + uTime) - 0.5) * uGrAmount;
  }

  // touch ripple highlight + beat bloom on top of everything
  col += ramp(0.9) * tch.b * 0.5;
  col += uBeat * ramp(0.85) * 0.12;

  col *= 0.75 + uGlow * 0.6;
  col = grade(col, base);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
