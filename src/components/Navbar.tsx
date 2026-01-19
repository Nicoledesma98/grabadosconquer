"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthButton from "@/components/AuthButton";

type CategoryDTO = { id: string; slug: string; name: string };


export default function Navbar() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const items = useCart((s) => s.items);

  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoadingCats(true);
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = (await res.json()) as CategoryDTO[];
        if (alive) setCategories(data);
      } catch (e) {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // Si estás en /productos, precarga el query en el input
  useEffect(() => {
    if (pathname === "/productos") {
      setQ(sp.get("q") ?? "");
    }
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

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      {/* Top bar (como el sitio actual) */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs text-neutral-700">
          <span>Envío gratuito para pedidos mayores a $90.000</span>
          <span>WhatsApp: 11 3100 2011</span>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
          Grabados Conquer
        </Link>

        {/* Categorías dropdown */}
        <div className="relative">
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
            onClick={() => setCatOpen((v) => !v)}
          >
            Categorías
          </button>

          {catOpen && (
            <div
              className="absolute left-0 mt-2 w-64 rounded-2xl border bg-white p-2 shadow-sm"
              onMouseLeave={() => setCatOpen(false)}
            >
              <div
                className="absolute left-0 mt-2 w-64 rounded-2xl border bg-white p-2 shadow-sm"
                onMouseLeave={() => setCatOpen(false)}
              >
                {loadingCats ? (
                  <div className="px-3 py-2 text-sm text-neutral-600">Cargando...</div>
                ) : categories.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-neutral-600">
                    No hay categorías
                  </div>
                ) : (
                  categories.map((c) => (
                    <button
                      key={c.id}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      onClick={() => {
                        setCatOpen(false);
                        router.push(`/productos?cat=${encodeURIComponent(c.slug)}`);
                      }}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

        {/* Buscador */}
        <form onSubmit={submitSearch} className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="h-10 w-full rounded-2xl border px-4 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </form>

        <nav className="flex items-center gap-3 text-sm">
          <Link href="/productos" className="text-neutral-700 hover:text-black">
            Productos
          </Link>
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
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
