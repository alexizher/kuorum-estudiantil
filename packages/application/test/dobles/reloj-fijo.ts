import type { Reloj } from "@kuorum/domain";

export class RelojFijo implements Reloj {
  constructor(private readonly fecha: Date = new Date("2026-10-20T12:00:00Z")) {}

  ahora(): Date {
    return this.fecha;
  }
}
