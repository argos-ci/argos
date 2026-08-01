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
};

// Every variant carries the same wash at rest — `bg-ui` at half opacity over
// whatever is behind it — so the button reads as a target without a frame. The
// color only shows up on hover and while pressed.
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
      "bg-ui/50 data-hovered:border-hover data-hovered:bg-hover/60 text-low aria-pressed:bg-active aria-pressed:text-default data-pressed:bg-active data-pressed:text-default data-focus-visible:ring-default",
    danger:
      "bg-ui/50 data-hovered:border-danger-hover text-danger-low aria-pressed:bg-danger-active data-pressed:bg-danger-active data-focus-visible:ring-danger",
    success:
      "bg-ui/50 data-hovered:border-success-hover text-success-low aria-pressed:bg-success-active data-pressed:bg-success-active data-focus-visible:ring-success",
  },
};

function getIconButtonClassName(options: IconButtonOptions) {
  const { variant = "outline", color = "neutral", size = "medium" } = options;
  const variantClassName = colorClassNames[variant][color];
  return clsx(
    variantClassName,
    /* Group */
    "group-[*]/button-group:rounded-none group-[*]/button-group:first:rounded-l-full group-[*]/button-group:last:rounded-r-full text-xs font-medium",
    /* Size */
    {
      small: "p-[calc(0.3125rem-1px)] *:size-3.5 leading-4 text-sm",
      medium: "p-[calc(0.5rem-1px)] *:size-4 leading-4 text-sm",
    }[size],
    /* Shape */
    "rounded-full",
    /* Base — a hairline edge, from the default border color */
    "flex cursor-default border-thin text-sm",
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
  ...props
}: IconButtonProps) {
  return (
    <RACButton
      {...props}
      className={clsx(
        getIconButtonClassName({ color, variant, size }),
        props.className,
      )}
    />
  );
}
