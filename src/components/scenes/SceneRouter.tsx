"use client";
import { useStore } from "@/store/useStore";
import { FRAGMENTS } from "@/shaders";
import { FragmentScene } from "./FragmentScene";
import { FeedbackScene } from "./FeedbackScene";
import { ParticleScene } from "./ParticleScene";
import { CameraFXScene } from "./CameraFXScene";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";

/** Selects the active visual module. Keyed so each scene mounts fresh & clean. */
export function SceneRouter() {
  const sceneId = useStore((s) => s.sceneId);
  useAdaptiveQuality(2);

  if (sceneId === "particles") return <ParticleScene key="particles" />;
  if (sceneId === "feedback") return <FeedbackScene key="feedback" />;
  if (sceneId === "camerafx") return <CameraFXScene key="camerafx" />;

  return <FragmentScene key={sceneId} fragment={FRAGMENTS[sceneId]} />;
}
