import { NextResponse } from "next/server";

// El token lo defines en las variables de entorno (Hostinger)
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  // Verificar que el token enviado sea correcto
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Importar dinámicamente la lógica de sincronización para no cargarla siempre
  const { POST: syncHandler } = await import("@/app/api/suppliers/stocksur/sync/route");
  return syncHandler(req);
}