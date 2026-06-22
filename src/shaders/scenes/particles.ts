import { COMMON_UNIFORMS, COMMON_LIB } from "../common";

// Evolutionary particle flow. Each point continuously morphs between procedural
// 3D shapes (cloud, sphere, tunnel, organism, galaxy, lattice), driven on the GPU.
// Two-hand gestures and audio sculpt the field: open palms repel, fists attract,
// spreading expands, rotation spins, circular motion swirls into a vortex. The
// mid-morph window injects turbulence so structures fragment then re-gather — the
// system should feel alive.

const PARTICLE_VERT_MAIN = /* glsl */ `
attribute float aId;    // 0..1 ordered index
attribute float aSeed;  // per-particle random

uniform float uMorph;     // 0..1 blend A->B
uniform float uShapeA;
uniform float uShapeB;
uniform float uFieldRotX;
uniform float uFieldRotY;
uniform float uFieldScale;
uniform float uVortex;
uniform float uExplosion;
uniform float uLife;      // audio energy envelope 0..1 (0 = asleep/stable, 1 = fully alive)
uniform vec4  uHand0;     // xy ndc, z open, w speed
uniform vec4  uHand1;
uniform float uHandCount;

varying float vTone;
varying float vAlpha;
varying float vDepth;

const float TAUc = 6.28318530718;

float h11(float p){ return hash11(p); }
vec3 rand3(float s){ return vec3(h11(s*1.1), h11(s*2.7), h11(s*4.3))*2.0-1.0; }

vec3 shapePos(float shape, float id, float seed, vec3 cloud, float t){
  int s = int(shape + 0.5);

  // fibonacci-sphere direction reused by several shapes
  float phi = id * 2.39996323 * 64.0;
  float y = 1.0 - 2.0*id;
  float rr = sqrt(max(0.0, 1.0 - y*y));
  vec3 sph = vec3(cos(phi)*rr, y, sin(phi)*rr);

  if(s == 0){ // CLOUD — turbulent volumetric drift
    vec3 p = cloud * 1.15;
    p += 0.35*vec3(snoise(p.xy*1.5+t), snoise(p.yz*1.5-t), snoise(p.zx*1.5+t));
    return p;
  }
  if(s == 1){ // SPHERE — clean shell
    return sph * (1.0 + 0.02*seed);
  }
  if(s == 2){ // TUNNEL — tube scrolling along z
    float a = id * TAUc * 18.0;
    float rad = 0.7 + 0.12*snoise(vec2(a*0.3, t));
    float z = fract(id*97.0 + t*0.15)*2.0 - 1.0;
    return vec3(cos(a)*rad, sin(a)*rad, z*1.6);
  }
  if(s == 3){ // ORGANISM — breathing displaced sphere
    float d = fbm(sph.xy*2.0 + sph.z + t*0.5, 4);
    return sph * (0.85 + 0.5*d + 0.1*sin(t*1.3 + seed*6.28));
  }
  if(s == 4){ // GALAXY — spiral arms, flattened
    float arms = 3.0;
    float r = sqrt(id);
    float a = id*arms*TAUc + r*5.0 + t*0.4;
    float z = (h11(seed)*2.0-1.0)*0.12*(1.0-r);
    return vec3(cos(a)*r*1.3, z, sin(a)*r*1.3);
  }
  // GEOMETRIC — project sphere dir onto a cube shell (lattice feel)
  vec3 a3 = abs(sph);
  float m = max(a3.x, max(a3.y, a3.z));
  vec3 cube = sph / m;
  cube = floor(cube*4.0)/4.0 + (sph - cube)*0.0;
  return cube * 1.05;
}

void main(){
  float t = uTime * uSpeed * 0.5 * (1.0 + uAToSpeed*uRms);
  vec3 cloud = position;

  vec3 pa = shapePos(uShapeA, aId, aSeed, cloud, t);
  vec3 pb = shapePos(uShapeB, aId, aSeed, cloud, t);
  float m = smoothstep(0.0, 1.0, uMorph);
  vec3 pos = mix(pa, pb, m);

  // fragmentation: peak turbulence mid-transition -> structures break & reform.
  // Turbulence is gated by the audio envelope: near-silent => clean stable shape,
  // louder => more break-up. A tiny constant keeps it from looking dead.
  float frag = sin(m * 3.14159);
  pos.xy += curl(pos.xy*2.0 + t) * ((0.25*frag + uMid*0.25) * uLife + uDistort*0.05);
  pos.z += snoise(pos.xy*1.5 - t) * (0.2*frag*uLife);

  // treble -> fine micro-vibration (only with audio)
  pos += rand3(aSeed + floor(t*24.0)) * uTreble * 0.03 * uLife;

  // breathing / audio swell: bass drives big expansion/compression of the whole mass
  pos *= uFieldScale * (1.0 + (uBass*0.5 + uBeat*0.2) * uLife);

  // field rotation (auto + hand-driven)
  pos.xz *= rot(uFieldRotY);
  pos.yz *= rot(uFieldRotX);

  // vortex swirl around the view axis, stronger toward the rim
  float rad = length(pos.xy);
  pos.xy *= rot(uVortex * (0.4 + rad));

  // perspective projection
  vec3 P = pos;
  P.z += 3.4;
  float persp = 2.0 / max(P.z, 0.15);
  vec2 ndc = P.xy * persp;
  float aspect = uRes.x / uRes.y;
  ndc.x /= max(aspect, 1.0);
  ndc.y *= min(aspect, 1.0);

  // ---- hand manipulation in screen space ----
  for(int i=0;i<2;i++){
    vec4 hand = i==0 ? uHand0 : uHand1;
    if(float(i) >= uHandCount) continue;
    vec2 hp = hand.xy;            // ndc
    float open = hand.z;
    float spd = hand.w;
    vec2 d = ndc - hp;
    float dd = dot(d,d) + 0.015;
    // open palm pushes out (waves), fist pulls in (gravity well)
    float dir = open > 0.5 ? 1.0 : -1.2;
    float mag = (0.10 + spd*0.25) / dd;
    ndc += normalize(d + 1e-4) * dir * mag * 0.05;
  }

  // explosion impulse on fast motion / beats
  ndc += normalize(ndc + 1e-4) * uExplosion * 0.25;

  // interaction field: finger/pointer drags particles and shoves ripples
  if(uTouchActive > 0.5){
    vec3 tf = texture2D(uTouch, ndc * 0.5 + 0.5).rgb;
    ndc += tf.rg * uForce * 0.18;
    ndc += normalize(ndc + 1e-4) * tf.b * uForce * 0.1;
  }

  gl_Position = vec4(ndc, 0.0, 1.0);

  vDepth = clamp(persp*0.5, 0.0, 1.5);
  float speed = length(pa - pb) * (0.5 + frag);
  vTone = clamp(0.2 + speed*0.4 + uTreble*0.4 + aSeed*0.2 + m*0.2, 0.0, 1.0);
  vAlpha = 0.30 + uRms*0.4 + uBeat*0.25 + uGlow*0.1;

  float sizeBase = 1.4 + uGlow*2.5 + uBass*5.0 + speed*3.0;
  gl_PointSize = sizeBase * persp * (uRes.y/1080.0) * (0.6 + vAlpha);
}
`;

const PARTICLE_FRAG_MAIN = /* glsl */ `
varying float vTone;
varying float vAlpha;
varying float vDepth;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = ramp(vTone) * (1.0 + uGlow*0.8) * (0.6 + vDepth*0.5);
  gl_FragColor = vec4(col, a * vAlpha);
}
`;

export const PARTICLE_VERT = COMMON_UNIFORMS + COMMON_LIB + PARTICLE_VERT_MAIN;
export const PARTICLE_FRAG = COMMON_UNIFORMS + COMMON_LIB + PARTICLE_FRAG_MAIN;

// Shape ids kept in sync with shapePos() above.
export const SHAPES = ["cloud", "sphere", "tunnel", "organism", "galaxy", "lattice"] as const;
export const SHAPE_COUNT = SHAPES.length;
