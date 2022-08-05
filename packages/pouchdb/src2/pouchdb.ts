// import * as PouchDBAuth from 'pouchdb-auth'           ;
// import * as PDBAuth     from 'pouchdb-authentication' ;
// import * as pdbFind     from 'pouchdb-find'           ;
// import * as pdbUpsert   from 'pouchdb-upsert'         ;
// import * as pdbAllDBs   from 'pouchdb-all-dbs'        ;
// import * as pdbSQLite   from 'pouchdb-adapter-cordova-sqlite'   ;
// import * as pdbFruitdown        from 'pouchdb-adapter-fruitdown';
// import { Injectable   } from '@angular/core'          ;
// import { Log                  } from 'domain/onsitexdomain'   ;
// import { Preferences          } from './preferences'          ;
// import   PouchDB                from 'pouchdb'                ;
// import * as workerPouch         from 'worker-pouch'           ;
// import PouchDB from 'pouchdb-authentication';
// import * as pdbAllDBs           from 'pouchdb-all-dbs'            ;

import      PouchDB             from 'pouchdb-core'                  ;
import * as pdbDebug            from 'pouchdb-debug'                 ;
import * as pdbMapReduce        from 'pouchdb-mapreduce'             ;
import * as pdbReplication      from 'pouchdb-replication'           ;
import * as httpPouch           from 'pouchdb-adapter-http'          ;
import * as pdbWebSQL           from 'pouchdb-adapter-websql'        ;
// import * as PDBAuth             from '@onsite/pouchdb-auth-utils'    ;
import * as pdbIDB              from 'pouchdb-adapter-idb'           ;
import * as pdbFind             from 'pouchdb-find'                  ;
import * as pdbUpsert           from '@onsite/pouchdb-upsert-plugin' ;
// import * as workerPouch         from 'worker-pouch'                  ;


// export const addPouchDBPlugin:Function = (pouchdbObject:any, plugin:any) => {
//   if(plugin) {
//     if(plugin['default'] !== undefined) {
//       pouchdbObject.plugin(plugin.default);
//     } else {
//       pouchdbObject.plugin(plugin);
//     }
//   } else {
//     Log.w(`addPouchDBPlugin(): This plugin did not exist:\n`, plugin);
//     return;
//   }
// };

const addPouchDBPlugin = (pouchdbObject:any, plugin:any, description?:string) => {
  let text:string = typeof description === 'string' ? description : "unknown";
  let key:string = text === 'unknown' ? UUID.v4() : text;
  // Log.l(`addPouchDBPLugin(): Attempting to add plugin '${text}':`, plugin);
  Log.l(`addPouchDBPLugin(): Attempting to add plugin '${text}' …`);
  if(pouchdbObject && typeof pouchdbObject.plugin === 'function') {
    if(plugin) {
      // PouchDBService.plugins[text] = plugin;
      // tslint:disable-next-line: no-use-before-declare
      PouchDBService.plugins[key] = plugin;
      if(plugin['default'] != null) {
        pouchdbObject.plugin(plugin.default);
      } else {
        pouchdbObject.plugin(plugin);
      }
      return pouchdbObject;
    } else {
      Log.w(`addPouchDBPlugin(): plugin '${text}' did not exist:`, plugin);
      return pouchdbObject;
    }
  } else {
    Log.e(`addPouchDBPlugin(): Invalid PouchDB constructor provided: `, pouchdbObject);
    return null;
  }
};

@Injectable({
  providedIn: 'root',
})
export class PouchDBService {
  // public PouchDB : any = (PouchDB as Database).default;
  public PouchDB : any = PouchDB;
  public StaticPouchDB : any           = this.PouchDB     ;
  public static plugins:any = {};
  public get plugins():any { return PouchDBService.plugins; }
  public set plugins(val:any) { PouchDBService.plugins = val; }
  public working       : boolean       = false            ;
  public initialized   : boolean       = false            ;
  public pdb           : DBList        = new Map()        ;
  public rdb           : DBList        = new Map()        ;
  public PDBSyncs      : DBSyncList    = new Map()        ;
  public InitialSyncs  : DBSyncList    = new Map()        ;
  public DBSyncHandles : DBSyncHandles = new Map()        ;
  public DBSyncTimers  : DBSyncTimers  = new Map()        ;
  public pdbAdapter    : {adapter:string}     = {adapter: 'idb'} ;
  // public forceiOSWebSQL: boolean       = true            ;
  public forceiOSWebSQL: boolean       = false            ;
  // public forceWorker   : boolean       = true             ;
  public forceWorker   : boolean       = false            ;
  // public get prefs() { return this.PREFS;}             ;
  // public get prefs() { return this.PREFS;}             ;
  // public devicePlatform:Platform = new Platform()         ;
  public static remoteAuth = {
    user: "",
    pass: "",
  };
  public get remoteAuth() { return PouchDBService.remoteAuth; }
  public set remoteAuth(val) { PouchDBService.remoteAuth = val; }

