// Flowing noise/flow-field. Domain-warped curl noise advects a coordinate field,
// colored through the palette ramp. Bass drives zoom, mids drive warp, beats pulse.
export const NOISEFIELD_MAIN = /* glsl */ `
void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t  = uTime * uSpeed * (1.0 + uAToSpeed * uRms);
  float sc = uScale * (1.0 + uAToScale * uBass * 0.8);
  float warp = uDistort * (1.0 + uAToDistort * uMid) + uCamMotion * 1.5;

  p *= sc;

  // pointer + camera pull on the field
  vec2 pull = (uPointer - 0.5) * 2.0;
  p += pull * uPointerDown * 0.6;

  vec2 q = p;
  for(int i=0;i<3;i++){
    vec2 f = curl(q*1.3 + t*0.15);
    q += f * warp * 0.35;
  }

  float n = fbm(q + t*0.1, int(uComplexity));
  float flow = length(curl(q + t*0.2));

  float tt = 0.5 + 0.5*sin(n*3.0 + flow*2.0 + t*0.3 + uBeat*1.5);
  vec3 col = ramp(tt);
  col = mix(uBg, col, smoothstep(0.0,0.6,abs(n))+0.25);
  col += ramp(fract(tt+0.3)) * flow * 0.4 * uGlow;

  // beat flash
  col += uBeat * ramp(0.8) * 0.25;

  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
