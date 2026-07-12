import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable in dev for faster builds
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
