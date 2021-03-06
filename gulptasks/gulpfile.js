const gulp = require("gulp");
const gulpNewer = require("gulp-newer");
const Promise = require("bluebird");
const path = require("path");
const requireDir = require("require-dir");
const eslintPlugin = require("gulp-eslint");
const { ArgumentParser } = require("argparse");
const config = require("./config");
const replace = require("gulp-replace");
const rename = require("gulp-rename");
const { execFile } = require("child-process-promise");
const { spawn } = require("child_process");
const { del, fs, execFileAndReport } = require("./util");

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

function runTSC(tsconfigPath, dest) {
  return execFileAndReport("./node_modules/.bin/tsc", ["-p", tsconfigPath,
                                                       "--outDir", dest]);
}

function tsc() {
  return runTSC("src/tsconfig.json", "build/dev/lib");
}

function copyPackageInfo() {
  const dest = "build/";
  return gulp.src(["package.json", "README.md"], { base: "." })
    .pipe(gulpNewer(dest))
    .pipe(gulp.dest(dest));
}

function copyOther() {
  return gulp.src(["web/**/*.{js,html,css}", "src/**/*.{js,html,css}"])
    .pipe(gulp.dest("build/dev/lib/"));
}

function runNGC() {
  return execFileAndReport("./node_modules/.bin/ngc",
                           ["-p", "src/tsconfig-aot.json"]);
}

// This creates an entry point that bootstraps from a module factory. The module
// factories are produced by the ngc compilation. The production version must
// boot from the factories instead of booting from the regular modules (which
// are JIT).
function createAOTMain() {
  return gulp.src("build/aot/dashboard.js")
    .pipe(replace("AppModule", "AppModuleNgFactory"))
    .pipe(replace("app.module", "app.module.ngfactory"))
    .pipe(replace("bootstrapModule", "bootstrapModuleFactory"))
    .pipe(rename("dashboard-aot.js"))
    .pipe(gulp.dest("build/aot/"));
}

const buildAOTCompiled =
      gulp.series(runNGC,
                  gulp.parallel(createAOTMain,
                                () => gulp.src(["src/**/*.{html,css}"])
                                .pipe(gulp.dest("build/aot"))));

function runWebpack() {
  return execFileAndReport("./node_modules/.bin/webpack", ["--color"]);
}

function runTslint(tsconfig, tslintConfig) {
  return spawn(
    "./node_modules/.bin/tslint",
    ["--project", tsconfig, "-c", tslintConfig, "-t", "verbose"],
    { stdio: "inherit" });
}

function tslintSrc() {
  return runTslint("src/tsconfig.json", "src/tslint.json");
}

function tslintTest() {
  return runTslint("test/tsconfig.json", "test/tslint.json");
}

const tslint = gulp.parallel(tslintSrc, tslintTest);

function eslint() {
  return gulp.src(["lib/**/*.js", "*.js", "bin/**", "config/**/*.js",
                   "gulptasks/**/*.js", "misc/**/*.js", "test/**/*.js",
                   "!test/data/**"])
    .pipe(eslintPlugin())
    .pipe(eslintPlugin.format())
    .pipe(eslintPlugin.failAfterError());
}

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


function testKarma() {
  return runKarma(["start", "--single-run"]);
}

const test = gulp.parallel(testKarma, tslint, eslint);

let packname;
function pack() {
  return execFile("npm", ["pack", "."], { cwd: "build" })
    .then((result) => {
      packname = result.stdout.trim();
    });
}

// =============
// === tasks ===
// =============

// builds

gulp.task("build-dev", gulp.parallel(tsc, copyOther));

gulp.task("build-prod", gulp.series(gulp.parallel(buildAOTCompiled, copyOther,
                                                  copyPackageInfo),
                                    runWebpack));

gulp.task("default", gulp.task("build-dev"));

// publishing

gulp.task("pack-notest",
          gulp.series(gulp.parallel("build-dev", "build-prod", copyPackageInfo),
                      pack));

gulp.task("pack",
          gulp.series(gulp.parallel("build-dev", "build-prod", copyPackageInfo),
                      gulp.parallel(test, pack)));

gulp.task("install-test",
          gulp.series("pack",
                      Promise.coroutine(function *install() {
                        const testDir = "build/install_dir";
                        yield del(testDir);
                        yield fs.mkdir(testDir);
                        yield fs.mkdir(path.join(testDir, "node_modules"));
                        yield execFile("npm", ["install", `../${packname}`],
                                       { cwd: testDir });
                        yield del(testDir);
                      })));

gulp.task("publish",
          gulp.series("install-test",
                      () => execFile("npm", ["publish", packname],
                                     { cwd: "build" })));
// linting

gulp.task("tslint-src", tslintSrc);

gulp.task("tslint-test", gulp.series(gulp.parallel(tsc, copyOther),
                                     tslintTest));

gulp.task("tslint", gulp.parallel("tslint-src", "tslint-test"));

gulp.task("eslint", eslint);

gulp.task("lint", gulp.parallel(eslint, "tslint"));

// testing

gulp.task("test-karma", gulp.series("build-dev", testKarma));

gulp.task("test", gulp.series("build-dev", test));

// watches

gulp.task("watch-web", () => {
  gulp.watch(["src/**/*", "web/**/*"], ["karma"]);
});

// clenaup

gulp.task("clean", () => del(["build", "*.html"]));

gulp.task("distclean",
          gulp.series("clean", () => del(["downloads", "node_modules"])));
