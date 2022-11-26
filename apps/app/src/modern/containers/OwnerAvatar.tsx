import { forwardRef, HTMLAttributes } from "react";

interface OwnerAvatarProps extends HTMLAttributes<HTMLDivElement> {
  owner?: { name: string; login: string } | null | undefined;
}

export const OwnerAvatar = forwardRef<
  HTMLDivElement | HTMLImageElement,
  OwnerAvatarProps
>(({ owner, className, ...props }, ref) => {
  if (!owner) {
    return (
      <div
        ref={ref}
        className={`${className} h-8 w-8 rounded-full bg-slate-900`}
        {...props}
      />
    );
  }
  return (
    <img
      src={`https://github.com/${owner.login}.png?size=60`}
      alt={owner.name}
      className={`${className} rounded-full`}
      height={32}
      width={32}
      {...props}
    />
  );
});
