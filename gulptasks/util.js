const gulp = require("gulp");
const gulpNewer = require("gulp-newer");
const childProcess = require("child_process");
const Promise = require("bluebird");
const gutil = require("gulp-util");
const _fs = require("fs-extra");
const _del = require("del");
const path = require("path");
const { execFile } = require("child-process-promise");

const fs = Promise.promisifyAll(_fs);
exports.fs = fs;

exports.mkdirpAsync = fs.ensureDirAsync;
exports.del = _del;

const copy = exports.copy = fs.copyAsync;

const cprp = exports.cprp = function cprp(src, dest) {
  return copy(src, dest, { clobber: true, preserveTimestamps: true });
};

exports.cprpdir = function cprpdir(src, dest) {
  if (!(src instanceof Array)) {
    src = [src];
  }
  const promises = [];
  for (const s of src) {
    const basename = path.basename(s);
    promises.push(cprp(s, path.join(dest, basename)));
  }

  if (promises.length === 0) {
    return promises[0];
  }

  return Promise.each(promises, () => {});
};

exports.exec = function exec(command, options) {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        gutil.log(stdout);
        gutil.log(stderr);
        reject(err);
      }
      resolve(stdout, stderr);
    });
  });
};

exports.checkStatusFile = function checkStatusFile(file, args, options) {
  return new Promise((resolve) => {
    childProcess.execFile(file, args, options,
                          err => resolve(err ? err.code : 0));
  });
};

exports.newer = function newer(src, dest, forceDestFile) {
  // We use gulp-newer to perform the test and convert it to a promise.
  const options = {
    dest,
  };

  if (forceDestFile) {
    options.map = function map() {
      return ".";
    };
  }

  return new Promise((resolve) => {
    const stream = gulp.src(src, { read: false })
            .pipe(gulpNewer(options));

    function end() {
      resolve(false);
    }

    stream.on("data", () => {
      stream.removeListener("end", end);
      stream.end();
      resolve(true);
    });

    stream.on("end", end);
  });
};

exports.copyIfNewer = function copyIfNewer(src, dest) {
  return src
    .pipe(gulpNewer(dest))
    .pipe(gulp.dest(dest));
};

exports.spawn = function spawn(cmd, args, options) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(cmd, args || [], options || {});

    child.on("exit", (code, signal) => {
      if (code) {
        reject(new Error(`child terminated with code: ${code}`));
        return;
      }

      if (signal) {
        reject(new Error(`child terminated with signal: ${signal}`));
        return;
      }

      resolve();
    });
  });
};

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
        gutil.log(result.stdout);
      }
    }, (err) => {
      if (err.stdout) {
        gutil.log(err.stdout);
      }
      throw err;
    });
};
