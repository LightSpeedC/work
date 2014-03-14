// passive-proxy.js

'use strict';
var net  = require('net');
var co   = require('co');
var chan = require('chan');

var HTTP_PORT = 9999;  // proxy service port
var PASV_PORT = 9090;  // passive service port

console.log('HTTP_PORT:', HTTP_PORT);
console.log('PASV_PORT:', PASV_PORT);

// chan passive new socket
var chanPassivePort = chan();

var passiveServer = net.createServer(function onCliConnPassive(cliSoc) {
  console.log('new passive socket connected');
  chanPassivePort(cliSoc);
}).listen(PASV_PORT, function () {
  console.log('passive port started on port ' + PASV_PORT);
});

passiveServer.on('error', function onSvrErrPassive(err) {
  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
});

var server = net.createServer(function (cliSoc) {
  console.log('new proxy socket connected');
  co(function *() {
    console.log('passive socket waiting');
    var svrSoc = yield chanPassivePort;
    console.log('proxy and passive socket connecting');
    svrSoc.pipe(cliSoc);
    cliSoc.pipe(svrSoc);
    svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc', ''));
    cliSoc.on('error', funcOnSocErr(svrSoc, 'cliSoc', ''));
    function funcOnSocErr(soc, msg, url) {
      return function onSocErr(err) {
        soc.end();
        console.log('%s %s: %s %s', new Date().toLocaleTimeString(),
          msg, err, url);
      };
    } // funcOnSocErr
  })(); // co
}).listen(HTTP_PORT, function () {
  console.log('proxy port started on port ' + HTTP_PORT);
});

server.on('error', function onSvrErr(err) {
  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
});

console.log('proxy port starting - port ' + HTTP_PORT);

// 日本語
