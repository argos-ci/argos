import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * A menu's children are read, not rendered.
 *
 * Every part below (`MenuItem`, `MenuSection`, …) returns `null`. The menu
 * walks the element tree instead, turning it into the nodes here, and renders
 * those. That indirection is what lets the menu filter itself: a query drops
 * nodes from the list, and a submenu's items can be matched and surfaced from
 * the parent without ever being mounted.
 */
export type MenuNode = ItemNode | HeadingNode | SeparatorNode | PlaceholderNode;

/** A row that stands in for items — a loader, or a line of prose. */
type PlaceholderNode = {
  type: "placeholder";
  id: string;
  element: ReactElement;
};

export type ItemNode = {
  type: "item";
  id: string;
  /** What the query matches against, and what the row reads out. */
  title: string;
  subtitle: string | null;
  /** Extra words that should match this row without being displayed. */
  keywords: string[];
  /** A row that survives filtering, ordered by this number, whatever the query. */
  filterPriority: number | null;
  disabled: boolean;
  /** The element to render for the row. */
  element: ReactElement;
  /** A submenu's own items, so a query can reach them from the parent. */
  children: ItemNode[];
  /** The row this one was found under, when it was matched through a submenu. */
  parent: ItemNode | null;
};

type HeadingNode = {
  type: "heading";
  id: string;
  title: string;
  element: ReactElement;
};

type SeparatorNode = { type: "separator"; id: string };

/**
 * The text a node contributes to search, flattened out of whatever React node
 * it was given. Anything that is not a string or a number contributes nothing,
 * which is why the parts take a `textValue` escape hatch.
 */
function getTextFromReactNode(node: ReactNode): string {
  if (typeof node === "string") {
    return node;
  }
  if (typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextFromReactNode(node.props.children);
  }
  return "";
}

/**
 * Marks a component as a menu part, so the tree walker can recognise it.
 *
 * Comparing against the imported component itself would be circular — the
 * parts live in the module that imports this one — and comparing display names
 * breaks under minification.
 */
export const MENU_PART = Symbol.for("argos.menu.part");

export type MenuPartKind =
  | "item"
  | "section"
  | "heading"
  | "separator"
  | "placeholder"
  | "submenu"
  | "submenu-content";

function getMenuPartKind(element: ReactElement): MenuPartKind | null {
  const type = element.type as { [MENU_PART]?: MenuPartKind } | undefined;
  return type?.[MENU_PART] ?? null;
}

/** The best name we can give a component in an error message. */
function getElementName(element: ReactElement): string {
  const { type } = element;
  if (typeof type === "string") {
    return type;
  }
  if (typeof type === "function") {
    return type.name || "Anonymous";
  }
  return "Unknown";
}

type ItemProps = {
  children?: ReactNode;
  textValue?: string;
  subtitle?: ReactNode;
  subtitleTextValue?: string;
  keywords?: string[];
  filterPriority?: number;
  disabled?: boolean;
};

type SubmenuChildren = { children?: ReactNode };

/**
 * Turn a menu's children into the flat list it renders.
 *
 * Sections flatten: their heading becomes a node and their items follow it, so
 * filtering can drop a heading whose items all went away without the list
 * having to nest.
 */
export function getMenuNodes(
  children: ReactNode,
  idPrefix: string,
): MenuNode[] {
  const nodes: MenuNode[] = [];
  let index = 0;

  const walk = (child: ReactNode) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    if (Array.isArray(child)) {
      child.forEach(walk);
      return;
    }
    if (!isValidElement(child)) {
      throw new Error(
        `Menu children must be menu parts. Received ${JSON.stringify(child)}.`,
      );
    }

    // A fragment is transparent: it groups rows without being one.
    if (child.type === Fragment) {
      walk((child.props as SubmenuChildren).children);
      return;
    }

    const kind = getMenuPartKind(child);
    const id = `${idPrefix}-${index++}`;

    switch (kind) {
      case "section": {
        walk((child.props as SubmenuChildren).children);
        return;
      }
      case "heading": {
        nodes.push({
          type: "heading",
          id,
          title: getTextFromReactNode(
            (child.props as SubmenuChildren).children,
          ),
          element: child,
        });
        return;
      }
      case "separator": {
        nodes.push({ type: "separator", id });
        return;
      }
      case "placeholder": {
        nodes.push({ type: "placeholder", id, element: child });
        return;
      }
      case "item": {
        nodes.push(getItemNode(child, id));
        return;
      }
      case "submenu": {
        // `<SubMenu>` holds its trigger row and its content. The row is what
        // the parent renders; the content is walked so a query can reach it.
        const parts = Children.toArray(
          (child.props as SubmenuChildren).children,
        ).filter(isValidElement);
        const trigger = parts.find((part) => getMenuPartKind(part) === "item");
        const content = parts.find(
          (part) => getMenuPartKind(part) === "submenu-content",
        );
        if (!trigger) {
          return;
        }
        const node = getItemNode(trigger, id);
        node.element = child;
        if (content) {
          const nested = getMenuNodes(
            (content.props as SubmenuChildren).children,
            id,
          );
          node.children = nested.filter(
            (nestedNode): nestedNode is ItemNode => nestedNode.type === "item",
          );
          node.children.forEach((nestedNode) => {
            nestedNode.parent = node;
          });
        }
        nodes.push(node);
        return;
      }
      default: {
        // Anything else is a mistake, and a loud one on purpose.
        //
        // A menu reads its children rather than rendering them, so a component
        // that returns menu parts contributes nothing: the parts render `null`
        // and the walker never sees inside. Silently dropping it leaves an
        // empty menu and no clue why, so say so instead. Give the menu its
        // parts directly — an array from a `map` is fine, a wrapper component
        // is not.
        throw new Error(
          `Menu children must be menu parts. Received <${getElementName(child)}>, which the menu cannot see inside. Return its parts to the menu directly instead of wrapping them in a component.`,
        );
      }
    }
  };

  walk(children);
  return nodes;
}

/** Rows already reported, so a re-render does not repeat the warning. */
const warnedTextlessRows = new Set<string>();

function getItemNode(element: ReactElement, id: string): ItemNode {
  const props = element.props as ItemProps;
  const title = props.textValue ?? getTextFromReactNode(props.children);
  // A row without text is unreachable: every query drops it, and it reads as
  // nothing to a screen reader. It happens silently when the children are a
  // component — the walker cannot see inside one — so say it out loud where
  // the screenshots cannot.
  if (
    process.env.NODE_ENV === "development" &&
    !title &&
    !warnedTextlessRows.has(id)
  ) {
    warnedTextlessRows.add(id);
    console.warn(
      "A menu row has no text a query could match: its children are not plain text and it declares no `textValue`. Filtering will drop it — give it a `textValue`.",
      element,
    );
  }
  return {
    type: "item",
    id,
    title,
    subtitle:
      props.subtitleTextValue ?? (getTextFromReactNode(props.subtitle) || null),
    keywords: props.keywords ?? [],
    filterPriority: props.filterPriority ?? null,
    disabled: props.disabled ?? false,
    element,
    children: [],
    parent: null,
  };
}
