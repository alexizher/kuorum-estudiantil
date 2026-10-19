/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-sin-dependencias",
      comment: "domain no importa nada fuera de packages/domain (ni node_modules ni otras capas).",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: { pathNot: "^packages/domain/" },
    },
    {
      name: "application-solo-domain",
      comment: "application solo importa domain y a sí misma.",
      severity: "error",
      from: { path: "^packages/application/src" },
      to: { pathNot: "^packages/(domain|application)/" },
    },
    {
      name: "nadie-importa-apps",
      comment: "Los paquetes no dependen de las apps.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "nadie-importa-cli",
      comment: "Nada fuera de packages/cli importa packages/cli.",
      severity: "error",
      from: { pathNot: "^packages/cli/" },
      to: { path: "^packages/cli/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(dist|\\.next|\\.turbo)/" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs"],
    },
  },
};
