import { Catch } from "@/modern/ui/Catch";
import { ErrorPage } from "@/pages/ErrorPage";
import { Navbar } from "./Navbar";

import { SyncAlert } from "@/containers/SyncAlert";

export const Main = (props: { children: React.ReactNode }) => {
  return (
    <main className="flex-1 border-t border-t-border py-6">
      <Catch fallback={<ErrorPage />}>{props.children}</Catch>
    </main>
  );
};

export const Layout = (props: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex-shrink-0">
        <SyncAlert />
        <Navbar />
      </header>
      {props.children}
    </div>
  );
};
