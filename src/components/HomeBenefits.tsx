"use client";

import {
  Truck,
  Package,
  BadgePercent,
  MessageCircle,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";

export default function HomeBenefits() {
  const items = [
    {
      title: "Envíos a todo el país",
      desc: "Trabajamos con envíos rápidos y seguros.",
      badge: "OCA / Moto / Retiro",
      icon: Truck,
      color: "blue",
    },
    {
      title: "Productos personalizados",
      desc: "Grabado láser y UV para empresas y eventos.",
      badge: "Tu logo / tu idea",
      icon: Sparkles,
      color: "orange",
    },
    {
      title: "Precios por cantidad",
      desc: "Mejor precio a mayor cantidad (tiers).",
      badge: "Mayorista",
      icon: TrendingUp,
      color: "green",
    },
    {
      title: "Atención por WhatsApp",
      desc: "Respondemos rápido para cotizaciones y dudas.",
      badge: "11 7066 0569",
      icon: MessageCircle,
      color: "purple",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-white to-conquer-pink/10 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header opcional (podés omitirlo si ya hay título arriba) */}
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full bg-conquer-orange/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-conquer-orange">
            Beneficios exclusivos
          </span>
          <h2 className="mt-3 text-2xl font-bold text-conquer-navy md:text-3xl">
            ¿Por qué elegirnos?
          </h2>
        </div>

        {/* Grid de beneficios */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-2xl border border-conquer-pink/20 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-conquer-orange/50 hover:shadow-xl"
              >
                {/* Fondo decorativo */}
                <div className="absolute inset-0 bg-gradient-to-br from-conquer-pink/5 to-conquer-turq/5 opacity-0 transition-opacity group-hover:opacity-100" />

                {/* Icono circular */}
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-conquer-orange/10 transition-all group-hover:bg-conquer-orange/20">
                  <Icon className="h-7 w-7 text-conquer-orange" />
                </div>

                {/* Título y descripción */}
                <div className="relative mt-4">
                  <h3 className="text-lg font-semibold text-conquer-navy">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">{item.desc}</p>
                </div>

                {/* Badge */}
                <div className="relative mt-4">
                  <span className="inline-flex items-center rounded-full bg-conquer-pink/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-conquer-navy ring-1 ring-conquer-pink/30">
                    {item.badge}
                  </span>
                </div>

                {/* Línea inferior decorativa (animada) */}
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-conquer-orange transition-all duration-300 group-hover:w-full" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}