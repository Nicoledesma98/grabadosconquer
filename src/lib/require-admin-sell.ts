import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type GuardOk = { ok: true };
type GuardFail = { ok: false; status: number; error: string };

export async function requireProductsAccess(
  req: NextRequest
): Promise<GuardOk | GuardFail> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const role = (token as any)?.role;

  if (!["ADMIN", "VENTAS"].includes(role)) {
    return { ok: false, status: 403, error: "Sin permisos" };
  }

  return { ok: true };
}