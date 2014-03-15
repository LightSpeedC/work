// passive-proxy.js

'use strict';
var net  = require('net');
var co   = require('co');
var chan = require('chan');
var fs   = require('fs');
var path = require('path');

var HTTP_PORT = Number(process.argv[2] || 9999);  // proxy service port
var PASV_FOLDER = process.argv[3];                // passive service folder
if (!PASV_FOLDER)
  throw new Error('passive service folder does not exist');
PASV_FOLDER = PASV_FOLDER.replace(/\\/g, '/');
if (PASV_FOLDER[0] !== '/' ||
    PASV_FOLDER[PASV_FOLDER.length - 1] !== '/')
  throw new Error('passive service folder format error');

console.log('HTTP_PORT:', HTTP_PORT);
console.log('PASV_FOLDER:', PASV_FOLDER);

if (!fs.existsSync(PASV_FOLDER)) fs.mkdirSync(PASV_FOLDER);

var PASV_REQ_FOLDER = path.resolve(PASV_FOLDER, 'request');
var PASV_RES_FOLDER = path.resolve(PASV_FOLDER, 'response');
console.log('PASV_REQ_FOLDER:', PASV_REQ_FOLDER);
console.log('PASV_RES_FOLDER:', PASV_RES_FOLDER);
if (!fs.existsSync(PASV_REQ_FOLDER)) fs.mkdirSync(PASV_REQ_FOLDER);
if (!fs.existsSync(PASV_RES_FOLDER)) fs.mkdirSync(PASV_RES_FOLDER);

var PASV_REQ_NOTIFY = path.resolve(PASV_FOLDER, 'request_notify.txt');
var PASV_RES_NOTIFY = path.resolve(PASV_FOLDER, 'response_notify.txt');
console.log('PASV_REQ_NOTIFY:', PASV_REQ_NOTIFY);
console.log('PASV_RES_NOTIFY:', PASV_RES_NOTIFY);
if (!fs.existsSync(PASV_REQ_NOTIFY)) fs.writeFileSync(PASV_REQ_NOTIFY, '');
if (!fs.existsSync(PASV_RES_NOTIFY)) fs.writeFileSync(PASV_RES_NOTIFY, '');

fs.readdirSync(PASV_REQ_FOLDER).forEach(function (file) {
  console.log('delete %s - %s', file, PASV_REQ_FOLDER);
  fs.unlinkSync(path.resolve(PASV_REQ_FOLDER, file));
});
fs.readdirSync(PASV_RES_FOLDER).forEach(function (file) {
  console.log('delete %s - %s', file, PASV_RES_FOLDER);
  fs.unlinkSync(path.resolve(PASV_RES_FOLDER, file));
});

var outStream = fs.createWriteStream(PASV_REQ_NOTIFY);
var chRequest  = chan();
co(function *() {
  for (;;) {
    yield chRequest;
    outStream.write('.');
  }
})();
var chResponse = chan();
var fsWatchCalled;
fs.watch(PASV_RES_NOTIFY, function () {
  fsWatchCalled = false;
  setTimeout(function () {
    if (!fsWatchCalled) {
      fsWatchCalled = true;
      chResponse(true);
    }
  }, 50);
});

var proxyConnCount = 0;
var passiveConnCount = 0;

function errorGuard() {
  process.on('uncaughtException', function (err) {
    console.log('uncExc(%s) %s', proxyConnCount, err + '');
  });
}

