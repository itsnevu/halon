"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const Web3ProviderInner = dynamic(
  () => import("./web3-provider-inner").then((mod) => mod.Web3ProviderInner),
  { ssr: false }
);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  return <Web3ProviderInner>{children}</Web3ProviderInner>;
};
