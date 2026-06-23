// Clay Morphing / Digital Clay — a living soft-matter sculpture with three modes:
//   0 Sculpture     raymarched smooth-min metaballs you sculpt with your hands
//   1 Clay Camera   your segmented body reconstructed as a clay relief (no background)
//   2 Clay Halftone the clay body, its surface built from halftone dots (screenprint)
// Mass is conserved: hands DENT and displace the clay (dimple + surrounding bulge),
// they never carve it away. Audio drives it hard: bass separates/inflates/pulses the
// masses, mids reorganise the morph, treble vibrates the surface. With no sound it
// settles into a stable sculpture; with sound it comes alive (energy envelope).
export const CLAY_MAIN = /* glsl */ `
uniform float uMaterial;
uniform float uClaySoft;
uniform float uClayDetail;
uniform float uClayMode;
uniform vec4 uHand0;
uniform vec4 uHand1;
uniform float uHandCount;

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0 - h);
}
float lumc(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 coverUv(vec2 uv, float ta, float sa){
  vec2 c = uv - 0.5;
  if(sa > ta) c.x *= ta / sa; else c.y *= sa / ta;
  return c + 0.5;
}
float h31(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)), h31(i+vec3(1,0,0)), f.x),
                 mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x),
                 mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z);
}

// shared material shading for both the 3D sculpture and the relief modes
vec3 shadeMat(vec3 n, vec3 v, vec3 l, float ao, vec3 pos){
  float diff = max(dot(n, l), 0.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 refl = reflect(-v, n);
  float env = 0.5 + 0.5*refl.y;
  float spec = pow(max(dot(refl, l), 0.0), 32.0);
  int M = int(uMaterial + 0.5);
  vec3 col;
  if(M == 0){
    col = ramp(0.35)*(0.28 + 0.72*diff)*ao + fres*ramp(0.7)*0.12;
  } else if(M == 1){
    float sss = pow(max(0.0, dot(n, -l)*0.5 + 0.5), 2.0);
    col = ramp(0.6)*(0.4 + 0.5*diff)*ao + sss*ramp(0.85)*0.4 + spec*0.2 + fres*0.1;
  } else if(M == 2 || M == 6){
    col = ramp(clamp(env, 0.0, 1.0))*(0.3 + 0.7*diff) + spec*ramp(0.97)*(M == 6 ? 3.0 : 1.8) + fres*ramp(0.9)*0.6;
    col *= ao;
  } else if(M == 3){
    float sss = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    col = ramp(0.5)*0.4*ao + fres*ramp(0.85)*0.8 + sss*ramp(0.7)*0.5 + spec*0.6;
  } else if(M == 4){
    float veins = n3(pos*6.0);
    col = mix(ramp(0.15), ramp(0.5), veins)*(0.3 + 0.7*diff)*ao*(1.0 + uBass*0.3) + fres*ramp(0.25)*0.3;
  } else {
    float crack = pow(n3(pos*4.0 + uTime*0.2), 2.0);
    vec3 hot = ramp(0.95)*(1.0 + uBass*2.0);
    col = ramp(0.05)*(0.2 + 0.5*diff)*ao + hot*smoothstep(0.4, 0.85, crack)*1.6 + fres*hot*0.2;
  }
  return col * (0.8 + uGlow*0.6) + uBeat*ramp(0.85)*0.12;
}

// ---------- 3D sculpture field ----------
float clayMap(vec3 p){
  float life = uEnergy;
  float t = uTime * uSpeed;
  float ta = t * (0.12 + life*0.7);          // motion sleeps without sound
  p.xz *= rot(t*0.12);
  p.yz *= rot(t*0.08);

  float pulse = 1.0 + (uBass*0.5 + uBeat*0.2) * life;
  float ex = 1.0 + uHandExpand*0.45;
  float sep = 1.0 + uBass*0.8*life;           // bass separates the masses
  float k = uClaySoft * (1.0 + max(0.0, uHandExpand)*1.4) + 0.05;
  float morph = 0.5 + 0.5*sin(ta*0.8 + uMid*5.0);

  float d = 1e5;
  for(int i=0;i<7;i++){
    float fi = float(i);
    vec3 cA = vec3(sin(ta*1.1+fi*1.7), cos(ta*0.9+fi*2.3), sin(ta*0.7+fi*0.9)) * 0.65;
    float ang = fi/7.0*6.2831853 + ta*0.3;
    vec3 cB = vec3(cos(ang), sin(ang)*0.6, sin(ta*0.5+fi)) * 0.95;
    vec3 c = mix(cA, cB, morph) * ex * sep;
    float r = (0.30 + 0.12*sin(ta*1.3 + fi*2.0)) * pulse * ex;
    d = smin(d, length(p - c) - r, k);
  }
  d = smin(d, length(p) - 0.45*pulse*ex, k);

  // hands DENT the clay without removing it: dimple in + surrounding bulge (mass kept)
  for(int i=0;i<2;i++){
    if(float(i) >= uHandCount) continue;
    vec4 hand = i == 0 ? uHand0 : uHand1;
    vec3 fp = vec3(hand.xy * 1.3, 0.0);
    float closed = 1.0 - hand.z;
    float press = 0.22 + closed*0.2 + hand.w*0.15;
    float dd = length(p - fp);
    float dimple = exp(-dd*dd*9.0);
    float ring = exp(-pow(dd - 0.42, 2.0)*13.0);
    d += (dimple - ring*0.55) * press;
    d += sin(dd*16.0 - t*10.0) * 0.015 * exp(-dd*3.0) * (0.4 + hand.w);
  }

  d += (n3(p*3.0 + ta) * 2.0 - 1.0) * (0.02 + (uTreble*0.06 + uClayDetail*0.05) * (0.4 + life));
  return d / ex;
}
vec3 clayNormal(vec3 p){
  vec2 e = vec2(0.0016, 0.0);
  return normalize(vec3(
    clayMap(p+e.xyy) - clayMap(p-e.xyy),
    clayMap(p+e.yxy) - clayMap(p-e.yxy),
    clayMap(p+e.yyx) - clayMap(p-e.yyx)
  ));
}

// ---------- camera clay relief (modes 1 & 2) ----------
float reliefH(vec2 sc, float scr){
  vec2 muv = mirrorUv(coverUv(sc, 1.3333, scr));
  float mask = smoothstep(0.35, 0.65, maskAt(muv));
  float lum = lumc(texture2D(uCam, muv).rgb);
  float h = mask * (0.4 + lum*0.6);
  // claymation lumps + audio: bass inflates, treble adds surface texture
  h += mask * (n3(vec3(sc*7.0, uTime*0.3))*2.0 - 1.0) * (0.05 + uClayDetail*0.06 + uTreble*0.05*uEnergy);
  h += mask * uBass*0.18*uEnergy;
  // finger presses dent the relief (mass kept — just pushed in)
  for(int i=0;i<2;i++){
    if(float(i) >= uHandCount) continue;
    vec4 hand = i == 0 ? uHand0 : uHand1;
    vec2 hp = hand.xy*0.5 + 0.5;
    float dd = length((sc - hp) * vec2(scr, 1.0));
    h -= exp(-dd*dd*40.0) * (0.18 + (1.0-hand.z)*0.15) * mask;
  }
  return max(h, 0.0);
}

void main(){
  vec2 uv = vUv;
  float scr = uRes.x / uRes.y;
  vec3 col = uBg;
  vec3 l = normalize(vec3(0.5, 0.8, -0.6));

  int mode = int(uClayMode + 0.5);

  if(mode == 0){
    // ---- raymarched sculpture ----
    vec2 p = (uv - 0.5) * vec2(scr, 1.0);
    vec3 ro = vec3(0.0, 0.0, -3.2);
    vec3 rd = normalize(vec3(p * (uScale*0.55 + 0.8), 1.6));
    float tt = 0.0, steps = 0.0; bool hit = false;
    for(int i=0;i<88;i++){
      float d = clayMap(ro + rd*tt);
      if(d < 0.0014){ hit = true; break; }
      tt += d*0.85; steps += 1.0;
      if(tt > 8.0) break;
    }
    if(hit){
      vec3 pos = ro + rd*tt;
      vec3 n = clayNormal(pos);
      float ao = clamp(1.0 - steps/88.0, 0.0, 1.0);
      col = shadeMat(n, -rd, l, ao, pos);
      col = mix(col, uBg, smoothstep(3.2, 7.0, tt));
    }
  } else {
    // ---- camera clay relief (segmented body, background removed) ----
    float e = 1.6 / uRes.y;
    float hC = reliefH(uv, scr);
    if(hC > 0.002){
      float hx = reliefH(uv + vec2(e,0.0), scr) - reliefH(uv - vec2(e,0.0), scr);
      float hy = reliefH(uv + vec2(0.0,e), scr) - reliefH(uv - vec2(0.0,e), scr);
      float bump = 7.0 + uGlow*3.0;
      vec3 n = normalize(vec3(-hx*bump*40.0, -hy*bump*40.0, 1.0));
      vec3 pos = vec3((uv-0.5)*3.0, hC*2.0);
      col = shadeMat(n, vec3(0,0,1), l, clamp(0.55 + hC, 0.0, 1.0), pos);

      if(mode == 2){
        // surface BUILT from halftone dots — the print is part of the clay material
        float lum = clamp(hC*1.4, 0.0, 1.0);
        float cells = (120.0 + uMid*uEnergy*80.0);
        vec2 g = fract(uv * cells * vec2(scr, 1.0)) - 0.5;
        float radius = (1.0 - lum) * 0.6 * (0.85 + uBass*0.6);
        float ink = smoothstep(radius, radius - 0.1, length(g));
        // modulate the clay shading by the dot pattern (ink keeps lighting, gaps -> paper)
        vec3 paper = ramp(0.05);
        col = mix(paper, col * (0.6 + 0.6*ink), ink);
      }
    }
  }

  col = grade(col, uv);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
