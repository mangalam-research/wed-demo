/* global Promise SystemJS */
(function main() {
  "use strict";

  // Cancel the autorun. This essentially does the magic that the RequireJS
  // adapter (and maybe the SystemJS adapter too) do behind the scenes. We call
  // window.__karma__.start later.
  window.__karma__.loaded = function loaded() {};

  var allTestFiles = [];
  var TEST_REGEXP = /test\/(?!karma-main|data\/).*\.js$/i;

  Object.keys(window.__karma__.files).forEach(function forEach(file) {
    if (TEST_REGEXP.test(file)) {
      var normalizedTestModule = file.replace(/\.js$/g, "");
      allTestFiles.push(normalizedTestModule);
    }
  });
  var config = window.systemJSConfig;
  config.baseURL = "/base/build/dev/lib/";
  config.paths["npm:"] = "/base/node_modules/";
  config.map.sinon = "npm:sinon/pkg/sinon.js";
  config.map["sinon-chai"] = "npm:sinon-chai";
  config.map["check-error"] = "npm:check-error/check-error.js";
  config.map["@angular/router/testing"] =
    "npm:@angular/router/bundles/router-testing.umd.js";

  SystemJS.config(config);

  // These are preloaded by Karma as scripts that leak into the global space.
  SystemJS.amdDefine("mocha.js", [], {});
  SystemJS.amdDefine("chai.js", [], {});

  function importIt(file) {
    return SystemJS.import(file);
  }

  return Promise.all(["@angular/core/testing",
                      "@angular/platform-browser-dynamic/testing"]
                     .map(importIt))
    .then(function loaded(deps) {
      var testing = deps[0];
      var browser = deps[1];

      // This is needed so that the testbed is properly initialized.
      testing.TestBed.initTestEnvironment(
        browser.BrowserDynamicTestingModule,
        browser.platformBrowserDynamicTesting());

      return Promise.all(allTestFiles.reverse().map(importIt));
    })
    .then(window.__karma__.start);
}());
