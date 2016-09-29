'use strict';
var net  = require('net');
var co   = require('co');
// var chan = require('chan');
var PROXY_HOST = 'localhost';  // proxy server host
var PROXY_PORT = 8888;         // proxy server port
var PASV_HOST  = 'localhost';  // passive server host
var PASV_PORT  = 9090;         // passive server port

if (!PROXY_HOST) return console.log('proxy server not found');

function net_connect(port, host) {
  return function (cb) {
    var soc = net.connect(port, host, function () {
      cb(null, soc);
    });
  };
}

function* newSoc() {
//var server = net.createServer(function onCliConn(cliSoc) {
  console.log('passive port connecting');
  var cliSoc = yield net_connect(PASV_PORT, PASV_HOST);
  console.log('passive port connected');

  console.log('proxy port connecting');
  var svrSoc = yield net_connect(PROXY_PORT, PROXY_HOST);
  console.log('proxy port connected');

  svrSoc.pipe(cliSoc);
  //svrSoc.on('readable', function () {
  //  var buff = svrSoc.read();
  //  if (buff) cliSoc.write(buff);
  //});
  svrSoc.on('end', function () {
    //cliSoc.end();
    console.log('end of passive port');
    co(newSoc)();
  });

  cliSoc.pipe(svrSoc);
  //cliSoc.on('readable', function () {
  //  var buff = cliSoc.read();
  //  if (buff) svrSoc.write(buff);
  //});
  cliSoc.on('end', function () {
    //svrSoc.end();
    console.log('end of proxy port');
  });

  svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc', ''));
  cliSoc.on('error', funcOnSocErr(svrSoc, 'cliSoc', ''));
  function funcOnSocErr(soc, msg, url) {
    return function onSocErr(err) {
      soc.end();
      console.log('%s %s: %s %s', new Date().toLocaleTimeString(),
        msg, err, url);
    };
  }

//}).listen(HTTP_PORT);
}
for (var i = 0; i < 100; ++i)
  co(newSoc)();

//server.on('error', function onSvrErr(err) {
//  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
//});

console.log('port forwarder started on port ' +
            PASV_HOST + ':' + PASV_PORT +
            ' -> ' + PROXY_HOST + ':' + PROXY_PORT);
