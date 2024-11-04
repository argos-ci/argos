import { forwardRef } from "react";
import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

type IconButtonVariant = "contained" | "outline";
type IconButtonColor = "danger" | "success" | "neutral";
type IconButtonSize = "small" | "medium";

type IconButtonOptions = {
  variant?: IconButtonVariant;
  color?: IconButtonColor;
  size?: IconButtonSize;
};

const colorClassNames: Record<
  IconButtonVariant,
  Record<IconButtonColor, string>
> = {
  contained: {
    neutral:
      "data-[hovered]:border-hover data-[hovered]:bg-ui text-low data-[hovered]:text bg-ui/60 data-[focus-visible]:ring-default",
    danger: "", // not used
    success: "", // not used
  },
  outline: {
    neutral:
      "data-[hovered]:border-hover text-low aria-pressed:bg-active aria-pressed:text data-[pressed]:bg-active data-[pressed]:text data-[focus-visible]:ring-default",
    danger:
      "data-[hovered]:border-danger-hover text-danger-low aria-pressed:bg-danger-active data-[pressed]:bg-danger-active data-[focus-visible]:ring-danger",
    success:
      "data-[hovered]:border-success-hover text-success-low aria-pressed:bg-success-active data-[pressed]:bg-success-active data-[focus-visible]:ring-success",
  },
};

function getIconButtonClassName(options: IconButtonOptions) {
  const { variant = "outline", color = "neutral", size = "medium" } = options;
  const variantClassName = colorClassNames[variant][color];
  return clsx(
    variantClassName,
    /* Group */
    "group-[]/button-group:rounded-none group-[]/button-group:first:rounded-l-lg group-[]/button-group:last:rounded-r-lg",
    /* Size */
    {
      small: "p-[calc(0.25rem-1px)] *:size-4 rounded-md leading-4 text-sm",
      medium: "p-[calc(0.5rem-1px)] *:size-4 rounded-lg leading-4 text-sm",
    }[size],
    /* Base */
    "data-[disabled]:opacity-disabled flex cursor-default border border-transparent text-sm",
    /* Focus */
    "focus:outline-none data-[focus-visible]:ring-4",
  );
}

type IconButtonProps = RACButtonProps & IconButtonOptions;

export const IconButton = forwardRef(function IconButton(
  { className, color, variant, size, ...props }: IconButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  return (
    <RACButton
      ref={ref}
      className={clsx(
        getIconButtonClassName({ color, variant, size }),
        className,
      )}
      {...props}
    />
  );
});

type IconButtonLinkProps = RACLinkProps & IconButtonOptions;

export const IconButtonLink = forwardRef(function IconButtonLink(
  { className, color, variant, ...props }: IconButtonLinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>,
) {
  return (
    <RACLink
      ref={ref}
      className={clsx(getIconButtonClassName({ color, variant }), className)}
      {...props}
    />
  );
});
