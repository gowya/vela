"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Adapté du Snackbar de Base Web (baseweb.design/components/snackbar) sur le
// moteur headless @base-ui/react/toast déjà utilisé par Dialog dans ce projet
// (portail, empilement, swipe-to-dismiss, focus géré nativement) — seuls le
// placement, les types et les tokens sont repris et retravaillés avec ceux
// de Vela.

// -----------------------------------------------------------------------------
// Placement — 6 emplacements possibles, haut/bas x gauche/centre/droite.
// -----------------------------------------------------------------------------

const PLACEMENT_CLASSNAMES = {
  "top-left": "top-4 left-4 items-start",
  top: "top-4 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  bottom: "bottom-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-4 right-4 items-end",
} as const

type ToastPlacement = keyof typeof PLACEMENT_CLASSNAMES

// Direction de swipe-to-dismiss cohérente avec l'emplacement : on repousse le
// toast du bord de l'écran d'où il est apparu.
const PLACEMENT_SWIPE_DIRECTION: Record<
  ToastPlacement,
  Array<"up" | "down" | "left" | "right">
> = {
  "top-left": ["up", "left"],
  top: ["up"],
  "top-right": ["up", "right"],
  "bottom-left": ["down", "left"],
  bottom: ["down"],
  "bottom-right": ["down", "right"],
}

// -----------------------------------------------------------------------------
// Type de toast — chargement, confirmation, erreur — chacun avec son icône et
// sa couleur. Repris tel quel du badge de statut déjà utilisé dans l'éditeur
// de consultation (bg-muted / bg-primary / bg-destructive) pour que le
// vocabulaire visuel reste le même partout dans l'app.
// -----------------------------------------------------------------------------

const TOAST_TYPE_CONFIG = {
  loading: {
    icon: ArrowsClockwiseIcon,
    className: "bg-muted text-muted-foreground",
    spin: true,
  },
  success: {
    icon: CheckCircleIcon,
    className: "bg-primary/10 text-primary",
    spin: false,
  },
  error: {
    icon: WarningCircleIcon,
    className: "bg-destructive/10 text-destructive",
    spin: false,
  },
} as const

type ToastType = keyof typeof TOAST_TYPE_CONFIG

type ManagedToast = ReturnType<typeof ToastPrimitive.useToastManager>["toasts"][number]

// -----------------------------------------------------------------------------
// Provider — à monter une fois à la racine de l'app (ex. dans le layout du
// dashboard), avant tout composant qui appelle useToast().
// -----------------------------------------------------------------------------

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider data-slot="toast-provider" {...props} />
}

// -----------------------------------------------------------------------------
// Toaster — portail + zone d'empilement + rendu de chaque toast. À monter une
// fois, en frère de ToastProvider, avec l'emplacement souhaité à l'écran.
// -----------------------------------------------------------------------------

function Toaster({
  placement = "bottom-right",
  className,
}: {
  placement?: ToastPlacement
  className?: string
}) {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className={cn(
          "fixed z-50 flex w-[380px] max-w-[calc(100%-2rem)] flex-col gap-2 outline-none",
          PLACEMENT_CLASSNAMES[placement],
          className
        )}
      >
        <ToastList placement={placement} />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

function ToastList({ placement }: { placement: ToastPlacement }) {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((toast) => (
    <ToastItem key={toast.id} toast={toast} placement={placement} />
  ))
}

function ToastItem({
  toast,
  placement,
}: {
  toast: ManagedToast
  placement: ToastPlacement
}) {
  const type = (toast.type as ToastType | undefined) ?? "success"
  const { icon: Icon, className: iconClassName, spin } = TOAST_TYPE_CONFIG[type]

  return (
    <ToastPrimitive.Root
      toast={toast}
      swipeDirection={PLACEMENT_SWIPE_DIRECTION[placement]}
      data-slot="toast"
      className={cn(
        "relative rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-all duration-200",
        "data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0",
        "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
        "data-[swiping]:transition-none"
      )}
    >
      <ToastPrimitive.Content data-slot="toast-content" className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
            iconClassName
          )}
        >
          <Icon size={13} weight="bold" className={spin ? "animate-spin" : undefined} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
          {toast.title && (
            <ToastPrimitive.Title
              data-slot="toast-title"
              className="font-heading text-xs font-medium text-foreground"
            />
          )}
          {toast.description && (
            <ToastPrimitive.Description
              data-slot="toast-description"
              className="text-xs/relaxed text-muted-foreground"
            />
          )}
        </div>

        {/* CTA ghost en bout de ligne — ex. « Annuler », « Réessayer », « Voir » */}
        {toast.actionProps && (
          <ToastPrimitive.Action
            data-slot="toast-action"
            render={<Button variant="ghost" size="sm" className="-mt-1 shrink-0" />}
          />
        )}

        <ToastPrimitive.Close
          data-slot="toast-close"
          render={<Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 shrink-0" />}
        >
          <XIcon />
          <span className="sr-only">Fermer</span>
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  )
}

// -----------------------------------------------------------------------------
// useToast — hook à appeler depuis n'importe quel composant client :
//
//   const toast = useToast()
//   toast.add({ type: "success", description: "Patient créé." })
//   toast.add({
//     type: "error",
//     description: "Échec de l'enregistrement.",
//     actionProps: { children: "Réessayer", onClick: retry },
//   })
//   toast.promise(fetch(...), { loading: "Envoi…", success: "Envoyé.", error: "Échec." })
// -----------------------------------------------------------------------------

const useToast = ToastPrimitive.useToastManager

export { ToastProvider, Toaster, useToast }
export type { ToastPlacement, ToastType }