  constructor(
    public platform : Platform    ,
    public prefs    : Preferences ,
    public device   : Device      ,
  ) {
    Log.l('Hello PouchDBService Provider');
    window['Pouch'] = PouchDB;
    window['PouchDB'] = PouchDB;
    // this.setupGlobals();
    this.platform.ready().then(res => {
      this.PouchInit();
    });
    // window['PouchDB'] = (PouchDB as any).default;
    // window['PouchDBFind'] = pdbFind;
    // window['PDBAuth'] = PDBAuth;
    // window['PDBSqlite'] = pdbSQLite;
  // window['PouchDBStatic'] = PouchDB.Static;
  }

  public setupGlobals() {
    window['onsitePlatform']              = Platform                     ;
    // window['onsiteDevicePlatform']        = this.devicePlatform          ;
    window['onsitePouchDB']               = PouchDB                      ;
    window['onsitePouchDBService']        = PouchDBService               ;
    window['onsitepouchdbworker']         = workerPouch                  ;
    window['onsitepouchdbauthentication'] = PDBAuth                      ;
    // window['onsitepouchdbworker']         = workerPouch                  ;
    window['onsitepouchdbauthentication'] = PDBAuth                      ;
    window['onsitepouchdbfind']           = pdbFind                      ;
    // window['onsitediskspace']             = DiskSpace                    ;
  }

  public PouchInit():Database {
    if(!this.initialized) {
      this.setupGlobals();
      let pouchdb:any = this.PouchDB;
      if(this.PouchDB && this.PouchDB['default']) {
        pouchdb = this.PouchDB.default;
      }
      let opts = this.getPouchAdapter();
      Log.l(`PouchInit(): setting up PouchDB with options:`, opts);
      // let pouchdb = (PouchDB as any).default;
      addPouchDBPlugin(pouchdb, pdbDebug, 'debug');
      addPouchDBPlugin(pouchdb, pdbMapReduce, 'mapreduce');
      addPouchDBPlugin(pouchdb, pdbReplication, 'replication');
      addPouchDBPlugin(pouchdb, pdbFind, 'find');
      addPouchDBPlugin(pouchdb, pdbUpsert, 'upsert');
      addPouchDBPlugin(pouchdb, PDBAuth, 'auth');
      addPouchDBPlugin(pouchdb, pdbIDB, 'adapter-idb');
      addPouchDBPlugin(pouchdb, httpPouch, 'adapter-http');
      addPouchDBPlugin(pouchdb, pdbWebSQL, 'adapter-websql');
      // addPouchDBPlugin(pouchdb, pdbFruitdown);
      // addPouchDBPlugin(pouchdb, pdbAllDBs);
      // let pdbauth:any = (PDBAuth as any).default;
      // pouchdb.plugin(pdbSQLite);
      // pouchdb.plugin(pdbUpsert);
      // pouchdb.plugin(pdbauth);
      // pouchdb.plugin(pdbFind.default);
      pouchdb.adapter('worker', workerPouch, 'adapter-worker');
      // pouchdb.plugin(pdbAllDBs);
      window["pouchdbserv"] = this;
      // window["StaticPouchDB"] = PouchDB;
      this.StaticPouchDB = pouchdb;
      this.initialized = true;
      return this.StaticPouchDB;
    } else {
      return this.StaticPouchDB;
    }
  }

  public getPouchAdapter():{adapter:string} {
    // let platform = this.devicePlatform;
    let platform:Platform = this.platform;
    let options:{adapter:string} = { adapter: 'idb' };
    if(platform.is('cordova')) {
      // let osVersion = platform.version();
      let osVersion = this.device.version;
      let vers = osVersion.split('.');
      if(platform.is('ios')) {
        if(this.forceiOSWebSQL) {
          options.adapter = 'websql';
        } else {
          let version:number = Number(vers[0]);
          if(isNumber(version)) {
            if(version < 11) {
              options = {
                adapter: 'websql',
              };
            }
          }
        }
        // options = {
        //   adapter: 'cordova-sqlite',
        //   iosDatabaseLocation: 'Library',
        //   androidDatabaseImplementation: 2,
        // };
      }
    } else {
      if(this.isDesktopSafari()) {
        options = {
          // adapter: 'fruitdown',
          // adapter: 'websql',
          adapter: 'idb',
        };
      }
    }
    if(this.forceWorker) {
      options.adapter = 'worker';
    }
    this.pdbAdapter = options;
    return this.pdbAdapter;
  }

