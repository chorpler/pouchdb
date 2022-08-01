'use strict';

console.log("Custom webpack config being used");

// module.exports = {
//   resolve: {},
//   module: {}
// }

/*
 * The webpack config exports an object that has a valid webpack configuration
 * For each environment name. By default, there are two Ionic environments:
 * "dev" and "prod". As such, the webpack.config.js exports a dictionary object
 * with "keys" for "dev" and "prod", where the value is a valid webpack configuration
 * For details on configuring webpack, see their documentation here
 * https://webpack.js.org/configuration/
 */
console.log("WEBPACK: Environment is:");
console.log(JSON.stringify(process.env,null,2));
// require('babel-loader');
var path = require('path');
// console.log("Path required!")
// var webpack = require('webpack');
// var ionicWebpackFactory = require(process.env.IONIC_WEBPACK_FACTORY);
var tsconfig = require('./tsconfig.json');
// console.log("TSCONFIG.JSON required!")

var ModuleConcatPlugin = require('webpack/lib/optimize/ModuleConcatenationPlugin');
// console.log("ConcatPlugin required!")
// var PurifyPlugin = require('@angular-devkit/build-optimizer').PurifyPlugin;
// console.log("PURIFYPLUGIN required!")

var Json5Plugin = require('json5-loader');

process.traceDeprecation = true;

/* No externals for this so far */
var EXTERNALS = [
  // "vin-lib",
  // "vin-generator",
];
// var SOURCE_MAP_TYPE = process.env.IONIC_SOURCE_MAP_TYPE;

// function srcPath(subdir) {
//   let subAppDirs = [
//     'components',
//     'directives',
//     'interfaces',
//     'pages',
//     'pipes',
//     'providers',
//     'tabs',
//   ];
//   let out;
//   if(subAppDirs.includes(subdir)) {
//     let appDir = srcPath('app');
//     out = path.join(appDir, subdir);
//   // } else if(subdir.includes('ngx-dnd')) {
//   //   out = path.join(__dirname, "..", "..", "forks", "ngx-dnd", "dist", "lib");
//   } else if(subdir === 'domain') {
//     // out = path.join(__dirname, "..", "..", "domain", "OnSiteDomain", "src");
//     out = path.join(__dirname, "..", "OnSiteDomain", "src");
//   } else {
//     // console.log(`srcPath(): '${subdir}' path is:`, dir);
//     out = path.join(__dirname, 'src', subdir);
//   }
//   console.log(`SRCPATH('${subdir}'): '${out}'`);
//   return out;
// }

// function getAliases() {
//   let out = {
//     app        : srcPath('app')        ,
//     assets     : srcPath('assets')     ,
//     components : srcPath('components') ,
//     config     : srcPath('config')     ,
//     directives : srcPath('directives') ,
//     domain     : srcPath('domain')     ,
//     interfaces : srcPath('interfaces') ,
//     lib        : srcPath('lib')        ,
//     pages      : srcPath('pages')      ,
//     pipes      : srcPath('pipes')      ,
//     providers  : srcPath('providers')  ,
//     tabs       : srcPath('tabs')       ,
//   };
//   return out;
// }

var optimizedProdLoaders = [
  {
    test: /\.json(5|c)$/,
    loader: 'json5-loader',
  },
  { test: /[\/\\]@angular[\/\\].+\.js$/, parser: { system: true } },
  // ,
  // {
  //   test: /\.json$/,
  //   loader: 'json-loader'
  // }
  // ,
];

var devLoaders = [
  {
    test: /\.json(5|c)$/,
    loader: 'json5-loader',
    parser: {
      system: true,
    },
  },
  { test: /[\/\\]@angular[\/\\].+\.js$/, parser: { system: true } },
  { test: /codec-pool-worker\.js$/, use: { loader: "worker-loader" }, },
  // ,
  // {
  //   test: /\.json$/,
  //   loader: 'json-loader'
  // }
  // ,
];

function getDevLoaders() {
  return devLoaders;
}
function getProdLoaders() {
  if (process.env.IONIC_OPTIMIZE_JS === 'true') {
    // return optimizedProdLoaders;
    return devLoaders;
  }
  return devLoaders;
}

var devConfig = {
  // output: {
  //   // path: '{{BUILD}}',
  //   path: '',
  //   publicPath: 'build/',
  //   filename: '[name].js',
  //   // devtoolModuleFilenameTemplate: ionicWebpackFactory.getSourceMapperFunction(),
  // },
  // devtool: process.env.IONIC_SOURCE_MAP_TYPE,
  devtool: 'inline-source-map',

  resolve: {
    symlinks: false,
    // alias: getAliases(),
    extensions: ['.ts', '.js', '.json', '.json5'],
    // modules: [path.resolve('node_modules')]
    // modules: [ path.resolve('node_modules'), path.resolve(tsconfig.compilerOptions.baseUrl) ]
  },
  externals: [
    (function () {
      return function (context, request, callback) {
        if(EXTERNALS.indexOf(request) > -1) {
          console.log("externals: found request: ", request);
          // return callback(null, "'" + request + "'");
          // if(request === 'crypto') {
          //   return callback(null, "require('crypto-browserify')");
          // } else {
            return callback(null, "require('" + request + "')");
          // }
          // return callback(null, request);
        }
        return callback();
      };
    })()
  ],
  module: {
    rules: getDevLoaders(),
  },

  plugins: [
    // ionicWebpackFactory.getIonicEnvironmentPlugin(),
    // ionicWebpackFactory.getCommonChunksPlugin(),
    new ModuleConcatPlugin(),
    // new PurifyPlugin(),
  ],

  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
};

var prodConfig = {
  // entry: process.env.IONIC_APP_ENTRY_POINT,
  output: {
    path: '{{BUILD}}',
    publicPath: 'build/',
    filename: '[name].js',
    // devtoolModuleFilenameTemplate: ionicWebpackFactory.getSourceMapperFunction(),
  },
  // devtool: process.env.IONIC_SOURCE_MAP_TYPE,
  // devtool: 'inline-source-map',
  resolve: {
    symlinks: false,
    alias: getAliases(),
    extensions: ['.ts', '.js', '.json', '.json5'],
    // modules: [path.resolve('node_modules')]
    modules: [ path.resolve('node_modules'), path.resolve(tsconfig.compilerOptions.baseUrl) ]
  },
  externals: [
    (function () {
      return function (context, request, callback) {
        if(EXTERNALS.indexOf(request) > -1) {
          console.log("externals: found request: ", request);
          // return callback(null, "'" + request + "'");
          // if(request === 'crypto') {
          //   return callback(null, "require('crypto-browserify')");
          // } else {
            return callback(null, "require('" + request + "')");
          // }
          // return callback(null, request);
        }
        return callback();
      };
    })()
  ],
  module: {
    loaders: getProdLoaders()
  },

  plugins: [
    new ModuleConcatPlugin(),
    // new PurifyPlugin(),
  ],

  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
};


// module.exports = {
//   dev: devConfig,
//   prod: prodConfig
// }

module.exports = devConfig;
