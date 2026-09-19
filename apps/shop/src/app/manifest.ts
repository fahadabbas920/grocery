import type { MetadataRoute } from "next";
import { BRAND_GREEN_HEX } from "@grocery/shared";

// PWA manifest — makes the shop installable from the browser.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BasketBee",
    short_name: "BasketBee",
    description: "Order fresh groceries for delivery, from BasketBee",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_GREEN_HEX,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
