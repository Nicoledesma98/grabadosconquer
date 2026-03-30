"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsappFloat() {
  const phone = "5491170660569";
  const text = encodeURIComponent("Hola! Quiero consultar por productos personalizados.");

  return (
    <a
      href={`https://wa.me/${phone}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105"
      aria-label="WhatsApp"
    >
      <FaWhatsapp className="h-7 w-7 text-white" />
    </a>
  );
}