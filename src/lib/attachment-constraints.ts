// Constantes partagées entre le storage provider (server-only, cf.
// attachment-storage.ts) et l'éditeur côté client (validation immédiate avant
// upload, sans attendre l'aller-retour réseau) : ce module ne doit importer
// aucune API Node (fs, path…) pour rester bundlable côté navigateur.
export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
