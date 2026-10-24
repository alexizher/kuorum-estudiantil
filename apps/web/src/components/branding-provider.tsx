"use client";

import { useEffect } from "react";

interface InstitucionBranding {
  logoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  pieDePagina: string | null;
  textoBienvenida: string | null;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let ignorar = false;
    fetch("/api/public/v1/institucion")
      .then((res) => res.json())
      .then((data: InstitucionBranding) => {
        if (ignorar) return;
        const root = document.documentElement;
        if (data.colorPrimario) {
          root.style.setProperty("--color-primario", data.colorPrimario);
        }
        if (data.colorSecundario) {
          root.style.setProperty("--color-secundario", data.colorSecundario);
        }
        // Also set the legacy variable names used in tokens.css
        if (data.colorPrimario) {
          // Apply to both light and dark mode custom properties
          root.style.setProperty("--primario", data.colorPrimario);
        }
        if (data.colorSecundario) {
          root.style.setProperty("--secundario", data.colorSecundario);
        }
      })
      .catch(() => {
        // Silently ignore errors - use defaults
      });
    return () => {
      ignorar = true;
    };
  }, []);

  return <>{children}</>;
}
