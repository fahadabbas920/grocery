"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@grocery/ui";
import { ProductFormSheet } from "@/components/product-form-sheet";
import type { Category } from "@/components/product-form-sheet";

export function AddProductForm({
  categories,
  storeId,
}: {
  categories: Category[];
  storeId: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={!storeId}
        title={storeId ? undefined : "Select a store to add products (admins manage via a vendor)"}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add product
      </Button>
      <ProductFormSheet
        categories={categories}
        storeId={storeId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
