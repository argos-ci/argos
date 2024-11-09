export type BuildTypeCondition = {
  type: "build-type";
  value: "reference" | "check";
};

export type BuildConclusionCondition = {
  type: "build-conclusion";
  value: "no-changes" | "changes-detected";
};

export type AutomationCondition = BuildTypeCondition | BuildConclusionCondition;

export type AllCondition = {
  all: AutomationCondition[];
};
