import { clsx } from "clsx";

type RadioScale = "base" | "large";

const scaleClassNames: Record<RadioScale, string> = {
  large: "text-lg",
  base: "text-base",
};

export function RadioField({
  label,
  children,
  scale = "base",
  ...props
}: React.ComponentPropsWithRef<"input"> & {
  label: string;
  value: string;
  scale?: RadioScale;
  children: React.ReactNode;
}) {
  const scaleClassName = scaleClassNames[scale];
  return (
    <label className="flex items-baseline gap-4 text-left">
      <input type="radio" className="peer" {...props} />
      <div className="hover:border-default peer-checked:border-active border-l px-2">
        <div className={clsx(scaleClassName, "font-semibold")}>{label}</div>
        <p>{children}</p>
      </div>
    </label>
  );
}
