import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { cloneElement, forwardRef } from "react";

export type IconButtonVariant = "contained" | "outline";
export type IconButtonColor = "danger" | "neutral";

export type IconButtonProps = Omit<
  AriakitButtonProps<"button">,
  "className" | "children"
> & {
  color?: IconButtonColor;
  variant?: IconButtonVariant;
  children: React.ReactNode;
  asChild?: boolean;
};

const colorClassNames: Record<
  IconButtonVariant,
  Record<IconButtonColor, string>
> = {
  contained: {
    neutral:
      "hover:border-hover hover:bg-ui text-low hover:text bg-ui/60 focus-visible:ring-default",
    danger: "", // not used
  },
  outline: {
    neutral:
      "hover:border-hover text-low aria-pressed:bg-active aria-pressed:text focus-visible:ring-default",
    danger:
      "hover:border-danger-hover text-danger-low aria-pressed:bg-danger-active focus-visible:ring-danger",
  },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { color = "neutral", variant = "outline", children, asChild, ...props },
    ref,
  ) => {
    const variantClassName = colorClassNames[variant][color];
    if (!variantClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={clsx(
          variantClassName,
          /* Group */
          "group-[]/button-group:rounded-none group-[]/button-group:first:rounded-l-lg group-[]/button-group:last:rounded-r-lg",
          /* Base */
          "flex h-8 cursor-default items-center gap-2 rounded-lg border border-transparent p-[7px] text-sm transition disabled:opacity-disabled [&>*]:h-4 [&>*]:w-4",
          /* Focus */
          "focus:outline-none focus-visible:ring-4",
        )}
        {...props}
      >
        {asChild
          ? (p) => cloneElement(children as React.ReactElement, p)
          : children}
      </AriakitButton>
    );
  },
);
