/* global module */
module.exports = {
  port: 8888,
  files: ["./build/standalone/**/*.{html,htm,css,js}"],
  server: {
    baseDir: ["./build", "./node_modules"],
  },
};
