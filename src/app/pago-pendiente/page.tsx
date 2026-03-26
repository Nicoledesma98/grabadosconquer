import Link from 'next/link';
import { Clock } from 'lucide-react';

export default function PagoPendientePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-conquer-pink/30 p-8 text-center shadow-xl">
        <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-conquer-navy mb-2">Pago pendiente</h1>
        <p className="text-neutral-600 mb-4">
          Tu pago está siendo procesado. Te avisaremos por email cuando se confirme.
        </p>
        <Link
          href="/"
          className="inline-block bg-conquer-orange text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}