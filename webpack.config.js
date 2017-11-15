/* global __dirname */
"use strict";

const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const sourceDir = "./build/aot-compiled/";

const commonExternals = {};
["jquery", "bootstrap", "dexie",
 // The mode service needs to load this dynamically.,
 "wed/mode-map"]
  .forEach((name) => {
    commonExternals[name] = name;
  });

const mainBundleExternals = { ...commonExternals };
 // This needs to be loaded by the kitchen sink.
["dashboard/store"].forEach((name) => {
  mainBundleExternals[name] = name;
});

function createMakeExternals(mapping) {
  return function makeExternals(context, request, callback) {
    // If the request is relative to the module it is in, we want to turn it
    // into something relative to our sourceDir. This allows handling a request
    // to "./store" made in a module located in "dashboard/" the same as a
    // request to "dashboard/store" made from outside dashboard.
    if (request[0] === ".") {
      request = path.relative(sourceDir, path.join(context, request));
    }

    if (request in mapping) {
      callback(null, mapping[request]);
      return;
    }

    callback();
  };
}

const common = {
  context: __dirname,
  devtool: "source-map",
  output: {
    path: path.join(__dirname, "build/prod/lib/"),
    filename: "[name].js",
    chunkFilename: "[id].chunk.js",
    // This is a bit strange but it works. The chunks are put in build/prod/lib,
    // but the page to load is in build/prod/lib/dashboard. By default the
    // chunks are loaded relative to the page, and without a path prefix so the
    // browser would look for them in build/prod/lib/dashboard. With "../" it
    // looks one directory up.
    publicPath: "../",
    sourceMapFilename: "[name].map.js",
    libraryTarget: "amd",
  },
};

module.exports = [{
  ...common,
  resolve: {
    modules: [sourceDir, "node_modules"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  entry: {
    // We make production.js the first entry so that anything production
    // bootstrapping is done first.
    dashboard: ["production.js", "dashboard-aot.js"],
  },
  module: {
    rules: [{
      test: /^.*\.js$/,
      loader: "ng-router-loader",
      options: {
        // Must be true to avoid using the compiler at runtime.
        aot: true,
        // Do we need this??
        bySymbol: false,
      },
    }, {
      test: /\.(html|css)$/,
      loader: "raw-loader",
    }],
  },
  externals: createMakeExternals(mainBundleExternals),
  plugins: [
    new CopyWebpackPlugin([{
      from: {
        glob: "dashboard/index.html",
      },
      context: "build/dev/lib",
      transform: content =>
        content.toString()
      // Remove the script that sets environment to development.
        .replace(
          /<script data-script-type="set-environment"[^]*?>[^]*?<\/script>/,
          ""),
    }, ...["{kitchen-sink,global-config,wed-store,system.config,\
requirejs-local-config}.js",
           "*.html"].map(x => ({
             from: {
               glob: x,
             },
             context: "build/dev/lib",
           }))]),
    new webpack.ContextReplacementPlugin(
      // The (\\|\/) piece accounts for path separators in *nix and Windows
        /angular(\\|\/)core(\\|\/)@angular/,
      path.join(__dirname, "./src")),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
    }),
    //
    // The way our code is currently laid out. It is not useful to use
    // this plugin. Reassess if the code is significantly changed.
    //
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: "commons",
    // }),
  ],
}, {
  ...common,
  resolve: {
    modules: ["src", "node_modules"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  entry: {
    "dashboard/store": "dashboard/store.ts",
  },
  module: {
    rules: [{
      use: [{
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          happyPackMode: true,
          configFile: "src/tsconfig.json",
          compilerOptions: {
            module: "commonjs",
          },
        },
      }],
    }, {
      test: /\.(html|css)$/,
      loader: "raw-loader",
    }],
  },
  externals: createMakeExternals(commonExternals),
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
    }),
  ],
}];
