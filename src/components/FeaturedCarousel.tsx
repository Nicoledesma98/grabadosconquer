"use client";

import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

type Product = {
  id: string;
  slug: string;
  name: string;
  images: { url: string }[];
  priceTiers: { price: number; minQty: number }[];
  basePrice: number | null;
  createdAt: Date;
};

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
    breakpoints: {
      "(min-width: 640px)": { slidesToScroll: 2 },
      "(min-width: 1024px)": { slidesToScroll: 4 },
    },
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (products.length === 0) return null;

  return (
    <div className="relative">
      {/* Contenedor del carrusel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {products.map((product) => {
            const img = product.images[0]?.url;
            const price = product.priceTiers[0]?.price ?? product.basePrice ?? 0;
            const isNew =
              new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={product.id}
                className="flex-[0_0_100%] min-w-0 pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_25%]"
              >
                <Link
                  href={`/productos/${product.slug}`}
                  className="group block h-full"
                >
                  <article className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-conquer-pink/30 bg-white transition-all duration-300 hover:scale-[1.02] hover:border-conquer-orange hover:shadow-xl">
                    {/* Imagen */}
                    <div className="relative h-48 w-full bg-gradient-to-br from-conquer-pink/10 to-conquer-turq/10">
                      {img ? (
                        <Image
                          src={img}
                          alt={product.name}
                          fill
                          className="object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">
                          Sin imagen
                        </div>
                      )}

                      {/* Badge "Nuevo" */}
                      {isNew && (
                        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-conquer-orange px-3 py-1 text-xs font-bold text-white shadow-md">
                          <Sparkles className="h-3 w-3" />
                          NUEVO
                        </span>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex flex-1 flex-col p-4 ">
                      <h3 className="line-clamp-2 text-base font-semibold text-conquer-navy">
                        {product.name}
                      </h3>

                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-sm text-neutral-600">Desde</span>
                        <span className="text-xl font-bold text-conquer-orange">
                          {formatARS(price)}
                        </span>
                      </div>

                      {/* Botón que aparece al hover */}
                      <div className="mt-4 flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1 text-sm font-medium text-conquer-navy hover:text-conquer-orange">
                          Ver detalle
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flechas de navegación */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={scrollPrev}
          disabled={!prevBtnEnabled}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
            prevBtnEnabled
              ? "border-conquer-orange bg-white text-conquer-orange hover:bg-conquer-orange hover:text-white"
              : "border-neutral-200 bg-neutral-100 text-neutral-400 opacity-50 cursor-not-allowed"
          }`}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Dots indicadores */}
        <div className="flex gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === selectedIndex
                  ? "w-6 bg-conquer-orange"
                  : "w-2.5 bg-conquer-pink/40 hover:bg-conquer-pink/60"
              }`}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={scrollNext}
          disabled={!nextBtnEnabled}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
            nextBtnEnabled
              ? "border-conquer-orange bg-white text-conquer-orange hover:bg-conquer-orange hover:text-white"
              : "border-neutral-200 bg-neutral-100 text-neutral-400 opacity-50 cursor-not-allowed"
          }`}
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}