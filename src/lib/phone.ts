/**
 * Filtre une saisie de numéro de téléphone : ne conserve que les chiffres,
 * espaces, et le symbole "+" (pour l'indicatif international).
 */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s]/g, "");
}
