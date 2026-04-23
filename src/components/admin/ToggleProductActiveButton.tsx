"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleProductActiveButton({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onToggle() {
    const confirmMsg = active
      ? "¿Querés ocultar este producto de la tienda?"
      : "¿Querés volver a activar este producto en la tienda?";

    if (!confirm(confirmMsg)) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/products/${productId}/toggle-active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar");
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || "Error actualizando producto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`h-9 px-3 rounded-2xl border text-xs flex items-center ${
        active
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-green-200 text-green-700 hover:bg-green-50"
      } disabled:opacity-50`}
    >
      {loading ? "Guardando..." : active ? "Ocultar" : "Activar"}
    </button>
  );
}