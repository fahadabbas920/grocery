"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Button, Input } from "@grocery/ui";
import { uploadProductImage } from "@grocery/db";
import { createProduct, updateProduct } from "@grocery/db/queries";
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@grocery/ui/components/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface Category {
  id: string;
  name: string;
}

export interface ProductFormValues {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  imagePath: string | null;
  description: string | null;
  categoryId: string;
  outOfStock: boolean;
  quantity: number;
}

// ─── Image Upload Zone ──────────────────────────────────────────────────────────

function ImageUploadZone({
  preview,
  onChange,
  onClear,
}: {
  preview: string | null;
  onChange: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <label className="group flex h-44 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-(--color-border) bg-muted/40 transition hover:border-(--color-primary) hover:bg-muted/60">
        {preview ? (
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-(--color-muted-foreground) group-hover:text-(--color-primary)">
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Click to upload image</span>
            <span className="text-xs">PNG, JPG, WEBP up to 5MB</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(f);
          }}
        />
      </label>
      {preview && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Product Form Sheet ─────────────────────────────────────────────────────────

interface ProductFormSheetProps {
  categories: Category[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pass an existing product to switch to edit mode. Omit for add mode. */
  product?: ProductFormValues;
}

export function ProductFormSheet({
  categories,
  open,
  onOpenChange,
  product,
}: ProductFormSheetProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : "0");
  const [outOfStock, setOutOfStock] = useState(product?.outOfStock ?? false);
  const [preview, setPreview] = useState<string | null>(product?.imageUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
  function clearFile() {
    setFile(null);
    setPreview(product?.imageUrl ?? null);
  }

  function reset() {
    setName(product?.name ?? "");
    setPrice(product ? String(product.price) : "");
    setDescription(product?.description ?? "");
    setCategoryId(product?.categoryId ?? categories[0]?.id ?? "");
    setQuantity(product ? String(product.quantity) : "0");
    setOutOfStock(product?.outOfStock ?? false);
    setPreview(product?.imageUrl ?? null);
    setFile(null);
    setError(null);
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  async function onSubmit() {
    setSaving(true);
    setError(null);
    const supabase = getBrowserSupabase();
    try {
      let imagePath = product?.imagePath ?? null;
      if (file) imagePath = await uploadProductImage(supabase, file, file.name);

      const input = {
        name,
        description: description || undefined,
        category_id: categoryId,
        price: Number(price),
        image_path: imagePath,
      };
      const stock = { quantity: Number(quantity), is_out_of_stock: outOfStock };

      if (isEdit) {
        await updateProduct(supabase, product.id, input, stock);
        toast.success("Product updated");
      } else {
        await createProduct(supabase, input, stock);
        toast.success("Product added");
      }

      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!name.trim() && !!price && Number(price) >= 0 && !!categoryId;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
        else onOpenChange(true);
      }}
    >
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-(--color-border) px-6 py-5">
          <SheetTitle className="text-lg">{isEdit ? "Edit Product" : "Add New Product"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this product's details, price, and stock."
              : "Add a new product with its price and initial stock."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <ImageUploadZone preview={preview} onChange={handleFile} onClear={clearFile} />

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              Product details
            </p>
            <div className="grid gap-1.5">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Full Cream Milk 1L"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Short description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  Price (PKR) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              Stock
            </p>
            <div className="grid gap-1.5">
              <Label>{isEdit ? "Quantity" : "Initial quantity"}</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-(--color-border) bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-(--color-foreground)">
                  Mark as out of stock
                </p>
                <p className="text-xs text-(--color-muted-foreground)">
                  Hides the add-to-cart button in the shop
                </p>
              </div>
              <Switch checked={outOfStock} onCheckedChange={setOutOfStock} />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <SheetFooter className="border-t border-(--color-border) px-6 py-4">
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving || !canSave} className="flex-1">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
