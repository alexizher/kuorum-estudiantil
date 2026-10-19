// Fixture: simula un archivo de packages/domain/src que rompe la regla de capas.
// El test lo copia a esa ruta en un directorio temporal; aquí no se compila.
import { PrismaClient } from "@prisma/client";

export const cliente = new PrismaClient();
