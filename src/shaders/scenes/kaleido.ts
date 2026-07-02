// Kaleidoscope mandala. Iterative polar folding (fold, offset, fold again) produces
// lace-like recursive detail instead of one flat mirror. The field is drawn twice:
// soft glass fill + crisp ink line-work from the banded field, with concentric rings
// that pulse on the beat. Fingers warp the lattice through the interaction field.
export const KALEIDO_MAIN = /* glsl */ `
void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed*uRms);

  // finger warps the whole lattice
  vec3 tch = touchAt(uv);
  p += tch.rg * uForce * 0.12;

  float sides = floor(uSymmetry + uTreble*3.0);
  float r0 = length(p);

  // ---- iterative fold: mirror, shrink, offset, mirror again -> recursive lace ----
  p *= rot(t*0.13 + uBeat*0.25);
  p = kaleido(p, sides);
  p = p*1.3 - vec2(0.35, 0.0);
  p *= rot(-t*0.17);
  p = kaleido(p, max(3.0, sides - 2.0));
  p *= uScale*1.1;

  // gentle domain warp — enough to feel organic, low enough to keep the mandala legible
  p += vec2(fbm(p + t*0.22, 3), fbm(p - t*0.18, 3)) * (0.12 + uDistort*0.2 + uMid*0.2);

  float n = fbm(p*1.5 + t*0.15, int(uComplexity));

  // ---- ink line-work first, restrained fill second ----
  float bands = abs(fract(n*2.2 + r0*2.0) - 0.5) * 2.0;    // 0 at band centres
  float line = smoothstep(0.22, 0.03, bands);               // crisp lace lines
  float fill = smoothstep(-0.3, 1.0, n);

  float tone = clamp(0.2 + fill*0.45 + r0*0.3 + uHue*0.3, 0.0, 1.0);
  vec3 col = ramp(tone) * fill * 0.22;                      // quiet glass fill
  col += ramp(clamp(tone + 0.3, 0.0, 1.0)) * line * (1.1 + uTreble*1.8) * uGlow;
  // radial petal shading keeps the mandala readable from the centre out
  col *= 0.65 + 0.35*smoothstep(1.5, 0.0, r0);

  // concentric rings radiating from the centre, flushed by the beat
  float ring = exp(-abs(fract(r0*2.4 - t*0.5) - 0.5)*10.0);
  col += ramp(0.9) * ring * (0.15 + uBeat*0.8) * smoothstep(1.4, 0.1, r0);

  // luminous heart
  col += ramp(0.85) * exp(-r0*r0*6.0) * (0.35 + uBass*0.9) * uGlow;

  // touch ripple light
  col += ramp(0.8) * tch.b * 0.4;

  // feed camera through the same fold for a true kaleidoscope of the room
  if(uCamActive>0.5 && uCamFeed>0.001){
    vec2 cuv = fract(p*0.15 + 0.5);
    vec3 cam = texture2D(uCam, mirrorUv(cuv)).rgb;
    col = mix(col, ramp(dot(cam,vec3(0.333))), uCamFeed);
  }

  col = grade(col, uv);
  gl_FragColor = vec4(max(col,0.0), 1.0);
}
`;
