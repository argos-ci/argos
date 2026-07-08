import type { z } from "zod";

type HandlerContext = {
  user: {
    /** ID of the recipient. Lets handlers personalize copy (e.g. "your comment"). */
    id: string;
    name: string | null;
  };
  /**
   * URL to the user's notification preferences, or null when the notification
   * is not configurable.
   */
  preferencesUrl: string | null;
};

/**
 * Category used to group notifications when a user configures which
 * notifications they want to receive.
 */
export type NotificationCategory =
  "account" | "security" | "review" | "billing" | "project" | "integration";

export type NotificationHandler<TType extends string = string, TData = any> = {
  type: TType;
  /**
   * Category this notification belongs to. Whether it is configurable is
   * derived from the category metadata.
   */
  category: NotificationCategory;
  schema: z.ZodType<TData>;
  previewData: TData;
  email: (props: TData & { ctx: HandlerContext }) => {
    subject: string;
    body: React.JSX.Element;
  };
};

export function defineNotificationHandler<TName extends string, TData>(
  handler: NotificationHandler<TName, TData>,
): NotificationHandler<TName, TData> {
  return handler;
}
