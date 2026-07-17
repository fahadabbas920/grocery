"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, EmptyState, FormDrawer } from "@grocery/ui";
import type { StoreStatus } from "@grocery/shared";
import { Ban, Check, Pencil, Plus, Store } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  createVendorAction,
  updateStoreAction,
  setStoreStatusAction,
} from "@/app/(dashboard)/vendors/actions";

interface Vendor {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  address: string | null;
  status: StoreStatus;
}

const STATUS_STYLE: Record<StoreStatus, string> = {
  active: "bg-success/15 text-success",
  onboarding: "bg-warning/15 text-warning",
  invited: "bg-(--color-muted) text-(--color-muted-foreground)",
  suspended: "bg-destructive/15 text-destructive",
};

export function VendorsManager({ initialStores }: { initialStores: Vendor[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setPhone("");
    setAddress("");
    setOwnerEmail("");
    setOwnerName("");
    setOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setName(v.name);
    setPhone(v.phone ?? "");
    setAddress(v.address ?? "");
    setOwnerEmail("");
    setOwnerName("");
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const store = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    };
    const result = editing
      ? await updateStoreAction(editing.id, store)
      : await createVendorAction({
          store,
          ownerEmail: ownerEmail.trim() || undefined,
          ownerName: ownerName.trim() || undefined,
        });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error ?? "Could not save vendor");
      return;
    }
    if (result.tempPassword) {
      toast.success(`Owner created. Temp password: ${result.tempPassword}`, { duration: 30000 });
    } else {
      toast.success(editing ? "Vendor updated" : "Vendor created");
    }
    setOpen(false);
    router.refresh();
  }

  async function changeStatus(v: Vendor, status: StoreStatus) {
    setBusyId(v.id);
    const result = await setStoreStatusAction(v.id, status);
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Could not update status");
      return;
    }
    toast.success(`${v.name} → ${status}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New vendor
        </Button>
      </div>

      {initialStores.length === 0 ? (
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title="No vendors yet"
          description="Onboard your first shop with the New vendor button."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {initialStores.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-card) px-4 py-3 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-(--color-primary)">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-(--color-foreground)">{v.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[v.status]}`}
                  >
                    {v.status}
                  </span>
                </div>
                <p className="truncate text-xs text-(--color-muted-foreground)">
                  {[v.phone, v.address].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {v.status === "active" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === v.id}
                    onClick={() => changeStatus(v, "suspended")}
                  >
                    <Ban className="mr-1 h-3.5 w-3.5" />
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyId === v.id}
                    onClick={() => changeStatus(v, "active")}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Activate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit vendor" : "New vendor"}
        description={
          editing ? "Update this shop's profile." : "Create a shop and optionally invite its owner."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()} className="flex-1">
              {saving ? "Saving…" : editing ? "Save changes" : "Create vendor"}
            </Button>
          </>
        }
      >
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

        {!editing && (
          <div className="mt-2 space-y-4 rounded-xl border border-(--color-border) bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              Owner account (optional)
            </p>
            <div className="grid gap-1.5">
              <Label>Owner name</Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Owner email</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
              />
              <p className="text-xs text-(--color-muted-foreground)">
                Creates a stock-keeper login for this shop. A temporary password is shown once.
              </p>
            </div>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
