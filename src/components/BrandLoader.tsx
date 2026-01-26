"use client";

import Image from "next/image";

export default function BrandLoader({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="min-h-[60vh] grid place-items-center bg-conquer-pink/10">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-28 w-28">
          <Image
            src="/brands/isotipo.png"
            alt="Conquer"
            fill
            className="animate-bounce [animation-duration:1.2s] drop-shadow-sm"
            priority
          />
        </div>
        <div className="text-xl text-conquer-navy">{label}</div>
      </div>
    </div>
  );
}
