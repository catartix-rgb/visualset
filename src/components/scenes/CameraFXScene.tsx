"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { FULLSCREEN_VERT } from "@/shaders";
import { CAMFX_BASE, CAMFX_EFFECTS } from "@/shaders/scenes/camerafxPasses";
import {
  applyCamFx,
  applyInteraction,
  applyParams,
  applySignals,
  buildUniforms,
} from "@/shaders/uniforms";
import { useStore } from "@/store/useStore";
import { CAMFX_STAGES, type CamFxStage } from "@/lib/fx";

const COPY_FRAG = /* glsl */ `
precision highp float; varying vec2 vUv; uniform sampler2D uTex;
void main(){ gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0); }
`;

/**
 * Renders the modular Camera FX chain: a raw-camera base pass followed by each ENABLED
 * effect, applied in the user's order (camfxOrder) by ping-ponging two FBOs. Because
 * every effect reads the previous result, reordering genuinely changes the output.
 */
export function CameraFXScene() {
  const gl = useThree((s) => s.gl);
  const uniforms = useRef(buildUniforms());
  const timeRef = useRef(0);

  const opts = { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const fboA = useFBO(opts);
  const fboB = useFBO(opts);
  const targets = useRef({ read: fboA, write: fboB });

  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.Camera(), []);
  const mesh = useMemo(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    m.frustumCulled = false;
    return m;
  }, []);

  const baseMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: CAMFX_BASE, uniforms: uniforms.current, depthTest: false, depthWrite: false }),
    []
  );
  const effectMats = useMemo(() => {
    const map = {} as Record<CamFxStage, THREE.ShaderMaterial>;
    for (const stage of CAMFX_STAGES) {
      map[stage] = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: CAMFX_EFFECTS[stage],
        uniforms: uniforms.current,
        depthTest: false,
        depthWrite: false,
      });
    }
    return map;
  }, []);
  const copyMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: COPY_FRAG, uniforms: { uTex: { value: null } }, depthTest: false, depthWrite: false }),
    []
  );

  useEffect(() => {
    scene.add(mesh);
    return () => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      baseMat.dispose();
      copyMat.dispose();
      Object.values(effectMats).forEach((m) => m.dispose());
    };
  }, [scene, mesh, baseMat, copyMat, effectMats]);

  // keep look/interaction/camfx params in sync (re-applied on change)
  const params = useStore((s) => s.params);
  const audio = useStore((s) => s.audio);
  const camera = useStore((s) => s.camera);
  const interaction = useStore((s) => s.interaction);
  const camfx = useStore((s) => s.camfx);
  useEffect(() => { applyParams(uniforms.current, params, audio, camera); }, [params, audio, camera]);
  useEffect(() => { applyInteraction(uniforms.current, interaction); }, [interaction]);
  useEffect(() => { applyCamFx(uniforms.current, camfx); }, [camfx]);

  useFrame(() => {
    if (!useStore.getState().frozen) timeRef.current += 1 / 60;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    uniforms.current.uRes.value.set(size.x, size.y);
    applySignals(uniforms.current, timeRef.current);

    const u = uniforms.current;
    const cf = useStore.getState().camfx;
    const order = useStore.getState().camfxOrder;
    const prevRT = gl.getRenderTarget();

    // base pass -> write, then swap so read holds the latest
    const renderInto = (mat: THREE.Material) => {
      mesh.material = mat;
      gl.setRenderTarget(targets.current.write);
      gl.render(scene, cam);
      const t = targets.current.read;
      targets.current.read = targets.current.write;
      targets.current.write = t;
    };

    renderInto(baseMat);
    for (const stage of order) {
      if (!cf[stage]?.on) continue;
      u.uTex.value = targets.current.read.texture;
      renderInto(effectMats[stage]);
    }

    gl.setRenderTarget(prevRT);
    copyMat.uniforms.uTex.value = targets.current.read.texture;
  });

  return <mesh frustumCulled={false} material={copyMat}><planeGeometry args={[2, 2]} /></mesh>;
}
