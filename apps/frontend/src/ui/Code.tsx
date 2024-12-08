import { clsx } from "clsx";

export function Code(props: React.ComponentPropsWithRef<"code">) {
  return (
    <code
      {...props}
      className={clsx(
        props.className,
        "bg-hover text rounded px-1 py-0.5 text-center font-mono text-[0.8em]",
      )}
    />
  );
}
