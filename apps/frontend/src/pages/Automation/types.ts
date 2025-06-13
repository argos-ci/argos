import type { UseFormReturn } from "react-hook-form";

import {
  AutomationActionType,
  AutomationConditionType,
  AutomationEvent,
} from "@/gql/graphql";

export type AutomationInputs = {
  name: string;
  events: AutomationEvent[];
  conditions: Record<AutomationConditionType, string>;
  actions: { type: AutomationActionType; payload: any }[];
};

export type AutomationForm = UseFormReturn<AutomationInputs>;
