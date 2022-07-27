#!/usr/bin/env node

// Build a single module using a generic Rollup-based build script.
// Reads in a src/index.js, writes to a lib/index.js. Might write
// index-browser.js if it detects that it needs to support a "browser" version.
//
// You can use this on the CLI by doing:
// build-module.js path/to/module

'use strict';

var rollup = require('rollup').rollup;
var rollupPlugins = require('./rollupPlugins');
var console = require('console');
// import { chalk } from 'chalk';
var chalk = require('chalk');

var path = require('path');
var denodeify = require('denodeify');
var mkdirPkg = require('mkdirp');
// var mkdirp = denodeify(mkdirPkg);
var mkdirp = mkdirPkg;
var rimraf = denodeify(require('rimraf'));
var builtInModules = require('builtin-modules');
// var fs = require('fs');
var fs = require('graceful-fs');
var all = Promise.all.bind(Promise);
// var all = async function(promiseArray) {
//   for (let prom of promiseArray) {
//     console.log("");
//     let res = await Promise.resolve(prom);

//   }
// }

// special case - pouchdb-for-coverage is heavily optimized because it's
// simpler to run the coverage reports that way.
// as for pouchdb-node/pouchdb-browser, these are heavily optimized
// through aggressive bundling, ala pouchdb, because it's assumed that
// for these packages bundle size is more important than modular deduping
var AGGRESSIVELY_BUNDLED_PACKAGES =
  // ['pouchdb-for-coverage', 'pouchdb-node', 'pouchdb-browser'];
  [];
// packages that only have a browser version
var BROWSER_ONLY_PACKAGES =
  ['pouchdb-browser'];
// packages that only use the browser field to ignore dependencies
var BROWSER_DEPENDENCY_ONLY_PACKAGES =
  ['pouchdb-adapter-leveldb'];

function buildModule(filepath) {
  var pkg = require(path.resolve(filepath, 'package.json'));
  var topPkg = require(path.resolve(filepath, '../../../package.json'));
  var pouchdbPackages = fs.readdirSync(path.resolve(filepath, '..'));
  // All external modules are assumed to be CommonJS, and therefore should
  // be skipped by Rollup. We may revisit this later.
  var depsToSkip = Object.keys(topPkg.dependencies || {})
    .concat(builtInModules);

  if (AGGRESSIVELY_BUNDLED_PACKAGES.indexOf(pkg.name) === -1) {
    depsToSkip = depsToSkip.concat(pouchdbPackages);
  }

  // browser & node vs one single vanilla version
  var versions = pkg.browser ? [false, true] : [false];

  // technically this is necessary in source code because browserify
  // needs to know about the browser switches in the lib/ folder
  // some modules don't need this check and should be skipped
  var skipBrowserField = BROWSER_DEPENDENCY_ONLY_PACKAGES.indexOf(pkg.name) !== -1;
  if (!skipBrowserField && pkg.browser && pkg.browser['./lib/index.js'] !==
      './lib/index-browser.js') {
    return Promise.reject(new Error(pkg.name +
      ' is missing a "lib/index.js" entry in the browser field'));
  }

  // special case for "pouchdb-browser" - there is only one index.js,
  // and it's built in "browser mode"
  var forceBrowser = BROWSER_ONLY_PACKAGES.indexOf(pkg.name) !== -1;

  var libDirectory = path.resolve(filepath, 'lib');
  return Promise.resolve().then(function () {
    console.log("Removing directory: '" + libDirectory + "'");
    return rimraf(libDirectory);
  }).then(function () {
    console.log("Creating directory: '" + libDirectory + "'");
    return mkdirp(libDirectory, {mode: 0o755, fs: fs});
  }).then(function () {
    return all(versions.map(function (isBrowser) {
      var pathToRollUp = path.resolve(filepath, './src/index.js');
      var rollupConfig = {
        input: pathToRollUp,
        external: depsToSkip,
        plugins: rollupPlugins({
          jsnext: true,
          browser: isBrowser || forceBrowser
        }),
        output: { exports: "default"},
      };
      console.log("\n\n\n\n\nROLLING UP: '" + pathToRollUp + "'\nwith config:\n" + JSON.stringify(rollupConfig) + "\n");
      return rollup(rollupConfig).then(function (bundle) {
        var formats = ['cjs', 'es'];
        return all(formats.map(function (format) {
          var file = (isBrowser ? 'lib/index-browser' : 'lib/index') +
            (format === 'es' ? '.es.js' : '.js');
          var rollupOutputPath = path.resolve(filepath, file);
          var rollupOutputConfig = {
            format: format,
            file: rollupOutputPath,
            exports: "named",
          };
          console.log("\n\nROLLUP OUTPUT FOR '" + pathToRollUp + "' IS:\n" + JSON.stringify(rollupOutputConfig) + "\n");
          return bundle.write(rollupOutputConfig).then(function () {
            console.log('  \u2713' + ' wrote ' +
              path.basename(filepath) + '/' + file + ' in ' +
                (isBrowser ? 'browser' :
                versions.length > 1 ? 'node' : 'vanilla') +
              ' mode');
          }).catch(function(err1) { console.log(chalk.bgRed("\n\n\n\n\n\n\n\n\n\nCAUGHT ERROR1 FOR PATH: '" + pathToRollUp + "'")); console.error(err1);});
        }));
      }).catch(function(err2) { console.log(chalk.bgRed("\n\n\n\n\n\n\n\n\n\nCAUGHT ERROR2 FOR PATH: '" + pathToRollUp + "'")); console.error(err2);});
    }));
  }).catch(function(err3) { console.log(chalk.bgRed("\n\n\n\n\n\n\n\n\n\nCAUGHT ERROR3 FOR PATH: '" + filepath + "'")); console.error(err3); });
}
if (require.main === module) {
  buildModule(process.argv[process.argv.length - 1]).catch(function (err) {
    console.error('build-module.js error');
    console.error(err.stack);
    process.exit(1);
  });
} else {
  module.exports = buildModule;
}
