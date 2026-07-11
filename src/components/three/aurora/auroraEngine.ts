/*
 * Dependency-free WebGL1 aurora renderer (~4KB): a fullscreen triangle whose
 * fragment shader layers drifting fbm noise into vertical light curtains,
 * ramped across four brand aurora colours. Deliberately not three.js — the
 * home hero should never pay the three vendor tax for a background veil.
 *
 * The canvas is always rendered OPAQUE at the blend-mode identity colour
 * (white for multiply on light sections, black for screen on dark sections),
 * so CSS mix-blend-mode does the compositing and alpha ordering can't bite.
 */

export interface AuroraOptions {
  /** Four colours as [r,g,b] in 0..1, typically the --color-aurora-* tokens. */
  colors: [number, number, number][];
  /** 0..1 — overall strength of the curtains. */
  intensity: number;
  /** 'multiply' renders toward white (light sections), 'screen' toward black. */
  mode: 'multiply' | 'screen';
}

export interface AuroraInstance {
  start(): void;
  stop(): void;
  dispose(): void;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uIntensity;
uniform float uLight; /* 1.0 = multiply mode (toward white), 0.0 = screen */
uniform float uSat; /* saturation boost — pastel brand tokens need help on dark */
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.028;

  /* Two curtain layers: x compressed into ribbons, y stretched, drifting
     in opposite directions so the bands shimmer rather than slide. */
  float c1 = fbm(vec2(uv.x * 3.2 + t, uv.y * 0.4 - t * 0.55));
  float c2 = fbm(vec2(uv.x * 5.1 - t * 1.35, uv.y * 0.55 + t * 0.4) + 7.31);
  float band = smoothstep(0.26, 0.72, c1) * smoothstep(0.24, 0.66, c2);

  /* Curtains hang in the upper sky of the section, fading out well before
     the bottom (uv.y: 0 = bottom, 1 = top). */
  float fade = smoothstep(0.18, 0.5, uv.y) * (1.0 - smoothstep(0.8, 1.0, uv.y));

  float h = fbm(vec2(uv.x * 1.9 - t * 0.5, uv.y * 0.8 + t * 0.22) + 3.7);
  vec3 col = mix(uC1, uC2, smoothstep(0.25, 0.75, h));
  col = mix(col, uC3, smoothstep(0.45, 0.95, c2) * 0.55);
  col = mix(col, uC4, smoothstep(0.55, 1.0, uv.x * 0.7 + h * 0.45) * 0.35);

  /* Push the pastels toward vivid around their own luminance. */
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = clamp(vec3(lum) + (col - vec3(lum)) * uSat, 0.0, 1.0);

  float a = band * fade * uIntensity;
  a += (hash(gl_FragCoord.xy) - 0.5) / 96.0; /* dither kills banding */
  a = clamp(a, 0.0, 1.0);

  vec3 identity = mix(vec3(0.0), vec3(1.0), uLight);
  gl_FragColor = vec4(mix(identity, col, a), 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createAurora(canvas: HTMLCanvasElement, opts: AuroraOptions): AuroraInstance | null {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'uTime');
  gl.uniform1f(gl.getUniformLocation(program, 'uIntensity'), opts.intensity);
  gl.uniform1f(gl.getUniformLocation(program, 'uLight'), opts.mode === 'multiply' ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(program, 'uSat'), opts.mode === 'multiply' ? 1.15 : 2.6);
  const slots = ['uC1', 'uC2', 'uC3', 'uC4'] as const;
  slots.forEach((name, i) => {
    const c = opts.colors[i] ?? opts.colors[opts.colors.length - 1] ?? [0.5, 0.7, 0.7];
    gl.uniform3f(gl.getUniformLocation(program, name), c[0], c[1], c[2]);
  });

  /* Render at half resolution — the effect is soft by nature, CSS upscales. */
  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * 0.5));
    const h = Math.max(1, Math.round(canvas.clientHeight * 0.5));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const t0 = performance.now();
  let rafId: number | null = null;
  let disposed = false;

  const frame = () => {
    if (disposed) return;
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (!disposed && rafId === null) rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
