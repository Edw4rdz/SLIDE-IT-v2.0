const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );
      
      // Temporarily disable CSS minification to generate unminified CSS for inspection
      if (config.optimization && config.optimization.minimizer) {
        config.optimization.minimizer = config.optimization.minimizer.filter(
          plugin => plugin.constructor.name !== 'CssMinimizerPlugin'
        );
      }
      
      return config;
    },
  },
};
