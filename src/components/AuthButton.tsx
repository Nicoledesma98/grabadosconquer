"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data, status } = useSession();

  if (status === "loading") return null;

  if (!data?.user) {
    return (
      <button
        onClick={() => signIn()}
        className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
      >
        Ingresar
      </button>
    );
  }

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/productos" })}
      className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
    >
      Salir
    </button>
  );
}
