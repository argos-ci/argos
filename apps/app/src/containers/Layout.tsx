import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";
import { useMatch } from "react-router-dom";

import { ErrorPage } from "@/pages/ErrorPage";
import { Catch } from "@/ui/Catch";

import { Navbar } from "./Navbar";

export const Main = forwardRef<HTMLElement, { children: React.ReactNode }>(
  (props: { children: React.ReactNode }, ref) => {
    return (
      <main
        ref={ref}
        className="flex min-h-0 flex-grow flex-col border-t border-t-border py-6"
      >
        <Catch fallback={<ErrorPage />}>{props.children}</Catch>
      </main>
    );
  }
);

export const Layout = (props: { children: React.ReactNode }) => {
  const fullSize = useMatch("/:accountSlug/:projectName");
  return (
    <div className={clsx(fullSize && "h-screen", "flex min-h-full flex-col")}>
      <header className="flex-shrink-0">
        <Navbar />
      </header>
      {props.children}
    </div>
  );
};

export const SettingsLayout = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(className, "flex max-w-4xl flex-col gap-6")}
      {...props}
    />
  );
};
