export type NFRow = {
  externalId: string;
  externalSku: string;
  supplierStock: number;
  supplierPrice: number;
  name: string;
  type?: "simple" | "variable";
  variations?: NFRow[];
  attributes?: any[];
};

// ========== AUTENTICACIÓN ==========
function wcAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

// ========== FETCH REAL ==========
export async function fetchNFPage(page: number = 1, perPage: number = 20): Promise<NFRow[]> {
  const base = process.env.NF_WC_BASE_URL!;
  const key = process.env.NF_WC_KEY!;
  const secret = process.env.NF_WC_SECRET!;

  if (!base || !key || !secret) {
    throw new Error("Faltan credenciales NF_WC_*");
  }

  const url = `${base.replace(/\/$/, "")}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, {
    headers: { Authorization: wcAuthHeader(key, secret) },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`);
  }

  const products = await res.json();
  return normalizeNF(products); // 👈 llamamos a la versión async
}

// ========== FETCH DE VARIACIONES ==========
export async function fetchNFVariations(productId: string | number): Promise<any[]> {
  const base = process.env.NF_WC_BASE_URL!;
  const key = process.env.NF_WC_KEY!;
  const secret = process.env.NF_WC_SECRET!;

  const url = `${base.replace(/\/$/, "")}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
  const res = await fetch(url, {
    headers: { Authorization: wcAuthHeader(key, secret) },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(`No se pudieron obtener variaciones del producto ${productId}`);
    return [];
  }
  return await res.json();
}

// ========== NORMALIZADOR ASÍNCRONO ==========
export async function normalizeNF(rawItems: any[]): Promise<NFRow[]> {
  const result: NFRow[] = [];

  for (const p of rawItems || []) {
    const externalId = String(p?.id ?? "").trim();
    const externalSku = String(p?.sku ?? "").trim();
    const name = String(p?.name ?? "").trim();
    const type = p?.type === "variable" ? "variable" : "simple";

    const supplierPrice = Math.round(Number(p?.price ?? 0) || 0);
    const supplierStock = type === "simple" ? Number(p?.stock_quantity ?? 0) || 0 : 0;

    const row: NFRow = {
      externalId,
      externalSku: externalSku || `NF-${externalId}`,
      supplierStock,
      supplierPrice,
      name: name || externalSku || externalId,
      type,
    };

    if (type === "variable" && Array.isArray(p.variations) && p.variations.length > 0) {
      const variations = await fetchNFVariations(p.id);
      row.variations = variations.map((v: any) => ({
        externalId: String(v.id),
        externalSku: String(v.sku || `NF-${v.id}`),
        supplierStock: Number(v.stock_quantity ?? 0) || 0,
        supplierPrice: Math.round(Number(v.price ?? 0) || 0),
        name: v.sku || `Variación ${v.id}`,
        type: "simple",
        attributes: v.attributes,
      }));
    }

    result.push(row);
  }

  return result;
}

// ========== MOCK (opcional, para pruebas) ==========
export async function fetchNFPageMock(page: number): Promise<NFRow[]> {
  return [
    { externalId: "101", externalSku: "NF-MATE-IMP", supplierStock: 12, supplierPrice: 19999, name: "Mate Imperial", type: "simple" },
    { externalId: "2031", externalSku: "NF-TERMO-1L-NEG", supplierStock: 5, supplierPrice: 29999, name: "Termo 1L - Negro", type: "simple" },
    { externalId: "2032", externalSku: "NF-TERMO-1L-BLA", supplierStock: 0, supplierPrice: 29999, name: "Termo 1L - Blanco", type: "simple" },
  ];
}