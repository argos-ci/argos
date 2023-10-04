import { Radio, RadioGroup, useRadioState } from "ariakit/radio";
import { clsx } from "clsx";
import { forwardRef } from "react";

export { Radio, RadioGroup, useRadioState };

export type RadioScale = "base" | "large";

export type RadioFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  value: string;
  scale?: RadioScale;
  children: React.ReactNode;
};

const scaleClassNames: Record<RadioScale, string> = {
  large: "text-lg",
  base: "text-base",
};

export const RadioField = forwardRef<HTMLInputElement, RadioFieldProps>(
  ({ label, value, children, scale = "base", ...props }, ref) => {
    const scaleClassName = scaleClassNames[scale];
    if (!scaleClassName) {
      throw new Error(`Invalid scale: ${scale}`);
    }
    return (
      <label className="flex items-baseline gap-4 text-left">
        <Radio ref={ref} value={value} className="peer" {...props} />
        <div className="border-l px-2 hover:border-on-light peer-checked:border-on">
          <div className={clsx(scaleClassName, "font-semibold")}>{label}</div>
          <p>{children}</p>
        </div>
      </label>
    );
  },
);
