import { forwardRef } from "react";

export const Burger = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>((props, ref) => {
  return (
    <button ref={ref} className="burger-menu" {...props}>
      <span />
      <span />
      <span />
    </button>
  );
});
