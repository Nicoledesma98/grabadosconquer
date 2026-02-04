import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import NFSyncButton from "@/components/admin/NFSyncButton";

export const runtime = "nodejs";

export default async function AdminProveedoresPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600 bg-white">
          No autorizado.
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <Link href="/admin/productos" className="text-sm underline">
          Ir a productos
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-conquer-pink bg-white p-5">
        <div className="font-semibold text-conquer-navy">Nuevas Formas</div>
        <div className="text-sm text-neutral-600 mt-1">
          Sync (mock desde local)
        </div>

        <div className="mt-4">
          <NFSyncButton/>
        </div>
      </div>
    </main>
  );
}
