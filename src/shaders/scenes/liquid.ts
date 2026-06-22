// Liquid metal / metaballs: animated organic blobs with a chrome-like ramp.
// Pointer drops a blob; bass swells the surface tension.
export const LIQUID_MAIN = /* glsl */ `
float metaballs(vec2 p, float t){
  float v = 0.0;
  for(int i=0;i<7;i++){
    float fi = float(i);
    vec2 c = vec2(
      sin(t*0.6 + fi*1.7) * 0.7,
      cos(t*0.5 + fi*2.3) * 0.7
    ) * (0.6 + 0.4*sin(fi));
    float r = 0.12 + 0.08*sin(t + fi) + uBass*0.12;
    v += r*r / (dot(p-c, p-c) + 0.001);
  }
  // pointer blob
  vec2 m = (uPointer - 0.5) * 2.0;
  m.x *= uRes.x/uRes.y;
  v += (0.05 + uPointerDown*0.15) / (dot(p-m,p-m)+0.002);
  return v;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0) * (uScale*0.9+0.5);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);
  p += vec2(fbm(p+t*0.3,3), fbm(p-t*0.2,3)) * uDistort * 0.4;

  float v = metaballs(p, t);
  float surf = smoothstep(1.0, 2.4, v);

  // fake normal from gradient for chrome highlights
  float e = 0.01;
  float dx = metaballs(p+vec2(e,0.0),t) - metaballs(p-vec2(e,0.0),t);
  float dy = metaballs(p+vec2(0.0,e),t) - metaballs(p-vec2(0.0,e),t);
  vec2 n = normalize(vec2(dx,dy)+1e-5);

  float fres = pow(1.0 - surf, 2.0);
  float spec = pow(max(0.0, n.x*0.6 + n.y*0.4 + 0.3), 8.0);

  vec3 col = mix(uBg, ramp(0.5 + n.x*0.5), surf);
  col += ramp(fract(0.6 + n.y*0.3 + t*0.05)) * surf * (0.5+uMid);
  col += spec * ramp(0.95) * (1.0 + uTreble*2.0) * uGlow;
  col += fres * ramp(0.2) * 0.3;
  col += uBeat * surf * 0.2;

  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
