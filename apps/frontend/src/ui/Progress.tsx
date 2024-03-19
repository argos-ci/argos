import { clsx } from "clsx";

type ProgressScale = "sm" | "md";

const scaleClasses: Record<ProgressScale, string> = {
  sm: "h-1",
  md: "h-2",
};

export const Progress = ({
  className,
  value,
  max,
  min,
  scale = "md",
}: {
  className?: string;
  value: number;
  max: number;
  min: number;
  scale?: ProgressScale;
}) => {
  const percent = Math.min(1, value / max);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className={clsx(
        "bg-ui w-full overflow-hidden rounded-md",
        scaleClasses[scale],
        className,
      )}
    >
      <div
        className="from-progress-from to-progress-to h-2 bg-gradient-to-r transition-[width]"
        style={{
          width: `${percent * 100}%`,
        }}
      />
    </div>
  );
};
