// src/app/register/page.tsx
"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload?.error || "No se pudo crear la cuenta.");
        return;
      }

      // auto-login con credenciales
      const login = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!login || login.error) {
        setError("Cuenta creada, pero no se pudo iniciar sesión. Probá ingresar.");
        return;
      }

      window.location.href = login.url || "/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-conquer-pink/10">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-conquer-pink bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-conquer-navy">Crear cuenta</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Te pedimos estos datos para tu perfil y tus pedidos.
          </p>

          <form onSubmit={onSubmit} className="mt-5 grid gap-3">
            <input
              className="h-11 rounded-2xl border px-4"
              placeholder="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="h-11 rounded-2xl border px-4"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
            <input
              className="h-11 rounded-2xl border px-4"
              placeholder="Contraseña (mínimo 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="h-11 w-full rounded-2xl bg-conquer-orange text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-5 text-sm text-neutral-700">
            ¿Ya tenés cuenta?{" "}
            <Link className="text-conquer-turq hover:underline" href="/login">
              Ingresar
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
