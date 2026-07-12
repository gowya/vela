import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateAge, isBirthdaySoon } from "./patient-utils";

// Horloge figée au 15 juin 2024 (midi local, pour éviter tout décalage de jour
// selon le fuseau horaire de la machine qui exécute les tests).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("calculateAge", () => {
  it("renvoie null sans date de naissance", () => {
    expect(calculateAge(null)).toBeNull();
  });

  it("calcule l'âge quand l'anniversaire est déjà passé cette année", () => {
    expect(calculateAge("1990-01-01")).toBe(34);
  });

  it("calcule l'âge le jour même de l'anniversaire", () => {
    expect(calculateAge("1990-06-15")).toBe(34);
  });

  it("ne compte pas l'année en cours si l'anniversaire n'est pas encore passé", () => {
    expect(calculateAge("1990-06-16")).toBe(33);
  });

  it("gère un anniversaire le 29 février", () => {
    expect(calculateAge("2000-02-29")).toBe(24);
  });
});

describe("isBirthdaySoon", () => {
  it("renvoie false sans date de naissance", () => {
    expect(isBirthdaySoon(null)).toBe(false);
  });

  it("renvoie true le jour même de l'anniversaire", () => {
    expect(isBirthdaySoon("1990-06-15")).toBe(true);
  });

  it("renvoie true dans la fenêtre par défaut de 7 jours", () => {
    expect(isBirthdaySoon("1990-06-20")).toBe(true);
  });

  it("renvoie false au-delà de la fenêtre par défaut", () => {
    expect(isBirthdaySoon("1990-06-25")).toBe(false);
  });

  it("bascule sur l'année suivante quand l'anniversaire est déjà passé", () => {
    // Le 10 juin est passé (on est le 15) : le prochain est en 2025, donc loin.
    expect(isBirthdaySoon("1990-06-10")).toBe(false);
  });

  it("respecte une fenêtre personnalisée", () => {
    expect(isBirthdaySoon("1990-06-30", 20)).toBe(true);
    expect(isBirthdaySoon("1990-06-30", 10)).toBe(false);
  });
});
