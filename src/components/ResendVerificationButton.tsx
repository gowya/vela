"use client";

import { useState } from "react";

export function ResendVerificationButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleClick() {
    setStatus("sending");
    await fetch("/api/account/resend-verification", { method: "POST" });
    setStatus("sent");
  }

  if (status === "sent") {
    return <span className="text-muted-foreground">Email renvoyé.</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "sending"}
      className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      {status === "sending" ? "Envoi..." : "Renvoyer l'email"}
    </button>
  );
}
