"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

interface LottiePlayerProps {
  animationPath: string;
  className?: string;
  loop?: boolean;
}

export default function LottiePlayer({ animationPath, className, loop = true }: LottiePlayerProps) {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch(animationPath)
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => console.error("Error loading lottie file:", error));
  }, [animationPath]);

  if (!animationData) return <div className={className} />;

  return (
    <div className={className}>
      <Lottie 
        animationData={animationData} 
        loop={loop} 
        {...({ renderer: "canvas" } as any)}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
      />
    </div>
  );
}
