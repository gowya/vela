"use client";

import { useState, type FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setConfirmed(false);
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

    setMessage("");
    setConfirmed(true);
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
            setConfirmed(false);
          }}
          placeholder="Ce qui fonctionne, ce qui manque, ce qui vous ferait gagner du temps."
          className="min-h-32"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {confirmed && <p className="text-sm text-muted-foreground">Merci, votre retour a été transmis.</p>}

      <Button type="submit" disabled={isSubmitting || message.trim().length === 0} className="self-start">
        {isSubmitting ? "Envoi..." : "Envoyer"}
      </Button>
    </form>
  );
}
