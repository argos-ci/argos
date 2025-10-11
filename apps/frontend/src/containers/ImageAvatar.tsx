import { clsx } from "clsx";

export function ImageAvatar(props: {
  ref?: React.Ref<HTMLImageElement>;
  className?: string;
  src: string;
  alt?: string;
}) {
  const { ref, ...rest } = props;
  return (
    <img ref={ref} {...rest} className={clsx(rest.className, "rounded-full")} />
  );
}
