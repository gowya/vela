"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function BetaNoticeDialog({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [isSaving, setIsSaving] = useState(false);

  async function handleDismiss() {
    setIsSaving(true);
    try {
      await fetch("/api/account/beta-notice", { method: "PATCH" });
    } finally {
      setIsSaving(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleDismiss()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Vela est en version bêta</DialogTitle>
          <DialogDescription>
            L&apos;application est gratuite pendant cette phase et continue d&apos;évoluer. Vos
            retours nous aident à l&apos;ajuster au plus près de votre pratique. Vous pouvez les
            partager depuis l&apos;onglet Feedback de votre fiche compte.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDismiss} disabled={isSaving}>
            Compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
