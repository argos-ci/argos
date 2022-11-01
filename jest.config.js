module.exports = {
  testEnvironment: "node",
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  modulePathIgnorePatterns: ["examples/playwright/", "<rootDir>/tests", "dist"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
