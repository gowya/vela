import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import {
  CheckSquareIcon,
  ListBulletsIcon,
  PaperclipIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
} from "@phosphor-icons/react";
import { SlashCommandMenu, type SlashCommandItem, type SlashCommandMenuHandle } from "./SlashCommandMenu";

export interface SlashCommandOptions {
  // La pièce jointe s'insère de façon asynchrone (upload) ; l'item "/" ne fait que
  // déclencher le sélecteur de fichier de TiptapEditor, câblé via cette option.
  onAttachmentRequest: () => void;
  // Masque l'item "Pièce jointe" là où l'upload n'a pas de cible (ex. éditeur de
  // modèle : pas de consultation à laquelle rattacher le fichier).
  includeAttachment: boolean;
}

function buildItems(options: SlashCommandOptions): SlashCommandItem[] {
  const items: SlashCommandItem[] = [
    {
      title: "Titre 1",
      icon: TextHOneIcon,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
    },
    {
      title: "Titre 2",
      icon: TextHTwoIcon,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
    },
    {
      title: "Titre 3",
      icon: TextHThreeIcon,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
    },
    {
      title: "Liste à puces",
      icon: ListBulletsIcon,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Checklist",
      icon: CheckSquareIcon,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
  ];

  if (options.includeAttachment) {
    items.push({
      title: "Pièce jointe",
      icon: PaperclipIcon,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        options.onAttachmentRequest();
      },
    });
  }

  return items;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      onAttachmentRequest: () => undefined,
      includeAttachment: true,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        items: ({ query }) =>
          buildItems(options).filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          ),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuHandle> | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props: {
                  items: props.items,
                  command: (item: SlashCommandItem) => props.command(item),
                },
                editor: props.editor,
              });
              unmount = props.mount(component.element as HTMLElement);
            },
            onUpdate: (props) => {
              component?.updateProps({
                items: props.items,
                command: (item: SlashCommandItem) => props.command(item),
              });
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                unmount?.();
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              unmount?.();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
