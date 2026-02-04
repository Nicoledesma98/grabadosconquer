"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import NFSyncButton from "./admin/NFSyncButton";

export default function AuthButton() {
  const { data, status } = useSession();
  const user = data?.user as any;
  const role = user?.role as string | undefined;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (status === "loading") return null;

  if (!user) {
    return (
      <button
        onClick={() => signIn()}
        className="rounded-2xl border px-4 py-2 text-sm hover:bg-neutral-50 whitespace-nowrap"
      >
        Ingresar
      </button>
    );
  }

  const displayName =
    (user?.name && String(user.name).trim()) ||
    (user?.email ? String(user.email).split("@")[0] : "Mi cuenta");

  const label = displayName;


  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-2xl border px-4 py-2 text-sm hover:bg-neutral-50 whitespace-nowrap"
      >
        {label} <span className="ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white p-2 shadow-sm">
          {role === "ADMIN" ? (
            <>
              <Link
                href="/admin/productos"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Productos
              </Link>
              <Link
                href="/admin/categorias"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Categorías
              </Link>
              <Link href="/admin/usuarios"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Usuarios
              </Link>
              <Link
                href="/admin/pedidos"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Pedidos
              </Link>
              <Link
                href="/admin/proveedores"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Proveedores
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/mi-cuenta"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Mis datos
              </Link>
              <Link
                href="/mi-cuenta/pedidos"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                Mis pedidos
              </Link>
            </>
          )}

          <div className="my-2 h-px bg-neutral-200" />

          <button
            onClick={() => signOut({ callbackUrl: "/productos" })}
            className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-neutral-50"
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
