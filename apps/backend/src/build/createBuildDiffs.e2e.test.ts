import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import {
  Artifact,
  ArtifactBucket,
  ArtifactDiff,
  Build,
} from "@/database/models/index.js";
import type { File, Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { createBuildDiffs } from "./createBuildDiffs.js";

describe("#createBuildDiffs", () => {
  let build: Build;
  let headBucket: ArtifactBucket;
  let newArtifact: Artifact | undefined;
  let newArtifactWithoutFile: Artifact | undefined;
  let project: Project;
  let files: File[];

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      githubRepositoryId: null,
    });
    headBucket = await factory.ArtifactBucket.create({
      branch: "BUGS-123",
      projectId: project.id,
    });
    build = await factory.Build.create({
      baseArtifactBucketId: null,
      headArtifactBucketId: headBucket.id,
      projectId: project.id,
      jobStatus: "pending",
    });
    files = await factory.File.createMany(10, {
      type: "Artifact",
    });
    [newArtifact, newArtifactWithoutFile] = await factory.Artifact.createMany(
      2,
      [
        {
          name: "new-Artifact",
          s3Id: "s3Id-a",
          fileId: files[1]!.id,
          ArtifactBucketId: headBucket.id,
        },
        {
          name: "new-Artifact",
          s3Id: "s3Id-b",
          ArtifactBucketId: headBucket.id,
        },
      ],
    );
  });

  describe("with base bucket", () => {
    let baseBucket: ArtifactBucket;
    let classicDiffBaseArtifact: Artifact | undefined;
    let classicDiffCompareArtifact: Artifact | undefined;
    let removedArtifact: Artifact | undefined;
    let noFileBaseArtifactBase: Artifact | undefined;
    let noFileBaseArtifactCompare: Artifact | undefined;
    let noFileCompareArtifactBase: Artifact | undefined;
    let noFileCompareArtifactCompare: Artifact | undefined;
    let sameFileArtifactBase: Artifact | undefined;
    let sameFileArtifactCompare: Artifact | undefined;

    beforeEach(async () => {
      baseBucket = await factory.ArtifactBucket.create({
        branch: "master",
        projectId: project.id,
      });
      await build
        .$query()
        .patchAndFetch({ baseArtifactBucketId: baseBucket.id });
      [
        classicDiffBaseArtifact,
        classicDiffCompareArtifact,
        removedArtifact,
        noFileBaseArtifactBase,
        noFileBaseArtifactCompare,
        noFileCompareArtifactBase,
        noFileCompareArtifactCompare,
        sameFileArtifactBase,
        sameFileArtifactCompare,
      ] = await factory.Artifact.createMany(9, [
        {
          name: "classic-diff",
          s3Id: "s3Id-c",
          fileId: files[2]!.id,
          ArtifactBucketId: baseBucket.id,
        },
        {
          name: "classic-diff",
          s3Id: "s3Id-d",
          fileId: files[3]!.id,
          ArtifactBucketId: headBucket.id,
        },
        {
          name: "removed-Artifact",
          s3Id: "s3Id-e",
          fileId: files[4]!.id,
          ArtifactBucketId: baseBucket.id,
        },
        {
          name: "no-file-base-Artifact",
          s3Id: "s3Id-f",
          ArtifactBucketId: baseBucket.id,
        },
        {
          name: "no-file-base-Artifact",
          s3Id: "s3Id-g",
          fileId: files[5]!.id,
          ArtifactBucketId: headBucket.id,
        },
        {
          name: "no-file-compare-Artifact",
          s3Id: "s3Id-h",
          fileId: files[6]!.id,
          ArtifactBucketId: baseBucket.id,
        },
        {
          name: "no-file-compare-Artifact",
          s3Id: "s3Id-i",
          ArtifactBucketId: headBucket.id,
        },
        {
          name: "same-file",
          s3Id: "s3Id-j",
          fileId: files[7]!.id,
          ArtifactBucketId: baseBucket.id,
        },
        {
          name: "same-file",
          s3Id: "s3Id-j",
          fileId: files[7]!.id,
          ArtifactBucketId: headBucket.id,
        },
      ]);
    });

    it("should return the diffs", async () => {
      const diffs = await createBuildDiffs(build);
      const [
        addedDiff,
        addDiffWithoutFile,
        updatedDiff,
        noFileBaseArtifactDiff,
        noFileCompareArtifactDiff,
        sameFileDiff,
        removedDiff,
      ] = diffs;

      expect(diffs.length).toBe(7);
      expect(addedDiff).toMatchObject({
        buildId: build.id,
        baseArtifactId: null,
        headArtifactId: newArtifact!.id,
        jobStatus: "complete",
      });
      expect(addDiffWithoutFile).toMatchObject({
        buildId: build.id,
        baseArtifactId: null,
        headArtifactId: newArtifactWithoutFile!.id,
        jobStatus: "pending",
      });
      expect(updatedDiff).toMatchObject({
        buildId: build.id,
        baseArtifactId: classicDiffBaseArtifact!.id,
        headArtifactId: classicDiffCompareArtifact!.id,
        jobStatus: "pending",
      });
      expect(removedDiff).toMatchObject({
        buildId: build.id,
        baseArtifactId: removedArtifact!.id,
        headArtifactId: null,
        jobStatus: "complete",
        score: null,
      });
      expect(noFileBaseArtifactDiff).toMatchObject({
        buildId: build.id,
        baseArtifactId: noFileBaseArtifactBase!.id,
        headArtifactId: noFileBaseArtifactCompare!.id,
        jobStatus: "pending",
        score: null,
      });
      expect(noFileCompareArtifactDiff).toMatchObject({
        buildId: build.id,
        baseArtifactId: noFileCompareArtifactBase!.id,
        headArtifactId: noFileCompareArtifactCompare!.id,
        jobStatus: "pending",
        score: null,
      });
      expect(sameFileDiff).toMatchObject({
        buildId: build.id,
        baseArtifactId: sameFileArtifactBase!.id,
        headArtifactId: sameFileArtifactCompare!.id,
        jobStatus: "complete",
      });
    });

    it("should compare only when file's dimensions is missing", async () => {
      await headBucket.$query().patch({ commit: baseBucket.commit });

      const [
        addedDiff,
        addDiffWithoutFile,
        updatedDiff,
        noFileBaseArtifactDiff,
        noFileCompareArtifactDiff,
        sameFileDiff,
        removedDiff,
      ] = await createBuildDiffs(build);
      const getJobStatuses = (diffs: ArtifactDiff[]) => [
        ...new Set(diffs.map((diff: ArtifactDiff) => diff.jobStatus)),
      ];

      expect(
        getJobStatuses([addedDiff!, sameFileDiff!, removedDiff!]),
      ).toMatchObject(["complete"]);
      expect(
        getJobStatuses([
          updatedDiff!,
          addDiffWithoutFile!,
          noFileBaseArtifactDiff!,
          noFileCompareArtifactDiff!,
        ]),
      ).toMatchObject(["pending"]);
    });

    describe("when compare branch that matches auto-approved branch glob", () => {
      beforeEach(async () => {
        const autoApprovedBranchGlob =
          await project.$getAutoApprovedBranchGlob();
        invariant(autoApprovedBranchGlob);
        await ArtifactBucket.query().findById(headBucket.id).patch({
          branch: autoApprovedBranchGlob,
        });
      });

      it("should update build type to 'reference'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild?.type).toBe("reference");
      });
    });

    describe("with compare branch different than auto-approved branch", () => {
      it("should update build type to 'check'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild?.type).toBe("check");
      });
    });
  });

  describe("without base bucket", () => {
    it("should work with a first build", async () => {
      const diffs = await createBuildDiffs(build);
      expect(diffs.length).toBe(2);
      expect(diffs[0]).toMatchObject({
        buildId: build.id,
        baseArtifactId: null,
        headArtifactId: newArtifact!.id,
        jobStatus: "complete",
      });
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseArtifactId: null,
        headArtifactId: newArtifactWithoutFile!.id,
        jobStatus: "pending",
      });
    });

    it("should update build type to 'orphan'", async () => {
      await createBuildDiffs(build);
      const updatedBuild = await Build.query().findById(build.id);
      expect(updatedBuild?.type).toBe("orphan");
    });
  });
});