/**
 * Wrap a regular callback `fn` as a thunk.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

var slice = Array.prototype.slice;
function thunkify(fn){
  return function(){
    // var args = slice.call(arguments);
    arguments.__proto__ = Array.prototype;
    var args = arguments;
    var results;
    var called;
    var cb;

    args.push(function (){
      results = arguments;

      if (cb && !called) {
        called = true;
        cb.apply(this, results);
      }
    });

    fn.apply(this, args);

    return function (fn){
      cb = fn;

      if (results && !called) {
        called = true;
        fn.apply(this, results);
      }
    };
  }
} // thunkify

/*
var passiveServer = net.createServer(function onCliConnPassive(cliSoc) {
  // console.log('new passive socket connected');
  ++passiveConnCount;
  chanPassivePort(cliSoc);
}).listen(PASV_PORT, function () {
  console.log('passive port started on port ' + PASV_PORT);
  if (--numberOfListen === 0) errorGuard();
});

passiveServer.on('error', function onSvrErrPassive(err) {
  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
});
*/

var fs_readFile    = thunkify(fs.readFile);
var fs_writeFile   = thunkify(fs.writeFile);
var fs_readdir = thunkify(fs.readdir);
var fs_rename  = thunkify(fs.rename);

var svrSocSeqNo = 0;
var svrSocs = {};
function newSvrSoc(cliSoc) {
  ++svrSocSeqNo;
  var svrSoc = {name: 'socket_' + svrSocSeqNo, cliSoc: cliSoc};
  return svrSocs[svrSoc.name] = svrSoc;
}
function deleteSvrSoc(name) {
  delete svrSocs[name];
}

var server = net.createServer(function (cliSoc) {
  // console.log('new proxy socket connected');
  co(function *() {
    // console.log('passive socket waiting');
    //var svrSoc = yield chanPassivePort;
    var svrSoc = newSvrSoc(cliSoc);
    //cliSoc.svrSoc = svrSoc;
    var svrSocName = svrSoc.name;
    var svrSocReqName = path.resolve(PASV_REQ_FOLDER, svrSocName);
    var svrSocResName = path.resolve(PASV_RES_FOLDER, svrSocName);
    yield fs_writeFile(svrSocReqName + '.txt', '');
    ++proxyConnCount;
    console.log('(%s) proxy and passive socket connected', proxyConnCount);

    //svrSoc.pipe(cliSoc);
    //svrSoc.on('end', function () { --passiveConnCount; });
    //svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc'));

    var cliSocSeqNo = 0;
    // cliSoc.pipe(svrSoc);
    cliSoc.on('readable', function () {
      var buf = cliSoc.read();
      if (!buf) return;
      co(function *() {
        ++cliSocSeqNo;
        yield fs_writeFile(svrSocReqName + '_' + cliSocSeqNo + '.tmp', buf);
        yield fs_rename(svrSocReqName + '_' + cliSocSeqNo + '.tmp',
                        svrSocReqName + '_' + cliSocSeqNo + '.txt');
        chRequest(' ');
      })();
    });
    cliSoc.on('end', function () {
      --proxyConnCount;
      co(function *() {
        ++cliSocSeqNo;
        yield fs_writeFile(svrSocReqName + '_' + cliSocSeqNo + '.tmp', '');
        yield fs_rename(svrSocReqName + '_' + cliSocSeqNo + '.tmp',
                        svrSocReqName + '_' + cliSocSeqNo + '.cls');
        deleteSvrSoc(svrSocReqName);
        chRequest(' ');
      })(); // co
    });
    cliSoc.on('error', function (err) {
      co(function *() {
        ++cliSocSeqNo;
        yield fs_writeFile(svrSocReqName + '_' + cliSocSeqNo + '.tmp', '');
        yield fs_rename(svrSocReqName + '_' + cliSocSeqNo + '.tmp',
                        svrSocReqName + '_' + cliSocSeqNo + '.cls');
        deleteSvrSoc(svrSocReqName);
        chRequest(' ');
        console.log('%s cliSoc: %s', new Date().toLocaleTimeString(), err + '');
      })(); // co
    }); // cliSoc.on error
  })(); // co
}).listen(HTTP_PORT, function () {
  console.log('proxy port   started on port ' + HTTP_PORT);
  //errorGuard();
});

server.on('error', function onSvrErr(err) {
  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
});

console.log('proxy port   starting - port ' + HTTP_PORT);

// 日本語
