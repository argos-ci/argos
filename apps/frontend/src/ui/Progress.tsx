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
  color,
}: {
  className?: string;
  value: number;
  max: number;
  min: number;
  scale?: ProgressScale;
  color?: string;
}) {
  const percent = Math.min(1, value / max);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className={clsx(
        "bg-ui overflow-hidden rounded-md",
        scaleClasses[scale],
        className,
      )}
    >
      <div
        className="from-progress-from to-progress-to h-2 bg-gradient-to-r transition-[width]"
        style={{
          width: `${percent * 100}%`,
          background: color,
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
  color = "var(--violet-9)",
  title,
}: {
  className?: string;
  value: number;
  max: number;
  min: number;
  radius: number;
  strokeWidth: number;
  color?: string;
  title?: string;
}) {
  const percent = max > 0 ? Math.min(1, value / max) : 1;

  const circumference = 2 * Math.PI * radius;
  const offset = circumference - percent * circumference;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <title>{title}</title>
      <g
        transform={`rotate(-90, ${radius + strokeWidth}, ${radius + strokeWidth})`}
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
          className="transition-[stroke-dashoffset]"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
        />
      </g>
    </svg>
  );
}
