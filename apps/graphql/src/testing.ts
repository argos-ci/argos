/* eslint-env jest */
import type { Response } from "supertest";

export function expectNoGraphQLError(res: Response) {
  if (res.body.errors !== undefined) {
    expect(res.body.errors).toEqual([]);
  }
}
