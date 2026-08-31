import {
  CNAMEAlreadyExists,
  InvalidArgument,
} from "@aws-sdk/client-cloudfront";
import { beforeEach, describe, expect, it } from "vitest";

import { ProjectDomain } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { claimCustomDomain, recordReconcileFailure } from "./custom-domain";

const terminalError = () =>
  new CNAMEAlreadyExists({
    message: "One or more of the CNAMEs you provided are already associated",
    $metadata: {},
  });

const transientError = () =>
  new InvalidArgument({ message: "AccessDenied", $metadata: {} });

describe("recordReconcileFailure", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function createPendingDomain() {
    const project = await factory.Project.create();
    return factory.ProjectDomain.create({
      projectId: project.id,
      domain: "docs.example.com",
      environment: "production",
      internal: false,
      status: "pending",
    });
  }

  it("stops polling a domain whose hostname can never work", async () => {
    const projectDomain = await createPendingDomain();

    await recordReconcileFailure(projectDomain.id, terminalError());

    const updated = await ProjectDomain.query().findById(projectDomain.id);
    expect(updated).toMatchObject({ status: "failed" });
    expect(updated?.statusReason).toContain("already associated");
    expect(updated?.lastCheckedAt).not.toBeNull();
  });

  it("keeps polling a domain whose failure is ours to fix", async () => {
    const projectDomain = await createPendingDomain();

    await recordReconcileFailure(projectDomain.id, transientError());

    const updated = await ProjectDomain.query().findById(projectDomain.id);
    // Still pending, so the cron picks it up again — and the reason is written
    // in our words rather than as a raw AWS exception.
    expect(updated).toMatchObject({ status: "pending" });
    expect(updated?.statusReason).toMatch(/no action is needed on your side/i);
    expect(updated?.statusReason).not.toContain("AccessDenied");
  });

  // Guards the regression: a blind patch from the pre-failure row overwrote a
  // reconcile that succeeded in between, marking a serving domain `failed` —
  // which is never re-polled.
  it("leaves a domain that went active in the meantime alone", async () => {
    const projectDomain = await createPendingDomain();
    await projectDomain.$query().patch({
      status: "active",
      cloudfrontTenantId: "dt_concurrent",
    });

    await recordReconcileFailure(projectDomain.id, terminalError());

    const updated = await ProjectDomain.query().findById(projectDomain.id);
    expect(updated).toMatchObject({
      status: "active",
      statusReason: null,
      cloudfrontTenantId: "dt_concurrent",
    });
  });

  it("does nothing for a domain removed while it was failing", async () => {
    const projectDomain = await createPendingDomain();
    await projectDomain.$query().delete();

    await expect(
      recordReconcileFailure(projectDomain.id, terminalError()),
    ).resolves.toBeUndefined();
  });
});

describe("claimCustomDomain", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  const DOMAIN = "docs.example.com";
  const ROUTING_ENDPOINT = "cname.dev.argos-ci.live";

  function claim(projectId: string) {
    return claimCustomDomain({
      projectId,
      domain: DOMAIN,
      routingEndpoint: ROUTING_ENDPOINT,
    });
  }

  it("claims a hostname nobody holds", async () => {
    const project = await factory.Project.create();

    const claimed = await claim(project.id);

    expect(claimed).toMatchObject({
      domain: DOMAIN,
      projectId: project.id,
      status: "pending",
      internal: false,
      routingEndpoint: ROUTING_ENDPOINT,
      cloudfrontTenantId: null,
    });
  });

  // The squatting fix: a row with no tenant is a hostname someone typed into a
  // form and never proved anything about, so it cannot lock anyone out.
  it("takes a hostname from a project that never proved it owned it", async () => {
    const [squatter, owner] = await Promise.all([
      factory.Project.create(),
      factory.Project.create(),
    ]);
    const squatted = await claim(squatter.id);

    const claimed = await claim(owner.id);

    expect(claimed).toMatchObject({ projectId: owner.id, status: "pending" });
    // The same row moves across rather than a second one appearing, so the
    // unique constraint still holds.
    expect(claimed?.id).toBe(squatted?.id);
    await expect(
      ProjectDomain.query().where({ domain: DOMAIN }).resultSize(),
    ).resolves.toBe(1);
  });

  it("clears the previous holder's diagnostics on a takeover", async () => {
    const [squatter, owner] = await Promise.all([
      factory.Project.create(),
      factory.Project.create(),
    ]);
    const squatted = await claim(squatter.id);
    await squatted?.$query().patch({
      statusReason: "something went wrong for them",
      lastCheckedAt: new Date().toISOString(),
    });

    const claimed = await claim(owner.id);

    expect(claimed).toMatchObject({
      statusReason: null,
      activatedAt: null,
      lastCheckedAt: null,
    });
  });

  // A tenant only exists once CloudFront verified the domain resolves to us,
  // which is the proof of ownership — so this one is not takeable.
  it("refuses a hostname whose holder has a CloudFront tenant", async () => {
    const [holder, other] = await Promise.all([
      factory.Project.create(),
      factory.Project.create(),
    ]);
    const held = await claim(holder.id);
    await held?.$query().patch({ cloudfrontTenantId: "dt_verified" });

    await expect(claim(other.id)).resolves.toBeNull();

    const row = await ProjectDomain.query().findOne({ domain: DOMAIN });
    expect(row).toMatchObject({
      projectId: holder.id,
      cloudfrontTenantId: "dt_verified",
    });
  });

  it("refuses an internal domain", async () => {
    const [holder, other] = await Promise.all([
      factory.Project.create(),
      factory.Project.create(),
    ]);
    await factory.ProjectDomain.create({
      projectId: holder.id,
      domain: DOMAIN,
      environment: "production",
      internal: true,
    });

    await expect(claim(other.id)).resolves.toBeNull();

    const row = await ProjectDomain.query().findOne({ domain: DOMAIN });
    expect(row).toMatchObject({ projectId: holder.id, internal: true });
  });
});
