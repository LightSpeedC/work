'use strict';
var net  = require('net');
var co   = require('co');
var chan = require('chan');
var PROXY_HOST = 'localhost';  // proxy server host
var PROXY_PORT = 8888;         // proxy server port
var PASV_HOST  = 'localhost';  // passive server host
var PASV_PORT  = 9090;         // passive server port

if (!PROXY_HOST) return console.log('proxy server not found');

// net.conncet thunkify
function net_connect(port, host) {
  return function (cb) {
    var soc = net.connect(port, host, function () {
      cb(null, soc);
    });
    soc.on('error', function onError(err) {
      soc.removeListener('error', onError);
      cb(err, null);
    });
  };
} // net_connect

function* newSoc() {
  console.log('passive port connecting');
  try {
    var cliSoc = yield net_connect(PASV_PORT, PASV_HOST);
  } catch (err) {
    console.log('passive port connect fail: ' + err);
    process.exit(1);
  }
  console.log('passive port connected');

  var svrSoc;

  //cliSoc.pipe(svrSoc);
  cliSoc.on('readable', co(function* () {
    var buff = cliSoc.read();
    if (buff) {
      if (!svrSoc) {
        console.log('proxy port connecting');
        try {
          svrSoc = yield net_connect(PROXY_PORT, PROXY_HOST);
        } catch (err) {
          console.log('proxy port connect fail: ' + err);
          process.exit(1);
        }
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

        svrSoc.on('error', function (err) {
          cliSoc.end();
          console.log('%s %s: %s', new Date().toLocaleTimeString(),
            'svrSoc', err);
        });

      } // if !svrSoc
      svrSoc.write(buff);
    }
  }));
  cliSoc.on('end', function () {
    if (svrSoc) svrSoc.end();
    console.log('end of proxy port');
  });

  cliSoc.on('error', function (err) {
    if (svrSoc) svrSoc.end();
    console.log('%s %s: %s', new Date().toLocaleTimeString(),
      'cliSoc', err);
  });
} // newSoc

for (var i = 0; i < 100; ++i)
  co(newSoc)();

//server.on('error', function onSvrErr(err) {
//  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
//});

console.log('port forwarder started on port ' +
            PASV_HOST + ':' + PASV_PORT +
            ' -> ' + PROXY_HOST + ':' + PROXY_PORT);
