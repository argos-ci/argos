import { CircleXIcon } from "lucide-react";
import { Helmet } from "react-helmet";

import { LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
} from "@/ui/Layout";
import { Text } from "@/ui/Text";

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
