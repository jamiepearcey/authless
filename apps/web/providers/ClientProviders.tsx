"use client";

import { NextAuthProvider } from "./NextAuthProvider";
import { TRPCProvider } from "./TRPCProvider";
import { ReactNode } from "react";

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <NextAuthProvider>
      <TRPCProvider>
        {children}
      </TRPCProvider>
    </NextAuthProvider>
  );
}
