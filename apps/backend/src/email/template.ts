import type { z } from "zod";

export type EmailTemplate<TType extends string = string, TData = any> = {
  type: TType;
  schema: z.ZodType<TData>;
  previewData: TData;
  email: (props: TData) => {
    subject: string;
    body: React.JSX.Element;
  };
};

export function defineEmailTemplate<TName extends string, TData>(
  template: EmailTemplate<TName, TData>,
): EmailTemplate<TName, TData> {
  return template;
}
