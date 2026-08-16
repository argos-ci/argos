import { fuzzy } from "fast-fuzzy";

import type { ItemNode, MenuNode } from "./tree";

/**
 * How closely a row has to match before it survives a query.
 *
 * The same 0.7 the build's filter menu already used. Looser than that and
 * near-misses survive — at 0.6 a query of "png" kept "as JPEG".
 */
const MATCH_THRESHOLD = 0.7;

/**
 * A title match beats a keyword match, which beats a subtitle match. Without
 * the weighting, a row whose subtitle happens to contain the query outranks
 * the row actually named after it.
 */
const TITLE_WEIGHT = 1;
const KEYWORD_WEIGHT = 0.8;
const SUBTITLE_WEIGHT = 0.6;

function score(node: ItemNode, query: string): number {
  const title = fuzzy(query, node.title) * TITLE_WEIGHT;
  const keywords = node.keywords.reduce(
    (best, keyword) => Math.max(best, fuzzy(query, keyword) * KEYWORD_WEIGHT),
    0,
  );
  const subtitle = node.subtitle
    ? fuzzy(query, node.subtitle) * SUBTITLE_WEIGHT
    : 0;
  return Math.max(title, keywords, subtitle);
}

export type FilterResult = {
  nodes: MenuNode[];
  /** True once a query is narrowing the list, so the empty state can say so. */
  filtered: boolean;
};

/**
 * Narrow a menu to what matches the query.
 *
 * Three things happen that a plain `filter` would not do:
 *
 * - **Submenu items are reachable.** A query is matched against every
 *   submenu's items too, and a match is lifted into the flat list under its
 *   parent's name — so "png" finds "Copy image > as PNG" without anyone
 *   opening the submenu.
 * - **Headings and separators follow their items.** A heading whose items all
 *   went away goes with them, and separators never bracket nothing.
 * - **Pinned rows stay.** A row with a `filterPriority` is always kept, in that
 *   order, ahead of the matches — that is how an action like "Create project"
 *   stays reachable while you are searching for one.
 */
export function filterMenuNodes(
  nodes: MenuNode[],
  query: string | null,
): FilterResult {
  if (!query) {
    return { nodes, filtered: false };
  }

  const items = nodes.filter((node): node is ItemNode => node.type === "item");
  const pinned = items
    .filter((node) => node.filterPriority !== null)
    .sort((a, b) => (a.filterPriority ?? 0) - (b.filterPriority ?? 0));
  const pinnedIds = new Set(pinned.map((node) => node.id));

  const scored: { node: ItemNode; score: number }[] = [];
  for (const node of items) {
    if (pinnedIds.has(node.id)) {
      continue;
    }
    const own = score(node, query);
    if (own >= MATCH_THRESHOLD) {
      scored.push({ node, score: own });
    }
    for (const child of node.children) {
      const nested = score(child, query);
      if (nested >= MATCH_THRESHOLD) {
        scored.push({ node: child, score: nested });
      }
    }
  }
  scored.sort((a, b) => b.score - a.score);

  return {
    nodes: [...pinned, ...scored.map((entry) => entry.node)],
    filtered: true,
  };
}

/**
 * Drop the headings and separators a filtered list no longer needs: a heading
 * with nothing under it, a separator at either end, and any run of them.
 */
export function pruneOrphans(nodes: MenuNode[]): MenuNode[] {
  const kept: MenuNode[] = [];
  for (const node of nodes) {
    if (node.type === "heading") {
      // Only keep a heading if an item follows before the next heading.
      const rest = nodes.slice(nodes.indexOf(node) + 1);
      const next = rest.find(
        (other) => other.type === "item" || other.type === "heading",
      );
      if (next?.type !== "item") {
        continue;
      }
    }
    if (node.type === "separator") {
      const previous = kept.at(-1);
      if (!previous || previous.type === "separator") {
        continue;
      }
    }
    kept.push(node);
  }
  while (kept.at(-1)?.type === "separator") {
    kept.pop();
  }
  return kept;
}
