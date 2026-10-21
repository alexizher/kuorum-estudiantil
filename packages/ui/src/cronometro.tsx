interface Propiedades {
  /** Segundos que quedan. */
  restantes: number;
  /** Segundos del turno completo; con él se dibuja la barra de lo usado. */
  total?: number;
  tamano?: "mediano" | "grande";
}

const AVISO_PRONTO_EN_SEGUNDOS = 30;

export function formatearTiempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Cronometro({ restantes, total, tamano = "mediano" }: Propiedades) {
  const aviso =
    restantes <= 0 ? "fin" : restantes <= AVISO_PRONTO_EN_SEGUNDOS ? "pronto" : undefined;
  const usado =
    total && total > 0
      ? Math.min(100, Math.max(0, ((total - restantes) / total) * 100))
      : undefined;
  return (
    <div className={`cronometro cronometro--${tamano}`}>
      <p className="cronometro__cifra num" aria-label="Tiempo restante" data-aviso={aviso}>
        {formatearTiempo(restantes)}
      </p>
      {usado !== undefined ? (
        <div className="barra" aria-hidden="true">
          <div className="barra__llena" style={{ width: `${Number(usado.toFixed(1))}%` }} />
        </div>
      ) : null}
    </div>
  );
}
