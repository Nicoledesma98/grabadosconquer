"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginCreds(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok) router.push("/admin/pedidos");
    else alert("Email o contraseña incorrectos");
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>

      <button
        className="mt-4 h-11 w-full rounded-2xl border hover:bg-neutral-50"
        onClick={() => signIn("google", { callbackUrl: "/admin/pedidos" })}
      >
        Entrar con Google
      </button>

      <div className="my-6 text-center text-sm text-neutral-600">o</div>

      <form onSubmit={loginCreds} className="rounded-2xl border p-5 grid gap-3">
        <input
          className="h-11 rounded-2xl border px-4"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="h-11 rounded-2xl border px-4"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="h-11 rounded-2xl bg-black text-white disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
