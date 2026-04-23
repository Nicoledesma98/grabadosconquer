"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  User,
  LogIn,
  LogOut,
  Package,
  Users,
  ShoppingCart,
  Building,
  Settings,
  ChevronDown,
  UserCircle,
  Truck,
  FolderTree,
  Store,
  BarChart,
  ClipboardList,
  Link2,
  Boxes,
  PackagePlus,
  PackageMinus,
} from "lucide-react";

// Función auxiliar para mostrar el nombre legible del rol
const getRoleDisplayName = (role: string | undefined): string => {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "VENTAS":
      return "Ventas";
    case "STOCK":
      return "Stock";
    case "REVENDEDOR":
      return "Revendedor";
    default:
      return "Mi cuenta";
  }
};

export default function AuthButton() {
  const { data, status } = useSession();
  const user = data?.user as any;
  const role = user?.role as string | undefined;

  const [open, setOpen] = useState(false);
  const [stockMenuOpen, setStockMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
  setOpen(false);
  setStockMenuOpen(false);
}
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (status === "loading") return null;

  // Usuario no autenticado: botón "Ingresar" con icono
  if (!user) {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-2 rounded-full border border-conquer-pink/30 bg-white px-4 py-2.5 text-sm font-medium text-conquer-navy hover:border-conquer-orange hover:bg-conquer-pink/5 hover:text-conquer-orange transition-all"
      >
        <LogIn className="h-5 w-5" />
        <span className="hidden sm:inline">Ingresar</span>
      </button>
    );
  }

  const displayName =
    (user?.name && String(user.name).trim()) ||
    (user?.email ? String(user.email).split("@")[0] : "Mi cuenta");

  const label = displayName;
  const roleDisplay = getRoleDisplayName(role);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-conquer-pink/30 bg-white px-4 py-2.5 text-sm font-medium text-conquer-navy hover:border-conquer-orange hover:bg-conquer-pink/5 hover:text-conquer-orange transition-all"
      >
        <UserCircle className="h-5 w-5" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-conquer-pink/30 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
          {/* Cabecera con el rol */}
          <div className="px-3 py-2 text-xs font-medium text-conquer-navy/70 border-b border-conquer-pink/20 flex items-center gap-2">
            <User className="h-4 w-4" />
            {roleDisplay}
          </div>

          {/* Menú según el rol */}
          {role === "ADMIN" && (
  <>
    <Link
      href="/admin/productos"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      onClick={() => setOpen(false)}
    >
      <Package className="h-4 w-4" />
      Productos
    </Link>

    <Link
      href="/admin/categorias"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      onClick={() => setOpen(false)}
    >
      <FolderTree className="h-4 w-4" />
      Categorías
    </Link>

    <Link
      href="/admin/usuarios"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      onClick={() => setOpen(false)}
    >
      <Users className="h-4 w-4" />
      Usuarios
    </Link>

    <Link
      href="/admin/pedidos"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      onClick={() => setOpen(false)}
    >
      <ShoppingCart className="h-4 w-4" />
      Pedidos
    </Link>

    {/* Submenu Stock */}
    <div className="rounded-xl border border-conquer-pink/20">
      <button
        type="button"
        onClick={() => setStockMenuOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      >
        <span className="flex items-center gap-3">
          <Boxes className="h-4 w-4" />
          Stock
        </span>

        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            stockMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {stockMenuOpen && (
        <div className="mt-1 flex flex-col gap-1 px-2 pb-2">
          <Link
            href="/admin/stock"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
            onClick={() => {
              setOpen(false);
              setStockMenuOpen(false);
            }}
          >
            <Boxes className="h-4 w-4" />
            Ver stock
          </Link>

          <Link
            href="/admin/stock/movimientos"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
            onClick={() => {
              setOpen(false);
              setStockMenuOpen(false);
            }}
          >
            <ClipboardList className="h-4 w-4" />
            Movimientos
          </Link>

          <Link
            href="/admin/stock/vincular"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
            onClick={() => {
              setOpen(false);
              setStockMenuOpen(false);
            }}
          >
            <Link2 className="h-4 w-4" />
            Vincular proveedor
          </Link>

          <Link
            href="/admin/stock/ingresar"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
            onClick={() => {
              setOpen(false);
              setStockMenuOpen(false);
            }}
          >
            <PackagePlus className="h-4 w-4" />
            Ingresar mercadería
          </Link>

          <Link
            href="/admin/stock/sacar"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
            onClick={() => {
              setOpen(false);
              setStockMenuOpen(false);
            }}
          >
            <PackageMinus className="h-4 w-4" />
            Sacar mercadería
          </Link>
        </div>
      )}
    </div>

    <Link
      href="/admin/proveedores"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      onClick={() => setOpen(false)}
    >
      <Building className="h-4 w-4" />
      Proveedores
    </Link>

    <Link
      href="/admin/configuracion"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
      onClick={() => setOpen(false)}
    >
      <Settings className="h-4 w-4" />
      Configuración
    </Link>
  </>
)}

          {role === "VENTAS" && (
            <>
              <Link
                href="/admin/productos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Package className="h-4 w-4" />
                Productos
              </Link>
              <Link
                href="/admin/pedidos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <ShoppingCart className="h-4 w-4" />
                Pedidos
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <BarChart className="h-4 w-4" />
                Dashboard de ventas
              </Link>
            </>
          )}

          {role === "STOCK" && (
            <>
              <Link
                href="/admin/stock"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Boxes className="h-4 w-4" />
                Stock
              </Link>

              <Link
                href="/admin/stock/movimientos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <ClipboardList className="h-4 w-4" />
                Movimientos
              </Link>

              <Link
                href="/admin/stock/vincular"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Link2 className="h-4 w-4" />
                Vincular proveedor
              </Link>
              <Link
                href="/admin/stock/ingresar"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <PackagePlus className="h-4 w-4" />
                Ingresar mercadería
              </Link>
              <Link
                href="/admin/stock/sacar"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <PackageMinus className="h-4 w-4" />
                Sacar mercadería
              </Link>
              <Link
                href="/admin/productos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Package className="h-4 w-4" />
                Productos
              </Link>
            </>
          )}

          {role === "REVENDEDOR" && (
            <>
              <Link
                href="/revendedor"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Store className="h-4 w-4" />
                Mi panel revendedor
              </Link>
              <Link
                href="/revendedor/precios"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Truck className="h-4 w-4" />
                Precios especiales
              </Link>
            </>
          )}

          {/* Para clientes normales (CUSTOMER) y cualquier otro rol no contemplado */}
          {(role === "CUSTOMER" ||
            (role !== "ADMIN" &&
              role !== "VENTAS" &&
              role !== "STOCK" &&
              role !== "REVENDEDOR")) && (
            <>
              <Link
                href="/mi-cuenta"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <User className="h-4 w-4" />
                Mis datos
              </Link>
              <Link
                href="/mi-cuenta/pedidos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-conquer-navy hover:bg-conquer-pink/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Package className="h-4 w-4" />
                Mis pedidos
              </Link>
            </>
          )}

          <div className="my-2 h-px bg-conquer-pink/20" />

          <button
            onClick={() => signOut({ callbackUrl: "/productos" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
