"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStockSurPage = fetchStockSurPage;
exports.normalizeStockSur = normalizeStockSur;
exports.fetchStockSurMock = fetchStockSurMock;
// ========== AUTENTICACIÓN ==========
function buildUrl(country = "argentina", params) {
    const base = `http://api.${country}.cdopromocionales.com/v2/products`;
    const url = new URL(base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return url.toString();
}
// ========== FETCH REAL (con paginación opcional, aunque acá no hay) ==========
async function fetchStockSurPage(authToken, pageSize = 100, pageNumber = 1, country = "argentina") {
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
function normalizeStockSur(rawProducts) {
    return rawProducts.map((p) => ({
        externalId: String(p.id),
        externalSku: String(p.code || "").trim(),
        name: String(p.name || "").trim(),
        description: p.description ? String(p.description).trim() : null,
        categories: Array.isArray(p.categories)
            ? p.categories.map((c) => ({ id: c.Id, name: c.name }))
            : [],
        packing: p.packing || null,
        icons: p.icons || [],
        variants: Array.isArray(p.variants)
            ? p.variants.map((v) => ({
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
async function fetchStockSurMock() {
    // Podés armar un mock si querés, pero mejor usar la real con page_size=1 para probar
    return [];
}
