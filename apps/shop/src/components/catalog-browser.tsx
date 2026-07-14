"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProductCard, EmptyState, SectionChip } from "@grocery/ui";
import { useCart } from "@/lib/cart/cart-context";
import { useSearch } from "@/lib/search-context";
import { ArrowUpDown, Check, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

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

type SortOption = "default" | "price_asc" | "price_desc" | "name_asc";
type PriceRange = "all" | "under_100" | "100_300" | "300_500" | "over_500";

const PRICE_RANGES: { value: PriceRange; label: string }[] = [
  { value: "all", label: "Any price" },
  { value: "under_100", label: "Under PKR 100" },
  { value: "100_300", label: "PKR 100 – 300" },
  { value: "300_500", label: "PKR 300 – 500" },
  { value: "over_500", label: "Over PKR 500" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A – Z" },
];

function matchesPriceRange(price: number, range: PriceRange) {
  if (range === "all") return true;
  if (range === "under_100") return price < 100;
  if (range === "100_300") return price >= 100 && price <= 300;
  if (range === "300_500") return price > 300 && price <= 500;
  if (range === "over_500") return price > 500;
  return true;
}

function FilterPanelContents({
  priceRange,
  setPriceRange,
  inStockOnly,
  setInStockOnly,
  sortBy,
  setSortBy,
}: {
  priceRange: PriceRange;
  setPriceRange: (v: PriceRange) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
}) {
  return (
    <>
      {/* Price range */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Price Range
        </p>
        <div className="flex flex-col gap-1">
          {PRICE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setPriceRange(r.value)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-(--color-muted)"
            >
              <span
                className={
                  priceRange === r.value
                    ? "font-medium text-(--color-primary)"
                    : "text-(--color-foreground)"
                }
              >
                {r.label}
              </span>
              {priceRange === r.value && <Check className="h-3.5 w-3.5 text-(--color-primary)" />}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Availability
        </p>
        <button
          role="switch"
          aria-checked={inStockOnly}
          aria-label="In stock only"
          onClick={() => setInStockOnly(!inStockOnly)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-(--color-muted)"
        >
          <span
            className={
              inStockOnly ? "font-medium text-(--color-primary)" : "text-(--color-foreground)"
            }
          >
            In stock only
          </span>
          <div
            className={`h-5 w-9 rounded-full transition-colors ${inStockOnly ? "bg-(--color-primary)" : "bg-(--color-muted)"}`}
          >
            <div
              className={`mt-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${inStockOnly ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
          </div>
        </button>
      </div>

      {/* Sort */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          <span className="flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" /> Sort By
          </span>
        </p>
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-(--color-muted)"
            >
              <span
                className={
                  sortBy === s.value
                    ? "font-medium text-(--color-primary)"
                    : "text-(--color-foreground)"
                }
              >
                {s.label}
              </span>
              {sortBy === s.value && <Check className="h-3.5 w-3.5 text-(--color-primary)" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function CatalogBrowser({
  items,
  categories,
}: {
  items: CatalogItem[];
  categories: Category[];
}) {
  const { add, setQuantity, lines, setIsOpen } = useCart();
  const { query, setQuery } = useSearch();
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const panelRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (priceRange !== "all" ? 1 : 0) + (inStockOnly ? 1 : 0) + (sortBy !== "default" ? 1 : 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  function clearFilters() {
    setPriceRange("all");
    setInStockOnly(false);
    setSortBy("default");
  }

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      const matchesCategory = !activeCategory || item.categoryId === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(query.toLowerCase());
      const matchesPrice = matchesPriceRange(item.price, priceRange);
      const matchesStock = !inStockOnly || !item.outOfStock;
      return matchesCategory && matchesSearch && matchesPrice && matchesStock;
    });

    if (sortBy === "price_asc") result = [...result].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") result = [...result].sort((a, b) => b.price - a.price);
    else if (sortBy === "name_asc")
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [items, query, activeCategory, priceRange, inStockOnly, sortBy]);

  function getQty(productId: string) {
    return lines.find((l) => l.product_id === productId)?.quantity ?? 0;
  }

  return (
    <div>
      {/* Hero banner — full width, image on right fades into gradient */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-r from-primary to-primary/80 px-6 py-10">
        <div className="relative z-10 max-w-xs">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
            Fresh &amp; Local
          </p>
          <h1 className="mt-1 text-2xl font-bold text-(--color-primary-foreground) sm:text-3xl">
            Groceries delivered
            <br />
            in 30 minutes
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Over {items.length} products available right now
          </p>
        </div>
        {/* Right-side image with gradient fade */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
          style={{
            backgroundImage: "url('/banner.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 40%)",
            maskImage: "linear-gradient(to right, transparent, black 40%)",
          }}
        />
      </div>

      {/* Constrained content */}
      <div className="max-w-5xl mx-auto">
        {/* Search + filter row — always on top on mobile, inline on sm+ */}
        <div className="mb-2 flex items-center gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--color-muted-foreground)" />
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-full border border-(--color-border) bg-(--color-background) pl-8 pr-3 text-sm placeholder:text-(--color-muted-foreground) focus:border-(--color-ring) focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
          <div className="shrink-0">
            <button
              onClick={() => setFilterOpen(true)}
              className="relative flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-background) px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-(--color-muted) active:scale-95"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--color-primary) text-[10px] font-bold text-(--color-primary-foreground)">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile full-screen filter sheet */}
          {mounted &&
            createPortal(
              <div
                className={`fixed inset-0 z-50 flex flex-col bg-(--color-background) transition-transform duration-300 ease-in-out sm:hidden ${
                  filterOpen ? "translate-y-0" : "translate-y-full"
                }`}
              >
                <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-4">
                  <span className="text-base font-semibold text-(--color-foreground)">Filters</span>
                  <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-(--color-primary) hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-(--color-muted)"
                    >
                      <X className="h-5 w-5 text-(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <FilterPanelContents
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    inStockOnly={inStockOnly}
                    setInStockOnly={setInStockOnly}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                  />
                </div>
              </div>,
              document.body,
            )}
        </div>

        {/* Category chips + filter row — sm and up */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto pb-1 scrollbar-none">
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

          {/* Inline search — hidden on mobile (shown in row above) */}
          <div className="relative shrink-0 hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--color-muted-foreground)" />
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-32 rounded-full border border-(--color-border) bg-(--color-background) pl-8 pr-3 text-sm placeholder:text-(--color-muted-foreground) transition-all focus:w-48 focus:border-(--color-ring) focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Filter button — hidden on mobile */}
          <div className="relative shrink-0 hidden sm:block" ref={panelRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="relative flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-background) px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-(--color-muted) active:scale-95"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--color-primary) text-[10px] font-bold text-(--color-primary-foreground)">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter panel */}
            <div
              className={`absolute right-0 top-10 z-50 w-72 rounded-2xl border border-(--color-border) bg-(--color-background) p-4 shadow-xl origin-top-right transition-all duration-200 ease-out ${
                filterOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-(--color-foreground)">Filters</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-(--color-primary) hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setFilterOpen(false)}
                    className="rounded-full p-0.5 hover:bg-(--color-muted)"
                  >
                    <X className="h-4 w-4 text-(--color-muted-foreground)" />
                  </button>
                </div>
              </div>

              <FilterPanelContents
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </div>
          </div>
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
    </div>
  );
}
