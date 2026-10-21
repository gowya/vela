// Les composants partagés sont compacts (h-7, text-xs) pour la densité de
// l'app ; l'écran de connexion, vu seul et souvent sur mobile, mérite des
// cibles plus confortables.
export const authLabelClassName = "text-sm";
export const authFieldClassName = "h-9 px-3 text-sm md:text-sm";
export const authButtonClassName = "mt-2 h-9 w-full text-sm";
// Lien d'action en pied de carte (« Créer un compte », « Retour à la connexion »).
export const authFooterLinkClassName =
  "rounded-sm font-medium text-primary underline-offset-4 dark:text-foreground dark:underline outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/30";
export const authNoticeClassName = "rounded-md border px-3 py-2 text-sm";
