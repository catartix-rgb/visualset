// Feedback / trails / glitch. Reads the previous frame (uFeedback), warps + fades it
// (simulated optical feedback loop), then injects fresh emitters from pointer, audio
// and camera motion. Treble adds RGB-split glitch slices.
export const FEEDBACK_MAIN = /* glsl */ `
void main(){
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);

  // feedback transform: zoom + rotate + flow displacement
  float zoom = 1.0 - (0.012 + uBass*0.03);
  mat2 r = rot(0.02 + uDistort*0.04 + uCamMotion*0.1);
  vec2 fuv = r * c * zoom + 0.5;
  fuv += curl(c*3.0 + t*0.2) * (0.004 + uFlow*0.004);

  vec3 prev = texture2D(uFeedback, fuv).rgb;

  // glitch: horizontal slices shift on treble / beat
  float slice = step(0.8, hash11(floor(uv.y*40.0) + floor(t*6.0)));
  float shift = slice * (uTreble*0.06 + uBeat*0.04);
  vec3 g;
  g.r = texture2D(uFeedback, fuv + vec2(shift,0.0)).r;
  g.g = prev.g;
  g.b = texture2D(uFeedback, fuv - vec2(shift,0.0)).b;
  prev = mix(prev, g, slice);

  float decay = clamp(uTrail, 0.7, 0.995);
  vec3 col = prev * decay;

  // fresh emitter — pointer paints, audio pulses centre
  vec2 m = uPointer;
  float brush = smoothstep(0.06, 0.0, distance(uv, m)) * (0.3 + uPointerDown*0.9);
  col += ramp(fract(t*0.1 + uHue)) * brush;

  float pulse = smoothstep(0.18,0.0,length(c)) * (uRms*0.6 + uBeat*0.9);
  col += ramp(0.8) * pulse;

  // camera silhouette injection
  if(uCamActive>0.5){
    vec3 cam = texture2D(uCam, mirrorUv(uv)).rgb;
    float edge = uCamMotion * smoothstep(0.2,0.6,dot(cam,vec3(0.333)));
    col += ramp(0.6) * edge * (0.5 + uCamFeed);
  }

  col = clamp(col, 0.0, 4.0);
  // output graded view; feedback buffer captures the raw col (handled in component)
  vec3 outc = grade(col, uv);
  gl_FragColor = vec4(outc, 1.0);
}
`;

// A second pass writes the *un-graded* color back into the feedback buffer so the
// loop stays stable. We emulate this by keeping grade light; component renders the
// same material into the FBO.
