// Raw Camera — the clean, independent camera source. ONLY the webcam image, fitted
// (cover) to the viewport and optionally mirrored. No grade, no noise field, no
// liquid, no feedback, no global distortion — nothing from the visual engine.
export const RAWCAM_MAIN = /* glsl */ `
vec2 coverUv(vec2 uv, float texAspect, float scrAspect){
  vec2 c = uv - 0.5;
  if(scrAspect > texAspect) c.x *= texAspect / scrAspect;
  else c.y *= scrAspect / texAspect;
  return c + 0.5;
}

void main(){
  float scr = uRes.x / uRes.y;
  vec2 uv = mirrorUv(coverUv(vUv, 1.3333, scr));

  vec3 col;
  if(uCamActive < 0.5){
    // neutral placeholder until the camera is granted
    float g = 0.02 + 0.02 * sin(vUv.y * 30.0 + uTime);
    col = vec3(g);
  } else {
    col = texture2D(uCam, uv).rgb;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;
