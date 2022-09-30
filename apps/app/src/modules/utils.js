/* eslint-disable react/no-unescaped-entities */

export const getPossessiveForm = (str) =>
  str.charAt(str.length - 1) === "s" ? `${str}' ` : `${str}'s`;

export const pluralize = (str, count) => `${str}${count >= 2 ? "s" : ""}`;
