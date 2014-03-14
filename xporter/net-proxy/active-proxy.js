'use strict';
var net  = require('net');
var PROXY_HOST = 'localhost';  // proxy server host
var PROXY_PORT = 8888;         // proxy server port
var PASV_HOST  = 'localhost';
var PASV_PORT  = 9090;

if (!PROXY_HOST) return console.log('proxy server not found');

function newSoc() {
//var server = net.createServer(function onCliConn(cliSoc) {
  var cliSoc, svrSoc;
  cliSoc = net.connect(PASV_PORT, PASV_HOST, function onSvrConn() {
    console.log('passive port connected');
    svrSoc.pipe(cliSoc);
    //svrSoc.on('readable', function () {
    //  var buff = svrSoc.read();
    //  if (buff) cliSoc.write(buff);
    //});
    svrSoc.on('end', function () {
      //cliSoc.end();
      console.log('end of passive port');
      newSoc();
    });
  });
  svrSoc = net.connect(PROXY_PORT, PROXY_HOST, function onSvrConn() {
    console.log('proxy port connected');
    cliSoc.pipe(svrSoc);
    //cliSoc.on('readable', function () {
    //  var buff = cliSoc.read();
    //  if (buff) svrSoc.write(buff);
    //});
    cliSoc.on('end', function () {
      //svrSoc.end();
      console.log('end of proxy port');
    });
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
  newSoc();

//server.on('error', function onSvrErr(err) {
//  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
//});

console.log('port forwarder started on port ' +
            PASV_HOST + ':' + PASV_PORT +
            ' -> ' + PROXY_HOST + ':' + PROXY_PORT);
