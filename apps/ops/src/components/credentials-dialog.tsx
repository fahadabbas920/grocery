"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@grocery/ui";
import { CredentialFields, type CredentialField } from "@/components/credential-fields";

/** Shows freshly-generated login credentials once, with copy buttons — never retrievable again. */
export function CredentialsDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  doneLabel = "Done",
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: CredentialField[];
  doneLabel?: string;
  onDone?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <CredentialFields fields={fields} />

        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onDone?.();
            }}
          >
            {doneLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
