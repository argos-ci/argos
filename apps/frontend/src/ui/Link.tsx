import {
  createContext,
  use,
  type ComponentPropsWithRef,
  type HTMLAttributeAnchorTarget,
} from "react";
import { clsx } from "clsx";
import { ExternalLinkIcon } from "lucide-react";

import { RouterLink } from "./RouterLink";

export type HeadlessLinkProps = ComponentPropsWithRef<"a"> & {
  external?: boolean;
};

/**
 * Whether we are already inside a link. An anchor nested in an anchor is
 * invalid HTML — the parser closes the outer one at the inner one's tag — so a
 * link that finds itself inside another renders as a {@link FakeLink}.
 */
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
  const isExternal = external ?? target === "_blank";

  if (inLink || !props.href) {
    return (
      <FakeLink
        className={clsx("focus-ring", className)}
        href={props.href}
        target={target}
        isExternal={isExternal}
      >
        {children}
      </FakeLink>
    );
  }
  return (
    <LinkContext value>
      <RouterLink
        ref={ref}
        className={clsx("focus-ring", className)}
        target={target}
        {...props}
      >
        {isExternal ? <ExternalContent>{children}</ExternalContent> : children}
      </RouterLink>
    </LinkContext>
  );
}

/**
 * The content of an external link, with the indicator icon glued to it.
 *
 * Glued, because browsers treat the inline SVG as its own wrap opportunity, so
 * next to a long label the icon drops to a line of its own — and no glue
 * character prevents it: Chromium breaks around an atomic inline even across a
 * no-break space. Sharing a no-wrap span with the label's last characters is
 * what actually holds: the break opportunity ends up inside the span, where
 * `nowrap` suppresses it, so the icon only ever wraps together with the tail.
 * Content that isn't a plain string keeps the plain suffix — there is no tail
 * to split off.
 */
function ExternalContent(props: { children: React.ReactNode }) {
  const { children } = props;
  if (typeof children !== "string" || children.length === 0) {
    return (
      <>
        {children}
        <ExternalIndicator />
      </>
    );
  }
  const splitAt = Math.max(0, children.length - 3);
  return (
    <>
      {children.slice(0, splitAt)}
      <span className="whitespace-nowrap">
        {children.slice(splitAt)}
        <ExternalIndicator />
      </span>
    </>
  );
}

function getLinkClassName(props: Pick<LinkProps, "variant">) {
  const { variant = "primary" } = props;
  return clsx(
    "focus-ring no-underline",
    // A dead link stops reading as one, and it dies two ways: an anchor with
    // no href — `FakeLink` marks it `data-disabled` — or a disabled
    // `LinkStyleButton`. react-aria spelled both `data-disabled`; the DOM
    // spells the second one `:disabled`.
    "not-data-disabled:not-disabled:hover:underline",
    "not-data-disabled:not-disabled:cursor-pointer",
    { neutral: "text-default", primary: "text-primary-low" }[variant],
  );
}

/**
 * A button that reads as a link: the same colour, and the same underline on
 * hover, but it runs an action instead of going somewhere.
 *
 * Named for what it wears, because `ui/Button`'s `LinkButton` is the mirror
 * image — a link wearing a button — and the two used to be told apart only by
 * which module they were imported from.
 */
export function LinkStyleButton({
  className,
  variant,
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & Pick<LinkProps, "variant">) {
  return (
    <button
      type={type}
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
  isExternal = false,
  children,
  ...props
}: React.ComponentPropsWithRef<"span"> & {
  href: string | undefined;
  target?: HTMLAttributeAnchorTarget;
  isExternal?: boolean;
}) {
  const content =
    isExternal && href ? (
      <ExternalContent>{children}</ExternalContent>
    ) : (
      children
    );

  if (!href) {
    return (
      <span ref={ref} data-disabled="" {...props}>
        {content}
      </span>
    );
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
    >
      {content}
    </span>
  );
}

function ExternalIndicator() {
  return (
    <ExternalLinkIcon className="mb-0.5 ml-[0.4em] inline size-[1em] shrink-0" />
  );
}
