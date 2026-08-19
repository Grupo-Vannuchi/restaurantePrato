import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name.split(" ")[0],
    description: `Almoço, buffet e churrasco no Centro de ${siteConfig.contact.address.city}`,
    start_url: "/",
    display: "standalone",
    // Dark-first: the install splash and the browser chrome should match the
    // theme the site actually ships with, not the secondary light palette.
    background_color: siteConfig.theme.dark.background,
    theme_color: siteConfig.theme.dark.brand,
    icons: [
      // No `/favicon.ico`: the previous brand's file was removed and the icon is
      // now generated from the palette by `src/app/icon.tsx`. Ship a real .ico
      // alongside the client's logo when it arrives.
      // The 512×512 icon route (src/app/icon.tsx) downscales for the install
      // prompt and home-screen launcher; the `maskable` copy lets Android crop
      // it cleanly. Same source, two declared purposes (the spec keeps them
      // separate, and Next's manifest type accepts only one purpose per entry).
      {
        src: "/icon",
        sizes: "192x192 512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "192x192 512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
