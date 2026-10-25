import { ComponentPropsWithRef, Suspense } from "react";
import { clsx } from "clsx";
import { useMatch } from "react-router";

import { Nav, NavLink, NavList, NavListItem, NavSelect } from "@/ui/Nav";
import { PageLoader } from "@/ui/PageLoader";

import { BuildHotkeysDialog } from "./Build/BuildHotkeys";
import { BuildHotkeysDialogStateProvider } from "./Build/BuildHotkeysDialogState";
import { Navbar } from "./Navbar";

function Main(props: {
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const { ref } = props;
  return (
    <main ref={ref} className="contents">
      {props.children}
    </main>
  );
}

export function Layout(props: { children: React.ReactNode }) {
  const isFullSize = Boolean(useMatch("/:accountSlug/:projectName"));
  const hasShortcuts = Boolean(
    useMatch("/:accountSlug/:projectName/tests/:testId"),
  );
  const content = (
    <div className={clsx(isFullSize && "h-screen", "flex min-h-full flex-col")}>
      <header className="shrink-0">
        <Navbar />
      </header>
      <Main>
        <Suspense fallback={<PageLoader />}>{props.children}</Suspense>
      </Main>
    </div>
  );

  return hasShortcuts ? (
    <BuildHotkeysDialogStateProvider>
      {content}
      <BuildHotkeysDialog env="test" />
    </BuildHotkeysDialogStateProvider>
  ) : (
    content
  );
}

export function SettingsLayout(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        props.className,
        // A phone has no room beside the page for the sections: they sit
        // above it, in a select (`SettingsNav`).
        "grid grid-cols-[12rem_minmax(0,1fr)] gap-16 max-md:grid-cols-1 max-md:gap-6",
      )}
    />
  );
}

/**
 * The sections of a settings page. A phone gets a select rather than the list:
 * laid out as a row, the list left most sections out of view.
 */
export function SettingsNav(props: {
  sections: { name: string; href: string }[];
}) {
  const { sections } = props;
  return (
    <Nav>
      <NavList className="max-md:hidden">
        {sections.map((section) => (
          <NavListItem key={section.href}>
            <NavLink to={section.href} end>
              {section.name}
            </NavLink>
          </NavListItem>
        ))}
      </NavList>
      <NavSelect
        aria-label="Settings section"
        items={sections}
        className="md:hidden"
      />
    </Nav>
  );
}

export function SettingsPage(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "mb-6 flex max-w-4xl flex-1 flex-col gap-6",
        props.className,
      )}
    />
  );
}
