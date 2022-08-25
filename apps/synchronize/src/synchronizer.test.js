import { useDatabase } from "@argos-ci/database/testing";
import {
  Installation,
  Synchronization,
  Repository,
} from "@argos-ci/database/models";
import { synchronize } from "./synchronizer";

describe("synchronizer", () => {
  useDatabase();

  let synchronization;

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
      const repositories = await Repository.query().resultSize();
      expect(repositories).toBeGreaterThan(0);
    });
  });
});
