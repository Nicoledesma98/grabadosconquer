import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PersonalizationMethod = "DTF" | "DTG" | "FULL_COLOR" | "LASER";

export type CartItem = {
  key: string;                // ✅ clave única (producto+variante+método)
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string | null;

  unitPrice: number;
  qty: number;

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
        const q = Math.max(1, qty);
        const key = makeKey(item);

        const items = get().items;
        const existing = items.find((i) => i.key === key);

        if (existing) {
          set({
            items: items.map((i) =>
              i.key === key ? { ...i, qty: i.qty + q, unitPrice: item.unitPrice } : i
            ),
          });
          return;
        }

        set({ items: [...items, { ...item, key, qty: q }] });
      },

      removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),

      setQty: (key, qty) => {
        const q = Math.max(1, qty);
        set({
          items: get().items.map((i) => (i.key === key ? { ...i, qty: q } : i)),
        });
      },

      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0),
    }),
    { name: "conquer_cart_v2" } // ✅ cambiá el nombre para no chocar con el storage viejo
  )
);
