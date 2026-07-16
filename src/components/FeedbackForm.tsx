"use client";

import { useState, type FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ConfirmedFeedback {
  message: string;
  sentAt: Date;
}

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedFeedback, setConfirmedFeedback] = useState<ConfirmedFeedback | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setConfirmedFeedback(null);
    setIsSubmitting(true);

    const response = await fetch("/api/account/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "Impossible d'envoyer le message.");
      return;
    }

    setConfirmedFeedback({ message, sentAt: new Date() });
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="feedback-message" className="mb-1">
          Votre retour
        </Label>
        <Textarea
          id="feedback-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setConfirmedFeedback(null);
          }}
          placeholder="Ce qui fonctionne, ce qui manque, ce qui vous ferait gagner du temps."
          className="min-h-32"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {confirmedFeedback && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">
            Retour transmis le {confirmedFeedback.sentAt.toLocaleDateString("fr-FR")} à{" "}
            {confirmedFeedback.sentAt.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-1 text-muted-foreground">« {confirmedFeedback.message} »</p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || message.trim().length === 0} className="self-start">
        {isSubmitting ? "Envoi..." : "Envoyer"}
      </Button>
    </form>
  );
}
