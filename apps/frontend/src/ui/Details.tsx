import { useRef } from "react";
import clsx from "clsx";
import { ChevronRightIcon } from "lucide-react";
import { usePress } from "react-aria";

export function Details(props: React.ComponentPropsWithRef<"details">) {
  return (
    <details {...props} className={clsx("group/details", props.className)} />
  );
}

// `[details[open]>summary_&]` instead of `group-open/details`: nested
// disclosures share that group name, so an open ancestor would also rotate the
// chevron of a closed child.
const chevronClassName =
  "size-[1em] shrink-0 transition [details[open]>summary_&]:rotate-90";

export function Summary(props: {
  className?: string;
  children: React.ReactNode;
  /**
   * Icon shown in place of the chevron, which then only appears while the row
   * is hovered. Use it when an icon already says what the section is about: the
   * row keeps that meaning at rest and still says it can be toggled.
   */
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { icon: Icon } = props;
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
        "group/summary hover:bg-hover data-pressed:bg-active -mx-1 flex cursor-default list-none items-center gap-1.5 rounded-sm px-1 py-0.5 font-medium transition group-open/details:mb-2",
        props.className,
      )}
      data-pressed={isPressed ? "" : undefined}
      {...pressProps}
      onClick={(event) => {
        event.preventDefault();
        pressProps.onClick?.(event);
      }}
    >
      {Icon ? (
        // The two icons share one slot so swapping them on hover does not move
        // the label.
        <span className="text-low relative size-[1em] shrink-0">
          <Icon className="size-full transition group-hover/summary:opacity-0" />
          <ChevronRightIcon
            className={clsx(
              chevronClassName,
              "absolute inset-0 size-full opacity-0 group-hover/summary:opacity-100",
            )}
          />
        </span>
      ) : (
        <ChevronRightIcon className={clsx(chevronClassName, "text-low")} />
      )}
      {props.children}
    </summary>
  );
}
