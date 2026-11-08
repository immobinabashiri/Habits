import type { Metadata, Viewport } from "next";
import { Fraunces, Fredoka, Inter, Nunito, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeBackdrop } from "@/components/layout/theme-backdrop";
import { BRAND, siteUrl } from "@/lib/brand";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Each theme picks its fonts through --font-body and --font-display. Only the fonts
// the active theme uses are downloaded, so the extra ones are not preloaded.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], preload: false });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], preload: false });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], preload: false });

const fontVariables = [jakarta, inter, outfit, fraunces, nunito, fredoka].map((font) => font.variable).join(" ");

const site = siteUrl();

// Icons come from the file conventions in this folder (favicon.ico, icon.svg,
// apple-icon.png) and the web manifest from manifest.ts.
export const metadata: Metadata = {
  metadataBase: site ? new URL(site) : undefined,
  applicationName: BRAND.name,
  title: {
    default: `${BRAND.name} · ${BRAND.shortDescription}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: ["habit tracker", "habits", "streaks", "daily planner", "calendar", "productivity", "self-improvement"],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} · ${BRAND.shortDescription}`,
    description: BRAND.description,
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: `${BRAND.name}: ${BRAND.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} · ${BRAND.shortDescription}`,
    description: BRAND.description,
    images: ["/brand/og-image.png"],
  },
  appleWebApp: { title: BRAND.name },
};

// viewport-fit=cover lets the app paint under the notch; fixed headers and toasts
// pad themselves with env(safe-area-inset-*). The browser bar follows light or dark.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#16151c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the init script sets data-theme before React hydrates.
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeBackdrop />
        {children}
      </body>
    </html>
  );
}
