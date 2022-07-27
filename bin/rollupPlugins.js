'use strict';

// var nodeResolve = require('rollup-plugin-node-resolve');
// var replace = require('rollup-plugin-replace');
// var inject = require('rollup-plugin-inject');
var { nodeResolve } = require('@rollup/plugin-node-resolve');
var rollupCommonJs = require('@rollup/plugin-commonjs');
var { getBabelOutputPlugin } = require('@rollup/plugin-babel');
var replace = require('@rollup/plugin-replace');
var inject = require('@rollup/plugin-inject');
var nodePolyfills = require('rollup-plugin-node-polyfills');
// import nodePolyfills from 'rollup-plugin-node-polyfills';
// import resolve from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
// import replace from '@rollup/plugin-replace';

function rollupPlugins(nodeResolveConfig) {
  return [
    nodeResolve(nodeResolveConfig),
    rollupCommonJs({transformMixedEsModules: true}),
    // getBabelOutputPlugin({presets: ["es2015"], babelHelpers: 'bundled'}),
    getBabelOutputPlugin({presets: ["@babel/preset-env"], targets: {esmodules: true, node: "12.0"}}),
    replace({
      // we have switches for coverage; don't ship this to consumers
      'process.env.COVERAGE': JSON.stringify(!!process.env.COVERAGE),
      // test for fetch vs xhr
      'process.env.FETCH': JSON.stringify(!!process.env.FETCH)
    }),
    nodePolyfills(),
    inject({
      exclude: [
        '**/pouchdb-utils/src/assign.js',
        '**/pouchdb-collections/src/**'
      ],
      Map: ['pouchdb-collections', 'Map'],
      Set: ['pouchdb-collections', 'Set'],
      'Object.assign': ['pouchdb-utils', 'assign']
    })
  ];
}

module.exports = rollupPlugins;
