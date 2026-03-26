import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function PagoFallidoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-conquer-pink/30 p-8 text-center shadow-xl">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-conquer-navy mb-2">Pago no completado</h1>
        <p className="text-neutral-600 mb-4">
          El pago no pudo ser procesado. Podés intentar nuevamente.
        </p>
        <Link
          href="/carrito"
          className="inline-block bg-conquer-orange text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
        >
          Volver al carrito
        </Link>
      </div>
    </main>
  );
}