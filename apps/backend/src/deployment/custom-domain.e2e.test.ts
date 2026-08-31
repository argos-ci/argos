import {
  CNAMEAlreadyExists,
  InvalidArgument,
} from "@aws-sdk/client-cloudfront";
import { beforeEach, describe, expect, it } from "vitest";

import { ProjectDomain } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { recordReconcileFailure } from "./custom-domain";

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

  // The regression this guards: the cron used to patch blindly from the row it
  // had loaded before the failure, so a reconcile that succeeded in between —
  // the "Check" button, most often — was overwritten and the domain was marked
  // failed while it was serving. `failed` is never re-polled, so it stuck.
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
