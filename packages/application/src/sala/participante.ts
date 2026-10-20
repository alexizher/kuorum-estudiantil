export interface Participante {
  id: string;
  sesionId: string;
  credencial: "CODIGO" | "NAVEGADOR";
  hash: string;
  creadoEn: Date;
}
