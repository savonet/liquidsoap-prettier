const webpack = require("webpack");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

// The js_of_ocaml runtime keeps its node-only file, tty and process code behind
// runtime guards, but the `node:` scheme still reaches webpack as a request it
// refuses to resolve. Stripping the prefix hands them to the polyfill aliases.
const stripNodeScheme = new webpack.NormalModuleReplacementPlugin(
  /^node:/,
  (resource) => {
    resource.request = resource.request.replace(/^node:/, "");
  },
);

module.exports = {
  entry: "./src/index.js",
  mode: "production",
  experiments: {
    outputModule: true,
  },
  resolve: {
    fallback: {
      child_process: false,
    },
  },
  plugins: [stripNodeScheme, new NodePolyfillPlugin()],
  output: {
    path: __dirname + "/dist",
    filename: "web.mjs",
    library: {
      type: "module",
    },
  },
};
