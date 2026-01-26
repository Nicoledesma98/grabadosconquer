"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function MiCuentaPage() {
  const router = useRouter();
  const { data, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/mi-cuenta");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border bg-white p-6 text-neutral-600">Cargando...</div>
      </main>
    );
  }

  if (!data?.user) return null;

  const role = (data.user as any)?.role ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-conquer-navy">Mi cuenta</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5">
          <div className="text-sm text-neutral-600">Mis datos</div>

          <div className="mt-3 grid gap-2 text-sm">
            <div>
              <span className="text-neutral-600">Nombre: </span>
              <b className="text-conquer-navy">{data.user.name ?? "—"}</b>
            </div>
            <div>
              <span className="text-neutral-600">Email: </span>
              <b className="text-conquer-navy">{data.user.email ?? "—"}</b>
            </div>
            <div>
              <span className="text-neutral-600">Rol: </span>
              <b className="text-conquer-navy">{role ?? "USER"}</b>
            </div>
          </div>

          <div className="mt-5 text-xs text-neutral-500">
            Estos datos se usan para contacto/facturación si hiciera falta.
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5">
          <div className="text-sm text-neutral-600">Accesos rápidos</div>

          <div className="mt-4 grid gap-3">
            <Link
              href="/mi-cuenta/pedidos"
              className="h-11 rounded-2xl bg-conquer-orange text-white hover:opacity-90 flex items-center justify-center"
            >
              Ver mis pedidos
            </Link>

            <Link
              href="/productos"
              className="h-11 rounded-2xl border hover:bg-neutral-50 flex items-center justify-center"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
