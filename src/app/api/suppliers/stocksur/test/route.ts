import { NextResponse } from "next/server";
import { fetchStockSurPage } from "@/lib/suppliers/stocksur/client";

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.SS_AUTH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Falta STOCKSUR_AUTH_TOKEN en .env" }, { status: 400 });
  }

  try {
    // Probamos con page_size=1 para ver la estructura sin traer muchos datos
    const data = await fetchStockSurPage(token, 1, 1);
    return NextResponse.json({
      ok: true,
      sample: data.products[0] || null,
      meta: data.meta,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}