"use client";
import { Canvas } from "@react-three/fiber";
import { SceneRouter } from "./scenes/SceneRouter";

/**
 * The WebGL surface. preserveDrawingBuffer lets us grab PNG/JPG snapshots;
 * the canvas stream is what the recorder captures for WebM/MP4.
 */
export function VisualCanvas() {
  return (
    <Canvas
      className="absolute inset-0"
      gl={{
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 75 }}
      frameloop="always"
    >
      <color attach="background" args={["#05070a"]} />
      <SceneRouter />
    </Canvas>
  );
}
