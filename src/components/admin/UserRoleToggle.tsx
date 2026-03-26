"use client";

import { useState } from "react";

// Definimos los roles permitidos (debe coincidir con la API)
const ROLES = ["ADMIN", "CUSTOMER", "VENTAS", "STOCK", "REVENDEDOR"] as const;
type Role = typeof ROLES[number];

// Función auxiliar para mostrar el nombre legible
function getRoleLabel(role: Role): string {
  switch (role) {
    case "ADMIN": return "Administrador";
    case "CUSTOMER": return "Cliente";
    case "VENTAS": return "Ventas";
    case "STOCK": return "Stock";
    case "REVENDEDOR": return "Revendedor";
    default: return role;
  }
}

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
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role;
    if (newRole === currentRole) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          alert(data?.error || "No se pudo cambiar el rol.");
        } else {
          alert("Error al cambiar rol (respuesta inesperada).");
        }
        return;
      }

      // Si la petición fue exitosa, recargamos para actualizar la tabla
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={selectedRole}
      onChange={handleChange}
      disabled={disabled || loading}
      className="rounded-xl border border-conquer-pink/30 bg-white px-3 py-1 text-xs focus:border-conquer-orange focus:ring-1 focus:ring-conquer-orange disabled:opacity-50"
      title={disabled ? "No podés cambiar tu propio rol" : ""}
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {getRoleLabel(role)}
        </option>
      ))}
    </select>
  );
}