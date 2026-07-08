"use client";

import { useEffect, useRef } from "react";
import { Camera, Geometry, Mesh, Program, Renderer, Transform } from "ogl";
import { LIME, MINT } from "@/lib/brand";

/**
 * A raymarched plasma filament, rendered to a WebGL canvas that fills its parent.
 *
 * Two sine/cosine-swept tubes are marched through a distance field; wherever the
 * march gets close to one, the pixel lights up in that tube's colour. Everything
 * else is `discard`ed, so the canvas is transparent and whatever sits behind it
 * shows through. That is what lets it sit at the bottom of the hero's layer stack
 * rather than replacing it.
 *
 * ── Cost ──────────────────────────────────────────────────────────────────
 * This is a full-screen fragment shader on a rAF loop. Three things keep it from
 * cooking a laptop while the reader is eight sections further down the page:
 *
 *   1. `prefers-reduced-motion` renders exactly one frame and stops;
 *   2. an IntersectionObserver parks the loop when the hero scrolls away;
 *   3. `visibilitychange` parks it when the tab is backgrounded.
 *
 * ── Props are read through a ref ───────────────────────────────────────────
 * The effect runs once (`[]`). Re-creating a WebGL context on every prop change
 * would be absurd, so the loop reads the latest props out of `propsRef` instead.
 */

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

const VERT = /* glsl */ `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
uniform float iTime;
uniform vec2  iResolution;
uniform vec2  uOffset;
uniform float uRotation;
uniform float uFocalLength;
uniform float uSpeed1;
uniform float uSpeed2;
uniform float uDir2;
uniform float uBend1;
uniform float uBend2;
uniform vec3  uColor1;
uniform vec3  uColor2;

const float lt   = 0.3;
const float pi2  = 6.28318;
const float pi_2 = 1.5708;
#define MAX_STEPS 14

void mainImage(out vec4 C, in vec2 U) {
  float t = iTime * 3.14159;
  float s = 1.0;
  float d = 0.0;
  vec2  R = iResolution;

  vec3 o = vec3(0.0, 0.0, -7.0);
  vec3 u = normalize(vec3((U - 0.5 * R) / R.y, uFocalLength));
  vec2 k = vec2(0.0);
  vec3 p;

  float t1 = t * 0.7;
  float t2 = t * 0.9;
  float tSpeed1 = t * uSpeed1;
  float tSpeed2 = t * uSpeed2 * uDir2;

  for (int i = 0; i < MAX_STEPS; ++i) {
    p = o + u * d;
    p.x -= 15.0;

    float px = p.x;
    float wob1 = uBend1 + sin(t1 + px * 0.8) * 0.1;
    float wob2 = uBend2 + cos(t2 + px * 1.1) * 0.1;

    float px2 = px + pi_2;
    vec2 sinOffset = sin(vec2(px, px2) + tSpeed1) * wob1;
    vec2 cosOffset = cos(vec2(px, px2) + tSpeed2) * wob2;

    vec2 yz = p.yz;
    float pxLt = px + lt;
    k.x = max(pxLt, length(yz - sinOffset) - lt);
    k.y = max(pxLt, length(yz - cosOffset) - lt);

    float current = min(k.x, k.y);
    s = min(s, current);
    if (s < 0.001 || d > 300.0) break;
    d += s * 0.7;
  }

  float sqrtD = sqrt(d);
  vec3 raw = max(cos(d * pi2) - s * sqrtD - vec3(k, 0.0), 0.0);
  raw.gb += 0.1;
  float maxC = max(raw.r, max(raw.g, raw.b));
  if (maxC < 0.15) discard;
  raw = raw * 0.4 + raw.brg * 0.6 + raw * raw;
  float lum = dot(raw, vec3(0.299, 0.587, 0.114));
  float w1 = max(0.0, 1.0 - k.x * 2.0);
  float w2 = max(0.0, 1.0 - k.y * 2.0);
  float wt = w1 + w2 + 0.001;
  vec3 c = (uColor1 * w1 + uColor2 * w2) / wt * lum * 3.5;
  C = vec4(c, 1.0);
}

void main() {
  vec2 coord = gl_FragCoord.xy + uOffset;
  coord -= 0.5 * iResolution;
  float c = cos(uRotation), s = sin(uRotation);
  coord = mat2(c, -s, s, c) * coord;
  coord += 0.5 * iResolution;

  vec4 color;
  mainImage(color, coord);
  gl_FragColor = color;
}
`;

