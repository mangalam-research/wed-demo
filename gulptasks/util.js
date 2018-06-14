const log = require("fancy-log");
const fs = require("fs-extra");
const del = require("del");
const { execFile } = require("child-process-promise");

exports.fs = fs;
exports.del = del;

/**
 * Why use this over spawn with { stdio: "inherit" }? If you use this function,
 * the results will be shown in one shot, after the process exits, which may
 * make things tidier.
 *
 * However, not all processes are amenable to this. When running Karma, for
 * instance, it is desirable to see the progress "live" and so using spawn is
 * better.
 */
exports.execFileAndReport = function execFileAndReport(...args) {
  return execFile(...args)
    .then((result) => {
      if (result.stdout) {
        log(result.stdout);
      }
    }, (err) => {
      if (err.stdout) {
        log(err.stdout);
      }
      throw err;
    });
};
