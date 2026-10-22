import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

// Partagées entre le layout racine et global-error.tsx, qui le remplace
// entièrement en cas d'erreur et doit recharger les polices lui-même.
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

export const fontVariables = cn(fraunces.variable, inter.variable, ibmPlexMono.variable);
