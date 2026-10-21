import QRCode from "qrcode";

interface Propiedades {
  valor: string;
  etiqueta: string;
  className?: string;
}

const ZONA_DE_SILENCIO = 4;

// Síncrono y sin HTML inyectado: sirve igual en servidor y en cliente.
export function Qr({ valor, etiqueta, className }: Propiedades) {
  const { modules } = QRCode.create(valor, { errorCorrectionLevel: "M" });
  const lado = modules.size;
  let trazo = "";
  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      if (modules.get(y, x)) trazo += `M${x + ZONA_DE_SILENCIO} ${y + ZONA_DE_SILENCIO}h1v1h-1z`;
    }
  }
  const total = lado + ZONA_DE_SILENCIO * 2;
  return (
    <svg
      className={["qr", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={etiqueta}
    >
      <rect width={total} height={total} fill="var(--qr-fondo)" />
      <path d={trazo} fill="var(--qr-tinta)" />
    </svg>
  );
}
