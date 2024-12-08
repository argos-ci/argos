import { clsx } from "clsx";

export function ImageAvatar(props: {
  ref?: React.Ref<HTMLImageElement>;
  className?: string;
  size?: number;
  url: string;
}) {
  const size = props.size ?? 32;
  return (
    <img
      ref={props.ref}
      src={props.url}
      alt=""
      className={clsx(props.className, "rounded-full")}
      height={size}
      width={size}
    />
  );
}
