import type { ErrorEvent } from "@sentry/nextjs";

// Vela traite des données de santé : on ne laisse jamais un corps de requête ou
// des cookies remonter dans un event Sentry, quelle que soit la route concernée
// (patients, consultations, notes de suivi peuvent y transiter).
export function scrubSensitiveData(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
  }
  return event;
}
