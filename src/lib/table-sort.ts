// Tri par en-tête de colonne pour les tableaux qui n'utilisent pas TanStack
// (Consultations, Rendez-vous). Même cycle que le tableau Patients :
// croissant → décroissant → retour à l'ordre par défaut de la liste.

export type TableSort<K extends string> = { key: K; direction: "asc" | "desc" } | null;

export function nextTableSort<K extends string>(current: TableSort<K>, key: K): TableSort<K> {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

export function applyTableSort<T, K extends string>(
  rows: T[],
  sort: TableSort<K>,
  values: Record<K, (row: T) => string | number>
): T[] {
  if (!sort) return rows;
  const value = values[sort.key];
  const factor = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    const result =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "fr", { sensitivity: "base" });
    return result * factor;
  });
}
