(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[974],{3001:(e,t,a)=>{Promise.resolve().then(a.bind(a,5729)),Promise.resolve().then(a.bind(a,9656))},5729:(e,t,a)=>{"use strict";a.d(t,{BlackHoleLanding:()=>m});var r=a(9509),i=a(8993);let s=`
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
`,o=`
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
`,c=`
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
`,u=`
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
`,h=Math.PI/180;function d(e){let t=e.trim().replace("#",""),a=parseInt(3===t.length?t[0]+t[0]+t[1]+t[1]+t[2]+t[2]:t.slice(0,6),16);return[(a>>16&255)/255,(a>>8&255)/255,(255&a)/255].map(e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4))}function f({distance:e=24,elevation:t=-5.5,azimuth:a=0,orbitSpeed:m=0,roll:p=-20,fov:v=42,diskInner:g=3,diskOuter:x=15,diskThickness:b=.26,diskDensity:y=1,brightness:w=1,spinSpeed:j=.06,grain:T=.48,doppler:E=.35,hotColor:k="#FFF3DE",midColor:S="#FF9838",coolColor:N="#8E3A0B",starBrightness:D=0,glow:A=1,exposure:R=.9,vignette:M=.28,steps:_=300,resolution:C=.7,maxDpr:F=1.75,focus:P=[.72,.46],scrim:U="none",scrimStrength:L=.9,paused:I=!1,className:B="",children:H,...O}){let G=(0,i.useRef)(null),z=(0,i.useRef)(null),X=(0,i.useRef)({distance:e,elevation:t,azimuth:a,orbitSpeed:m,roll:p,fov:v,diskInner:g,diskOuter:x,diskThickness:b,diskDensity:y,brightness:w,spinSpeed:j,grain:T,doppler:E,hotColor:k,midColor:S,coolColor:N,starBrightness:D,glow:A,exposure:R,vignette:M,steps:_,resolution:C,maxDpr:F,focus:P,scrim:U,scrimStrength:L,paused:I});return(0,i.useEffect)(()=>{X.current={distance:e,elevation:t,azimuth:a,orbitSpeed:m,roll:p,fov:v,diskInner:g,diskOuter:x,diskThickness:b,diskDensity:y,brightness:w,spinSpeed:j,grain:T,doppler:E,hotColor:k,midColor:S,coolColor:N,starBrightness:D,glow:A,exposure:R,vignette:M,steps:_,resolution:C,maxDpr:F,focus:P,scrim:U,scrimStrength:L,paused:I}}),(0,i.useEffect)(()=>{let e=G.current,t=z.current;if(!e||!t)return;let a="function"==typeof window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,r={alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},i=t.getContext("webgl2",r)||t.getContext("webgl",r);function f(a){e.dataset.webgl=a,t.style.display="none"}if(!i)return void f("unsupported");let m=i.getExtension("WEBGL_debug_renderer_info"),p=m?String(i.getParameter(m.UNMASKED_RENDERER_WEBGL)||""):"",v=/swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(p),g="u">typeof WebGL2RenderingContext&&i instanceof WebGL2RenderingContext;function x(e,t){let a=i.createShader(e);return a?(i.shaderSource(a,t),i.compileShader(a),i.getShaderParameter(a,i.COMPILE_STATUS))?a:(console.error("blackhole: shader failed —",i.getShaderInfoLog(a)||"no log (context lost?)"),i.deleteShader(a),null):null}function b(e){let t=x(i.VERTEX_SHADER,s),a=x(i.FRAGMENT_SHADER,e);if(!t||!a)return null;let r=i.createProgram();if(!r)return null;if(i.attachShader(r,t),i.attachShader(r,a),i.bindAttribLocation(r,0,"aPos"),i.linkProgram(r),i.deleteShader(t),i.deleteShader(a),!i.getProgramParameter(r,i.LINK_STATUS))return console.error(i.getProgramInfoLog(r)),null;let n={},o=i.getProgramParameter(r,i.ACTIVE_UNIFORMS);for(let e=0;e<o;e++){let t=i.getActiveUniform(r,e);t&&(n[t.name]=i.getUniformLocation(r,t.name))}return{program:r,u:n}}let y=!0,w=i.UNSIGNED_BYTE,j=i.RGBA;if(g)i.getExtension("EXT_color_buffer_half_float")||i.getExtension("EXT_color_buffer_float")?(w=i.HALF_FLOAT,j=i.RGBA16F):y=!1;else{let e=i.getExtension("OES_texture_half_float"),t=i.getExtension("EXT_color_buffer_half_float");e&&t?w=e.HALF_FLOAT_OES:y=!1}y||(w=i.UNSIGNED_BYTE,j=i.RGBA);let T=g||i.getExtension("OES_texture_half_float_linear")||!y?i.LINEAR:i.NEAREST,E=y?1:.12;function k(e,t){let a=i.createTexture(),r=i.createFramebuffer();if(!a||!r)return null;i.bindTexture(i.TEXTURE_2D,a),i.texImage2D(i.TEXTURE_2D,0,j,e,t,0,i.RGBA,w,null),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,T),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,T),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.bindFramebuffer(i.FRAMEBUFFER,r),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,a,0);let s=i.checkFramebufferStatus(i.FRAMEBUFFER);return(i.bindFramebuffer(i.FRAMEBUFFER,null),s!==i.FRAMEBUFFER_COMPLETE)?(i.deleteTexture(a),i.deleteFramebuffer(r),null):{fb:r,tex:a,w:e,h:t}}let S=null,N=null,D=null,A=null,R=null,M=null,_=null,C=null,F=null,P=null,U=null,L=0,I=0,B=0,H=0,O=0;function W(){return S=b(n),N=b(o),D=b(l),A=b(c),R=b(u),!!S&&!!N&&!!D&&!!A&&!!R&&(M=i.createBuffer(),i.bindBuffer(i.ARRAY_BUFFER,M),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),i.STATIC_DRAW),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0),i.disable(i.DEPTH_TEST),i.disable(i.BLEND),!0)}function Y(){for(let e of[_,C,F,P,U])e&&(i.deleteTexture(e.tex),i.deleteFramebuffer(e.fb));_=null,C=null,F=null,P=null,U=null,L=0}function q(){let a=e.getBoundingClientRect(),r=v?1:Math.min(window.devicePixelRatio||1,Math.max(1,X.current.maxDpr)),i=Math.max(1,Math.round(a.width)),s=Math.max(1,Math.round(a.height)),n=v?.34:Math.min(1,Math.max(.4,X.current.resolution)),o=Math.max(2,Math.round(i*r)),l=Math.max(2,Math.round(s*r)),c=Math.max(2,Math.round(o*n)),u=Math.max(2,Math.round(l*n));if(o===I&&l===B&&c===H&&u===O)return;I=o,B=l,H=c,O=u,t.width=o,t.height=l,t.style.width=i+"px",t.style.height=s+"px",Y(),_=k(c,u),C=k(c,u),F=k(c,u);let h=Math.max(2,c>>2),d=Math.max(2,u>>2);P=k(h,d),U=k(h,d)}let $=6*!!a,V=0,K=!0,J=!0,Q=0;function Z(e,t){i.useProgram(e.program),i.bindFramebuffer(i.FRAMEBUFFER,t?t.fb:null),i.viewport(0,0,t?t.w:I,t?t.h:B)}function ee(){i.drawArrays(i.TRIANGLES,0,3)}function et(e,t){i.activeTexture(i.TEXTURE0+t),i.bindTexture(i.TEXTURE_2D,e)}let ea=[[.5,.333],[.25,.667],[.75,.111],[.125,.444],[.625,.778],[.375,.222],[.875,.556],[.0625,.889]];function er(e){if(!S||!N||!D||!A||!R||!_||!C||!F||!P||!U)return;let t=X.current,a=(t.azimuth+t.orbitSpeed*e)*h,r=Math.max(-88,Math.min(88,t.elevation))*h,s=Math.max(2.2,t.distance),n=Math.cos(r),o=s*n*Math.cos(a),l=s*Math.sin(r),c=s*n*Math.sin(a),u=-o/s,f=-l/s,m=-c/s,p=m,g=0,x=-u,b=Math.hypot(p,0,x)||1;p/=b;let w=(g/=b)*m-(x/=b)*f,j=x*u-p*m,T=p*f-g*u,k=Math.cos(t.roll*h),M=Math.sin(t.roll*h),H=p*k+w*M,O=g*k+j*M,G=x*k+T*M,z=-p*M+w*k,W=-g*M+j*k,Y=-x*M+T*k,q=d(t.hotColor),$=d(t.midColor),V=d(t.coolColor),K=Math.max(t.diskInner+.5,t.diskOuter);Z(S,_);let J=S.u;i.uniform2f(J.uRes,_.w,_.h),i.uniform1f(J.uTime,e),i.uniform3f(J.uCamPos,o,l,c),i.uniform3f(J.uRight,H,O,G),i.uniform3f(J.uUp,z,W,Y),i.uniform3f(J.uFwd,u,f,m),i.uniform1f(J.uTanHalf,Math.tan(.5*Math.max(8,Math.min(110,t.fov))*h)),i.uniform2f(J.uFocus,t.focus[0],1-t.focus[1]),i.uniform1f(J.uSteps,v?130:Math.max(60,Math.min(460,Math.round(t.steps)))),i.uniform1f(J.uSkyR,Math.max(1.35*s,2.4*K)),i.uniform1f(J.uDiskIn,Math.max(1.05,t.diskInner)),i.uniform1f(J.uDiskOut,K),i.uniform1f(J.uThick,Math.max(.02,t.diskThickness)),i.uniform1f(J.uDensity,Math.max(0,t.diskDensity)),i.uniform1f(J.uSpin,6.2831853*t.spinSpeed),i.uniform1f(J.uGrain,Math.max(.02,t.grain)),i.uniform1f(J.uBright,Math.max(0,t.brightness)),i.uniform1f(J.uDoppler,Math.max(0,Math.min(1,t.doppler))),i.uniform3f(J.uHot,q[0],q[1],q[2]),i.uniform3f(J.uMid,$[0],$[1],$[2]),i.uniform3f(J.uCool,V[0],V[1],V[2]),i.uniform1f(J.uStars,Math.max(0,t.starBrightness)),i.uniform1f(J.uEncode,+!y);let Q=ea[L%ea.length];i.uniform2f(J.uJitter,Q[0]-.5,Q[1]-.5),i.uniform1f(J.uSeed,L%64*17.13),ee();let er=0===L?1:.14;Z(N,F),et(_.tex,0),et(C.tex,1),i.uniform1i(N.u.uCur,0),i.uniform1i(N.u.uPrev,1),i.uniform1f(N.u.uAlpha,er),ee();let ei=F,es=C;C=F,F=es,L++,Z(D,P),et(ei.tex,0),i.uniform1i(D.u.uTex,0),i.uniform2f(D.u.uTexel,1/ei.w,1/ei.h),i.uniform1f(D.u.uDecode,+!y),i.uniform1f(D.u.uPack,E),i.uniform1f(D.u.uThreshold,.85),ee();let en=(e,t,a,r)=>{Z(A,t),et(e.tex,0),i.uniform1i(A.u.uTex,0),i.uniform2f(A.u.uStep,a/t.w,r/t.h),ee()};en(P,U,1,0),en(U,P,0,1),en(P,U,2.6,0),en(U,P,0,2.6),Z(R,null),et(ei.tex,0),et(P.tex,1),i.uniform1i(R.u.uScene,0),i.uniform1i(R.u.uBloom,1),i.uniform2f(R.u.uRes,I,B),i.uniform1f(R.u.uDecode,+!y),i.uniform1f(R.u.uPack,E),i.uniform1f(R.u.uGlow,.26*Math.max(0,t.glow)),i.uniform1f(R.u.uExposure,Math.max(.05,t.exposure)),i.uniform1f(R.u.uVignette,Math.max(0,Math.min(1,t.vignette))),i.uniform1f(R.u.uScrimDir,"left"===t.scrim?1:"right"===t.scrim?2:"top"===t.scrim?3:4*("bottom"===t.scrim)),i.uniform1f(R.u.uScrimAmt,Math.max(0,Math.min(1,t.scrimStrength))),i.uniform1f(R.u.uSeed,60*e%1e3),ee()}function ei(e){for(let t=0;t<e;t++)er($)}function es(e){if(!K)return;if(Q=requestAnimationFrame(es),!J){V=e;return}let t=V?Math.min(.05,(e-V)/1e3):0;V=e,X.current.paused||a||($+=t),er($)}if(!W())return void f("build-failed");q(),ei(a?16:1),a||(Q=requestAnimationFrame(es));let en=new ResizeObserver(()=>{q(),(a||X.current.paused)&&ei(16)});en.observe(e);let eo=new IntersectionObserver(e=>{J=e[0]?.isIntersecting??!0},{threshold:0});eo.observe(e);let el=()=>{J=!document.hidden,V=0},ec=e=>{e.preventDefault(),K=!1,cancelAnimationFrame(Q),t.style.display="none"},eu=()=>{(I=B=H=O=0,W())?(t.style.display="",e.dataset.webgl="",q(),K=!0,V=0,ei(a?16:1),a||(Q=requestAnimationFrame(es))):f("lost")};return document.addEventListener("visibilitychange",el),t.addEventListener("webglcontextlost",ec),t.addEventListener("webglcontextrestored",eu),()=>{for(let e of(K=!1,cancelAnimationFrame(Q),en.disconnect(),eo.disconnect(),document.removeEventListener("visibilitychange",el),t.removeEventListener("webglcontextlost",ec),t.removeEventListener("webglcontextrestored",eu),Y(),M&&i.deleteBuffer(M),[S,N,D,A,R]))e&&i.deleteProgram(e.program)}},[]),(0,r.jsxs)("div",{ref:G,className:`relative isolate h-full w-full overflow-hidden bg-black ${B}`,...O,children:[(0,r.jsx)("canvas",{ref:z,"aria-hidden":"true",className:"absolute inset-0 h-full w-full"}),H?(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:H}):null]})}function m(){let e=function(){let[e,t]=(0,i.useState)(!1);return(0,i.useEffect)(()=>{let e=window.matchMedia("(max-width: 767px)"),a=()=>t(e.matches);return a(),e.addEventListener("change",a),()=>e.removeEventListener("change",a)},[]),e}(),[t,a]=(0,i.useState)(!1),[s,n]=(0,i.useState)(0),[o,l]=(0,i.useState)(-5.5);return(0,r.jsx)("section",{className:"blackHoleLanding","aria-label":"Portfolio introduction",onPointerMove:e=>{if("mouse"!==e.pointerType)return;let t=e.currentTarget.getBoundingClientRect(),a=(e.clientX-t.left)/t.width-.5,r=(e.clientY-t.top)/t.height-.5;n(12*a),l(-5.5-8*r)},onPointerLeave:()=>{n(0),l(-5.5)},children:(0,r.jsxs)(f,{focus:e?[.5,.76]:[.72,.46],scrim:e?"top":"left",scrimStrength:.92,distance:24,elevation:e?-7:o,azimuth:e?0:s,fov:e?58:42,glow:e?.85:1.1,steps:e?170:260,resolution:e?.55:.68,paused:t,children:[(0,r.jsxs)("nav",{className:"blackHoleNav","aria-label":"Primary navigation",children:[(0,r.jsxs)("a",{className:"blackHoleMark",href:"#top","aria-label":"Rob Stigau, home",children:["RS",(0,r.jsx)("span",{children:"."})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("a",{href:"#projects",children:"Work"}),(0,r.jsx)("a",{href:"#about",children:"About"}),(0,r.jsx)("a",{href:"#contact",children:"Contact"})]})]}),(0,r.jsxs)("div",{className:"blackHoleCopy",children:[(0,r.jsx)("p",{className:"blackHoleEyebrow",children:"Rob Stigau \xb7 Developer & maker"}),(0,r.jsxs)("h1",{children:["Building at the edge",(0,r.jsx)("br",{}),(0,r.jsx)("span",{children:"of what's possible."})]}),(0,r.jsx)("p",{className:"blackHoleIntro",children:"Thoughtful digital experiences, useful tools, and experiments made with code."}),(0,r.jsxs)("div",{className:"blackHoleActions",children:[(0,r.jsxs)("a",{className:"blackHolePrimary",href:"#projects",children:["Explore my work ",(0,r.jsx)("span",{"aria-hidden":"true",children:"↓"})]}),(0,r.jsxs)("a",{className:"blackHoleSecondary",href:"https://github.com/RobStigau",target:"_blank",rel:"noreferrer",children:["GitHub ",(0,r.jsx)("span",{"aria-hidden":"true",children:"↗"})]})]})]}),(0,r.jsxs)("div",{className:"blackHoleControls",children:[(0,r.jsx)("span",{className:"cameraHint",children:"Move your cursor to shift perspective"}),(0,r.jsxs)("button",{type:"button",onClick:()=>a(e=>!e),children:[(0,r.jsx)("span",{className:t?"statusDot paused":"statusDot"}),t?"Resume motion":"Pause motion"]})]})]})})}},9656:(e,t,a)=>{"use strict";a.d(t,{CosmicPortfolio:()=>o});var r=a(9509),i=a(8993);let s=[{number:"01",eyebrow:"Flagship build",title:"Featured Web Experience",description:"A polished digital product built around a clear idea, thoughtful interaction, and a fast, dependable frontend.",detail:"Use this space for the story behind your strongest project: the problem, the decisions you made, and the result you delivered.",tags:["Next.js","TypeScript","Product design"],tone:"solar"},{number:"02",eyebrow:"Product system",title:"Interface in Orbit",description:"A product concept that turns complicated information into a focused, intuitive experience people can understand quickly.",detail:"Add screenshots, a live link, and measurable outcomes when this case study is ready to launch.",tags:["Research","UX strategy","Prototype"],tone:"lunar"},{number:"03",eyebrow:"Creative research",title:"Experimental Signal",description:"A place for ambitious technical experiments, unusual visual ideas, and the discoveries that happen along the way.",detail:"This card is designed for work that proves curiosity, creative coding, or a technically difficult breakthrough.",tags:["Creative code","WebGL","Interaction"],tone:"nebula"},{number:"04",eyebrow:"Open source",title:"Tools for the Voyage",description:"Useful software made to remove friction, automate repetitive work, or help other builders move faster.",detail:"Connect this project to its GitHub repository and explain who it helps, how it works, and what you learned building it.",tags:["Tooling","Automation","GitHub"],tone:"aurora"}];function n({project:e}){let t=(0,i.useRef)(null),[a,s]=(0,i.useState)(!1);return(0,r.jsxs)("article",{ref:t,className:`missionCard ${e.tone} reveal`,onPointerMove:e=>{if("mouse"!==e.pointerType||!t.current)return;let a=t.current.getBoundingClientRect(),r=(e.clientX-a.left)/a.width,i=(e.clientY-a.top)/a.height;t.current.style.setProperty("--tilt-x",`${(.5-i)*8}deg`),t.current.style.setProperty("--tilt-y",`${(r-.5)*9}deg`),t.current.style.setProperty("--light-x",`${100*r}%`),t.current.style.setProperty("--light-y",`${100*i}%`)},onPointerLeave:()=>{t.current?.style.setProperty("--tilt-x","0deg"),t.current?.style.setProperty("--tilt-y","0deg")},children:[(0,r.jsxs)("div",{className:"missionVisual","aria-hidden":"true",children:[(0,r.jsx)("div",{className:"coordinateGrid"}),(0,r.jsxs)("div",{className:"projectPlanet",children:[(0,r.jsx)("span",{className:"planetCore"}),(0,r.jsx)("span",{className:"orbit orbitOne",children:(0,r.jsx)("i",{})}),(0,r.jsx)("span",{className:"orbit orbitTwo",children:(0,r.jsx)("i",{})}),(0,r.jsx)("span",{className:"orbit orbitThree"})]}),(0,r.jsx)("span",{className:"visualIndex",children:e.number}),(0,r.jsx)("span",{className:"visualTelemetry",children:"SYS / ONLINE"}),(0,r.jsx)("span",{className:"crosshair crosshairOne",children:"+"}),(0,r.jsx)("span",{className:"crosshair crosshairTwo",children:"+"})]}),(0,r.jsxs)("div",{className:"missionBody",children:[(0,r.jsxs)("div",{className:"missionHeading",children:[(0,r.jsxs)("div",{children:[(0,r.jsx)("p",{children:e.eyebrow}),(0,r.jsx)("h3",{children:e.title})]}),(0,r.jsxs)("span",{className:"missionNumber",children:["/",e.number]})]}),(0,r.jsx)("p",{className:"missionDescription",children:e.description}),(0,r.jsx)("ul",{className:"missionTags","aria-label":`${e.title} technologies`,children:e.tags.map(e=>(0,r.jsx)("li",{children:e},e))}),(0,r.jsxs)("button",{className:"missionToggle",type:"button","aria-expanded":a,onClick:()=>s(e=>!e),children:[(0,r.jsx)("span",{children:a?"Close transmission":"Open transmission"}),(0,r.jsx)("span",{className:"toggleIcon","aria-hidden":"true",children:a?"−":"+"})]}),(0,r.jsx)("div",{className:a?"missionDetail expanded":"missionDetail",children:(0,r.jsxs)("div",{children:[(0,r.jsx)("span",{children:"Mission note"}),(0,r.jsx)("p",{children:e.detail}),(0,r.jsxs)("a",{href:"https://github.com/RobStigau",target:"_blank",rel:"noreferrer",children:["Explore on GitHub ",(0,r.jsx)("span",{"aria-hidden":"true",children:"↗"})]})]})})]})]})}function o(){let e=(0,i.useRef)(null),t=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let a=e.current;if(!a)return;let r=a.querySelectorAll(".reveal"),i=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.classList.add("visible"),i.unobserve(e.target))})},{threshold:.12,rootMargin:"0px 0px -5%"});r.forEach(e=>i.observe(e));let s=0,n=()=>{cancelAnimationFrame(s),s=requestAnimationFrame(()=>{let e=document.documentElement.scrollHeight-window.innerHeight,a=e>0?window.scrollY/e:0;t.current?.style.setProperty("transform",`scaleX(${a})`)})};return n(),window.addEventListener("scroll",n,{passive:!0}),()=>{i.disconnect(),cancelAnimationFrame(s),window.removeEventListener("scroll",n)}},[]),(0,r.jsxs)("div",{ref:e,className:"cosmicShell",onPointerMove:t=>{let a=e.current;a&&"mouse"===t.pointerType&&(a.style.setProperty("--pointer-x",`${t.clientX}px`),a.style.setProperty("--pointer-y",`${t.clientY}px`))},children:[(0,r.jsx)("div",{className:"scrollProgress",ref:t,"aria-hidden":"true"}),(0,r.jsx)("div",{className:"cosmicNoise","aria-hidden":"true"}),(0,r.jsx)("div",{className:"pointerGlow","aria-hidden":"true"}),(0,r.jsxs)("section",{className:"entrySequence","aria-label":"Introduction",children:[(0,r.jsx)("div",{className:"entryBeam","aria-hidden":"true",children:(0,r.jsx)("span",{})}),(0,r.jsxs)("div",{className:"entryCopy reveal",children:[(0,r.jsx)("p",{className:"cosmicLabel",children:"Crossing the horizon"}),(0,r.jsxs)("h2",{children:["Ideas become real",(0,r.jsx)("br",{}),(0,r.jsx)("span",{children:"when you build them."})]}),(0,r.jsx)("p",{children:"Scroll to enter the project archive."})]}),(0,r.jsxs)("div",{className:"orbitTicker","aria-hidden":"true",children:[(0,r.jsx)("span",{children:"Design"}),(0,r.jsx)("i",{}),(0,r.jsx)("span",{children:"Engineering"}),(0,r.jsx)("i",{}),(0,r.jsx)("span",{children:"Experimentation"}),(0,r.jsx)("i",{}),(0,r.jsx)("span",{children:"Iteration"})]})]}),(0,r.jsxs)("section",{className:"missionArchive",id:"projects",children:[(0,r.jsxs)("header",{className:"archiveHeader reveal",children:[(0,r.jsxs)("div",{children:[(0,r.jsx)("p",{className:"cosmicLabel",children:"Selected missions \xb7 2026"}),(0,r.jsx)("h2",{children:"Project archive"})]}),(0,r.jsx)("p",{className:"archiveIntro",children:"A growing record of products, experiments, and useful things made with attention to both how they work and how they feel."})]}),(0,r.jsx)("div",{className:"missionGrid",children:s.map(e=>(0,r.jsx)(n,{project:e},e.number))})]}),(0,r.jsxs)("section",{className:"aboutOrbit",id:"about",children:[(0,r.jsxs)("div",{className:"aboutSystem reveal","aria-hidden":"true",children:[(0,r.jsx)("div",{className:"systemHalo haloOuter"}),(0,r.jsx)("div",{className:"systemHalo haloMiddle"}),(0,r.jsx)("div",{className:"systemHalo haloInner"}),(0,r.jsx)("div",{className:"systemCore",children:(0,r.jsx)("span",{children:"RS"})}),(0,r.jsx)("span",{className:"systemMoon moonOne"}),(0,r.jsx)("span",{className:"systemMoon moonTwo"}),(0,r.jsx)("span",{className:"systemLabel labelOne",children:"Curiosity"}),(0,r.jsx)("span",{className:"systemLabel labelTwo",children:"Craft"}),(0,r.jsx)("span",{className:"systemLabel labelThree",children:"Clarity"})]}),(0,r.jsxs)("div",{className:"aboutNarrative reveal",children:[(0,r.jsx)("p",{className:"cosmicLabel",children:"About the builder"}),(0,r.jsxs)("h2",{children:["Curious by nature.",(0,r.jsx)("br",{}),(0,r.jsx)("span",{children:"Intentional by design."})]}),(0,r.jsx)("p",{children:"I'm Rob, a developer and maker interested in the point where strong engineering meets thoughtful design. I learn by building, testing, and refining until the experience feels inevitable."}),(0,r.jsxs)("div",{className:"principleGrid",children:[(0,r.jsxs)("div",{children:[(0,r.jsx)("strong",{children:"01"}),(0,r.jsx)("span",{children:"Think clearly"})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("strong",{children:"02"}),(0,r.jsx)("span",{children:"Build boldly"})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("strong",{children:"03"}),(0,r.jsx)("span",{children:"Refine deeply"})]})]})]})]}),(0,r.jsxs)("section",{className:"signalSection",id:"contact",children:[(0,r.jsx)("div",{className:"signalStars","aria-hidden":"true"}),(0,r.jsxs)("div",{className:"signalCopy reveal",children:[(0,r.jsx)("p",{className:"cosmicLabel",children:"Open channel"}),(0,r.jsxs)("h2",{children:["Let's make something",(0,r.jsx)("br",{}),(0,r.jsx)("span",{children:"worth discovering."})]}),(0,r.jsxs)("a",{href:"https://github.com/RobStigau",target:"_blank",rel:"noreferrer",children:[(0,r.jsx)("span",{children:"Start a conversation"}),(0,r.jsx)("i",{"aria-hidden":"true",children:"↗"})]})]})]}),(0,r.jsxs)("footer",{className:"cosmicFooter",children:[(0,r.jsxs)("p",{children:["\xa9 ",new Date().getFullYear()," Rob Stigau"]}),(0,r.jsx)("p",{children:"Built in California \xb7 Orbiting Earth"}),(0,r.jsx)("a",{href:"#top",children:"Return to launch ↑"})]})]})}}},e=>{e.O(0,[884,874,358],()=>e(e.s=3001)),_N_E=e.O()}]);