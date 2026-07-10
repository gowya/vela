import { ResendVerificationButton } from "@/components/ResendVerificationButton";

export function EmailVerificationBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-accent px-4 py-2 text-center text-xs text-accent-foreground">
      <span>Adresse email non confirmée.</span>
      <ResendVerificationButton className="text-accent-foreground" />
    </div>
  );
}
