import Link from "next/link";
import Image from "next/image";
function yearNow() {
  return new Date().getFullYear();
}

type Props = {
  // Opcional: si querés dejar configurable
  developerName?: string;
  developerUrl?: string;
};

export default function Footer({
  developerName = "Nicolás Agustín Ledesma",
  developerUrl = "https://www.linkedin.com/", // poné tu link real (LinkedIn/GitHub/Portfolio)
}: Props) {
  return (
    <footer className="border-t border-conquer-pink/70 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-4">
        {/* Marca + Logo */}
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            {/* Cambiá la ruta según tu logo */}
            <div className="relative h-10 w-10">
              <Image
                src="/brands/isotipo.png"   // o "/logo.svg"
                alt="Grabados Conquer"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="leading-tight">
              <div className="text-lg font-semibold text-conquer-navy">Grabados Conquer</div>
              <div className="text-xs text-neutral-500">Personalizados · Grabados</div>
            </div>
          </Link>

          <p className="mt-3 text-sm text-neutral-600">
            Productos personalizados · regalos empresariales · grabados.
          </p>

          <a
            href="https://wa.me/541131002011"
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-4 items-center justify-center rounded-2xl bg-conquer-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            WhatsApp
          </a>

          {/* Redes */}
          <div className="mt-4 flex items-center gap-3">
            <a
              href="https://instagram.com/" // poné el link real
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-conquer-pink/70 hover:bg-conquer-pink/10"
              title="Instagram"
            >
              {/* Icono IG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M17.5 6.5h.01"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </a>

            <a
              href="https://tiktok.com/" // poné el link real
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-conquer-pink/70 hover:bg-conquer-pink/10"
              title="TikTok"
            >
              {/* Icono TikTok (simple) */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7V7.2a7 7 0 1 0 7 7V9.5c1.2.8 2.6 1.2 4 1.2V7.2c-2.2 0-4-1.8-4-4.2H14Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Links */}
        <div>
          <div className="text-sm font-semibold text-conquer-navy">Navegación</div>
          <ul className="mt-3 grid gap-2 text-sm">
            <li><Link className="text-neutral-700 hover:underline" href="/">Inicio</Link></li>
            <li><Link className="text-neutral-700 hover:underline" href="/productos">Productos</Link></li>
            <li><Link className="text-neutral-700 hover:underline" href="/como-comprar">Cómo comprar</Link></li>
            <li><Link className="text-neutral-700 hover:underline" href="/contacto">Contacto</Link></li>
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <div className="text-sm font-semibold text-conquer-navy">Contacto</div>
          <div className="mt-3 grid gap-2 text-sm text-neutral-700">
            <div>
              <span className="text-neutral-500">WhatsApp:</span>{" "}
              <a className="hover:underline" href="https://wa.me/541131002011" target="_blank" rel="noreferrer">
                +54 11 3100-2011
              </a>
            </div>
            <div>
              <span className="text-neutral-500">Email:</span>{" "}
              <a className="hover:underline" href="mailto:ventas@tudominio.com">
                ventas@tudominio.com
              </a>
            </div>
            <div>
              <span className="text-neutral-500">Zona:</span> CABA / GBA
            </div>
          </div>
        </div>

        {/* Info / legales (opcional) */}
        <div>
          <div className="text-sm font-semibold text-conquer-navy">Información</div>
          <ul className="mt-3 grid gap-2 text-sm">
            <li><Link className="text-neutral-700 hover:underline" href="/terminos">Términos</Link></li>
            <li><Link className="text-neutral-700 hover:underline" href="/privacidad">Privacidad</Link></li>
            <li><Link className="text-neutral-700 hover:underline" href="/cambios-y-devoluciones">Cambios</Link></li>
          </ul>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-conquer-pink/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-2 items-start md:items-center justify-between text-xs text-neutral-500">
          <div>© {yearNow()} Grabados Conquer. Todos los derechos reservados.</div>

          {/* Crédito */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Desarrollado por</span>
            <a
              href={developerUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-conquer-navy hover:underline"
            >
              {developerName}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
