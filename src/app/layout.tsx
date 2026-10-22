import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Vela — Suivi patient",
  description: "Gestion de patientèle et suivi de consultation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Posé par proxy.ts sur chaque requête : requis pour que ce script
  // inline passe la CSP stricte (script-src limité au nonce, sans 'unsafe-inline').
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="fr"
      className={fontVariables}
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
