// Liquid Metal — a living fluid surface (mercury / ink / water on a speaker).
// A height field is built from domain-warped noise plus DIRECT audio displacement:
//   bass  -> deep radial waves        mid -> turbulence        treble -> micro ripples
// Fingertips / pointer raise ripples through the interaction field. Surface normals
// are derived from the height gradient and shaded as a reflective metallic liquid.
export const LIQUID_MAIN = /* glsl */ `
float surfH(vec2 uv){
  vec2 p = (uv - 0.5);
  p.x *= uRes.x / uRes.y;
  p *= (uScale * 2.0 + 1.0);

  float t = uTime * uSpeed * (1.0 + uAToSpeed * uRms);

  // flowing domain warp -> organic, non-static base
  vec2 w = p + vec2(fbm(p + t*0.2, 4), fbm(p - t*0.15 + 5.0, 4)) * (0.6 + uMid*0.7);
  float h = fbm(w * 1.2 + t * 0.1, int(uComplexity));

  float r = length(p);
  // bass: deep concentric waves that visibly deform the WHOLE surface
  h += (1.0 + uAToScale) * uBass * 1.4 * sin(r * 3.0 - t * 2.2) * exp(-r * 0.18);
  h += uBass * 0.8 * sin(p.x * 2.2 + t * 1.3) * sin(p.y * 2.2 - t * 1.1);
  // mid: turbulence
  h += uMid * 0.6 * fbm(w * 3.0 + t, 4);
  // treble: high-frequency micro vibration
  h += uTreble * 0.2 * snoise(p * 15.0 + t * 3.0);

  // fingertip / pointer: deep displacement, swirls and a big wave front
  vec3 tch = touchAt(uv);
  vec2 force = tch.rg * uForce;
  h += tch.b * uForce * 1.6;                         // deep ripples
  h += dot(force, p) * 0.18;                         // mass pushed sideways
  h += length(force) * 0.6;                          // swelling where touched
  return h;
}

void main(){
  vec2 uv = vUv;

  // drag the surface sideways where the field has force (liquid being pushed)
  vec2 force = touchAt(uv).rg * uForce;
  uv += force * 0.06;

  float e = 1.6 / uRes.y;
  float hC = surfH(uv);
  float hX = surfH(uv + vec2(e, 0.0));
  float hY = surfH(uv + vec2(0.0, e));

  // surface normal (z controls how "tall" ripples read)
  float bump = 2.0 + uGlow;
  vec3 n = normalize(vec3((hC - hX) * bump * 40.0, (hC - hY) * bump * 40.0, 1.0));

  vec3 view = vec3(0.0, 0.0, 1.0);
  vec3 light = normalize(vec3(0.45, 0.65, 0.75));
  vec3 refl = reflect(-view, n);

  // procedural "environment" reflected in the metal, tinted by the palette
  float env = 0.5 + 0.5 * refl.y;
  vec3 base = ramp(clamp(env + uHue*0.1, 0.0, 1.0));

  float diff = max(dot(n, light), 0.0);
  float spec = pow(max(dot(refl, light), 0.0), 48.0);
  float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);

  vec3 col = base * (0.25 + 0.75 * diff);
  col += spec * ramp(0.97) * (1.2 + uTreble * 3.0);     // sharp liquid highlights
  col += fres * ramp(0.7) * (0.4 + uMid);               // rim sheen
  col += max(0.0, hC) * ramp(0.55) * 0.25 * (0.6 + uGlow); // subsurface glow

  // beat sends a bright pulse across the surface
  col += uBeat * ramp(0.85) * 0.18;

  col *= uGlow * 0.7 + 0.6;
  col = applyCamera(col, uv);
  col = grade(col, uv);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
