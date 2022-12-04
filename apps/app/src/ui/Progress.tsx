import { clsx } from "clsx";

export const Progress = ({
  value,
  max,
  min,
}: {
  value: number;
  max: number;
  min: number;
}) => {
  const percent = Math.min(1, value / max);
  const bg =
    percent === 1
      ? "bg-danger-500"
      : percent > 0.75
      ? "bg-warning-500"
      : "bg-primary-500";

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className="h-2 w-full overflow-hidden rounded-md bg-slate-900"
    >
      <div
        className={clsx(bg, "h-2")}
        style={{
          width: `${percent * 100}%`,
        }}
      />
    </div>
  );
};
