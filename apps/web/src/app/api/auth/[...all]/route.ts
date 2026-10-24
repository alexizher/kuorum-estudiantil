import { contenedor } from "@/composicion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAuthPromise() {
  return contenedor().autenticacion();
}

export async function GET(solicitud: Request): Promise<Response> {
  return (await getAuthPromise()).handler(solicitud);
}

export async function POST(solicitud: Request): Promise<Response> {
  return (await getAuthPromise()).handler(solicitud);
}
