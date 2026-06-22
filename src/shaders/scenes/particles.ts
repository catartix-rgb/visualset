import { COMMON_UNIFORMS, COMMON_LIB } from "../common";

// Points advected through a curl-noise flow field, computed entirely on the GPU in
// the vertex shader (stateless, so it stays cheap for 100k+ points). Pointer acts as
// an attractor/repulsor, audio pumps speed/size, camera motion injects turbulence.

const PARTICLE_VERT_MAIN = /* glsl */ `
attribute float aSeed;
varying float vTone;
varying float vAlpha;

void main(){
  float seed = aSeed;
  vec2 base = position.xy; // random in [-1,1]^2

  float t = uTime * uSpeed * 0.5 * (1.0 + uAToSpeed*uRms);
  float scl = uScale * (0.8 + uBass*0.6);

  // integrate a few curl steps along the field (looping flow)
  vec2 p = base * scl + seed*6.2831;
  vec2 vel = vec2(0.0);
  for(int i=0;i<4;i++){
    vec2 f = curl(p*1.3 + t*0.4);
    vel += f;
    p += f * 0.15;
  }
  vec2 pos = base + vel * uFlow * 0.12 * (1.0 + uMid*0.8);
  pos += curl(base*3.0 + t) * (uDistort*0.1 + uCamMotion*0.25);

  // wrap to keep the field full
  pos = mod(pos + 1.0, 2.0) - 1.0;

  // pointer attraction / repulsion (down = attract, treble = repel pulse)
  vec2 m = (uPointer - 0.5) * 2.0;
  vec2 d = m - pos;
  float dist = length(d) + 1e-3;
  float attract = uPointerDown * 0.25 / (dist*dist + 0.05);
  pos += normalize(d) * attract;
  pos -= normalize(d) * uBeat * 0.05 / (dist + 0.2);

  float speed = length(vel);
  vTone = clamp(speed*0.5 + uTreble*0.4 + seed*0.2, 0.0, 1.0);
  vAlpha = 0.35 + uRms*0.5 + uBeat*0.3;

  // aspect-corrected clip position
  float aspect = uRes.x / uRes.y;
  vec2 ndc = vec2(pos.x / max(aspect,1.0), pos.y * min(aspect,1.0));
  gl_Position = vec4(ndc, 0.0, 1.0);

  float sizeBase = 2.0 + uGlow*3.0 + uBass*6.0 + speed*4.0;
  gl_PointSize = sizeBase * (uRes.y/1080.0) * (0.6 + vAlpha);
}
`;

const PARTICLE_FRAG_MAIN = /* glsl */ `
varying float vTone;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = ramp(vTone) * (1.0 + uGlow);
  gl_FragColor = vec4(col, a * vAlpha);
}
`;

export const PARTICLE_VERT = COMMON_UNIFORMS + COMMON_LIB + PARTICLE_VERT_MAIN;
export const PARTICLE_FRAG = COMMON_UNIFORMS + COMMON_LIB + PARTICLE_FRAG_MAIN;
