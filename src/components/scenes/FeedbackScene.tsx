"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { FULLSCREEN_VERT, FRAGMENTS } from "@/shaders";
import { applyParams, applySignals, buildUniforms } from "@/shaders/uniforms";
import { useStore } from "@/store/useStore";

const COPY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
void main(){ gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0); }
`;

/**
 * True feedback loop: each frame the previous frame's render target is sampled
 * (warped + decayed) by the shader, producing trails / optical-feedback / glitch.
 * Two ping-pong half-float targets keep the loop stable and HDR-ish.
 */
export function FeedbackScene() {
  const gl = useThree((s) => s.gl);
  const uniforms = useRef(buildUniforms());
  const timeRef = useRef(0);

  const fboSettings = { type: THREE.HalfFloatType } as const;
  const fboA = useFBO(fboSettings);
  const fboB = useFBO(fboSettings);
  const targets = useRef({ read: fboA, write: fboB });

  const simScene = useMemo(() => new THREE.Scene(), []);
  const simCam = useMemo(() => new THREE.Camera(), []);

  const simMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: FRAGMENTS.feedback,
        uniforms: uniforms.current,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  // fullscreen copy material draws the latest target to the screen
  const copyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: COPY_FRAG,
        uniforms: { uTex: { value: null } },
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    mesh.frustumCulled = false;
    simScene.add(mesh);
    return () => {
      simScene.remove(mesh);
      mesh.geometry.dispose();
      simMaterial.dispose();
      copyMaterial.dispose();
    };
  }, [simScene, simMaterial, copyMaterial]);

  const params = useStore((s) => s.params);
  const audio = useStore((s) => s.audio);
  const camera = useStore((s) => s.camera);
  useEffect(() => {
    applyParams(uniforms.current, params, audio, camera);
  }, [params, audio, camera]);

  useFrame(() => {
    if (!useStore.getState().frozen) timeRef.current += 1 / 60;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    uniforms.current.uRes.value.set(size.x, size.y);
    applySignals(uniforms.current, timeRef.current);

    const { read, write } = targets.current;
    uniforms.current.uFeedback.value = read.texture;

    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(write);
    gl.render(simScene, simCam);
    gl.setRenderTarget(prevTarget);

    copyMaterial.uniforms.uTex.value = write.texture;
    targets.current = { read: write, write: read };
  });

  return (
    <mesh frustumCulled={false} material={copyMaterial}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