export interface PlasmaWaveProps {
  xOffset?: number;
  yOffset?: number;
  rotationDeg?: number;
  focalLength?: number;
  speed1?: number;
  speed2?: number;
  dir2?: number;
  bend1?: number;
  bend2?: number;
  /** Tube colours, in order. Defaults to the brand ramp: crown, then nozzle. */
  colors?: [string, string];
}

export default function PlasmaWave(props: PlasmaWaveProps) {
  const propsRef = useRef<PlasmaWaveProps>(props);
  propsRef.current = props;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        dpr: Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1 : 1.5),
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      });
    } catch {
      return; // No WebGL. The hero's other backdrop layers still stand on their own.
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    ctn.appendChild(gl.canvas);

    const camera = new Camera(gl);
    const scene = new Transform();

    // One oversized triangle, not two triangles: no seam down the diagonal.
    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    });

    const {
      xOffset = 0,
      yOffset = 0,
      rotationDeg = 0,
      focalLength = 0.8,
      speed1 = 0.05,
      speed2 = 0.05,
      dir2 = 1,
      bend1 = 1,
      bend2 = 0.5,
      colors = [LIME, MINT] as [string, string],
    } = propsRef.current;

    const uOffset = new Float32Array([xOffset, yOffset]);
    const uResolution = new Float32Array([1, 1]);
    const uColor1 = new Float32Array(hexToRgb(colors[0]));
    const uColor2 = new Float32Array(hexToRgb(colors[1]));

    /* Colours change about never, and `hexToRgb` allocates. Parse only when the
       hex string actually moves — the original re-parsed both, every frame. */
    let hex1 = colors[0];
    let hex2 = colors[1];

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: uResolution },
        uOffset: { value: uOffset },
        uRotation: { value: (rotationDeg * Math.PI) / 180 },
        uFocalLength: { value: focalLength },
        uSpeed1: { value: speed1 },
        uSpeed2: { value: speed2 },
        uDir2: { value: dir2 },
        uBend1: { value: bend1 },
        uBend2: { value: bend2 },
        uColor1: { value: uColor1 },
        uColor2: { value: uColor2 },
      },
    });

    new Mesh(gl, { geometry, program }).setParent(scene);

    function resize() {
      const { width, height } = ctn!.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      uResolution[0] = width * renderer.dpr;
      uResolution[1] = height * renderer.dpr;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(ctn);
    resize();

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startTime = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const p = propsRef.current;
      const cols = p.colors ?? [LIME, MINT];

      uOffset[0] = p.xOffset ?? 0;
      uOffset[1] = p.yOffset ?? 0;
      if (cols[0] !== hex1) uColor1.set(hexToRgb((hex1 = cols[0])));
      if (cols[1] !== hex2) uColor2.set(hexToRgb((hex2 = cols[1])));

      const u = program.uniforms;
      u.iTime.value = (now - startTime) * 0.001;
      u.uRotation.value = ((p.rotationDeg ?? 0) * Math.PI) / 180;
      u.uFocalLength.value = p.focalLength ?? 0.8;
      u.uSpeed1.value = p.speed1 ?? 0.05;
      u.uSpeed2.value = p.speed2 ?? 0.05;
      u.uDir2.value = p.dir2 ?? 1;
      u.uBend1.value = p.bend1 ?? 1;
      u.uBend2.value = p.bend2 ?? 0.5;

      renderer.render({ scene, camera });
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    /* `running` is the AND of "hero is on screen" and "tab is in front". Both
       observers flip their own half and call this, so neither can resurrect a
       loop the other one parked. */
    let onScreen = true;
    let visible = document.visibilityState === "visible";
    const sync = () => {
      const shouldRun = onScreen && visible && !reduced;
      if (shouldRun && !frame) frame = requestAnimationFrame(loop);
      if (!shouldRun && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    });
    io.observe(ctn);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) draw(startTime); // One still frame, then never again.
    else sync();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
