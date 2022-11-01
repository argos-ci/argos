/* eslint-disable jest/expect-expect, jest/no-disabled-tests */
import { Installation, Synchronization } from "@argos-ci/database/models";
import { useDatabase } from "@argos-ci/database/testing";

import { synchronize } from "./synchronizer.js";

describe.skip("synchronizer", () => {
  useDatabase();

  let synchronization: Synchronization;

  describe("organization", () => {
    beforeEach(async () => {
      const installation = await Installation.query().insertAndFetch({
        githubId: 7625677,
        deleted: false,
      });

      synchronization = await Synchronization.query().insertAndFetch({
        type: "installation",
        installationId: installation.id,
        jobStatus: "pending",
      });
    });

    it("synchronizes", async () => {
      await synchronize(synchronization);
    });
  });
});
