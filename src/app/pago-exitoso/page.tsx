import Link from 'next/link';

export default async function PagoExitosoPage({
  searchParams,
}: {
  searchParams: Promise<{ external_reference?: string }>;
}) {
  const sp = await searchParams;
  const orderId = sp.external_reference;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold text-green-600 mb-4">¡Pago exitoso!</h1>
      {orderId && <p className="mb-2">Pedido: #{orderId}</p>}
      <p className="mb-4">Gracias por tu compra. Recibirás un email con los detalles.</p>
      <Link href="/" className="bg-conquer-orange text-white px-6 py-3 rounded-full">
        Volver al inicio
      </Link>
    </div>
  );
}