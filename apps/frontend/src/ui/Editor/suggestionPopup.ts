import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { flip, shift } from "@floating-ui/react-dom";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";

/** Viewport edge the popup never crosses. */
const VIEWPORT_MARGIN = 8;

interface SuggestionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * The popup of a suggestion menu (mention list, slash-command menu), to spread
 * into a tiptap `suggestion` config. It renders `Component` with the
 * suggestion props, and the plugin's `mount` keeps it against the caret.
 *
 * Below the caret by default, flipped above it when there is no room — an
 * editor at the bottom of a sidebar would otherwise push its menu off screen —
 * and shifted so a caret near the right edge doesn't take the menu with it.
 */
export function suggestionPopup<P extends Record<string, unknown>>(
  Component: ForwardRefExoticComponent<P & RefAttributes<SuggestionListHandle>>,
) {
  return {
    // The plugin's own flip has no padding, so it would let the menu touch the
    // viewport edge.
    flip: false,
    floatingUi: {
      strategy: "fixed",
      middleware: [
        flip({ padding: VIEWPORT_MARGIN }),
        shift({ padding: VIEWPORT_MARGIN }),
      ],
    },
    render: () => {
      let component: ReactRenderer<SuggestionListHandle, P> | null = null;
      let unmount: (() => void) | null = null;

      const destroy = () => {
        unmount?.();
        component?.destroy();
        unmount = null;
        component = null;
      };

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(Component, {
            props,
            editor: props.editor,
          });
          // Keep the suggestions above every overlay so they stay visible and
          // clickable when the editor is rendered inside one (e.g. the review
          // submission popover). The popup is appended to `document.body`, and
          // react-aria gives its popovers/modals an inline `z-index: 100000`,
          // so this must clear that layer.
          component.element.style.zIndex = "300000";
          unmount = props.mount(component.element);
        },
        onUpdate: (props: SuggestionProps) => {
          component?.updateProps(props);
        },
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === "Escape") {
            destroy();
            return true;
          }
          return component?.ref?.onKeyDown(event) ?? false;
        },
        onExit: destroy,
      };
    },
  } satisfies Partial<SuggestionOptions>;
}
