import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

// The web app manifest (served at /manifest.webmanifest): name and icons for
// "Add to Home Screen" and Android's install prompt.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: BRAND.colors.paper,
    theme_color: BRAND.colors.from,
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
