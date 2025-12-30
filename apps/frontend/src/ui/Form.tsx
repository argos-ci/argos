import { use } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import type { ErrorCode } from "@argos/error-types";
import {
  SubmitHandler,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { DEFAULT_ERROR_MESSAGE } from "@/util/error";

import { ModalActionContext } from "./Modal";

function unwrapErrors(error: unknown) {
  if (CombinedGraphQLErrors.is(error) && error.errors.length > 0) {
    return error.errors.map((error) => {
      const code =
        typeof error.extensions?.argosErrorCode === "string"
          ? (error.extensions.argosErrorCode as ErrorCode)
          : null;
      if (typeof error.extensions?.field === "string") {
        return { field: error.extensions.field, message: error.message, code };
      }
      if (Array.isArray(error.extensions?.field)) {
        return {
          fields: error.extensions.field as string[],
          message: error.message,
          code,
        };
      }
      return { field: "root.serverError", message: error.message, code };
    });
  }
  return [
    {
      field: "root.serverError",
      message: DEFAULT_ERROR_MESSAGE,
      code: null,
    },
  ];
}

export function Form<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(
  props: Omit<React.ComponentPropsWithRef<"form">, "onSubmit"> & {
    form: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
    onSubmit: SubmitHandler<TTransformedValues>;
  },
) {
  const { ref, onSubmit, autoComplete = "off", form, ...rest } = props;
  const actionContext = use(ModalActionContext);
  return (
    <form
      ref={ref}
      onSubmit={form.handleSubmit(async (data, event) => {
        actionContext?.setIsPending(true);
        try {
          form.clearErrors();
          await onSubmit(data, event);
        } catch (error) {
          handleFormError(form, error);
          if (process.env["NODE_ENV"] === "development") {
            console.error(error);
          }
        } finally {
          actionContext?.setIsPending(false);
        }
      })}
      autoComplete={autoComplete}
      {...rest}
    />
  );
}

/**
 * Handle form errors by unwrapping them and setting them in the form state.
 */
export function handleFormError(
  form: UseFormReturn<any, any, any>,
  error: unknown,
) {
  const errors = unwrapErrors(error);
  errors.forEach((error) => {
    const fields = error.fields ?? [error.field];
    fields.forEach((field) => {
      form.setError(field, {
        type: error.code ?? "manual",
        message: error.message,
      });
    });
  });
}
