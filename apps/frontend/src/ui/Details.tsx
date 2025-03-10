import { useRef } from "react";
import clsx from "clsx";
import { ChevronRightIcon } from "lucide-react";
import { usePress } from "react-aria";

export function Details(props: React.ComponentPropsWithRef<"details">) {
  return (
    <details {...props} className={clsx("group/details", props.className)} />
  );
}

export function Summary(props: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { pressProps, isPressed } = usePress({
    onPress: () => {
      if (ref.current) {
        const parentDetails = ref.current.parentElement;
        if (!parentDetails) {
          return;
        }

        const open = parentDetails.getAttribute("open") !== null;
        if (open) {
          parentDetails.removeAttribute("open");
        } else {
          parentDetails.setAttribute("open", "");
        }
      }
    },
  });
  return (
    <summary
      ref={ref}
      className={clsx(
        "hover:bg-hover data-[pressed]:bg-active -mx-1 flex cursor-default list-none items-center gap-1.5 rounded-sm px-1 py-0.5 font-medium transition group-open/details:mb-2",
        props.className,
      )}
      data-pressed={isPressed ? "" : undefined}
      {...pressProps}
      onClick={(event) => {
        event.preventDefault();
        pressProps.onClick?.(event);
      }}
    >
      <ChevronRightIcon className="size-[1em] transition group-open/details:rotate-90" />
      {props.children}
    </summary>
  );
}
