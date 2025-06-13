import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import {
  Checkbox as AriaCheckbox,
  composeRenderProps,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";

export interface CheckboxProps
  extends AriaCheckboxProps,
    React.RefAttributes<HTMLLabelElement> {}

export function Checkbox(props: CheckboxProps) {
  const { ref, className, children, ...rest } = props;
  return (
    <AriaCheckbox
      ref={ref}
      className={composeRenderProps(className, (className) =>
        clsx(
          "group/checkbox flex items-center gap-x-2",
          /* Disabled */
          "data-[disabled]:opacity-disabled",
          className,
        ),
      )}
      {...rest}
    >
      {composeRenderProps(children, (children, renderProps) => (
        <>
          <div
            className={clsx(
              "border-primary flex size-4 shrink-0 items-center justify-center rounded-sm border",
              /* Focus Visible */
              "group-data-[focus-visible]/checkbox:ring-primary group-data-[focus-visible]/checkbox:outline-hidden group-data-[focus-visible]/checkbox:ring-4 group-data-[focus-visible]/checkbox:ring-offset-2",
              /* Selected */
              "group-data-[indeterminate]/checkbox:bg-primary-active group-data-[selected]/checkbox:bg-primary-active group-data-[indeterminate]/checkbox:text-primary group-data-[selected]/checkbox:text-primary",
              /* Disabled */
              "group-data-[disabled]/checkbox:opacity-disabled group-data-[disabled]/checkbox:cursor-not-allowed",
              /* Invalid */
              "group-data-[invalid]/checkbox:border-danger group-data-[invalid]/checkbox:group-data-[selected]/checkbox:bg-danger-subtle group-data-[invalid]/checkbox:group-data-[selected]/checkbox:text-danger-low",
              /* Hover on parent group */
              "group-data-[hovered]/checkbox:border-primary-hover! group-data-[hovered]/checkbox:bg-primary-hover",
              /* Resets */
              "focus:outline-none focus-visible:outline-none",
            )}
          >
            {renderProps.isIndeterminate ? (
              <Minus className="size-4" />
            ) : renderProps.isSelected ? (
              <Check className="size-4" />
            ) : null}
          </div>
          {children}
        </>
      ))}
    </AriaCheckbox>
  );
}
