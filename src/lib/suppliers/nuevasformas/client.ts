export type NFRow = {
  externalId: string;
  externalSku: string;
  supplierStock: number;
  supplierPrice: number;
  name: string;
};

// MOCK (lo que ya venís usando)
export async function fetchNFPageMock(page: number): Promise<any[]> {
  // podés ignorar page en mock o simular páginas
  return [
    { id: "101", sku: "NF-MATE-IMP", stock_quantity: 12, price: "19999", name: "Mate Imperial" },
    { id: "2031", sku: "NF-TERMO-1L-NEG", stock_quantity: 5, price: "29999", name: "Termo 1L - Negro" },
    { id: "2032", sku: "NF-TERMO-1L-BLA", stock_quantity: 0, price: "29999", name: "Termo 1L - Blanco" },
  ];
}

// Normaliza lo que venga de WooCommerce a tu formato interno
export function normalizeNF(rawItems: any[]): NFRow[] {
  return (rawItems || [])
    .map((p: any) => {
      const externalId = String(p?.id ?? "").trim();
      const externalSku = String(p?.sku ?? "").trim();
      const name = String(p?.name ?? "").trim();

      // WooCommerce: stock_quantity puede ser null si no maneja stock
      const supplierStock = Number(p?.stock_quantity ?? 0) || 0;

      // Woo: price suele venir string "29999" (o "29999.00")
      const supplierPrice = Math.round(Number(p?.price ?? 0) || 0);

      if (!externalId || !externalSku) return null;
      return { externalId, externalSku, supplierStock, supplierPrice, name: name || externalSku };
    })
    .filter(Boolean) as NFRow[];
}
