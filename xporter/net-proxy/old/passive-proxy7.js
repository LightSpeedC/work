// passive-proxy.js

'use strict';
var net  = require('net');
var co   = require('co');
var chan = require('chan');

var HTTP_PORT = Number(process.argv[2] || 9999);  // proxy service port
var PASV_PORT = Number(process.argv[3] || 9090);  // passive service port

console.log('HTTP_PORT:', HTTP_PORT);
console.log('PASV_PORT:', PASV_PORT);

// chan passive new socket
var chanPassivePort = chan();

var numberOfListen = 2;
var proxyConnCount = 0;
var passiveConnCount = 0;

function errorGuard() {
  process.on('uncaughtException', function (err) {
    console.log('uncExc(%s) %s', proxyConnCount, err + '');
  });
}

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

var server = net.createServer(function (cliSoc) {
  // console.log('new proxy socket connected');
  co(function *() {
    // console.log('passive socket waiting');
    var svrSoc = yield chanPassivePort;
    ++proxyConnCount;
    console.log('(%s) proxy and passive socket connected', proxyConnCount);
    svrSoc.pipe(cliSoc);
    svrSoc.on('end', function () { --passiveConnCount; });
    svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc'));
    cliSoc.pipe(svrSoc);
    cliSoc.on('end', function () { --proxyConnCount; });
    cliSoc.on('error', funcOnSocErr(svrSoc, 'cliSoc'));
    function funcOnSocErr(soc, msg) {
      return function onSocErr(err) {
        soc.end();
        console.log('%s %s: %s', new Date().toLocaleTimeString(),
          msg, err);
      };
    } // funcOnSocErr
  })(); // co
}).listen(HTTP_PORT, function () {
  console.log('proxy port   started on port ' + HTTP_PORT);
  if (--numberOfListen === 0) errorGuard();
});

server.on('error', function onSvrErr(err) {
  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
});

console.log('proxy port   starting - port ' + HTTP_PORT);

// 日本語
