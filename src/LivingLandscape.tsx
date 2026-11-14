import { useEffect, useRef, useState } from 'react';
import type { DisasterState } from './disasters';
import { fabricRegions, foliageRegions, landscapeCover, landscapeMotionProfile } from './landscapeMotion';

type Props = {
  src: string;
  alt: string;
  disaster: DisasterState;
  day: number;
  paused?: boolean;
  /** An explicit scenery preference may override the OS setting. */
  reducedMotion?: boolean;
};

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = vec2((aPosition.x + 1.0) * 0.5, (1.0 - aPosition.y) * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
const glslRegions = (regions: readonly (readonly number[])[]) => regions.map(r => `mask(uv, vec4(${r.map(n => n.toFixed(4)).join(',')}))`).reduce((a, b) => `max(${a}, ${b})`);
const fragmentSource = `
precision mediump float;
uniform sampler2D uImage;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform float uTime;
uniform float uWind;
uniform float uSpeed;
uniform float uCloudSpeed;
varying vec2 vUv;
float mask(vec2 p, vec4 area) {
  float distance = length((p - area.xy) / area.zw);
  return 1.0 - smoothstep(0.56, 1.0, distance);
}
void main() {
  vec2 uv = uOffset + vUv * uScale;
  vec3 original = texture2D(uImage, uv).rgb;
  float plants = ${glslRegions(foliageRegions)};
  float canvas = ${glslRegions(fabricRegions)};
  // Green and yellow leaves move together; stone walls, branches and roof tiles stay anchored.
  float leafColour = smoothstep(0.015, 0.105, original.g - original.r * 0.82 - original.b * 0.16);
  // Foreground flowers belong to the same moving stems, including pink and lavender petals.
  float blossoms = smoothstep(0.65, 0.80, uv.y) * (1.0 - smoothstep(0.18, 0.26, min(uv.x, 1.0 - uv.x)));
  plants *= max(leafColour, blossoms * 0.8);
  float t = uTime * uSpeed;
  float gust = sin(t * 1.15 + uv.y * 7.0) * 0.64 + sin(t * 2.07 + uv.x * 14.0) * 0.24 + sin(t * 0.48) * 0.12;
  vec2 displacement = vec2(gust * 0.014, sin(t * 1.4 + uv.x * 12.0) * 0.0045) * plants * uWind;
  displacement.y += canvas * sin(t * 2.6 + uv.x * 39.0) * 0.0032 * uWind;
  displacement.x += canvas * sin(t * 1.4 + uv.x * 11.0) * 0.0014 * uWind;
  float sky = smoothstep(0.54, 0.64, uv.x) * (1.0 - smoothstep(0.065, 0.13, uv.y));
  float cloudTime = uTime * uCloudSpeed;
  displacement.x += sky * (sin(cloudTime * 0.12) * 0.018 + sin(cloudTime * 0.031) * 0.007);
  vec3 colour = texture2D(uImage, clamp(uv + displacement, vec2(0.001), vec2(0.999))).rgb;
  // Broad travelling light resembles cloud shadows; geometry itself does not pan or zoom.
  float cloudShadow = sin(uv.x * 7.0 + uv.y * 2.0 - cloudTime * 0.32) * 0.018;
  float leafShadow = sin(uv.x * 32.0 + uv.y * 23.0 + t * 0.7) * 0.012 * plants;
  colour *= 1.0 + cloudShadow + leafShadow;
  gl_FragColor = vec4(colour, 1.0);
}`;

/** Animate the existing painted pixels without turning the architecture into a moving backdrop. */
export function LivingLandscape({ src, alt, disaster, day, paused = false, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configuration = useRef({ disaster, day, paused, reducedMotion });
  const refreshRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    configuration.current = { disaster, day, paused, reducedMotion };
    refreshRef.current?.();
  }, [disaster, day, paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { canvas.dataset.motion = 'unavailable'; return; }

    let disposed = false, loaded = false, visible = true, frame = 0, previous = 0, elapsed = 0;
    let width = 1, height = 1;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Landscape shader unavailable');
      return shader;
    };
    const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture();
    if (!program || !buffer || !texture) {
      if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer); if (texture) gl.deleteTexture(texture);
      canvas.dataset.motion = 'unavailable'; return;
    }
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Landscape shader link unavailable');
    } catch {
      shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); gl.deleteBuffer(buffer); gl.deleteTexture(texture);
      canvas.dataset.motion = 'unavailable'; return;
    }
    const uniforms = Object.fromEntries(['uImage', 'uScale', 'uOffset', 'uTime', 'uWind', 'uSpeed', 'uCloudSpeed'].map(key => [key, gl.getUniformLocation(program, key)]));
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.uImage, 0);

    const effectiveReduced = () => configuration.current.reducedMotion ?? media.matches;
    const canAnimate = () => loaded && !disposed && visible && !document.hidden && !configuration.current.paused && !effectiveReduced();
    const draw = () => {
      if (!loaded || disposed || gl.isContextLost()) return;
      const profile = landscapeMotionProfile(configuration.current.disaster, configuration.current.day);
      const cover = landscapeCover(width, height, image.naturalWidth, image.naturalHeight);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uScale, cover.scale[0], cover.scale[1]);
      gl.uniform2f(uniforms.uOffset, cover.offset[0], cover.offset[1]);
      gl.uniform1f(uniforms.uTime, elapsed);
      gl.uniform1f(uniforms.uWind, effectiveReduced() ? 0 : profile.wind);
      gl.uniform1f(uniforms.uSpeed, profile.speed);
      gl.uniform1f(uniforms.uCloudSpeed, profile.cloudSpeed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!canAnimate()) { previous = 0; return; }
      // No more than 30 rendered frames/second, independently for each visible timeline.
      if (!previous || now - previous >= 1000 / 30) {
        elapsed += previous ? Math.min((now - previous) / 1000, .1) : 0;
        previous = now; draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const refresh = () => {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      canvas.dataset.motion = !loaded ? 'loading' : effectiveReduced() ? 'reduced' : configuration.current.paused ? 'paused' : visible && !document.hidden ? 'running' : 'suspended';
      draw();
      if (canAnimate()) frame = requestAnimationFrame(tick);
    };
    refreshRef.current = refresh;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // Keep fill cost bounded on 4K screens while preserving crisp character/UI layers above it.
      const budgetScale = Math.min(1, 1800 / Math.max(width * dpr, height * dpr));
      canvas.width = Math.round(width * dpr * budgetScale); canvas.height = Math.round(height * dpr * budgetScale);
      draw();
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true; refresh();
    });
    intersection?.observe(canvas);
    const lost = (event: Event) => { event.preventDefault(); loaded = false; cancelAnimationFrame(frame); setReady(false); canvas.dataset.motion = 'unavailable'; };
    const restored = () => { if (!disposed) setGeneration(n => n + 1); };
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored);
    document.addEventListener('visibilitychange', refresh); media.addEventListener('change', refresh);
    image.onload = () => {
      if (disposed || gl.isContextLost()) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (gl.getError() !== gl.NO_ERROR) throw new Error('Landscape texture unavailable');
        loaded = true; resize(); setReady(true); refresh();
      } catch { canvas.dataset.motion = 'unavailable'; }
    };
    image.onerror = () => { canvas.dataset.motion = 'unavailable'; };
    image.src = src;
    return () => {
      disposed = true; cancelAnimationFrame(frame); refreshRef.current = null;
      observer.disconnect(); intersection?.disconnect(); image.onload = null; image.onerror = null;
      document.removeEventListener('visibilitychange', refresh); media.removeEventListener('change', refresh);
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored);
      shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); gl.deleteBuffer(buffer); gl.deleteTexture(texture);
    };
  }, [src, generation]);

  return <div className="living-landscape" data-renderer={ready ? 'webgl' : 'image'} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <img className="painted-landscape" src={src} alt={alt} draggable="false" />
    <canvas ref={canvasRef} className="living-landscape-canvas" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: ready ? 1 : 0, pointerEvents: 'none' }} />
  </div>;
}
