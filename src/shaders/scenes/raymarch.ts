// Volumetric raymarch through a morphing gyroid lattice — "liquid glass" architecture.
// A light source buried in the lattice illuminates nearby filaments (inverse-square),
// colour follows the field coherently (no fract banding), and depth fog gives real
// scale. Audio: bass swells the lattice + light, mids morph the frequency, treble
// sparkles the filaments. Fingers bend the structure through the interaction field.
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
  float g1 = gyroid(p, 1.0 + uBass*1.2);
  float g2 = gyroid(p, 2.0 + uMid*2.0)*0.5;
  return mix(g1, g2, 0.4 + 0.2*sin(t*0.23));
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);

  // finger bends the ray -> the whole lattice leans away from your touch
  vec3 tch = touchAt(uv);

  // hand gesture pulls the camera back (expand) or pushes in (compress)
  vec3 ro = vec3(0.0, 0.0, -3.2 + uBass*0.6 - uHandExpand*1.2);
  vec3 rd = normalize(vec3(p * (uScale*0.8 + 0.4) * (1.0 - uHandExpand*0.25), 1.5));
  rd.xy += (uPointer-0.5)*0.5*uPointerDown + tch.rg*uForce*0.06;

  // wandering light inside the lattice
  vec3 lightP = vec3(sin(t*0.4)*1.2, cos(t*0.3)*0.9, sin(t*0.27)*1.0);
  float lPow = 0.6 + uBass*1.6 + uBeat*0.8;

  float dist = 0.0;
  vec3 col = uBg * 0.5;
  for(int i=0;i<48;i++){
    vec3 pos = ro + rd*dist;
    float d = map(pos, t);
    float glow = 0.012 / (abs(d)+0.02);

    // coherent tone from the position field, not ray distance -> no banding
    float tone = clamp(0.35 + 0.3*sin(pos.x*0.7 + pos.y*0.5 + t*0.15) + uHue*0.3, 0.0, 1.0);
    // inverse-square light: filaments near the buried light ignite
    float lt = lPow / (1.0 + dot(pos - lightP, pos - lightP)*1.8);
    float fog = exp(-dist*0.16);

    col += ramp(tone) * glow * (0.10 + uTreble*0.14) * fog;
    col += ramp(0.88) * glow * lt * 0.11 * fog;

    dist += max(0.02, abs(d)*0.8);
    if(dist>6.0) break;
  }

  col *= uGlow*1.7;
  col += ramp(0.8) * tch.b * 0.4;   // touch light
  col += uBeat * ramp(0.85) * 0.15;
  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
