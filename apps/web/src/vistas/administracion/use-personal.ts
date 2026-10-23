"use client";

import { useCallback, useEffect, useState } from "react";
import { comoErrorDeMesa, type CuerpoDeMesa } from "../mesa/cliente-de-mesa";
import type {
  ClienteDeAdministracion,
  PersonaDelPersonal,
  RolEnCuerpo,
} from "./cliente-de-administracion";

export interface ContrasenaPorEntregar {
  nombre: string;
  contrasena: string;
}

export interface PanelDePersonal {
  personal: PersonaDelPersonal[] | null;
  cuerpos: CuerpoDeMesa[];
  error: string | undefined;
  ocupado: boolean;
  /** Solo mientras el administrador no la cierra; nunca se guarda en otro lado. */
  porEntregar: ContrasenaPorEntregar | null;
  cerrarContrasena: () => void;
  agregar: (correo: string, nombre: string) => Promise<boolean>;
  asignar: (usuarioId: string, cuerpoId: string, rol: RolEnCuerpo) => Promise<void>;
  quitar: (usuarioId: string, cuerpoId: string) => Promise<void>;
  restablecer: (persona: PersonaDelPersonal) => Promise<void>;
}

export function usePersonal(cliente: ClienteDeAdministracion): PanelDePersonal {
  const [personal, setPersonal] = useState<PersonaDelPersonal[] | null>(null);
  const [cuerpos, setCuerpos] = useState<CuerpoDeMesa[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [ocupado, setOcupado] = useState(false);
  const [porEntregar, setPorEntregar] = useState<ContrasenaPorEntregar | null>(null);

  const recargar = useCallback(async () => {
    try {
      const [lista, institucion] = await Promise.all([
        cliente.listarPersonal(),
        cliente.leerInstitucion(),
      ]);
      setPersonal(lista);
      setCuerpos(institucion.cuerpos);
    } catch (causa) {
      setError(comoErrorDeMesa(causa).message);
    }
  }, [cliente]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function ejecutar(accion: () => Promise<void>): Promise<boolean> {
    setOcupado(true);
    setError(undefined);
    try {
      await accion();
      await recargar();
      return true;
    } catch (causa) {
      setError(comoErrorDeMesa(causa).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  return {
    personal,
    cuerpos,
    error,
    ocupado,
    porEntregar,
    cerrarContrasena: () => setPorEntregar(null),
    agregar: (correo, nombre) =>
      ejecutar(async () => {
        const { contrasena } = await cliente.crearPersona(correo.trim(), nombre.trim());
        setPorEntregar({ nombre: nombre.trim(), contrasena });
      }),
    asignar: async (usuarioId, cuerpoId, rol) => {
      await ejecutar(() => cliente.asignar(usuarioId, cuerpoId, rol));
    },
    quitar: async (usuarioId, cuerpoId) => {
      await ejecutar(() => cliente.quitar(usuarioId, cuerpoId));
    },
    restablecer: async (persona) => {
      await ejecutar(async () => {
        const { contrasena } = await cliente.restablecerContrasena(persona.id);
        setPorEntregar({ nombre: persona.nombre, contrasena });
      });
    },
  };
}
