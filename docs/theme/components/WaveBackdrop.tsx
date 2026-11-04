import { prefersReducedMotion } from '@aora-bot/react';
import { useEffect, useRef, useState } from 'react';

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

/**
 * Domain-warped sine field with a slow brightness cycle. Two octaves is enough
 * for the texture to read as organic; more only costs fill rate.
 */
const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_tint;
uniform float u_dark;

float wave(vec2 p, float t) {
  return sin(p.x * 1.7 + t) * 0.5 + sin(p.y * 2.1 - t * 0.8) * 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0) * 3.0;

  float t = u_time * 0.08;
  vec2 warp = vec2(wave(p * 0.8, t), wave(p * 0.8 + 4.0, t * 1.1));
  float v = wave(p + warp * 0.9, t * 1.3) * 0.5 + wave(p * 1.9 + warp, -t) * 0.25;

  // Nine-second breath, modulating contrast alongside brightness so the field
  // recedes rather than merely dimming.
  float breath = 0.5 + 0.5 * sin(u_time * 0.698);
  float amount = mix(0.35, 1.0, breath);

  float shade = 0.5 + v * 0.5 * amount;
  vec3 col = mix(vec3(1.0), u_tint, shade * 0.5 * amount);
  col = mix(col, vec3(0.06, 0.06, 0.07) + u_tint * shade * 0.18, u_dark);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Ambient background for the documentation shell.
 *
 * Renders at half resolution, pauses when the tab is hidden, draws a single
 * frame under reduced motion, and falls back to a CSS gradient where WebGL is
 * unavailable. It is decoration, so it should never be the reason a page
 * drops frames.
 */
export function WaveBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }

    const program = buildProgram(gl);
    if (!program) {
      setFailed(true);
      return;
    }

    // The only program on this context, so it stays bound for every frame.
    // oxlint-disable-next-line react/hooks -- WebGL's `useProgram`, not a React hook
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uTint = gl.getUniformLocation(program, 'u_tint');
    const uDark = gl.getUniformLocation(program, 'u_dark');

    const scale = 0.5;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const reduced = prefersReducedMotion();
    const start = performance.now();
    let frame = 0;

    // Read the scheme the page is actually in, not a class name: Rspress marks
    // dark with `.rp-dark`, other hosts with `.dark`, and a page with neither
    // follows the system. All of that ends up in `color-scheme`. It changes
    // only when the theme is toggled, so it is cached and refreshed on that
    // event rather than read every frame.
    let dark = isDark();
    const refresh = () => {
      dark = isDark();
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', refresh);

    const draw = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform3f(uTint, 0.26, 0.52, 0.99);
      gl.uniform1f(uDark, dark ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduced) {
      draw(start);
    } else {
      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        if (document.hidden) return;
        draw(now);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      scheme.removeEventListener('change', refresh);
    };
  }, []);

  return (
    <div className="site-backdrop" aria-hidden="true">
      {failed ? <div className="site-backdrop__fallback" /> : <canvas ref={canvasRef} />}
    </div>
  );
}

/**
 * Whether the page is painting in its dark scheme.
 *
 * `color-scheme` resolves to `dark` or `light` when the page pins one
 * (`.dark`, `.rp-dark`, `[data-theme]`) and to `light dark` when it follows the
 * system, in which case the media query decides.
 */
function isDark(): boolean {
  const scheme = getComputedStyle(document.documentElement).colorScheme;
  const hasLight = scheme.includes('light');
  const hasDark = scheme.includes('dark');
  if (hasDark && hasLight) return window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (hasDark) return true;
  if (hasLight) return false;
  // `normal`: nothing declared a scheme, so fall back to the class names.
  const { classList } = document.documentElement;
  return classList.contains('dark') || classList.contains('rp-dark');
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}
