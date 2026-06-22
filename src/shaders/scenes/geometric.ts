// Reactive geometry: concentric rotating polygons / rings that pulse with the beat.
export const GEOMETRIC_MAIN = /* glsl */ `
// signed distance to a regular polygon
float sdPoly(vec2 p, float r, float n, float rota){
  float a = atan(p.y,p.x) + rota;
  float seg = TAU/n;
  float d = cos(floor(0.5 + a/seg)*seg - a) * length(p);
  return d - r;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);
  p += (uPointer-0.5) * uPointerDown * 0.4;
  p *= 1.0 + uDistort*0.3*sin(length(p)*8.0 - t*2.0);

  vec3 col = uBg;
  float sides = floor(uSymmetry);
  int layers = int(clamp(uComplexity*2.0, 4.0, 10.0));

  for(int i=0;i<10;i++){
    if(i>=layers) break;
    float fi = float(i);
    float k = fi/float(layers);
    float r = 0.08 + k*0.55 + uBass*0.15*sin(t+fi);
    float rota = t*(0.2 + 0.1*fi) * (mod(fi,2.0)<1.0 ? 1.0 : -1.0);
    float d = sdPoly(p, r, sides, rota);
    float line = smoothstep(0.012, 0.0, abs(d));
    float fill = smoothstep(0.02, -0.02, d) * 0.12;
    vec3 c = ramp(fract(k + t*0.05 + uHue));
    col += c * line * (1.0 + uTreble*2.0) * uGlow;
    col += c * fill * (0.5 + uMid);
  }

  // central reactive core
  float core = smoothstep(0.25, 0.0, length(p)) * (0.4 + uRms*1.5 + uBeat);
  col += ramp(0.9) * core;

  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
