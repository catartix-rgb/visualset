// Simple volumetric raymarch through a morphing gyroid field — abstract "liquid glass"
// 3D forms. Audio modulates the surface frequency and camera distance.
export const RAYMARCH_MAIN = /* glsl */ `
float gyroid(vec3 p, float scale){
  p *= scale;
  return abs(dot(sin(p), cos(p.zxy))) / scale - 0.04;
}

float map(vec3 p, float t){
  p.xy *= rot(t*0.1);
  p.xz *= rot(t*0.13);
  float warp = uDistort*0.5 + uCamMotion;
  p += warp * sin(p.yzx*1.5 + t);
  float g1 = gyroid(p, 1.0 + uBass*1.5);
  float g2 = gyroid(p, 2.0 + uMid*2.0)*0.5;
  return mix(g1, g2, 0.4);
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);

  // hand gesture pulls the camera back (expand) or pushes in (compress)
  vec3 ro = vec3(0.0, 0.0, -3.2 + uBass*0.6 - uHandExpand*1.2);
  vec3 rd = normalize(vec3(p * (uScale*0.8 + 0.4) * (1.0 - uHandExpand*0.25), 1.5));
  rd.xy += (uPointer-0.5)*0.5*uPointerDown;

  float dist = 0.0;
  float acc = 0.0;
  vec3 col = uBg;
  for(int i=0;i<48;i++){
    vec3 pos = ro + rd*dist;
    float d = map(pos, t);
    float glow = 0.012 / (abs(d)+0.02);
    float tone = fract(dist*0.12 + t*0.05 + uHue);
    col += ramp(tone) * glow * (0.06 + uTreble*0.12);
    acc += glow;
    dist += max(0.02, abs(d)*0.8);
    if(dist>6.0) break;
  }

  col *= uGlow*1.4;
  col += uBeat * ramp(0.85) * 0.2;
  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
