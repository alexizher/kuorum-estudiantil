import type { DeployContext, Step } from "../wizard/step.js";

export class SummaryStep implements Step {
  readonly id = "resumen";
  readonly description = "Resumen";

  async run({ state, prompter }: DeployContext): Promise<void> {
    prompter.success(`Listo. Tu instalación está en ${state.productionUrl ?? "(sin URL)"}`);
    prompter.info(
      "Próximos pasos: dominio propio, límites del plan gratuito y cómo borrar lo creado en docs/despliegue.md",
    );
  }
}
