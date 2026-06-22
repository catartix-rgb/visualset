import { useEffect } from "react";
import { signals, smooth } from "@/lib/signals";

/**
 * Tracks mouse + multitouch into the signals bus in uv space (0..1, y up).
 * Velocity is derived for "throw / wave" interactions.
 */
export function usePointer(target?: HTMLElement | null) {
  useEffect(() => {
    const el = target ?? window;
    let lastX = 0.5;
    let lastY = 0.5;

    const toUv = (clientX: number, clientY: number) => {
      const x = clientX / window.innerWidth;
      const y = 1 - clientY / window.innerHeight;
      return [x, y] as const;
    };

    const move = (x: number, y: number) => {
      const [u, v] = toUv(x, y);
      signals.pointerVelX = smooth(signals.pointerVelX, (u - lastX) * 60, 0.4);
      signals.pointerVelY = smooth(signals.pointerVelY, (v - lastY) * 60, 0.4);
      signals.pointerX = u;
      signals.pointerY = v;
      lastX = u;
      lastY = v;
    };

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseDown = () => (signals.pointerDown = 1);
    const onMouseUp = () => (signals.pointerDown = 0);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      signals.pointerDown = 1;
      if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => (signals.pointerDown = 0);

    el.addEventListener("mousemove", onMouseMove as EventListener);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
    el.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("mousemove", onMouseMove as EventListener);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("touchmove", onTouchMove as EventListener);
      el.removeEventListener("touchstart", onTouchStart as EventListener);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [target]);
}
