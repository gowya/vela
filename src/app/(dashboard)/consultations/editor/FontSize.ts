import { Extension } from "@tiptap/core";

// Trois préréglages seulement (pas de saisie libre) : cohérent avec la sobriété
// visuelle imposée par CLAUDE.md — on évite un color/size-picker à choix infini.
export type FontSizePreset = "small" | "normal" | "large";

const FONT_SIZE_VALUES: Record<FontSizePreset, string | null> = {
  small: "0.8125rem",
  normal: null,
  large: "1.125rem",
};

export const FONT_SIZE_PRESETS: { value: FontSizePreset; label: string }[] = [
  { value: "small", label: "Petit" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grand" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (preset: FontSizePreset) => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (preset: FontSizePreset) =>
        ({ chain }) => {
          const value = FONT_SIZE_VALUES[preset];
          if (!value) {
            return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
          }
          return chain().setMark("textStyle", { fontSize: value }).run();
        },
    };
  },
});
