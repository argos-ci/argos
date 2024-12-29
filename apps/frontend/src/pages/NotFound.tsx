import { CircleXIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";

import { LinkButton } from "@/ui/Button";
import {
  EmptyState,
  EmptyStateActions,
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
        <Text slot="description">There is nothing to see here.</Text>
        <EmptyStateActions>
          <LinkButton href="/">Back to home</LinkButton>
        </EmptyStateActions>
      </EmptyState>
    </Page>
  );
}
