// Inspired from
// https://github.com/angular/angular/blob/ca129ba549ad094c46bdd0b79618df39721aa378/aio/tools/examples/shared/boilerplate/systemjs/src/systemjs-angular-loader.js
//
// but fixed to work intelligently. The resources loaded through templateUrl and
// styleUrls are loaded through XMLHttpRequest, which don't benefit from any
// processing by SystemJS. So we have to build paths that are complete.
//
// Known limitations:
//
// - OMG! String search and replace. Barf!!! False positives are a real
//   possibility. We don't have much of a choice though because moduleId for
//   all intents and purposes deprecated, see:
//   https://angular.io/guide/change-log#all-mention-of-moduleid-removed-component-relative-paths-guide-deleted-2017-03-13
//
//   :( :( :(
//
// - This does not handle paths to resources that are outside the base path of
//   the page on which SystemJS is loaded.
//
// - We also don't handle paths that are more than just **paths**. Using a
//   hostname, a protocol scheme, a query, etc. All that will probably not work
//   right. **We** do not need them, and generally, the case for them is weak.
//
/* eslint-env commonjs */
"use strict";

var templateUrlRegex = /templateUrl\s*:(\s*['"`](.*?)['"`]\s*)/gm;
var stylesRegex = /styleUrls\s*:(\s*\[[^\]]*?\])/g;
var stringRegex = /(['`"])((?:[^\\]\\\1|.)*?)\1/g;

var anchor = document.createElement("a");
anchor.href = ".";
var pageUrl = anchor.pathname;

function resolve(basePath, url) {
  // We use the anchor element to normalize the URL so that relative paths are
  // handled.
  anchor.href = basePath + url;
  var absolute = anchor.pathname;

  // We convert to a URL relative to the page so as to work around an issue in
  // Angular. For whatever stupid reason Angular considers that styleUrls values
  // that are absolute are "unresolvable". Right...

  var curTop = pageUrl;
  var prefix = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (absolute.startsWith(curTop)) {
      return (prefix !== "" ? prefix : "./") +
        absolute.slice(curTop.length);
    }

    if (curTop === "/") {
      // We've already reached the top of the hierarchy and that did not
      // work.... somehow!?
      throw new Error("cannot convert URL: " + url);
    }

    anchor.href = curTop + "../";
    curTop = anchor.pathname;
    prefix += "../";
  }
}

module.exports.translate = function translate(load) {
  // Don't process those files that still use moduleId.
  if (load.source.indexOf("moduleId") !== -1) return load;

  // Get a "basePath" which is the module path without the final file name.
  anchor.href = load.address;
  var basePath = anchor.pathname.replace(/\/[^/]*$/, "/");
  if (basePath[basePath.length - 1] !== "/") {
    basePath += "/";
  }

  load.source = load.source
    .replace(templateUrlRegex, function replace(match, quote, url) {
      return "templateUrl: \"" + resolve(basePath, url) + "\"";
    })
    .replace(stylesRegex, function replace(_, relativeUrls) {
      var urls = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        var match = stringRegex.exec(relativeUrls);
        if (match === null) {
          break;
        }
        urls.push("\"" + resolve(basePath, match[2]) + "\"");
      }

      return "styleUrls: [" + urls.join(", ") + "]";
    });

  return load;
};
