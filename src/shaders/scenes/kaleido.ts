// Kaleidoscope: polar mirror folding of a warped noise field (or the live camera
// when fed in). Symmetry count and rotation react to audio.
export const KALEIDO_MAIN = /* glsl */ `
void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);

  // rotate + fold
  p *= rot(t*0.2 + uBeat*0.3);
  float sides = floor(uSymmetry + uTreble*4.0);
  p = kaleido(p, sides);
  p *= uScale*1.4;

  // domain warp
  p += vec2(fbm(p+t*0.3,4), fbm(p-t*0.2,4)) * (uDistort + uCamMotion*1.5);

  float n = fbm(p*1.5 + t*0.25, int(uComplexity));
  float r = length(p);
  float tt = fract(n*0.7 + r*0.2 + t*0.05);
  vec3 col = ramp(tt);
  col *= 0.4 + 0.8*smoothstep(0.0,1.2,abs(n));

  // ring pulses on the beat
  col += ramp(0.9) * exp(-abs(fract(r*2.0 - t) - 0.5)*8.0) * (0.3 + uBeat);

  // feed camera through the same fold for a true kaleidoscope of the room
  if(uCamActive>0.5 && uCamFeed>0.001){
    vec2 cuv = fract(p*0.15 + 0.5);
    vec3 cam = texture2D(uCam, mirrorUv(cuv)).rgb;
    col = mix(col, ramp(dot(cam,vec3(0.333))), uCamFeed);
  }

  col *= uGlow*1.1;
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
