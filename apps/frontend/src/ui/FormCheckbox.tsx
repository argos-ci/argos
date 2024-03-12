import { forwardRef, useId } from "react";
import { clsx } from "clsx";

export const FormCheckbox = forwardRef<
  HTMLInputElement,
  {
    label: React.ReactNode;
  } & React.InputHTMLAttributes<HTMLInputElement>
>(({ className, id: idProp, label, ...props }, ref) => {
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
});
