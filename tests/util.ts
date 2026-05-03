import {
  argosScreenshot,
  type ArgosScreenshotOptions,
} from "@argos-ci/playwright";
import { expect, type Page } from "@playwright/test";

import {
  TeamUser,
  type Team,
  type User,
} from "../apps/backend/src/database/models";

export function getPlanLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function ensureTeamOwner({
  team,
  user,
}: {
  team: Team;
  user: User;
}) {
  await TeamUser.query()
    .insert({ teamId: team.id, userId: user.id, userLevel: "owner" })
    .onConflict(["teamId", "userId"])
    .ignore();
}

async function replaceText(
  page: Page,
  replacements: Record<string, string>,
): Promise<() => Promise<void>> {
  const storeKey = `__replaceTextStore_${Date.now()}`;

  await page.evaluate((storeKey) => {
    (window as any)[storeKey] = [];
  }, storeKey);

  for (const [search, replace] of Object.entries(replacements)) {
    await expect(page.getByText(search, { exact: false })).toBeVisible();
    await page.getByText(search, { exact: false }).evaluateAll(
      (elements, { search, replace, storeKey }) => {
        type TextMod = { type: "text"; node: Text; original: string };
        type MergeMod = {
          type: "merge";
          anchor: Text;
          anchorOriginal: string;
          removed: Text[];
        };
        type Mod = TextMod | MergeMod;

        const mods: Mod[] = (window as any)[storeKey];

        function processElement(el: Element) {
          let run: Text[] = [];

          function flushRun() {
            if (run.length === 0) {
              return;
            }

            if (run.length === 1) {
              const node = run[0]!;
              const original = node.textContent ?? "";
              const replaced = original.replaceAll(search, replace);
              if (replaced !== original) {
                mods.push({ type: "text", node, original });
                node.textContent = replaced;
              }
            } else {
              const combined = run.map((n) => n.textContent ?? "").join("");
              const replaced = combined.replaceAll(search, replace);
              if (replaced !== combined) {
                const anchor = run[0]!;
                const anchorOriginal = anchor.textContent ?? "";
                const removed = run.slice(1);
                mods.push({ type: "merge", anchor, anchorOriginal, removed });
                anchor.textContent = replaced;
                for (const node of removed) {
                  node.remove();
                }
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

        for (const el of elements) {
          processElement(el);
        }
      },
      { search, replace, storeKey },
    );
  }

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

export async function screenshot(
  page: Page,
  name: string,
  options: ArgosScreenshotOptions & {
    replacements?: Record<string, string>;
  } = {},
) {
  const { replacements, ...otherOptions } = options;
  const ctx: { restore: (() => Promise<void>) | null } = { restore: null };
  await argosScreenshot(page, name, {
    beforeScreenshot: async () => {
      if (replacements) {
        ctx.restore = await replaceText(page, replacements);
      }
    },
    afterScreenshot: async () => {
      if (ctx.restore) {
        await ctx.restore();
        ctx.restore = null;
      }
    },
    argosCSS: `
    [data-testid="avatar"] {
      background-color: #4527a0 !important;
    }
    ${otherOptions.argosCSS ?? ""}  
    `,
    ...otherOptions,
  });
}
