import { describe, expect, it } from "vitest";
import { applyTableSort, nextTableSort } from "./table-sort";

describe("nextTableSort", () => {
  it("passe d'une colonne non triée à un tri croissant", () => {
    expect(nextTableSort(null, "date")).toEqual({ key: "date", direction: "asc" });
  });

  it("enchaîne croissant, décroissant puis ordre par défaut", () => {
    expect(nextTableSort({ key: "date", direction: "asc" }, "date")).toEqual({
      key: "date",
      direction: "desc",
    });
    expect(nextTableSort({ key: "date", direction: "desc" }, "date")).toBeNull();
  });

  it("repart en croissant quand on change de colonne", () => {
    expect(nextTableSort({ key: "date", direction: "desc" }, "patient")).toEqual({
      key: "patient",
      direction: "asc",
    });
  });
});

describe("applyTableSort", () => {
  const rows = [
    { name: "Élodie", minutes: 30 },
    { name: "adrien", minutes: 90 },
    { name: "Zoé", minutes: 45 },
  ];
  type Row = (typeof rows)[number];
  const values = {
    name: (row: Row) => row.name,
    minutes: (row: Row) => row.minutes,
  };

  it("laisse l'ordre d'origine sans tri", () => {
    expect(applyTableSort(rows, null, values)).toBe(rows);
  });

  it("trie le texte sans tenir compte de la casse ni des accents", () => {
    const sorted = applyTableSort(rows, { key: "name", direction: "asc" }, values);
    expect(sorted.map((row) => row.name)).toEqual(["adrien", "Élodie", "Zoé"]);
  });

  it("trie les nombres en décroissant", () => {
    const sorted = applyTableSort(rows, { key: "minutes", direction: "desc" }, values);
    expect(sorted.map((row) => row.minutes)).toEqual([90, 45, 30]);
  });
});
