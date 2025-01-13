import { HTMLProps } from "react";
import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";
import { useFormContext } from "react-hook-form";

export const FormSuccess = ({
  className,
  children,
  isSuccessful,
  ...props
}: HTMLProps<HTMLDivElement> & { isSuccessful?: boolean }) => {
  const { formState } = useFormContext();
  if (!isSuccessful && !formState.isSubmitSuccessful) {
    return null;
  }
  return (
    <div
      className={clsx(className, "flex items-center gap-2 font-medium")}
      {...props}
    >
      <CheckIcon className="text-success size-4" /> {children}
    </div>
  );
};
