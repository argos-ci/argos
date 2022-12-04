import { clsx } from "clsx";
import { forwardRef } from "react";

interface OwnerAvatarProps {
  className?: string;
  owner?: { name: string | null; login: string } | null | undefined;
  size?: number;
}

export const OwnerAvatar = forwardRef<any, OwnerAvatarProps>(
  ({ owner, className, size = 32 }, ref) => {
    if (!owner) {
      return (
        <div
          ref={ref}
          className={clsx(className, "rounded-full bg-slate-900")}
          style={{
            width: size,
            height: size,
          }}
        />
      );
    }
    return (
      <img
        ref={ref}
        src={`https://github.com/${owner.login}.png?size=60`}
        alt={owner.name || owner.login}
        className={clsx(className, "rounded-full")}
        height={size}
        width={size}
      />
    );
  }
);
