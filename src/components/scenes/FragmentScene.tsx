"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { FULLSCREEN_VERT } from "@/shaders";
import {
  applyCamFx,
  applyInteraction,
  applyParams,
  applySignals,
  buildUniforms,
} from "@/shaders/uniforms";
import { useStore } from "@/store/useStore";

/** Renders any of the fullscreen fragment scenes onto a clip-space quad. */
export function FragmentScene({ fragment }: { fragment: string }) {
  const uniforms = useRef(buildUniforms());
  const timeRef = useRef(0);
  const gl = useThree((s) => s.gl);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: fragment,
        uniforms: uniforms.current,
        depthTest: false,
        depthWrite: false,
      }),
    [fragment]
  );
  useEffect(() => () => material.dispose(), [material]);

  const params = useStore((s) => s.params);
  const audio = useStore((s) => s.audio);
  const camera = useStore((s) => s.camera);
  const interaction = useStore((s) => s.interaction);
  const camfx = useStore((s) => s.camfx);
  useEffect(() => {
    applyParams(uniforms.current, params, audio, camera);
  }, [params, audio, camera]);
  useEffect(() => {
    applyInteraction(uniforms.current, interaction);
  }, [interaction]);
  useEffect(() => {
    applyCamFx(uniforms.current, camfx);
  }, [camfx]);

  useFrame((_, delta) => {
    if (!useStore.getState().frozen) {
      timeRef.current += Math.min(delta, 0.05);
    }
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    uniforms.current.uRes.value.set(size.x, size.y);
    applySignals(uniforms.current, timeRef.current);
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
