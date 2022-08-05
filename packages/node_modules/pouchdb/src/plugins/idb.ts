// this code only runs in the browser, as its own dist/ script

import IdbPouchPlugin from 'pouchdb-adapter-idb';
import { guardedConsole } from 'pouchdb-utils';

if (typeof PouchDB === 'undefined') {
  guardedConsole('error', 'idb adapter plugin error: ' +
    'Cannot find global "PouchDB" object! ' +
    'Did you remember to include pouchdb.js?');
} else {
  PouchDB.plugin(IdbPouchPlugin);
}