  public isDesktopSafari():boolean {
    let out:boolean = false;
    let agent:string = window && window.navigator && window.navigator.userAgent ? window.navigator.userAgent : "unknown";
    if((agent.indexOf("Macintosh") !== -1 || agent.indexOf("iPod") !== -1 || agent.indexOf("iPhone") !== 1 || agent.indexOf("iPad") !== 1) && (agent.indexOf("Version/") !== -1 || agent.indexOf("Mobile/") !== -1)) {
      out = true;
    }
    return out;
  }

  // public getAuthPouchDB() {
  //   return new Promise((resolve, reject) => {
  //     // let pouchdb = PouchDB;
  //     // pouchdb.plugin(pdbUpsert);
  //     // pouchdb.plugin(pdbFind);
  //     // pouchdb.plugin(PDBAuth);
  //     // pouchdb.plugin(PouchDBAuth);
  //     this.setupGlobals();
  //     let pouchdb:any = PouchDB;
  //     if(PouchDB && PouchDB['default']) {
  //       pouchdb = PouchDB.default;
  //     }
  //     // let pouchdb = (PouchDB as any).default;
  //     addPouchDBPlugin(pouchdb, PDBAuth);
  //     addPouchDBPlugin(pouchdb, pdbUpsert);
  //     addPouchDBPlugin(pouchdb, pdbFind);
  //     addPouchDBPlugin(pouchdb, pdbSQLite);
  //     // addPouchDBPlugin(pouchdb, pdbAllDBs);
  //     window["pouchdbserv"] = this;
  //     // window["StaticPouchDB"] = pouchdb;
  //     this.StaticPouchDB = pouchdb;
  //     resolve(this.StaticPouchDB);
  //   });
  // }

  public getPouchDB():Database {
    return this.StaticPouchDB;
  }

  public getDB(dbname:string):Database {
    let dbmap:DBList = this.pdb;
    if(dbmap.has(dbname)) {
      // Log.l(`getDB(): Not adding local database ${dbname} because it already exists.`);
      return dbmap.get(dbname);
    } else {
      return null;
    }
  }

  public getRDB(dbname:string):Database {
    let dbmap:DBList = this.rdb;
    if(dbmap.has(dbname)) {
      // Log.l(`getRDB(): Not adding local database ${dbname} because it already exists.`);
      return dbmap.get(dbname);
    } else {
      return null;
    }
  }

  public addDB(dbname:string):Database {
    if(!dbname || dbname === 'null' || dbname === 'undefined') {
      Log.w(`PouchDBService.addDB(): Not adding null or undefined database`);
      return;
    }
    let dbmap:DBList = this.pdb;
    // let opts = {adapter: 'websql'};
    // let opts = {adapter: 'idb'};
    // let opts = {adapter: 'cordova-sqlite'};
    // let opts = {};
    let opts:{adapter:string} = this.pdbAdapter;
    if(dbmap.has(dbname)) {
      // Log.l(`addDB(): Not adding local database ${dbname} because it already exists.`);
      return dbmap.get(dbname);
    } else {
      Log.l(`PouchDBService.addDB(): Addeding new local database '${dbname}' with options:`, opts);
      let db:Database = new PouchDB(dbname, opts);
      Log.l(`PouchDBService.addDB(): Done adding '${dbname}' with options:`, opts);
      dbmap.set(dbname, db);
      // db
      return dbmap.get(dbname);
    }
  }

