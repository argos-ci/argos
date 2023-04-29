import { ApolloError } from "@apollo/client";
import { SubmitHandler, useFormContext } from "react-hook-form";

export type FormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  onSubmit: SubmitHandler<any>;
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
      message: "Something went wrong. Please try again.",
    },
  ];
};

export const Form = ({
  onSubmit,
  autoComplete = "off",
  ...props
}: FormProps) => {
  const { handleSubmit, clearErrors, setError } = useFormContext();
  return (
    <form
      onSubmit={handleSubmit(async (data, event) => {
        try {
          clearErrors();
          await onSubmit(data, event);
        } catch (error) {
          const errors = unwrapErrors(error);
          errors.forEach((error) => {
            setError(error.field, {
              type: "manual",
              message: error.message,
            });
          });
        }
      })}
      autoComplete={autoComplete}
      {...props}
    />
  );
};
