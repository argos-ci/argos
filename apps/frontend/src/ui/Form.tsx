import { ApolloError } from "@apollo/client";
import {
  SubmitHandler,
  useFormContext,
  type UseFormReturn,
} from "react-hook-form";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const getGraphQLErrorMessage = (error: unknown): string => {
  if (error instanceof ApolloError && error.graphQLErrors[0]) {
    return error.graphQLErrors[0].message ?? DEFAULT_ERROR_MESSAGE;
  }
  return DEFAULT_ERROR_MESSAGE;
};

const unwrapErrors = (error: unknown) => {
  if (error instanceof ApolloError && error.graphQLErrors.length > 0) {
    return error.graphQLErrors.map((error) => {
      if (typeof error.extensions?.field === "string") {
        return { field: error.extensions.field, message: error.message };
      }
      return { field: "root.serverError", message: error.message };
    });
  }
  return [
    {
      field: "root.serverError",
      message: DEFAULT_ERROR_MESSAGE,
    },
  ];
};

export function Form({
  ref,
  onSubmit,
  autoComplete = "off",
  ...props
}: Omit<React.ComponentPropsWithRef<"form">, "onSubmit"> & {
  onSubmit: SubmitHandler<any>;
}) {
  const form = useFormContext();
  return (
    <form
      ref={ref}
      onSubmit={form.handleSubmit(async (data, event) => {
        try {
          form.clearErrors();
          await onSubmit(data, event);
        } catch (error) {
          handleFormError(form, error);
        }
      })}
      autoComplete={autoComplete}
      {...props}
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
    form.setError(error.field, {
      type: "manual",
      message: error.message,
    });
  });
}
