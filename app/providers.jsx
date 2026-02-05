"use client";

import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="autogradex-theme">
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
