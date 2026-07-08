"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Editor, Range } from "@tiptap/core";
import type { Icon } from "@phosphor-icons/react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import { cn } from "@/lib/utils";

export interface SlashCommandItem {
  title: string;
  icon: Icon;
  command: (props: { editor: Editor; range: Range }) => void;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(
  function SlashCommandMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setSelectedIndex((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((index) =>
            items.length === 0 ? 0 : (index - 1 + items.length) % items.length
          );
          return true;
        }
        if (event.key === "Enter") {
          if (items[selectedIndex]) command(items[selectedIndex]);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="z-50 w-48 rounded-lg bg-popover p-1 text-xs text-muted-foreground shadow-md ring-1 ring-foreground/10">
          Aucun résultat
        </div>
      );
    }

    return (
      <div className="z-50 w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => command(item)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-hidden select-none",
              index === selectedIndex && "bg-accent text-accent-foreground"
            )}
          >
            <item.icon size={14} />
            {item.title}
          </button>
        ))}
      </div>
    );
  }
);
