import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "apps/backend/src/graphql/definitions/*.ts",
  documents: ["apps/frontend/src/**/*.tsx", "apps/frontend/src/**/*.ts"],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    "apps/backend/src/graphql/__generated__/schema.gql": {
      plugins: ["schema-ast"],
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
          GithubInstallation:
            "../../database/models/index.js#GithubInstallation",
          GithubPullRequest: "../../database/models/index.js#GithubPullRequest",
          GithubRepository: "../../database/models/index.js#GithubRepository",
          GitlabProject: "../../database/models/index.js#GitlabProject",
          GitlabUser: "../../database/models/index.js#GitlabUser",
          GlApiNamespace: "../../gitlab/index.js#GlApiNamespace",
          GlApiProject: "../../gitlab/index.js#GlApiProject",
          Plan: "../../database/models/index.js#Plan",
          ProjectContributor: "../../database/models/index.js#ProjectUser",
          Screenshot: "../../database/models/index.js#Screenshot",
          ScreenshotBucket: "../../database/models/index.js#ScreenshotBucket",
          ScreenshotDiff: "../../database/models/index.js#ScreenshotDiff",
          Project: "../../database/models/index.js#Project",
          Team: "../../database/models/index.js#Account",
          TeamMember: "../../database/models/index.js#TeamUser",
          TeamGithubMember:
            "../../database/models/index.js#GithubAccountMember",
          User: "../../database/models/index.js#Account",
        },
      },
    },
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
  },
};

export default config;
