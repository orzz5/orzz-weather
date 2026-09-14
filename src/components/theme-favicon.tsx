"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const href = resolvedTheme === "dark" ? "/logo.png" : "/logo2.png";
    document
      .querySelectorAll('link[rel~="icon"]')
      .forEach((link) => link.setAttribute("href", href));
  }, [resolvedTheme]);

  return null;
}