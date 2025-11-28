const webpack = require("webpack");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false,              // <--- This fixes the "node:fs" error
        "https": require.resolve("https-browserify"), // <--- Fixes "node:https" error
        "path": false,            // <--- Fixes "node:path"
        "os": false,              // <--- Fixes "node:os"
        "crypto": false,          // <--- Fixes "node:crypto"
        "child_process": false,
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
        "http": require.resolve("stream-http"),      // <--- Polyfill for "node:http"
        "https": require.resolve("https-browserify"), // <--- Polyfill for "node:https"
      };

      config.resolve.alias = {
        ...config.resolve.alias,
        "node:fs": false,         // <--- Map "node:fs" to false
        "node:https": false,      // <--- Map "node:https" to false
      };
      
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        }),
        new NodePolyfillPlugin()  // <-- This handles ALL node: schemes
      );
      
      return config;
    },
  },
};