"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PagoProcesando() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    if (status === 'approved') {
      router.replace(`/pago-exitoso?external_reference=${externalReference || ''}`);
    } else if (status === 'failure') {
      router.replace('/pago-fallido');
    } else if (status === 'pending') {
      router.replace('/pago-pendiente');
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-conquer-orange mx-auto mb-4"></div>
        <p className="text-conquer-navy">Procesando tu pago...</p>
      </div>
    </div>
  );
}