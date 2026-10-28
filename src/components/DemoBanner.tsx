import { DEMO_TTL_HOURS } from "@/lib/demo";

export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-accent px-4 py-2 text-center text-xs text-accent-foreground">
      <span>
        Espace de démonstration : les patients et les données sont fictifs, et l&apos;espace est
        effacé sous {DEMO_TTL_HOURS} h.
      </span>
    </div>
  );
}