  public addRDB(dbname:string, options?:any):Database {
    if(!dbname || dbname === 'null' || dbname === 'undefined') {
      Log.w(`PouchDBService.addRDB(): Not adding null or undefined database`);
      return;
    }
    let rdbmap:DBList = this.rdb;
    // let PREFS = this.PREFS;
    // let SERVER = this.prefs.getServer();
    // let url = SERVER.rdbServer.protocol + "://" + SERVER.rdbServer.server + "/" + dbname;
    let ropts:any = Preferences.getRemoteOptions();
    let opts:any = options != null ? options : ropts;
    // Log.l(`addRDB(): Now fetching remote DB ${dbname} at ${url} …`);
    const fetcher:Fetch = function(url:string, fetchOpts:RequestInit):Promise<Response> {
      return PouchDBService.pouchFetch(url, fetchOpts);
    };
    if(this.hasAuth()) {
      opts.fetch = fetcher;
    }
    if(rdbmap.has(dbname)) {
      return rdbmap.get(dbname);
    } else {
      let remoteURL:string = this.prefs.getRemoteDBNameURL(dbname);
      Log.l(`PouchDBService.addRDB(): First login to '${remoteURL}' with options:\n`, opts);
      let rdb1:Database = new PouchDB(remoteURL, opts);
      (rdb1 as any)._remote = true;
      rdbmap.set(dbname, rdb1);
      // Log.l(`addRDB(): Added remote database ${url} to the list as ${dbname}.`);
      return rdbmap.get(dbname);
    }
  }

  public updateServerForAllDatabases(protocol:ProtocolType, hostname:string, port:number) {
    let rdbmap:DBList = this.rdb;
    let keys:string[] = Array.from(rdbmap.keys());
    this.prefs.setProtocol(protocol);
    this.prefs.setHostname(hostname);
    this.prefs.setPort(port);
    let base = this.prefs.getRemoteURL();
    Log.l(`PouchDBService.updateServerForAllDatabases(): Setting base URL to '${base}' for databases:`, keys);
    for(let dbname of keys) {
      let rdb:Database = rdbmap.get(dbname);
      rdbmap.delete(dbname);
      let newRDB:Database = this.addRDB(dbname);
      Log.l(`PouchDBService.updateServerForAllDatabases(): New version of '${dbname}' is:`, newRDB);
    }
    Log.l(`PouchDBService.updateServerForAllDatabases(): Done updating`);
  }

