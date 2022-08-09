export const notFoundToken = () => {
  const notFoundError = new Error("Not found");
  notFoundError.status = 404;
  return async () => {
    throw notFoundError;
  };
};

export const validToken =
  ({ scopes }) =>
  async () => ({ data: { scopes } });
