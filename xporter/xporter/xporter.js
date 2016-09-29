// xporter.js
'use strict';
var net  = require('net');
var path = require('path');
var url  = require('url');
var util = require('util');
var CONFIG = require(path.resolve(__dirname, 'xporter-config.json'));

if (!CONFIG['port-forward-list']) {
	console.log('port-forward-list does not exists');
	return;
}

//console.log(util.inspect(CONFIG, {colors: true, depth: null}));

CONFIG['port-forward-list'].forEach(function (val, idx, arr) {
	val.port = Number(val.port);
	val.url = url.parse(val.url.slice(0, 4) === 'http'?
											val.url : 'http://' + val.url);
	val.url.port = Number(val.url.port);

	var server = net.createServer(function onCliConn(cliSoc) {
		var svrSoc = net.connect(val.url.port, val.url.host,
			function onSvrConn() {
				cliSoc.pipe(svrSoc);
			}
		);
		svrSoc.pipe(cliSoc);
		svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc'));
		cliSoc.on('error', funcOnSocErr(svrSoc, 'cliSoc'));
		function funcOnSocErr(soc, msg) {
			return function onSocErr(err) {
				soc.end();
				console.log('%s %s: %s', new Date().toLocaleTimeString(),
					msg, err);
			};
		}
	}).listen(val.port, function () {
		console.log('port forwarder started on port ' + val.port +
				' -> ' + val.url.host + ':' + val.url.port);
	});

	server.on('error', function onSvrErr(err) {
		console.log('%s %s: %s', new Date().toLocaleTimeString(), 'svrErr', err);
	});

	console.log('port forwarder starting - port ' + val.port +
				' -> ' + val.url.host + ':' + val.url.port);
});

