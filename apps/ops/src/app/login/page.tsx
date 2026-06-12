import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-6 bg-linear-to-br from-[oklch(0.62_0.19_145)] to-[oklch(0.48_0.19_145)] p-12 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black text-white">
          G
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Grocery Ops</h1>
          <p className="mt-2 text-white/70 text-sm">
            Manage orders, catalog and riders<br />all from one place.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 text-center text-xs text-white/60">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-2xl font-bold text-white">∞</p>
            <p>Orders managed</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-2xl font-bold text-white">100%</p>
            <p>Reliability</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-(--color-background) p-8">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-sm font-bold text-white">
              G
            </div>
            <span className="text-lg font-semibold">Grocery Ops</span>
          </div>

          <h2 className="text-2xl font-bold text-(--color-foreground)">Welcome back</h2>
          <p className="mt-1 mb-6 text-sm text-(--color-muted-foreground)">
            Sign in with your staff account to continue.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
