module.exports = {
  entry: "./src/index.js",
  mode: "production",
  resolve: {
    fallback: { child_process: false, constants: false, fs: false, tty: false },
  },
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
