import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "h-7 w-full min-w-0 rounded-md px-2 py-0.5 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-input/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30",
        // Pas de bordure, fond discret visible en permanence pour rester
        // repérable au repos (retour test user #01, U2) — le halo de focus
        // habituel se renforce à l'interaction.
        ghost:
          "border border-transparent bg-muted/40 hover:bg-muted/50 focus-visible:border-ring focus-visible:bg-input/20 focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-muted/20 dark:hover:bg-muted/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & VariantProps<typeof inputVariants>
>(function Input({ className, type, variant, ...props }, ref) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      ref={ref}
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
})

export { Input, inputVariants }
