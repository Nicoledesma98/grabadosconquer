import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty) => {
        const q = Math.max(1, qty);
        const items = get().items;
        const existing = items.find((i) => i.productId === item.productId);

        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, qty: i.qty + q, unitPrice: item.unitPrice } // actualiza precio por si cambió tier
                : i
            ),
          });
          return;
        }

        set({ items: [...items, { ...item, qty: q }] });
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),

      setQty: (productId, qty) => {
        const q = Math.max(1, qty);
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, qty: q } : i
          ),
        });
      },

      clear: () => set({ items: [] }),

      subtotal: () =>
        get().items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0),
    }),
    { name: "conquer_cart_v1" }
  )
);
