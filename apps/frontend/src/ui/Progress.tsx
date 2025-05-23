import { clsx } from "clsx";

type ProgressScale = "sm" | "md";

const scaleClasses: Record<ProgressScale, string> = {
  sm: "h-1",
  md: "h-2",
};

export function Progress({
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
}) {
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
}

export function CircleProgress({
  className,
  value,
  max,
  min,
  radius,
  strokeWidth,
}: {
  className?: string;
  value: number;
  max: number;
  min: number;
  radius: number;
  strokeWidth: number;
}) {
  const percent = max > 0 ? Math.min(1, value / max) : 1;

  const circumference = 2 * Math.PI * radius;
  const offset = circumference - percent * circumference;

  return (
    <svg
      className={clsx("-rotate-90", className)}
      width={radius * 2}
      height={radius * 2}
      viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <circle
        className="text-(--mauve-6)"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
      />
      <circle
        className="text-(--violet-9) transition-[stroke-dashoffset]"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="butt"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
      />
    </svg>
  );
}
