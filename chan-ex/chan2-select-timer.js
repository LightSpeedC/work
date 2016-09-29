'use strict';

var chan = require('chan');
var co   = require('co');

// make two channels
var ch1 = chan();
var ch2 = chan();

co(function *() {
	setTimeout(ch1, 500);
	setTimeout(ch2, 600);
	setTimeout(ch1, 800);

	for (var i = 0; i < 3; ++i)
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
