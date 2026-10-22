import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/card";

// Les composants partagés sont compacts pour la densité de l'app ; les écrans
// vus seuls (connexion, onboarding…), souvent sur mobile, ont des champs plus
// confortables.
export const authFieldClassName = "h-9 px-3";

const legalLinks = [
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
];

interface AuthShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  // Pied de carte séparé par une bordure (ex. bascule connexion / inscription).
  footer?: React.ReactNode;
}

// Gabarit des écrans hors de l'app : logo hors de la carte, carte resserrée,
// titre court aligné à gauche, liens légaux en dessous.
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <main className="flex w-full max-w-[420px] flex-col items-center gap-8">
        <div className="flex">
          <Logo size={64} />
        </div>

        <Card className="w-full gap-0 py-0 shadow-sm">
          <CardContent className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
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

// Lien d'action dans un pied de carte : vin en clair, souligné en sombre pour
// rester repérable sur le fond carte.
export const authFooterLinkClassName =
  "rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/30 dark:text-foreground dark:underline";
