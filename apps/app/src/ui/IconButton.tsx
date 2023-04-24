import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { forwardRef } from "react";

export type IconButtonColor = "primary" | "danger" | "success" | "neutral";

export type IconButtonProps = Omit<
  AriakitButtonProps<"button">,
  "className" | "children"
> & {
  color?: IconButtonColor;
  children: React.ReactNode;
};

const colorClassNames: Record<IconButtonColor, string> = {
  primary:
    "hover:text-icon-button-primary-hover-on hover:border-icon-button-primary-hover-border aria-pressed:text-icon-button-primary-hover-on aria-pressed:bg-icon-button-primary-active-bg",
  neutral:
    "hover:text-icon-button-neutral-hover-on hover:border-icon-button-neutral-hover-border aria-pressed:text-icon-button-neutral-hover-on aria-pressed:bg-icon-button-neutral-active-bg",
  success:
    "hover:text-icon-button-success-hover-on hover:border-icon-button-success-hover-border aria-pressed:text-icon-button-success-hover-on aria-pressed:bg-icon-button-success-active-bg",
  danger:
    "hover:text-icon-button-danger-hover-on hover:border-icon-button-danger-hover-border aria-pressed:text-icon-button-danger-hover-on aria-pressed:bg-icon-button-danger-active-bg",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ color = "neutral", children, ...props }, ref) => {
    const variantClassName = colorClassNames[color];
    if (!variantClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={clsx(
          variantClassName,
          "flex cursor-default items-center rounded-lg border border-transparent p-[7px] text-sm text-icon-button-on transition disabled:opacity-70 [&>*]:h-4 [&>*]:w-4"
        )}
        {...props}
      >
        {children}
      </AriakitButton>
    );
  }
);
