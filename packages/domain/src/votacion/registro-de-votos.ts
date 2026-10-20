// Puerto: la implementación vive en infraestructura. Un participante vota una vez
// por pregunta; si el par ya existe, emitir lanza ErrorDeDominio("YA_VOTO").
export interface RegistroDeVotos {
  emitir(preguntaId: string, participanteId: string, opcionId: string): Promise<void>;
  conteos(preguntaId: string): Promise<Map<string, number>>;
  votosEmitidos(preguntaId: string): Promise<number>;
}
