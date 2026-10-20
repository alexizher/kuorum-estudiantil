import { DefinicionesDeTinta, SCRIPT_DE_TEMA, TemaProvider } from "@kuorum/ui";
import "@kuorum/ui/estilos.css";
import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";

// Archivo variable con ejes de ancho y peso: titulares condensados, texto en ancho normal.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Kuorum Estudiantil", template: "%s | Kuorum Estudiantil" },
  description: "Votaciones secretas y turnos de palabra para asambleas estudiantiles.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-tema lo fija el script antes de pintar, por eso el atributo difiere del HTML del servidor.
    <html lang="es" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DE_TEMA }} />
      </head>
      <body>
        <DefinicionesDeTinta />
        <TemaProvider>{children}</TemaProvider>
      </body>
    </html>
  );
}
