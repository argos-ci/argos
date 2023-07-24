import type { Response } from "supertest";
import { expect } from "vitest";

export function expectNoGraphQLError(res: Response) {
  if (res.body.errors !== undefined) {
    expect(res.body.errors).toEqual([]);
  }
}
