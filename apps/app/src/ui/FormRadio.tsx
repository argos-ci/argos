import { clsx } from "clsx";
import { HTMLAttributes, forwardRef, useId } from "react";

export type FormRadioProps = {
  label: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const FormRadio = forwardRef<HTMLInputElement, FormRadioProps>(
  ({ className, id: idProp, label, ...props }, ref) => {
    const genId = useId();
    const id = idProp ?? genId;
    return (
      <div className={clsx(className, "flex gap-2")}>
        <input ref={ref} type="radio" id={id} {...props} />
        <label htmlFor={id} className="inline-block select-none font-medium">
          {label}
        </label>
      </div>
    );
  },
);

export const FormRadioGroup = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return <div className={clsx(className, "flex flex-col gap-4")} {...props} />;
};
