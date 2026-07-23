"use client";

import { useEffect, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ComboboxMultiple } from "@/components/ui/combobox";

type Option = { value: string; label: string };

type InlineMultiSelectFieldEditorProps = {
  field: string;
  label: string;
  initialValue: string[];
  options: readonly Option[];
  placeholder?: string;
};

export function InlineMultiSelectFieldEditor({
  field,
  label,
  initialValue,
  options,
  placeholder,
}: InlineMultiSelectFieldEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [draftValue, setDraftValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
    setDraftValue(initialValue);
  }, [initialValue]);

  const currentLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  const handleStartEdit = () => {
    setDraftValue(value);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftValue(value);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: draftValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer.");
      }

      setValue(data.value);
      setDraftValue(data.value);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="group flex items-center gap-2">
        {isEditing ? (
          <>
            <ComboboxMultiple
              label={`Modifier ${label.toLowerCase()}`}
              hideLabel
              options={options}
              value={draftValue}
              onValueChange={setDraftValue}
              placeholder={placeholder}
            />
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
              Annuler
            </Button>
          </>
        ) : (
          <>
            <span className="max-w-[220px] truncate text-sm text-foreground">
              {currentLabels.length > 0 ? (
                currentLabels.join(", ")
              ) : (
                <span className="text-muted-foreground">{placeholder ?? "—"}</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleStartEdit}
              className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              aria-label={`Modifier ${label.toLowerCase()}`}
            >
              <PencilSimple size={16} />
            </button>
          </>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
