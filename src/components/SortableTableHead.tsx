"use client";

import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { TableHead } from "@/components/ui/table";
import { nextTableSort, type TableSort } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

// En-tête cliquable qui trie la colonne : mêmes icônes et même comportement
// que les en-têtes du tableau Patients.
export function SortableTableHead<K extends string>({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: K;
  sort: TableSort<K>;
  onSortChange: (sort: TableSort<K>) => void;
  className?: string;
}) {
  const direction = sort?.key === sortKey ? sort.direction : null;

  return (
    <TableHead
      className={cn("select-none", className)}
      aria-sort={
        direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSortChange(nextTableSort(sort, sortKey))}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {direction === "asc" ? (
          <CaretUpIcon size={12} />
        ) : direction === "desc" ? (
          <CaretDownIcon size={12} />
        ) : (
          <CaretUpDownIcon size={12} className="opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
