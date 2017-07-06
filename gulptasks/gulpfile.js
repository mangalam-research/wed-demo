const gulp = require("gulp");
const gulpNewer = require("gulp-newer");
const Promise = require("bluebird");
const path = require("path");
const es = require("event-stream");
const requireDir = require("require-dir");
const eslint = require("gulp-eslint");
const replace = require("gulp-replace");
// const webpack = require("webpack");
const argparse = require("argparse");
const gulpTs = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
// const webWebpackConfig = require("../web/webpack.config");
const config = require("./config");
const { del, fs, newer, exec, execFile, spawn,
        mkdirpAsync } = require("./util");

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


const buildDeps = ["build-dev"];
// if (options.optimize) {
//   buildDeps.push("build-dev-optimized");
// }
gulp.task("build", buildDeps);

const moduleFix = /^(define\(\["require", "exports")(.*?\], function \(require, exports)(.*)$/m;
function tsc(project) {
  // The .once nonsense is to work around a gulp-typescript bug
  //
  // See: https://github.com/ivogabe/gulp-typescript/issues/295
  //
  // For the fix see:
  // https://github.com/ivogabe/gulp-typescript/issues/295#issuecomment-197299175
  //
  const result = project.src()
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(project())
        .once("error", function onError() {
          this.once("finish", () => {
            process.exit(1);
          });
        });

  const dest = "build/dev/lib";
  return es.merge(result.js
                  //
                  // This ``replace`` to work around the problem that ``module``
                  // is not defined when compiling to "amd". See:
                  //
                  // https://github.com/Microsoft/TypeScript/issues/13591
                  //
                  // We need to compile to "amd" for now.
                  //
                  .pipe(replace(moduleFix, "$1, \"module\"$2, module$3"))
                  .pipe(sourcemaps.write("."))
                  .pipe(gulp.dest(dest)),
                  result.dts.pipe(gulp.dest(dest)));
}

const project = gulpTs.createProject("src/tsconfig.json");
// The web part depends on the results of compiling wed.
gulp.task("tsc", () => tsc(project));

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

gulp.task("build-dev", ["tsc", "copy-other", "copy-package-info"]);

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

function htmlTask(suffix) {
  gulp.task(`build-html${suffix}`, () => {
    const dest = `build/dev${suffix}`;
    return gulp.src(["web/*.html", "web/dashboard/index.html"],
                    { base: "web" })
      .pipe(gulpNewer(dest))
      .pipe(gulp.dest(dest));
  });
}

htmlTask("");
htmlTask("-optimized");

gulp.task("default", ["build"]);

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
gulp.task("pack", ["test"],
  () => execFile("npm", ["pack", "."], { cwd: "build" })
    .then(([_packname]) => {
      packname = _packname.trim();
    }));

gulp.task("pack-notest", ["default"],
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
