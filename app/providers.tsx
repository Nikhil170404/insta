"use client";

import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
      <Analytics />
    </>
  );
}

