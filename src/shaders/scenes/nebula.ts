// Deep-space nebula. Parallax cloud strata with dark dust lanes carved out of bright
// emission (like real astrophotography), a breathing core light source, and a real
// point starfield (cell glints with per-star twinkle) instead of noise speckle.
// Bass swells the emission, treble twinkles the stars, the finger stirs the gas.
export const NEBULA_MAIN = /* glsl */ `
// point stars: one potential star per grid cell, twinkling individually
vec3 starfield(vec2 p, float t, float density){
  vec3 acc = vec3(0.0);
  for(int L=0;L<2;L++){
    float ls = L==0 ? 22.0 : 44.0;      // two size layers
    vec2 g = p * ls;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 rnd = hash22(id + float(L)*17.0);
    if(rnd.x < density){
      vec2 off = (hash22(id+3.7) - 0.5) * 0.8;
      float d = length(f - off);
      float tw = 0.6 + 0.4*sin(t*(2.0+rnd.y*6.0) + rnd.y*40.0);
      float star = exp(-d*d*(L==0? 90.0 : 220.0)) * tw;
      // slight colour variation: cool small stars, warm bright ones
      vec3 sc = mix(vec3(0.7,0.8,1.0), vec3(1.0,0.9,0.75), rnd.y);
      acc += sc * star * (L==0 ? 1.0 : 0.55) * (1.0 + uTreble*1.5);
    }
  }
  return acc;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t  = uTime * uSpeed * 0.35 * (1.0 + uAToSpeed * uRms);
  float sc = uScale * 0.8;

  // finger stirs the gas
  vec3 tch = touchAt(uv);
  vec2 stir = tch.rg * uForce * 0.25;

  vec3 col = uBg * 0.6;

  // ---- layered gas: emission clouds with dust lanes carved out ----
  float glow = 0.0;
  for(int i=0;i<5;i++){
    float fi = float(i);
    float depth = 1.0 + fi*0.55;              // parallax
    vec2 q = p * sc * depth + vec2(t*0.06*(fi+1.0), -t*0.03*fi) + stir/depth;
    q += vec2(fbm(q + t*0.12, 4), fbm(q + 7.0 - t*0.1, 4)) * (0.8 + uDistort*0.8 + uCamMotion);

    float gas  = fbm(q, int(uComplexity));               // emission
    float dust = fbm(q*1.7 + 31.0, 4);                   // absorption
    float em = smoothstep(0.05, 0.75, gas) * (1.0 + uBass*(0.6 + uAToScale));
    float ab = smoothstep(0.25, 0.8, dust) * 0.65;       // dust lanes darken

    float tone = clamp(0.2 + 0.35*gas + 0.16*fi + uHue*0.3, 0.0, 1.0);
    vec3 layer = ramp(tone) * em * (0.55/depth);
    col = col * (1.0 - ab*(0.5/depth)) + layer;          // absorb, then emit
    glow += em * (0.2/depth);
  }

  // ---- breathing core: a light source buried in the gas ----
  vec2 core = vec2(sin(t*0.21)*0.3, cos(t*0.16)*0.22);
  float cd = length(p - core);
  float breathe = 0.8 + 0.2*sin(t*0.9) + uBass*0.8;
  col += ramp(0.85) * exp(-cd*cd*3.5) * breathe * uGlow * 0.9;
  col += ramp(0.95) * exp(-cd*cd*18.0) * breathe * 0.6;

  // ---- stars behind and through the thin gas ----
  vec2 sp = p + stir*0.15;
  col += starfield(sp, uTime, 0.18) * uGlow * smoothstep(1.2, 0.2, glow);

  // touch energy ignites local gas; beat flushes the emission
  col += ramp(0.8) * tch.b * 0.5;
  col += glow * ramp(0.7) * uBeat * 0.5;

  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
