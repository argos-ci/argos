import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import {
  Checkbox as AriaCheckbox,
  composeRenderProps,
  type CheckboxProps,
} from "react-aria-components";

export const Checkbox = ({ className, children, ...props }: CheckboxProps) => (
  <AriaCheckbox
    className={composeRenderProps(className, (className) =>
      clsx(
        "group/checkbox flex items-center gap-x-2",
        /* Disabled */
        "data-[disabled]:opacity-disabled",
        className,
      ),
    )}
    {...props}
  >
    {composeRenderProps(children, (children, renderProps) => (
      <>
        <div
          className={clsx(
            "border-primary flex size-4 shrink-0 items-center justify-center rounded-sm border text-current",
            /* Focus Visible */
            "group-data-[focus-visible]/checkbox:ring-primary group-data-[focus-visible]/checkbox:outline-hidden group-data-[focus-visible]/checkbox:ring-4 group-data-[focus-visible]/checkbox:ring-offset-2",
            /* Selected */
            "group-data-[indeterminate]/checkbox:bg-primary group-data-[selected]/checkbox:bg-primary group-data-[indeterminate]/checkbox:text-primary group-data-[selected]/checkbox:text-primary",
            /* Disabled */
            "group-data-[disabled]/checkbox:cursor-not-allowed group-data-[disabled]/checkbox:opacity-50",
            /* Invalid */
            "group-data-[invalid]/checkbox:border-danger-low group-data-[invalid]/checkbox:group-data-[selected]/checkbox:bg-danger-low group-data-[invalid]/checkbox:group-data-[selected]/checkbox:text-danger-low",
            /* Hover on parent group */
            "group-hover/checkbox:border-primary-hover group-hover/checkbox:bg-primary-hover",
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
