#!/usr/bin/env node

/* eslint-disable no-global-assign */
require = require("esm")(module);
module.exports = require("../proc/web.js");
