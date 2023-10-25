/**
 * Split an array into chunks of a given size.
 */
export const chunk = <T>(collection: T[], size: number) => {
  const result = [];

  // add each chunk to the result
  for (let x = 0; x < Math.ceil(collection.length / size); x++) {
    const start = x * size;
    const end = start + size;

    result.push(collection.slice(start, end));
  }

  return result;
};
