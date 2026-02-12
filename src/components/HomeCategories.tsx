import Link from "next/link";
import Image from "next/image";
import { Grid, ChevronRight } from "lucide-react";
import { categoryImages, defaultCategoryImage } from "@/lib/categoryImages";

type Category = {
  slug: string;
  name: string;
};

export default function HomeCategories({ categories }: { categories: Category[] }) {
  return (
    <section className="mt-16">
      {/* Cabecera */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-conquer-orange/10">
            <Grid className="h-5 w-5 text-conquer-orange" />
          </div>
          <h2 className="text-2xl font-bold text-conquer-navy">Categorías</h2>
        </div>
        <Link
          href="/productos"
          className="group flex items-center gap-1 text-sm font-medium text-conquer-navy transition-colors hover:text-conquer-orange"
        >
          Ver todas
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {categories.map((cat) => {
          const imgSrc = categoryImages[cat.slug] || defaultCategoryImage;

          return (
            <Link
              key={cat.slug}
              href={`/productos?cat=${encodeURIComponent(cat.slug)}`}
              className="group relative overflow-hidden rounded-2xl border border-conquer-pink/30 bg-white p-4 transition-all duration-300 hover:scale-[1.02] hover:border-conquer-orange hover:shadow-xl"
            >
              <div className="relative mx-auto aspect-square w-full max-w-[120px]">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-conquer-pink/10 to-conquer-turq/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <Image
                  src={imgSrc}
                  alt={cat.name}
                  fill
                  className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              </div>
              <h3 className="mt-3 text-center text-sm font-semibold text-conquer-navy line-clamp-2">
                {cat.name}
              </h3>
              <div className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-conquer-navy/60 transition-all group-hover:text-conquer-orange">
                <span>Ver productos</span>
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}