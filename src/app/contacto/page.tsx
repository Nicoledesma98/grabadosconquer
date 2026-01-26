"use client";

import { useState } from "react";

export default function ContactoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Consulta");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          message,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(payload?.error || "No se pudo enviar el mensaje.");
        return;
      }

      alert("Mensaje enviado ✅ Te respondemos a la brevedad.");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("Consulta");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  const disabled =
    loading ||
    !name.trim() ||
    !email.trim() ||
    !message.trim();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-conquer-navy">Contacto</h1>
      <p className="mt-2 text-neutral-600">
        Dejanos tu consulta y te respondemos por email o WhatsApp.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-3xl border border-conquer-pink bg-white p-6">
        <div className="grid gap-2">
          <label className="text-sm text-conquer-navy">Nombre y apellido *</label>
          <input
            className="h-11 rounded-2xl border px-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-conquer-navy">Email *</label>
          <input
            className="h-11 rounded-2xl border px-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuemail@..."
            inputMode="email"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-conquer-navy">Teléfono (opcional)</label>
          <input
            className="h-11 rounded-2xl border px-4"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="11..."
            inputMode="tel"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-conquer-navy">Motivo</label>
          <select
            className="h-11 rounded-2xl border px-4"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option>Consulta</option>
            <option>Pedido</option>
            <option>Personalización</option>
            <option>Factura</option>
            <option>Empresas</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-conquer-navy">Mensaje *</label>
          <textarea
            className="min-h-36 rounded-2xl border px-4 py-3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contanos qué necesitás..."
          />
        </div>

        <button
          disabled={disabled}
          className="h-11 rounded-2xl bg-conquer-orange text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>

        <div className="text-xs text-neutral-500">
          WhatsApp: 11 3100 2011 • Respondemos en horario laboral.
        </div>
      </form>
    </main>
  );
}
