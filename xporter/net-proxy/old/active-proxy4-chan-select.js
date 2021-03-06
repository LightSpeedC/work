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
  var chCliRead = chan();
  var chCliEnd  = chan();
  var chCliErr  = chan();
  var chSvrEnd  = chan();
  var chSvrErr  = chan();

  //cliSoc.pipe(svrSoc);
  cliSoc.on('readable', chCliRead);
  cliSoc.on('end',      chCliEnd);
  cliSoc.on('error',    chCliErr);

  var bCliAlive = true;
  var bSvrAlive = false;

  while (bCliAlive || bSvrAlive) {

    switch (yield chan.select(
              chCliRead, chCliEnd, chCliErr, chSvrEnd, chSvrErr)) {

    case chCliRead:
      yield chCliRead.selected;
      var buff = cliSoc.read();
      if (buff) {
        if (!svrSoc) {
          console.log('proxy port connecting');
          try {
            svrSoc = yield net_connect(PROXY_PORT, PROXY_HOST);
            bSvrAlive = true;
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
          svrSoc.on('end', chSvrEnd);
          svrSoc.on('error', chSvrErr);
        } // if !svrSoc
        svrSoc.write(buff);
      }
      break;

    case chCliEnd:
      yield chCliEnd.selected;
      if (svrSoc) svrSoc.end();
      console.log('end of proxy port');
      bCliAlive = false;
      break;

    case chCliErr:
      var err = yield chCliErr.selected;
      if (svrSoc) svrSoc.end();
      console.log('%s %s: %s', new Date().toLocaleTimeString(),
        'cliSoc', err);
      break;

    case chSvrEnd:
      yield chSvrEnd.selected;
      //cliSoc.end();
      console.log('end of passive port');
      co(newSoc)();
      bSvrAlive = false;
      break;

    case chSvrErr:
      var err = yield chSvrErr.selected;
      cliSoc.end();
      console.log('%s %s: %s', new Date().toLocaleTimeString(),
        'svrSoc', err);
      break;
    default:
      throw new Error('ここには来ない');
      break;
    } // switch chan
  } // while loop
} // newSoc

for (var i = 0; i < 100; ++i)
  co(newSoc)();

//server.on('error', function onSvrErr(err) {
//  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
//});

console.log('port forwarder started on port ' +
            PASV_HOST + ':' + PASV_PORT +
            ' -> ' + PROXY_HOST + ':' + PROXY_PORT);
