'use strict';
var net  = require('net');
var co   = require('co');
var chan = require('chan');

var PROXY_HOST_PORT = process.argv[2] || 'localhost:8888';  // proxy server host and port
var PASV_HOST_PORT  = process.argv[3] || 'localhost:9090';  // passive server host and port

var PROXY_HOST = PROXY_HOST_PORT.split(':')[0];  // proxy server host
var PROXY_PORT = PROXY_HOST_PORT.split(':')[1];  // proxy server port
var PASV_HOST  = PASV_HOST_PORT.split(':')[0];   // passive server host
var PASV_PORT  = PASV_HOST_PORT.split(':')[1];   // passive server port

if (!PROXY_HOST) return console.log('proxy server not found');

var passiveConnCount = 0;
var proxyConnCount = 0;

function errorGuard() {
  process.on('uncaughtException', function (err) {
    console.log('uncExc(%s)(%s) %s', proxyConnCount, passiveConnCount, err + '');
  });
}
errorGuard();

// net.conncet thunkify
function connectAsync(port, host) {
  return function connectThunk(cb) {
    var soc = net.connect(port, host, function () {
      soc.removeListener('error', onError);
      cb(null, soc);
    });
    soc.on('error', onError);
    function onError(err) {
      soc.removeListener('error', onError);
      cb(err, null);
    }
  };
} // connectAsync
net.connectAsync = connectAsync;


function* newSoc() {
  console.log('passive port connecting');
  try {
    var cliSoc = yield net.connectAsync(PASV_PORT, PASV_HOST);
    ++passiveConnCount;
    console.log('(%s) passive port connected', passiveConnCount);
  } catch (err) {
    console.log('(%s) passive port connect fail: %s', passiveConnCount, err + '');
    setTimeout(function () { co(newSoc)(); }, 3000);
    return;
    // return process.exit(1);
  }

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
          // console.log('proxy port connecting');
          try {
            svrSoc = yield net.connectAsync(PROXY_PORT, PROXY_HOST);
            ++proxyConnCount;
            console.log('[%s] proxy port connected', proxyConnCount);
            bSvrAlive = true;
          } catch (err) {
            console.log('[%s] proxy port connect fail: %s', proxyConnCount, err + '');
            return process.exit(1);
          }

          svrSoc.pipe(cliSoc);
          //svrSoc.on('readable', function () {
          //  var buff = svrSoc.read();
          //  if (buff) cliSoc.write(buff);
          //});
          svrSoc.on('end',   chSvrEnd);
          svrSoc.on('error', chSvrErr);
          co(newSoc);
        } // if !svrSoc
        svrSoc.write(buff);
      }
      break;

    case chCliEnd:
      yield chCliEnd.selected;
      if (svrSoc) svrSoc.end();
      --passiveConnCount;
      console.log('(%s) end of passive port', passiveConnCount);
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
      --proxyConnCount;
      console.log('[%s] end of proxy port', proxyConnCount);
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

  co(newSoc)();
} // newSoc

for (var i = 0; i < 40; ++i)
  co(newSoc)();

//server.on('error', function onSvrErr(err) {
//  console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
//});

console.log('port forwarder started on port ' +
            PASV_HOST + ':' + PASV_PORT +
            ' -> ' + PROXY_HOST + ':' + PROXY_PORT);
