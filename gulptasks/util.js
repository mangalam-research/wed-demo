const gulp = require("gulp");
const gulpNewer = require("gulp-newer");
const childProcess = require("child_process");
const Promise = require("bluebird");
const gutil = require("gulp-util");
const _fs = require("fs-extra");
const _del = require("del");
const touch = require("touch");
const path = require("path");
const { internals } = require("./config");

const fs = Promise.promisifyAll(_fs);
exports.fs = fs;

exports.touchAsync = Promise.promisify(touch);
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

exports.checkOutputFile = function checkOutputFile(file, args, options) {
  return new Promise((resolve, reject) => {
    childProcess.execFile(file, args, options,
                          (err, stdout, stderr) => {
                            if (err) {
                              gutil.log(stdout);
                              gutil.log(stderr);
                              reject(err);
                              return;
                            }
                            resolve([stdout, stderr]);
                          });
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

exports.sameFiles = function sameFiles(a, b) {
  return Promise.coroutine(function *gen() {
    const [statsA, statsB] = yield Promise.all([
      fs.statAsync(a).catch(() => null),
      fs.statAsync(b).catch(() => null)]);

    if (!statsA || !statsB || statsA.size !== statsB.size) {
      return false;
    }

    const size = statsA.size;

    const [fdA, fdB] = yield Promise.all([
      fs.openAsync(a, "r"),
      fs.openAsync(b, "r")]);

    const bufsize = 64 * 1024;
    const bufA = new Buffer(bufsize);
    const bufB = new Buffer(bufsize);
    bufA.fill(0);
    bufB.fill(0);
    let read = 0;

    while (read < size) {
      yield Promise.all([
        fs.readAsync(fdA, bufA, 0, bufsize, read),
        fs.readAsync(fdB, bufB, 0, bufsize, read),
      ]);
      // The last read will probably be partially filling the buffer but it does
      // not matter because in the previous iteration, the data was equal.
      if (!bufA.equals(bufB)) {
        return false;
      }
      read += bufsize;
    }

    return true;
  })();
};

exports.stampPath = function stampPath(name) {
  return path.join(internals.stampDir, `${name}.stamp`);
};

exports.existsInFile = function existsInFile(fpath, re) {
  return fs.readFileAsync(fpath).then(data => data.toString().search(re) !== -1);
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

exports.sequence = function sequence(name, ...tasks) {
  const allDeps = [];
  const funcs = [];

  // The last element of tasks can be a final function to run after
  // all the tasks.
  let final = tasks[tasks.length - 1];

  if (final instanceof Function) {
    tasks.pop();
  } // Normalize the array.
  else {
    final = undefined;
  } // No final function to run.

  for (const task of tasks) {
    let func = task.func;
    // Ideally we'd use a instanceof test but apparently babel
    // does not make a GeneratorFunction global available...
    func = func.constructor.name === "GeneratorFunction" ?
      Promise.coroutine(func) : func;
    gulp.task(task.name, task.deps, func);
    allDeps.push(task.deps);
    funcs.push(func);
  }

  const flattened = [].concat(...allDeps);

  if (final) {
    funcs.push(final);
  }

  function *routine() {
    for (const func of funcs) {
      yield func();
    }
  }

  gulp.task(name, flattened, Promise.coroutine(routine));

  return {
    name,
    deps: flattened,
    func: routine,
  };
};
