"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@grocery/ui";
import { updateStore } from "@grocery/db/queries";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Initial {
  name: string;
  phone: string | null;
  address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_radius_m: number | null;
  is_open: boolean;
  delivery_fee: number;
}

const STATUS_NOTE: Record<string, string> = {
  invited: "Your store is being set up — an admin will activate it.",
  onboarding: "Awaiting admin approval before your store goes live.",
  active: "Your store is live.",
  suspended: "Your store is suspended. Contact the platform admin.",
};

export function StoreSettingsForm({
  storeId,
  status,
  initial,
}: {
  storeId: string;
  status: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [radius, setRadius] = useState(
    initial.delivery_radius_m ? String(initial.delivery_radius_m) : "",
  );
  const [deliveryFee, setDeliveryFee] = useState(String(initial.delivery_fee ?? 0));
  const [isOpen, setIsOpen] = useState(initial.is_open);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateStore(getBrowserSupabase(), storeId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        delivery_lat: initial.delivery_lat ?? undefined,
        delivery_lng: initial.delivery_lng ?? undefined,
        delivery_radius_m: radius ? Number(radius) : undefined,
        is_open: isOpen,
        delivery_fee: deliveryFee ? Number(deliveryFee) : 0,
      });
      toast.success("Store updated");
      router.refresh();
    } catch {
      toast.error("Could not update store");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-(--color-border) bg-muted/30 px-4 py-3 text-sm text-(--color-muted-foreground)">
        {STATUS_NOTE[status] ?? `Status: ${status}`}
      </div>

      <div className="grid gap-1.5">
        <Label>
          Shop name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fresh Mart"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Phone</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03xx-xxxxxxx"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Address</Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Shop address"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Delivery radius (m)</Label>
          <Input
            type="number"
            min="0"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="e.g. 3000"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Delivery fee (PKR)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-(--color-border) bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-(--color-foreground)">Accepting orders</p>
          <p className="text-xs text-(--color-muted-foreground)">
            {isOpen ? "Your shop is open for orders." : "Closed — customers can't order from you."}
          </p>
        </div>
        <Switch checked={isOpen} onCheckedChange={setIsOpen} />
      </div>

      <Button onClick={save} disabled={saving || !name.trim()}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
