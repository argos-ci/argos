export function expectNoGraphQLError(res) {
  if (res.body.errors !== undefined) {
    expect(res.body.errors).toEqual([])
  }
}
