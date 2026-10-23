import {
  AbrirPregunta,
  AnularPregunta,
  ArchivarCuerpo,
  AsignarMembresia,
  BuscarCruces,
  CancelarSesion,
  ConfigurarInstitucion,
  CrearCuentaDePersonal,
  CrearCuerpo,
  ListarCalendario,
  ListarPersonal,
  QuitarMembresia,
  RenombrarCuerpo,
  ReprogramarSesion,
  RestablecerContrasena,
  type RepositorioDeCuerpos,
  type RepositorioDeInstitucion,
  type RepositorioDeMembresias,
  CerrarPregunta,
  ConsultarEstadoDeSala,
  CrearPregunta,
  CrearSesion,
  DarLaPalabra,
  EmitirVoto,
  GenerarCodigosDeAcceso,
  IngresarASala,
  IniciarSesion,
  LimpiarSesionesDeDemo,
  ListarPreguntasDeSesion,
  ListarSesionesDeLaMesa,
  ObtenerSesionDeLaMesa,
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
  PrismaLimpiezaDeDemo,
  PrismaRegistroDeVotos,
  PrismaRepositorioDeActas,
  PrismaRepositorioDeDecisiones,
  PrismaRepositorioDeParticipantes,
  PrismaRepositorioDePreguntas,
  PrismaRepositorioDeSesiones,
  PrismaRepositorioDeSolicitudes,
  PrismaUnidadDeTrabajo,
  PrismaDirectorioDePersonal,
  PrismaRepositorioDeCuerpos,
  PrismaRepositorioDeInstitucion,
  PrismaRepositorioDeMembresias,
  crearAdaptadorDeAutenticacion,
  createPrismaClient,
  verificarConexion,
} from "@kuorum/infrastructure";
import { crearAuth, urlBaseDesdeEntorno, type Autenticacion } from "./auth/crear-auth";
import { CuentasDePersonalConBetterAuth, generadorDeContrasenas } from "./auth/cuentas-de-personal";

export interface Contenedor {
  // Sala (mesa)
  crearSesion: CrearSesion;
  iniciarSesion: IniciarSesion;
  terminarSesion: TerminarSesion;
  generarCodigosDeAcceso: GenerarCodigosDeAcceso;
  listarSesionesDeLaMesa: ListarSesionesDeLaMesa;
  obtenerSesionDeLaMesa: ObtenerSesionDeLaMesa;
  reprogramarSesion: ReprogramarSesion;
  cancelarSesion: CancelarSesion;
  // Calendario
  buscarCruces: BuscarCruces;
  listarCalendario: ListarCalendario;
  // Administración
  configurarInstitucion: ConfigurarInstitucion;
  crearCuerpo: CrearCuerpo;
  renombrarCuerpo: RenombrarCuerpo;
  archivarCuerpo: ArchivarCuerpo;
  asignarMembresia: AsignarMembresia;
  quitarMembresia: QuitarMembresia;
  listarPersonal: ListarPersonal;
  crearCuentaDePersonal: CrearCuentaDePersonal;
  restablecerContrasena: RestablecerContrasena;
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
  // Mantenimiento
  limpiarSesionesDeDemo: LimpiarSesionesDeDemo;
  // Participante
  ingresarASala: IngresarASala;
  consultarEstadoDeSala: ConsultarEstadoDeSala;
  /** Solo lectura: resolución de código de sala a sesión para las rutas públicas. */
  sesiones: RepositorioDeSesiones;
  /** Solo lectura: nombres de cuerpos, zona horaria y membresías del actor. */
  cuerpos: RepositorioDeCuerpos;
  institucion: RepositorioDeInstitucion;
  membresias: RepositorioDeMembresias;
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
    const cuerpos = new PrismaRepositorioDeCuerpos(contexto);
    const institucion = new PrismaRepositorioDeInstitucion(contexto);
    const membresias = new PrismaRepositorioDeMembresias(contexto);
    const decisiones = new PrismaRepositorioDeDecisiones(contexto);
    const actas = new PrismaRepositorioDeActas(contexto);
    const directorio = new PrismaDirectorioDePersonal(contexto);
    const votos = new PrismaRegistroDeVotos(contexto);
    const ids = new GeneradorDeIdsUuid();
    const codigos = new GeneradorDeCodigosAleatorio();
    const hasheador = new HasheadorSha256();
    let auth: Autenticacion | undefined;
    const cuentas = new CuentasDePersonalConBetterAuth(() => {
      if (instancia === undefined) throw new Error("Contenedor sin construir");
      return instancia.autenticacion();
    });
    instancia = {
      crearSesion: new CrearSesion(sesiones, cuerpos, institucion, unidad, ids, reloj, codigos),
      reprogramarSesion: new ReprogramarSesion(sesiones, institucion, unidad),
      cancelarSesion: new CancelarSesion(sesiones, unidad),
      buscarCruces: new BuscarCruces(sesiones, cuerpos, institucion),
      listarCalendario: new ListarCalendario(sesiones, cuerpos, institucion),
      configurarInstitucion: new ConfigurarInstitucion(institucion),
      crearCuerpo: new CrearCuerpo(cuerpos, ids),
      renombrarCuerpo: new RenombrarCuerpo(cuerpos),
      archivarCuerpo: new ArchivarCuerpo(cuerpos),
      asignarMembresia: new AsignarMembresia(membresias, directorio, cuerpos),
      quitarMembresia: new QuitarMembresia(membresias),
      listarPersonal: new ListarPersonal(directorio),
      crearCuentaDePersonal: new CrearCuentaDePersonal(cuentas, generadorDeContrasenas),
      restablecerContrasena: new RestablecerContrasena(cuentas, directorio, generadorDeContrasenas),
      iniciarSesion: new IniciarSesion(sesiones, unidad),
      terminarSesion: new TerminarSesion(sesiones, preguntas, unidad, actas),
      generarCodigosDeAcceso: new GenerarCodigosDeAcceso(
        sesiones,
        participantes,
        unidad,
        codigos,
        hasheador,
      ),
      listarSesionesDeLaMesa: new ListarSesionesDeLaMesa(sesiones),
      obtenerSesionDeLaMesa: new ObtenerSesionDeLaMesa(sesiones),
      limpiarSesionesDeDemo: new LimpiarSesionesDeDemo(new PrismaLimpiezaDeDemo(contexto), unidad),
      crearPregunta: new CrearPregunta(sesiones, preguntas, ids, unidad),
      listarPreguntasDeSesion: new ListarPreguntasDeSesion(sesiones, preguntas, votos),
      abrirPregunta: new AbrirPregunta(sesiones, preguntas, reloj, unidad),
      cerrarPregunta: new CerrarPregunta(
        preguntas,
        sesiones,
        votos,
        reloj,
        unidad,
        decisiones,
        participantes,
        ids,
      ),
      anularPregunta: new AnularPregunta(preguntas, sesiones, unidad, decisiones),
      proyectarResultado: new ProyectarResultado(preguntas, sesiones, unidad),
      emitirVoto: new EmitirVoto(participantes, preguntas, sesiones, votos),
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
      cuerpos,
      institucion,
      membresias,
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
