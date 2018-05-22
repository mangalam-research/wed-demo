/* global module */

"use strict";

module.exports = {
  port: 8888,
  files: ["./build/**/*.{html,htm,css,js,map}"],
  startPath: "/build/prod/lib/dashboard/index.html",
  server: {
    baseDir: ".",
  },
  reloadDebounce: 2000,
};
