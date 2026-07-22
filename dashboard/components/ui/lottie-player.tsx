"use client";

import lottie, { type AnimationItem } from "lottie-web";
import { useEffect, useRef } from "react";

interface LottiePlayerProps {
  animationPath: string;
  className?: string;
  loop?: boolean;
}

/**
 * Plays a Lottie straight through lottie-web rather than the react wrapper.
 *
 * `stack.json` is an 85-frame image sequence (one image layer per frame), not a
 * keyframed vector animation. That flavour only advances cleanly on the canvas
 * renderer with `clearCanvas` on — otherwise every frame paints over the last and
 * the whole stack reads as one frozen, overlapping mess. Letting lottie-web load
 * the path itself also preloads the embedded images before it starts, so the first
 * loop isn't dropped.
 */
export default function LottiePlayer({ animationPath, className, loop = true }: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let anim: AnimationItem | null = lottie.loadAnimation({
      container,
      renderer: "canvas",
      loop,
      autoplay: true,
      path: animationPath,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
        clearCanvas: true,
      },
    });

    return () => {
      anim?.destroy();
      anim = null;
    };
  }, [animationPath, loop]);

  return <div ref={containerRef} className={className} />;
}
