import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron, Space_Grotesk } from "next/font/google";
import { StoreProvider } from "@/store/StoreProvider";
import { ToastViewport } from "@/components/platform/ToastViewport";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const orbitron = Orbitron({ variable: "--font-orbitron", subsets: ["latin"], weight: ["700"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  // Resolves the file-based icon / opengraph-image URLs to absolute ones.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Ryugaware", template: "%s · Ryugaware" },
  description: "Build and manage your online store websites.",
  openGraph: { siteName: "Ryugaware", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${orbitron.variable} ${jetbrains.variable}`}>
      <body>
        <StoreProvider>
          {children}
          <ToastViewport />
        </StoreProvider>
      </body>
    </html>
  );
}
