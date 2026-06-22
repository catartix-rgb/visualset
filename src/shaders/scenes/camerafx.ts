// Camera FX — an INDEPENDENT, modular image-processing chain over the raw webcam.
// Pipeline:  Raw Camera -> [Distort?] -> sample(+chroma) -> Pixel Sort -> Halftone /
//            Dot Matrix -> Dither -> Edge -> Posterize -> Threshold -> Mono ->
//            Scanlines -> CRT -> Bloom -> Film Grain -> Output.
// Every stage is independent (own ON/OFF + params + audio). The global fluid/audio
// distortion is its OWN stage and is OFF by default, so the camera is never forced to
// inherit deformations from the visual engine.
export const CAMERAFX_MAIN = /* glsl */ `
uniform float uDsOn, uDsTouch, uDsBass, uDsJitter;
uniform float uHtOn, uHtSize, uHtAngle, uHtShape, uHtAudio;
uniform float uDmOn, uDmDensity, uDmGlow, uDmAudio;
uniform float uDiOn, uDiAlgo, uDiScale, uDiThresh, uDiContrast, uDiNoise, uDiAudio;
uniform float uEdOn, uEdStrength, uEdThick, uEdGlow, uEdInvert, uEdAudio;
uniform float uPoOn, uPoLevels, uPoAudio;
uniform float uThOn, uThValue, uThSoft, uThInvert, uThAudio;
uniform float uMoOn, uMoTint, uMoGamma;
uniform float uPsOn, uPsAmount, uPsThresh, uPsDir, uPsSpeed;
uniform float uChOn, uChAmount, uChAudio;
uniform float uScOn, uScIntensity, uScSpacing, uScThick;
uniform float uCrtOn, uCrtCurve, uCrtGlow;
uniform float uBlOn, uBlAmount, uBlAudio;
uniform float uGrOn, uGrAmount;

vec2 coverUv(vec2 uv, float ta, float sa){
  vec2 c = uv - 0.5;
  if(sa > ta) c.x *= ta / sa; else c.y *= sa / ta;
  return c + 0.5;
}
float lumc(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float camLum(vec2 q){ return lumc(texture2D(uCam, q).rgb); }

float b2(vec2 p){ p = mod(floor(p), 2.0); return 2.0*p.x + 3.0*p.y - 4.0*p.x*p.y; }
float bayer4(vec2 p){ return (4.0*b2(floor(p/2.0)) + b2(p)) / 16.0; }
float ditherT(vec2 pix, int algo){
  if(algo == 0) return bayer4(pix);
  if(algo == 1) return b2(pix) / 4.0;
  if(algo == 2) return bayer4(pix) * 0.8 + 0.1;
  return hash21(floor(pix));
}

void main(){
  float scr = uRes.x / uRes.y;
  vec2 base = vUv;
  vec2 uv = coverUv(base, 1.3333, scr);

  // ---- CRT barrel curvature (warps the sampled image) ----
  if(uCrtOn > 0.5){
    vec2 cc = uv - 0.5;
    uv = 0.5 + cc * (1.0 + uCrtCurve * dot(cc, cc) * 1.5);
  }

  uv = mirrorUv(uv);

  // ---- optional Distort stage (fluid field + audio) — OFF by default ----
  if(uDsOn > 0.5){
    vec3 tch = touchAt(base);
    uv += tch.rg * uForce * 0.06 * uDsTouch;
    uv.y += sin(uv.x * 34.0 + uTime * 4.0) * uBass * 0.02 * uDsBass;
    uv.x += sin(uv.y * 28.0 - uTime * 3.0) * uBass * 0.015 * uDsBass;
    uv += vec2(snoise(base*9.0+uTime), snoise(base*9.0-uTime)) * uTreble * 0.012 * uDsJitter;
  }

  if(uCamActive < 0.5){
    float g = 0.02 + 0.02 * sin(base.y * 30.0 + uTime);
    gl_FragColor = vec4(vec3(g), 1.0);
    return;
  }

  // ---- chromatic aberration (at sample time) ----
  float chroma = uChOn > 0.5 ? uChAmount * (1.0 + uChAudio * uBass * 2.5) * 0.02 : 0.0;
  vec2 cdir = base - 0.5;
  vec3 cam;
  cam.r = texture2D(uCam, uv + cdir * chroma).r;
  cam.g = texture2D(uCam, uv).g;
  cam.b = texture2D(uCam, uv - cdir * chroma).b;

  // ---- pixel sort (approx): smear toward brightest along a direction ----
  if(uPsOn > 0.5){
    vec2 dir = uPsDir < 0.5 ? vec2(0.0, 1.0)
             : uPsDir < 1.5 ? vec2(0.0, -1.0)
             : uPsDir < 2.5 ? vec2(-1.0, 0.0) : vec2(1.0, 0.0);
    vec2 anim = dir * uPsSpeed * 0.05 * sin(uTime);
    vec3 acc = cam; float best = lumc(cam);
    for(int i=1;i<7;i++){
      vec3 s = texture2D(uCam, uv + dir * float(i) * 0.01 * (0.5 + uPsAmount) + anim).rgb;
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
    vec2 g = fract(rc * cells * vec2(scr, 1.0)) - 0.5;
    float radius = (1.0 - lum) * 0.62 * (0.85 + uBass * uHtAudio);
    int shape = int(uHtShape + 0.5);
    float dsh = shape == 0 ? length(g) : shape == 1 ? max(abs(g.x), abs(g.y)) : abs(g.y);
    float ink = smoothstep(radius, radius - 0.08, dsh);
    col = ramp(0.15 + lum * 0.8) * ink;
  }

  // ---- dot matrix ----
  if(uDmOn > 0.5){
    float grid = uDmDensity + uMid * uDmAudio * 60.0;
    vec2 c = fract(base * grid * vec2(scr, 1.0)) - 0.5;
    float led = smoothstep(0.5, 0.12, length(c));
    col = ramp(lum) * led * (0.5 + lum) * (1.0 + uDmGlow + uBass * uDmAudio);
  }

  // ---- dither ----
  if(uDiOn > 0.5){
    float l = clamp((lum - 0.5) * uDiContrast + 0.5, 0.0, 1.0);
    float thr = ditherT(base * uRes / max(1.0, uDiScale * 2.0), int(uDiAlgo + 0.5));
    float nz = (hash21(base * uRes + uTime) - 0.5) * uDiNoise;
    float th = uDiThresh - uTreble * uDiAudio * 0.3;
    float v = step(th, l + (thr - 0.5) * 0.9 + nz);
    col = mix(vec3(0.015), ramp(0.7 + lum * 0.3), v);
  }

  // ---- edge detection ----
  if(uEdOn > 0.5){
    float e = (1.0 + uEdThick) / uRes.y;
    float gx = camLum(uv + vec2(e,0.0)) - camLum(uv - vec2(e,0.0));
    float gy = camLum(uv + vec2(0.0,e)) - camLum(uv - vec2(0.0,e));
    float edge = clamp(length(vec2(gx,gy)) * (uEdStrength + uTreble * uEdAudio * 8.0), 0.0, 1.0);
    if(uEdInvert > 0.5) edge = 1.0 - edge;
    col = ramp(0.3 + edge * 0.7) * edge * (0.6 + uEdGlow);
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
    col = mix(vec3(0.01), ramp(0.85), v);
  }

  // ---- monochrome (tint + gamma) ----
  if(uMoOn > 0.5){
    float g = pow(clamp(lumc(col), 0.0, 1.0), max(0.1, uMoGamma));
    col = mix(vec3(g), ramp(uMoTint) * g * 2.0, 0.5);
  }

  // ---- scanlines ----
  if(uScOn > 0.5){
    float s = 0.5 + 0.5 * sin(base.y * uScSpacing);
    float line = smoothstep(1.0 - uScThick, 1.0, s);
    col *= 1.0 - uScIntensity * (1.0 - line);
  }

  // ---- CRT glow + vignette ----
  if(uCrtOn > 0.5){
    vec2 cc = base - 0.5;
    col *= smoothstep(0.95, 0.3, length(cc) * 1.4);
    col += col * uCrtGlow * 0.5;
  }

  // ---- bloom (bright-pass blur) ----
  if(uBlOn > 0.5){
    vec3 bl = vec3(0.0);
    for(int i=0;i<8;i++){
      float a = float(i) / 8.0 * 6.2831853;
      bl += max(vec3(0.0), texture2D(uCam, uv + vec2(cos(a), sin(a)) * 0.012).rgb - 0.55);
    }
    col += (bl / 8.0) * (uBlAmount * 4.0) * (1.0 + uBlAudio * uRms * 2.0);
  }

  // ---- film grain ----
  if(uGrOn > 0.5){
    col += (hash21(base * uRes + uTime) - 0.5) * uGrAmount;
  }

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
