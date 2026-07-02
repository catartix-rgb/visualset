// Shared GLSL: uniform block, noise toolbox, palette ramp and color grading.
// Every fragment scene is built as: COMMON_UNIFORMS + COMMON_LIB + <scene main>.

export const COMMON_UNIFORMS = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;

// audio
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uRms;
uniform float uBeat;
uniform float uEnergy; // smoothed audio energy (fast attack, slow release)

// pointer
uniform vec2  uPointer;
uniform float uPointerDown;
uniform vec2  uPointerVel;

// camera
uniform sampler2D uCam;
uniform float uCamActive;
uniform float uCamMotion;
uniform float uCamBright;
uniform sampler2D uMotion;   // per-cell webcam motion map (silhouette movement)
uniform float uMotionActive;
uniform sampler2D uMask;     // person segmentation mask (1 = person)
uniform float uMaskActive;
uniform float uCamFeed;
uniform float uCamMirror;

// palette
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform vec3 uBg;

// look params
uniform float uSpeed;
uniform float uScale;
uniform float uComplexity;
uniform float uDistort;
uniform float uGlow;
uniform float uContrast;
uniform float uSat;
uniform float uHue;
uniform float uSymmetry;
uniform float uGrain;
uniform float uVignette;
uniform float uFlow;
uniform float uTrail;

// audio->visual mapping amounts
uniform float uAToScale;
uniform float uAToDistort;
uniform float uAToGlow;
uniform float uAToSpeed;

// feedback (previous frame), used by trails scene
uniform sampler2D uFeedback;

// persistent interaction field: rg = force vector, b = ripple energy
uniform sampler2D uTouch;
uniform float uTouchActive;
uniform float uForce; // global displacement strength (interaction elasticity)
uniform float uHandExpand; // -1 compress .. +1 expand (hand gesture), 0 when no hands
uniform float uNfFloor;    // Noise Field: minimum preserved brightness (energy floor)
uniform float uNfReturn;   // Noise Field: resistance to lasting deformation (return to base)
`;

export const COMMON_LIB = /* glsl */ `
const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
vec2 hash22(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.xx+p3.yz)*p3.zy);
}

// value noise
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

// gradient (simplex-ish) noise, smoother
float snoise(vec2 p){
  const float K1=0.366025404, K2=0.211324865;
  vec2 i=floor(p+(p.x+p.y)*K1);
  vec2 a=p-i+(i.x+i.y)*K2;
  float m=step(a.y,a.x);
  vec2 o=vec2(m,1.0-m);
  vec2 b=a-o+K2;
  vec2 c=a-1.0+2.0*K2;
  vec3 h=max(0.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.0);
  vec3 n=h*h*h*h*vec3(
    dot(a,hash22(i)*2.0-1.0),
    dot(b,hash22(i+o)*2.0-1.0),
    dot(c,hash22(i+1.0)*2.0-1.0));
  return dot(n,vec3(70.0));
}

float fbm(vec2 p, int oct){
  float v=0.0, a=0.5;
  for(int i=0;i<8;i++){
    if(i>=oct) break;
    v+=a*snoise(p);
    p=rot(0.5)*p*2.0+10.0;
    a*=0.5;
  }
  return v;
}

// curl of the noise field -> divergence-free flow vectors
vec2 curl(vec2 p){
  float e=0.1;
  float n1=fbm(p+vec2(0.0,e),3);
  float n2=fbm(p-vec2(0.0,e),3);
  float n3=fbm(p+vec2(e,0.0),3);
  float n4=fbm(p-vec2(e,0.0),3);
  return vec2(n1-n2, n4-n3)/(2.0*e);
}

// 5-stop palette ramp
vec3 ramp(float t){
  t=clamp(t,0.0,1.0);
  float s=t*4.0;
  vec3 c;
  if(s<1.0)      c=mix(uC0,uC1,s);
  else if(s<2.0) c=mix(uC1,uC2,s-1.0);
  else if(s<3.0) c=mix(uC2,uC3,s-2.0);
  else           c=mix(uC3,uC4,s-3.0);
  return c;
}

vec3 hueShift(vec3 col, float h){
  const vec3 k=vec3(0.57735);
  float c=cos(h), s=sin(h);
  return col*c + cross(k,col)*s + k*dot(k,col)*(1.0-c);
}

// ACES-ish filmic curve: highlights roll off softly instead of clipping to white.
vec3 filmic(vec3 x){
  x = max(x, 0.0);
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}

vec3 grade(vec3 col, vec2 uv){
  // saturation
  float l=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(l),col,uSat);
  // hue
  col=hueShift(col,uHue);
  // glow lift driven by audio (pre-tonemap so it blooms, not clips)
  col+=col*uGlow*0.6*(0.5+uAToGlow*uTreble);
  // filmic tonemap, then contrast around mid grey
  col=filmic(col);
  col=(col-0.5)*uContrast+0.5;
  // gentle two-stage vignette (falloff starts late, never crushes the frame)
  float d=distance(uv,vec2(0.5));
  col*=mix(1.0, smoothstep(1.05,0.3,d*1.5), clamp(uVignette,0.0,1.5)*0.8);
  // film grain
  float g=hash21(uv*uRes+uTime)*2.0-1.0;
  col+=g*uGrain;
  return col;
}

vec2 mirrorUv(vec2 uv){
  return vec2(uCamMirror>0.5 ? 1.0-uv.x : uv.x, uv.y);
}

// blend the live camera image into the final look
vec3 applyCamera(vec3 col, vec2 uv){
  if(uCamActive<0.5 || uCamFeed<=0.001) return col;
  vec3 cam=texture2D(uCam, mirrorUv(uv)).rgb;
  vec3 tinted=ramp(dot(cam,vec3(0.333)));
  return mix(col, mix(cam,tinted,0.5), uCamFeed);
}

// sample the interaction field at a uv (rg force, b ripple energy)
vec3 touchAt(vec2 uv){
  if(uTouchActive < 0.5) return vec3(0.0);
  return texture2D(uTouch, uv).rgb;
}

// local webcam motion (0..1) at a uv — drives silhouette-reactive effects
float motionAt(vec2 uv){
  if(uMotionActive < 0.5) return 0.0;
  return texture2D(uMotion, clamp(uv, 0.0, 1.0)).r;
}

// person segmentation mask (1 = person). Returns 1 everywhere when unavailable so
// silhouette effects degrade gracefully to a full-frame look.
float maskAt(vec2 uv){
  if(uMaskActive < 0.5) return 1.0;
  return texture2D(uMask, clamp(uv, 0.0, 1.0)).r;
}

// kaleidoscope fold
vec2 kaleido(vec2 p, float sides){
  float a=atan(p.y,p.x);
  float r=length(p);
  float seg=TAU/max(2.0,sides);
  a=mod(a,seg);
  a=abs(a-seg*0.5);
  return vec2(cos(a),sin(a))*r;
}
`;

/** Combine library + a scene's main() body into a full fragment shader. */
export function buildFragment(sceneMain: string): string {
  return COMMON_UNIFORMS + COMMON_LIB + sceneMain;
}
