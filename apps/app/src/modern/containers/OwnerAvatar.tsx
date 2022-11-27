import { forwardRef, HTMLAttributes } from "react";
import { clsx } from "clsx";

interface OwnerAvatarProps extends HTMLAttributes<HTMLDivElement> {
  owner?: { name: string; login: string } | null | undefined;
  size?: number;
}

export const OwnerAvatar = forwardRef<
  HTMLDivElement | HTMLImageElement,
  OwnerAvatarProps
>(({ owner, className, size = 32, ...props }, ref) => {
  if (!owner) {
    return (
      <div
        ref={ref}
        className={clsx(className, "rounded-full bg-slate-900")}
        style={{
          width: size,
          height: size,
        }}
        {...props}
      />
    );
  }
  return (
    <img
      src={`https://github.com/${owner.login}.png?size=60`}
      alt={owner.name}
      className={clsx(className, "rounded-full")}
      height={size}
      width={size}
      {...props}
    />
  );
});
