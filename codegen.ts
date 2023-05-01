import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "apps/graphql/src/definitions/*.ts",
  documents: ["apps/app/src/**/*.tsx"],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    "apps/app/src/gql/": {
      preset: "client",
      plugins: [],
      config: {
        dedupeFragments: true,
      },
    },
    "apps/app/src/gql-fragments.json": {
      plugins: ["fragment-matcher"],
    },
    "apps/graphql/src/__generated__/resolver-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../context.js#Context",
        useTypeImports: true,
        typesPrefix: "I",
        mappers: {
          AccountAvatar: "@argos-ci/database/models#AccountAvatar",
          Build: "@argos-ci/database/models#Build",
          GithubAccount: "@argos-ci/database/models#GithubAccount",
          GithubRepository: "@argos-ci/database/models#GithubRepository",
          GhApiInstallation: "@argos-ci/github#GhApiInstallation",
          GhApiRepository: "@argos-ci/github#GhApiRepository",
          Plan: "@argos-ci/database/models#Plan",
          Purchase: "@argos-ci/database/models#Purchase",
          Screenshot: "@argos-ci/database/models#Screenshot",
          ScreenshotBucket: "@argos-ci/database/models#ScreenshotBucket",
          ScreenshotDiff: "@argos-ci/database/models#ScreenshotDiff",
          Project: "@argos-ci/database/models#Project",
          Team: "@argos-ci/database/models#Account",
          Test: "@argos-ci/database/models#Test",
          User: "@argos-ci/database/models#Account",
          VercelApiProject: "@argos-ci/vercel#VercelProject",
          VercelApiTeam: "@argos-ci/vercel#VercelTeam",
        },
      },
    },
  },
};

export default config;
