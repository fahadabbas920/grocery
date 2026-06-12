"use client";

import { useMemo, useState } from "react";
import { ProductCard, EmptyState, SectionChip } from "@grocery/ui";
import { useCart } from "@/lib/cart/cart-context";
import { useSearch } from "@/lib/search-context";
import { ShoppingBag } from "lucide-react";

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  imageUrl: string | null;
  outOfStock: boolean;
}

interface Category {
  id: string;
  name: string;
}

export function CatalogBrowser({
  items,
  categories,
}: {
  items: CatalogItem[];
  categories: Category[];
}) {
  const { add, setQuantity, lines, setIsOpen } = useCart();
  const { query } = useSearch();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = !activeCategory || item.categoryId === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, query, activeCategory]);

  function getQty(productId: string) {
    return lines.find((l) => l.product_id === productId)?.quantity ?? 0;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero banner */}
      {!query && !activeCategory && (
        <div className="mb-4 overflow-hidden rounded-2xl bg-linear-to-br from-green-600 to-emerald-400 px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-100">
            Fresh &amp; Local
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Groceries delivered<br />in 30 minutes
          </h1>
          <p className="mt-1 text-sm text-green-100">
            Over {items.length} products available right now
          </p>
        </div>
      )}

      {/* Category chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <SectionChip
          label="All"
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        />
        {categories.map((c) => (
          <SectionChip
            key={c.id}
            label={c.name}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
          />
        ))}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="No products found"
          description={query ? `No results for "${query}"` : "Nothing in this category yet."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const qty = getQty(item.id);
            return (
              <ProductCard
                key={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.imageUrl}
                outOfStock={item.outOfStock}
                quantity={qty}
                onAdd={() => {
                  add({ product_id: item.id, name: item.name, price: item.price });
                  setIsOpen(true);
                }}
                onIncrement={() => setQuantity(item.id, qty + 1)}
                onDecrement={() => setQuantity(item.id, qty - 1)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
