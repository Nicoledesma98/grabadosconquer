import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const runtime = "nodejs";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function prettyProvider(p?: string | null) {
  const x = (p || "").toLowerCase();
  if (x === "google") return "Google";
  if (x === "credentials") return "Usuario/Contraseña";
  if (!x) return "-";
  return x;
}

export default async function AdminUsuariosPage() {
  // --- Guard: solo admin ---
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600 bg-white">
          No autorizado.
        </div>
      </main>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      accounts: { select: { provider: true } }, // para saber si es google/credentials
    },
  });

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <div className="text-sm text-neutral-600 mt-1">
            Total: <b>{users.length}</b>
          </div>
        </div>

        <Link href="/admin/pedidos" className="text-sm underline">
          Ir a pedidos
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-conquer-pink bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-neutral-600 border-b border-conquer-pink/60">
          <div className="col-span-3">Email</div>
          <div className="col-span-3">Nombre</div>
          <div className="col-span-2">Provider</div>
          <div className="col-span-2">Rol</div>
          <div className="col-span-2">Alta</div>
        </div>

        {users.map((u) => {
          const providers = u.accounts?.map((a) => a.provider) ?? [];
          // si tiene google y credentials, lo mostramos combinado
          const providerLabel =
            providers.length === 0
              ? "-"
              : providers.map(prettyProvider).join(" + ");

          return (
            <div
              key={u.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-conquer-pink/30"
            >
              <div className="col-span-3 truncate">{u.email ?? "-"}</div>
              <div className="col-span-3 truncate">{u.name ?? "-"}</div>
              <div className="col-span-2">{providerLabel}</div>
              <div className="col-span-2">
                <span className="inline-flex rounded-full border border-conquer-pink px-2 py-0.5 text-xs">
                  {(u as any).role ?? "USER"}
                </span>
              </div>
              <div className="col-span-2 text-xs text-neutral-600">
                {u.createdAt ? formatDate(u.createdAt as any) : "-"}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );

}