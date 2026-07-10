"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ResendVerificationButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleClick() {
    setStatus("sending");
    await fetch("/api/account/resend-verification", { method: "POST" });
    setStatus("sent");
  }

  if (status === "sent") {
    return <span className={className}>Email renvoyé.</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "sending"}
      className={cn("underline underline-offset-2 hover:opacity-70", className)}
    >
      {status === "sending" ? "Envoi..." : "Renvoyer l'email"}
    </button>
  );
}
