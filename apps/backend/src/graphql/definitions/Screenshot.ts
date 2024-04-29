import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getPublicImageUrl, getPublicUrl } from "@/storage/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";

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

  type ScreenshotMetadataTest {
    id: String
    title: String!
    titlePath: [String!]!
    location: ScreenshotMetadataLocation
    retry: Int
    retries: Int
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
  }

  type ScreenshotMetadata {
    url: String
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
    width: Int
    height: Int
    metadata: ScreenshotMetadata
    playwrightTraceUrl: String
  }
`;

export const resolvers: IResolvers = {
  Screenshot: {
    url: async (screenshot) => {
      return getPublicImageUrl(screenshot.s3Id);
    },
    width: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) return null;
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return file.width;
    },
    height: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) return null;
      const file = await ctx.loaders.File.load(screenshot.fileId);
      invariant(file, "File not found");
      return file.height;
    },
    playwrightTraceUrl: async (screenshot, _args, ctx) => {
      if (!screenshot.playwrightTraceFileId) return null;
      const file = await ctx.loaders.File.load(
        screenshot.playwrightTraceFileId,
      );
      invariant(file, "File not found");
      const url = await getPublicUrl(file.key);
      const searchParams = new URLSearchParams();
      searchParams.set("trace", url);
      console.log(url, `https://trace.playwright.dev/?${searchParams}`);
      return `https://trace.playwright.dev/?${searchParams}`;
    },
  },
};
