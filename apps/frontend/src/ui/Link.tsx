import {
  createContext,
  use,
  type HTMLAttributeAnchorTarget,
  type RefAttributes,
} from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ExternalLinkIcon } from "lucide-react";
import {
  Button,
  Link as RACLink,
  LinkProps as RACLinkProps,
  type ButtonProps,
} from "react-aria-components";

export type HeadlessLinkProps = RACLinkProps & {
  ref?: React.Ref<HTMLAnchorElement>;
  external?: boolean;
};

const LinkContext = createContext<boolean>(false);

export function HeadlessLink({
  ref,
  target,
  children,
  external,
  className,
  ...props
}: HeadlessLinkProps) {
  const inLink = use(LinkContext);
  if (inLink) {
    invariant(typeof children !== "function");
    return (
      <FakeLink
        className={clsx("rac-focus", className)}
        href={props.href}
        target={target}
      >
        {children}
      </FakeLink>
    );
  }
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
      {(props) => {
        const content =
          typeof children === "function" ? children(props) : children;
        return (
          <LinkContext value>
            {isExternal ? (
              <>
                {content}
                <ExternalLinkIcon className="mb-0.5 ml-1 inline size-[1em]" />
              </>
            ) : (
              content
            )}
          </LinkContext>
        );
      }}
    </RACLink>
  );
}

function getLinkClassName(props: Pick<LinkProps, "variant">) {
  const { variant = "primary" } = props;
  return clsx(
    "rac-focus no-underline hover:underline cursor-pointer",
    { neutral: "text-low", primary: "text-primary-low" }[variant],
  );
}

export function LinkButton({
  className,
  variant,
  ...props
}: ButtonProps &
  RefAttributes<HTMLButtonElement> &
  Pick<LinkProps, "variant">) {
  return (
    <Button
      className={clsx(getLinkClassName({ variant }), className)}
      {...props}
    />
  );
}

type LinkProps = HeadlessLinkProps & {
  /**
   * @default "primary"
   */
  variant?: "primary" | "neutral";
};

export function Link({ ref, className, variant, ...props }: LinkProps) {
  return (
    <HeadlessLink
      ref={ref}
      className={clsx(getLinkClassName({ variant }), className)}
      {...props}
    />
  );
}

function FakeLink({
  ref,
  href,
  target = "_self",
  ...props
}: React.ComponentPropsWithRef<"span"> & {
  href: string | undefined;
  target?: HTMLAttributeAnchorTarget;
}) {
  if (!href) {
    return <span ref={ref} {...props} />;
  }
  return (
    <span
      ref={ref}
      role="link"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault();
        window.open(href, target)?.focus();
      }}
      {...props}
    />
  );
}
