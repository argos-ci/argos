import { clsx } from "clsx";
import { forwardRef, useId } from "react";

export type FormCheckboxProps = {
  label: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ className, id: idProp, label, ...props }, ref) => {
    const genId = useId();
    const id = idProp ?? genId;
    return (
      <div className={clsx(className, "flex gap-2")}>
        <input ref={ref} type="checkbox" id={id} {...props} />
        <label htmlFor={id} className="inline-block select-none font-medium">
          {label}
        </label>
      </div>
    );
  }
);
