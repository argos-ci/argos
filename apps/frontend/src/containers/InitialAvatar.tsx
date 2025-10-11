import { clsx } from "clsx";

export function InitialAvatar(props: {
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
  color: string;
  initial: string;
  alt?: string;
}) {
  const { ref } = props;
  return (
    <div
      ref={ref}
      className={clsx(
        props.className,
        "relative flex select-none items-center justify-center rounded-full",
      )}
      style={{
        backgroundColor: props.color,
      }}
      role="img"
      aria-label={props.alt}
    >
      <svg width="100%" height="100%" viewBox="-50 -66 100 100">
        <text
          fill="white"
          fontWeight="600"
          textAnchor="middle"
          fontSize="50"
          fontFamily="Inter, sans-serif"
        >
          {props.initial}
        </text>
      </svg>
    </div>
  );
}
