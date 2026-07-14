import { Skeleton } from "@grocery/ui";

/** Catalog loading placeholder shown while the home page fetches. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl py-6">
      <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
