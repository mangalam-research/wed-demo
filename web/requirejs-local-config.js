/* global process require */
(function bootstrap() {
  "use strict";
  var base = process.env.DASHBOARD_BASE;
  require.config({
    baseUrl: "/node_modules/wed/packed/lib",
    paths: {
      dashboard: base + "dashboard",
      "blueimp-md5": "/node_modules/blueimp-md5/js/md5.min",
      "wed-store": base + "wed-store",
      "kitchen-sink": base + "kitchen-sink",
    },
  });
}());
