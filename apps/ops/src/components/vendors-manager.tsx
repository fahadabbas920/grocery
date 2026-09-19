"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, EmptyState, FormDrawer } from "@grocery/ui";
import type { StoreStatus } from "@grocery/shared";
import { Ban, Check, Pencil, Plus, Store, UserRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  createVendorUserAction,
  createShopForOwnerAction,
  updateStoreAction,
  updateVendorOwnerAction,
  getVendorOwnerAction,
  setStoreStatusAction,
} from "@/app/(dashboard)/vendors/actions";
import { CredentialFields } from "@/components/credential-fields";

interface Vendor {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  address: string | null;
  status: StoreStatus;
}

/** A vendor owner with a login but no shop yet — stuck between wizard step 1 and 2. */
interface PendingOwner {
  id: string;
  full_name: string;
  phone: string | null;
}

const STATUS_STYLE: Record<StoreStatus, string> = {
  active: "bg-success/15 text-success",
  onboarding: "bg-warning/15 text-warning",
  invited: "bg-(--color-muted) text-(--color-muted-foreground)",
  suspended: "bg-destructive/15 text-destructive",
};

type WizardStep = "owner" | "creds" | "shop";

export function VendorsManager({
  initialStores,
  pendingOwners,
}: {
  initialStores: Vendor[];
  pendingOwners: PendingOwner[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  // --- edit an existing store, and its linked owner ---
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const [ownerLoading, setOwnerLoading] = useState(false);
  const [editHasOwner, setEditHasOwner] = useState(false);
  const [editOwnerId, setEditOwnerId] = useState<string | null>(null);
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerIdentifier, setEditOwnerIdentifier] = useState("");

  async function openEdit(v: Vendor) {
    setEditing(v);
    setName(v.name);
    setPhone(v.phone ?? "");
    setAddress(v.address ?? "");
    setEditHasOwner(false);
    setEditOwnerId(null);
    setEditOwnerName("");
    setEditOwnerIdentifier("");
    setEditOpen(true);

    setOwnerLoading(true);
    try {
      const result = await getVendorOwnerAction(v.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not load owner info");
        return;
      }
      setEditHasOwner(result.hasOwner ?? false);
      if (result.hasOwner) {
        setEditOwnerId(result.userId ?? null);
        setEditOwnerName(result.full_name ?? "");
        setEditOwnerIdentifier(result.identifier ?? "");
      }
    } finally {
      setOwnerLoading(false);
    }
  }

  async function saveEdit() {
    if (!editing || !name.trim()) return;
    if (editHasOwner && (!editOwnerName.trim() || !editOwnerIdentifier.trim())) {
      toast.error("Owner name and email/phone are required");
      return;
    }
    setSaving(true);
    try {
      const storeResult = await updateStoreAction(editing.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (!storeResult.ok) {
        toast.error(storeResult.error ?? "Could not save shop");
        return;
      }

      if (editHasOwner && editOwnerId) {
        const ownerResult = await updateVendorOwnerAction({
          ownerId: editOwnerId,
          full_name: editOwnerName,
          identifier: editOwnerIdentifier,
        });
        if (!ownerResult.ok) {
          toast.error(ownerResult.error ?? "Shop saved, but owner update failed");
          return;
        }
      }

      toast.success("Vendor updated");
      setEditOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setSaving(false);
    }
  }

  // --- new vendor wizard: one drawer, three internal steps ---
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("owner");
  const [busy, setBusy] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [ownerIdentifier, setOwnerIdentifier] = useState("");
  const [pendingOwner, setPendingOwner] = useState<{ id: string; full_name: string } | null>(null);
  const [creds, setCreds] = useState<{
    full_name: string;
    identifier: string;
    password: string;
  } | null>(null);

  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  function openNewVendor() {
    setStep("owner");
    setOwnerName("");
    setOwnerIdentifier("");
    setPendingOwner(null);
    setCreds(null);
    setShopName("");
    setShopPhone("");
    setShopAddress("");
    setWizardOpen(true);
  }

  /** A vendor login already exists (wizard step 1 done elsewhere/earlier) — resume at step 2. */
  function resumeShopDetails(owner: PendingOwner) {
    setPendingOwner({ id: owner.id, full_name: owner.full_name });
    setCreds(null);
    setShopName("");
    setShopPhone(owner.phone ?? "");
    setShopAddress("");
    setStep("shop");
    setWizardOpen(true);
  }

  async function createOwner() {
    if (!ownerName.trim() || !ownerIdentifier.trim()) return;
    setBusy(true);
    try {
      const result = await createVendorUserAction({
        identifier: ownerIdentifier,
        full_name: ownerName,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not create vendor account");
        return;
      }
      setPendingOwner({ id: result.userId!, full_name: result.full_name! });
      setCreds({
        full_name: result.full_name!,
        identifier: result.identifier!,
        password: result.tempPassword!,
      });
      setStep("creds");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setBusy(false);
    }
  }

  async function createShop() {
    if (!pendingOwner || !shopName.trim()) return;
    setBusy(true);
    try {
      const result = await createShopForOwnerAction({
        ownerId: pendingOwner.id,
        store: {
          name: shopName.trim(),
          phone: shopPhone.trim() || undefined,
          address: shopAddress.trim() || undefined,
        },
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not create shop");
        return;
      }
      toast.success(`Shop created — ${pendingOwner.full_name} can now sign in`);
      setWizardOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setBusy(false);
    }
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

  const wizardTitle =
    step === "owner"
      ? "New vendor — step 1 of 2"
      : step === "creds"
        ? "Vendor account created"
        : "New vendor — step 2 of 2";
  const wizardDescription =
    step === "owner"
      ? "Create the owner's login first. You'll add their shop details next."
      : step === "creds"
        ? "Share these credentials with the vendor — the password is only shown once. They still can't sign in until you add their shop details next."
        : pendingOwner
          ? `Add ${pendingOwner.full_name}'s shop details. They can't sign in until this is saved.`
          : "Add the shop details.";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNewVendor}>
          <Plus className="mr-2 h-4 w-4" />
          New vendor
        </Button>
      </div>

      {pendingOwners.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendingOwners.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-card) px-4 py-3 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-(--color-foreground)">
                    {o.full_name}
                  </span>
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    Pending
                  </span>
                </div>
                <p className="truncate text-xs text-(--color-muted-foreground)">
                  {o.phone ?? "No phone on file"} · no shop yet
                </p>
              </div>

              <Button size="sm" onClick={() => resumeShopDetails(o)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add shop details
              </Button>
            </div>
          ))}
        </div>
      )}

      {initialStores.length === 0 && pendingOwners.length === 0 ? (
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

      {/* Edit an existing store, and its linked owner */}
      <FormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit vendor"
        description="Update the shop's profile and its owner's account."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving || ownerLoading || !name.trim()}
              className="flex-1"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Owner account
        </p>
        {ownerLoading ? (
          <p className="text-xs text-(--color-muted-foreground)">Loading owner info…</p>
        ) : editHasOwner ? (
          <>
            <div className="grid gap-1.5">
              <Label>Owner name</Label>
              <Input
                value={editOwnerName}
                onChange={(e) => setEditOwnerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Owner email or phone</Label>
              <Input
                value={editOwnerIdentifier}
                onChange={(e) => setEditOwnerIdentifier(e.target.value)}
                placeholder="owner@example.com or 03xx-xxxxxxx"
              />
              <p className="text-xs text-(--color-muted-foreground)">
                Changing this changes the owner's login. Their password is unaffected.
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-(--color-muted-foreground)">
            No owner is linked to this shop yet.
          </p>
        )}

        <div className="h-px bg-(--color-border)" />

        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Shop details
        </p>
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
      </FormDrawer>

      {/* New vendor — single drawer, three internal steps */}
      <FormDrawer
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        title={wizardTitle}
        description={wizardDescription}
        footer={
          step === "owner" ? (
            <>
              <Button variant="outline" onClick={() => setWizardOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={createOwner}
                disabled={busy || !ownerName.trim() || !ownerIdentifier.trim()}
                className="flex-1"
              >
                {busy ? "Creating…" : "Create login"}
              </Button>
            </>
          ) : step === "creds" ? (
            <Button onClick={() => setStep("shop")} className="flex-1">
              Continue to shop details
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setWizardOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={createShop} disabled={busy || !shopName.trim()} className="flex-1">
                {busy ? "Creating…" : "Create shop"}
              </Button>
            </>
          )
        }
      >
        {step === "owner" && (
          <>
            <div className="grid gap-1.5">
              <Label>
                Owner name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Owner email or phone <span className="text-destructive">*</span>
              </Label>
              <Input
                value={ownerIdentifier}
                onChange={(e) => setOwnerIdentifier(e.target.value)}
                placeholder="owner@example.com or 03xx-xxxxxxx"
              />
              <p className="text-xs text-(--color-muted-foreground)">
                A temporary password is generated automatically and shown once.
              </p>
            </div>
          </>
        )}

        {step === "creds" && creds && (
          <CredentialFields
            fields={[
              { label: "Name", value: creds.full_name },
              { label: "Login", value: creds.identifier },
              { label: "Password", value: creds.password },
            ]}
          />
        )}

        {step === "shop" && (
          <>
            <div className="grid gap-1.5">
              <Label>
                Shop name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Fresh Mart"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="03xx-xxxxxxx"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Address</Label>
              <Input
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="Shop address"
              />
            </div>
          </>
        )}
      </FormDrawer>
    </div>
  );
}
