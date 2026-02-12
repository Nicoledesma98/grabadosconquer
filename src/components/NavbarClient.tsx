"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthButton from "@/components/AuthMenu";
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  Truck,
  Phone,
  Home,
  Package,
  Info,
  Mail,
} from "lucide-react";
import CategoriesDropdown from "./CategoriesDropdown";  //preguntarle a cami si lo agrego al navbar o dejo la del inicio y el filtro cuando entrar a productos


type Props = { role: string | null };

export default function NavbarClient({ role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setMounted(true), []);

  // Precargar búsqueda
  useEffect(() => {
    if (pathname === "/productos") setQ(sp.get("q") ?? "");
  }, [pathname, sp]);

  const cartCount = useMemo(
    () => (mounted ? items.reduce((acc, i) => acc + i.qty, 0) : 0),
    [mounted, items]
  );

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    const url = query ? `/productos?q=${encodeURIComponent(query)}` : "/productos";
    router.push(url);
    setMobileMenuOpen(false);
  }

  // Cerrar menú al cambiar ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Bloquear scroll cuando el menú mobile está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isAdmin = role === "ADMIN";
  const isLogged = !!role;

  const navLinks = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/productos", label: "Productos", icon: Package },
    { href: "/como-comprar", label: "Cómo comprar", icon: Info },
    { href: "/contacto", label: "Contacto", icon: Mail },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 shadow-lg backdrop-blur-md"
          : "bg-white/80 backdrop-blur-sm"
      }`}
    >
      {/* TOP STRIP - con iconos */}
      <div className="border-b border-conquer-pink/20 bg-gradient-to-r from-conquer-navy/5 to-conquer-pink/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-conquer-navy/80">
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-conquer-orange" />
            Mínimo de compra de $100.000
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-conquer-turq" />
            <a
              href="https://wa.me/541131002011"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-conquer-orange transition-colors"
            >
              WhatsApp: 11 3100 2011
            </a>
          </span>
        </div>
      </div>

      {/* ROW PRINCIPAL */}
      <div className="border-b border-conquer-pink/20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          {/* Logo + botón menú mobile */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 hover:bg-conquer-pink/20 transition-colors"
              aria-label="Menú"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-conquer-navy" />
              ) : (
                <Menu className="h-6 w-6 text-conquer-navy" />
              )}
            </button>
            <Link href="/" className="flex items-center">
              <div className="relative h-12 w-40 md:h-14 md:w-48">
                <Image
                  src="/brands/logo.png"
                  alt="Grabados Conquer"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Buscador - solo desktop */}
          <form
            onSubmit={submitSearch}
            className="hidden lg:flex flex-1 max-w-md items-center relative"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar productos..."
              className="h-11 w-full rounded-full border border-conquer-pink/30 bg-white pl-5 pr-12 text-sm outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-conquer-orange p-2.5 text-white hover:bg-conquer-orange/90 transition-colors"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Acciones derecha */}
          <div className="flex items-center gap-3">
            {/* Carrito mejorado */}
            <Link
              href="/carrito"
              className="group relative flex items-center gap-2 rounded-full border border-conquer-pink/30 bg-white px-4 py-2.5 hover:border-conquer-orange hover:bg-conquer-pink/5 transition-all"
            >
              <ShoppingCart className="h-5 w-5 text-conquer-navy group-hover:text-conquer-orange transition-colors" />
              <span className="hidden sm:inline text-sm font-medium text-conquer-navy group-hover:text-conquer-orange">
                Carrito
              </span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 flex min-w-[22px] h-[22px] items-center justify-center rounded-full bg-conquer-orange text-xs font-bold text-white shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>
             
            {/* AuthButton - exactamente como estaba, sin modificaciones */}
            <AuthButton />
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN PRINCIPAL - Desktop con iconos */}
      <nav className="hidden lg:block border-b border-conquer-pink/20 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-8 px-4 py-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-conquer-orange ${
                  isActive
                    ? "text-conquer-orange border-b-2 border-conquer-orange -mb-3 pb-2"
                    : "text-conquer-navy"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* MENÚ MOBILE - fullscreen */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[113px] z-40 bg-white/95 backdrop-blur-md animate-in slide-in-from-top">
          <div className="flex flex-col p-6 gap-6">
            {/* Buscador móvil */}
            <form onSubmit={submitSearch} className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar productos..."
                className="h-12 w-full rounded-full border border-conquer-pink/30 pl-5 pr-12 text-sm outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-conquer-orange p-3 text-white"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Links de navegación */}
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-conquer-orange/10 text-conquer-orange border border-conquer-orange/30"
                        : "text-conquer-navy hover:bg-conquer-pink/10"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Contacto rápido */}
            <div className="pt-4 border-t border-conquer-pink/30">
              <p className="text-xs text-conquer-navy/70 px-2 pb-2">
                ¿Necesitas ayuda? Contactanos
              </p>
              <a
                href="https://wa.me/541131002011"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-conquer-navy hover:bg-conquer-pink/10"
              >
                <Phone className="h-5 w-5" />
                WhatsApp: 11 3100 2011
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}