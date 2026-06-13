"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@grocery/ui";
import { ProductFormSheet } from "@/components/product-form-sheet";
import type { Category } from "@/components/product-form-sheet";

export function AddProductForm({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add product
      </Button>
      <ProductFormSheet categories={categories} open={open} onOpenChange={setOpen} />
    </>
  );
}
