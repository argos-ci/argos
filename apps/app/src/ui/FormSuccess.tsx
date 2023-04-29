import { CheckIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { HTMLProps } from "react";
import { useFormContext } from "react-hook-form";

export type FormSuccessProps = HTMLProps<HTMLDivElement>;

export const FormSuccess = ({
  className,
  children,
  ...props
}: FormSuccessProps) => {
  const { formState } = useFormContext();
  if (!formState.isSubmitSuccessful) return null;
  return (
    <div
      className={clsx(className, "flex items-center gap-2 font-medium")}
      {...props}
    >
      <CheckIcon className="h-4 w-4 text-success-500" /> {children}
    </div>
  );
};
