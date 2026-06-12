"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Input } from "@grocery/ui";
import { uploadProductImage } from "@grocery/db";
import { productInputSchema } from "@grocery/shared";
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  name: string;
}

export function AddProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function onSubmit() {
    setSaving(true);
    setError(null);
    const supabase = getBrowserSupabase();
    try {
      let imagePath: string | null = null;
      if (file) imagePath = await uploadProductImage(supabase, file, file.name);

      const input = productInputSchema.parse({
        name,
        description: description || undefined,
        category_id: categoryId,
        price: Number(price),
        image_path: imagePath,
      });

      const { error: insertError } = await supabase.from("products").insert(input);
      if (insertError) throw insertError;

      toast.success("Product added");
      setName(""); setPrice(""); setDescription(""); setFile(null); setPreview(null);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add product
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full max-w-120 flex-col">
        <SheetHeader>
          <SheetTitle>Add New Product</SheetTitle>
          <SheetDescription>Fill in the product details. Image is optional.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pname">Product name *</Label>
            <Input id="pname" placeholder="e.g. Full Cream Milk 1L" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pdesc">Description</Label>
            <Input id="pdesc" placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pprice">Price (PKR) *</Label>
            <Input id="pprice" type="number" step="0.01" min="0" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label>Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 && (
              <p className="text-xs text-(--color-muted-foreground)">No categories yet — seed the database first.</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pimage">Product image</Label>
            <Input id="pimage" type="file" accept="image/*" onChange={handleFileChange} />
            {preview && (
              <img src={preview} alt="Preview" className="mt-1 h-32 w-32 rounded-lg object-cover border border-(--color-border)" />
            )}
          </div>

          {error && <p className="text-sm text-(--color-destructive)">{error}</p>}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving || !name || !price || !categoryId}>
            {saving ? "Saving…" : "Save product"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
