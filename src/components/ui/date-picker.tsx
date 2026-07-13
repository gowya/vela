"use client"

import * as React from "react"
import { CalendarIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// DatePicker (jour seul) et DateTimePicker (jour + heure), sur le Calendar
// shadcn/react-day-picker déjà installé. Travaillent avec les mêmes formats
// de chaîne que les inputs natifs qu'ils remplacent (`YYYY-MM-DD` pour
// `type="date"`, `YYYY-MM-DDTHH:mm` pour `type="datetime-local"`) pour rester
// un remplacement direct des champs du formulaire patient.

function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

interface DatePickerProps {
  label: string
  hideLabel?: boolean
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
}

function DatePicker({
  label,
  hideLabel = false,
  value,
  onValueChange,
  placeholder = "Sélectionner une date",
  id,
  className,
  disabled,
}: DatePickerProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const [open, setOpen] = React.useState(false)
  const selected = parseDateOnly(value)

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={inputId}
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 font-normal",
                !selected && "text-muted-foreground",
                className
              )}
            />
          }
        >
          <CalendarIcon size={14} />
          {selected ? selected.toLocaleDateString("fr-FR") : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            onSelect={(date) => {
              onValueChange(date ? formatDateOnly(date) : "")
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function parseDateTimeLocal(value: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "" }
  const [datePart, timePart = ""] = value.split("T")
  return { date: parseDateOnly(datePart), time: timePart.slice(0, 5) }
}

function formatDateTimeLocal(date: Date, time: string): string {
  return `${formatDateOnly(date)}T${time || "00:00"}`
}

interface DateTimePickerProps {
  label: string
  hideLabel?: boolean
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
}

function DateTimePicker({
  label,
  hideLabel = false,
  value,
  onValueChange,
  placeholder = "Sélectionner une date",
  id,
  className,
  disabled,
}: DateTimePickerProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const [open, setOpen] = React.useState(false)
  const { date: selected, time } = parseDateTimeLocal(value)

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={inputId}
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 font-normal",
                !selected && "text-muted-foreground",
                className
              )}
            />
          }
        >
          <CalendarIcon size={14} />
          {selected
            ? `${selected.toLocaleDateString("fr-FR")}${time ? ` à ${time}` : ""}`
            : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (!date) {
                onValueChange("")
                return
              }
              onValueChange(formatDateTimeLocal(date, time))
            }}
          />
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Label htmlFor={`${inputId}-time`} className="text-xs text-muted-foreground">
              Heure
            </Label>
            <Input
              id={`${inputId}-time`}
              type="time"
              className="h-7 w-auto"
              value={time}
              onChange={(event) => {
                const base = selected ?? new Date()
                onValueChange(formatDateTimeLocal(base, event.target.value))
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker, DateTimePicker }
