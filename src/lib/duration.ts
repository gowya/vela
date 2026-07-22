// Formate une durée en minutes façon "1h30", "2h", "45 min" — utilisé dans le
// catalogue de types de rendez-vous et l'affichage des rendez-vous.
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h${String(remainder).padStart(2, "0")}`;
}
