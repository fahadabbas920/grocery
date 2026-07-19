"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button, Input, FormDrawer } from "@grocery/ui";
import { Label } from "@/components/ui/label";
import { createRiderAction } from "@/app/(dashboard)/vendors/actions";
import { CredentialsDialog } from "@/components/credentials-dialog";

export function InviteRiderButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [creds, setCreds] = useState<{
    full_name: string;
    identifier: string;
    password: string;
  } | null>(null);

  function reset() {
    setFullName("");
    setIdentifier("");
  }

  async function save() {
    if (!fullName.trim() || !identifier.trim()) return;
    setSaving(true);
    try {
      const result = await createRiderAction({ full_name: fullName, identifier });

      if (!result.ok) {
        toast.error(result.error ?? "Could not create rider");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      setCreds({
        full_name: result.full_name!,
        identifier: result.identifier!,
        password: result.tempPassword!,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Invite rider
      </Button>

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Invite rider"
        description="Riders can't self-register. Create their login here — a temporary password is shown once."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !fullName.trim() || !identifier.trim()}
              className="flex-1"
            >
              {saving ? "Creating…" : "Create rider"}
            </Button>
          </>
        }
      >
        <div className="grid gap-1.5">
          <Label>
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>
            Email or phone <span className="text-destructive">*</span>
          </Label>
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="rider@example.com or 03xx-xxxxxxx"
          />
        </div>
      </FormDrawer>

      <CredentialsDialog
        open={creds !== null}
        onOpenChange={(o) => !o && setCreds(null)}
        title="Rider created"
        description="Share these credentials with the rider — the password is only shown once."
        fields={
          creds
            ? [
                { label: "Name", value: creds.full_name },
                { label: "Login", value: creds.identifier },
                { label: "Password", value: creds.password },
              ]
            : []
        }
      />
    </>
  );
}
