"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { FULLSCREEN_VERT } from "@/shaders";
import { signals } from "@/lib/signals";
import { useStore } from "@/store/useStore";

// GPU fluid interaction field — the "digital substance" the hand/pointer sculpts.
// RG = velocity, B = ink/energy. Velocity self-advects (semi-Lagrangian) so motion
// flows continuously, vorticity adds swirls on fast gestures, and everything decays
// back to rest for organic recovery. Sampled bilinearly at high res so deformation
// is smooth and grid-free (no visible cells/blocks).

const RES = 512;
const MAX_PTS = 4;

const SIM_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uDt;
uniform float uTime;
uniform float uPersist;
uniform float uFluidity;
uniform float uTurb;
uniform float uForce;
uniform float uRadius;
uniform float uAspect;
uniform int uPtCount;
uniform vec4 uPts[${MAX_PTS}];   // xy uv, zw velocity
uniform float uAmp[${MAX_PTS}];

float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
vec2 curl2(vec2 p){
  float e=0.08;
  float n1=vnoise(p+vec2(0.0,e)), n2=vnoise(p-vec2(0.0,e));
  float n3=vnoise(p+vec2(e,0.0)), n4=vnoise(p-vec2(e,0.0));
  return vec2(n1-n2, n4-n3)/(2.0*e);
}

void main(){
  vec2 uv = vUv;
  vec2 vel = texture2D(uPrev, uv).rg;

  // semi-Lagrangian advection: trace velocity & ink back along the flow
  vec2 src = uv - vel * uDt * uFluidity * 0.55;
  vec4 f = texture2D(uPrev, src);

  // diffusion (smoothing -> continuous, no blocks)
  vec4 l = texture2D(uPrev, uv - vec2(uTexel.x,0.0));
  vec4 r = texture2D(uPrev, uv + vec2(uTexel.x,0.0));
  vec4 u = texture2D(uPrev, uv - vec2(0.0,uTexel.y));
  vec4 d = texture2D(uPrev, uv + vec2(0.0,uTexel.y));
  vec4 lap = (l + r + u + d - 4.0 * f);
  f.rg += lap.rg * 0.14;
  f.b  += lap.b  * 0.20;

  // vorticity: fast motion curls into swirls
  float sp = length(f.rg);
  f.rg += curl2(uv * 9.0 + uTime * 0.4) * uTurb * sp * 0.18;

  // decay toward rest (organic recovery); ink lingers slightly longer
  f.rg *= uPersist;
  f.b  *= mix(uPersist, 0.994, 0.35);

  // deposit from pointer + fingertips
  for(int i=0;i<${MAX_PTS};i++){
    if(i >= uPtCount) break;
    vec2 p = uPts[i].xy;
    vec2 pv = uPts[i].zw;
    vec2 diff = uv - p; diff.x *= uAspect;
    float dd = length(diff);
    float amt = smoothstep(uRadius, 0.0, dd);
    f.rg += pv * amt * uForce;
    f.b  += (uAmp[i] + length(pv) * 0.5) * amt * uForce;
  }

  f = clamp(f, -8.0, 8.0);
  gl_FragColor = f;
}
`;

export function TouchField() {
  const gl = useThree((s) => s.gl);
  const opts = {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  };
  const fboA = useFBO(RES, RES, opts);
  const fboB = useFBO(RES, RES, opts);
  const targets = useRef({ read: fboA, write: fboB });

  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.Camera(), []);
  const pts = useMemo(() => Array.from({ length: MAX_PTS }, () => new THREE.Vector4()), []);
  const amps = useMemo(() => new Array(MAX_PTS).fill(0), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: SIM_FRAG,
        uniforms: {
          uPrev: { value: null },
          uTexel: { value: new THREE.Vector2(1 / RES, 1 / RES) },
          uDt: { value: 1 / 60 },
          uTime: { value: 0 },
          uPersist: { value: 0.984 },
          uFluidity: { value: 1 },
          uTurb: { value: 1 },
          uForce: { value: 1.4 },
          uRadius: { value: 0.09 },
          uAspect: { value: 1 },
          uPtCount: { value: 0 },
          uPts: { value: pts },
          uAmp: { value: amps },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [pts, amps]
  );

  useEffect(() => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    signals.touchTexture = targets.current.read.texture;
    return () => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      signals.touchTexture = null;
    };
  }, [scene, material]);

  const prev = useRef({ px: 0.5, py: 0.5, t0x: 0.5, t0y: 0.5, t1x: 0.5, t1y: 0.5, time: 0 });

  useFrame((_, delta) => {
    const dt = Math.max(1 / 120, Math.min(delta, 0.05));
    const p = prev.current;
    p.time += dt;
    const ip = useStore.getState().interaction;
    let n = 0;

    // pointer (mouse / touch)
    {
      const x = signals.pointerX, y = signals.pointerY;
      const vx = (x - p.px) / dt, vy = (y - p.py) / dt;
      p.px = x; p.py = y;
      const vmag = Math.hypot(vx, vy);
      if (signals.pointerDown || vmag > 0.02) {
        pts[n].set(x, y, vx * 0.2, vy * 0.2);
        amps[n] = signals.pointerDown ? 0.7 : Math.min(0.5, vmag * 1.5);
        n++;
      }
    }

    // index fingertips
    const h = signals.hands;
    if (h.active) {
      const tips: [boolean, number, number, "t0x" | "t1x", "t0y" | "t1y"][] = [
        [h.h0.present, h.h0.tipX, h.h0.tipY, "t0x", "t0y"],
        [h.h1.present, h.h1.tipX, h.h1.tipY, "t1x", "t1y"],
      ];
      for (const [present, tx, ty, kx, ky] of tips) {
        if (!present || n >= MAX_PTS) continue;
        const vx = (tx - p[kx]) / dt, vy = (ty - p[ky]) / dt;
        p[kx] = tx; p[ky] = ty;
        pts[n].set(tx, ty, vx * 0.24, vy * 0.24);
        amps[n] = 0.35 + Math.min(1.0, Math.hypot(vx, vy) * 0.7);
        n++;
      }
    }

    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    const u = material.uniforms;
    u.uAspect.value = size.x / Math.max(1, size.y);
    u.uPtCount.value = n;
    u.uDt.value = dt;
    u.uTime.value = p.time;
    u.uPersist.value = ip.persistence;
    u.uFluidity.value = ip.fluidity;
    u.uTurb.value = ip.turbulence;
    u.uForce.value = ip.force;
    u.uRadius.value = ip.radius;

    const { read, write } = targets.current;
    u.uPrev.value = read.texture;
    const prevRT = gl.getRenderTarget();
    gl.setRenderTarget(write);
    gl.render(scene, cam);
    gl.setRenderTarget(prevRT);
    targets.current = { read: write, write: read };
    signals.touchTexture = write.texture;
  });

  return null;
}
