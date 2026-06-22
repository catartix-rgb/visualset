"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PARTICLE_VERT, PARTICLE_FRAG } from "@/shaders/scenes/particles";
import { applyParams, applySignals, buildUniforms } from "@/shaders/uniforms";
import { useStore } from "@/store/useStore";
import { signals } from "@/lib/signals";

const COUNT = 120_000;

export function ParticleScene() {
  const gl = useThree((s) => s.gl);
  const uniforms = useRef(buildUniforms());
  const timeRef = useRef(0);
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 0] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = 0;
      seeds[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
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
  useEffect(() => {
    applyParams(uniforms.current, params, audio, camera);
  }, [params, audio, camera]);

  useFrame((_, delta) => {
    if (!useStore.getState().frozen) timeRef.current += Math.min(delta, 0.05);
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    uniforms.current.uRes.value.set(size.x, size.y);
    applySignals(uniforms.current, timeRef.current);

    // adaptive count: render fewer points when quality drops or audio is quiet
    const active = Math.floor(
      COUNT * (0.5 + 0.5 * Math.min(1, signals.rms + 0.4)) * signals.quality
    );
    geometry.setDrawRange(0, active);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
