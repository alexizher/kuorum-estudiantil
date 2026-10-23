"use client";

import { Boton } from "@kuorum/ui";
import { useId, useState } from "react";
import type { DecisionDeMesa } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";

interface Propiedades {
  decision: DecisionDeMesa;
  /** Con el acta final el enunciado ya no cambia. */
  bloqueado: boolean;
  guardar: (decisionId: string, enunciado: string) => Promise<string | undefined>;
}

export function EnunciadoDeDecision({ decision, bloqueado, guardar }: Propiedades) {
  const id = useId();
  const [texto, setTexto] = useState(decision.enunciado ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);

  async function alGuardar(): Promise<void> {
    setGuardando(true);
    setError(await guardar(decision.id, texto));
    setGuardando(false);
  }

  return (
    <div className={estilos.enunciado}>
      <label className="campo__etiqueta" htmlFor={id}>
        Enunciado
      </label>
      <textarea
        id={id}
        className="campo__entrada"
        rows={2}
        maxLength={500}
        value={texto}
        disabled={bloqueado}
        onChange={(e) => setTexto(e.target.value)}
      />
      {bloqueado ? (
        <p className="suave">El acta está finalizada: el enunciado ya no se puede cambiar.</p>
      ) : null}
      {error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {error}
        </p>
      ) : null}
      <Boton onClick={() => void alGuardar()} disabled={bloqueado || guardando}>
        Guardar enunciado
      </Boton>
    </div>
  );
}
