const gulp = require("gulp");
const gulpNewer = require("gulp-newer");
const Promise = require("bluebird");
const path = require("path");
const requireDir = require("require-dir");
const eslint = require("gulp-eslint");
const argparse = require("argparse");
const config = require("./config");
const cpp = require("child-process-promise");
const { del, fs, newer, exec, execFileAndReport, spawn,
        mkdirpAsync } = require("./util");

const execFile = cpp.execFile;

const ArgumentParser = argparse.ArgumentParser;

// Try to load local configuration options.
let localConfig = {};
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  localConfig = require("../gulp.local");
}
catch (e) {
  if (e.code !== "MODULE_NOT_FOUND") {
    throw e;
  }
}

const parser = new ArgumentParser({ addHelp: true });

// eslint-disable-next-line guard-for-in
for (const prop in config.optionDefinitions) {
  const optionOptions = config.optionDefinitions[prop];
  const localOverride = localConfig[prop];
  if (localOverride !== undefined) {
    optionOptions.defaultValue = localOverride;
  }

  const optionName = prop.replace(/_/g, "-");
  parser.addArgument([`--${optionName}`], optionOptions);
}

// We have this here so that the help message is more useful than
// without. At the same time, this positional argument is not
// *required*.
parser.addArgument(["target"], {
  help: "Target to execute.",
  nargs: "?",
  defaultValue: "default",
});

const options = config.options = parser.parseArgs(process.argv.slice(2));

// We purposely import the files there at this point so that the
// configuration is set once and for all before they execute. Doing
// this allows having code that depends on the configuration values.
requireDir(".");

function tsc(tsconfigPath, dest) {
  return execFileAndReport("./node_modules/.bin/tsc", ["-p", tsconfigPath,
                                                       "--outDir", dest]);
}

gulp.task("tsc", () => tsc("src/tsconfig.json", "build/dev/lib"));

gulp.task("copy-package-info", () => {
  const dest = "build/";
  return gulp.src(
    [
      "package.json",
      "README.md",
    ],
    { base: "." })
    .pipe(gulpNewer(dest))
    .pipe(gulp.dest(dest));
});

gulp.task("copy-other",
          () => gulp.src(["web/**/*.{js,html,css}", "src/**/*.{js,html,css}"])
          .pipe(gulp.dest("build/dev/lib/")));

gulp.task("build-dev", ["tsc", "copy-other"]);

gulp.task("webpack", ["build-aot-compiled", "copy-other"], () =>
          execFileAndReport("./node_modules/.bin/webpack", ["--color"]));

gulp.task("build-prod", ["webpack"]);

gulp.task("build-info", Promise.coroutine(function *task() {
  const dest = "build/dev/lib/build-info.js";
  const isNewer = yield newer(["lib/**", "!**/*_flymake.*"], dest);
  if (!isNewer) {
    return;
  }

  yield mkdirpAsync(path.dirname(dest));

  yield exec("node misc/generate_build_info.js --unclean " +
             `--module > ${dest}`);
}));

gulp.task("default", ["build-dev"]);

function runTslint(tsconfig, tslintConfig) {
  return spawn(
    "./node_modules/.bin/tslint",
    ["--type-check", "--project", tsconfig, "-c", tslintConfig,
     "-t", "verbose"],
    { stdio: "inherit" });
}

gulp.task("tslint-src", () => runTslint("src/tsconfig.json", "src/tslint.json"));

gulp.task("tslint-test", ["tsc"],
          () => runTslint("test/tsconfig.json", "test/tslint.json"));

gulp.task("tslint", ["tslint-src", "tslint-test"]);

gulp.task("eslint", () =>
          gulp.src(["lib/**/*.js", "*.js", "bin/**", "config/**/*.js",
                    "gulptasks/**/*.js", "misc/**/*.js", "test/**/*.js",
                    "!test/data/**"])
          .pipe(eslint())
          .pipe(eslint.format())
          .pipe(eslint.failAfterError()));

gulp.task("lint", ["eslint", "tslint"]);

//
// Spawning a process due to this:
//
// https://github.com/TypeStrong/ts-node/issues/286
//
function runKarma(localOptions) {
  // We cannot let it be set to ``null`` or ``undefined``.
  if (options.browsers) {
    localOptions = localOptions.concat("--browsers", options.browsers);
  }
  return spawn("./node_modules/.bin/karma", localOptions, { stdio: "inherit" });
}

gulp.task("test-karma", ["build-dev"],
          () => runKarma(["start", "--single-run"]));

gulp.task("test", ["test-karma", "tslint", "eslint"]);

let packname;
gulp.task("pack", ["test", "build-prod"],
  () => execFile("npm", ["pack", "."], { cwd: "build" })
    .then((result) => {
      packname = result.stdout.trim();
    }));

gulp.task("pack-notest", ["build-prod"],
          () => execFile("npm", ["pack", "."], { cwd: "build" }));

gulp.task("install-test", ["pack"], Promise.coroutine(function *install() {
  const testDir = "build/install_dir";
  yield del(testDir);
  yield fs.mkdirAsync(testDir);
  yield fs.mkdirAsync(path.join(testDir, "node_modules"));
  yield execFile("npm", ["install", `../${packname}`], { cwd: testDir });
  yield del(testDir);
}));

gulp.task("publish", ["install-test"],
          () => execFile("npm", ["publish", packname], { cwd: "build" }));

gulp.task("clean", () => del(["build", "*.html"]));

gulp.task("distclean", ["clean"],
          () => del(["downloads", "node_modules"]));

gulp.task("watch-web", () => {
  gulp.watch(["src/**/*", "web/**/*"], ["karma"]);
});
