import { NextResponse } from "next/server";

export const runtime = "nodejs";

function wcAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export async function GET(req: Request) {
  const base = process.env.NF_WC_BASE_URL!;
  const key = process.env.NF_WC_KEY!;
  const secret = process.env.NF_WC_SECRET!;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const per = Number(searchParams.get("per") ?? "20");
  const idx = Number(searchParams.get("idx") ?? "0"); // cuál producto dentro de la página

  const listUrl = `${base.replace(/\/$/, "")}/wp-json/wc/v3/products?per_page=${per}&page=${page}`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: wcAuthHeader(key, secret) },
    cache: "no-store",
  });

  const listText = await listRes.text();
  if (!listRes.ok) {
    return NextResponse.json({ ok: false, status: listRes.status, body: listText.slice(0, 800) });
  }

  const products = JSON.parse(listText);
  const p = products[idx];

  if (!p) {
    return NextResponse.json({ ok: true, message: "No hay producto en ese idx", idx, count: products.length });
  }

  // Resumen “importante” para decidir stock
  const summary = {
    id: p.id,
    name: p.name,
    type: p.type, // simple | variable
    sku: p.sku,
    manage_stock: p.manage_stock,
    stock_quantity: p.stock_quantity,
    stock_status: p.stock_status,
    variations_count: Array.isArray(p.variations) ? p.variations.length : 0,
    variations_sample: Array.isArray(p.variations) ? p.variations.slice(0, 5) : [],
    price: p.price,
    regular_price: p.regular_price,
  };

  // Si es variable, traemos 1–5 variaciones para ver dónde está el stock
  let variationsPreview: any[] = [];
  if (p.type === "variable" && Array.isArray(p.variations) && p.variations.length > 0) {
    const varUrl = `${base.replace(/\/$/, "")}/wp-json/wc/v3/products/${p.id}/variations?per_page=5&page=1`;
    const vr = await fetch(varUrl, {
      headers: { Authorization: wcAuthHeader(key, secret) },
      cache: "no-store",
    });
    const vt = await vr.text();
    if (vr.ok) {
      const vars = JSON.parse(vt);
      variationsPreview = (vars || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        manage_stock: v.manage_stock,
        stock_quantity: v.stock_quantity,
        stock_status: v.stock_status,
        price: v.price,
        attributes: v.attributes, // color/talle/etc
      }));
    } else {
      variationsPreview = [{ error: "No pude leer variations", status: vr.status, body: vt.slice(0, 300) }];
    }
  }

  return NextResponse.json({ ok: true, summary, variationsPreview });
}
