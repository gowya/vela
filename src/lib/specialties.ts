export const SPECIALTIES = [
  { value: "psychologue", label: "Psychologue" },
  { value: "sexologue", label: "Sexologue" },
  { value: "hypnotherapeute", label: "Hypnothérapeute" },
  { value: "coach_relationnel", label: "Coach relationnel" },
  { value: "sophrologue", label: "Sophrologue" },
  { value: "naturopathe", label: "Naturopathe" },
  { value: "autre", label: "Autre" },
] as const;

export type SpecialtyValue = (typeof SPECIALTIES)[number]["value"];

export const SPECIALTY_VALUES = SPECIALTIES.map((s) => s.value) as [SpecialtyValue, ...SpecialtyValue[]];
