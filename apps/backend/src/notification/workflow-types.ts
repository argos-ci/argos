import type * as React from "react";
import type { JSONSchema } from "objection";
import type { z } from "zod";

export type HandlerContext = {
  user: {
    name: string | null;
  };
};

export type Handler<TName extends string, TData> = {
  name: TName;
  schema: z.ZodType<TData>;
  jsonSchema: JSONSchema;
  previewData: TData;
  email: (props: TData & { ctx: HandlerContext }) => {
    subject: string;
    body: React.JSX.Element;
  };
};

export function defineHandler<TName extends string, TData>(
  handler: Handler<TName, TData>,
): Handler<TName, TData> {
  return handler;
}
