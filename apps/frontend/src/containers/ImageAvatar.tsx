import { clsx } from "clsx";

export function ImageAvatar(props: {
  ref?: React.Ref<HTMLImageElement>;
  className?: string;
  url: string;
  alt?: string;
}) {
  return (
    <img
      ref={props.ref}
      src={props.url}
      alt={props.alt}
      className={clsx(props.className, "rounded-full")}
    />
  );
}
