import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { BRAND_GREEN_HEX } from "@grocery/shared";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart-context";
import { SearchProvider } from "@/lib/search-context";
import { ShopHeader } from "@/components/shop-header";
import { CartDrawer } from "@/components/cart-drawer";
import { Toaster } from "@grocery/ui";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "BasketBee — Your Everyday Grocery",
  description: "Order fresh groceries for delivery, from BasketBee",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: BRAND_GREEN_HEX,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
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