  public async fetchWithTimeout(url:string, opts?:any):Promise<any> {
    let timer;
    return new Promise((resolve, reject) => {
      let options = opts && typeof opts === 'object' ? opts : typeof opts === 'number' ? { timeout: opts } : { timeout: 30000 };
      let timeout = options.timeout;
      // Set timeout timer
      timer = setTimeout(() => reject(new Error(`fetchWithTimeout(): Fetch request for '${url}' timed out`)), timeout);
      fetch(url, options).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      }).finally( () => clearTimeout(timer) );
    });
  }

  public async executeWithTimeout(timeout:number, cb:Function, cbArguments?:any[]):Promise<any> {
    let timer;
    return new Promise((resolve, reject) => {
      let ms = timeout && typeof timeout === 'number' ? timeout : 30000;
      // Set timeout timer
      timer = setTimeout(() => reject(new Error(`PouchDBService.executeWithTimeout(): Execute function timed out`)), ms);
      cb(...cbArguments).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      }).finally( () => clearTimeout(timer) );
    });
  }

  public addSync(dbname:string, dbsync:PDBSync, timer?:MomentTimer):PDBSync {
    let syncmap:DBSyncList    = this.PDBSyncs;
    // let handles:DBSyncHandles = this.DBSyncHandles;
    let timers:DBSyncTimers   = this.DBSyncTimers;
    if(syncmap.has(dbname)) {
      let syncevent:PDBSync = syncmap.get(dbname);
      syncevent.cancel();
    }
    syncmap.set(dbname, dbsync);
    if(timer != null) {
      timers.set(dbname, timer);
    }
    return syncmap.get(dbname);
  }

  public getSync(dbname:string):PDBSync {
    let syncmap:DBSyncList = this.PDBSyncs;
    let outVal:PDBSync = null;
    if(syncmap.has(dbname)) {
      outVal = syncmap.get(dbname);
    } else {
      Log.w(`PouchDBService.getSync('${dbname}'): Entry not found in sync list!`);
    }
    return outVal;
  }

  public setSyncTimer(dbname:string, timer:MomentTimer):MomentTimer {
    let timers:DBSyncTimers = this.DBSyncTimers;
    timers.set(dbname, timer);
    return timer;
  }

  public getSyncTimer(dbname:string):MomentTimer {
    let timers:DBSyncTimers = this.DBSyncTimers;
    let timer:MomentTimer;
    if(timers.has(dbname)) {
      timer = timers.get(dbname);
    } else {
      Log.w(`PouchDBService.getSyncTimer('${dbname}'): Entry not found in sync timer list!`);
    }
    return timer;
  }

  public setSyncHandle(dbname:string, handle:TimerHandle):TimerHandle {
    let handles:DBSyncHandles = this.DBSyncHandles;
    handles.set(dbname, handle);
    return handle;
  }

  public getSyncHandle(dbname:string):TimerHandle {
    let handles:DBSyncHandles = this.DBSyncHandles;
    let handle:TimerHandle;
    if(handles.has(dbname)) {
      handle = handles.get(dbname);
    } else {
      Log.w(`PouchDBService.getSyncHandle('${dbname}'): Entry not found in sync handle list!`);
    }
    return handle;
  }

  public isSynced(dbname:string):boolean {
    let syncmap:DBSyncList = this.PDBSyncs;
    let exists:boolean = false;
    if(syncmap.has(dbname)) {
      exists = true;
    }
    return exists;
  }

  public getAllSyncs():Map<string,PDBSync> {
    let syncmap:DBSyncList = this.PDBSyncs;
    return syncmap;
  }

  public cancelSync(dbname:string):boolean {
    try {
      let syncmap:DBSyncList = this.PDBSyncs;
      let timers = this.DBSyncTimers;
      if(syncmap.has(dbname)) {
        let dbsync:PDBSync = syncmap.get(dbname);
        Log.l(`PouchDBService.cancelSync('${dbname}'): Attempting to cancel sync via dbsync:\n`, dbsync);
        let output:any = dbsync.cancel();
        syncmap.delete(dbname);
        timers.delete(dbname);
        // Log.l(`cancelSync('${dbname}'): Output of cancel event was:\n`, output);
        return true;
      } else {
        Log.w(`PouchDBService.cancelSync('${dbname}'): Entry not found in sync list!`);
        // return "ERROR_NO_SUCH_SYNC";
        return false;
      }
    } catch(err) {
      Log.l(`PouchDBService.cancelSync(): Error canceling sync for '${dbname}'`);
      Log.e(err);
      // throw err;
      return false;
    }
  }

  public cancelAllSyncs():any {
    let syncmap:DBSyncList = this.PDBSyncs;
    let errCount:number = 0;
    for(let entry of syncmap) {
      let dbname:string = entry[0];
      // let dbsync:any    = entry[1];
      Log.l(`PouchDBService.cancelAllSyncs(): Now attempting to cancel sync of '${dbname}'...`);
      let out:any = this.cancelSync(dbname);
      if(out === "ERROR_NO_SUCH_SYNC") {
        errCount++;
      }
    }
    if(errCount === 0) {
      Log.l(`PouchDBService.cancelAllSyncs(): All syncs evidently canceled. Clearing all sync events...`);
      syncmap.clear();
    } else {
      Log.w(`PouchDBService.cancelAllSyncs(): Not all syncs canceled! Not clearing syncs! Error count: ${errCount}. Sync list:\n`, syncmap);
    }
  }

  public clearAllSyncs() {
    let syncmap:DBSyncList = this.PDBSyncs;
    Log.l(`PouchDBService.clearAllSyncs(): Clearing out all syncs from map:\n`, syncmap);
    syncmap.clear();
  }

  public addInitialSync(dbname:string, dbsync:PDBSync):PDBSync {
    let syncmap:DBSyncList = this.InitialSyncs;
    if(syncmap.has(dbname)) {
      let syncevent:PDBSync = syncmap.get(dbname);
      syncevent.cancel();
    }
    syncmap.set(dbname, dbsync);
    return syncmap.get(dbname);
  }

  public getInitialSync(dbname:string):PDBSync {
    let syncmap:DBSyncList = this.InitialSyncs;
    let outVal:PDBSync = null;
    if(syncmap.has(dbname)) {
      outVal = syncmap.get(dbname);
    } else {
      Log.w(`PouchDBService.getSync('${dbname}'): Entry not found in sync list!`);
    }
    return outVal;
  }

  public getAllInitialSyncs():DBSyncList {
    let syncmap:DBSyncList = this.InitialSyncs;
    return syncmap;
  }

  public cancelInitialSync(dbname:string):any {
    let syncmap:DBSyncList = this.InitialSyncs;
    if(syncmap.has(dbname)) {
      let dbsync:PDBSync = syncmap.get(dbname);
      Log.l(`PouchDBService.cancelInitialSync('${dbname}'): Attempting to cancel sync via dbsync:\n`, dbsync);
      let output:any = dbsync.cancel();
      Log.l(`PouchDBService.cancelInitialSync('${dbname}'): Output of cancel event was:\n`, output);
      return output;
    } else {
      Log.w(`PouchDBService.cancelInitialSync('${dbname}'): Entry not found in sync list!`);
      return "ERROR_NO_SUCH_SYNC";
    }
  }

  public cancelAllInitialSyncs():any {
    let syncmap:DBSyncList = this.InitialSyncs;
    let errCount:number = 0;
    for(let entry of syncmap) {
      let dbname:string = entry[0];
      // let dbsync:any    = entry[1];
      Log.l(`PouchDBService.cancelAllInitialSyncs(): Now attempting to cancel sync of '${dbname}'...`);
      let out:any = this.cancelInitialSync(dbname);
      if(out === "ERROR_NO_SUCH_SYNC") {
        errCount++;
      }
    }
    if(errCount === 0) {
      Log.l(`PouchDBService.cancelAllInitialSyncs(): All syncs evidently canceled. Clearing all sync events...`);
      syncmap.clear();
    } else {
      Log.w(`PouchDBService.cancelAllInitialSyncs(): Not all syncs canceled! Not clearing syncs! Error count: ${errCount}. Sync list:\n`, syncmap);
    }
  }

  public clearAllInitialSyncs():any {
    let syncmap:DBSyncList = this.InitialSyncs;
    Log.l(`PouchDBService.clearAllInitialSyncs(): Clearing out all syncs from map:\n`, syncmap);
    syncmap.clear();
  }

  public static setAuth(user:string, pass:string) {
    let self = PouchDBService;
    if (user && pass && typeof user === 'string' && typeof pass === 'string') {
      self.remoteAuth.user = user;
      self.remoteAuth.pass = pass;
    } else {
      Log.w(`PouchDBService.setAuth(): Invalid username and/or password:\n`, user, ':', pass);
    }
  }

  public static getAuthString():string {
    let self = PouchDBService;
    let user = self.remoteAuth && self.remoteAuth.user && typeof self.remoteAuth.user === 'string' ? self.remoteAuth.user : null;
    let pass = self.remoteAuth && self.remoteAuth.pass && typeof self.remoteAuth.pass === 'string' ? self.remoteAuth.pass : null;
    if(user && pass) {
      let identity = window.btoa(`${user}:${pass}`);
      let authString = `Basic ${identity}`;
      return authString;
    }
    return null;
  }

  public static hasAuth():boolean {
    let self = PouchDBService;
    let user = self.remoteAuth && self.remoteAuth.user && typeof self.remoteAuth.user === 'string' ? true : false;
    let pass = self.remoteAuth && self.remoteAuth.pass && typeof self.remoteAuth.pass === 'string' ? true : false;
    return user && pass;
  }

  public setAuth(user:string, pass:string) {
    if (user && pass && typeof user === 'string' && typeof pass === 'string') {
      this.remoteAuth.user = user;
      this.remoteAuth.pass = pass;
    } else {
      Log.w(`PouchDBService.setAuth(): Invalid username and/or password:\n`, user, ':', pass);
    }
  }

  public getAuthString():string {
    let user = this.remoteAuth && this.remoteAuth.user && typeof this.remoteAuth.user === 'string' ? this.remoteAuth.user : null;
    let pass = this.remoteAuth && this.remoteAuth.pass && typeof this.remoteAuth.pass === 'string' ? this.remoteAuth.pass : null;
    if(user && pass) {
      let identity = window.atob(`${user}:${pass}`);
      let authString = `Basic ${identity}`;
      return authString;
    }
    return null;
  }

  public hasAuth():boolean {
    let user = this.remoteAuth && this.remoteAuth.user && typeof this.remoteAuth.user === 'string' ? true : false;
    let pass = this.remoteAuth && this.remoteAuth.pass && typeof this.remoteAuth.pass === 'string' ? true : false;
    return user && pass;
  }

  public static async pouchFetch(url:string, opts:RequestInit):Promise<Response> {
    let self = PouchDBService;
    if(self.hasAuth() && opts && opts.headers) {
      let headers = opts.headers;
      let authstring = self.getAuthString();
      if(headers && headers instanceof Headers) {
        headers.set('Authorization', authstring);
      } else if(Array.isArray(headers)) {
        let authheader = headers.find(hdr => hdr && hdr[0] && hdr[0] === 'Authorization');
        if(authheader) {
          authheader[1] = authstring;
        }
      } else {
        Log.w(`PouchDBService.FETCH(): Invalid options and/or headers:\n`, opts, '\n', headers);
      }
      return PouchDB.fetch(url, opts);
    } else {
      Log.w(`PouchDBService.FETCH(): Unable to fetch, not logged in or invalid options provided:\nLogged in:`, self.hasAuth(), '\nOptions:', opts);
      return PouchDB.fetch(url, opts);
    }
  }

  public pouchFetch = PouchDBService.pouchFetch;


}

