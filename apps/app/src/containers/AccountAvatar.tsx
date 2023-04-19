import { clsx } from "clsx";
import { forwardRef } from "react";

interface AccountAvatarProps {
  className?: string;
  account?:
    | { name?: string | null | undefined; slug: string }
    | null
    | undefined;
  size?: number;
}

export const AccountAvatar = forwardRef<any, AccountAvatarProps>(
  ({ account, className, size = 32 }, ref) => {
    if (!account) {
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
        src={`https://github.com/${account.slug}.png?size=60`}
        alt={account.name || account.slug}
        className={clsx(className, "rounded-full")}
        height={size}
        width={size}
      />
    );
  }
);
