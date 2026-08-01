import { z } from "zod";

export const AutomationSlackActionTypeSchema = z.literal("sendSlackMessage");

export type AutomationSlackActionType = z.infer<
  typeof AutomationSlackActionTypeSchema
>;

export const AutomationMsTeamsActionTypeSchema =
  z.literal("sendMsTeamsMessage");

export type AutomationMsTeamsActionType = z.infer<
  typeof AutomationMsTeamsActionTypeSchema
>;

export const AutomationDiscordActionTypeSchema =
  z.literal("sendDiscordMessage");

export type AutomationDiscordActionType = z.infer<
  typeof AutomationDiscordActionTypeSchema
>;

export type AutomationActionType =
  | AutomationSlackActionType
  | AutomationMsTeamsActionType
  | AutomationDiscordActionType;
