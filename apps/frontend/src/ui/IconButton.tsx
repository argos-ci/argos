import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
} from "react-aria-components";

type IconButtonVariant = "contained" | "outline";
type IconButtonColor = "danger" | "success" | "neutral";
type IconButtonSize = "small" | "medium";

type IconButtonOptions = {
  variant?: IconButtonVariant;
  color?: IconButtonColor;
  size?: IconButtonSize;
  /** Render as a circle instead of the default rounded square. */
  rounded?: boolean;
};

const colorClassNames: Record<
  IconButtonVariant,
  Record<IconButtonColor, string>
> = {
  contained: {
    neutral:
      "data-hovered:border-hover data-hovered:bg-ui text-low data-hovered:text-default bg-ui/60 data-focus-visible:ring-default data-pressed:bg-active data-pressed:text-default aria-pressed:bg-active aria-pressed:text-default",
    danger: "", // not used
    success: "", // not used
  },
  outline: {
    neutral:
      "data-hovered:border-hover text-low aria-pressed:bg-active aria-pressed:text-default data-pressed:bg-active data-pressed:text-default data-focus-visible:ring-default",
    danger:
      "data-hovered:border-danger-hover text-danger-low aria-pressed:bg-danger-active data-pressed:bg-danger-active data-focus-visible:ring-danger",
    success:
      "data-hovered:border-success-hover text-success-low aria-pressed:bg-success-active data-pressed:bg-success-active data-focus-visible:ring-success",
  },
};

function getIconButtonClassName(options: IconButtonOptions) {
  const {
    variant = "outline",
    color = "neutral",
    size = "medium",
    rounded = false,
  } = options;
  const variantClassName = colorClassNames[variant][color];
  return clsx(
    variantClassName,
    /* Group */
    "group-[*]/button-group:rounded-none group-[*]/button-group:first:rounded-l-lg group-[*]/button-group:last:rounded-r-lg text-xs font-medium",
    /* Size */
    {
      small: "p-[calc(0.3125rem-1px)] *:size-3.5 leading-4 text-sm",
      medium: "p-[calc(0.5rem-1px)] *:size-4 leading-4 text-sm",
    }[size],
    /* Shape */
    rounded
      ? "rounded-full"
      : { small: "rounded-md", medium: "rounded-lg" }[size],
    /* Base */
    "flex cursor-default border border-transparent text-sm",
    /* Disabled, including the not-really-disabled `aria-disabled` style */
    "data-disabled:opacity-disabled aria-disabled:opacity-disabled aria-disabled:cursor-not-allowed",
    /* Focus */
    "focus:outline-hidden data-focus-visible:ring-4",
  );
}

export type IconButtonProps = RACButtonProps &
  IconButtonOptions & {
    ref?: React.Ref<HTMLButtonElement>;
  };

export function IconButton({
  color,
  variant,
  size,
  rounded,
  ...props
}: IconButtonProps) {
  return (
    <RACButton
      {...props}
      className={clsx(
        getIconButtonClassName({ color, variant, size, rounded }),
        props.className,
      )}
    />
  );
}