export type Database           = PouchDB.Database           ;
export type StaticPouch        = Database                   ;
export type PDatabase          = Database                   ;
export type PDBResponse        = PouchDB.Core.Response      ;
export type PDBError           = PouchDB.Core.Error         ;
export type BulkResponse       = Array<PDBResponse|PDBError>;
export type PDBInfoOriginal    = PouchDB.Core.DatabaseInfo  ;
// adapter: "https"
// auto_compaction: false
// compact_running: false
// data_size: 116369463
// db_name: "reports_ver101100"
// disk_format_version: 6
// disk_size: 277360852
// doc_count: 108491
// doc_del_count: 21362
// host: "https://db04.sesa.us/reports_ver101100/"
// instance_start_time: "0"
// other: {data_size: 155588651}
// purge_seq: 0
// sizes: {file: 277360852, external: 155588651, active: 116369463}
// update_seq: "158400-g2wAAAABaANkAA9jZGIyMTBAc2VjdXJlZGJsAAAAAmEAbgQA_____2piAAJqwGo"
// idb_attachment_format: string

export interface PDFInfoOther {
  data_size ?: number ;
}
export interface PDFInfoSizes {
  file     ?: number ;
  external ?: number ;
  active   ?: number ;
}
export interface PDBInfo extends PDBInfoOriginal {
  db_name          : string             ;
  adapter         ?: string             ;
  auto_compaction ?: boolean            ;
  doc_count        : number             ;
  update_seq       : number|string      ;

