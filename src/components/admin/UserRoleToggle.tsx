"use client";

import { useState } from "react";

type Role = "ADMIN" | "CUSTOMER";

export default function UserRoleToggle({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function onToggle() {
    console.log("userId:", userId);

    if (disabled || loading) return;

    setLoading(true);
    try {
      const nextRole: Role = currentRole === "ADMIN" ? "CUSTOMER" : "ADMIN";

      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!res.ok) {
        // ✅ si viene json, muestro error limpio
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json().catch(() => null);
          alert(data?.error || "No se pudo cambiar el rol.");
        } else {
          // si viene HTML u otra cosa, muestro mensaje genérico
          alert("Error al cambiar rol (la API no devolvió JSON). Revisá la ruta/servidor.");
        }
        return;
      }

      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button 
      type="button"
      onClick={onToggle}
      disabled={!!disabled || loading}
      className={`rounded-xl px-3 py-1 text-xs border hover:bg-neutral-50 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
      title={disabled ? "No podés cambiar tu propio rol" : ""}
    >
      {loading ? "..." : currentRole === "ADMIN" ? "Quitar admin" : "Hacer admin"}
    </button>
  );
}
