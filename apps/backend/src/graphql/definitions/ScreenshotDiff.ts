import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getStartDateFromPeriod } from "@/metrics/test.js";
import { getPublicImageFileUrl, getTwicPicsUrl } from "@/storage/index.js";

import {
  IArtifactDiffResolvers,
  IArtifactDiffStatus,
  IResolvers,
} from "../__generated__/resolver-types.js";
import { getVariantKey } from "../services/variant-key.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum ArtifactDiffStatus {
    pending
    removed
    failure
    added
    changed
    unchanged
    retryFailure
    ignored
  }

  type ArtifactDiff implements Node {
    id: ID!
    createdAt: DateTime!
    build: Build!
    base: Screenshot
    head: Screenshot
    url: String
    "Name of the diff (either base or compare screenshot name)"
    name: String!
    "Unique key to identify screenshot variant (browser, resolution, retries)"
    variantKey: String!
    "Change ID of the screenshot diff. Used to be indefied in a test."
    change: TestChange
    width: Int
    height: Int
    status: ArtifactDiffStatus!
    group: String
    threshold: Float
    test: Test
    occurrences(period: MetricsPeriod!): Int!
  }

  type ArtifactDiffConnection implements Connection {
    pageInfo: PageInfo!
    edges: [ArtifactDiff!]!
  }
`;

const nameResolver: IArtifactDiffResolvers["name"] = async (
  diff,
  _args,
  ctx,
) => {
  const [baseArtifact, headArtifact] = await Promise.all([
    diff.baseArtifactId ? ctx.loaders.Artifact.load(diff.baseArtifactId) : null,
    diff.headArtifactId ? ctx.loaders.Artifact.load(diff.headArtifactId) : null,
  ]);
  const name = baseArtifact?.name || headArtifact?.name;
  invariant(name, "screenshot diff without name");
  return name;
};

const statusResolver: IArtifactDiffResolvers["status"] = async (
  diff,
  _args,
  ctx,
) => {
  const diffStatus = await diff.$getDiffStatus(async (id) => {
    const artifact = await ctx.loaders.Artifact.load(id);
    invariant(artifact, "Screenshot not found");
    return artifact;
  });

  return diffStatus as IArtifactDiffStatus;
};

export const resolvers: IResolvers = {
  ArtifactDiff: {
    change: async (diff, _args, ctx) => {
      if (!diff.fileId || !diff.testId) {
        return null;
      }
      const build = await ctx.loaders.Build.load(diff.buildId);
      invariant(build, "ArtifactDiff without build");
      const project = await ctx.loaders.Project.load(build.projectId);
      invariant(project, "Build without project");
      return {
        project,
        fileId: diff.fileId,
        testId: diff.testId,
      };
    },
    build: async (diff, _args, ctx) => {
      const build = await ctx.loaders.Build.load(diff.buildId);
      invariant(build, "ArtifactDiff without build");
      return build;
    },
    baseArtifact: async (diff, _args, ctx) => {
      if (!diff.baseArtifactId) {
        return null;
      }
      return ctx.loaders.Artifact.load(diff.baseArtifactId);
    },
    headArtifact: async (diff, _args, ctx) => {
      if (!diff.headArtifactId) {
        return null;
      }
      return ctx.loaders.Artifact.load(diff.headArtifactId);
    },
    url: async (diff, _args, ctx) => {
      if (!diff.fileId) {
        if (!diff.s3Id) {
          return null;
        }
        return getTwicPicsUrl(diff.s3Id);
      }
      const file = await ctx.loaders.File.load(diff.fileId);
      invariant(file, "File not found");
      return getPublicImageFileUrl(file);
    },
    name: nameResolver,
    variantKey: async (...args) => {
      const name = await nameResolver(...args);
      return getVariantKey(name);
    },
    width: async (diff, _args, ctx) => {
      if (!diff.fileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(diff.fileId);
      invariant(file, "File not found");
      return file.width;
    },
    height: async (diff, _args, ctx) => {
      if (!diff.fileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(diff.fileId);
      invariant(file, "File not found");
      return file.height;
    },
    status: statusResolver,
    threshold: async (diff, _args, ctx) => {
      if (!diff.headArtifactId) {
        return null;
      }
      const headArtifact = await ctx.loaders.Screenshot.load(
        diff.headArtifactId,
      );
      return headArtifact?.threshold ?? null;
    },
    test: async (diff, _args, ctx) => {
      if (!diff.testId) {
        return null;
      }
      const test = await ctx.loaders.Test.load(diff.testId);
      invariant(test, "Test not found");
      return test;
    },
    occurrences: async (diff, args, ctx) => {
      if (!diff.fileId || !diff.testId) {
        return 0;
      }
      const from = getStartDateFromPeriod(args.period);
      const count = await ctx.loaders
        .getChangesOccurencesLoader(from.toISOString())
        .load({
          fileId: diff.fileId,
          testId: diff.testId,
        });
      return count;
    },
  },
};
