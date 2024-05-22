import { forwardRef, HTMLAttributes, useId } from "react";
import { clsx } from "clsx";

export const FormRadio = forwardRef<
  HTMLInputElement,
  {
    label: React.ReactNode;
  } & React.InputHTMLAttributes<HTMLInputElement>
>(({ className, id: idProp, label, ...props }, ref) => {
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
});

export const FormRadioGroup = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      role="radiogroup"
      aria-orientation="vertical"
      className={clsx(className, "flex flex-col gap-4")}
      {...props}
    />
  );
};
