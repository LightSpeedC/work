'use strict';
var net  = require('net');
var HTTP_PORT  = process.argv[2] || 8080;  // service port
var PROXY_HOST = process.argv[3] || null;  // proxy server host
var PROXY_PORT = process.argv[4] || 80;    // proxy server port

if (!PROXY_HOST) return console.log('proxy server not found');

var server = net.createServer(function onCliConn(cliSoc) {
	var svrSoc = net.connect(PROXY_PORT, PROXY_HOST, function onSvrConn() {
		cliSoc.pipe(svrSoc);
	});
	svrSoc.pipe(cliSoc);
	svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc', ''));
	cliSoc.on('error', funcOnSocErr(svrSoc, 'cliSoc', ''));
	function funcOnSocErr(soc, msg, url) {
		return function onSocErr(err) {
			soc.end();
			console.log('%s %s: %s %s', new Date().toLocaleTimeString(),
				msg, err, url);
		};
	}
}).listen(HTTP_PORT);

server.on('error', function onSvrErr(err) {
	console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
});

console.log('port forwarder started on port ' + HTTP_PORT +
			' -> ' + PROXY_HOST + ':' + PROXY_PORT);
