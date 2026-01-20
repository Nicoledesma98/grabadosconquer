"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/slides/slide1boligrafo.jpg", alt: "Slide 1" },
  { src: "/slides/slide2botellas.jpg", alt: "Slide 2" },
  { src: "/slides/slide3termos.jpg", alt: "Slide 3" },
];

export default function HomeSlider() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden border border-conquer-pink bg-white">
      <div className="relative aspect-[16/6] w-full">
        <Image
          src={SLIDES[i].src}
          alt={SLIDES[i].alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-2.5 w-2.5 rounded-full ${
              idx === i ? "bg-conquer-orange" : "bg-white/70"
            }`}
            aria-label={`Ir a slide ${idx + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
