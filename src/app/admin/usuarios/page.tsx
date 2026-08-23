import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import UserRoleToggle from "@/components/admin/UserRoleToggle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 20;

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

function buildUrl(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  // --- Guard: solo admin ---
  const session = await getServerSession(authOptions);
  const myRole = (session?.user as any)?.role;
  const myId = String((session?.user as any)?.id ?? "");

  if (!session || myRole !== "ADMIN") {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600 bg-white">
          No autorizado.
        </div>
      </main>
    );
  }

  const sp: { q?: string; page?: string } = searchParams ? await searchParams : {};
  const q = String(sp?.q ?? "").trim();
  const pageRaw = Number(sp?.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where =
    q.length > 0
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { id: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

  const skip = (page - 1) * PAGE_SIZE;

  const [totalCount, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: { accounts: { select: { provider: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <div className="text-sm text-neutral-600 mt-1">
            Total: <b>{totalCount}</b>
          </div>
        </div>

        <Link href="/admin/pedidos" className="text-sm underline">
          Ir a pedidos
        </Link>
      </div>

      {/* 🔎 Buscador (GET, sin handlers) */}
      <form
        method="GET"
        action="/admin/usuarios"
        className="mt-5 flex flex-wrap items-center gap-3"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por email, nombre o ID..."
          className="h-11 w-full sm:w-96 rounded-2xl border border-conquer-pink px-4 bg-white"
        />
        <button
          type="submit"
          className="h-11 rounded-2xl bg-conquer-orange text-white font-semibold px-5 hover:opacity-90"
        >
          Buscar
        </button>

        {q && (
          <Link
            href="/admin/usuarios"
            className="h-11 inline-flex items-center rounded-2xl border border-conquer-pink px-5 hover:bg-conquer-pink/10"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="mt-6 rounded-3xl border border-conquer-pink bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-neutral-600 border-b border-conquer-pink/60">
          <div className="col-span-3">Email</div>
          <div className="col-span-3">Nombre</div>
          <div className="col-span-2">Provider</div>
          <div className="col-span-1">Rol</div>
          <div className="col-span-1">Alta</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {users.length === 0 ? (
          <div className="p-6 text-sm text-neutral-600">No hay usuarios para mostrar.</div>
        ) : (
          users.map((u) => {
            const providers = u.accounts?.map((a) => a.provider) ?? [];
            const providerLabel =
              providers.length === 0 ? "-" : providers.map(prettyProvider).join(" + ");

            const isMe = !!myId && u.id === myId;

            return (
              <div
                key={u.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-conquer-pink/30"
              >
                <div className="col-span-3 truncate">{u.email ?? "-"}</div>
                <div className="col-span-3 truncate">{u.name ?? "-"}</div>
                <div className="col-span-2">{providerLabel}</div>

                <div className="col-span-1">
                  <span className="inline-flex rounded-full border border-conquer-pink px-2 py-0.5 text-xs">
                    {u.role}
                  </span>
                </div>

                <div className="col-span-1 text-xs text-neutral-600">
                  {u.createdAt ? formatDate(u.createdAt as any) : "-"}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/pedidos${buildUrl({ q: u.email })}`}
                    className="rounded-xl border px-3 py-1 text-xs hover:bg-neutral-50"
                    title="Ver pedidos por email"
                  >
                    Ver pedidos
                  </Link>

                  <UserRoleToggle
                    userId={u.id}
                    currentRole={u.role}
                    disabled={isMe}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-neutral-600">
          Página <b>{page}</b> de <b>{totalPages}</b>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/usuarios${buildUrl({ q, page: prevPage ?? 1 })}`}
            className={`rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 ${
              !prevPage ? "pointer-events-none opacity-40" : ""
            }`}
          >
            ← Anterior
          </Link>

          <Link
            href={`/admin/usuarios${buildUrl({ q, page: nextPage ?? totalPages })}`}
            className={`rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 ${
              !nextPage ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Siguiente →
          </Link>
        </div>
      </div>
    </main>
  );
}
