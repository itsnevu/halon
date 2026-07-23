"use client";

import { useEffect, useMemo, useState } from "react";
import Hyperspeed from "@/components/ui/hyperspeed";

/* ── Palettes ─────────────────────────────────────────────────────
 *
 * Two colour sets, chosen by the active `.dark` class on <html> (the same
 * signal the theme toggler flips). The road geometry, distortion, and speed
 * are shared; only the colour block differs.
 *
 *   dark  → lime-green: the brand ramp (lime crown → mint nozzle) streaking
 *           past on a black road.
 *   light → black & greys only: monochrome traffic on a pale road, so the
 *           effect stays legible under the light theme without any colour.
 */

// Brand ramp — mirrors LIME / SPRING / MINT in lib/brand.ts.
const LIME = 0xc8e63c;
const SPRING = 0xbae95e;
const MINT = 0x61e7c3;

const darkColors = {
  roadColor: 0x080808,
  islandColor: 0x0a0a0a,
  background: 0x000000,
  shoulderLines: 0x1a1a1a,
  brokenLines: 0x1a1a1a,
  leftCars: [LIME, SPRING, 0x9fd42a],
  rightCars: [MINT, 0x8ef0d6, SPRING],
  sticks: LIME,
};

const lightColors = {
  roadColor: 0xeeeeee,
  islandColor: 0xe2e2e2,
  background: 0xf6f6f6,
  shoulderLines: 0x2a2a2a,
  brokenLines: 0x2a2a2a,
  leftCars: [0x000000, 0x111111, 0x222222],
  rightCars: [0x000000, 0x1a1a1a, 0x2a2a2a],
  sticks: 0x000000,
};

const BASE = {
  distortion: "turbulentDistortion",
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.8, 0.8] as [number, number],
  carFloorSeparation: [0, 5] as [number, number],
};

/**
 * Wraps Hyperspeed and feeds it a light or dark palette that tracks the
 * `.dark` class on <html>. A MutationObserver rebuilds the effect on theme
 * change; the memo keeps the effectOptions object stable otherwise so the
 * WebGL scene isn't torn down on every render.
 */
export default function HyperspeedBackground() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const el = document.documentElement;
    const read = () => setIsDark(el.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const effectOptions = useMemo(
    () => ({ ...BASE, colors: isDark ? darkColors : lightColors }),
    [isDark],
  );

  return <Hyperspeed effectOptions={effectOptions} />;
}
