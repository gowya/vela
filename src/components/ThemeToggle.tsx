"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Lecture après montage de la classe posée par le script anti-flash de
    // layout.tsx : le serveur ignore la préférence stockée côté client, donc
    // ce n'est pas un state dérivé de props mais une vraie synchronisation
    // avec le DOM (nécessaire pour éviter un mismatch d'hydratation).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-pressed={isDark}
    >
      <span className="relative flex size-3.5 items-center justify-center">
        <SunIcon
          size={14}
          className={cn(
            "absolute transition-all duration-300 ease-out",
            isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <MoonIcon
          size={14}
          className={cn(
            "absolute transition-all duration-300 ease-out",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          )}
        />
      </span>
    </Button>
  );
}
