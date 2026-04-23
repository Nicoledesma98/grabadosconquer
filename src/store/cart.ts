import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PersonalizationMethod = "DTF" | "DTG" | "FULL_COLOR" | "LASER";

export type CartItem = {
  key: string;                // ✅ clave única (producto+variante+método)
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string | null;


  originalUnitPrice?: number | null;
  discountPercent?: number | null;
  unitPrice: number;
  qty: number;
  minQtyStep?: number | null;
  // ✅ variante/color
  variantId?: string | null;
  variantSku?: string | null;
  variantName?: string | null; // colorName
  colorHex?: string | null;
  colorName?: string | null;

  // ✅ personalización por ítem
  method?: PersonalizationMethod | null;
  notes?: string | null;
};

function makeKey(item: {
  productId: string;
  variantId?: string | null;
  method?: string | null;
}) {
  return `${item.productId}__${item.variantId ?? "no-variant"}__${item.method ?? "no-method"}`;
}
function ceilToStep(qty: number, step: number){
          const s = Math.max(1, Number(step || 1));
          const q = Math.max(1, Math.floor(Number(qty || 1)));
          return Math.ceil(q / s) * s;
        }

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty" | "key">, qty: number) => void;
  removeItem: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty) => {
  const step = Math.max(1, Number(item.minQtyStep ?? 1));
  const q = ceilToStep(qty, step);

  const key = makeKey(item);

  const items = get().items;
  const existing = items.find((i) => i.key === key);

  if (existing) {
    set({
      items: items.map((i) =>
        i.key === key
          ? {
              ...i,
              qty: i.qty + q,
              unitPrice: item.unitPrice,
              minQtyStep: step, // ✅ guardamos/actualizamos
            }
          : i
      ),
    });
    return;
  }

  set({ items: [...items, { ...item, minQtyStep: step, key, qty: q }] });
},


      removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),

     setQty: (key, qty) => {
  const items = get().items;
  const current = items.find((i) => i.key === key);

  const step = Math.max(1, Number(current?.minQtyStep ?? 1));
  const q = ceilToStep(qty, step);

  set({
    items: items.map((i) => (i.key === key ? { ...i, qty: q } : i)),
  });
},


      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0),
    }),
    { name: "conquer_cart_v2" } // ✅ cambiá el nombre para no chocar con el storage viejo
  )
);
