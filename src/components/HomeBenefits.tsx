export default function HomeBenefits() {
  const items = [
    {
      title: "Envíos a todo el país",
      desc: "Trabajamos con envíos rápidos y seguros.",
      badge: "OCA / Moto / Retiro",
    },
    {
      title: "Productos personalizados",
      desc: "Grabado láser y UV para empresas y eventos.",
      badge: "Tu logo / tu idea",
    },
    {
      title: "Precios por cantidad",
      desc: "Mejor precio a mayor cantidad (tiers).",
      badge: "Mayorista",
    },
    {
      title: "Atención por WhatsApp",
      desc: "Respondemos rápido para cotizaciones y dudas.",
      badge: "11 3100 2011",
    },
  ];

  return (
    <section className="mt-6 bg-conquer-pink/20 py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-3xl border border-conquer-pink bg-white p-4"
            >
              <div className="text-base text-center font-semibold text-conquer-navy">
                {it.title}
              </div>

              <div className="mt-1 text-sm text-neutral-600">{it.desc}</div>

              {/* Badge abajo, más protagonista */}
              <div className="mt-4 inline-flex rounded-2xl bg-conquer-orange/15 px-3 py-2 text-sm font-semibold text-conquer-navy">
                {it.badge}
              </div>

              <div className="mt-4 h-1 w-12 rounded-full bg-conquer-orange" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
