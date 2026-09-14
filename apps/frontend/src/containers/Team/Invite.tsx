import type { ComponentProps, ComponentPropsWithRef } from "react";
import clsx from "clsx";

import { getAccountURL } from "@/pages/Account/AccountParams";
import { LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { Heading, HeadingContext } from "@/ui/Heading";

import { AccountAvatar } from "../AccountAvatar";

export function InviteContainer(props: { children: React.ReactNode }) {
  return (
    <Container className="mt-32 flex max-w-3xl flex-col items-center text-center">
      <HeadingContext
        value={{ level: 1, className: "mb-2 text-2xl font-medium" }}
      >
        {props.children}
      </HeadingContext>
    </Container>
  );
}

export function InviteDescription(props: ComponentPropsWithRef<"span">) {
  return <span {...props} className={clsx("text-low", props.className)} />;
}

export function InviteAccountAvatar(props: {
  avatar: ComponentProps<typeof AccountAvatar>["avatar"];
}) {
  return <AccountAvatar avatar={props.avatar} className="mb-8 size-18" />;
}

export function AlreadyJoined(props: {
  teamName: string;
  accountSlug: string;
}) {
  const { teamName, accountSlug } = props;
  return (
    <>
      <Heading>This invite has already been accepted</Heading>
      <InviteDescription>
        You are already a member of <strong>{teamName}</strong> team.
      </InviteDescription>
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
      <InviteDescription>
        Team not found by the given invite code or user is not authorized to
        join team.
      </InviteDescription>
    </>
  );
}
