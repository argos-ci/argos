import type { ComponentProps } from "react";
import {
  Heading,
  HeadingContext,
  Provider,
  Text,
  TextContext,
} from "react-aria-components";

import { getAccountURL } from "@/pages/Account/AccountParams";
import { LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";

import { AccountAvatar } from "../AccountAvatar";

export function InviteContainer(props: { children: React.ReactNode }) {
  return (
    <Container className="mt-32 flex max-w-3xl flex-col items-center text-center">
      <Provider
        values={[
          [
            HeadingContext,
            { level: 1, className: "mb-2 text-2xl font-medium" },
          ],
          [TextContext, { className: "text-low" }],
        ]}
      >
        {props.children}
      </Provider>
    </Container>
  );
}

export function InviteAccountAvatar(props: {
  avatar: ComponentProps<typeof AccountAvatar>["avatar"];
}) {
  return <AccountAvatar avatar={props.avatar} className="size-18 mb-8" />;
}

export function AlreadyJoined(props: {
  teamTitle: string;
  accountSlug: string;
}) {
  const { teamTitle, accountSlug } = props;
  return (
    <>
      <Heading>This invite has already been accepted</Heading>
      <Text>
        You are already a member of <strong>{teamTitle}</strong> team.
      </Text>
      <LinkButton
        className="mt-8"
        size="large"
        href={getAccountURL({ accountSlug })}
      >
        View Team Projects
      </LinkButton>
    </>
  );
}

export function InvalidInvite() {
  return (
    <>
      <Heading>Invalid invite</Heading>
      <Text>
        Team not found by the given invite code or user is not authorized to
        join team.
      </Text>
    </>
  );
}
