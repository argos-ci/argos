import { Catch } from "@/modern/ui/Catch";
import { ErrorPage } from "@/pages/ErrorPage";
import { Navbar } from "./Navbar";
import { SubNavbar } from "./SubNavbar";

import { SyncAlert } from "@/containers/SyncAlert";

export const Layout = (props: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex-shrink-0">
        <Navbar />
        <SubNavbar />
      </header>

      <SyncAlert />

      <main className="mt-6 flex-1">
        <Catch fallback={<ErrorPage />}>{props.children}</Catch>
      </main>
    </div>
  );
};
