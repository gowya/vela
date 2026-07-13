"use client";

import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

// Les couleurs suivent nos tokens (--popover, --border...) qui basculent déjà
// eux-mêmes en clair/sombre via la classe `.dark` sur <html> — pas besoin de
// piloter le thème de Sonner ni de dépendre de next-themes (absent du projet).
function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group"
      icons={{
        success: <CheckCircleIcon size={16} weight="bold" className="text-primary" />,
        info: <InfoIcon size={16} weight="bold" className="text-muted-foreground" />,
        warning: <WarningIcon size={16} weight="bold" className="text-destructive" />,
        error: <WarningCircleIcon size={16} weight="bold" className="text-destructive" />,
        loading: <ArrowsClockwiseIcon size={16} className="animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          title: "font-heading text-xs font-medium",
          description: "text-xs/relaxed text-muted-foreground",
          actionButton:
            "!bg-transparent !text-primary !shadow-none hover:!bg-primary/10 !font-medium",
          cancelButton: "!bg-transparent !text-muted-foreground !shadow-none",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
