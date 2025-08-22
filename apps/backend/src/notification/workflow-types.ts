import type { z } from "zod";

type HandlerContext = {
  user: {
    name: string | null;
  };
};

export type NotificationHandler<TType extends string = string, TData = any> = {
  type: TType;
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
