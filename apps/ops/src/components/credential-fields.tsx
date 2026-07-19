"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@grocery/ui";

export interface CredentialField {
  label: string;
  value: string;
}

/** Read-only credential rows with per-field + copy-all buttons. No dialog chrome — embed anywhere. */
export function CredentialFields({ fields }: { fields: CredentialField[] }) {
  const [copiedAll, setCopiedAll] = useState(false);

  function copyField(value: string) {
    void navigator.clipboard.writeText(value);
  }

  function copyAll() {
    navigator.clipboard
      .writeText(fields.map((f) => `${f.label}: ${f.value}`).join("\n"))
      .then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <div
          key={f.label}
          className="flex items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-muted/30 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-(--color-muted-foreground)">
              {f.label}
            </p>
            <p className="truncate font-mono text-sm">{f.value}</p>
          </div>
          <button
            type="button"
            onClick={() => copyField(f.value)}
            title={`Copy ${f.label}`}
            aria-label={`Copy ${f.label}`}
            className="shrink-0 rounded-md p-1.5 text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={copyAll} className="mt-1">
        {copiedAll ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
        {copiedAll ? "Copied" : "Copy all"}
      </Button>
    </div>
  );
}
