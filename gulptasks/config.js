/**
 * Definitions for the options passed on the command line. Each key in the
 * structure is an option name and the values are objects to be passed to
 * ``argparse``'s ``addArgument``.
 */
exports.optionDefinitions = {
  wget: {
    help: "Path to wget.",
    defaultValue: "wget",
  },
  rst2html: {
    help: "Path to rst2html.",
    defaultValue: "rst2html",
  },
  dev: {
    help: "Are we in development mode?",
    type: Boolean,
    defaultValue: false,
  },
  mocha_params: {
    help: "Parameters to pass to Mocha.",
    defaultValue: "",
  },
  skip_semver: {
    help: "If true skip the semver check.",
    type: Boolean,
    action: "storeTrue",
    defaultValue: undefined,
  },
  optimize: {
    help: "Whether the build should create an optimized version of " +
      "the demo by default.",
    type: Boolean,
    defaultValue: true,
  },
};

/**
 * The options that the user has actually set. The value here is meant to be set
 * by the main gulpfile.
 */
exports.options = {};
