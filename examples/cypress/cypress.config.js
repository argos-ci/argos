const { defineConfig } = require("cypress");

module.exports = defineConfig({
  // setupNodeEvents can also be defined in "component"
  e2e: {
    setupNodeEvents(on, config) {
      require("@argos-ci/cypress/task")(on, config, {
        // Enable upload to Argos only when it runs on CI.
        uploadToArgos: !!process.env.CI,
        // Set your Argos token (required only if you don't use GitHub Actions).
        token: "<YOUR-ARGOS-TOKEN>",
      });

      // include any other plugin code...
    },
  },
});
