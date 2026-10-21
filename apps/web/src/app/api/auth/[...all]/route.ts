import { toNextJsHandler } from "better-auth/next-js";
import { contenedor } from "../../../../composicion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(solicitud: Request): Promise<Response> {
  return toNextJsHandler(contenedor().autenticacion()).GET(solicitud);
}

export function POST(solicitud: Request): Promise<Response> {
  return toNextJsHandler(contenedor().autenticacion()).POST(solicitud);
}
