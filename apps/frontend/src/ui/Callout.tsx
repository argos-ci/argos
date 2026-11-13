import type { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";
import { AlertCircleIcon } from "lucide-react";

export function Callout(props: ComponentPropsWithRef<"div">) {
  const { className, children, ...rest } = props;
  return (
    <div
      className={clsx(
        "bg-pending-subtle text-pending-low flex items-start gap-2 rounded-md p-2 text-xs",
        className,
      )}
      {...rest}
    >
      {/* One line tall, so the icon stays centred on the first line when the text wraps. */}
      <span className="flex h-lh shrink-0 items-center">
        <AlertCircleIcon className="size-3.5" />
      </span>
      <div>{children}</div>
    </div>
  );
}
