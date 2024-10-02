const { config } = require("@swc/core/spack");

module.exports = config({
  entry: {
    web: __dirname + "/src/demo/app.ts",
  },
  output: {
    path: __dirname + "/lib",
    name: 'app.js'
  },
  module: {},
});