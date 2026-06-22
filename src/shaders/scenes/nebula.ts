// Deep nebula: layered fbm clouds with parallax depth and emissive cores.
export const NEBULA_MAIN = /* glsl */ `
void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t  = uTime * uSpeed * 0.4 * (1.0 + uAToSpeed * uRms);
  float sc = uScale * (1.0 + uAToScale * uBass * 0.5);

  vec3 col = uBg;
  float density = 0.0;
  // march through a few cloud layers at different depths
  for(int i=0;i<6;i++){
    float fi = float(i);
    float depth = 1.0 + fi*0.4;
    vec2 q = p * sc * depth + vec2(t*0.1*fi, -t*0.05*fi);
    q += vec2(fbm(q+t*0.2,4), fbm(q+5.0-t*0.15,4)) * (uDistort + uCamMotion);
    float d = fbm(q, int(uComplexity));
    d = smoothstep(0.1, 0.7, d);
    density += d * (0.18/depth);
    float tone = fract(0.15*fi + d*0.6 + uHue);
    col += ramp(tone) * d * (0.5/depth) * (0.6 + uMid*0.8);
  }

  // emissive star cores reacting to treble
  float stars = pow(max(0.0, fbm(p*sc*4.0+10.0,3)), 6.0);
  col += ramp(0.9) * stars * (2.0 + uTreble*4.0) * uGlow;

  col += density * ramp(0.7) * (0.4 + uBeat*0.6);
  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
