"use client";

import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ACCOUNT_DELETION_REASONS,
  ACCOUNT_DELETION_REASON_LABELS,
  type AccountDeletionReason,
} from "@/lib/accountDeletionReasons";

function pluralize(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

type DeleteAccountDialogProps = {
  patientsCount: number;
  consultationsCount: number;
};

export function DeleteAccountDialog({
  patientsCount,
  consultationsCount,
}: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState<AccountDeletionReason | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setPassword("");
    setReason("");
    setError(null);
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, reason }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Impossible de supprimer le compte.");
      setIsSubmitting(false);
      return;
    }

    await signOut({ callbackUrl: "/account-deleted", redirect: true });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="destructive" />}>
        Supprimer mon compte
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Supprimer mon compte</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. {pluralize(patientsCount, "patient")} et{" "}
              {pluralize(consultationsCount, "consultation")} seront définitivement supprimés,
              ainsi que votre profil et tous les documents associés.
            </DialogDescription>
          </DialogHeader>

          <a
            href="/api/account/export"
            download
            className="inline-flex w-fit items-center gap-2 text-sm text-accent-foreground underline underline-offset-2 hover:opacity-70"
          >
            <DownloadSimple size={16} />
            Télécharger mes données (.zip)
          </a>

          <div>
            <Label htmlFor="delete-account-reason" className="mb-1">
              Pourquoi supprimez-vous votre compte ?
            </Label>
            <Select
              items={Object.fromEntries(
                ACCOUNT_DELETION_REASONS.map((value) => [
                  value,
                  ACCOUNT_DELETION_REASON_LABELS[value],
                ])
              )}
              value={reason}
              onValueChange={(value) => {
                setReason((value as AccountDeletionReason) ?? "");
                setError(null);
              }}
            >
              <SelectTrigger id="delete-account-reason" aria-label="Motif de départ">
                <SelectValue placeholder="Sélectionnez un motif" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_DELETION_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ACCOUNT_DELETION_REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="delete-account-password" className="mb-1">
              Confirmez avec votre mot de passe
            </Label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || password.trim().length === 0 || reason === ""}
            >
              {isSubmitting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
