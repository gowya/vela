"use client";

import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState } from "@tiptap/react";
import { TextAaIcon, TextBIcon, TextItalicIcon, TextUnderlineIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FONT_SIZE_PRESETS } from "./FontSize";

interface SelectionToolbarProps {
  editor: Editor;
}

// Palette fixe et sobre (pas de color-picker libre) : cohérent avec la palette
// oklch neutre du design system et l'exigence de sobriété visuelle du CLAUDE.md.
const TEXT_COLORS: { label: string; value: string | null; swatchClassName: string }[] = [
  { label: "Par défaut", value: null, swatchClassName: "bg-foreground" },
  { label: "Rose", value: "oklch(0.422 0.062 11.232)", swatchClassName: "bg-[oklch(0.422_0.062_11.232)]" },
  { label: "Sauge", value: "oklch(0.5 0.06 151.5)", swatchClassName: "bg-[oklch(0.5_0.06_151.5)]" },
  { label: "Ardoise", value: "oklch(0.45 0.03 250)", swatchClassName: "bg-[oklch(0.45_0.03_250)]" },
  { label: "Ambre", value: "oklch(0.55 0.12 70)", swatchClassName: "bg-[oklch(0.55_0.12_70)]" },
  { label: "Terracotta", value: "oklch(0.5 0.13 35)", swatchClassName: "bg-[oklch(0.5_0.13_35)]" },
];

export function SelectionToolbar({ editor }: SelectionToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      className="flex items-center gap-0.5 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Gras"
        aria-pressed={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(state.bold && "bg-muted text-foreground")}
      >
        <TextBIcon size={12} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Italique"
        aria-pressed={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(state.italic && "bg-muted text-foreground")}
      >
        <TextItalicIcon size={12} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Souligné"
        aria-pressed={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(state.underline && "bg-muted text-foreground")}
      >
        <TextUnderlineIcon size={12} />
      </Button>

      <div className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Taille du texte">
              <TextAaIcon size={12} />
            </Button>
          }
        />
        <DropdownMenuContent align="center">
          {FONT_SIZE_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.value}
              onClick={() => editor.chain().focus().setFontSize(preset.value).run()}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Couleur du texte">
              <span className="size-3 rounded-full bg-foreground" aria-hidden="true" />
            </Button>
          }
        />
        <DropdownMenuContent align="center">
          {TEXT_COLORS.map((color) => (
            <DropdownMenuItem
              key={color.label}
              onClick={() =>
                color.value
                  ? editor.chain().focus().setColor(color.value).run()
                  : editor.chain().focus().unsetColor().run()
              }
            >
              <span className={cn("size-3 rounded-full", color.swatchClassName)} aria-hidden="true" />
              {color.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </BubbleMenu>
  );
}
