"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { FULLSCREEN_VERT } from "@/shaders";
import { signals } from "@/lib/signals";

// A persistent "digital pond". Pointer and index-fingertips deposit force (rg) and
// ripple energy (b) into a low-res field that diffuses and slowly decays over a few
// seconds. Every scene samples signals.touchTexture to become directly deformable:
// drag particles, push noise, raise liquid ripples — and the deformation lingers.

const RES = 256;
const MAX_PTS = 4;

const SIM_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uDecay;
uniform float uAspect;
uniform int uPtCount;
uniform vec4 uPts[${MAX_PTS}];   // xy = uv pos, zw = velocity
uniform float uAmp[${MAX_PTS}];  // ripple energy injected

void main(){
  vec2 uv = vUv;
  vec4 c = texture2D(uPrev, uv);
  vec4 l = texture2D(uPrev, uv - vec2(uTexel.x, 0.0));
  vec4 r = texture2D(uPrev, uv + vec2(uTexel.x, 0.0));
  vec4 u = texture2D(uPrev, uv - vec2(0.0, uTexel.y));
  vec4 d = texture2D(uPrev, uv + vec2(0.0, uTexel.y));
  vec4 lap = (l + r + u + d - 4.0 * c);

  // diffuse force gently, spread ripple energy more (wave-like)
  c.rg += lap.rg * 0.16;
  c.b  += lap.b  * 0.30;

  // advect ripples along the force field so touches "flow"
  vec2 grad = vec2(r.b - l.b, d.b - u.b);
  c.b -= dot(c.rg, grad) * 0.10;

  c *= uDecay;

  for(int i=0;i<${MAX_PTS};i++){
    if(i >= uPtCount) break;
    vec2 p = uPts[i].xy;
    vec2 vel = uPts[i].zw;
    vec2 diff = uv - p;
    diff.x *= uAspect;
    float dd = length(diff);
    float amt = smoothstep(0.07, 0.0, dd);
    c.rg += vel * amt * 0.5;
    c.b  += (uAmp[i] + length(vel) * 0.4) * amt;
  }

  c = clamp(c, -6.0, 6.0);
  gl_FragColor = c;
}
`;

export function TouchField() {
  const gl = useThree((s) => s.gl);
  const fboA = useFBO(RES, RES, { type: THREE.HalfFloatType, depthBuffer: false });
  const fboB = useFBO(RES, RES, { type: THREE.HalfFloatType, depthBuffer: false });
  const targets = useRef({ read: fboA, write: fboB });

  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.Camera(), []);

  const pts = useMemo(
    () => Array.from({ length: MAX_PTS }, () => new THREE.Vector4(0, 0, 0, 0)),
    []
  );
  const amps = useMemo(() => new Array(MAX_PTS).fill(0), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: SIM_FRAG,
        uniforms: {
          uPrev: { value: null },
          uTexel: { value: new THREE.Vector2(1 / RES, 1 / RES) },
          uDecay: { value: 0.985 },
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

  // velocity tracking for deposit sources
  const prev = useRef({ px: 0.5, py: 0.5, t0x: 0.5, t0y: 0.5, t1x: 0.5, t1y: 0.5 });

  useFrame((_, delta) => {
    const dt = Math.max(1 / 120, Math.min(delta, 0.05));
    const p = prev.current;
    let n = 0;

    // pointer (mouse / touch) — hovering ripples like a fingertip on water
    {
      const x = signals.pointerX;
      const y = signals.pointerY;
      const vx = (x - p.px) / dt;
      const vy = (y - p.py) / dt;
      p.px = x;
      p.py = y;
      const vmag = Math.hypot(vx, vy);
      const amp = signals.pointerDown ? 0.6 : Math.min(0.4, vmag * 1.5);
      if (signals.pointerDown || vmag > 0.02) {
        pts[n].set(x, y, vx * 0.12, vy * 0.12);
        amps[n] = amp;
        n++;
      }
    }

    // index fingertips
    const hsig = signals.hands;
    if (hsig.active) {
      const tips: [boolean, number, number, "t0x" | "t1x", "t0y" | "t1y"][] = [
        [hsig.h0.present, hsig.h0.tipX, hsig.h0.tipY, "t0x", "t0y"],
        [hsig.h1.present, hsig.h1.tipX, hsig.h1.tipY, "t1x", "t1y"],
      ];
      for (const [present, tx, ty, kx, ky] of tips) {
        if (!present || n >= MAX_PTS) continue;
        const vx = (tx - p[kx]) / dt;
        const vy = (ty - p[ky]) / dt;
        p[kx] = tx;
        p[ky] = ty;
        pts[n].set(tx, ty, vx * 0.14, vy * 0.14);
        amps[n] = 0.25 + Math.min(0.8, Math.hypot(vx, vy) * 0.6);
        n++;
      }
    }

    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    material.uniforms.uAspect.value = size.x / Math.max(1, size.y);
    material.uniforms.uPtCount.value = n;

    const { read, write } = targets.current;
    material.uniforms.uPrev.value = read.texture;

    const prevRT = gl.getRenderTarget();
    gl.setRenderTarget(write);
    gl.render(scene, cam);
    gl.setRenderTarget(prevRT);

    targets.current = { read: write, write: read };
    signals.touchTexture = write.texture;
  });

  return null;
}
