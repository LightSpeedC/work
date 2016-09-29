'use strict';

var chan = require('chan');
var co   = require('co');

// make two channels
var ch1 = chan();
var ch2 = chan();

// make other two channels
var ch3 = chan();
var ch4 = chan();

co(function *() {
	for (;;)
	// will block until there is data on either ch1 or ch2,
	// and will return the channel with data
	// if data is on both channels, a channel will be selected at random
	switch (yield chan.select(ch1, ch2)) {

		// channel 1 received data
		case ch1:
			// retrieve the message yielded by the channel
			console.log('ch1: ' + (yield ch1.selected));
			break;

		// channel 2 received data
		case ch2:
			// retrieve the message yielded by the channel
			console.log('ch2: ' + (yield ch2.selected));
			break;
	}
});

co(function *() {
	for (;;)
	// will block until there is data on either ch1 or ch2,
	// and will return the channel with data
	// if data is on both channels, a channel will be selected at random
	switch (yield chan.select(ch3, ch4)) {

		// channel 1 received data
		case ch3:
			// retrieve the message yielded by the channel
			console.log('ch3: ' + (yield ch3.selected));
			break;

		// channel 2 received data
		case ch4:
			// retrieve the message yielded by the channel
			console.log('ch4: ' + (yield ch4.selected));
			break;
	}
});

var cnt = 0;
var tasks = [
	function () { ch1('ch1:' + (++cnt)); },
	function () { ch2('ch2:' + (++cnt)); },
	function () { ch3('ch3:' + (++cnt)); },
	function () { ch4('ch4:' + (++cnt)); },
	function () { ch1('ch1:' + (++cnt)); ch2('ch2:' + cnt); },
	function () { ch3('ch3:' + (++cnt)); ch4('ch4:' + cnt); },
	function () { ch1('ch1:' + (++cnt)); ch3('ch3:' + cnt); },
	function () { ch2('ch2:' + (++cnt)); ch4('ch4:' + cnt); },
];

setInterval(function () {
	tasks[Math.floor(Math.random() * tasks.length)]();
}, 300);
