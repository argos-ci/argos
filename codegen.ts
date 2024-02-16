import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "apps/backend/src/graphql/definitions/*.ts",
  documents: ["apps/frontend/src/**/*.tsx"],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    "apps/frontend/src/gql/": {
      preset: "client",
      plugins: [],
      config: {
        dedupeFragments: true,
      },
    },
    "apps/frontend/src/gql-fragments.json": {
      plugins: ["fragment-matcher"],
    },
    "apps/backend/src/graphql/__generated__/resolver-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../context.js#Context",
        useTypeImports: true,
        typesPrefix: "I",
        mappers: {
          AccountAvatar: "../../database/models/index.js#AccountAvatar",
          AccountSubscription: "../../database/models/index.js#Subscription",
          Build: "../../database/models/index.js#Build",
          GhApiInstallation: "../../github/index.js#GhApiInstallation",
          GhApiRepository: "../../github/index.js#GhApiRepository",
          GithubAccount: "../../database/models/index.js#GithubAccount",
          GithubPullRequest: "../../database/models/index.js#GithubPullRequest",
          GithubRepository: "../../database/models/index.js#GithubRepository",
          GitlabProject: "../../database/models/index.js#GitlabProject",
          GlApiNamespace: "../../gitlab/index.js#GlApiNamespace",
          GlApiProject: "../../gitlab/index.js#GlApiProject",
          Plan: "../../database/models/index.js#Plan",
          Screenshot: "../../database/models/index.js#Screenshot",
          ScreenshotBucket: "../../database/models/index.js#ScreenshotBucket",
          ScreenshotDiff: "../../database/models/index.js#ScreenshotDiff",
          Project: "../../database/models/index.js#Project",
          Team: "../../database/models/index.js#Account",
          TeamMember: "../../database/models/index.js#TeamUser",
          TeamGithubMember:
            "../../database/models/index.js#GithubAccountMember",
          Test: "../../database/models/index.js#Test",
          User: "../../database/models/index.js#Account",
          VercelApiProject: "../../vercel/index.js#VercelApiProject",
          VercelApiTeam: "../../vercel/index.js#VercelApiTeam",
          VercelConfiguration:
            "../../database/models/index.js#VercelConfiguration",
          VercelProject: "../../database/models/index.js#VercelProject",
        },
      },
    },
  },
};

export default config;
