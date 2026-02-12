import { NextResponse } from "next/server";

export const runtime = "nodejs";

function wcAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export async function GET() {
  const base = process.env.NF_WC_BASE_URL;
  const key = process.env.NF_WC_KEY;
  const secret = process.env.NF_WC_SECRET;

  if (!base || !key || !secret) {
    return NextResponse.json({
      ok: false,
      error: "Faltan variables de entorno NF_WC_BASE_URL, NF_WC_KEY, NF_WC_SECRET"
    }, { status: 400 });
  }

  try {
    const url = `${base.replace(/\/$/, "")}/wp-json/wc/v3/products?per_page=1&page=1`;
    const res = await fetch(url, {
      headers: { Authorization: wcAuthHeader(key, secret) },
      cache: "no-store",
    });

    const responseText = await res.text();
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        statusText: res.statusText,
        body: responseText.slice(0, 500),
      });
    }

    const json = JSON.parse(responseText);
    return NextResponse.json({
      ok: true,
      message: "Conexión exitosa",
      sample: Array.isArray(json) && json.length > 0 ? {
        id: json[0].id,
        name: json[0].name,
        sku: json[0].sku,
        type: json[0].type,
        price: json[0].price,
        stock: json[0].stock_quantity,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }
}