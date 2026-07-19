import type { UserRole } from "@grocery/shared";
import { requireOpsProfile } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

const NAV: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/", label: "Dashboard", roles: ["admin", "stock_keeper"] },
  { href: "/orders", label: "Orders", roles: ["admin", "stock_keeper"] },
  { href: "/catalog", label: "Catalog", roles: ["admin", "stock_keeper"] },
  { href: "/store", label: "Store", roles: ["stock_keeper"] },
  { href: "/vendors", label: "Vendors", roles: ["admin"] },
  { href: "/dispatch", label: "Dispatch", roles: ["admin"] },
  { href: "/accounts", label: "Accounts", roles: ["admin"] },
  { href: "/settings", label: "Settings", roles: ["admin"] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireOpsProfile();
  const links = NAV.filter((item) => item.roles.includes(profile.role));

  // A stock_keeper only gets a store_id once an admin finishes step 2 of vendor
  // onboarding (see createShopForOwnerAction) — until then there's nothing for
  // them to manage here.
  if (profile.role === "stock_keeper" && !profile.store_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-background) p-6">
        <div className="max-w-sm rounded-2xl border border-(--color-border) bg-(--color-card) p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-(--color-foreground)">
            Setup not finished yet
          </p>
          <p className="mt-2 text-sm text-(--color-muted-foreground)">
            Your account is created, but no shop is linked to it yet. Ask the admin who invited you
            to finish adding your shop's details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-(--color-background) md:flex-row">
      <Sidebar links={links} profile={profile} />
      <MobileNav links={links} profile={profile} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
