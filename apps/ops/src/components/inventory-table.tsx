"use client";

import { useState } from "react";
import { Button, Input } from "@grocery/ui";
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface Row {
  product_id: string;
  name: string;
  quantity: number;
  is_out_of_stock: boolean;
}

export function InventoryTable({ rows }: { rows: Row[] }) {
  const [items, setItems] = useState<Row[]>(rows);
  const supabase = getBrowserSupabase();

  function update(id: string, patch: Partial<Row>) {
    setItems((prev) => prev.map((r) => (r.product_id === id ? { ...r, ...patch } : r)));
  }

  async function save(row: Row) {
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: row.quantity, is_out_of_stock: row.is_out_of_stock })
      .eq("product_id", row.product_id);
    if (error) toast.error("Failed to save");
    else toast.success(`${row.name} updated`);
  }

  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden bg-(--color-card)">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="w-36">Quantity</TableHead>
            <TableHead className="w-36">Out of stock</TableHead>
            <TableHead className="w-24 text-right">Save</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.product_id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  className="h-8 w-24"
                  value={row.quantity}
                  onChange={(e) => update(row.product_id, { quantity: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={row.is_out_of_stock}
                  onCheckedChange={(v) => update(row.product_id, { is_out_of_stock: v })}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => save(row)}>
                  Save
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
