import { clsx } from "clsx";

export const Progress = ({
  className,
  value,
  max,
  min,
}: {
  className?: string;
  value: number;
  max: number;
  min: number;
}) => {
  const percent = Math.min(1, value / max);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className={clsx("h-2 w-full overflow-hidden rounded-md bg-ui", className)}
    >
      <div
        className="h-2 bg-gradient-to-r from-progress-from to-progress-to"
        style={{
          width: `${percent * 100}%`,
        }}
      />
    </div>
  );
};
