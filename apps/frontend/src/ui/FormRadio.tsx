import { ComponentPropsWithRef, useId } from "react";
import { clsx } from "clsx";

export function FormRadio({
  className,
  id: idProp,
  label,
  ...props
}: ComponentPropsWithRef<"input"> & {
  label: React.ReactNode;
}) {
  const genId = useId();
  const id = idProp ?? genId;
  return (
    <div className={clsx(className, "flex gap-2")}>
      <input type="radio" id={id} {...props} />
      <label htmlFor={id} className="inline-block select-none font-medium">
        {label}
      </label>
    </div>
  );
}

export function FormRadioGroup({
  className,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "role" | "aria-orientation">) {
  return (
    <div
      role="radiogroup"
      aria-orientation="vertical"
      className={clsx(className, "flex flex-col gap-4")}
      {...props}
    />
  );
}
