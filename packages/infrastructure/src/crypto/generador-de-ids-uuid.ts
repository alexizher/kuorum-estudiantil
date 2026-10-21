import { randomUUID } from "node:crypto";
import type { GeneradorDeIds } from "@kuorum/domain";

export class GeneradorDeIdsUuid implements GeneradorDeIds {
  nuevo(): string {
    return randomUUID();
  }
}
