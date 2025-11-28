const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false,              // <--- This fixes the "node:fs" error
        "path": false,            // <--- Fixes "node:path"
        "os": false,              // <--- Fixes "node:os"
        "crypto": false,          // <--- Fixes "node:crypto"
        "child_process": false,
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
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