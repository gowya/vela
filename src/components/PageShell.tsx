import { cn } from "@/lib/utils";

// Conteneur commun des pages de l'app : marges qui suivent la largeur
// d'écran (resserrées sur mobile) et rythme vertical par défaut.
export function PageShell({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-8 lg:px-16 lg:py-8",
        className
      )}
      {...props}
    />
  );
}
