// src/app/login/page.tsx
"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoadingCreds(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoadingCreds(false);

    if (!res || res.error) {
      setError("Email o contraseña inválidos.");
      return;
    }

    // redirige manual (porque redirect:false)
    window.location.href = res.url || callbackUrl;
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-conquer-pink/10">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-conquer-pink bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-conquer-navy">Ingresar</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Accedé para ver tus pedidos y gestionar tu cuenta.
          </p>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="mt-5 h-11 w-full rounded-2xl border hover:bg-neutral-50 text-sm"
          >
            Continuar con Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs text-neutral-500">o con email</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <form onSubmit={onCredentials} className="grid gap-3">
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
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={loadingCreds}
              className="mt-1 h-11 w-full rounded-2xl bg-conquer-orange text-white hover:opacity-90 disabled:opacity-60"
            >
              {loadingCreds ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-5 text-sm text-neutral-700">
            ¿No tenés cuenta?{" "}
            <Link className="text-conquer-turq hover:underline" href="/register">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
