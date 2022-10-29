export const notFoundToken = () => {
  const notFoundError = new Error("Not found");
  // @ts-ignore
  notFoundError.status = 404;
  return async () => {
    throw notFoundError;
  };
};

export const validToken =
  ({ scopes }: { scopes: string[] }) =>
  async () => ({ data: { scopes } });
