import type { z } from "zod";

type HandlerContext = {
  user: {
    name: string | null;
  };
};

/**
 * Category used to group notifications when a user configures which
 * notifications they want to receive.
 */
export type NotificationCategory =
  | "account"
  | "security"
  | "review"
  | "billing"
  | "project"
  | "integration";

export type NotificationHandler<TType extends string = string, TData = any> = {
  type: TType;
  /**
   * Category this notification belongs to, used to group user preferences.
   */
  category: NotificationCategory;
  /**
   * Whether users can opt out of this notification. Transactional and security
   * notifications are not configurable and are always delivered.
   */
  configurable: boolean;
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
