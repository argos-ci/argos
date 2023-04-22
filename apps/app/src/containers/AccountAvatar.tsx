import { clsx } from "clsx";
import { forwardRef } from "react";

import { FragmentType, graphql, useFragment } from "@/gql";

import { ImageAvatar } from "./ImageAvatar";

const AvatarFragment = graphql(`
  fragment AccountAvatarFragment on AccountAvatar {
    url(size: 64)
    color
    initial
  }
`);

export type AccountAvatarProps = {
  className?: string;
  size?: number;
  avatar: FragmentType<typeof AvatarFragment>;
};

export const AccountAvatar = forwardRef<any, AccountAvatarProps>(
  (props, ref) => {
    const avatar = useFragment(AvatarFragment, props.avatar);
    const size = props.size ?? 32;
    if (!avatar.url) {
      return (
        <div
          ref={ref}
          className={clsx(
            props.className,
            "flex select-none items-center justify-center rounded-full"
          )}
          style={{
            backgroundColor: avatar.color,
            width: size,
            height: size,
          }}
        >
          <svg width="100%" height="100%" viewBox="-50 -66 100 100">
            <text
              fill="white"
              fontWeight="600"
              textAnchor="middle"
              fontSize="50"
              fontFamily="Inter, sans-serif"
            >
              {avatar.initial}
            </text>
          </svg>
        </div>
      );
    }
    return (
      <ImageAvatar url={avatar.url} size={size} className={props.className} />
    );
  }
);
