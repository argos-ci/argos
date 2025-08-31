import type { RefAttributes } from "react";
import { clsx } from "clsx";
import { ExternalLinkIcon } from "lucide-react";
import {
  Button,
  Link as RACLink,
  LinkProps as RACLinkProps,
  type ButtonProps,
} from "react-aria-components";

type LinkProps = RACLinkProps & {
  ref?: React.Ref<HTMLAnchorElement>;
  external?: boolean;
};

export type HeadlessLinkProps = LinkProps;

export function HeadlessLink({
  ref,
  target,
  children,
  external,
  className,
  ...props
}: LinkProps) {
  const isExternal =
    external !== undefined
      ? external
      : typeof children !== "function" && target === "_blank";
  return (
    <RACLink
      ref={ref}
      className={clsx("rac-focus", className)}
      target={target}
      {...props}
    >
      {isExternal
        ? (props) => (
            <>
              {typeof children === "function" ? children(props) : children}
              <ExternalLinkIcon className="mb-0.5 ml-1 inline size-[1em]" />
            </>
          )
        : children}
    </RACLink>
  );
}

const linkClassName =
  "text-primary-low rac-focus no-underline hover:underline cursor-pointer";

export function LinkButton({
  className,
  ...props
}: ButtonProps & RefAttributes<HTMLButtonElement>) {
  return <Button className={clsx(linkClassName, className)} {...props} />;
}

export function Link({ ref, className, ...props }: LinkProps) {
  return (
    <HeadlessLink
      ref={ref}
      className={clsx(linkClassName, className)}
      {...props}
    />
  );
}
