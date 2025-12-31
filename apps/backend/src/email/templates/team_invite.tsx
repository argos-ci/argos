import * as React from "react";
import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { Column, Row, Section } from "@react-email/components";
import { z } from "zod";

import { getTeamUserLevelLabel } from "@/database/services/team";
import { getAvatarColor } from "@/graphql/services/avatar";

import {
  Avatar,
  Button,
  EmailLayout,
  H1,
  Hr,
  InfoText,
  Paragraph,
  SafetyDisclaimer,
} from "../components";
import { AvatarSchema, LocationSchema } from "../schemas";
import { defineEmailTemplate } from "../template";

const dateFormatter = Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeStyle: "full",
  timeZone: "UTC",
});

export const handler = defineEmailTemplate({
  type: "team_invite",
  schema: z.object({
    email: z.email(),
    userLevel: TeamUserLevelSchema,
    avatar: AvatarSchema,
    invite: z.object({
      date: z.date(),
      url: z.url(),
    }),
    team: z.object({
      name: z.string(),
      avatar: AvatarSchema,
    }),
    invitedBy: z.object({
      name: z.string(),
      email: z.email().nullable(),
      location: LocationSchema,
    }),
  }),
  previewData: {
    email: "john.doe@example.com",
    userLevel: "owner",
    avatar: {
      url: null,
      initial: "J",
      color: getAvatarColor(8),
    },
    invite: {
      url: "https://example.com/invite",
      date: new Date("2025-09-07T15:59:00.000Z"),
    },
    team: {
      name: "Avengers",
      avatar: {
        url: null,
        initial: "A",
        color: getAvatarColor(1),
      },
    },
    invitedBy: {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      location: {
        city: "Paris",
        country: "France",
        ip: "93.19.70.152",
      },
    },
  },
  email: (props) => {
    const { invite, invitedBy, email, userLevel, team, avatar } = props;
    return {
      subject: `${invitedBy.name} has invited you to the ${team.name} team on Argos`,
      body: (
        <EmailLayout
          preview={`Join the ${team.name} team on Argos.`}
          footer={false}
        >
          <H1>Join {team.name} on Argos</H1>
          <Paragraph>Hi {props.email},</Paragraph>
          <Paragraph>
            <strong>{invitedBy.name}</strong>
            {invitedBy.email ? ` (${invitedBy.email})` : null} has invited you
            to join the <strong>{team.name}</strong> team on{" "}
            <strong>Argos</strong> with the{" "}
            <strong>{getTeamUserLevelLabel(userLevel)}</strong> role.
          </Paragraph>
          {/* @TODO graph */}
          <Section className="my-8 w-auto">
            <Row>
              <Column className="px-8">
                <Avatar avatar={avatar} size={64} />
              </Column>
              <Column className="text-2xl text-gray-700">→</Column>
              <Column className="px-8">
                <Avatar avatar={team.avatar} size={64} />
              </Column>
            </Row>
          </Section>
          <Section className="my-8 text-center">
            <Button href={invite.url}>Join team</Button>
          </Section>
          <Paragraph>
            Or copy and paste this URL into your browser: {invite.url}
          </Paragraph>
          <Paragraph>
            This invite is valid for 72 hours and should not be shared.
          </Paragraph>
          <Hr />
          <InfoText>
            This invite was intended for{" "}
            <strong className="font-normal text-black">{email}</strong>. This
            invite was sent on {dateFormatter.format(invite.date)} and will
            expire in 72 hours.{" "}
            {invitedBy.location ? (
              <>
                This invite was sent from{" "}
                <strong className="font-normal text-black">
                  {invitedBy.location.ip}
                </strong>{" "}
                located in{" "}
                <strong className="font-normal text-black">
                  {invitedBy.location.city}, {invitedBy.location.country}
                </strong>
                .{" "}
              </>
            ) : null}
            If you were not expecting this invite, you can ignore this email.{" "}
            <SafetyDisclaimer />
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
