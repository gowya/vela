import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Vela — Suivi patient",
  description: "Gestion de patientèle et suivi de consultation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Posé par middleware.ts sur chaque requête : requis pour que ce script
  // inline passe la CSP stricte (script-src limité au nonce, sans 'unsafe-inline').
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="fr"
      className={cn(fraunces.variable, inter.variable, ibmPlexMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try {
              var theme = localStorage.getItem("theme");
              if (theme === "dark") {
                document.documentElement.classList.add("dark");
              }
            } catch (e) {}`,
          }}
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
