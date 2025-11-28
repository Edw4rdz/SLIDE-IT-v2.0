const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false, // Ignore fs module
        "path": false, // Ignore path module
        "os": false, // Ignore os module
        "crypto": false, // Ignore crypto module
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );
      return config;
    },
  },
};