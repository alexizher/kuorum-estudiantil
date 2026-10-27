const path = require("node:path");

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
      to: { pathNot: "^(packages/(domain|application)/|@kuorum/(domain|application)(/|$))" },
    },
    {
      name: "nadie-importa-apps",
      comment: "Los paquetes no dependen de las apps.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^(apps/|@kuorum/web(/|$))" },
    },
    {
      name: "contracts-sin-capas",
      comment:
        "contracts solo depende de zod: no importa domain, application, infrastructure ni apps.",
      severity: "error",
      from: { path: "^packages/contracts/src" },
      to: {
        path: "^(packages/(domain|application|infrastructure)/|apps/|@kuorum/(domain|application|infrastructure|web)(/|$))",
      },
    },
    {
      name: "ui-sin-capas",
      comment:
        "ui solo importa react, qrcode, contracts y a sí misma: nada de domain, application, infrastructure, apps ni módulos de Node.",
      severity: "error",
      from: { path: "^packages/ui/src" },
      to: {
        pathNot: [
          "^packages/(ui|contracts)/",
          "^@kuorum/(ui|contracts)(/|$)",
          "^(react|qrcode)(/|$)",
          "(^|/)node_modules/(react|qrcode|@types/react|@types/qrcode)(/|$)",
        ],
      },
    },
    {
      name: "web-infraestructura-solo-en-composicion",
      comment:
        "Dentro de apps/web solo src/composicion.ts y src/auth/ importan infrastructure; las rutas y páginas pasan por la composición.",
      severity: "error",
      from: {
        path: "^apps/web/src/",
        pathNot: ["^apps/web/src/composicion\\.ts$", "^apps/web/src/auth/"],
      },
      to: { path: "^(packages/infrastructure/|@kuorum/infrastructure(/|$))" },
    },
    {
      name: "nadie-importa-cli",
      comment: "Nada fuera de packages/cli importa packages/cli.",
      severity: "error",
      from: { pathNot: "^packages/cli/" },
      to: { path: "^(packages/cli/|@kuorum/cli(/|$))" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // dist no se excluye: un import por nombre de workspace resuelve a packages/<x>/dist
    // y excluirlo borraría la arista. Si dist no existe, la regla casa el nombre @kuorum/*.
    exclude: { path: "(^|/)(\\.next|\\.turbo)/" },
    tsPreCompilationDeps: true,
    // Resuelve el alias @/* de apps/web; sin esto esos imports quedan sin arista.
    // Ruta absoluta: con una relativa, TypeScript no encuentra los archivos del include.
    tsConfig: { fileName: path.join(__dirname, "apps/web/tsconfig.json") },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs"],
    },
  },
};
