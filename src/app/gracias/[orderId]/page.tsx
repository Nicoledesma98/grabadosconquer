import Link from "next/link";

export default async function GraciasPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">¡Pedido creado! ✅</h1>
      <p className="mt-3 text-neutral-700">
        Tu número de pedido es: <b>{orderId}</b>
      </p>

      <div className="mt-6 flex gap-3">
        <Link href="/productos" className="rounded-2xl border px-4 py-2 hover:bg-neutral-50">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
