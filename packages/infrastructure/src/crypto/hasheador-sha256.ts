import { createHash } from "node:crypto";
import type { Hasheador } from "@kuorum/application";

export class HasheadorSha256 implements Hasheador {
  sha256(texto: string): string {
    return createHash("sha256").update(texto, "utf8").digest("hex");
  }
}
