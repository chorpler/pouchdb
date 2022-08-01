'use strict';

var nodeResolve = require('rollup-plugin-node-resolve');
var replace = require('rollup-plugin-replace');
var inject = require('rollup-plugin-inject');
var commonJsPlugin = require('rollup-plugin-commonjs');
var babelPlugin = require('rollup-plugin-babel');

function rollupPlugins(nodeResolveConfig) {
  return [
    commonJsPlugin(),
    // babelPlugin(),
    nodeResolve(nodeResolveConfig),
    replace({
      // we have switches for coverage; don't ship this to consumers
      'process.env.COVERAGE': JSON.stringify(!!process.env.COVERAGE),
      // test for fetch vs xhr
      'process.env.FETCH': JSON.stringify(!!process.env.FETCH),
      'process.env.NODE_ENV': JSON.stringify("development"),
    }),
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
