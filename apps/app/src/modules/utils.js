export const getPossessiveForm = (str) =>
  str.charAt(str.length - 1) === "s" ? `${str}’ ` : `${str}’s`;
