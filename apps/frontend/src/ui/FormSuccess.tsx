import { HTMLProps } from "react";
import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";
import { useFormContext } from "react-hook-form";

export const FormSuccess = ({
  className,
  children,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  const { formState } = useFormContext();
  if (!formState.isSubmitSuccessful) {
    return null;
  }
  return (
    <div
      className={clsx(className, "flex items-center gap-2 font-medium")}
      {...props}
    >
      <CheckIcon className="text-success-500 size-4" /> {children}
    </div>
  );
};
