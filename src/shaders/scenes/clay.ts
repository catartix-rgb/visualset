// Clay Morphing / Digital Clay — a raymarched metaball sculpture that behaves like a
// living soft substance. Smooth-min blended spheres merge, separate, stretch and
// collapse while morphing between configurations. Hands are the primary tool: the
// index fingers press dents and ripples into the surface, an open palm / hands apart
// expands and stretches it into filaments, a fist / hands together compresses it.
// Bass pulses the whole mass, mids reorganise it, treble adds surface detail. Several
// materials (clay, wax, mercury, gelatin, biological, lava, chrome) reshade the look.
export const CLAY_MAIN = /* glsl */ `
uniform float uMaterial;
uniform float uClaySoft;
uniform float uClayDetail;
uniform vec4 uHand0;
uniform vec4 uHand1;
uniform float uHandCount;

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0 - h);
}
float smax(float a, float b, float k){ return -smin(-a, -b, k); }

float h31(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)), h31(i+vec3(1,0,0)), f.x),
                 mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x),
                 mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z);
}

float clayMap(vec3 p){
  float t = uTime * uSpeed * 0.4;
  p.xz *= rot(t*0.15);
  p.yz *= rot(t*0.1);

  float pulse = 1.0 + uBass*0.35*(0.5 + uAToScale) + uBeat*0.1; // bass inflates the mass
  float ex = 1.0 + uHandExpand*0.45;                            // hands expand/compress
  float k = uClaySoft * (1.0 + max(0.0, uHandExpand)*1.4) + 0.05; // stretch -> filaments
  float morph = 0.5 + 0.5*sin(t*0.5 + uMid*4.5);               // mids reorganise

  float d = 1e5;
  for(int i=0;i<7;i++){
    float fi = float(i);
    vec3 cA = vec3(sin(t*1.1+fi*1.7), cos(t*0.9+fi*2.3), sin(t*0.7+fi*0.9)) * 0.65;
    float ang = fi/7.0*6.2831853 + t*0.3;
    vec3 cB = vec3(cos(ang), sin(ang)*0.6, sin(t*0.5+fi)) * 0.95;
    vec3 c = mix(cA, cB, morph) * ex;
    float r = (0.30 + 0.12*sin(t*1.3 + fi*2.0)) * pulse * ex;
    d = smin(d, length(p - c) - r, k);
  }
  d = smin(d, length(p) - 0.45*pulse*ex, k);

  // hands press into the clay (dents + ripples) — feels like touching real clay
  for(int i=0;i<2;i++){
    if(float(i) >= uHandCount) continue;
    vec4 hand = i == 0 ? uHand0 : uHand1;
    vec3 fp = vec3(hand.xy * 1.3, 0.0);
    float closed = 1.0 - hand.z;
    float dent = 0.16 + closed*0.18 + hand.w*0.12;
    d = smax(d, -(length(p - fp) - dent), 0.16);
    float dd = length(p - fp);
    d += sin(dd*16.0 - t*10.0) * 0.02 * exp(-dd*3.0) * (0.5 + hand.w);
  }

  // organic skin detail (treble vibrates the surface)
  d += (n3(p*3.0 + t) * 2.0 - 1.0) * (0.025 + uTreble*0.05 + uClayDetail*0.05);
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

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  vec3 ro = vec3(0.0, 0.0, -3.2);
  vec3 rd = normalize(vec3(p * (uScale*0.55 + 0.8), 1.6));

  float tt = 0.0;
  float steps = 0.0;
  bool hit = false;
  for(int i=0;i<88;i++){
    vec3 pos = ro + rd*tt;
    float d = clayMap(pos);
    if(d < 0.0014){ hit = true; break; }
    tt += d*0.85;
    steps += 1.0;
    if(tt > 8.0) break;
  }

  vec3 col = uBg;
  if(hit){
    vec3 pos = ro + rd*tt;
    vec3 n = clayNormal(pos);
    vec3 v = -rd;
    vec3 l = normalize(vec3(0.5, 0.8, -0.6));
    float diff = max(dot(n, l), 0.0);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 refl = reflect(-v, n);
    float env = 0.5 + 0.5*refl.y;
    float spec = pow(max(dot(refl, l), 0.0), 32.0);
    float ao = clamp(1.0 - steps/88.0, 0.0, 1.0);

    int M = int(uMaterial + 0.5);
    if(M == 0){              // CLAY — matte, soft
      vec3 base = ramp(0.35);
      col = base*(0.28 + 0.72*diff)*ao + fres*ramp(0.7)*0.12;
    } else if(M == 1){       // WAX — soft translucency
      float sss = pow(max(0.0, dot(n, -l)*0.5 + 0.5), 2.0);
      col = ramp(0.6)*(0.4 + 0.5*diff)*ao + sss*ramp(0.85)*0.4 + spec*0.2 + fres*0.1;
    } else if(M == 2 || M == 6){ // MERCURY / CHROME — liquid metal
      col = ramp(clamp(env, 0.0, 1.0))*(0.3 + 0.7*diff)
          + spec*ramp(0.97)*(M == 6 ? 3.0 : 1.8) + fres*ramp(0.9)*0.6;
      col *= ao;
    } else if(M == 3){       // GELATIN — jiggly translucent
      float sss = pow(1.0 - max(dot(n, v), 0.0), 2.0);
      col = ramp(0.5)*0.4*ao + fres*ramp(0.85)*0.8 + sss*ramp(0.7)*0.5 + spec*0.6;
    } else if(M == 4){       // BIOLOGICAL — veiny, pulsing
      float veins = n3(pos*6.0);
      vec3 base = mix(ramp(0.15), ramp(0.5), veins);
      col = base*(0.3 + 0.7*diff)*ao*(1.0 + uBass*0.3) + fres*ramp(0.25)*0.3;
    } else {                 // LAVA — dark crust + emissive cracks
      float crack = pow(n3(pos*4.0 + uTime*0.2), 2.0);
      vec3 hot = ramp(0.95)*(1.0 + uBass*2.0);
      col = ramp(0.05)*(0.2 + 0.5*diff)*ao + hot*smoothstep(0.4, 0.85, crack)*1.6 + fres*hot*0.2;
    }

    col *= 0.8 + uGlow*0.6;
    col += uBeat*ramp(0.85)*0.12;
    col = mix(col, uBg, smoothstep(3.2, 7.0, tt)); // depth fade
  }

  col = grade(col, uv);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
