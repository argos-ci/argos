import NextLink from "next/link";

export const FooterSections = (props: { children: React.ReactNode }) => (
  <div className="flex justify-between flex-wrap gap-y-10 gap-x-2">
    {props.children}
  </div>
);

export const FooterSection = (props: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-2 flex-grow basis-36">{props.children}</div>
);

export const FooterSectionTitle = (props: { children: React.ReactNode }) => (
  <div className="mb-1 font-semibold text-on">{props.children}</div>
);

export const FooterLink = (props: {
  children: React.ReactNode;
  href: string;
}) => (
  <div>
    <NextLink
      className="transition no-underline text-on-light hover:text-on"
      href={props.href}
    >
      {props.children}
    </NextLink>
  </div>
);
