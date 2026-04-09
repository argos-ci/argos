import type { Page } from "@playwright/test";

export async function replaceText(
  page: Page,
  replacements: Record<string, string>,
): Promise<() => Promise<void>> {
  const storeKey = `__replaceTextStore_${Date.now()}`;

  await page.evaluate(
    ({ replacements, storeKey }) => {
      type TextMod = { type: "text"; node: Text; original: string };
      type MergeMod = {
        type: "merge";
        anchor: Text;
        anchorOriginal: string;
        removed: Text[];
      };
      type Mod = TextMod | MergeMod;

      const mods: Mod[] = [];

      function apply(text: string): string {
        for (const [search, replace] of Object.entries(replacements)) {
          text = text.replaceAll(search, replace);
        }
        return text;
      }

      function processElement(el: Element) {
        let run: Text[] = [];

        function flushRun() {
          if (run.length === 0) { return; }

          if (run.length === 1) {
            const node = run[0]!;
            const original = node.textContent ?? "";
            const replaced = apply(original);
            if (replaced !== original) {
              mods.push({ type: "text", node, original });
              node.textContent = replaced;
            }
          } else {
            const combined = run.map((n) => n.textContent ?? "").join("");
            const replaced = apply(combined);
            if (replaced !== combined) {
              const anchor = run[0]!;
              const anchorOriginal = anchor.textContent ?? "";
              const removed = run.slice(1);
              mods.push({ type: "merge", anchor, anchorOriginal, removed });
              anchor.textContent = replaced;
              for (const node of removed) { node.remove(); }
            }
          }

          run = [];
        }

        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            run.push(child as Text);
          } else {
            flushRun();
            if (child.nodeType === Node.ELEMENT_NODE) {
              processElement(child as Element);
            }
          }
        }
        flushRun();
      }

      processElement(document.body);
      (window as any)[storeKey] = mods;
    },
    { replacements, storeKey },
  );

  return async () => {
    await page.evaluate((storeKey) => {
      type TextMod = { type: "text"; node: Text; original: string };
      type MergeMod = {
        type: "merge";
        anchor: Text;
        anchorOriginal: string;
        removed: Text[];
      };
      type Mod = TextMod | MergeMod;

      const mods: Mod[] = (window as any)[storeKey] ?? [];
      for (const mod of [...mods].reverse()) {
        if (mod.type === "text") {
          mod.node.textContent = mod.original;
        } else {
          mod.anchor.textContent = mod.anchorOriginal;
          let ref: ChildNode = mod.anchor;
          for (const node of mod.removed) {
            ref.after(node);
            ref = node;
          }
        }
      }
      delete (window as any)[storeKey];
    }, storeKey);
  };
}
