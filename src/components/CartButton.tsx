"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useCart } from "@/store/cart";

export default function CartButton() {
  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cartCount = useMemo(
    () => (mounted ? items.reduce((acc, i) => acc + i.qty, 0) : 0),
    [mounted, items]
  );

  return (
    <Link
      href="/carrito"
      className="relative rounded-xl border px-3 py-2 hover:bg-neutral-50 whitespace-nowrap"
    >
      Carrito
      {cartCount > 0 && (
        <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-black px-2 py-0.5 text-xs text-white">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
