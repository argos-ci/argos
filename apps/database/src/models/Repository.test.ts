import { factory, useDatabase } from "../testing/index.js";
import type { Repository, User } from "./index.js";

describe("Repository", () => {
  useDatabase();

  describe("#getUsers", () => {
    let user: User;
    let repository: Repository;

    beforeEach(async () => {
      user = await factory.create("User");
      repository = await factory.create("Repository");
      await factory.create("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository.id,
      });
    });

    it("should return users having rights on the repository", async () => {
      const users = await repository.getUsers();
      expect(users).toHaveLength(1);
      expect(users[0]!.id).toBe(user.id);

      const staticUsers = await repository.getUsers();
      expect(staticUsers).toHaveLength(1);
      expect(staticUsers[0]!.id).toBe(user.id);
    });
  });
});
