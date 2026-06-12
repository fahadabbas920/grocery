import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-primary) text-2xl font-black text-white shadow-lg">
            G
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-(--color-foreground)">Welcome back</h1>
            <p className="mt-0.5 text-sm text-(--color-muted-foreground)">
              Sign in to order fresh groceries
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-(--color-border) bg-(--color-background) p-6 shadow-sm">
          <Suspense>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