  // LevelDB
  backend_adapter ?: string             ;

  // WebSql
  sqlite_plugin   ?: boolean            ;
  websql_encoding ?: 'UTF-8' | 'UTF-16' ;

  // IndexedDB
  idb_attachment_format ?: 'base64' | 'binary';

  // HTTP/HTTPS
  compact_running     ?: boolean       ;
  data_size           ?: number        ;
  disk_size           ?: number        ;
  doc_del_count       ?: number        ;
  host                ?: string        ;
  instance_start_time ?: number        ;
  other               ?: PDFInfoOther  ;
  purge_seq           ?: number        ;
  sizes               ?: PDFInfoSizes  ;
}
export type PouchDatabase      = PouchDB.Database           ;
export type PDBCoreOptions     = PouchDB.Core.Options       ;
export type PDBLoginOptions    = PouchDB.Core.Options       ;
export type CorePDBOptions     = PouchDB.Configuration.CommonDatabaseConfiguration ;
export type LocalPDBOptions    = PouchDB.Configuration.LocalDatabaseConfiguration  ;
export type RemotePDBOptions   = PouchDB.Configuration.RemoteDatabaseConfiguration ;
export type PDBOptions         = LocalPDBOptions|RemotePDBOptions;

export interface PouchDocRequired extends Object {
  _id?:string;
  _rev?:string;
  [propName:string]:any;
}
export type PDBContent = PouchDocRequired;
// export type PDBContent = PouchDB.Core.Document<any>;
// export type PDBContent = PouchDB.Core.Document<PouchDocRequired>;
export type PouchDoc           = PDBContent;
export type RemoveDoc          = PouchDB.Core.RemoveDocument;

export type AllDocsNoKeysOptions        = PouchDB.Core.AllDocsOptions;
export type AllDocsWithKeyOptions       = PouchDB.Core.AllDocsWithKeyOptions;
export type AllDocsWithKeysOptions      = PouchDB.Core.AllDocsWithKeysOptions;
export type AllDocsWithinRangeOptions   = PouchDB.Core.AllDocsWithinRangeOptions;
export type AllDocsOptions              = AllDocsNoKeysOptions|AllDocsWithKeyOptions|AllDocsWithKeysOptions|AllDocsWithinRangeOptions;
export type AllDocsResponse             = PouchDB.Core.AllDocsResponse<PouchDoc>;
export type AllDocsRows                 = AllDocsResponse["rows"];
export type AllDocsRow                  = AllDocsRows[0];

