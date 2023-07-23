import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { cloneElement, forwardRef } from "react";

export type IconButtonVariant = "contained" | "outline";
export type IconButtonColor = "primary" | "danger" | "success" | "neutral";

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
    primary:
      "hover:text-icon-button-primary-hover-on hover:border-icon-button-primary-hover-border text-icon-button-primary-hover-on bg-icon-button-primary-active-bg/70",
    neutral:
      "hover:text-icon-button-neutral-hover-on hover:border-icon-button-neutral-hover-border text-icon-button-neutral-hover-on bg-icon-button-neutral-active-bg/70",
    success:
      "hover:text-icon-button-success-hover-on hover:border-icon-button-success-hover-border text-icon-button-success-hover-on bg-icon-button-success-active-bg/70",
    danger:
      "hover:text-icon-button-danger-hover-on hover:border-icon-button-danger-hover-border text-icon-button-danger-hover-on bg-icon-button-danger-active-bg/70",
  },
  outline: {
    primary:
      "hover:text-icon-button-primary-hover-on hover:border-icon-button-primary-hover-border aria-pressed:text-icon-button-primary-hover-on aria-pressed:bg-icon-button-primary-active-bg",
    neutral:
      "hover:text-icon-button-neutral-hover-on hover:border-icon-button-neutral-hover-border aria-pressed:text-icon-button-neutral-hover-on aria-pressed:bg-icon-button-neutral-active-bg",
    success:
      "hover:text-icon-button-success-hover-on hover:border-icon-button-success-hover-border aria-pressed:text-icon-button-success-hover-on aria-pressed:bg-icon-button-success-active-bg",
    danger:
      "hover:text-icon-button-danger-hover-on hover:border-icon-button-danger-hover-border aria-pressed:text-icon-button-danger-hover-on aria-pressed:bg-icon-button-danger-active-bg",
  },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { color = "neutral", variant = "outline", children, asChild, ...props },
    ref
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
          "flex h-8 cursor-default items-center gap-2 rounded-lg border border-transparent p-[7px] text-sm text-icon-button-on transition disabled:opacity-disabled [&>*]:h-4 [&>*]:w-4"
        )}
        {...props}
      >
        {asChild
          ? (p) => cloneElement(children as React.ReactElement, p)
          : children}
      </AriakitButton>
    );
  }
);
