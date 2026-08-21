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
      className="fixed bottom-4 right-3 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
      aria-label="WhatsApp"
    >
      <FaWhatsapp className="h-6 w-6 text-white sm:h-7 sm:w-7" />
    </a>
  );
}