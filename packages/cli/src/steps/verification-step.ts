import type { DeployContext, Step } from "../wizard/step.js";

const ATTEMPTS = 12;
const ATTEMPT_TIMEOUT_MS = 10_000;
const INTERVAL_MS = 5000; // cubre el arranque en frío de Neon

export class VerificationStep implements Step {
  readonly id = "verificacion";
  readonly description = "Verificando que el sitio responde";

  async run({ state, fetch, sleep }: DeployContext): Promise<void> {
    if (!state.productionUrl) throw new Error("No hay URL de producción para verificar.");
    const url = `${state.productionUrl}/api/salud`;
    let last = "sin respuesta";
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
        if (response.status === 200) return;
        last = `HTTP ${response.status}`;
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
      }
      if (attempt < ATTEMPTS) await sleep(INTERVAL_MS);
    }
    throw new Error(
      `${url} no respondió 200 tras ${ATTEMPTS} intentos (última respuesta: ${last}).`,
    );
  }
}
