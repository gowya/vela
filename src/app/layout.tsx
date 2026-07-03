import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suivi patient",
  description: "Gestion de patientèle et suivi de consultation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
