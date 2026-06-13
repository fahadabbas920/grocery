"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Edit2, Package, PackageX, Trash2 } from "lucide-react";
import { Button } from "@grocery/ui";
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProductFormSheet } from "@/components/product-form-sheet";
import type { Category } from "@/components/product-form-sheet";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  imagePath: string | null;
  description: string | null;
  categoryId: string;
  categoryName: string;
  outOfStock: boolean;
  quantity: number;
}

// ─── Delete Dialog ─────────────────────────────────────────────────────────────

function DeleteDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onConfirm() {
    setDeleting(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    setDeleting(false);
    if (error) { toast.error("Failed to delete product"); return; }
    toast.success(`"${product.name}" deleted`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete product?</DialogTitle>
          <DialogDescription>
            This will permanently remove <strong>{product.name}</strong> from the catalog. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductAdminCard({ product, categories }: { product: Product; categories: Category[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-card) shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full overflow-hidden bg-(--color-muted)">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}

          {product.outOfStock && (
            <div className="absolute left-0 right-0 top-0 bg-red-500/90 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
              Out of stock
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-800 shadow-lg transition hover:bg-(--color-primary) hover:text-white"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-800 shadow-lg transition hover:bg-red-500 hover:text-white"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-(--color-foreground)">
            {product.name}
          </p>
          <span className="w-fit rounded-full bg-(--color-muted) px-2 py-0.5 text-[10px] font-medium text-(--color-muted-foreground)">
            {product.categoryName}
          </span>
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-base font-bold text-(--color-primary)">
              PKR {product.price.toLocaleString()}
            </span>
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${product.outOfStock ? "text-red-500" : "text-green-600"}`}>
              {product.outOfStock
                ? <><PackageX className="h-3 w-3" /> Out</>
                : <><Package className="h-3 w-3" /> {product.quantity > 0 ? `×${product.quantity}` : "In stock"}</>}
            </span>
          </div>
        </div>
      </div>

      <ProductFormSheet
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
      />
      <DeleteDialog product={product} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

// ─── Catalog Grid ──────────────────────────────────────────────────────────────

export function CatalogGrid({ products, categories }: { products: Product[]; categories: Category[] }) {
  const outOfStockCount = products.filter((p) => p.outOfStock).length;

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-0.5 rounded-2xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm">
          <span className="text-xs font-medium text-(--color-muted-foreground)">Total Products</span>
          <span className="text-2xl font-bold text-(--color-foreground)">{products.length}</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-2xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm">
          <span className="text-xs font-medium text-(--color-muted-foreground)">Categories</span>
          <span className="text-2xl font-bold text-(--color-foreground)">{categories.length}</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-2xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm">
          <span className="text-xs font-medium text-(--color-muted-foreground)">Out of Stock</span>
          <span className={`text-2xl font-bold ${outOfStockCount > 0 ? "text-red-500" : "text-green-600"}`}>
            {outOfStockCount}
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-(--color-muted-foreground)">No products yet. Add one using the button above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductAdminCard key={p.id} product={p} categories={categories} />
          ))}
        </div>
      )}
    </div>
  );
}
