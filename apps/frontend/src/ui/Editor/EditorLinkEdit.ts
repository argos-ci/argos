import { Plugin } from "@tiptap/pm/state";
import { Extension, type Editor } from "@tiptap/react";

export const LINK_EDIT_TRIGGER_EVENT = "argos-link-edit-trigger";

function canEditLink(editor: Editor) {
  const { selection } = editor.state;
  return (
    editor.isActive("link") ||
    (!selection.empty && editor.can().setLink({ href: "" }))
  );
}

function dispatchTrigger(editor: Editor) {
  editor.view.dom.dispatchEvent(new CustomEvent(LINK_EDIT_TRIGGER_EVENT));
}

export const LinkEditTrigger = Extension.create({
  name: "linkEditTrigger",
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        if (!canEditLink(this.editor)) {
          return false;
        }
        dispatchTrigger(this.editor);
        return true;
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            click(view, event) {
              if (event.button !== 0) {
                return false;
              }
              const target = event.target as HTMLElement | null;
              if (!target) {
                return false;
              }
              const link = target.closest("a");
              if (link && view.dom.contains(link)) {
                view.dom.dispatchEvent(
                  new CustomEvent(LINK_EDIT_TRIGGER_EVENT),
                );
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
