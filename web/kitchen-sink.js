/**
 * @module kitchen-sink
 * @desc A demo module for wed
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
define(function f(require) {
  "use strict";

  var wed = require("wed");
  var store = require("dashboard/store");
  var $ = require("jquery");
  var URI = require("urijs/URI");
  var lr = require("last-resort");
  var onerror = require("wed/onerror");
  var Promise = require("bluebird");

  // This installs last-resort on our current window and registers with it
  // wed's error handler.
  var onError = lr.install(window);
  onError.register(onerror.handler);

  var uri = new URI();
  var query = uri.query(true);
  var localstorage = query.localstorage;
  var options_param = query.options;
  var nodemo = query.nodemo;
  var managementURL = query.management;
  // We *could* get the pack from the XMLFile object. However, when automatic
  // association between packs and XML files is performed, this information is
  // not readily available. Rather than duplicate the work that is done in the
  // dashboard code proper, we require that the pack's link be passed as a
  // parameter.
  var packURL = query.pack;

  if (localstorage === undefined) {
    throw new Error("localstorage undefined");
  }

  Promise.try(function initial() {
    // Show the link...
    var file_management_link = document.getElementById("fm-link");
    file_management_link.style.display = "";
    if (managementURL) {
      file_management_link.href = managementURL;
    }

    return new Promise(function makePromise(resolve, reject) {
      require(["wed-store"], resolve, reject);
    }).then(function loaded(wedStore) {
      var options = {
        docURL: "/node_modules/wed/packed/doc/index.html",
        save: {
          path: "wed/savers/indexeddb",
          options: {
            getStore: function getStore() {
              return wedStore;
            },
            name: localstorage,
          },
        },
      };

      if (options_param === "noautoinsert") {
        options.mode.options = { autoinsert: false };
      }

      if (options_param === "ambiguous_fileDesc_insert") {
        options.mode.options = { ambiguous_fileDesc_insert: true };
      }

      if (options_param === "fileDesc_insert_needs_input") {
        options.mode.options = { fileDesc_insert_needs_input: true };
      }

      if (options_param === "hide_attributes") {
        options.mode.options = { hide_attributes: true };
      }

      // We don't want a demo dialog to show up in testing.
      if (!nodemo) {
        if (!localstorage) {
          options.demo =
            "You will not be able to save your modifications.";
        }
        else {
          options.demo =
            "Your modifications will be saved in local storage.";
        }
      }

      var r = new wed.Runtime(options);

      var deps = [localstorage];

      var text;
      Promise.all(deps.map(r.resolve.bind(r)))
        .then(function resolved(resolvedDeps) {
          var resolvedFile = resolvedDeps[0];
          // At this stage options.save.options.name contains a bogus value. Put
          // the file name there.
          options.save.options.name = resolvedFile.name;
          return Promise.all([
            store.db.chunks.get(resolvedFile.savedChunk)
              .then(function loadedChunk(chunk) {
                return chunk.getData();
              })
              .then(function resolvedData(data) {
                // This is a file from the indexeddb system. Resolve the pack.
                text = data;
              }),
            r.resolve(packURL).then(function packResolved(pack) {
              var schemaURL = store.db.makeIndexedDBURL(store.db.chunks,
                                                        pack.schema) + "/file";
              var metadataURL = pack.metadata &&
                  (store.db.makeIndexedDBURL(store.db.chunks, pack.metadata) +
                   "/file");
              options.schema = schemaURL;
              options.mode = {
                path: pack.mode,
                options: {
                },
              };

              var modeOptions = options.mode.options;
              if (metadataURL) {
                modeOptions.metadata = metadataURL;
              }
            }),
          ]);
        })
        .then(function start() {
          $(function ready() {
            var widget = document.getElementById("widget");
            window.wed_editor = wed.makeEditor(widget, options);
            window.wed_editor.init(text);
          });
        });
    });
  });
});
