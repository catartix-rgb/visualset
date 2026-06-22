// Camera FX — turns the live webcam into a reactive visual material. Selectable
// processing modes, and the audio physically acts on the image: bass shakes it in
// standing waves, treble adds pixel displacement, the beat blooms it, and the
// interaction field ripples through it. uCamFxMode selects the look.
//   0 Halftone  1 Dot Matrix  2 ASCII  3 Edge  4 Posterize  5 Threshold  6 Mono
export const CAMERAFX_MAIN = /* glsl */ `
uniform float uCamFxMode;

float camLum(vec2 q){
  vec3 c = texture2D(uCam, q).rgb;
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main(){
  vec2 base = vUv;
  vec2 uv = mirrorUv(base);
  float t = uTime * uSpeed;

  // ---- audio / touch acting physically on the image ----
  vec3 tch = touchAt(base);
  uv.y += sin(uv.x * 34.0 + t * 4.0) * uBass * 0.02;     // bass standing waves
  uv.x += sin(uv.y * 28.0 - t * 3.0) * uBass * 0.015;
  uv += tch.rg * 0.05;                                   // finger drag
  uv += vec2(snoise(base * 9.0 + t), snoise(base * 9.0 - t)) * uTreble * 0.012; // pixel jitter

  int mode = int(uCamFxMode + 0.5);

  vec3 col;
  if(uCamActive < 0.5){
    // graceful placeholder until the camera is enabled
    float n = fbm(base * 3.0 + t * 0.2, 4);
    col = mix(uBg, ramp(0.4 + 0.3*n), 0.25 + 0.2*n);
  } else {
    vec3 cam = texture2D(uCam, uv).rgb;
    float lum = dot(cam, vec3(0.299, 0.587, 0.114));
    float aspect = uRes.x / uRes.y;

    if(mode == 0){ // HALFTONE
      float scale = 110.0 + uBass * 130.0;
      vec2 cell = base * scale * vec2(aspect, 1.0);
      vec2 g = fract(cell) - 0.5;
      float radius = (1.0 - lum) * 0.62 * (0.8 + uBass * 0.6);
      float dot = smoothstep(radius, radius - 0.08, length(g));
      col = ramp(0.15 + lum * 0.8) * dot;
    } else if(mode == 1){ // DOT MATRIX (LED panel)
      float grid = 90.0 + uMid * 60.0;
      vec2 c = fract(base * grid * vec2(aspect, 1.0)) - 0.5;
      float led = smoothstep(0.5, 0.12, length(c));
      col = ramp(lum) * led * (0.5 + lum) * (1.0 + uBass * 0.8);
    } else if(mode == 2){ // ASCII-ish glyph cells
      float grid = 70.0 + uMid * 40.0;
      vec2 cellId = floor(base * grid * vec2(aspect, 1.0));
      vec2 sub = floor(fract(base * grid * vec2(aspect, 1.0)) * 3.0);
      float lvl = floor(lum * 5.0) / 5.0;
      float pat = step(1.0 - lvl, hash21(cellId + sub * 7.0));
      col = ramp(0.2 + lum * 0.8) * pat * (1.0 + uTreble);
    } else if(mode == 3){ // EDGE DETECTION
      float e = 1.4 / uRes.y;
      float gx = camLum(uv + vec2(e,0.0)) - camLum(uv - vec2(e,0.0));
      float gy = camLum(uv + vec2(0.0,e)) - camLum(uv - vec2(0.0,e));
      float edge = clamp(length(vec2(gx, gy)) * (5.0 + uTreble * 8.0), 0.0, 1.0);
      col = ramp(0.3 + edge * 0.7) * edge;
    } else if(mode == 4){ // POSTERIZE
      float levels = 4.0 + floor(uMid * 5.0);
      vec3 q = floor(cam * levels) / levels;
      col = mix(q, ramp(lum), 0.4);
    } else if(mode == 5){ // THRESHOLD
      float th = 0.5 + sin(t) * 0.05 - uBass * 0.2;
      float v = smoothstep(th - 0.04, th + 0.04, lum);
      col = mix(uBg, ramp(0.85), v);
    } else { // MONOCHROME
      col = ramp(lum);
    }

    // audio bloom + ripples on top of the processed image
    col += col * uTreble * 0.8 + uBeat * ramp(0.85) * 0.15;
    col += ramp(0.9) * tch.b * 0.6;
  }

  col *= 0.7 + uGlow * 0.6;
  col = grade(col, base);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
