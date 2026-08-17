import { clsx } from "clsx";
import { ChevronsUpDownIcon } from "lucide-react";

/**
 * The stubby chevron button a breadcrumb hangs its menu from — all that is
 * left of the old menu. The rows and the surface it used to share with
 * `ListBox` live in `menuStyle` now, which the menu kit, the select and the
 * editor's suggestion menus all read.
 */

export type UpDownMenuButtonProps = React.ComponentPropsWithRef<"button">;

/** The stubby chevron button a breadcrumb hangs its menu from. */
export function UpDownMenuButton({
  className,
  ...props
}: UpDownMenuButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "text-low hover:border-hover hover:text-default aria-expanded:bg-active aria-expanded:text-default focus-ring border-thin cursor-default rounded-lg p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </button>
  );
}
