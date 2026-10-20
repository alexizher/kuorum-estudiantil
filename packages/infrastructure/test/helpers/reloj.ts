import type { Reloj } from "@kuorum/domain";

export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
