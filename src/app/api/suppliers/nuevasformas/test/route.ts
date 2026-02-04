import { NextResponse } from "next/server";

export const runtime = "nodejs";

function wcAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export async function GET() {
  const base = process.env.NF_WC_BASE_URL; // ej: https://nuevasformas.com.ar
  const key = process.env.NF_WC_KEY;
  const secret = process.env.NF_WC_SECRET;

  if (!base || !key || !secret) {
    return NextResponse.json({ error: "Faltan envs NF_WC_BASE_URL / NF_WC_KEY / NF_WC_SECRET" }, { status: 400 });
  }

  const url = `${base.replace(/\/$/, "")}/wp-json/wc/v3/products?per_page=20&page=1`;

  const res = await fetch(url, {
    headers: { Authorization: wcAuthHeader(key, secret) },
    cache: "no-store",
  });

  const text = await res.text(); // por si viene algo raro
  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, body: text.slice(0, 500) }, { status: 200 });
  }

  const json = JSON.parse(text);
  return NextResponse.json({ ok: true, count: Array.isArray(json) ? json.length : null });
}
