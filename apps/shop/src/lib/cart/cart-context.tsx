"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface CartLine {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (item: Omit<CartLine, "quantity">) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "grocery.cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const value = useMemo<CartState>(() => ({
    lines,
    isOpen,
    setIsOpen,
    add: (item) =>
      setLines((prev) => {
        const existing = prev.find((l) => l.product_id === item.product_id);
        if (existing) {
          return prev.map((l) =>
            l.product_id === item.product_id ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      }),
    setQuantity: (productId, quantity) =>
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.product_id !== productId)
          : prev.map((l) => (l.product_id === productId ? { ...l, quantity } : l)),
      ),
    remove: (productId) => setLines((prev) => prev.filter((l) => l.product_id !== productId)),
    clear: () => setLines([]),
    total: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
  }), [lines, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
