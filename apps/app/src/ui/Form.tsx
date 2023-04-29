import { SubmitHandler, useFormContext } from "react-hook-form";

export type FormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  onSubmit: SubmitHandler<any>;
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
          setError("root.serverError", {
            type: "manual",
            message: "Something went wrong. Please try again.",
          });
        }
      })}
      autoComplete={autoComplete}
      {...props}
    />
  );
};
