const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  mode: "production",
  experiments: {
    outputModule: true,
  },
  externals: {
    "node:util": "commonjs util",
  },
  plugins: [new NodePolyfillPlugin()],
  output: {
    path: __dirname + "/dist",
    filename: "web.mjs",
    library: {
      type: "module",
    },
  },
};
