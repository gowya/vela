export const ACCOUNT_DELETION_REASONS = [
  "no_longer_needed",
  "taking_a_break",
  "found_alternative",
  "too_expensive",
  "too_many_bugs",
  "other",
] as const;

export type AccountDeletionReason = (typeof ACCOUNT_DELETION_REASONS)[number];

export const ACCOUNT_DELETION_REASON_LABELS: Record<AccountDeletionReason, string> = {
  no_longer_needed: "Je n'ai plus besoin de l'outil",
  taking_a_break: "Je fais une pause",
  found_alternative: "J'ai trouvé un autre outil",
  too_expensive: "C'est trop cher",
  too_many_bugs: "Trop de bugs",
  other: "Autre raison",
};
