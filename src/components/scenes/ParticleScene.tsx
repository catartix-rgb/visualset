"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  PARTICLE_VERT,
  PARTICLE_FRAG,
  SHAPE_COUNT,
} from "@/shaders/scenes/particles";
import { applyInteraction, applyParams, applySignals, buildUniforms } from "@/shaders/uniforms";
import { useStore } from "@/store/useStore";
import { signals } from "@/lib/signals";

const COUNT = 90_000;

export function ParticleScene() {
  const gl = useThree((s) => s.gl);
  const uniforms = useRef(buildUniforms());
  const timeRef = useRef(0);

  // morph state machine + field dynamics
  const sim = useRef({
    shapeA: 0,
    shapeB: 1,
    morph: 0,
    phase: "morph" as "morph" | "dwell",
    dwell: 0,
    rotX: 0,
    rotY: 0,
    scale: 1,
    vortex: 0,
    explosion: 0,
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const ids = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 0] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = Math.random() * 2 - 1;
      ids[i] = (i + 0.5) / COUNT;
      seeds[i] = Math.random() * 100;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aId", new THREE.BufferAttribute(ids, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: uniforms.current,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  const params = useStore((s) => s.params);
  const audio = useStore((s) => s.audio);
  const camera = useStore((s) => s.camera);
  const interaction = useStore((s) => s.interaction);
  useEffect(() => {
    applyParams(uniforms.current, params, audio, camera);
  }, [params, audio, camera]);
  useEffect(() => {
    applyInteraction(uniforms.current, interaction);
  }, [interaction]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const frozen = useStore.getState().frozen;
    if (!frozen) timeRef.current += dt;

    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    uniforms.current.uRes.value.set(size.x, size.y);
    applySignals(uniforms.current, timeRef.current);

    const s = sim.current;
    const h = signals.hands;
    const u = uniforms.current;

    // ---- procedural morph sequencing (faster transitions with louder audio) ----
    if (!frozen) {
      const speed = (0.32 + signals.rms * 0.5) * dt;
      if (s.phase === "morph") {
        s.morph += speed;
        if (s.morph >= 1) {
          s.morph = 0;
          s.shapeA = s.shapeB;
          s.shapeB = (s.shapeB + 1) % SHAPE_COUNT;
          s.phase = "dwell";
          s.dwell = 1.4 + Math.random() * 1.6;
        }
      } else {
        s.dwell -= dt;
        // a strong beat can cut the dwell short -> system feels reactive/alive
        if (signals.beat > 0.8) s.dwell -= dt * 4;
        if (s.dwell <= 0) s.phase = "morph";
      }
    }

    // ---- field dynamics from hands + audio ----
    // rotation: auto spin + two-hand rotation gesture
    s.rotY += dt * (0.07 + h.axisVel * 0.6);
    s.rotX += dt * 0.025;

    // scale: hands spreading expands, coming together compresses
    let targetScale = 1;
    if (h.active && h.count >= 2) {
      targetScale = THREE.MathUtils.clamp(0.55 + h.spread * 1.9, 0.5, 2.3);
    }
    s.scale += (targetScale - s.scale) * 0.06 + h.spreadVel * dt * 1.5;
    s.scale = THREE.MathUtils.clamp(s.scale, 0.4, 2.6);

    // vortex: single-hand circular motion + a touch of treble
    const vTarget = THREE.MathUtils.clamp(h.swirl * 0.6, -2.5, 2.5) + signals.treble * 0.3;
    s.vortex += (vTarget - s.vortex) * 0.1;

    // explosion: fast hand motion or hard beats shove particles outward
    s.explosion *= 0.9;
    if (h.energy > 0.55) s.explosion = Math.max(s.explosion, h.energy);
    if (signals.beat > 0.9) s.explosion = Math.max(s.explosion, 0.4);

    u.uMorph.value = s.morph;
    u.uShapeA.value = s.shapeA;
    u.uShapeB.value = s.shapeB;
    u.uFieldRotX.value = s.rotX;
    u.uFieldRotY.value = s.rotY;
    u.uFieldScale.value = s.scale;
    u.uVortex.value = s.vortex;
    u.uExplosion.value = s.explosion;

    // adaptive count for weaker GPUs
    const active = Math.floor(COUNT * THREE.MathUtils.clamp(signals.quality, 0.5, 1));
    geometry.setDrawRange(0, active);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
