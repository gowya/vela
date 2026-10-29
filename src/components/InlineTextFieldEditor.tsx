"use client";

import { useEffect, useRef, useState, type HTMLInputTypeAttribute, type InputHTMLAttributes } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sanitizePhoneInput } from "@/lib/phone";
import { FieldError } from "@/components/ui/field";

type InlineTextFieldEditorProps = {
  field: string;
  label: string;
  initialValue: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
};

export function InlineTextFieldEditor({
  field,
  label,
  initialValue,
  minLength = 0,
  maxLength = 80,
  placeholder,
  className,
  type,
  inputMode,
}: InlineTextFieldEditorProps) {
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  const [value, setValue] = useState(initialValue);
  const [draftValue, setDraftValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setValue(initialValue);
    setDraftValue(initialValue);
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

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
    const trimmedValue = draftValue.trim();

    if (trimmedValue.length < minLength) {
      setError(`${label} doit contenir au moins ${minLength} caractères.`);
      return;
    }
    if (trimmedValue.length > maxLength) {
      setError(`${label} doit contenir au plus ${maxLength} caractères.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: trimmedValue }),
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
    <div className={className}>
      <div className="group flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              ref={inputRef}
              type={type}
              inputMode={inputMode}
              value={draftValue}
              placeholder={placeholder}
              onChange={(event) => {
                const nextValue =
                  type === "tel" ? sanitizePhoneInput(event.target.value) : event.target.value;
                setDraftValue(nextValue);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  handleCancel();
                }
              }}
              className="max-w-xs"
              aria-label={`Modifier ${label.toLowerCase()}`}
            />
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Annuler
            </Button>
          </>
        ) : (
          <>
            <span className="max-w-[220px] truncate text-sm text-foreground">
              {value || <span className="text-muted-foreground">{placeholder ?? "—"}</span>}
            </span>
            <button
              type="button"
              onClick={handleStartEdit}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Modifier ${label.toLowerCase()}`}
            >
              <PencilSimple size={16} />
            </button>
          </>
        )}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
