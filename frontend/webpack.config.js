const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  resolve: {
    fallback: {
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
    },
  },
  plugins: [
    new NodePolyfillPlugin()
  ],
};
