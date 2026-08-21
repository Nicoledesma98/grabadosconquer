"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const DEFAULT_PRIMARY_LABEL = "Ver productos";
const DEFAULT_PRIMARY_URL = "/productos";
const DEFAULT_SECONDARY_LABEL = "Consultar";
const DEFAULT_SECONDARY_URL = "https://wa.me/541131002011";

const DEFAULT_SLIDES = [
  {
    src: "/slides/slide1boligrafo.jpg",
    alt: "BOLÍGRAFOS PERSONALIZADOS - Grabados Conquer",
    title: "Bolígrafos personalizados",
    subtitle: "Ideal para empresas y eventos",
    primaryLabel: DEFAULT_PRIMARY_LABEL,
    primaryUrl: DEFAULT_PRIMARY_URL,
    secondaryLabel: DEFAULT_SECONDARY_LABEL,
    secondaryUrl: DEFAULT_SECONDARY_URL,
  },
  {
    src: "/slides/slide2botellas.jpg",
    alt: "BOTELLAS Y VASOS - Grabados Conquer",
    title: "Botellas y vasos",
    subtitle: "Grabado de alta calidad",
    primaryLabel: DEFAULT_PRIMARY_LABEL,
    primaryUrl: DEFAULT_PRIMARY_URL,
    secondaryLabel: DEFAULT_SECONDARY_LABEL,
    secondaryUrl: DEFAULT_SECONDARY_URL,
  },
  {
    src: "/slides/slide3termos.jpg",
    alt: "TERMOS Y MATES - Grabados Conquer",
    title: "Termos y mates",
    subtitle: "El regalo perfecto",
    primaryLabel: DEFAULT_PRIMARY_LABEL,
    primaryUrl: DEFAULT_PRIMARY_URL,
    secondaryLabel: DEFAULT_SECONDARY_LABEL,
    secondaryUrl: DEFAULT_SECONDARY_URL,
  },
];

export type HomeSlideDTO = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  primaryLabel?: string | null;
  primaryUrl?: string | null;
  secondaryLabel?: string | null;
  secondaryUrl?: string | null;
};

export default function HomeSlider({ slides }: { slides?: HomeSlideDTO[] }) {
  const SLIDES =
    slides && slides.length > 0
      ? slides.map((s) => ({
          src: s.imageUrl,
          alt: s.title,
          title: s.title,
          subtitle: s.subtitle ?? "",
          primaryLabel: s.primaryLabel || DEFAULT_PRIMARY_LABEL,
          primaryUrl: s.primaryUrl || DEFAULT_PRIMARY_URL,
          secondaryLabel: s.secondaryLabel || DEFAULT_SECONDARY_LABEL,
          secondaryUrl: s.secondaryUrl || DEFAULT_SECONDARY_URL,
        }))
      : DEFAULT_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay
  useEffect(() => {
    if (!isAutoPlaying || isHovering) return;
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isHovering, nextSlide]);

  return (
    <div
      className="group relative overflow-hidden bg-gradient-to-br from-conquer-navy/5 to-conquer-pink/5"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Slides container */}
      <div className="relative aspect-[21/9] w-full md:aspect-[21/8] lg:aspect-[21/7]">
        {SLIDES.map((slide, idx) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              className="object-cover"
              priority={idx === 0}
              sizes="100vw"
            />

            {/* Overlay degradado para mejorar legibilidad del texto */}
            <div className="absolute inset-0 bg-gradient-to-r from-conquer-navy/70 via-transparent to-transparent" />

            {/* Contenido textual */}
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
                <div className="max-w-lg transform transition-all duration-700 delay-200">
                  {slide.subtitle && (
                    <span className="inline-block rounded-full bg-conquer-orange/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                      {slide.subtitle}
                    </span>
                  )}
                  <h2 className="mt-4 text-3xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
                    {slide.title}
                  </h2>
                  <div className="mt-6 flex gap-4">
                    <a
                      href={slide.primaryUrl}
                      target={slide.primaryUrl.startsWith("http") ? "_blank" : undefined}
                      rel={slide.primaryUrl.startsWith("http") ? "noreferrer" : undefined}
                      className="rounded-full bg-conquer-orange px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-conquer-orange/90 hover:shadow-xl"
                    >
                      {slide.primaryLabel}
                    </a>
                    <a
                      href={slide.secondaryUrl}
                      target={slide.secondaryUrl.startsWith("http") ? "_blank" : undefined}
                      rel={slide.secondaryUrl.startsWith("http") ? "noreferrer" : undefined}
                      className="rounded-full bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
                    >
                      {slide.secondaryLabel}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botones de navegación - aparecen al hover del contenedor */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-conquer-navy backdrop-blur-sm transition-all hover:scale-110 hover:bg-conquer-orange hover:text-white group-hover:block md:block"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-conquer-navy backdrop-blur-sm transition-all hover:scale-110 hover:bg-conquer-orange hover:text-white group-hover:block md:block"
        aria-label="Slide siguiente"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Controles inferiores */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
        {/* Dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentIndex
                  ? "w-6 bg-conquer-orange"
                  : "w-2.5 bg-white/70 hover:bg-white"
              }`}
              aria-label={`Ir al slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Botón pausa/play */}
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="ml-2 rounded-full bg-white/30 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-white/50"
          aria-label={isAutoPlaying ? "Pausar" : "Iniciar"}
        >
          {isAutoPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}