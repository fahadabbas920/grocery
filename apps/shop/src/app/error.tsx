"use client";

import { Button, EmptyState } from "@grocery/ui";
import { TriangleAlert } from "lucide-react";

/** Segment error boundary — covers all shop routes. */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-12">
      <EmptyState
        icon={<TriangleAlert className="h-6 w-6" />}
        title="Something went wrong"
        description="We couldn't load this page. Please check your connection and try again."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
