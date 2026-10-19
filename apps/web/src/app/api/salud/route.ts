import { contenedor } from "../../../composicion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const TIEMPO_MAXIMO_SALUD_MS = 8_000;

async function baseDeDatosResponde(): Promise<boolean> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const agotado = new Promise<boolean>((resolver) => {
    temporizador = setTimeout(() => resolver(false), TIEMPO_MAXIMO_SALUD_MS);
  });
  try {
    return await Promise.race([contenedor().verificarBaseDeDatos(), agotado]);
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function GET(): Promise<Response> {
  const ok = await baseDeDatosResponde();
  return Response.json(
    ok ? { estado: "ok", baseDeDatos: "ok" } : { estado: "degradado", baseDeDatos: "error" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
