/**
 * This file is needed in order to make the code work on the node environement
 * without webpack.
 */

// Set the /src folder as root
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../'));

require('../app');
