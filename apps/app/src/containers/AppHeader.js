import { createTeleporter } from "react-teleporter";
import {
  Breadcrumb,
  Header,
  HeaderBody,
  HeaderPrimary,
} from "@argos-ci/app/src/components";
import { OwnerBreadcrumbItem } from "./Breadcrumb/OwnerBreadcrumb";
import { HomeBreadcrumbItem } from "./Breadcrumb/HomeBreadcrumb";
import { RepositoryBreadcrumbItem } from "./Breadcrumb/RepositoryBreadcrumb";

const HeaderBodyTeleporter = createTeleporter();

export function HeaderTeleporter({ children }) {
  return <HeaderBodyTeleporter.Source>{children}</HeaderBodyTeleporter.Source>;
}

export function AppHeader() {
  return (
    <Header>
      <HeaderBody>
        <HeaderPrimary>
          <Breadcrumb>
            <HomeBreadcrumbItem />
            <OwnerBreadcrumbItem />
            <RepositoryBreadcrumbItem />
          </Breadcrumb>
        </HeaderPrimary>
        <HeaderBodyTeleporter.Target />
      </HeaderBody>
    </Header>
  );
}
