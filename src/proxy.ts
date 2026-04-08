import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mapa de permisos: cada ruta (o prefijo) puede tener múltiples roles permitidos
const routePermissions: Record<string, string[]> = {
  // Ruta base de admin (solo para ADMIN)
  "/admin": ["ADMIN"],

  // Subrutas específicas
  "/admin/productos": ["ADMIN", "STOCK","VENTAS"],        // Stock puede gestionar productos
  "/admin/pedidos": ["ADMIN", "VENTAS"],         // Ventas puede ver pedidos
  "/admin/usuarios": ["ADMIN"],                  // Solo ADMIN
  "/admin/proveedores": ["ADMIN"],               // Solo ADMIN
  "/admin/configuracion": ["ADMIN"],             // Solo ADMIN
  "/admin/dashboard": ["ADMIN", "VENTAS"],       // Dashboard (si lo creas)
  // Agregá más rutas según necesites
};

// Función para obtener los roles permitidos para una ruta
function getAllowedRoles(pathname: string): string[] {
  // Primero coincidencia exacta
  if (routePermissions[pathname]) return routePermissions[pathname];
  // Si no, buscar por prefijo (ej: /admin/pedidos/123 → coincide con /admin/pedidos)
  const prefix = Object.keys(routePermissions).find(key =>
    pathname.startsWith(key + "/") || pathname === key
  );
  return prefix ? routePermissions[prefix] : [];
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;

  // Solo protege rutas que empiecen con /admin
  if (!url.pathname.startsWith("/admin")) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    // No autenticado → redirigir a login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (token as any).role;
  const allowedRoles = getAllowedRoles(url.pathname);

  // Si el rol no está permitido para esta ruta, redirigir a productos (o a una página de acceso denegado)
  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/productos", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};