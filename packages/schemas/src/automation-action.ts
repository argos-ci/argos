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

export type AutomationActionType =
  AutomationSlackActionType | AutomationMsTeamsActionType;
