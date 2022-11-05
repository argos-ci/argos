import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { forwardRef, cloneElement, Children, memo } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

export type ButtonColor = "primary" | "neutral";
export type ButtonVariant = "contained" | "outline";

export interface ButtonProps
  extends Omit<AriakitButtonProps<"button">, "className"> {
  color?: ButtonColor;
  variant?: ButtonVariant;
}

const variantClassNames: Record<ButtonVariant, Record<ButtonColor, string>> = {
  contained: {
    primary:
      "color-white border-transparent bg-primary-600 hover:bg-primary-700 active:bg-primary-800 aria-expanded:bg-primary-800",
    neutral:
      "color-white border-transparent bg-neutral-600 hover:bg-neutral-700 active:bg-neutral-800 aria-expanded:bg-neutral-800",
  },
  outline: {
    primary: "color-primary-300 border-primary-300 bg-transparent",
    neutral: "color-neutral-300 border-neutral-300 bg-transparent",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ color = "primary", variant = "contained", children, ...props }, ref) => {
    const colorClassNames = variantClassNames[variant];
    if (!colorClassNames) {
      throw new Error(`Invalid variant: ${variant}`);
    }
    const variantClassName = colorClassNames[color];
    if (!variantClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={`${variantClassName} align-center inline-flex whitespace-nowrap rounded-lg border py-2 px-3 font-sans text-sm font-medium leading-none transition disabled:opacity-70 [&:is(button)]:cursor-default`}
        {...props}
      >
        {children}
      </AriakitButton>
    );
  }
);

export interface ButtonIconProps {
  children: React.ReactElement;
}

export const ButtonIcon = ({ children }: ButtonIconProps) => {
  return cloneElement(Children.only(children), {
    className: "h-[1em] w-[1em] mr-2",
  });
};

export const ButtonArrow = memo(() => {
  return <ChevronDownIcon className="ml-2 mr-[-4px] h-[1em] w-[1em]" />;
});
