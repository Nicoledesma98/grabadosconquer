export type StockSurRow = {
  externalId: string;          // id del producto (proveedor)
  externalSku: string;          // code del producto (ej. "BP161")
  name: string;
  description: string | null;
  categories: { id: number; name: string }[];
  packing?: any; // opcional, si lo querés guardar
  icons?: any[]; // opcional
  variants: StockSurVariant[];
};

export type StockSurVariant = {
  externalId: string;           // id de la variante
  sku: string;                  // sku de la variante (ej. "BP161-02")
  novedad: boolean;
  stock: number;                // stock_available (o el que corresponda)
  listPrice: number;            // precio de lista (en dólares para Argentina)
  netPrice: number;             // precio neto (con descuento)
  color: {
    id: number;
    name: string;
    hexCode: string | null;
    picture?: string;           // imagen del color (opcional)
  };
  images: {
    small?: string;
    medium?: string;
    original?: string;
    detail?: { small?: string; medium?: string; original?: string };
    other?: Array<{ index: number; small?: string; medium?: string; original?: string }>;
  };
};

// ========== AUTENTICACIÓN ==========
function buildUrl(country: string = "argentina", params: Record<string, string | number>) {
  const base = `http://api.${country}.cdopromocionales.com/v2/products`;
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}

// ========== FETCH REAL (con paginación opcional, aunque acá no hay) ==========
export async function fetchStockSurPage(
  authToken: string,
  pageSize: number = 100,
  pageNumber: number = 1,
  country: string = "argentina"
): Promise<{ products: StockSurRow[]; meta?: any }> {
  const url = buildUrl(country, {
    auth_token: authToken,
    page_size: pageSize,
    page_number: pageNumber,
  });

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status} al obtener productos de StockSur: ${text.slice(0, 200)}`);
  }

  const json = await res.json();

  // Si la API no tiene paginación, la respuesta es un array directamente
  if (Array.isArray(json)) {
    return { products: normalizeStockSur(json), meta: null };
  }

  // Si tiene paginación (aunque en este caso no), vendría con { products, meta }
  return {
    products: normalizeStockSur(json.products || []),
    meta: json.meta,
  };
}

// ========== NORMALIZADOR ==========
export function normalizeStockSur(rawProducts: any[]): StockSurRow[] {
  return rawProducts.map((p: any) => ({
    externalId: String(p.id),
    externalSku: String(p.code || "").trim(),
    name: String(p.name || "").trim(),
    description: p.description ? String(p.description).trim() : null,
    categories: Array.isArray(p.categories)
      ? p.categories.map((c: any) => ({ id: c.Id, name: c.name }))
      : [],
    packing: p.packing || null,
    icons: p.icons || [],
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          externalId: String(v.id),
          sku: String(v.sku || "").trim(),
          novedad: v.novedad === true,
          stock: Number(v.stock_available ?? 0) || 0,
          listPrice: Number(v.list_price ?? 0) || 0,
          netPrice: Number(v.net_price ?? 0) || 0,
          color: {
            id: v.color?.id,
            name: v.color?.name || "",
            hexCode: v.color?.hex_code || null,
            picture: v.color?.picture || null,
          },
          images: {
            small: v.picture?.small,
            medium: v.picture?.medium,
            original: v.picture?.original,
            detail: v.detail_picture,
            other: v.other_pictures || [],
          },
        }))
      : [],
  }));
}

// ========== MOCK (opcional, para pruebas) ==========
export async function fetchStockSurMock(): Promise<StockSurRow[]> {
  // Podés armar un mock si querés, pero mejor usar la real con page_size=1 para probar
  return [];
}