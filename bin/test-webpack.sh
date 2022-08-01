#!/usr/bin/env bash

#
# Build PouchDB with Webpack instead of Browserify, and test that.
# We have this test because there are enough differences between
# Webpack and Browserify to justify it.
#

npm run build
# npm install --save-dev webpack@1.13.1 # do this on-demand to avoid slow installs
# npm install --save-dev webpack@4 # do this on-demand to avoid slow installs
# npm install --save-dev webpack-cli@4 # do this on-demand to avoid slow installs
node bin/update-package-json-for-publish.js
./node_modules/.bin/webpack --output-library PouchDB --output-library-target umd ./packages/node_modules/pouchdb --output pouchdb-webpack.js
BUILD_NODE_DONE=1 POUCHDB_SRC='../../pouchdb-webpack.js' npm test
