import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  // Affiché à côté du titre (ex. compteur de patients).
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

// En-tête commun des pages de l'app : titre à gauche, actions à droite, qui
// passent à la ligne sur petit écran au lieu de déborder.
export function PageHeader({ title, meta, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        {meta}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
