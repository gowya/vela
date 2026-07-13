"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CaretDownIcon, CheckIcon, XIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

// Combobox simple et multiple, sur @base-ui/react/combobox (recherche/filtre
// intégrés) — remplace les Select utilisés comme sélecteurs de choix dans
// l'app. La prop `label` est volontairement obligatoire : ces champs ne
// doivent jamais s'utiliser sans intitulé visible (cf. claude/ui_guidelines.md
// sur l'accessibilité des formulaires).

interface ComboboxOption {
  value: string
  label: string
}

function ComboboxPopup({
  emptyMessage = "Aucun résultat.",
}: {
  emptyMessage?: string
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner className="isolate z-50" sideOffset={4}>
        <ComboboxPrimitive.Popup className="max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <ComboboxPrimitive.Empty className="empty:hidden px-2 py-1.5 text-muted-foreground">
            {emptyMessage}
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>
            {(option: ComboboxOption) => (
              <ComboboxPrimitive.Item
                key={option.value}
                value={option}
                className="relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 pr-7 text-xs/relaxed outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex items-center justify-center">
                  <CheckIcon size={13} weight="bold" />
                </ComboboxPrimitive.ItemIndicator>
                <span className="truncate">{option.label}</span>
              </ComboboxPrimitive.Item>
            )}
          </ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

interface ComboboxProps {
  label: string
  hideLabel?: boolean
  options: readonly ComboboxOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  id?: string
  className?: string
  disabled?: boolean
}

function Combobox({
  label,
  hideLabel = false,
  options,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  id,
  className,
  disabled,
}: ComboboxProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <ComboboxPrimitive.Root
        items={options}
        value={selected}
        onValueChange={(next) => onValueChange(next?.value ?? null)}
        isItemEqualToValue={(item, val) => item.value === val.value}
        disabled={disabled}
      >
        <ComboboxPrimitive.InputGroup
          className={cn(
            "flex h-7 w-full items-center gap-1 rounded-md border border-input bg-input/20 pl-2 text-xs/relaxed transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
            className
          )}
        >
          <ComboboxPrimitive.Input
            id={inputId}
            placeholder={placeholder}
            className="h-full w-full border-0 bg-transparent text-xs/relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <ComboboxPrimitive.Trigger
            className="flex h-full shrink-0 items-center justify-center px-2 text-muted-foreground"
            aria-label="Ouvrir la liste"
          >
            <CaretDownIcon size={13} />
          </ComboboxPrimitive.Trigger>
        </ComboboxPrimitive.InputGroup>
        <ComboboxPopup emptyMessage={emptyMessage} />
      </ComboboxPrimitive.Root>
    </div>
  )
}

interface ComboboxMultipleProps {
  label: string
  hideLabel?: boolean
  options: readonly ComboboxOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  emptyMessage?: string
  id?: string
  className?: string
  disabled?: boolean
}

function ComboboxMultiple({
  label,
  hideLabel = false,
  options,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  id,
  className,
  disabled,
}: ComboboxMultipleProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const selected = options.filter((option) => value.includes(option.value))

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <ComboboxPrimitive.Root
        items={options}
        multiple
        value={selected}
        onValueChange={(next) => onValueChange(next.map((option) => option.value))}
        isItemEqualToValue={(item, val) => item.value === val.value}
        disabled={disabled}
      >
        <ComboboxPrimitive.InputGroup
          className={cn(
            "flex min-h-7 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-input/20 px-1.5 py-1 text-xs/relaxed transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
            className
          )}
        >
          <ComboboxPrimitive.Chips className="flex flex-1 flex-wrap items-center gap-1">
            <ComboboxPrimitive.Value>
              {(chips: ComboboxOption[]) => (
                <>
                  {chips.map((option) => (
                    <ComboboxPrimitive.Chip
                      key={option.value}
                      aria-label={option.label}
                      className="flex h-5 items-center gap-1 rounded-sm bg-secondary pl-1.5 pr-1 text-secondary-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      {option.label}
                      <ComboboxPrimitive.ChipRemove
                        aria-label={`Retirer ${option.label}`}
                        className="flex size-3.5 items-center justify-center rounded-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                      >
                        <XIcon size={10} weight="bold" />
                      </ComboboxPrimitive.ChipRemove>
                    </ComboboxPrimitive.Chip>
                  ))}
                  <ComboboxPrimitive.Input
                    id={inputId}
                    placeholder={chips.length > 0 ? undefined : placeholder}
                    className="h-5 min-w-16 flex-1 border-0 bg-transparent text-xs/relaxed text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </>
              )}
            </ComboboxPrimitive.Value>
          </ComboboxPrimitive.Chips>
          <ComboboxPrimitive.Trigger
            className="flex h-5 shrink-0 items-center justify-center text-muted-foreground"
            aria-label="Ouvrir la liste"
          >
            <CaretDownIcon size={13} />
          </ComboboxPrimitive.Trigger>
        </ComboboxPrimitive.InputGroup>
        <ComboboxPopup emptyMessage={emptyMessage} />
      </ComboboxPrimitive.Root>
    </div>
  )
}

export { Combobox, ComboboxMultiple }
export type { ComboboxOption }
