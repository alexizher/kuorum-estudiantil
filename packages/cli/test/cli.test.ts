import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/cli.js";

describe("parseCommand", () => {
  it("reconoce desplegar con y sin --config", () => {
    expect(parseCommand(["desplegar"])).toEqual({ kind: "desplegar" });
    expect(parseCommand(["desplegar", "--config", "a.json"])).toEqual({
      kind: "desplegar",
      configPath: "a.json",
    });
  });

  it("ignora el separador -- que reenvía pnpm", () => {
    expect(parseCommand(["desplegar", "--", "--config", "a.json"])).toEqual({
      kind: "desplegar",
      configPath: "a.json",
    });
  });

  it("muestra el uso con una opción desconocida, sin comando o con otro comando", () => {
    expect(parseCommand(["desplegar", "--foo"])).toEqual({ kind: "uso" });
    expect(parseCommand([])).toEqual({ kind: "uso" });
    expect(parseCommand(["otro"])).toEqual({ kind: "uso" });
    expect(parseCommand(["desplegar", "--config"])).toEqual({ kind: "uso" });
  });
});
