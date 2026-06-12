import type { MetadataRoute } from "next";

// PWA manifest — makes the shop installable from the browser.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grocery",
    short_name: "Grocery",
    description: "Order groceries for delivery",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
