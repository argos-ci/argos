import { CircleXIcon } from "lucide-react";
import { Helmet } from "react-helmet";

import { LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  Page,
} from "@/ui/Layout";

export function NotFound() {
  return (
    <Page>
      <Helmet>
        <title>Page not found</title>
      </Helmet>
      <EmptyState>
        <EmptyStateIcon>
          <CircleXIcon strokeWidth={1} />
        </EmptyStateIcon>
        <Heading>Page not found</Heading>
        <EmptyStateDescription>
          There is nothing to see here.
        </EmptyStateDescription>
        <EmptyStateActions>
          <LinkButton href="/">Back to home</LinkButton>
        </EmptyStateActions>
      </EmptyState>
    </Page>
  );
}
