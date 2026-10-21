import {
  AbrirPregunta,
  AnularPregunta,
  CerrarPregunta,
  ConsultarEstadoDeSala,
  CrearPregunta,
  CrearSesion,
  DarLaPalabra,
  EmitirVoto,
  GenerarCodigosDeAcceso,
  IngresarASala,
  IniciarSesion,
  ListarPreguntasDeSesion,
  PedirLaPalabra,
  PresentarMocion,
  ProyectarResultado,
  RechazarMocion,
  RetirarSolicitud,
  SumarMinuto,
  TerminarIntervencion,
  TerminarSesion,
  type RepositorioDeSesiones,
} from "@kuorum/application";
import type { Reloj } from "@kuorum/domain";
import {
  ContextoTransaccional,
  GeneradorDeCodigosAleatorio,
  GeneradorDeIdsUuid,
  HasheadorSha256,
  PrismaRegistroDeVotos,
  PrismaRepositorioDeParticipantes,
  PrismaRepositorioDePreguntas,
  PrismaRepositorioDeSesiones,
  PrismaRepositorioDeSolicitudes,
  PrismaUnidadDeTrabajo,
  crearAdaptadorDeAutenticacion,
  createPrismaClient,
  verificarConexion,
} from "@kuorum/infrastructure";
import { crearAuth, urlBaseDesdeEntorno, type Autenticacion } from "./auth/crear-auth";

export interface Contenedor {
  // Sala (mesa)
  crearSesion: CrearSesion;
  iniciarSesion: IniciarSesion;
  terminarSesion: TerminarSesion;
  generarCodigosDeAcceso: GenerarCodigosDeAcceso;
  // Votación
  crearPregunta: CrearPregunta;
  listarPreguntasDeSesion: ListarPreguntasDeSesion;
  abrirPregunta: AbrirPregunta;
  cerrarPregunta: CerrarPregunta;
  anularPregunta: AnularPregunta;
  proyectarResultado: ProyectarResultado;
  emitirVoto: EmitirVoto;
  // Palabra
  pedirLaPalabra: PedirLaPalabra;
  presentarMocion: PresentarMocion;
  retirarSolicitud: RetirarSolicitud;
  darLaPalabra: DarLaPalabra;
  terminarIntervencion: TerminarIntervencion;
  rechazarMocion: RechazarMocion;
  sumarMinuto: SumarMinuto;
  // Participante
  ingresarASala: IngresarASala;
  consultarEstadoDeSala: ConsultarEstadoDeSala;
  /** Solo lectura: lista de la mesa y resolución de código de sala a sesión. */
  sesiones: RepositorioDeSesiones;
  verificarBaseDeDatos: () => Promise<boolean>;
  /** Se construye en el primer uso: exige BETTER_AUTH_SECRET solo a quien la pide. */
  autenticacion: () => Autenticacion;
}

let instancia: Contenedor | undefined;

const reloj: Reloj = { ahora: () => new Date() };

// Se construye en el primer uso: ni el import ni `next build` necesitan DATABASE_URL.
export function contenedor(): Contenedor {
  if (instancia === undefined) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl === undefined || databaseUrl === "") {
      throw new Error("Falta la variable de entorno DATABASE_URL");
    }
    const prisma = createPrismaClient(databaseUrl);
    // Todos los repositorios comparten el contexto: dentro de una unidad de trabajo usan su transacción.
    const contexto = new ContextoTransaccional(prisma);
    const unidad = new PrismaUnidadDeTrabajo(contexto);
    const sesiones = new PrismaRepositorioDeSesiones(contexto);
    const participantes = new PrismaRepositorioDeParticipantes(contexto);
    const preguntas = new PrismaRepositorioDePreguntas(contexto);
    const solicitudes = new PrismaRepositorioDeSolicitudes(contexto);
    const votos = new PrismaRegistroDeVotos(contexto);
    const ids = new GeneradorDeIdsUuid();
    const codigos = new GeneradorDeCodigosAleatorio();
    const hasheador = new HasheadorSha256();
    let auth: Autenticacion | undefined;
    instancia = {
      crearSesion: new CrearSesion(sesiones, unidad, ids, reloj, codigos),
      iniciarSesion: new IniciarSesion(sesiones, unidad),
      terminarSesion: new TerminarSesion(sesiones, unidad),
      generarCodigosDeAcceso: new GenerarCodigosDeAcceso(
        sesiones,
        participantes,
        unidad,
        codigos,
        hasheador,
      ),
      crearPregunta: new CrearPregunta(sesiones, preguntas, ids, unidad),
      listarPreguntasDeSesion: new ListarPreguntasDeSesion(sesiones, preguntas),
      abrirPregunta: new AbrirPregunta(sesiones, preguntas, reloj, unidad),
      cerrarPregunta: new CerrarPregunta(preguntas, sesiones, votos, reloj, unidad),
      anularPregunta: new AnularPregunta(preguntas, sesiones, unidad),
      proyectarResultado: new ProyectarResultado(preguntas, sesiones, unidad),
      emitirVoto: new EmitirVoto(participantes, preguntas, votos),
      pedirLaPalabra: new PedirLaPalabra(participantes, sesiones, solicitudes, reloj, ids, unidad),
      presentarMocion: new PresentarMocion(
        participantes,
        sesiones,
        solicitudes,
        reloj,
        ids,
        unidad,
      ),
      retirarSolicitud: new RetirarSolicitud(participantes, sesiones, solicitudes, unidad),
      darLaPalabra: new DarLaPalabra(sesiones, solicitudes, reloj, unidad),
      terminarIntervencion: new TerminarIntervencion(sesiones, solicitudes, reloj, unidad),
      rechazarMocion: new RechazarMocion(sesiones, solicitudes, unidad),
      sumarMinuto: new SumarMinuto(sesiones, solicitudes, unidad),
      ingresarASala: new IngresarASala(sesiones, participantes, unidad, hasheador, ids, reloj),
      consultarEstadoDeSala: new ConsultarEstadoDeSala(
        sesiones,
        participantes,
        preguntas,
        votos,
        solicitudes,
        reloj,
      ),
      sesiones,
      verificarBaseDeDatos: async () => {
        await verificarConexion(prisma);
        return true;
      },
      autenticacion: () => {
        const secreto = process.env.BETTER_AUTH_SECRET;
        if (secreto === undefined || secreto === "") {
          throw new Error("Falta la variable de entorno BETTER_AUTH_SECRET");
        }
        auth ??= crearAuth({
          adaptador: crearAdaptadorDeAutenticacion(prisma),
          secreto,
          urlBase: urlBaseDesdeEntorno(process.env),
        });
        return auth;
      },
    };
  }
  return instancia;
}