export type GetOptions                  = PouchDB.Core.GetOptions;
export type GetResponse                 = PouchDoc;
export type BulkGetOptions              = PouchDB.Core.BulkGetOptions;
export type BulkGetResponse             = PouchDB.Core.BulkGetResponse<any>;

export type ReplicateOptions       = PouchDB.Replication.ReplicateOptions;
export type ReplicationResult<T>   = PouchDB.Replication.ReplicationResult<T>  ;
export type PDBReplicationResult   = ReplicationResult<PouchDoc>;
// export type OriginalReplicationResult<T> = PouchDB.Replication.ReplicationResult<T>;
// export interface OnSiteReplicationResult<T> extends OriginalReplicationResult<T> {
//   pending?:number;
// }
// export type PDBReplicationResult   = OnSiteReplicationResult<PouchDoc>;
export interface PDBChangeEvent extends PDBReplicationResult {
  pending?:number;
}
export type ReplicationComplete    = PouchDB.Replication.ReplicationResultComplete<PouchDoc>;
export type PDBCompleteEvent       = ReplicationComplete;
export type ReplicationCancel      = PouchDB.Replication.Replication<PouchDoc>;
export type SyncOptions            = PouchDB.Replication.SyncOptions           ;
// export type Sync<T>                = PouchDB.Replication.Sync<T>               ;
// export type SyncResult<T>          = PouchDB.Replication.SyncResult<T>         ;
// export type SyncResultComplete<T>  = PouchDB.Replication.SyncResultComplete<T> ;
export type PDBSync                = PouchDB.Replication.Sync<PouchDoc>      ;
export type SyncResult             = PouchDB.Replication.SyncResult<PouchDoc>      ;
export interface PDBSyncResult extends SyncResult {
  change:PDBChangeEvent;
}
export type PDBSyncResultComplete  = PouchDB.Replication.SyncResultComplete<PouchDoc>      ;

export type UpsertResponse = PouchDB.UpsertResponse;
// export interface UpsertResponse extends OriginalUpsertResponse {
//   ok?:boolean;
// }
export type UpsertDiffCallback     = PouchDB.UpsertDiffCallback<PouchDoc>;
export type UpsertDiffDoc          = Partial<PouchDB.Core.Document<PouchDoc>>;

export type ConditionOperators     = PouchDB.Find.ConditionOperators;
export type CombinationOperators   = PouchDB.Find.CombinationOperators;
export type Selector               = PouchDB.Find.Selector;
export type FindRequest            = PouchDB.Find.FindRequest<PouchDoc>;
export type FindResponse           = PouchDB.Find.FindResponse<PouchDoc>;
export type PDBIndex               = PouchDB.Find.Index;
export type PouchIndex             = PDBIndex;
export type CreateIndexOptions     = PouchDB.Find.CreateIndexOptions;
export type CreateIndexResponse    = PouchDB.Find.CreateIndexResponse<PouchDoc>;
export type GetIndexesResponse     = PouchDB.Find.GetIndexesResponse<PouchDoc>;
export type DeleteIndexOptions     = PouchDB.Find.DeleteIndexOptions;
export type DeleteIndexResponse     = PouchDB.Find.DeleteIndexResponse<PouchDoc>;

export type PDBQuery               = PouchDB.Find.Selector;
export type PDBChange              = PouchDB.Core.ChangesResponseChange<PouchDoc>;

export type PDBGetUserResponse     = PouchDB.Authentication.User            ;
export type PDBUser                = PouchDB.Core.ExistingDocument<PDBGetUserResponse>;
// export type PDBUser                = PouchDB.Core.Document<PouchDB.Authentication.User>;
export type PDBLoginResponse       = PouchDB.Authentication.LoginResponse   ;
export type PDBSessionResponse     = PouchDB.Authentication.SessionResponse ;
export type PDBPutUserOptions      = PouchDB.Authentication.PutUserOptions  ;
export type PDBSession             = PouchDB.Authentication.SessionResponse ;

export type AuthHeader             = PouchDB.Authentication.AuthHeader      ;

export type DBList        = Map<string,Database>;
export type DBSyncList    = Map<string,PDBSync>;
export type DBSyncHandles = Map<string,any>;
export type DBSyncTimers  = Map<string,MomentTimer>;
export type TimerHandle   = any;
export interface ReplicateOptionsOnSite extends ReplicateOptions {
  complete?:boolean;
  continuous?:boolean;
}
