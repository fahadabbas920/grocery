import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart-context";
import { SearchProvider } from "@/lib/search-context";
import { ShopHeader } from "@/components/shop-header";
import { CartDrawer } from "@/components/cart-drawer";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Grocery",
  description: "Order groceries for delivery",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CartProvider>
          <SearchProvider>
            <ShopHeader />
            <CartDrawer />
            <main className="p-4">{children}</main>
            <Toaster richColors position="top-right" />
          </SearchProvider>
        </CartProvider>
      </body>
    </html>
  );
}
