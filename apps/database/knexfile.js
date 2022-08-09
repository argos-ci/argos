/* eslint-disable no-global-assign */
require = require("esm")(module);

const { default: config } = require("@argos-ci/config");

module.exports = config.get("pg");
