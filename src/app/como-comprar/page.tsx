// app/como-comprar/page.tsx
import { 
  ShoppingCart, 
  User, 
  CreditCard, 
  Package, 
  Truck, 
  ShieldCheck, 
  MessageCircle, 
  HelpCircle,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Cómo comprar | Grabados Conquer",
  description: "Conocé el proceso de compra, métodos de pago y envío en Grabados Conquer.",
};

export default function ComoComprarPage() {
  const steps = [
    {
      number: 1,
      icon: ShoppingCart,
      title: "Elegí tus productos",
      description:
        "Navegá por nuestro catálogo, seleccioná los productos que necesitás y agregalos al carrito. Podés elegir colores y personalización si están disponibles.",
    },
    {
      number: 2,
      icon: User,
      title: "Completá tus datos",
      description:
        "Ingresá tu nombre, email y teléfono. Si tenés CUIT, podés solicitar Factura A. También podés indicar preferencias de envío.",
    },
    {
      number: 3,
      icon: CreditCard,
      title: "Elegí el método de pago",
      description:
        "Aceptamos transferencia bancaria, Mercado Pago (con 10% de recargo) y efectivo (solo retiro). Si preferís coordinar con un vendedor, seleccioná la opción WhatsApp.",
    },
    {
      number: 4,
      icon: Package,
      title: "Confirmá el pedido",
      description:
        "Revisá el resumen de tu compra y confirmá. Te enviaremos un email con los detalles y el número de seguimiento si corresponde.",
    },
  ];

  const paymentMethods = [
    {
      name: "Transferencia bancaria",
      icon: CreditCard,
      description: "Sin recargo. Te enviamos los datos por email.",
    },
    {
      name: "Mercado Pago",
      icon: CreditCard,
      description: "Tarjeta de crédito/débito, 3 cuotas sin interés. +10% de recargo.",
    },
    {
      name: "Efectivo",
      icon: CreditCard,
      description: "Solo para retiro en nuestro local.",
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      description: "Coordinás el pago directamente con un asesor.",
    },
  ];

  const shippingMethods = [
    {
      name: "Retiro en local",
      icon: Package,
      description: "Sin cargo. Te esperamos en nuestro showroom.",
    },
    {
      name: "Moto",
      icon: Truck,
      description: "Entregas en CABA y GBA. El costo se calcula al finalizar la compra.",
    },
    {
      name: "OCA / Vía Cargo",
      icon: Truck,
      description: "Envíos a todo el país. El costo se informa por separado.",
    },
  ];

  const faqs = [
    {
      q: "¿Cómo sé el costo de envío?",
      a: "Para envío en moto, el costo se calcula automáticamente según tu localidad. Para OCA o Vía Cargo, te contactaremos con el presupuesto.",
    },
    {
      q: "¿Puedo modificar mi pedido después de confirmarlo?",
      a: "Sí, comunicate con nosotros por WhatsApp lo antes posible. Si el pedido ya fue procesado, no podremos hacer cambios.",
    },
    {
      q: "¿Qué es el precio por cantidad (tiers)?",
      a: "Ofrecemos descuentos progresivos según la cantidad que compres. El precio unitario se actualiza automáticamente en la ficha del producto.",
    },
    {
      q: "¿Hacen envíos al interior?",
      a: "Sí, trabajamos con OCA y Vía Cargo. El costo y tiempo de entrega varían según la localidad.",
    },
  ];

  return (
    <main className="bg-gradient-to-b from-white to-conquer-pink/5 py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-conquer-navy md:text-4xl">
            Cómo comprar en <span className="text-conquer-orange">Grabados Conquer</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-600">
            Te contamos paso a paso cómo realizar tu compra de forma rápida, segura y sin complicaciones.
          </p>
        </div>

        {/* Pasos */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm transition-all hover:scale-[1.02] hover:border-conquer-orange hover:shadow-lg"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-conquer-orange/10 text-conquer-orange group-hover:bg-conquer-orange group-hover:text-white transition-colors">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-conquer-navy text-sm font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-conquer-navy">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* Métodos de pago y envío */}
        <div className="mt-20 grid gap-8 lg:grid-cols-2">
          {/* Pago */}
          <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-conquer-orange/10">
                <CreditCard className="h-5 w-5 text-conquer-orange" />
              </div>
              <h2 className="text-xl font-semibold text-conquer-navy">Métodos de pago</h2>
            </div>
            <div className="space-y-4">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div key={method.name} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-conquer-pink/10">
                      <Icon className="h-3.5 w-3.5 text-conquer-navy" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-conquer-navy">{method.name}</p>
                      <p className="text-xs text-neutral-500">{method.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Envío */}
          <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-conquer-turq/10">
                <Truck className="h-5 w-5 text-conquer-turq" />
              </div>
              <h2 className="text-xl font-semibold text-conquer-navy">Métodos de envío</h2>
            </div>
            <div className="space-y-4">
              {shippingMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div key={method.name} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-conquer-pink/10">
                      <Icon className="h-3.5 w-3.5 text-conquer-navy" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-conquer-navy">{method.name}</p>
                      <p className="text-xs text-neutral-500">{method.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-conquer-pink/20">
              <HelpCircle className="h-5 w-5 text-conquer-navy" />
            </div>
            <h2 className="text-xl font-semibold text-conquer-navy">Preguntas frecuentes</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-conquer-pink/30 bg-white p-5 transition-all hover:border-conquer-orange/50"
              >
                <h3 className="flex items-start gap-2 text-base font-semibold text-conquer-navy">
                  <span className="mt-0.5 text-conquer-orange">•</span>
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm text-neutral-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Final */}
        <div className="mt-20 overflow-hidden rounded-3xl bg-gradient-to-br from-conquer-navy to-conquer-navy/90 p-8 text-white shadow-xl md:p-12">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <h3 className="text-2xl font-bold">¿Tenés dudas o necesitás ayuda?</h3>
              <p className="mt-2 text-conquer-pink/90">
                Nuestro equipo está listo para asesorarte de forma personalizada.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="https://wa.me/541131002011"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-conquer-orange px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </a>
              <Link
                href="/contacto"
                className="flex items-center justify-center gap-1 rounded-full border border-white/30 px-6 py-3 font-medium text-white transition-all hover:bg-white/10"
              >
                Ir a contacto
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Resumen final */}
        <div className="mt-12 text-center text-xs text-neutral-500">
          <p className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Compra 100% segura • Datos protegidos
          </p>
        </div>
      </div>
    </main>
  );
}