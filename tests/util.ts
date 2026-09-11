import { createHash } from "node:crypto";
import {
  argosScreenshot,
  type ArgosScreenshotOptions,
} from "@argos-ci/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

import {
  TeamUser,
  type Team,
  type User,
} from "../apps/backend/src/database/models";

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

/**
 * Get a unique test identifier across retries.
 */
export function getUniqueTestIdentifier(testInfo: TestInfo) {
  const shortId = createHash("sha256")
    .update(testInfo.testId)
    .digest("hex")
    .slice(0, 6);
  if (testInfo.retry > 0) {
    return `${shortId}-${testInfo.retry}`;
  }
  return shortId;
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
    // Expect that at least one text is visible.
    await expect(
      page.getByText(search, { exact: false }).first(),
    ).toBeVisible();
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

/**
 * Wait for the snapshot list to stop moving.
 *
 * Selecting a diff scrolls the list to it with `behavior: "smooth"`, and the
 * heading of the diff resolves long before the scroll lands, so a navigation
 * has to be settled before the next one is driven — otherwise two animations
 * overlap and the list comes to rest wherever the last one was interrupted,
 * which is a different offset every run.
 *
 * The quiet period is timed inside the page rather than by polling from here:
 * a loaded machine stretches a round trip as much as it stretches the
 * animation, so a sampler that pays four of them per attempt reads a moving
 * list and never agrees with itself.
 */
export async function waitForDiffListToSettle(page: Page) {
  const scroller = page.getByTestId("diff-list-scroller");
  await expect(scroller).toBeVisible();
  await scroller.evaluate(
    (el, { quietMs, timeoutMs }) =>
      new Promise<void>((resolve, reject) => {
        let quiet = 0;
        const stop = () => {
          clearTimeout(quiet);
          clearTimeout(expired);
          el.removeEventListener("scroll", restartQuietPeriod);
        };
        const expired = setTimeout(() => {
          stop();
          reject(
            new Error(`the snapshot list still scrolls after ${timeoutMs}ms`),
          );
        }, timeoutMs);
        const restartQuietPeriod = () => {
          clearTimeout(quiet);
          quiet = setTimeout(() => {
            stop();
            resolve();
          }, quietMs);
        };
        // The scroll is started by an effect, so it has not necessarily been
        // scheduled yet when this runs: give it a frame before counting.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            el.addEventListener("scroll", restartQuietPeriod);
            restartQuietPeriod();
          }),
        );
      }),
    { quietMs: 300, timeoutMs: 10_000 },
  );
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
