// Fullscreen vertex shader. A plane(2,2) is emitted directly in clip space so the
// scene fills the viewport regardless of camera — every fragment scene shares this.
export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
