import type { RestEndpointMethodTypes } from "@octokit/rest";

export type GitHubRepository =
  RestEndpointMethodTypes["apps"]["listInstallationReposForAuthenticatedUser"]["response"]["data"]["repositories"][0];
export type GitHubSubscriptionPlan =
  RestEndpointMethodTypes["apps"]["getSubscriptionPlanForAccount"]["response"]["data"];
