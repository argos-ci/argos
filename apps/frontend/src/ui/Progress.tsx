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
      className="h-2 w-full overflow-hidden rounded-md bg-ui"
    >
      <div
        className="h-2 bg-gradient-to-r from-violet-10 to-violet-10/80"
        style={{
          width: `${percent * 100}%`,
        }}
      />
    </div>
  );
};
