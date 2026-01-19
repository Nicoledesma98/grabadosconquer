import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Solo /admin
  if (!url.pathname.startsWith("/admin")) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // No logueado -> login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // No admin -> productos
  if ((token as any).role !== "ADMIN") {
    return NextResponse.redirect(new URL("/productos", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
