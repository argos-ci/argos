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

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className="h-2 w-full overflow-hidden rounded-md bg-slate-900"
    >
      <div
        className="h-2 bg-gradient-to-r from-primary-800 to-primary-500"
        style={{
          width: `${percent * 100}%`,
        }}
      />
    </div>
  );
};
