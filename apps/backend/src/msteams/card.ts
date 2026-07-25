/**
 * Minimal typing of the Adaptive Card subset we produce. Teams renders Adaptive
 * Cards up to schema 1.5, which is what the Workflows connector accepts.
 * @see https://adaptivecards.io/explorer/
 */

type AdaptiveCardTextBlock = {
  type: "TextBlock";
  text: string;
  wrap: true;
  size?: "small" | "default" | "medium" | "large";
  weight?: "lighter" | "default" | "bolder";
  color?:
    "default" | "dark" | "light" | "accent" | "good" | "warning" | "attention";
  isSubtle?: boolean;
  separator?: boolean;
  spacing?: "none" | "small" | "default" | "medium" | "large";
};

type AdaptiveCardFactSet = {
  type: "FactSet";
  facts: { title: string; value: string }[];
  separator?: boolean;
};

export type AdaptiveCardElement = AdaptiveCardTextBlock | AdaptiveCardFactSet;

type AdaptiveCardAction = {
  type: "Action.OpenUrl";
  title: string;
  url: string;
};

export type AdaptiveCard = {
  type: "AdaptiveCard";
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json";
  version: "1.5";
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
};

/**
 * Envelope expected by the Teams "when a webhook request is received" trigger.
 * The flow forwards `attachments` verbatim to the "Post card in a chat or
 * channel" action, so the shape has to match the Bot Framework message.
 */
export type MsTeamsCardMessage = {
  type: "message";
  attachments: {
    contentType: "application/vnd.microsoft.card.adaptive";
    contentUrl: null;
    content: AdaptiveCard;
  }[];
};

/**
 * Wrap an Adaptive Card into the message envelope expected by Teams.
 */
export function buildCardMessage(card: AdaptiveCard): MsTeamsCardMessage {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: card,
      },
    ],
  };
}

/**
 * Escape text interpolated into an Adaptive Card TextBlock.
 *
 * TextBlock and FactSet values render a subset of Markdown, so user-controlled
 * text (project names, branches, PR titles) must not be able to inject emphasis
 * or links.
 *
 * Only the characters that are meaningful *inline* are escaped. Block-level
 * markers (`#`, `-`, `>`) are left alone: they are inert mid-line, and escaping
 * them would surface literal backslashes in common text like `#99`.
 */
export function escapeMsTeamsText(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

/**
 * Build a Markdown link for use inside a TextBlock, escaping the label.
 *
 * Parentheses in the destination are percent-encoded: Git allows `(` and `)` in
 * branch names, and a raw `)` would close the link early, truncating the href
 * and spilling the rest as literal text.
 */
export function link(label: string, url: string): string {
  const safeUrl = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `[${escapeMsTeamsText(label)}](${safeUrl})`;
}
