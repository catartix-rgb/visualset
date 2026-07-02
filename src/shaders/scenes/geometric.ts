// Reactive geometry — a precision "instrument face": concentric polygons with soft
// neon halos, orbiting dashed arcs (HUD-like), and a radial spectrum ring where each
// band physically displaces the geometry. Fingers shear the whole construction
// through the interaction field. Elegant line-work over flat fills.
export const GEOMETRIC_MAIN = /* glsl */ `
// signed distance to a regular polygon
float sdPoly(vec2 p, float r, float n, float rota){
  float a = atan(p.y,p.x) + rota;
  float seg = TAU/n;
  float d = cos(floor(0.5 + a/seg)*seg - a) * length(p);
  return d - r;
}

// crisp line with a soft neon halo around it
vec3 neon(float d, vec3 c, float w, float hot){
  float core = smoothstep(w, 0.0, abs(d));
  float halo = exp(-abs(d)*55.0) * 0.35;
  return c * (core * hot + halo);
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);

  // pointer nudges, finger shears via the fluid field
  vec3 tch = touchAt(uv);
  p += (uPointer-0.5) * uPointerDown * 0.4 + tch.rg * uForce * 0.1;
  // subtle radial ripple only — keeps the polygons precise and legible
  p *= 1.0 + uDistort*0.06*sin(length(p)*8.0 - t*2.0);
  p *= 1.0 - uHandExpand*0.25;

  vec3 col = uBg;
  float sides = floor(uSymmetry);
  int layers = int(clamp(uComplexity*2.0, 4.0, 10.0));
  float ang = atan(p.y, p.x);
  float rad = length(p);

  // ---- concentric polygons with neon halos ----
  for(int i=0;i<10;i++){
    if(i>=layers) break;
    float fi = float(i);
    float k = fi/float(layers);
    float r = 0.08 + k*0.55 + uBass*0.18*sin(t+fi);
    float rota = t*(0.15 + 0.08*fi) * (mod(fi,2.0)<1.0 ? 1.0 : -1.0);
    float d = sdPoly(p, r, sides, rota);
    vec3 c = ramp(clamp(0.2 + k*0.6 + uHue*0.3, 0.0, 1.0));
    col += neon(d, c, 0.008, 1.0 + uTreble*2.0) * uGlow;
    col += c * smoothstep(0.02, -0.02, d) * 0.08 * (0.5 + uMid);
  }

  // ---- orbiting dashed arcs (instrument HUD) ----
  for(int j=0;j<3;j++){
    float fj = float(j);
    float ar = 0.3 + fj*0.22;
    float sweep = t*(0.3 + fj*0.17) * (mod(fj,2.0)<1.0 ? 1.0 : -1.0);
    float dash = step(0.5, fract((ang + sweep) * (5.0 + fj*3.0) / TAU * 6.0));
    float arc = smoothstep(0.006, 0.0, abs(rad - ar)) * dash;
    col += ramp(0.75 + fj*0.08) * arc * (0.5 + uMid*1.2) * uGlow;
  }

  // ---- radial spectrum ring: bands displace the circle outward ----
  float band = 0.5 + 0.5*sin(ang*sides*2.0 + t);
  float spec = uBass*0.5 + uMid*0.3*band + uTreble*0.25*(1.0-band);
  float eq = smoothstep(0.010, 0.0, abs(rad - (0.72 + spec*0.12)));
  col += ramp(0.9) * eq * (0.4 + uRms*1.4) * uGlow;

  // central reactive core + touch light
  float core = smoothstep(0.22, 0.0, rad) * (0.35 + uRms*1.3 + uBeat*0.8);
  col += ramp(0.9) * core;
  col += ramp(0.8) * tch.b * 0.4;

  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
