module.exports = {
  entry: "./src/index.js",
  mode: "production",
  experiments: {
    outputModule: true,
  },
  output: {
    path: __dirname + "/dist",
    filename: "web.mjs",
    library: {
      type: "module",
    },
  },
};
