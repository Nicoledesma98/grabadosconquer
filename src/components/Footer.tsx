"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Instagram,
  Facebook,
  Twitter,
  Mail,
  Phone,
  MapPin,
  Heart,
  ArrowUpRight,
  Send,
} from "lucide-react";

function yearNow() {
  return new Date().getFullYear();
}

type Props = {
  developerName?: string;
  developerUrl?: string;
};

export default function Footer({
  developerName = "Nicolás Ledesma",
  developerUrl = "https://www.linkedin.com/in/tu-perfil/",
}: Props) {
  return (
    <footer className="border-t border-conquer-pink/30 bg-gradient-to-b from-white to-conquer-pink/5">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Grid principal */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Columna 1: Marca + Redes + WhatsApp */}
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative h-12 w-12 md:h-14 md:w-14 transition-transform group-hover:scale-105">
                <Image
                  src="/brands/isotipo.png"
                  alt="Grabados Conquer"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-bold text-conquer-navy">Grabados Conquer</div>
                <div className="text-xs text-conquer-navy/60">Personalizados · Grabados</div>
              </div>
            </Link>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Productos personalizados, regalos empresariales y grabados de alta calidad.
              Transformamos tus ideas en realidad.
            </p>

            {/* Botón WhatsApp destacado */}
            <a
              href="https://wa.me/541170660569"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-conquer-orange px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-xl"
            >
              <Phone className="h-4 w-4" />
              WhatsApp
              <ArrowUpRight className="h-4 w-4" />
            </a>

            {/* Redes sociales con iconos lucide */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com/tu-cuenta"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-conquer-pink/30 bg-white text-conquer-navy transition-all hover:border-conquer-orange hover:bg-conquer-orange/10 hover:text-conquer-orange"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/tu-cuenta"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-conquer-pink/30 bg-white text-conquer-navy transition-all hover:border-conquer-orange hover:bg-conquer-orange/10 hover:text-conquer-orange"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://tiktok.com/@tu-cuenta"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-conquer-pink/30 bg-white text-conquer-navy transition-all hover:border-conquer-orange hover:bg-conquer-orange/10 hover:text-conquer-orange"
              >
                {/* TikTok no está en lucide, podemos usar un SVG inline o un icono alternativo */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7V7.2a7 7 0 1 0 7 7V9.5c1.2.8 2.6 1.2 4 1.2V7.2c-2.2 0-4-1.8-4-4.2H14Z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/tu-cuenta"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-conquer-pink/30 bg-white text-conquer-navy transition-all hover:border-conquer-orange hover:bg-conquer-orange/10 hover:text-conquer-orange"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Columna 2: Navegación */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-conquer-navy">Navegación</h3>
            <ul className="space-y-3">
              {[
                { href: "/", label: "Inicio" },
                { href: "/productos", label: "Productos" },
                { href: "/como-comprar", label: "Cómo comprar" },
                { href: "/contacto", label: "Contacto" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-conquer-orange"
                  >
                    <span className="h-1 w-1 rounded-full bg-conquer-pink/60 transition-all group-hover:w-2 group-hover:bg-conquer-orange" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-conquer-navy">Contacto</h3>
            <div className="space-y-3 text-sm">
              <a
                href="https://wa.me/541170660569"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-neutral-600 transition-colors hover:text-conquer-orange"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-conquer-pink/20">
                  <Phone className="h-4 w-4" />
                </span>
                <span>+54 11 7066-0569</span>
              </a>
              <a
                href="mailto:ventas@grabadosconquer.com"
                className="flex items-center gap-3 text-neutral-600 transition-colors hover:text-conquer-orange"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-conquer-pink/20">
                  <Mail className="h-4 w-4" />
                </span>
                <span>ventas@grabadosconquer.com</span>
              </a>
              <div className="flex items-center gap-3 text-neutral-600">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-conquer-pink/20">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>CABA · GBA · Envíos a todo el país</span>
              </div>
            </div>
          </div>

          {/* Columna 4: Newsletter / Horarios */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-conquer-navy">Newsletter</h3>
            <p className="text-sm text-neutral-600">
              Suscribite para recibir novedades y ofertas exclusivas.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Aquí iría la lógica de suscripción
                alert("Funcionalidad próximamente");
              }}
              className="relative"
            >
              <input
                type="email"
                placeholder="Tu email"
                className="h-11 w-full rounded-full border border-conquer-pink/30 bg-white px-5 pr-12 text-sm outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                required
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-conquer-orange p-2.5 text-white transition-all hover:bg-conquer-orange/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs text-conquer-navy/70">
                <Heart className="h-3.5 w-3.5 text-conquer-pink" />
                Atención: Lun a Vie 9–18hs
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior con copyright y desarrollador */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-conquer-pink/20 pt-8 text-xs text-neutral-500 md:flex-row">
          <div className="flex items-center gap-2">
            <span>© {yearNow()} Grabados Conquer. Todos los derechos reservados.</span>
            <span className="hidden md:inline">•</span>
            <span>Made with</span>
            <Heart className="h-3.5 w-3.5 fill-conquer-pink text-conquer-pink" />
            <span>in Argentina</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Desarrollado por</span>
            <a
              href={developerUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-conquer-navy transition-colors hover:text-conquer-orange"
            >
              {developerName}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}