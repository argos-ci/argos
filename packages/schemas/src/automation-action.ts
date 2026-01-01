import { z } from "zod";

export const AutomationSlackActionTypeSchema = z.literal("sendSlackMessage");

export type AutomationSlackActionType = z.infer<
  typeof AutomationSlackActionTypeSchema
>;

export type AutomationActionType = AutomationSlackActionType;
