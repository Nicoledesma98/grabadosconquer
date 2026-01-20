import Link from "next/link";
import HomeSlider from "@/components/HomeSlider";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import HomeBenefits from "@/components/HomeBenefits";
import HomeFeatured from "@/components/HomeFeatured";

export const runtime = "nodejs";

const CATS = [
  { slug: "mates-y-termos", name: "Mates y Termos", img: "/categories/4_mates y termos.png" },
  { slug: "escritura", name: "Escritura", img: "/categories/1_escritura.png" },
  { slug: "vasos-y-botellas", name: "Vasos y Botellas", img: "/categories/5_vasos y botellas.png" },
  { slug: "accesorios", name: "Accesorios", img: "/categories/9_accesorios.png" },
  { slug: "escritorio", name: "Escritorio", img: "/categories/2_escritorio.png" },
  { slug: "eco", name: "Eco", img: "/categories/3_eco.png" },
  { slug: "hogar-y-tiempo-libre", name: "Hogar y Tiempo Libre", img: "/categories/6_hogar y tempo libre.png" },
  { slug: "bolsos-y-mochilas", name: "Bolsos y Mochilas", img: "/categories/7_BOLSOS Y MOCHILAS.png" },
  { slug: "cuidado-personal", name: "Cuidado Personal", img: "/categories/8_cuidado personal.png" },
  { slug: "llaveros", name: "Llaveros", img: "/categories/10_llaveros.png" },
  { slug: "niños", name: "Niños", img: "/categories/11_niños.png" },
  { slug: "tecnologia", name: "Tecnologia", img: "/categories/12_tecnologia.png" },
];

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function HomePage() {
  const featured = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" }, // “novedades”
    take: 8,
    include: {
      images: { orderBy: { sort: "asc" }, take: 1 },
      priceTiers: { orderBy: { minQty: "asc" }, take: 1 },
    },
  });

  return (
    <main className="py-8">
      {/* Slider full width */}
      <div className="w-full">
        <HomeSlider />
      </div>
    <HomeBenefits />
      {/* Contenido con contenedor */}
      <div className="mx-auto max-w-6xl px-4">
        {/* CATEGORÍAS */}
        <div className="mt-8  text-center">
          <h2 className="text-xl font-semibold text-conquer-navy">Categorías</h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATS.map((c) => (
            <Link
              key={c.slug}
              href={`/productos?cat=${encodeURIComponent(c.slug)}`}
              className="group overflow-hidden rounded-3xl border border-conquer-pink bg-white hover:shadow-sm transition"
            >
              <div className="relative h-32 w-full bg-white">
                <Image src={c.img} alt={c.name} fill className="object-contain p-4" />
              </div>
              <div className="p-4">
                <div className="font-medium text-center text-conquer-navy">{c.name}</div>
                <div className="text-sm text-neutral-600 text-center group-hover:text-conquer-turq">
                  Ver productos
                </div>
              </div>
            </Link>
          ))}
        </div>
        <HomeFeatured />

      </div>
    </main>
  );
}
