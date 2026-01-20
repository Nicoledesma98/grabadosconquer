"use client";

export default function WhatsappFloat() {
  const phone = "5491131002011"; // cambiá si querés
  const text = encodeURIComponent("Hola! Quiero consultar por productos personalizados.");

  return (
    <a
      href={`https://wa.me/${phone}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:scale-105 transition"
      aria-label="WhatsApp"
    >
      {/* ícono simple */}
      <span className="text-white text-2xl font-bold">W</span>
    </a>
  );
}
