import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/card";

const legalLinks = [
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
];

// Mise en page commune aux écrans hors session (connexion, inscription,
// mot de passe oublié) : logo au-dessus d'une carte resserrée, liens légaux
// en dessous.
export function AuthLayout({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <main className="flex w-full max-w-[420px] flex-col items-center gap-8">
        <Logo size={64} />

        <Card className="w-full gap-0 py-0 shadow-sm">
          <CardContent className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {children}
          </CardContent>

          {footer && (
            <div className="border-t px-6 py-4 text-center text-sm text-muted-foreground sm:px-8">
              {footer}
            </div>
          )}
        </Card>

        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline-offset-4 hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
