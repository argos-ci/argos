import type { Plan } from "./Plan";

export interface Owner {
  id: string;
  name: string;
  login: string;
  consumptionRatio: number | null;
  plan: Plan | null;
}
