export const SPECIALTIES = [
  { value: "psychologie", label: "Psychologie" },
  { value: "sexologie", label: "Sexologie" },
  { value: "hypnotherapie", label: "Hypnothérapie" },
  { value: "coaching_relationnel", label: "Coaching relationnel" },
  { value: "sophrologie", label: "Sophrologie" },
  { value: "naturopathie", label: "Naturopathie" },
  { value: "autre", label: "Autre" },
] as const;

export type SpecialtyValue = (typeof SPECIALTIES)[number]["value"];

export const SPECIALTY_VALUES = SPECIALTIES.map((s) => s.value) as [SpecialtyValue, ...SpecialtyValue[]];
