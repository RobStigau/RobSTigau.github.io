(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[974],{5729:(e,t,a)=>{"use strict";a.d(t,{BlackHoleLanding:()=>m});var r=a(9509),o=a(8993);let i=`
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`,n=`
precision highp float;

#define MAX_STEPS 460

/**
 * Seconds before the wound-up gas pattern hands over to a fresh copy. What
 * matters is how far the gas winds in one of these, which is this times the
 * spin — so a slow disc can afford a long cycle, and a long cycle is what you
 * want: every handover costs a little contrast while the two copies overlap.
 */
#define WIND_CYCLE 46.0

varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uRight;
uniform vec3  uUp;
uniform vec3  uFwd;
uniform float uTanHalf;
uniform vec2  uFocus;
uniform float uSteps;
uniform float uSkyR;
uniform float uDiskIn;
uniform float uDiskOut;
uniform float uThick;
uniform float uDensity;
uniform float uSpin;
uniform float uGrain;
uniform float uBright;
uniform float uDoppler;
uniform vec3  uHot;
uniform vec3  uMid;
uniform vec3  uCool;
uniform float uStars;
uniform float uEncode;
uniform vec2  uJitter;
uniform float uSeed;

/* --- noise ---------------------------------------------------------------- */

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

/** lod fades the finest octave out, for rays whose steps are too long to see it. */
float fbm(vec3 p, float lod) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += (i == 3 ? a * lod : a) * vnoise(p);
    p = p * 2.03 + vec3(11.3, 7.1, 3.7);
    a *= 0.5;
  }
  return s;
}

/* --- the gas -------------------------------------------------------------- */

/**
 * Density and colour of the disc at a point.
 *
 * The gas runs on Kepler orbits, so the inner rim laps the outer edge many
 * times over. Reading the turbulence in a frame that turns with the gas, at
 * each radius its own rate, is what shears the clouds into the trailing
 * spirals — nothing draws a spiral.
 */
void gasAt(vec3 p, float rd, float dt, out float dens, out vec3 tint, out float heat) {
  float rn = clamp((rd - uDiskIn) / max(0.001, uDiskOut - uDiskIn), 0.0, 1.0);

  // A thin sheet at the rim, flaring outward.
  float tk = uThick * (0.35 + 1.25 * rn);
  float v = p.y / tk;
  float sheet = exp(-v * v);

  // Detail the ray cannot resolve is detail it should not be asking for. A ray
  // running the length of the disc steps about a tenth of a unit at a time,
  // and the finest octave is finer than that — sampled once each, those cells
  // do not average out, they beat, and the arms come out combed with dashes.
  // So the last octave fades out as the step grows.
  float lod = clamp(1.0 - dt * uGrain * 14.0, 0.0, 1.0);

  float phi = atan(p.z, p.x);
  // Kepler: omega goes as r^-3/2, so every radius turns at its own rate and
  // the clouds are read in a frame that turns with them. That shear is what
  // draws the trailing spirals — nothing here draws a spiral.
  float omega = uSpin * pow(uDiskIn / rd, 1.5);
  // A third axis, so two radii turning at their own rates do not read the same
  // cloud, plus a slow creep inward so the gas falls as well as turns.
  float lr = log(rd) * 1.1 + uSpin * uTime * 0.05;

  // Left alone, that shear never stops winding: the pattern at one radius
  // slides past its neighbour for as long as the page is open, so the spiral
  // tightens without limit and within a minute it is finer than a pixel and
  // tears into moire. Real gas is spared this because turbulence keeps
  // rebuilding it. Here two copies of the disc run the same wind on clocks
  // half a cycle apart, and the picture crossfades from one to the other, each
  // handing over while the other is still young. Nothing ever winds past one
  // cycle's worth, and the crossfade lands where its layer is weightless.
  float u = uTime / WIND_CYCLE;
  float fA = fract(u);
  float fB = fract(u + 0.5);
  float w = abs(2.0 * fA - 1.0);

  float cloudsA = fbm(vec3(vec2(cos(phi + omega * fA * WIND_CYCLE),
                                sin(phi + omega * fA * WIND_CYCLE)) * (rd * uGrain), lr), lod);
  float cloudsB = fbm(vec3(vec2(cos(phi + omega * fB * WIND_CYCLE),
                                sin(phi + omega * fB * WIND_CYCLE)) * (rd * uGrain), lr + 40.0), lod);
  float clouds = mix(cloudsA, cloudsB, w);

  // Squared for the density only, so the gaps between the filaments go
  // properly dark instead of filling in as haze. The temperature below keeps
  // reading the smooth version: heat should not have hard edges.
  float filaments = clouds * clouds * 1.75;

  // Bright at the rim, gone by the outer edge, gone again just inside it.
  float inner = smoothstep(0.0, 0.07, rn);
  float outer = 1.0 - smoothstep(0.45, 1.0, rn);
  float prof = inner * outer * pow(uDiskIn / rd, 2.0);

  dens = max(0.0, filaments * 1.5 - 0.30) * sheet * prof * uDensity * 4.6;

  // Shakura–Sunyaev: T falls as r^-3/4. The colour ramp rides it.
  heat = pow(uDiskIn / rd, 0.8) * (0.72 + 0.55 * clouds);
  tint = mix(uCool, uMid, smoothstep(0.10, 0.52, heat));
  tint = mix(tint, uHot, smoothstep(0.52, 1.05, heat));
}

/* --- stars ---------------------------------------------------------------- */

/**
 * Stars are laid out on the six faces of a cube and read through whichever
 * face the ray leaves by. A grid in space would work too, until you notice
 * that a cube of space cut by the sphere of directions is a long thin sliver,
 * and every star comes out as a scratch.
 *
 * They are drawn small on purpose. The ray arrives here already bent, so this
 * sky is a lensed sky, and lensing stretches whatever it magnifies sideways.
 * A real star has no width to stretch and stays a point that merely brightens;
 * a fat blob drawn here would smear into a long arc halfway across the frame.
 * Keeping the blob near a pixel wide holds the smear to the ring around the
 * shadow, which is the one place it belongs.
 */
vec3 starField(vec3 d) {
  vec3 a = abs(d);
  vec2 uv;
  float face;
  if (a.x >= a.y && a.x >= a.z)      { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
  else if (a.y >= a.z)               { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
  else                               { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }

  vec3 col = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float sc = 90.0 * pow(2.2, float(k));
    vec2 p = uv * sc;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = hash13(vec3(id, face * 19.0));
    if (h > 0.965) {
      vec2 off = vec2(hash13(vec3(id, face + 11.0)), hash13(vec3(id, face + 23.0)));
      float dd = length(f - (off - 0.5) * 0.7);
      float s = smoothstep(0.055, 0.0, dd);
      float warm = hash13(vec3(id, face + 51.0));
      col += s * (0.6 + 4.5 * fract(h * 97.0))
           * mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.88, 0.72), warm)
           / pow(2.2, float(k));
    }
  }
  // A breath of dust, so the sky is not flat black between the points.
  col += vec3(0.013, 0.017, 0.030) * fbm(d * 2.6, 1.0);
  return col;
}

/* --- march ---------------------------------------------------------------- */

void main() {
  // The ray leaves from somewhere else inside its pixel every frame, and the
  // frames are averaged. One ray per pixel cannot resolve what happens at the
  // shadow's rim: rays that skim the photon sphere land on wildly different
  // parts of the disc for a hair's difference in aim, so a single sample there
  // is a coin toss and the rim breaks into loose pixels. Ten-odd tosses per
  // pixel, gathered over time, is what settles it.
  vec2 uv = (gl_FragCoord.xy + uJitter - uFocus * uRes) / uRes.y;
  vec3 dir = normalize(uFwd + (uv.x * uRight + uv.y * uUp) * 2.0 * uTanHalf);

  vec3 pos = uCamPos;
  vec3 vel = dir;

  // Angular momentum. Conserved, so it is read once and carried.
  vec3 hv = cross(pos, vel);
  float h2 = dot(hv, hv);
  float h = sqrt(h2);
  /** Angle swept around the hole so far. dphi/ds = h/r\xb2, and h is constant. */
  float swept = 0.0;

  vec3 col = vec3(0.0);
  float transmit = 1.0;
  bool captured = false;

  // Where inside its step each ray reads the gas. Always reading the middle
  // beats the step pattern against the disc into rings — worst in the halo,
  // where lensing packs a hundred radii into a few pixels. So each pixel
  // starts somewhere else, and then walks the read on by the golden ratio at
  // every step: one fixed offset per pixel is not enough, because the steps
  // themselves shorten in a smooth pattern as the ray nears the disc and a
  // fixed offset rides that pattern instead of breaking it up.
  float jitter = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453);

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= uSteps) break;

    float r2 = dot(pos, pos);
    float r = sqrt(r2);

    if (r < 1.0) { captured = true; break; }          // through the horizon
    if (r > uSkyR && dot(pos, vel) > 0.0) break;      // gone, and not coming back
    if (transmit < 0.004) break;                      // nothing behind this is visible

    float dt = clamp(0.14 * (r - 1.0), 0.025, 1.1);

    // Never step more than half the way to the disc plane while the disc is
    // still in radial reach, or a grazing ray tunnels clean through it.
    if (r < uDiskOut * 1.25) {
      float rn = clamp((r - uDiskIn) / max(0.001, uDiskOut - uDiskIn), 0.0, 1.0);
      float tk = uThick * (0.35 + 1.25 * rn);
      dt = min(dt, max(tk * 0.38, abs(pos.y) * 0.5));
    }

    swept += h * dt / r2;

    // How much the deeper images are worth. A ray that skims the photon sphere
    // wraps the hole again and again, and each wrap paints another, tighter
    // copy of the disc against the shadow. Those copies are real, and they are
    // faint: every extra turn costs a factor of about e^2pi. Given full
    // brightness they instead pile into a hairline ring which no single ray
    // per pixel can resolve — past the photon sphere the arrival angle swings
    // wildly between neighbouring pixels, so the ring comes out as a broken
    // string of sparks that crawl as the gas turns. Charging each turn its
    // proper cost puts it back in its place: a soft rim, not a dotted circle.
    // Half a turn is free, which leaves the halo — that one only bends.
    float deep = exp(-1.3 * max(0.0, swept - 4.6));

    jitter = fract(jitter + 0.6180339887);
    vec3 mid = pos + vel * (dt * jitter);
    float rd = length(mid.xz);

    if (rd > uDiskIn && rd < uDiskOut && abs(mid.y) < uThick * 5.0) {
      float dens;
      float heat;
      vec3 tint;
      gasAt(mid, rd, dt, dens, tint, heat);

      if (dens > 0.001) {
        // Beaming. The gas orbits at sqrt(M/r) with M = 1/2, so 0.41c at the
        // rim. g folds in the boost and the climb out of the well; flux goes
        // as g\xb3, and uDoppler dials that exponent down to nothing.
        vec3 tang = normalize(cross(vec3(0.0, 1.0, 0.0), vec3(mid.x, 0.0, mid.z)));
        float beta = min(0.85, sqrt(0.5 / max(rd, 1.5)));
        float gam = inversesqrt(max(1e-4, 1.0 - beta * beta));
        vec3 toObs = -normalize(vel);
        float g = 1.0 / (gam * (1.0 - beta * dot(tang, toObs)));
        g *= sqrt(max(0.05, 1.0 - 1.0 / rd));
        float boost = pow(max(g, 0.02), 3.0 * uDoppler);

        // Coming at you it also runs blue, going away it runs red.
        vec3 shift = mix(
          vec3(1.0),
          g > 1.0 ? vec3(0.86, 0.94, 1.14) : vec3(1.15, 0.82, 0.62),
          clamp(abs(g - 1.0) * 1.6, 0.0, 1.0) * uDoppler
        );

        float emit = uBright * (0.26 + 2.0 * heat * heat);
        col += tint * shift * (emit * boost * dens * transmit * dt * deep);
        transmit *= exp(-dens * 0.30 * dt);
      }
    }

    // u'' + u = 3M u\xb2, in Cartesian form.
    vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
    vel += acc * dt;
    pos += vel * dt;
  }

  if (!captured && uStars > 0.001) {
    // Lensing stretches an image sideways, and a star's flux does not grow to
    // fill it: a magnified point stays as bright, it does not become a bright
    // streak. The stretch is the ratio of the angle the ray left at to the
    // angle it ended up travelling at, both measured off the line to the hole,
    // and dividing the light by it puts the flux back where it belongs. Long
    // arcs then fade as they lengthen instead of scratching across the frame.
    vec3 toHole = normalize(-uCamPos);
    float sI = length(cross(normalize(dir), toHole));
    float sS = length(cross(normalize(vel), toHole));
    float stretch = clamp(sI / max(1e-3, sS), 1.0, 40.0);
    col += starField(normalize(vel)) * uStars * transmit / stretch;
  }

  if (uEncode > 0.5) col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
`,s=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uCur;
uniform sampler2D uPrev;
uniform float uAlpha;

void main() {
  vec3 c = texture2D(uCur, vUv).rgb;
  vec3 p = texture2D(uPrev, vUv).rgb;
  gl_FragColor = vec4(mix(p, c, uAlpha), 1.0);
}
`,l=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uDecode;
uniform float uPack;
uniform float uThreshold;

void main() {
  vec3 s = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb
         + texture2D(uTex, vUv + uTexel * vec2( 1.0, -1.0)).rgb
         + texture2D(uTex, vUv + uTexel * vec2(-1.0,  1.0)).rgb
         + texture2D(uTex, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  s *= 0.25;
  if (uDecode > 0.5) s = s / max(vec3(0.002), 1.0 - s);
  float l = max(s.r, max(s.g, s.b));
  s *= max(0.0, l - uThreshold) / max(0.0001, l);
  gl_FragColor = vec4(s * uPack, 1.0);
}
`,u=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uStep;

void main() {
  vec3 s = texture2D(uTex, vUv).rgb * 0.2270270;
  s += (texture2D(uTex, vUv + uStep * 1.3846154).rgb
      + texture2D(uTex, vUv - uStep * 1.3846154).rgb) * 0.3162162;
  s += (texture2D(uTex, vUv + uStep * 3.2307692).rgb
      + texture2D(uTex, vUv - uStep * 3.2307692).rgb) * 0.0702702;
  gl_FragColor = vec4(s, 1.0);
}
`,h=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2  uRes;
uniform float uDecode;
uniform float uPack;
uniform float uGlow;
uniform float uExposure;
uniform float uVignette;
uniform float uScrimDir;
uniform float uScrimAmt;
uniform float uSeed;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 scene = texture2D(uScene, vUv).rgb;
  if (uDecode > 0.5) scene = scene / max(vec3(0.002), 1.0 - scene);
  vec3 bloom = texture2D(uBloom, vUv).rgb / uPack;

  vec3 c = scene + bloom * uGlow;
  c = aces(c * uExposure);
  c = pow(max(c, 0.0), vec3(0.4545));

  // Corners down.
  vec2 d = vUv - 0.5;
  c *= 1.0 - uVignette * dot(d, d) * 1.9;

  // The edge the copy sits on: heavy at the edge, off quickly, so the middle
  // of the frame keeps its contrast instead of going grey.
  if (uScrimDir > 0.5) {
    float x = uScrimDir < 1.5 ? vUv.x
            : uScrimDir < 2.5 ? 1.0 - vUv.x
            : uScrimDir < 3.5 ? 1.0 - vUv.y
            : vUv.y;
    c *= 1.0 - uScrimAmt * pow(1.0 - clamp(x, 0.0, 1.0), 2.4);
  }

  // A grain of dither. Without it these long dark ramps band into rings.
  float n = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) / 255.0;

  gl_FragColor = vec4(c, 1.0);
}
`,f=Math.PI/180;function c(e){let t=e.trim().replace("#",""),a=parseInt(3===t.length?t[0]+t[0]+t[1]+t[1]+t[2]+t[2]:t.slice(0,6),16);return[(a>>16&255)/255,(a>>8&255)/255,(255&a)/255].map(e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4))}function d({distance:e=24,elevation:t=-5.5,azimuth:a=0,orbitSpeed:m=0,roll:p=-20,fov:v=42,diskInner:g=3,diskOuter:x=15,diskThickness:b=.26,diskDensity:w=1,brightness:y=1,spinSpeed:E=.06,grain:T=.48,doppler:k=.35,hotColor:S="#FFF3DE",midColor:D="#FF9838",coolColor:M="#8E3A0B",starBrightness:_=0,glow:A=1,exposure:R=.9,vignette:F=.28,steps:C=300,resolution:U=.7,maxDpr:P=1.75,focus:L=[.72,.46],scrim:N="none",scrimStrength:B=.9,paused:I=!1,className:j="",children:H,...O}){let z=(0,o.useRef)(null),G=(0,o.useRef)(null),X=(0,o.useRef)({distance:e,elevation:t,azimuth:a,orbitSpeed:m,roll:p,fov:v,diskInner:g,diskOuter:x,diskThickness:b,diskDensity:w,brightness:y,spinSpeed:E,grain:T,doppler:k,hotColor:S,midColor:D,coolColor:M,starBrightness:_,glow:A,exposure:R,vignette:F,steps:C,resolution:U,maxDpr:P,focus:L,scrim:N,scrimStrength:B,paused:I});return(0,o.useEffect)(()=>{X.current={distance:e,elevation:t,azimuth:a,orbitSpeed:m,roll:p,fov:v,diskInner:g,diskOuter:x,diskThickness:b,diskDensity:w,brightness:y,spinSpeed:E,grain:T,doppler:k,hotColor:S,midColor:D,coolColor:M,starBrightness:_,glow:A,exposure:R,vignette:F,steps:C,resolution:U,maxDpr:P,focus:L,scrim:N,scrimStrength:B,paused:I}}),(0,o.useEffect)(()=>{let e=z.current,t=G.current;if(!e||!t)return;let a="function"==typeof window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,r={alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},o=t.getContext("webgl2",r)||t.getContext("webgl",r);function d(a){e.dataset.webgl=a,t.style.display="none"}if(!o)return void d("unsupported");let m=o.getExtension("WEBGL_debug_renderer_info"),p=m?String(o.getParameter(m.UNMASKED_RENDERER_WEBGL)||""):"",v=/swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(p),g="u">typeof WebGL2RenderingContext&&o instanceof WebGL2RenderingContext;function x(e,t){let a=o.createShader(e);return a?(o.shaderSource(a,t),o.compileShader(a),o.getShaderParameter(a,o.COMPILE_STATUS))?a:(console.error("blackhole: shader failed —",o.getShaderInfoLog(a)||"no log (context lost?)"),o.deleteShader(a),null):null}function b(e){let t=x(o.VERTEX_SHADER,i),a=x(o.FRAGMENT_SHADER,e);if(!t||!a)return null;let r=o.createProgram();if(!r)return null;if(o.attachShader(r,t),o.attachShader(r,a),o.bindAttribLocation(r,0,"aPos"),o.linkProgram(r),o.deleteShader(t),o.deleteShader(a),!o.getProgramParameter(r,o.LINK_STATUS))return console.error(o.getProgramInfoLog(r)),null;let n={},s=o.getProgramParameter(r,o.ACTIVE_UNIFORMS);for(let e=0;e<s;e++){let t=o.getActiveUniform(r,e);t&&(n[t.name]=o.getUniformLocation(r,t.name))}return{program:r,u:n}}let w=!0,y=o.UNSIGNED_BYTE,E=o.RGBA;if(g)o.getExtension("EXT_color_buffer_half_float")||o.getExtension("EXT_color_buffer_float")?(y=o.HALF_FLOAT,E=o.RGBA16F):w=!1;else{let e=o.getExtension("OES_texture_half_float"),t=o.getExtension("EXT_color_buffer_half_float");e&&t?y=e.HALF_FLOAT_OES:w=!1}w||(y=o.UNSIGNED_BYTE,E=o.RGBA);let T=g||o.getExtension("OES_texture_half_float_linear")||!w?o.LINEAR:o.NEAREST,k=w?1:.12;function S(e,t){let a=o.createTexture(),r=o.createFramebuffer();if(!a||!r)return null;o.bindTexture(o.TEXTURE_2D,a),o.texImage2D(o.TEXTURE_2D,0,E,e,t,0,o.RGBA,y,null),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,T),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,T),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),o.bindFramebuffer(o.FRAMEBUFFER,r),o.framebufferTexture2D(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,a,0);let i=o.checkFramebufferStatus(o.FRAMEBUFFER);return(o.bindFramebuffer(o.FRAMEBUFFER,null),i!==o.FRAMEBUFFER_COMPLETE)?(o.deleteTexture(a),o.deleteFramebuffer(r),null):{fb:r,tex:a,w:e,h:t}}let D=null,M=null,_=null,A=null,R=null,F=null,C=null,U=null,P=null,L=null,N=null,B=0,I=0,j=0,H=0,O=0;function W(){return D=b(n),M=b(s),_=b(l),A=b(u),R=b(h),!!D&&!!M&&!!_&&!!A&&!!R&&(F=o.createBuffer(),o.bindBuffer(o.ARRAY_BUFFER,F),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0),o.disable(o.DEPTH_TEST),o.disable(o.BLEND),!0)}function q(){for(let e of[C,U,P,L,N])e&&(o.deleteTexture(e.tex),o.deleteFramebuffer(e.fb));C=null,U=null,P=null,L=null,N=null,B=0}function Y(){let a=e.getBoundingClientRect(),r=v?1:Math.min(window.devicePixelRatio||1,Math.max(1,X.current.maxDpr)),o=Math.max(1,Math.round(a.width)),i=Math.max(1,Math.round(a.height)),n=v?.34:Math.min(1,Math.max(.4,X.current.resolution)),s=Math.max(2,Math.round(o*r)),l=Math.max(2,Math.round(i*r)),u=Math.max(2,Math.round(s*n)),h=Math.max(2,Math.round(l*n));if(s===I&&l===j&&u===H&&h===O)return;I=s,j=l,H=u,O=h,t.width=s,t.height=l,t.style.width=o+"px",t.style.height=i+"px",q(),C=S(u,h),U=S(u,h),P=S(u,h);let f=Math.max(2,u>>2),c=Math.max(2,h>>2);L=S(f,c),N=S(f,c)}let V=6*!!a,K=0,J=!0,$=!0,Q=0;function Z(e,t){o.useProgram(e.program),o.bindFramebuffer(o.FRAMEBUFFER,t?t.fb:null),o.viewport(0,0,t?t.w:I,t?t.h:j)}function ee(){o.drawArrays(o.TRIANGLES,0,3)}function et(e,t){o.activeTexture(o.TEXTURE0+t),o.bindTexture(o.TEXTURE_2D,e)}let ea=[[.5,.333],[.25,.667],[.75,.111],[.125,.444],[.625,.778],[.375,.222],[.875,.556],[.0625,.889]];function er(e){if(!D||!M||!_||!A||!R||!C||!U||!P||!L||!N)return;let t=X.current,a=(t.azimuth+t.orbitSpeed*e)*f,r=Math.max(-88,Math.min(88,t.elevation))*f,i=Math.max(2.2,t.distance),n=Math.cos(r),s=i*n*Math.cos(a),l=i*Math.sin(r),u=i*n*Math.sin(a),h=-s/i,d=-l/i,m=-u/i,p=m,g=0,x=-h,b=Math.hypot(p,0,x)||1;p/=b;let y=(g/=b)*m-(x/=b)*d,E=x*h-p*m,T=p*d-g*h,S=Math.cos(t.roll*f),F=Math.sin(t.roll*f),H=p*S+y*F,O=g*S+E*F,z=x*S+T*F,G=-p*F+y*S,W=-g*F+E*S,q=-x*F+T*S,Y=c(t.hotColor),V=c(t.midColor),K=c(t.coolColor),J=Math.max(t.diskInner+.5,t.diskOuter);Z(D,C);let $=D.u;o.uniform2f($.uRes,C.w,C.h),o.uniform1f($.uTime,e),o.uniform3f($.uCamPos,s,l,u),o.uniform3f($.uRight,H,O,z),o.uniform3f($.uUp,G,W,q),o.uniform3f($.uFwd,h,d,m),o.uniform1f($.uTanHalf,Math.tan(.5*Math.max(8,Math.min(110,t.fov))*f)),o.uniform2f($.uFocus,t.focus[0],1-t.focus[1]),o.uniform1f($.uSteps,v?130:Math.max(60,Math.min(460,Math.round(t.steps)))),o.uniform1f($.uSkyR,Math.max(1.35*i,2.4*J)),o.uniform1f($.uDiskIn,Math.max(1.05,t.diskInner)),o.uniform1f($.uDiskOut,J),o.uniform1f($.uThick,Math.max(.02,t.diskThickness)),o.uniform1f($.uDensity,Math.max(0,t.diskDensity)),o.uniform1f($.uSpin,6.2831853*t.spinSpeed),o.uniform1f($.uGrain,Math.max(.02,t.grain)),o.uniform1f($.uBright,Math.max(0,t.brightness)),o.uniform1f($.uDoppler,Math.max(0,Math.min(1,t.doppler))),o.uniform3f($.uHot,Y[0],Y[1],Y[2]),o.uniform3f($.uMid,V[0],V[1],V[2]),o.uniform3f($.uCool,K[0],K[1],K[2]),o.uniform1f($.uStars,Math.max(0,t.starBrightness)),o.uniform1f($.uEncode,+!w);let Q=ea[B%ea.length];o.uniform2f($.uJitter,Q[0]-.5,Q[1]-.5),o.uniform1f($.uSeed,B%64*17.13),ee();let er=0===B?1:.14;Z(M,P),et(C.tex,0),et(U.tex,1),o.uniform1i(M.u.uCur,0),o.uniform1i(M.u.uPrev,1),o.uniform1f(M.u.uAlpha,er),ee();let eo=P,ei=U;U=P,P=ei,B++,Z(_,L),et(eo.tex,0),o.uniform1i(_.u.uTex,0),o.uniform2f(_.u.uTexel,1/eo.w,1/eo.h),o.uniform1f(_.u.uDecode,+!w),o.uniform1f(_.u.uPack,k),o.uniform1f(_.u.uThreshold,.85),ee();let en=(e,t,a,r)=>{Z(A,t),et(e.tex,0),o.uniform1i(A.u.uTex,0),o.uniform2f(A.u.uStep,a/t.w,r/t.h),ee()};en(L,N,1,0),en(N,L,0,1),en(L,N,2.6,0),en(N,L,0,2.6),Z(R,null),et(eo.tex,0),et(L.tex,1),o.uniform1i(R.u.uScene,0),o.uniform1i(R.u.uBloom,1),o.uniform2f(R.u.uRes,I,j),o.uniform1f(R.u.uDecode,+!w),o.uniform1f(R.u.uPack,k),o.uniform1f(R.u.uGlow,.26*Math.max(0,t.glow)),o.uniform1f(R.u.uExposure,Math.max(.05,t.exposure)),o.uniform1f(R.u.uVignette,Math.max(0,Math.min(1,t.vignette))),o.uniform1f(R.u.uScrimDir,"left"===t.scrim?1:"right"===t.scrim?2:"top"===t.scrim?3:4*("bottom"===t.scrim)),o.uniform1f(R.u.uScrimAmt,Math.max(0,Math.min(1,t.scrimStrength))),o.uniform1f(R.u.uSeed,60*e%1e3),ee()}function eo(e){for(let t=0;t<e;t++)er(V)}function ei(e){if(!J)return;if(Q=requestAnimationFrame(ei),!$){K=e;return}let t=K?Math.min(.05,(e-K)/1e3):0;K=e,X.current.paused||a||(V+=t),er(V)}if(!W())return void d("build-failed");Y(),eo(a?16:1),a||(Q=requestAnimationFrame(ei));let en=new ResizeObserver(()=>{Y(),(a||X.current.paused)&&eo(16)});en.observe(e);let es=new IntersectionObserver(e=>{$=e[0]?.isIntersecting??!0},{threshold:0});es.observe(e);let el=()=>{$=!document.hidden,K=0},eu=e=>{e.preventDefault(),J=!1,cancelAnimationFrame(Q),t.style.display="none"},eh=()=>{(I=j=H=O=0,W())?(t.style.display="",e.dataset.webgl="",Y(),J=!0,K=0,eo(a?16:1),a||(Q=requestAnimationFrame(ei))):d("lost")};return document.addEventListener("visibilitychange",el),t.addEventListener("webglcontextlost",eu),t.addEventListener("webglcontextrestored",eh),()=>{for(let e of(J=!1,cancelAnimationFrame(Q),en.disconnect(),es.disconnect(),document.removeEventListener("visibilitychange",el),t.removeEventListener("webglcontextlost",eu),t.removeEventListener("webglcontextrestored",eh),q(),F&&o.deleteBuffer(F),[D,M,_,A,R]))e&&o.deleteProgram(e.program)}},[]),(0,r.jsxs)("div",{ref:z,className:`relative isolate h-full w-full overflow-hidden bg-black ${j}`,...O,children:[(0,r.jsx)("canvas",{ref:G,"aria-hidden":"true",className:"absolute inset-0 h-full w-full"}),H?(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:H}):null]})}function m(){let e=function(){let[e,t]=(0,o.useState)(!1);return(0,o.useEffect)(()=>{let e=window.matchMedia("(max-width: 767px)"),a=()=>t(e.matches);return a(),e.addEventListener("change",a),()=>e.removeEventListener("change",a)},[]),e}(),[t,a]=(0,o.useState)(!1),[i,n]=(0,o.useState)(0),[s,l]=(0,o.useState)(-5.5);return(0,r.jsx)("section",{className:"blackHoleLanding","aria-label":"Portfolio introduction",onPointerMove:e=>{if("mouse"!==e.pointerType)return;let t=e.currentTarget.getBoundingClientRect(),a=(e.clientX-t.left)/t.width-.5,r=(e.clientY-t.top)/t.height-.5;n(12*a),l(-5.5-8*r)},onPointerLeave:()=>{n(0),l(-5.5)},children:(0,r.jsxs)(d,{focus:e?[.5,.76]:[.72,.46],scrim:e?"top":"left",scrimStrength:.92,distance:24,elevation:e?-7:s,azimuth:e?0:i,fov:e?58:42,glow:e?.85:1.1,steps:e?170:260,resolution:e?.55:.68,paused:t,children:[(0,r.jsxs)("nav",{className:"blackHoleNav","aria-label":"Primary navigation",children:[(0,r.jsxs)("a",{className:"blackHoleMark",href:"#top","aria-label":"Rob Stigau, home",children:["RS",(0,r.jsx)("span",{children:"."})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("a",{href:"#projects",children:"Work"}),(0,r.jsx)("a",{href:"#about",children:"About"}),(0,r.jsx)("a",{href:"#contact",children:"Contact"})]})]}),(0,r.jsxs)("div",{className:"blackHoleCopy",children:[(0,r.jsx)("p",{className:"blackHoleEyebrow",children:"Rob Stigau \xb7 Developer & maker"}),(0,r.jsxs)("h1",{children:["Building at the edge",(0,r.jsx)("br",{}),(0,r.jsx)("span",{children:"of what's possible."})]}),(0,r.jsx)("p",{className:"blackHoleIntro",children:"Thoughtful digital experiences, useful tools, and experiments made with code."}),(0,r.jsxs)("div",{className:"blackHoleActions",children:[(0,r.jsxs)("a",{className:"blackHolePrimary",href:"#projects",children:["Explore my work ",(0,r.jsx)("span",{"aria-hidden":"true",children:"↓"})]}),(0,r.jsxs)("a",{className:"blackHoleSecondary",href:"https://github.com/RobStigau",target:"_blank",rel:"noreferrer",children:["GitHub ",(0,r.jsx)("span",{"aria-hidden":"true",children:"↗"})]})]})]}),(0,r.jsxs)("div",{className:"blackHoleControls",children:[(0,r.jsx)("span",{className:"cameraHint",children:"Move your cursor to shift perspective"}),(0,r.jsxs)("button",{type:"button",onClick:()=>a(e=>!e),children:[(0,r.jsx)("span",{className:t?"statusDot paused":"statusDot"}),t?"Resume motion":"Pause motion"]})]})]})})}},9364:(e,t,a)=>{Promise.resolve().then(a.bind(a,5729))}},e=>{e.O(0,[884,874,358],()=>e(e.s=9364)),_N_E=e.O()}]);