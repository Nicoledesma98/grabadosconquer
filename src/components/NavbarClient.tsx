"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthButton from "@/components/AuthMenu";

type Props = { role: string | null };

export default function NavbarClient({ role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");

  // dropdowns
  const [adminOpen, setAdminOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // precarga buscador si estás en /productos
  useEffect(() => {
    if (pathname === "/productos") setQ(sp.get("q") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const cartCount = useMemo(
    () => (mounted ? items.reduce((acc, i) => acc + i.qty, 0) : 0),
    [mounted, items]
  );

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    const url = query ? `/productos?q=${encodeURIComponent(query)}` : "/productos";
    router.push(url);
  }

  const isAdmin = role === "ADMIN";
  const isLogged = !!role;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur">
      {/* TOP STRIP */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs text-neutral-700">
          <span>Envío gratuito para pedidos mayores a $90.000</span>
          <span>WhatsApp: 11 3100 2011</span>
        </div>
      </div>

      {/* ROW 1: logo + search + carrito + auth + menu rol */}
      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl h-16 items-center gap-4 px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative h-50 w-50">
              <Image
                src="/brands/logo.png"
                alt="Grabados Conquer"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Buscador */}
          <form onSubmit={submitSearch} className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar productos..."
              className="h-11 w-full rounded-2xl border px-4 text-sm outline-none focus:ring-2 focus:ring-conquer-turq/30"
            />
          </form>

          {/* Carrito */}
          <Link
            href="/carrito"
            className="relative rounded-2xl border px-4 py-2 text-sm hover:bg-neutral-50 whitespace-nowrap"
          >
            Carrito
            {cartCount > 0 && (
              <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-black px-2 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          <AuthButton />
          
        </div>
        </div>

      {/* ROW 2: navegación principal */}
      <div className="bg-white">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-center gap-8 px-4 text-sm text-conquer-navy">
          
          <Link href="/" className="hover:text-conquer-orange">
            Inicio
          </Link><Link href="/productos" className="hover:text-conquer-orange">
            Productos
          </Link>
          <Link href="/como-comprar" className="hover:text-conquer-orange">
            Cómo comprar
          </Link>
          <Link href="/contacto" className="hover:text-conquer-orange">
            Contacto
          </Link>
          
        </div>
      </div>
    </header>
  );
}
