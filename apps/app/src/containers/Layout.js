import { Catch } from "@/components";
import { Navbar } from "@/modern/containers/Navbar";
import { ErrorPage } from "@/pages/ErrorPage";

import { AppHeader } from "./AppHeader";
import { SyncAlert } from "./SyncAlert";

export const Layout = ({ children }) => {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex-shrink-0">
        <Navbar />
        <AppHeader />
      </header>

      <SyncAlert />

      <main className="mt-6 flex-1">
        <Catch fallback={<ErrorPage />}>{children}</Catch>
      </main>
    </div>
  );
};
