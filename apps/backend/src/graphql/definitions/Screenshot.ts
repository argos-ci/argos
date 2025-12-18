import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import semver from "semver";

import {
  checkIsTrustedNpmPackage,
  getLatestPackageVersion,
} from "@/npm/version";
import { getPublicImageFileUrl, getPublicUrl } from "@/storage";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type ScreenshotMetadataViewport {
    width: Int!
    height: Int!
  }

  enum ScreenshotMetadataColorScheme {
    light
    dark
  }

  enum ScreenshotMetadataMediaType {
    screen
    print
  }

  type ScreenshotMetadataLocation {
    file: String!
    line: Int!
    column: Int!
  }

  type ScreenshotMetadataTestAnnotation {
    type: String!
    description: String
    location: ScreenshotMetadataLocation
  }

  type ScreenshotMetadataTest {
    id: String
    title: String!
    titlePath: [String!]!
    location: ScreenshotMetadataLocation
    retry: Int
    retries: Int
    repeat: Int
    annotations: [ScreenshotMetadataTestAnnotation!]
  }

  type ScreenshotMetadataBrowser {
    name: String!
    version: String!
  }

  type ScreenshotMetadataAutomationLibrary {
    name: String!
    version: String!
  }

  type ScreenshotMetadataSDK {
    name: String!
    version: String!
    "If the SDK version is not the latest one this field will be filled with the latest version of the SDK"
    latestVersion: String
  }

  type ScreenshotMetadata {
    url: String
    previewUrl: String
    viewport: ScreenshotMetadataViewport
    colorScheme: ScreenshotMetadataColorScheme
    mediaType: ScreenshotMetadataMediaType
    test: ScreenshotMetadataTest
    browser: ScreenshotMetadataBrowser
    automationLibrary: ScreenshotMetadataAutomationLibrary!
    sdk: ScreenshotMetadataSDK!
  }

  type Screenshot implements Node {
    id: ID!
    url: String!
    originalUrl: String!
    width: Int
    height: Int
    metadata: ScreenshotMetadata
    playwrightTraceUrl: String
    contentType: String!
  }
`;

export const resolvers: IResolvers = {
  Screenshot: {
    url: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) {
        return getPublicUrl(screenshot.s3Id);
      }
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return getPublicImageFileUrl(file);
    },
    originalUrl: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) {
        return getPublicUrl(screenshot.s3Id);
      }
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return getPublicUrl(file.key);
    },
    width: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return file.width;
    },
    height: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return file.height;
    },
    playwrightTraceUrl: async (screenshot, _args, ctx) => {
      if (!screenshot.playwrightTraceFileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(
        screenshot.playwrightTraceFileId,
      );
      invariant(file, "File not found");
      const url = await getPublicUrl(file.key);
      const searchParams = new URLSearchParams();
      searchParams.set("trace", url);
      return `https://trace.playwright.dev/?${searchParams}`;
    },
    contentType: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) {
        return "image/png";
      }
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return file.contentType ?? "image/png";
    },
  },
  ScreenshotMetadataSDK: {
    async latestVersion(sdk) {
      if (!checkIsTrustedNpmPackage(sdk.name)) {
        return null;
      }
      const latestVersion = await getLatestPackageVersion(sdk.name);
      if (semver.gt(latestVersion, sdk.version)) {
        return latestVersion;
      }
      return null;
    },
  },
};
